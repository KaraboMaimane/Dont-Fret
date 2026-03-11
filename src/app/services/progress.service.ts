import { Injectable } from '@angular/core';

export type MasteryLevel = 'unplayed' | 'focus' | 'needs-work' | 'mastered';

export interface CellRecord {
  correct: number;
  total: number;
  totalResponseMs: number;
  lastSeen?: number;  // timestamp
}

export interface SessionRecord {
  date: number;
  mode: string;
  correct: number;
  total: number;
  durationMs: number;
}

export interface ProgressState {
  totalQuestions: number;
  correctAnswers: number;
  totalResponseMs: number;
  cells: Record<string, CellRecord>;   // key: `${key}|${intervalName}`
  sessions: SessionRecord[];
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
        sessions: []
      };
    }
  }

  private save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
  }

  private cellKey(key: string, intervalName: string): string {
    return `${key}|${intervalName}`;
  }

  recordAnswer(key: string, intervalName: string, isCorrect: boolean, responseMs: number) {
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

  resetProgress() {
    this.state = {
      totalQuestions: 0,
      correctAnswers: 0,
      totalResponseMs: 0,
      cells: {},
      sessions: []
    };
    this.save();
  }

  getState(): ProgressState { return this.state; }
}
