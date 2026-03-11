import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
    private milestone: MilestoneService,
    private learningPath: LearningPathService,
    private router: Router,
  ) {}

  ngOnInit() { this.startSession(); }
  ngOnDestroy() { this.saveSession(); }

  startSession() {
    this.pool = this.adaptive.buildQuestionPool(undefined, 40);
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
        this.pool = this.adaptive.buildQuestionPool(undefined, 40);
        this.poolIndex = 0;
      } else {
        this.question = this.mistakeQueue.shift()!;
      }
    } else {
      if (this.poolIndex >= this.pool.length) {
        if (this.mistakes.length > 0) {
          this.showMistakeReplay = true;
          return;
        }
        // Refill pool
        this.pool = this.adaptive.buildQuestionPool(undefined, 40);
        this.poolIndex = 0;
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
    this.feedbackText = correct
      ? `✅ Correct! ${this.question.key} ${this.question.intervalName} = ${this.question.answer} (${(this.responseMs/1000).toFixed(1)}s)`
      : `❌ Wrong — the ${this.question.intervalName} of ${this.question.key} is ${this.question.answer}`;

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
    this.pool = this.adaptive.buildQuestionPool(undefined, 40);
    this.poolIndex = 0;
    this.nextQuestion();
  }

  private saveSession() {
    if (this.sessionTotal > 0) {
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
