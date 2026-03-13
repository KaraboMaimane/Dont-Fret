import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
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

type ExamState = 'idle' | 'playing' | 'answered' | 'done';

interface ExamResult {
  question: IntervalQuestion;
  selected: NoteLabel | null;
  correct: boolean;
  responseMs: number;
}

@Component({
  selector: 'app-exam',
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
  templateUrl: './exam.page.html',
})
export class ExamPage implements OnInit, OnDestroy {
  state: ExamState = 'idle';
  questions: IntervalQuestion[] = [];
  currentIndex = 0;
  notes: NoteLabel[] = [];
  selectedNote: NoteLabel | null = null;
  results: ExamResult[] = [];
  feedbackText = '';
  showAbandonConfirm = false;
  timePerQ = 10;
  timeLeftSec = 10;
  countdownPct = 100;
  readonly Math = Math;
  private timer: ReturnType<typeof setInterval> | null = null;
  private questionStart = 0;
  sessionStart = 0;
  passed = false;
  readonly PASS_THRESHOLD = 0.8;
  readonly introFacts = ['20 question checkpoint', '80% pass mark', 'No hints, no pause'];

  constructor(
    private theory: MusicTheoryService,
    private progress: ProgressService,
    private adaptive: AdaptiveService,
    private streak: StreakService,
    private milestone: MilestoneService,
    private router: Router,
    private records: PersonalRecordsService,
    private haptics: HapticsService,
  ) {}

  ngOnInit() { this.notes = this.theory.getChromaticNotes(); }
  ngOnDestroy() { this.clearTimer(); }

  startExam() {
    this.questions = this.adaptive.buildExamPool(20);
    this.currentIndex = 0;
    this.results = [];
    this.state = 'playing';
    this.sessionStart = Date.now();
    this.haptics.startRound();
    this.streak.recordActivity();
    this.loadQ();
  }

  loadQ() {
    this.selectedNote = null;
    this.notes = this.theory.getChromaticNotesForKey(this.currentQ.key);
    this.timeLeftSec = this.timePerQ;
    this.countdownPct = 100;
    this.questionStart = Date.now();
    this.clearTimer();
    this.timer = setInterval(() => {
      this.timeLeftSec--;
      this.countdownPct = (this.timeLeftSec / this.timePerQ) * 100;
      if (this.timeLeftSec <= 0) {
        this.clearTimer();
        this.haptics.timeout();
        this.submitAnswer(null);
      }
    }, 1000);
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
      this.haptics.timeout();
      this.feedbackText = `⏱️ Time's up — the ${q.intervalName} of ${q.key} is ${q.answer}`;
    } else if (correct) {
      this.haptics.success();
      if (this.correctCount > 0 && this.correctCount % 5 === 0) this.haptics.streak(this.correctCount / 5);
      this.feedbackText = `✅ Correct! (${(responseMs / 1000).toFixed(1)}s)`;
    } else {
      this.haptics.error();
      const actualInterval = this.theory.getIntervalNameForNote(q.key, note);
      const clue = actualInterval ? ` (${note} is the ${actualInterval})` : '';
      this.feedbackText = `❌ Wrong${clue} — the ${q.intervalName} of ${q.key} is ${q.answer}`;
    }
  }

  nextQ() {
    this.currentIndex++;
    if (this.currentIndex >= this.questions.length) {
      this.finishExam();
    } else {
      this.state = 'playing';
      this.loadQ();
    }
  }

  finishExam() {
    this.clearTimer();
    this.state = 'done';
    const correct = this.results.filter(r => r.correct).length;
    this.passed = correct / this.questions.length >= this.PASS_THRESHOLD;
    this.progress.recordSession('Theory Exam', correct, this.questions.length, Date.now() - this.sessionStart);
    this.records.recordExamRun(correct, this.questions.length, this.passed);
    if (this.passed) {
      this.milestone.unlock('theory_titan');
    }
    this.milestone.checkAutoMilestones(this.streak.getState().currentStreak, this.progress.getAverageResponseMs());
  }

  private clearTimer() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  requestBack() {
    if (this.state === 'playing' || this.state === 'answered') {
      this.showAbandonConfirm = true;
    } else {
      this.router.navigateByUrl('/dashboard');
    }
  }

  confirmAbandon() {
    this.clearTimer();
    this.showAbandonConfirm = false;
    this.router.navigateByUrl('/dashboard');
  }

  get correctCount(): number { return this.results.filter(r => r.correct).length; }
  get score(): number { return Math.round(this.correctCount / this.questions.length * 100); }

  get countdownClass(): string {
    if (this.countdownPct > 60) return '';
    if (this.countdownPct > 30) return 'warning';
    return 'danger';
  }

  getNoteClass(note: NoteLabel): string {
    if (this.state !== 'answered') return '';
    const last = this.results[this.results.length-1];
    if (note === this.selectedNote) return last.correct ? 'correct' : 'incorrect';
    if (this.questions[this.currentIndex] && note === this.questions[this.currentIndex].answer) return 'correct';
    return '';
  }

  get currentQ(): IntervalQuestion { return this.questions[this.currentIndex]; }
}
