import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons,
} from '@ionic/angular/standalone';
import { MusicTheoryService,
  NoteLabel,
  FoundationQuestion,
  ScaleFillQuestion,
  DegreeQuestion,
  KeySigCountQuestion,
  KeySigListQuestion,
} from '../../services/music-theory.service';
import { AdaptiveService } from '../../services/adaptive.service';
import { ProgressService } from '../../services/progress.service';
import { StreakService } from '../../services/streak.service';
import { MilestoneService } from '../../services/milestone.service';
import { LearningPathService, Stage, LearningStage } from '../../services/learning-path.service';

@Component({
  selector: 'app-foundations',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons],
  templateUrl: './foundations.page.html',
})
export class FoundationsPage implements OnInit, OnDestroy {
  // ── Question ────────────────────────────────────────────────────────────
  question: FoundationQuestion | null = null;

  // ── Grid data ───────────────────────────────────────────────────────────
  notes: NoteLabel[] = [];
  readonly NUMBER_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7];

  // ── Answer state ────────────────────────────────────────────────────────
  answerState: 'unanswered' | 'correct' | 'incorrect' | 'complete' = 'unanswered';
  feedbackText = '';
  selectedNote: NoteLabel | null = null;
  selectedNumber: number | null = null;

  // ── Session stats ───────────────────────────────────────────────────────
  sessionCorrect = 0;
  sessionTotal = 0;
  sessionStartTime = 0;

  // ── Question pool ───────────────────────────────────────────────────────
  pool: FoundationQuestion[] = [];
  poolIndex = 0;

  // ── Mistake replay ──────────────────────────────────────────────────────
  mistakes: FoundationQuestion[] = [];
  mistakeQueue: FoundationQuestion[] = [];
  isReplayMode = false;
  showMistakeReplay = false;

  // ── Readiness nudge (session-only, never persisted) ─────────────────────
  recentAnswers: boolean[] = [];
  showReadinessNudge = false;
  nudgeType: 'ready' | 'slow-down' | null = null;
  private consecutiveReadyBatches = 0;

  // ── Timer (boss mode) ────────────────────────────────────────────────────
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  timeLeft = 0;
  timerPct = 100;

  // ── Hot streak ───────────────────────────────────────────────────────────
  hotStreak = 0;

  // ── Boss round ──────────────────────────────────────────────────────────
  isBossRound = false;
  bossComplete = false;
  bossFinalPassed = false;
  bossFinalScore = 0;
  bossFinalTotal = 0;
  private failedBossQuestions: FoundationQuestion[] = [];
  private retryPrependPool: FoundationQuestion[] = [];

  // ── Stage context ────────────────────────────────────────────────────────
  currentStage!: LearningStage;

  constructor(
    private theory: MusicTheoryService,
    private adaptive: AdaptiveService,
    private progress: ProgressService,
    private streak: StreakService,
    public milestone: MilestoneService,
    private learningPath: LearningPathService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.notes = this.theory.getChromaticNotes();
    this.currentStage = this.learningPath.getCurrentStage();
    this.isBossRound = this.route.snapshot.queryParams['boss'] === 'true';
    this.startSession();
    this.streak.recordActivity();
  }

  ngOnDestroy() {
    this.clearTimer();
    if (this.sessionTotal > 0) {
      this.progress.recordSession(
        this.isBossRound ? 'Foundations Boss' : 'Foundations',
        this.sessionCorrect,
        this.sessionTotal,
        Date.now() - this.sessionStartTime,
      );
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Session lifecycle
  // ────────────────────────────────────────────────────────────────────────

  startSession() {
    this.sessionCorrect = 0;
    this.sessionTotal = 0;
    this.sessionStartTime = Date.now();
    this.mistakes = [];
    this.mistakeQueue = [];
    this.isReplayMode = false;
    this.showMistakeReplay = false;
    this.recentAnswers = [];
    this.showReadinessNudge = false;
    this.consecutiveReadyBatches = 0;
    this.poolIndex = 0;
    this.bossComplete = false;
    this.hotStreak = 0;

    const stageId = this.currentStage.id as Stage;
    if (this.isBossRound) {
      const freshPool = this.adaptive.buildFoundationsBossPool(stageId, this.currentStage.bossTotalQuestions);
      const prepend = [...this.retryPrependPool];
      this.retryPrependPool = [];
      if (prepend.length > 0) {
        prepend.forEach(q => this.resetQuestion(q));
        const remainder = freshPool.filter(f =>
          !prepend.some(w => w.key === f.key && w.type === f.type)
        );
        this.pool = [...prepend, ...remainder].slice(0, this.currentStage.bossTotalQuestions);
      } else {
        this.pool = freshPool;
      }
    } else {
      this.pool = this.adaptive.buildFoundationsPool(stageId, 40);
    }

    this.nextQuestion();
  }

  nextQuestion() {
    this.clearTimer();
    this.answerState = 'unanswered';
    this.selectedNote = null;
    this.selectedNumber = null;
    this.feedbackText = '';
    this.showReadinessNudge = false;

    if (this.isReplayMode) {
      if (this.mistakeQueue.length === 0) {
        this.isReplayMode = false;
        this.showMistakeReplay = false;
        this.refillPool();
        return;
      }
      this.question = this.mistakeQueue.shift()!;
      this.resetQuestion(this.question);
      this.notes = this.theory.getChromaticNotesForKey(this.question.key);
      if (this.isBossRound) this.startTimer();
      return;
    }

    if (this.poolIndex >= this.pool.length) {
      if (this.isBossRound) {
        this.finishBossRound();
        return;
      }
      if (this.mistakes.length > 0) {
        this.showMistakeReplay = true;
        this.question = null;
        return;
      }
      this.refillPool();
      return;
    }

    this.question = this.pool[this.poolIndex++];
    this.resetQuestion(this.question);
    this.notes = this.theory.getChromaticNotesForKey(this.question.key);
    if (this.isBossRound) this.startTimer();
  }

  private refillPool() {
    const stageId = this.currentStage.id as Stage;
    this.pool = this.adaptive.buildFoundationsPool(stageId, 40);
    this.poolIndex = 0;
    this.mistakes = [];
    this.question = this.pool[this.poolIndex++];
    this.resetQuestion(this.question);
    this.notes = this.theory.getChromaticNotesForKey(this.question.key);
    if (this.isBossRound) this.startTimer();
  }

  /** Reset mutable state on multi-step questions when (re-)presenting them */
  private resetQuestion(q: FoundationQuestion) {
    q.hadError = false;
    if (q.type === 'scale-fill') {
      // Rebuild the blanked scale from scratch
      const full = this.theory.generateMajorScale(q.key);
      q.scale = full.map((n, i) => q.blankIndexes.includes(i) ? null : n);
      q.currentBlankIndex = 0;
      q.answer = full[q.blankIndexes[0]];
    }
    if (q.type === 'key-sig-list') {
      q.currentIndex = 0;
      q.answer = q.accidentals[0];
    }
  }

  startMistakeReplay() {
    this.mistakeQueue = [...this.mistakes];
    this.mistakes = [];
    this.isReplayMode = true;
    this.showMistakeReplay = false;
    this.nextQuestion();
  }

  skipMistakeReplay() {
    this.mistakes = [];
    this.showMistakeReplay = false;
    this.refillPool();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Answer handlers
  // ────────────────────────────────────────────────────────────────────────

  selectNote(note: NoteLabel) {
    if (!this.question) return;
    if (this.answerState === 'complete') return;

    const q = this.question;

    if (q.type === 'scale-fill') {
      this.handleScaleFillNote(q, note);
    } else if (q.type === 'degree') {
      this.handleDegreeNote(q, note);
    } else if (q.type === 'key-sig-list') {
      this.handleKeySigListNote(q, note);
    }
  }

  selectNumber(n: number) {
    if (!this.question || this.question.type !== 'key-sig-count') return;
    if (this.answerState === 'complete') return;

    const q = this.question as KeySigCountQuestion;
    const correct = n === q.answer;
    this.selectedNumber = n;
    this.recordAndFeedback(q.key, 'Key Sig', correct);

    if (correct) {
      this.clearTimer();
      this.answerState = 'complete';
      this.feedbackText = n === 0
        ? `✅ Correct! ${q.key} major has no accidentals.`
        : `✅ Correct! ${q.key} major has ${q.answer} ${q.accidentalType}${q.answer === 1 ? '' : 's'}.`;
    } else {
      q.hadError = true;
      const type = q.accidentalType === 'none' ? 'accidentals' : `${q.accidentalType}s`;
      this.feedbackText = `❌ Not quite — ${q.key} major has ${q.answer} ${type}. Try again!`;
    }
  }

  private handleScaleFillNote(q: ScaleFillQuestion, note: NoteLabel) {
    const correct = note === q.answer;
    const targetIdx = q.blankIndexes[q.currentBlankIndex];
    this.recordAndFeedback(q.key, 'Scale Fill', correct);

    if (correct) {
      q.scale[targetIdx] = note;
      q.currentBlankIndex++;
      this.selectedNote = note;
      this.answerState = 'correct';

      if (q.currentBlankIndex >= q.blankIndexes.length) {
        // All blanks filled
        this.clearTimer();
        this.answerState = 'complete';
        this.feedbackText = `🎉 Scale complete! ${this.scaleDisplay(q.scale as NoteLabel[])}`;
        if (q.hadError) this.mistakes.push(q);
      } else {
        // Advance to next blank
        q.answer = this.theory.generateMajorScale(q.key)[q.blankIndexes[q.currentBlankIndex]];
        this.feedbackText = `✅ Correct! Next blank: degree ${q.blankIndexes[q.currentBlankIndex] + 1}`;
        // Clear the flash after a beat so grid isn't stuck showing green
        setTimeout(() => {
          if (this.answerState === 'correct') {
            this.answerState = 'unanswered';
            this.selectedNote = null;
            this.feedbackText = '';
          }
        }, 600);
      }
    } else {
      q.hadError = true;
      this.selectedNote = note;
      this.answerState = 'incorrect';
      this.feedbackText = `❌ Not that one — try again!`;
    }
  }

  private handleDegreeNote(q: DegreeQuestion, note: NoteLabel) {
    const correct = note === q.answer;
    this.selectedNote = note;
    this.recordAndFeedback(q.key, `Degree ${q.degree}`, correct);

    if (correct) {
      this.clearTimer();
      this.answerState = 'complete';
      this.feedbackText = `✅ Correct! Degree ${q.degree} of ${q.key} major = ${q.answer}`;
      if (q.hadError) this.mistakes.push(q);
    } else {
      q.hadError = true;
      this.answerState = 'incorrect';
      this.feedbackText = `❌ Not quite — think about the ${q.key} major scale.`;
    }
  }

  private handleKeySigListNote(q: KeySigListQuestion, note: NoteLabel) {
    const correct = note === q.answer;
    this.selectedNote = note;
    this.recordAndFeedback(q.key, 'Key Sig', correct);

    if (correct) {
      q.currentIndex++;
      this.answerState = 'correct';

      if (q.currentIndex >= q.accidentals.length) {
        this.clearTimer();
        this.answerState = 'complete';
        this.feedbackText = `🎹 All ${q.accidentalType}s named! ${q.accidentals.join(' – ')}`;
        if (q.hadError) this.mistakes.push(q);
      } else {
        q.answer = q.accidentals[q.currentIndex];
        this.feedbackText = `✅ Yes! Next ${q.accidentalType} #${q.currentIndex + 1}:`;
        setTimeout(() => {
          if (this.answerState === 'correct') {
            this.answerState = 'unanswered';
            this.selectedNote = null;
            this.feedbackText = '';
          }
        }, 600);
      }
    } else {
      q.hadError = true;
      this.answerState = 'incorrect';
      this.feedbackText = `❌ Wrong — the ${q.accidentalType}s go in a fixed order. Think!`;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Shared scoring helper
  // ────────────────────────────────────────────────────────────────────────

  private recordAndFeedback(key: string, cell: string, correct: boolean) {
    const ms = Date.now() - this.sessionStartTime;
    this.progress.recordAnswer(key, cell, correct, ms);

    if (correct) {
      this.sessionCorrect++;
      this.hotStreak++;
      this.streak.incrementDailyGoal(1);
      this.milestone.unlock('first_note');
      this.milestone.checkAutoMilestones(
        this.streak.getState().currentStreak,
        this.progress.getAverageResponseMs(),
      );
    } else {
      this.hotStreak = 0;
    }
    this.sessionTotal++;
    this.updateReadiness(correct);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Readiness nudge
  // ────────────────────────────────────────────────────────────────────────

  private updateReadiness(correct: boolean) {
    this.recentAnswers.push(correct);
    if (this.recentAnswers.length > 10) this.recentAnswers.shift();

    if (this.recentAnswers.length < 5) return;

    const accuracy = this.recentAnswers.filter(Boolean).length / this.recentAnswers.length;

    if (accuracy >= 0.8) {
      this.consecutiveReadyBatches++;
      if (this.consecutiveReadyBatches >= 2 && !this.isBossRound) {
        this.nudgeType = 'ready';
        this.showReadinessNudge = true;
      }
    } else if (accuracy < 0.5) {
      this.consecutiveReadyBatches = 0;
      this.nudgeType = 'slow-down';
      this.showReadinessNudge = true;
    } else {
      this.consecutiveReadyBatches = 0;
      this.showReadinessNudge = false;
    }
  }

  dismissNudge() { this.showReadinessNudge = false; }

  // ────────────────────────────────────────────────────────────────────────
  // Timer
  // ────────────────────────────────────────────────────────────────────────

  private startTimer() {
    const total = this.currentStage.bossTimerSec ?? 10;
    this.timeLeft = total;
    this.timerPct = 100;
    this.timerInterval = setInterval(() => {
      this.timeLeft = Math.max(0, this.timeLeft - 1);
      this.timerPct = (this.timeLeft / total) * 100;
      if (this.timeLeft === 0) {
        this.clearTimer();
        this.onTimerExpired();
      }
    }, 1000);
  }

  private clearTimer() {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private onTimerExpired() {
    if (this.answerState === 'complete' || !this.question) return;
    this.hotStreak = 0;
    if (!this.question.hadError) this.mistakes.push(this.question);
    this.question.hadError = true;
    const cellName = this.question.type === 'scale-fill' ? 'Scale Fill'
      : this.question.type === 'degree' ? `Degree ${(this.question as DegreeQuestion).degree}`
      : 'Key Sig';
    this.recordAndFeedback(this.question.key, cellName, false);
    this.answerState = 'incorrect';
    this.feedbackText = '⏰ Time\'s up!';
    setTimeout(() => { if (this.answerState === 'incorrect') this.nextQuestion(); }, 1500);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Mnemonic tip
  // ────────────────────────────────────────────────────────────────────────

  getMnemonic(): string | null {
    if (!this.question || this.answerState !== 'incorrect') return null;
    const q = this.question;
    if (q.type === 'key-sig-count' || q.type === 'key-sig-list') {
      const ks = this.theory.getKeySig(q.key);
      if (ks.type === 'sharp') return this.theory.SHARP_MNEMONIC;
      if (ks.type === 'flat') return this.theory.FLAT_MNEMONIC;
      return 'C major has no accidentals — it\'s the natural starting point!';
    }
    if (q.type === 'scale-fill') return this.theory.SCALE_FORMULA;
    return null;
  }

  startBossRound() {
    this.showReadinessNudge = false;
    this.isBossRound = true;
    this.startSession();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Boss round
  // ────────────────────────────────────────────────────────────────────────

  private finishBossRound() {
    const stageId = this.currentStage.id as Stage;
    this.bossFinalPassed = this.learningPath.recordBossResult(
      stageId, this.sessionCorrect, this.sessionTotal,
    );
    this.bossFinalScore = this.sessionCorrect;
    this.bossFinalTotal = this.sessionTotal;
    if (!this.bossFinalPassed) {
      this.failedBossQuestions = [...this.mistakes];
    }
    this.bossComplete = true;
    this.question = null;
  }

  retryBossRound() {
    this.retryPrependPool = [...this.failedBossQuestions];
    this.failedBossQuestions = [];
    this.isBossRound = true;
    this.startSession();
  }

  goToNextStage() {
    this.currentStage = this.learningPath.getCurrentStage();
    this.isBossRound = false;
    this.router.navigateByUrl(this.learningPath.getDrillRoute(this.currentStage));
  }

  // ────────────────────────────────────────────────────────────────────────
  // Template helpers
  // ────────────────────────────────────────────────────────────────────────

  get accuracyPct(): number {
    return this.sessionTotal === 0 ? 0
      : Math.round(this.sessionCorrect / this.sessionTotal * 100);
  }

  get mistakesRemaining(): number { return this.mistakeQueue.length; }

  isActiveBlank(slotIndex: number): boolean {
    if (!this.question || this.question.type !== 'scale-fill') return false;
    const q = this.question as ScaleFillQuestion;
    return q.blankIndexes[q.currentBlankIndex] === slotIndex &&
           this.answerState !== 'complete';
  }

  isFilledBlank(slotIndex: number): boolean {
    if (!this.question || this.question.type !== 'scale-fill') return false;
    const q = this.question as ScaleFillQuestion;
    return q.blankIndexes.includes(slotIndex) && q.scale[slotIndex] !== null;
  }

  getNoteClass(note: NoteLabel): string {
    if (this.answerState === 'unanswered') return '';
    if (!this.selectedNote) return '';
    if (note === this.selectedNote) {
      return this.answerState === 'correct' || this.answerState === 'complete'
        ? 'correct' : 'incorrect';
    }
    return '';
  }

  getNumberClass(n: number): string {
    if (this.selectedNumber === null) return '';
    if (n !== this.selectedNumber) return '';
    return this.answerState === 'complete' ? 'correct' : 'incorrect';
  }

  isNoteGridDisabled(): boolean {
    return this.answerState === 'complete';
  }

  private scaleDisplay(scale: NoteLabel[]): string {
    return scale.join(' – ');
  }

  getKeySigAccidentals(key: string): NoteLabel[] {
    return this.theory.getKeySig(key).accidentals;
  }

  range(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }

  asScaleFill(q: FoundationQuestion): ScaleFillQuestion { return q as ScaleFillQuestion; }
  asDegree(q: FoundationQuestion): DegreeQuestion { return q as DegreeQuestion; }
  asKeySigCount(q: FoundationQuestion): KeySigCountQuestion { return q as KeySigCountQuestion; }
  asKeySigList(q: FoundationQuestion): KeySigListQuestion { return q as KeySigListQuestion; }
}
