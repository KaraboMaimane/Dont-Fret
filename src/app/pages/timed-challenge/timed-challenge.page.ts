import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons } from '@ionic/angular/standalone';
import { MusicTheoryService, IntervalQuestion, NoteLabel } from '../../services/music-theory.service';
import { ProgressService } from '../../services/progress.service';
import { AdaptiveService } from '../../services/adaptive.service';
import { StreakService } from '../../services/streak.service';
import { LearningPathService } from '../../services/learning-path.service';
import { MilestoneService } from '../../services/milestone.service';
import { PersonalRecordsService } from '../../services/personal-records.service';
import { HapticsService } from '../../services/haptics.service';
import { GameHudComponent } from '../../components/game-hud/game-hud.component';
import { ModeIntroComponent } from '../../components/mode-intro/mode-intro.component';

type GameState = 'idle' | 'playing' | 'answered' | 'done';

interface QuestionResult {
  question: IntervalQuestion;
  selected: NoteLabel | null;
  correct: boolean;
  responseMs: number;
}

@Component({
  selector: 'app-timed-challenge',
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
  ],
  templateUrl: './timed-challenge.page.html',
})
export class TimedChallengePage implements OnInit, OnDestroy {
  state: GameState = 'idle';
  questions: IntervalQuestion[] = [];
  currentIndex = 0;
  notes: NoteLabel[] = [];
  selectedNote: NoteLabel | null = null;
  results: QuestionResult[] = [];
  feedbackText = '';
  timeLimitSec = 10;
  timeLeftSec = 10;
  countdownPct = 100;
  currentStreak = 0;
  questionFlip = false;
  readonly Math = Math;
  private timer: ReturnType<typeof setInterval> | null = null;
  private questionStart = 0;
  sessionStart = 0;
  timeLimitOptions = [5, 10, 15];
  readonly introFacts = ['10 question gauntlet', 'Beat the countdown', 'Earn up to 3 stars'];

  constructor(
    private theory: MusicTheoryService,
    private progress: ProgressService,
    private adaptive: AdaptiveService,
    private streak: StreakService,
    private learningPath: LearningPathService,
    private milestone: MilestoneService,
    private records: PersonalRecordsService,
    private haptics: HapticsService,
  ) {}

  ngOnInit() {
    this.notes = this.theory.getChromaticNotes();
  }

  ngOnDestroy() { this.clearTimer(); }

  startGame() {
    this.questions = this.adaptive.buildQuestionPool(undefined, 10);
    this.currentIndex = 0;
    this.results = [];
    this.currentStreak = 0;
    this.questionFlip = false;
    this.state = 'playing';
    this.sessionStart = Date.now();
    this.haptics.startRound();
    this.streak.recordActivity();
    this.loadQuestion();
  }

  loadQuestion() {
    this.selectedNote = null;
    this.notes = this.theory.getChromaticNotesForKey(this.currentQuestion.key);
    this.questionFlip = !this.questionFlip;
    this.timeLeftSec = this.timeLimitSec;
    this.countdownPct = 100;
    this.questionStart = Date.now();
    this.clearTimer();

    this.timer = setInterval(() => {
      this.timeLeftSec--;
      this.countdownPct = (this.timeLeftSec / this.timeLimitSec) * 100;
      if (this.timeLeftSec <= 0) {
        this.clearTimer();
        this.autoAnswer();
      }
    }, 1000);
  }

  autoAnswer() {
    if (this.state !== 'playing') return;
    this.submitAnswer(null);
  }

  selectNote(note: NoteLabel) {
    if (this.state !== 'playing') return;
    this.clearTimer();
    this.submitAnswer(note);
  }

  submitAnswer(note: NoteLabel | null) {
    const q = this.questions[this.currentIndex];
    const responseMs = Date.now() - this.questionStart;
    const correct = note !== null && note === q.answer;
    this.selectedNote = note;
    this.state = 'answered';
    this.results.push({ question: q, selected: note, correct, responseMs });
    this.progress.recordAnswer(q.key, q.intervalName, correct, responseMs);
    this.streak.incrementDailyGoal(1);
    if (note === null) {
      this.currentStreak = 0;
      this.haptics.timeout();
      this.feedbackText = `⏱️ Time's up — the ${q.intervalName} of ${q.key} is ${q.answer}`;
    } else if (correct) {
      this.currentStreak++;
      this.haptics.success();
      if (this.currentStreak > 0 && this.currentStreak % 3 === 0) this.haptics.streak(this.currentStreak / 3);
      this.feedbackText = `✅ Correct! (${(responseMs / 1000).toFixed(1)}s)`;
    } else {
      this.currentStreak = 0;
      this.haptics.error();
      const actualInterval = this.theory.getIntervalNameForNote(q.key, note);
      const clue = actualInterval ? ` (${note} is the ${actualInterval})` : '';
      this.feedbackText = `❌ Wrong${clue} — the ${q.intervalName} of ${q.key} is ${q.answer}`;
    }
  }

  nextQuestion() {
    this.currentIndex++;
    if (this.currentIndex >= this.questions.length) {
      this.finishGame();
    } else {
      this.state = 'playing';
      this.loadQuestion();
    }
  }

  finishGame() {
    this.clearTimer();
    this.state = 'done';
    const correct = this.results.filter(r => r.correct).length;
    this.progress.recordSession('Timed Challenge', correct, this.results.length, Date.now() - this.sessionStart);
    this.records.recordTimedRun(correct, this.results.length, this.timeLimitSec, this.stars, Date.now() - this.sessionStart);
    this.milestone.checkAutoMilestones(this.streak.getState().currentStreak, this.progress.getAverageResponseMs());
  }

  private clearTimer() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  get currentQuestion(): IntervalQuestion { return this.questions[this.currentIndex]; }

  get correctCount(): number { return this.results.filter(r => r.correct).length; }
  get stars(): number {
    const acc = this.correctCount / this.questions.length;
    if (acc === 1) return 3;
    if (acc >= 0.7) return 2;
    if (acc >= 0.5) return 1;
    return 0;
  }

  get countdownClass(): string {
    if (this.countdownPct > 60) return '';
    if (this.countdownPct > 30) return 'warning';
    return 'danger';
  }

  get fxLayerClass(): '' | 'warning' | 'danger' | 'fever' {
    if (this.currentStreak >= 4 && this.countdownPct > 30) return 'fever';
    if (this.countdownPct <= 30) return 'danger';
    if (this.countdownPct <= 60) return 'warning';
    return '';
  }

  get pressureChipClass(): '' | 'hot' | 'danger' {
    if (this.countdownPct <= 30) return 'danger';
    if (this.countdownPct <= 60 || this.currentStreak >= 3) return 'hot';
    return '';
  }

  get pressureLabel(): string {
    if (this.countdownPct <= 30) return 'Critical Window';
    if (this.countdownPct <= 60) return 'Clock Pressure';
    if (this.currentStreak >= 4) return 'Flow State';
    return 'Controlled Tempo';
  }

  getNoteClass(note: NoteLabel): string {
    if (this.state !== 'answered') return '';
    if (note === this.selectedNote) return this.results[this.results.length-1].correct ? 'correct' : 'incorrect';
    if (this.currentQuestion && note === this.currentQuestion.answer) return 'correct';
    return '';
  }
}
