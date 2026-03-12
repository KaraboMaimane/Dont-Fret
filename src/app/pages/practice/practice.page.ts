import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons, IonButton
} from '@ionic/angular/standalone';
import { MusicTheoryService, IntervalQuestion, NoteLabel } from '../../services/music-theory.service';
import { ProgressService } from '../../services/progress.service';
import { AdaptiveService } from '../../services/adaptive.service';
import { StreakService } from '../../services/streak.service';
import { MilestoneService } from '../../services/milestone.service';
import { LearningPathService } from '../../services/learning-path.service';

type AnswerState = 'unanswered' | 'correct' | 'incorrect';

@Component({
  selector: 'app-practice',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons, IonButton],
  templateUrl: './practice.page.html',
})
export class PracticePage implements OnInit, OnDestroy {
  question: IntervalQuestion | null = null;
  notes: NoteLabel[] = [];
  answerState: AnswerState = 'unanswered';
  selectedNote: NoteLabel | null = null;
  feedbackText = '';
  hintText = '';
  showHint = false;
  responseMs = 0;
  sessionCorrect = 0;
  sessionTotal = 0;
  sessionStart = 0;
  showMistakeReplay = false;
  mistakeQueue: IntervalQuestion[] = [];
  showRoundSummary = false;
  roundAccuracy = 0;
  prevSessionAccuracy = 0;
  accuracyDelta = 0;
  private questionStart = 0;
  private pool: IntervalQuestion[] = [];
  private poolIndex = 0;
  public mistakes: IntervalQuestion[] = [];
  isReplayMode = false;

  constructor(
    private theory: MusicTheoryService,
    private progress: ProgressService,
    private adaptive: AdaptiveService,
    private streak: StreakService,
    public milestone: MilestoneService,
    private learningPath: LearningPathService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() { this.startSession(); }
  ngOnDestroy() { this.saveSession(); }

  startSession() {
    const sessions = this.progress.getRecentSessions(2);
    this.prevSessionAccuracy = sessions.length >= 1
      ? Math.round((sessions[0].correct / (sessions[0].total || 1)) * 100)
      : 0;

    const focusKey = this.route.snapshot.queryParams['key'] as string | undefined;
    const focusInterval = this.route.snapshot.queryParams['interval'] as string | undefined;
    if (focusKey && focusInterval) {
      const answer = this.theory.getIntervalAnswer(focusKey as NoteLabel, focusInterval);
      const intervalType: 'diatonic' | 'harmonic' =
        this.theory.DIATONIC_INTERVALS.some(i => i.name === focusInterval) ? 'diatonic' : 'harmonic';
      const focusPool = answer
        ? Array.from({ length: 10 }, () => ({
            key: focusKey as NoteLabel,
            intervalName: focusInterval,
            intervalType,
            answer,
          }))
        : [];
      this.pool = [...focusPool, ...this.adaptive.buildQuestionPool(undefined, 30)];
    } else {
      this.pool = this.adaptive.buildQuestionPool(undefined, 40);
    }
    this.poolIndex = 0;
    this.sessionCorrect = 0;
    this.sessionTotal = 0;
    this.sessionStart = Date.now();
    this.mistakes = [];
    this.isReplayMode = false;
    this.showMistakeReplay = false;
    this.notes = this.theory.getChromaticNotes();
    this.nextQuestion();
    this.streak.recordActivity();
  }

  nextQuestion() {
    this.answerState = 'unanswered';
    this.selectedNote = null;
    this.showHint = false;
    this.hintText = '';
    this.feedbackText = '';

    if (this.isReplayMode) {
      if (this.mistakeQueue.length === 0) {
        this.showMistakeReplay = false;
        this.isReplayMode = false;
        // All replay answers correct → earn Mistake Buster
        if (this.mistakes.length === 0) {
          this.milestone.unlock('mistake_buster');
        }
        this.showRoundEnd();
        return;
      } else {
        this.question = this.mistakeQueue.shift()!;
      }
    } else {
      if (this.poolIndex >= this.pool.length) {
        if (this.mistakes.length > 0) {
          this.showMistakeReplay = true;
          return;
        }
        this.showRoundEnd();
        return;
      }
      this.question = this.pool[this.poolIndex++];
    }
    this.questionStart = Date.now();
  }

  selectNote(note: NoteLabel) {
    if (this.answerState !== 'unanswered' || !this.question) return;
    this.responseMs = Date.now() - this.questionStart;
    this.selectedNote = note;
    const correct = this.theory.areEnharmonicEquals(note, this.question.answer);
    this.answerState = correct ? 'correct' : 'incorrect';
    if (correct) {
      this.feedbackText = `✅ Correct! ${this.question.key} ${this.question.intervalName} = ${this.question.answer} (${(this.responseMs/1000).toFixed(1)}s)`;
    } else {
      const actualInterval = this.theory.getIntervalNameForNote(this.question.key, note);
      const clue = actualInterval ? ` (${note} is the ${actualInterval})` : '';
      this.feedbackText = `❌ Wrong${clue} — the ${this.question.intervalName} of ${this.question.key} is ${this.question.answer}`;
    }

    this.progress.recordAnswer(this.question.key, this.question.intervalName, correct, this.responseMs);
    this.sessionTotal++;
    if (correct) {
      this.sessionCorrect++;
      this.milestone.unlock('first_note');
      this.streak.incrementDailyGoal(1);
    } else {
      this.mistakes.push({ ...this.question });
    }
    this.milestone.checkAutoMilestones(this.streak.getState().currentStreak, this.progress.getAverageResponseMs());
  }

  toggleHint() {
    if (!this.question) return;
    this.showHint = !this.showHint;
    if (this.showHint) {
      const scale = this.theory.generateMajorScale(this.question.key);
      this.hintText = `${this.question.key} Major Scale: ${scale.join(' – ')}`;
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
    this.showMistakeReplay = false;
    this.showRoundEnd();
  }

  private showRoundEnd() {
    this.saveSession();
    this.roundAccuracy = this.accuracyPct;
    this.accuracyDelta = this.roundAccuracy - this.prevSessionAccuracy;
    this.showRoundSummary = true;
    this.question = null;
  }

  continueAfterSummary() {
    this.showRoundSummary = false;
    this.startSession();
  }

  private saveSession() {
    if (this.sessionTotal > 0 && !this.showRoundSummary) {
      this.progress.recordSession('Practice', this.sessionCorrect, this.sessionTotal, Date.now() - this.sessionStart);
    }
  }

  getNoteClass(note: NoteLabel): string {
    if (!this.selectedNote || this.answerState === 'unanswered') return '';
    if (note === this.selectedNote) return this.answerState;
    if (this.answerState === 'incorrect' && this.question && this.theory.areEnharmonicEquals(note, this.question.answer)) return 'correct';
    return '';
  }

  get accuracyPct(): number {
    if (!this.sessionTotal) return 0;
    return Math.round(this.sessionCorrect / this.sessionTotal * 100);
  }
}
