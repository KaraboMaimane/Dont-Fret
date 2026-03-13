import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons } from '@ionic/angular/standalone';
import { MusicTheoryService, IntervalQuestion, NoteLabel } from '../../services/music-theory.service';
import { ProgressService } from '../../services/progress.service';
import { AdaptiveService } from '../../services/adaptive.service';
import { StreakService } from '../../services/streak.service';
import { MilestoneService } from '../../services/milestone.service';
import { PersonalRecordsService } from '../../services/personal-records.service';
import { HapticsService } from '../../services/haptics.service';
import { GameHudComponent } from '../../components/game-hud/game-hud.component';
import { ModeIntroComponent } from '../../components/mode-intro/mode-intro.component';
import { ComboMeterComponent } from '../../components/combo-meter/combo-meter.component';

type BlitzState = 'idle' | 'playing' | 'done';

@Component({
  selector: 'app-blitz-mode',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonBackButton,
    IonButtons,
    GameHudComponent,
    ModeIntroComponent,
    ComboMeterComponent,
  ],
  templateUrl: './blitz-mode.page.html',
})
export class BlitzModePage implements OnInit, OnDestroy {
  state: BlitzState = 'idle';
  question: IntervalQuestion | null = null;
  notes: NoteLabel[] = [];
  timeLeft = 60;
  score = 0;
  totalAnswered = 0;
  lastCorrect: boolean | null = null;
  lastAnswer: NoteLabel | null = null;
  blitzBestScore = 0;
  isNewBest = false;
  currentStreak = 0;
  questionFlip = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private pool: IntervalQuestion[] = [];
  private poolIdx = 0;
  private sessionStart = 0;
  sessionCorrect = 0;
  readonly introFacts = ['60 second sprint', '+2 sec on every hit', 'Chain for max score'];

  constructor(
    private theory: MusicTheoryService,
    private progress: ProgressService,
    private adaptive: AdaptiveService,
    private streak: StreakService,
    private milestone: MilestoneService,
    private records: PersonalRecordsService,
    private haptics: HapticsService,
  ) {}

  ngOnInit() { this.notes = this.theory.getChromaticNotes(); }
  ngOnDestroy() {
    this.clearTimer();
    this.haptics.stopAdaptiveIntensity();
  }

  startGame() {
    const past = this.progress.getRecentSessions(20).filter((s: any) => s.mode === 'Blitz');
    this.blitzBestScore = past.length > 0 ? Math.max(...past.map((s: any) => s.correct)) : 0;
    this.isNewBest = false;
    this.pool = this.adaptive.buildExamPool(100);
    this.poolIdx = 0;
    this.score = 0;
    this.totalAnswered = 0;
    this.timeLeft = 60;
    this.sessionCorrect = 0;
    this.currentStreak = 0;
    this.questionFlip = false;
    this.lastCorrect = null;
    this.lastAnswer = null;
    this.sessionStart = Date.now();
    this.state = 'playing';
    this.haptics.startRound();
    this.haptics.setAdaptiveIntensity(1);
    this.streak.recordActivity();
    this.nextQuestion();
    this.startTimer();
  }

  private startTimer() {
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.haptics.setAdaptiveIntensity(this.getAdaptiveLevel());
      if (this.timeLeft <= 0) { this.clearTimer(); this.endGame(); }
    }, 1000);
  }

  nextQuestion() {
    if (this.poolIdx >= this.pool.length) {
      this.pool = [...this.adaptive.buildExamPool(100)];
      this.poolIdx = 0;
    }
    this.question = this.pool[this.poolIdx++];
    this.notes = this.theory.getChromaticNotesForKey(this.question.key);
    this.questionFlip = !this.questionFlip;
    this.lastCorrect = null;
    this.lastAnswer = null;
  }

  selectNote(note: NoteLabel) {
    if (this.state !== 'playing' || !this.question) return;
    const correct = note === this.question.answer;
    if (correct) this.haptics.success();
    else this.haptics.error();
    this.lastCorrect = correct;
    this.lastAnswer = note;
    this.totalAnswered++;
    this.progress.recordAnswer(this.question.key, this.question.intervalName, correct, 0);
    this.streak.incrementDailyGoal(1);
    if (correct) {
      this.currentStreak++;
      this.score++;
      this.sessionCorrect++;
      if (this.score % 5 === 0) this.haptics.streak(this.score / 5);
      this.timeLeft = Math.min(this.timeLeft + 2, 90); // +2s, cap at 90
    } else {
      this.currentStreak = 0;
    }
    this.haptics.setAdaptiveIntensity(this.getAdaptiveLevel());
    setTimeout(() => this.nextQuestion(), 300);
  }

  endGame() {
    this.state = 'done';
    this.clearTimer();
    this.isNewBest = this.score > this.blitzBestScore;
    this.progress.recordSession('Blitz', this.sessionCorrect, this.totalAnswered, Date.now() - this.sessionStart);
    this.records.recordBlitzRun(this.score, this.totalAnswered, Date.now() - this.sessionStart);
    this.milestone.unlock('blitz_debut');
    this.milestone.checkAutoMilestones(this.streak.getState().currentStreak, this.progress.getAverageResponseMs());
    this.haptics.stopAdaptiveIntensity();
  }

  private clearTimer() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  get accuracy(): number {
    if (!this.totalAnswered) return 0;
    return Math.round(this.sessionCorrect / this.totalAnswered * 100);
  }

  get timerClass(): string {
    if (this.timeLeft > 30) return '';
    if (this.timeLeft > 10) return 'warning';
    return 'danger';
  }

  get fxLayerClass(): '' | 'warning' | 'danger' | 'fever' {
    if (this.currentStreak >= 5 && this.timeLeft > 10) return 'fever';
    if (this.timeLeft <= 10) return 'danger';
    if (this.timeLeft <= 25) return 'warning';
    return '';
  }

  get pressureChipClass(): '' | 'hot' | 'danger' {
    if (this.timeLeft <= 10) return 'danger';
    if (this.timeLeft <= 25 || this.currentStreak >= 3) return 'hot';
    return '';
  }

  get pressureLabel(): string {
    if (this.timeLeft <= 10) return 'Critical Time';
    if (this.timeLeft <= 25) return 'Heat Rising';
    if (this.currentStreak >= 5) return 'Fever Chain';
    return 'Steady Pace';
  }

  private getAdaptiveLevel(): number {
    if (this.timeLeft <= 10 || this.currentStreak >= 7) return 3;
    if (this.timeLeft <= 25 || this.currentStreak >= 4) return 2;
    return 1;
  }
}
