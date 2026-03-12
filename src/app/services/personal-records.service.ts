import { Injectable } from '@angular/core';

export interface TimedRecord {
  correct: number;
  total: number;
  accuracy: number;
  timeLimitSec: number;
  stars: number;
  durationMs: number;
  date: number;
}

export interface BlitzRecord {
  correct: number;
  totalAnswered: number;
  accuracy: number;
  durationMs: number;
  date: number;
}

export interface ExamRecord {
  correct: number;
  total: number;
  accuracy: number;
  passed: boolean;
  date: number;
}

interface PersonalRecordsState {
  bestTimed: TimedRecord | null;
  bestBlitz: BlitzRecord | null;
  examHistory: ExamRecord[];
  timedHistory: TimedRecord[];
  blitzHistory: BlitzRecord[];
}

@Injectable({ providedIn: 'root' })
export class PersonalRecordsService {
  private readonly STORAGE_KEY = 'dont-fret-records';
  private state: PersonalRecordsState = {
    bestTimed: null,
    bestBlitz: null,
    examHistory: [],
    timedHistory: [],
    blitzHistory: [],
  };

  constructor() { this.load(); }

  recordTimedRun(correct: number, total: number, timeLimitSec: number, stars: number, durationMs: number): TimedRecord {
    const accuracy = total > 0 ? correct / total : 0;
    const run: TimedRecord = { correct, total, accuracy, timeLimitSec, stars, durationMs, date: Date.now() };
    this.state.timedHistory.unshift(run);
    this.state.timedHistory = this.state.timedHistory.slice(0, 30);
    if (!this.state.bestTimed ||
        correct > this.state.bestTimed.correct ||
        (correct === this.state.bestTimed.correct && accuracy > this.state.bestTimed.accuracy)) {
      this.state.bestTimed = run;
    }
    this.save();
    return run;
  }

  recordBlitzRun(correct: number, totalAnswered: number, durationMs: number): BlitzRecord {
    const accuracy = totalAnswered > 0 ? correct / totalAnswered : 0;
    const run: BlitzRecord = { correct, totalAnswered, accuracy, durationMs, date: Date.now() };
    this.state.blitzHistory.unshift(run);
    this.state.blitzHistory = this.state.blitzHistory.slice(0, 30);
    if (!this.state.bestBlitz || correct > this.state.bestBlitz.correct) {
      this.state.bestBlitz = run;
    }
    this.save();
    return run;
  }

  recordExamRun(correct: number, total: number, passed: boolean): ExamRecord {
    const accuracy = total > 0 ? correct / total : 0;
    const run: ExamRecord = { correct, total, accuracy, passed, date: Date.now() };
    this.state.examHistory.unshift(run);
    this.state.examHistory = this.state.examHistory.slice(0, 30);
    this.save();
    return run;
  }

  isNewTimedBest(correct: number): boolean {
    return !this.state.bestTimed || correct > this.state.bestTimed.correct;
  }

  isNewBlitzBest(correct: number): boolean {
    return !this.state.bestBlitz || correct > this.state.bestBlitz.correct;
  }

  getBestTimed(): TimedRecord | null { return this.state.bestTimed; }
  getBestBlitz(): BlitzRecord | null { return this.state.bestBlitz; }
  getExamHistory(): ExamRecord[] { return this.state.examHistory; }
  getTimedHistory(): TimedRecord[] { return this.state.timedHistory; }
  getBlitzHistory(): BlitzRecord[] { return this.state.blitzHistory; }

  getExamPassRate(): number {
    if (this.state.examHistory.length === 0) return 0;
    const passed = this.state.examHistory.filter(e => e.passed).length;
    return Math.round((passed / this.state.examHistory.length) * 100);
  }

  getExamPassCount(): number {
    return this.state.examHistory.filter(e => e.passed).length;
  }

  private load() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<PersonalRecordsState>;
      this.state.bestTimed = parsed.bestTimed ?? null;
      this.state.bestBlitz = parsed.bestBlitz ?? null;
      this.state.examHistory = parsed.examHistory ?? [];
      this.state.timedHistory = parsed.timedHistory ?? [];
      this.state.blitzHistory = parsed.blitzHistory ?? [];
    } catch { /* keep defaults */ }
  }

  private save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
  }
}
