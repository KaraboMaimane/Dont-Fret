import { Component, OnInit, OnDestroy } from '@angular/core';
/* expose Math for template */
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons } from '@ionic/angular/standalone';
import { MusicTheoryService, IntervalQuestion, NoteLabel } from '../../services/music-theory.service';
import { ProgressService } from '../../services/progress.service';
import { AdaptiveService } from '../../services/adaptive.service';
import { StreakService } from '../../services/streak.service';
import { LearningPathService } from '../../services/learning-path.service';
import { MilestoneService } from '../../services/milestone.service';
import { HapticsService } from '../../services/haptics.service';

type GameState = 'idle' | 'playing' | 'answered' | 'done';

interface IntervalStat { name: string; correct: number; total: number; }

@Component({
  selector: 'app-worksheet-challenge',
  standalone: true,
  imports: [CommonModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons],
  templateUrl: './worksheet-challenge.page.html',
})
export class WorksheetChallengePage implements OnInit, OnDestroy {
  state: GameState = 'idle';
  questions: IntervalQuestion[] = [];
  currentIndex = 0;
  notes: NoteLabel[] = [];
  selectedNote: NoteLabel | null = null;
  isCorrect: boolean | null = null;
  sessionCorrect = 0;
  sessionStart = 0;
  readonly Math = Math;
  private questionStart = 0;
  intervalStats: IntervalStat[] = [];

  constructor(
    private theory: MusicTheoryService,
    public progress: ProgressService,
    private adaptive: AdaptiveService,
    private streak: StreakService,
    private learningPath: LearningPathService,
    private milestone: MilestoneService,
    private haptics: HapticsService,
  ) {}

  ngOnInit() {
    this.notes = this.theory.getChromaticNotes();
  }

  ngOnDestroy() {
    if (this.state !== 'idle' && this.state !== 'done') this.saveSession();
  }

  startSession() {
    this.questions = this.adaptive.buildQuestionPool(undefined, 40);
    this.currentIndex = 0;
    this.notes = this.questions.length > 0
      ? this.theory.getChromaticNotesForKey(this.questions[0].key)
      : this.theory.getChromaticNotes();
    this.sessionCorrect = 0;
    this.sessionStart = Date.now();
    this.selectedNote = null;
    this.isCorrect = null;
    this.state = 'playing';
    this.intervalStats = [];
    this.streak.recordActivity();
    this.questionStart = Date.now();
  }

  selectNote(note: NoteLabel) {
    if (this.state !== 'playing') return;
    const q = this.currentQuestion;
    const responseMs = Date.now() - this.questionStart;
    this.selectedNote = note;
    this.isCorrect = note === q.answer;
    if (this.isCorrect) this.haptics.success();
    else this.haptics.error();
    this.state = 'answered';
    this.progress.recordAnswer(q.key, q.intervalName, this.isCorrect, responseMs);
    this.streak.incrementDailyGoal(1);
    if (this.isCorrect) this.sessionCorrect++;
  }

  next() {
    this.currentIndex++;
    if (this.currentIndex >= this.questions.length) {
      this.finishSession();
    } else {
      this.notes = this.theory.getChromaticNotesForKey(this.questions[this.currentIndex].key);
      this.state = 'playing';
      this.selectedNote = null;
      this.isCorrect = null;
      this.questionStart = Date.now();
    }
  }

  finishSession() {
    this.state = 'done';
    this.buildIntervalStats();
    this.saveSession();
    this.milestone.checkAutoMilestones(this.streak.getState().currentStreak, this.progress.getAverageResponseMs());
  }

  private saveSession() {
    this.progress.recordSession('Worksheet', this.sessionCorrect, this.questions.length, Date.now() - this.sessionStart);
  }

  private buildIntervalStats() {
    const map: Record<string, { keys: string[]; total: number }> = {};
    this.questions.forEach(q => {
      if (!map[q.intervalName]) map[q.intervalName] = { keys: [], total: 0 };
      map[q.intervalName].total++;
      map[q.intervalName].keys.push(q.key);
    });
    this.intervalStats = Object.entries(map).map(([name, v]) => {
      // Average accuracy across all keys used for this interval in the session
      const avgAcc = v.keys.reduce((sum, k) => sum + this.progress.getAccuracy(k, name), 0) / v.keys.length;
      return { name, correct: Math.round(avgAcc * v.total), total: v.total };
    });
  }

  get currentQuestion(): IntervalQuestion { return this.questions[this.currentIndex]; }
  get progressPct(): number { return ((this.currentIndex + 1) / this.questions.length) * 100; }
  get overallAccuracy(): number { return Math.round((this.sessionCorrect / this.questions.length) * 100); }

  getNoteClass(note: NoteLabel): string {
    if (this.state !== 'answered') return '';
    const q = this.currentQuestion;
    if (note === this.selectedNote) return this.isCorrect ? 'correct' : 'incorrect';
    if (note === q.answer) return 'correct';
    return '';
  }
}
