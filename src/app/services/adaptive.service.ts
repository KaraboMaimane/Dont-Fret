import { Injectable } from '@angular/core';
import {
  MusicTheoryService,
  IntervalQuestion,
  FoundationQuestion,
  NoteLabel,
} from './music-theory.service';
import { ProgressService } from './progress.service';
import { LearningPathService, Stage } from './learning-path.service';

export interface PracticePoolOptions {
  keys?: NoteLabel[];
  intervals?: string[];
  count?: number;
  dueOnly?: boolean;
  weakOnly?: boolean;
}

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
        // Overdue spaced-repetition cells get highest priority; weak cells moderate
        const weight = this.progress.isOverdue(key, intervalName) ? 5
          : acc < 0.5 ? 3
          : 1;
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

  buildDueReviewPool(count = 10): IntervalQuestion[] {
    const due = this.progress.getDueCells(Math.max(count, 6));
    if (due.length === 0) return this.buildQuestionPool(undefined, count);

    const questions: IntervalQuestion[] = [];
    for (const cell of due) {
      try {
        const answer = this.theory.getIntervalAnswer(cell.key, cell.intervalName);
        const intervalType = this.getIntervalType(cell.intervalName);
        const weight = cell.accuracy < 0.5 ? 3 : 2;
        for (let i = 0; i < weight; i++) {
          questions.push({
            key: cell.key,
            intervalName: cell.intervalName,
            intervalType,
            answer,
          });
        }
      } catch (_) {
        // Skip anything that no longer maps cleanly.
      }
    }

    return this.shuffle(questions).slice(0, count);
  }

  buildCustomQuestionPool(options: PracticePoolOptions): IntervalQuestion[] {
    const count = options.count ?? 12;
    const stage = this.learningPath.getCurrentStage();
    const keys = options.keys?.length ? options.keys : stage.keys;
    const intervals = options.intervals?.length
      ? options.intervals
      : stage.intervals.length > 0
        ? stage.intervals
        : this.theory.DIATONIC_INTERVALS.map(interval => interval.name);

    const dueLookup = new Set(
      this.progress.getDueCells(100).map(cell => `${cell.key}|${cell.intervalName}`)
    );
    const weakLookup = new Set(
      this.progress.getWeakestCells(20).map(cell => `${cell.key}|${cell.intervalName}`)
    );

    const pool: IntervalQuestion[] = [];
    for (const key of keys) {
      for (const intervalName of intervals) {
        const answer = this.theory.getIntervalAnswer(key, intervalName);
        const pairKey = `${key}|${intervalName}`;

        if (options.dueOnly && !dueLookup.has(pairKey)) continue;
        if (options.weakOnly && !weakLookup.has(pairKey)) continue;

        const accuracy = this.progress.getAccuracy(key, intervalName);
        const weight = dueLookup.has(pairKey) ? 4 : accuracy < 0.5 ? 3 : 1;

        for (let i = 0; i < weight; i++) {
          pool.push({
            key,
            intervalName,
            intervalType: this.getIntervalType(intervalName),
            answer,
          });
        }
      }
    }

    if (pool.length === 0) {
      return options.weakOnly
        ? this.buildStrugglePool(count)
        : options.dueOnly
          ? this.buildDueReviewPool(count)
          : this.buildQuestionPool(undefined, count);
    }

    return this.shuffle(pool).slice(0, count);
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

  private getIntervalType(intervalName: string): 'diatonic' | 'harmonic' {
    return this.theory.DIATONIC_INTERVALS.some(interval => interval.name === intervalName)
      ? 'diatonic'
      : 'harmonic';
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── Foundation pool builders ──────────────────────────────────────────────

  /**
   * Practice pool for Foundations stages.
   * Stage 1 (scale-fill): only scale-fill questions.
   * Stage 2 (key-sig): only key-sig count + list questions.
   * Weak keys get weight 3; strong keys get weight 1.
   */
  buildFoundationsPool(stage: Stage, count = 40): FoundationQuestion[] {
    const stageData = this.learningPath.getStage(stage);
    if (!stageData.foundationType) return [];

    const keys = stageData.keys;
    const pool: FoundationQuestion[] = [];

    for (const key of keys) {
      if (stageData.foundationType === 'scale-fill') {
        const acc = this.progress.getAccuracy(key, 'Scale Fill');
        const weight = acc < 0.5 ? 3 : 1;
        for (let w = 0; w < weight; w++) {
          pool.push(this.theory.generateScaleFillQuestion(key));
        }

      } else if (stageData.foundationType === 'key-sig') {
        const acc = this.progress.getAccuracy(key, 'Key Sig');
        const weight = acc < 0.5 ? 3 : 1;
        for (let w = 0; w < weight; w++) {
          pool.push(this.theory.generateKeySigCountQuestion(key));
          const listQ = this.theory.generateKeySigListQuestion(key);
          if (listQ) pool.push(listQ);
        }

      } else {
        // degree — one question per degree 2–7, weighted individually
        for (let deg = 2; deg <= 7; deg++) {
          const acc = this.progress.getAccuracy(key, `Degree ${deg}`);
          const weight = acc < 0.5 ? 2 : 1;
          for (let w = 0; w < weight; w++) {
            pool.push(this.theory.generateDegreeQuestion(key, deg));
          }
        }
      }
    }

    return this.shuffle(pool).slice(0, count);
  }

  /**
   * Boss-round pool for Foundations stages: one question type per key,
   * shuffled to `count`. Strictly matches stage type — no cross-mixing.
   */
  buildFoundationsBossPool(stage: Stage, count: number): FoundationQuestion[] {
    const stageData = this.learningPath.getStage(stage);
    if (!stageData.foundationType) return [];

    const keys = stageData.keys;
    const pool: FoundationQuestion[] = [];

    for (const key of keys) {
      if (stageData.foundationType === 'scale-fill') {
        pool.push(this.theory.generateScaleFillQuestion(key));

      } else if (stageData.foundationType === 'key-sig') {
        pool.push(this.theory.generateKeySigCountQuestion(key));
        const listQ = this.theory.generateKeySigListQuestion(key);
        if (listQ) pool.push(listQ);

      } else {
        const deg = Math.floor(Math.random() * 6) + 2;
        pool.push(this.theory.generateDegreeQuestion(key, deg));
      }
    }

    return this.shuffle(pool).slice(0, count);
  }
}
