import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar,
} from '@ionic/angular/standalone';
import { MusicTheoryService, NoteLabel } from '../../services/music-theory.service';
import { LearningPathService } from '../../services/learning-path.service';
import { ProgressService } from '../../services/progress.service';
import { StreakService } from '../../services/streak.service';

interface IDQuestion {
  root: NoteLabel;
  target: NoteLabel;
  correctInterval: string;
  intervalSemitones: number;
}

interface IDResult {
  question: IDQuestion;
  selected: string;
  correct: boolean;
}

@Component({
  selector: 'app-interval-id',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton],
  templateUrl: './interval-id.page.html',
})
export class IntervalIdPage {
  state: 'intro' | 'playing' | 'done' = 'intro';
  questions: IDQuestion[] = [];
  results: IDResult[] = [];
  currentIndex = 0;
  feedback = '';
  selectedInterval: string | null = null;
  lastCorrect = false;
  readonly totalQuestions = 12;
  currentStageName = '';
  options: string[] = [];

  constructor(
    private theory: MusicTheoryService,
    private learningPath: LearningPathService,
    private progress: ProgressService,
    private streak: StreakService,
    public router: Router,
  ) {
    this.options = [...this.theory.ALL_INTERVALS];
    this.currentStageName = this.learningPath.getCurrentStage().title;
  }

  ionViewWillEnter() {
    this.currentStageName = this.learningPath.getCurrentStage().title;
    this.options = [...this.theory.ALL_INTERVALS];
  }

  startSession() {
    this.questions = this.buildPool(this.totalQuestions);
    this.results = [];
    this.currentIndex = 0;
    this.feedback = '';
    this.selectedInterval = null;
    this.lastCorrect = false;
    this.state = 'playing';
    this.streak.recordActivity();
  }

  select(interval: string) {
    if (this.feedback) return;
    const question = this.questions[this.currentIndex];
    if (!question) return;

    this.selectedInterval = interval;
    const correct = this.isAnswerCorrect(interval, question);
    this.lastCorrect = correct;
    this.results.push({ question, selected: interval, correct });

    this.feedback = correct
      ? '✅ Correct!'
      : `❌ It's the ${question.correctInterval} (${question.intervalSemitones} semitones)`;

    this.progress.recordAnswer(question.root, question.correctInterval, correct, 0, 'Interval ID');
    this.streak.incrementDailyGoal(1);

    setTimeout(() => {
      this.currentIndex++;
      this.feedback = '';
      this.selectedInterval = null;
      this.lastCorrect = false;
      if (this.currentIndex >= this.questions.length) {
        this.state = 'done';
      }
    }, 550);
  }

  get progressPct(): number {
    return this.questions.length === 0 ? 0 : Math.round((this.currentIndex / this.questions.length) * 100);
  }

  get scorePct(): number {
    const correct = this.results.filter(r => r.correct).length;
    return this.results.length === 0 ? 0 : Math.round((correct / this.results.length) * 100);
  }

  get currentQuestion(): IDQuestion | null {
    return this.questions[this.currentIndex] ?? null;
  }

  get mistakeSummary(): { root: string; target: string; selected: string; correct: string }[] {
    return this.results
      .filter(r => !r.correct)
      .map(r => ({
        root: r.question.root,
        target: r.question.target,
        selected: r.selected,
        correct: r.question.correctInterval,
      }));
  }

  private isAnswerCorrect(selected: string, question: IDQuestion): boolean {
    if (selected === question.correctInterval) return true;
    // Accept enharmonic equivalents (e.g. Aug4th ↔ Dim5th = 6 semitones)
    return this.getSemitonesForInterval(selected) === question.intervalSemitones;
  }

  private getSemitonesForInterval(name: string): number {
    const d = this.theory.DIATONIC_INTERVALS.find(i => i.name === name);
    if (d) return d.semitones;
    const h = this.theory.HARMONIC_INTERVALS.find(i => i.name === name);
    return h ? h.semitones : -1;
  }

  private buildPool(count: number): IDQuestion[] {
    const stage = this.learningPath.getCurrentStage();
    const keys = (stage.keys.length > 0 ? stage.keys : this.theory.ALL_KEYS) as NoteLabel[];
    // Interval stages have intervals defined; scale stages don't — fall back to diatonic
    const intervals = stage.intervals.length > 0
      ? stage.intervals
      : [
          ...this.theory.DIATONIC_INTERVALS.map(i => i.name),
          ...this.theory.HARMONIC_INTERVALS.map(i => i.name),
        ];

    const all: IDQuestion[] = [];
    for (const key of keys) {
      for (const interval of intervals) {
        try {
          const target = this.theory.getIntervalAnswer(key, interval);
          const semitones = this.theory.getSemitonesFromRoot(key, target);
          if (semitones > 0) {
            all.push({ root: key, target, correctInterval: interval, intervalSemitones: semitones });
          }
        } catch { /* skip unknown */ }
      }
    }

    // Fallback: all keys × diatonic if stage has no intervals
    if (all.length === 0) {
      for (const key of this.theory.ALL_KEYS as NoteLabel[]) {
        for (const iv of this.theory.DIATONIC_INTERVALS) {
          try {
            const target = this.theory.getIntervalAnswer(key, iv.name);
            all.push({ root: key, target, correctInterval: iv.name, intervalSemitones: iv.semitones });
          } catch { /* skip */ }
        }
      }
    }

    return this.shuffle(all).slice(0, count);
  }

  private shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
