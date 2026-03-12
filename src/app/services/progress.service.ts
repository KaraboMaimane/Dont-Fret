import { Injectable } from '@angular/core';

export type MasteryLevel = 'unplayed' | 'focus' | 'needs-work' | 'mastered';

export interface CellRecord {
  correct: number;
  total: number;
  totalResponseMs: number;
  lastSeen?: number;    // timestamp of last attempt
  nextReviewAt?: number; // spaced-repetition — epoch ms when this cell is due again
}

export interface SessionRecord {
  date: number;
  mode: string;
  correct: number;
  total: number;
  durationMs: number;
}

export interface DueReviewCell {
  key: string;
  intervalName: string;
  accuracy: number;
  total: number;
  nextReviewAt: number;
  avgResponseMs: number;
  priorityScore: number;
}

export interface MistakeEntry {
  date: number;
  key: string;
  intervalName: string;
  responseMs: number;
  mode: string;
}

export interface ProgressState {
  totalQuestions: number;
  correctAnswers: number;
  totalResponseMs: number;
  cells: Record<string, CellRecord>;   // key: `${key}|${intervalName}`
  sessions: SessionRecord[];
  mistakeLog: MistakeEntry[];
}

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly STORAGE_KEY = 'dont-fret-progress';
  private state!: ProgressState;

  constructor() {
    this.load();
  }

  private load() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      this.state = JSON.parse(raw);
    } else {
      this.state = {
        totalQuestions: 0,
        correctAnswers: 0,
        totalResponseMs: 0,
        cells: {},
        sessions: [],
        mistakeLog: [],
      };
    }

    if (!this.state.mistakeLog) {
      this.state.mistakeLog = [];
    }
  }

  private save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
  }

  private cellKey(key: string, intervalName: string): string {
    return `${key}|${intervalName}`;
  }

  recordAnswer(key: string, intervalName: string, isCorrect: boolean, responseMs: number, mode = 'General') {
    const k = this.cellKey(key, intervalName);
    if (!this.state.cells[k]) {
      this.state.cells[k] = { correct: 0, total: 0, totalResponseMs: 0 };
    }
    this.state.cells[k].total++;
    this.state.cells[k].totalResponseMs += responseMs;
    this.state.cells[k].lastSeen = Date.now();
    if (isCorrect) {
      this.state.cells[k].correct++;
      this.state.correctAnswers++;
      // Schedule spaced repetition review
      const acc = this.state.cells[k].correct / this.state.cells[k].total;
      const total = this.state.cells[k].total;
      const dayMs = 86_400_000;
      const intervalDays = (acc >= 0.8 && total >= 5) ? 7
        : acc >= 0.5 ? 3
        : 1;
      this.state.cells[k].nextReviewAt = Date.now() + intervalDays * dayMs;
    } else {
      this.state.mistakeLog.unshift({
        date: Date.now(),
        key,
        intervalName,
        responseMs,
        mode,
      });
      this.state.mistakeLog = this.state.mistakeLog.slice(0, 400);
    }
    this.state.totalQuestions++;
    this.state.totalResponseMs += responseMs;
    this.save();
  }

  recordSession(mode: string, correct: number, total: number, durationMs: number) {
    this.state.sessions.unshift({
      date: Date.now(),
      mode,
      correct,
      total,
      durationMs
    });
    // Keep only last 20 sessions
    this.state.sessions = this.state.sessions.slice(0, 20);
    this.save();
  }

  getMasteryLevel(key: string, intervalName: string): MasteryLevel {
    const k = this.cellKey(key, intervalName);
    const cell = this.state.cells[k];
    if (!cell || cell.total === 0) return 'unplayed';
    const acc = cell.correct / cell.total;
    if (acc >= 0.8 && cell.total >= 5) return 'mastered';
    if (acc >= 0.5) return 'needs-work';
    return 'focus';
  }

  getCellRecord(key: string, intervalName: string): CellRecord | null {
    return this.state.cells[this.cellKey(key, intervalName)] ?? null;
  }

  /** True when this cell has a scheduled review and that review time has passed. */
  isOverdue(key: string, intervalName: string): boolean {
    const cell = this.getCellRecord(key, intervalName);
    if (!cell?.nextReviewAt) return false;
    return Date.now() >= cell.nextReviewAt;
  }

  getAccuracy(key: string, intervalName: string): number {
    const cell = this.getCellRecord(key, intervalName);
    if (!cell || cell.total === 0) return 0;
    return cell.correct / cell.total;
  }

  getOverallAccuracy(): number {
    if (this.state.totalQuestions === 0) return 0;
    return this.state.correctAnswers / this.state.totalQuestions;
  }

  getAverageResponseMs(): number {
    if (this.state.totalQuestions === 0) return 0;
    return this.state.totalResponseMs / this.state.totalQuestions;
  }

  getTotalQuestions(): number { return this.state.totalQuestions; }
  getCorrectAnswers(): number { return this.state.correctAnswers; }

  getRecentSessions(count = 5): SessionRecord[] {
    return this.state.sessions.slice(0, count);
  }

  getDueCells(limit = 6): DueReviewCell[] {
    const now = Date.now();

    return Object.entries(this.state.cells)
      .filter(([, cell]) => !!cell.nextReviewAt && cell.nextReviewAt <= now)
      .map(([k, cell]) => {
        const [key, intervalName] = k.split('|');
        const avgResponseMs = cell.total > 0 ? cell.totalResponseMs / cell.total : 0;
        return {
          key,
          intervalName,
          accuracy: cell.total > 0 ? cell.correct / cell.total : 0,
          total: cell.total,
          nextReviewAt: cell.nextReviewAt!,
          avgResponseMs,
          priorityScore: this.getReviewPriorityScore(cell, now),
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore || a.nextReviewAt - b.nextReviewAt)
      .slice(0, limit);
  }

  getDueCount(): number {
    const now = Date.now();
    return Object.values(this.state.cells)
      .filter(cell => !!cell.nextReviewAt && cell.nextReviewAt <= now)
      .length;
  }

  /** Returns the 3 worst key×interval pairs (min 3 attempts) */
  getWeakestCells(limit = 3): { key: string; intervalName: string; accuracy: number }[] {
    return Object.entries(this.state.cells)
      .filter(([, cell]) => cell.total >= 3)
      .map(([k, cell]) => {
        const [key, intervalName] = k.split('|');
        return { key, intervalName, accuracy: cell.correct / cell.total };
      })
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, limit);
  }

  getRecentMistakes(count = 40): MistakeEntry[] {
    return this.state.mistakeLog.slice(0, count);
  }

  getTopMistakePairs(limit = 8): {
    key: string;
    intervalName: string;
    misses: number;
    avgResponseMs: number;
    lastSeen: number;
  }[] {
    const grouped = new Map<string, { misses: number; totalResponseMs: number; lastSeen: number }>();

    for (const entry of this.state.mistakeLog) {
      const id = `${entry.key}|${entry.intervalName}`;
      const prev = grouped.get(id) ?? { misses: 0, totalResponseMs: 0, lastSeen: 0 };
      grouped.set(id, {
        misses: prev.misses + 1,
        totalResponseMs: prev.totalResponseMs + entry.responseMs,
        lastSeen: Math.max(prev.lastSeen, entry.date),
      });
    }

    return Array.from(grouped.entries())
      .map(([id, value]) => {
        const [key, intervalName] = id.split('|');
        return {
          key,
          intervalName,
          misses: value.misses,
          avgResponseMs: value.misses > 0 ? Math.round(value.totalResponseMs / value.misses) : 0,
          lastSeen: value.lastSeen,
        };
      })
      .sort((a, b) => b.misses - a.misses || b.lastSeen - a.lastSeen)
      .slice(0, limit);
  }

  resetProgress() {
    this.state = {
      totalQuestions: 0,
      correctAnswers: 0,
      totalResponseMs: 0,
      cells: {},
      sessions: [],
      mistakeLog: [],
    };
    this.save();
  }

  private getReviewPriorityScore(cell: CellRecord, now: number): number {
    const accuracy = cell.total > 0 ? cell.correct / cell.total : 0;
    const accuracyRisk = 1 - accuracy;
    const avgResponseMs = cell.total > 0 ? cell.totalResponseMs / cell.total : 0;
    const speedRisk = Math.min(avgResponseMs / 6000, 1);
    const daysSinceSeen = cell.lastSeen ? (now - cell.lastSeen) / 86_400_000 : 10;
    const recencyRisk = Math.min(daysSinceSeen / 7, 1);
    const overdueDays = cell.nextReviewAt ? Math.max((now - cell.nextReviewAt) / 86_400_000, 0) : 0;
    const overdueRisk = Math.min(overdueDays / 7, 1);
    return Math.round((accuracyRisk * 0.45 + overdueRisk * 0.25 + speedRisk * 0.2 + recencyRisk * 0.1) * 100);
  }

  getState(): ProgressState { return this.state; }
}
