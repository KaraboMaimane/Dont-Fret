import { Injectable } from '@angular/core';
import { MusicTheoryService, IntervalQuestion, NoteLabel } from './music-theory.service';
import { ProgressService } from './progress.service';
import { LearningPathService, Stage } from './learning-path.service';

@Injectable({ providedIn: 'root' })
export class AdaptiveService {
  constructor(
    private theory: MusicTheoryService,
    private progress: ProgressService,
    private learningPath: LearningPathService,
  ) {}

  /**
   * Build a weighted question pool for the current stage
   * Weak pairs (accuracy < 0.5) get weight 3; others weight 1
   */
  buildQuestionPool(stageOverride?: Stage, count = 40): IntervalQuestion[] {
    const stage = stageOverride
      ? this.learningPath.getStage(stageOverride)
      : this.learningPath.getCurrentStage();

    const keys = stage.keys;
    const intervals = stage.intervals.length > 0
      ? stage.intervals
      : this.theory.DIATONIC_INTERVALS.map(i => i.name);

    const pool: IntervalQuestion[] = [];

    for (const key of keys) {
      for (const intervalName of intervals) {
        const acc = this.progress.getAccuracy(key, intervalName);
        const weight = acc < 0.5 ? 3 : 1;
        const answer = this.theory.getIntervalAnswer(key, intervalName);
        for (let w = 0; w < weight; w++) {
          pool.push({ key, intervalName, intervalType: 'diatonic', answer });
        }
      }
    }

    // Fisher-Yates shuffle + slice
    return this.shuffle(pool).slice(0, count);
  }

  /**
   * Build a pool for boss round (focus on weakest items in a stage)
   */
  buildBossPool(stage: Stage, count: number): IntervalQuestion[] {
    const stageData = this.learningPath.getStage(stage);
    const keys = stageData.keys;
    const intervals = stageData.intervals.length > 0
      ? stageData.intervals
      : this.theory.DIATONIC_INTERVALS.map(i => i.name);

    const questions: IntervalQuestion[] = [];
    for (const key of keys) {
      for (const name of intervals) {
        const answer = this.theory.getIntervalAnswer(key, name);
        questions.push({ key, intervalName: name, intervalType: 'diatonic', answer });
      }
    }

    // Sort so weakest float to top
    const sorted = questions.sort((a, b) => {
      return this.progress.getAccuracy(a.key, a.intervalName) -
             this.progress.getAccuracy(b.key, b.intervalName);
    });

    return sorted.slice(0, count);
  }

  /**
   * Get a pool targeting only the user's weakest key/interval pairs
   */
  buildStrugglePool(count = 10): IntervalQuestion[] {
    const weak = this.progress.getWeakestCells(6);
    if (weak.length === 0) return this.buildQuestionPool(undefined, count);

    const questions: IntervalQuestion[] = [];
    for (const { key, intervalName } of weak) {
      try {
        const answer = this.theory.getIntervalAnswer(key, intervalName);
        questions.push({ key, intervalName, intervalType: 'diatonic', answer });
      } catch (_) { /* skip unknown intervals */ }
    }
    return this.shuffle(questions).slice(0, count);
  }

  /**
   * Get a pool of all-stage questions for the exam
   */
  buildExamPool(count = 20): IntervalQuestion[] {
    const allIntervals = this.theory.ALL_INTERVALS;
    const allKeys = this.theory.ALL_KEYS;
    const pool: IntervalQuestion[] = [];

    for (const key of allKeys) {
      for (const name of allIntervals) {
        try {
          const answer = this.theory.getIntervalAnswer(key, name);
          pool.push({ key, intervalName: name, intervalType: 'diatonic', answer });
        } catch (_) { /* skip */ }
      }
    }
    return this.shuffle(pool).slice(0, count);
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
