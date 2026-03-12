import { Injectable } from '@angular/core';

interface DailyChallengeState {
  challengeByDate: Record<string, string>;
  completedByDate: Record<string, string[]>;
}

export interface DailyChallengeCalendarEntry {
  dateKey: string;
  challengeId: string | null;
  completed: boolean;
}

@Injectable({ providedIn: 'root' })
export class DailyChallengeService {
  private readonly STORAGE_KEY = 'dont-fret-daily-challenges';
  private state: DailyChallengeState = {
    challengeByDate: {},
    completedByDate: {},
  };

  constructor() {
    this.load();
  }

  todayKey(now = new Date()): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getOrAssignChallenge(dateKey: string, challengeIds: string[]): string {
    const existing = this.state.challengeByDate[dateKey];
    if (existing && challengeIds.includes(existing)) return existing;

    if (challengeIds.length === 0) return 'default';

    const day = Number(dateKey.split('-')[2] ?? '1');
    const month = Number(dateKey.split('-')[1] ?? '1');
    const assigned = challengeIds[(day + month) % challengeIds.length];
    this.state.challengeByDate[dateKey] = assigned;
    this.pruneOldEntries();
    this.save();
    return assigned;
  }

  getChallengeForDate(dateKey: string): string | null {
    return this.state.challengeByDate[dateKey] ?? null;
  }

  isCompleted(dateKey: string, challengeId: string): boolean {
    return (this.state.completedByDate[dateKey] ?? []).includes(challengeId);
  }

  isAnyCompletedForDate(dateKey: string): boolean {
    return (this.state.completedByDate[dateKey] ?? []).length > 0;
  }

  markCompleted(dateKey: string, challengeId: string) {
    const current = this.state.completedByDate[dateKey] ?? [];
    if (current.includes(challengeId)) return;

    this.state.completedByDate[dateKey] = [...current, challengeId];
    this.pruneOldEntries();
    this.save();
  }

  getCalendarEntries(days = 35, fromDate = new Date()): DailyChallengeCalendarEntry[] {
    const out: DailyChallengeCalendarEntry[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(fromDate);
      date.setDate(fromDate.getDate() - i);
      const dateKey = this.todayKey(date);
      out.push({
        dateKey,
        challengeId: this.getChallengeForDate(dateKey),
        completed: this.isAnyCompletedForDate(dateKey),
      });
    }

    return out;
  }

  getCompletionStreak(days = 35): number {
    const entries = this.getCalendarEntries(days).reverse();
    let streak = 0;
    for (const entry of entries) {
      if (!entry.completed) break;
      streak++;
    }
    return streak;
  }

  private load() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Partial<DailyChallengeState>;
      this.state.challengeByDate = parsed.challengeByDate ?? {};
      this.state.completedByDate = parsed.completedByDate ?? {};
      this.pruneOldEntries();
    } catch {
      this.state = {
        challengeByDate: {},
        completedByDate: {},
      };
    }
  }

  private save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
  }

  private pruneOldEntries(daysToKeep = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);
    const cutoffKey = this.todayKey(cutoff);

    for (const key of Object.keys(this.state.challengeByDate)) {
      if (key < cutoffKey) delete this.state.challengeByDate[key];
    }

    for (const key of Object.keys(this.state.completedByDate)) {
      if (key < cutoffKey) delete this.state.completedByDate[key];
    }
  }
}
