import { Injectable } from '@angular/core';

export interface StreakState {
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: string | null; // ISO date string, date only
  dailyGoalTarget: number;
  dailyGoalProgress: number;
  lastGoalDate: string | null;
}

@Injectable({ providedIn: 'root' })
export class StreakService {
  private readonly STORAGE_KEY = 'dont-fret-streak';
  private state!: StreakState;

  constructor() {
    this.load();
    this.checkStreak();
  }

  private load() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      this.state = JSON.parse(raw);
    } else {
      this.state = {
        currentStreak: 0,
        bestStreak: 0,
        lastPlayedDate: null,
        dailyGoalTarget: 20,
        dailyGoalProgress: 0,
        lastGoalDate: null,
      };
    }
  }

  private save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
  }

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  private checkStreak() {
    const todayStr = this.today();
    if (!this.state.lastPlayedDate) return;

    const last = new Date(this.state.lastPlayedDate);
    const now = new Date(todayStr);
    const diffDays = Math.floor((now.getTime() - last.getTime()) / 86400000);

    if (diffDays > 1) {
      // Broke the streak
      this.state.currentStreak = 0;
      this.save();
    }

    // Reset daily goal if new day
    if (this.state.lastGoalDate !== todayStr) {
      this.state.dailyGoalProgress = 0;
      this.state.lastGoalDate = todayStr;
      this.save();
    }
  }

  recordActivity() {
    const todayStr = this.today();
    if (this.state.lastPlayedDate !== todayStr) {
      this.state.currentStreak++;
      if (this.state.currentStreak > this.state.bestStreak) {
        this.state.bestStreak = this.state.currentStreak;
      }
      this.state.lastPlayedDate = todayStr;
    }
    this.save();
  }

  incrementDailyGoal(count = 1) {
    const todayStr = this.today();
    if (this.state.lastGoalDate !== todayStr) {
      this.state.dailyGoalProgress = 0;
      this.state.lastGoalDate = todayStr;
    }
    this.state.dailyGoalProgress = Math.min(
      this.state.dailyGoalProgress + count,
      this.state.dailyGoalTarget
    );
    this.save();
  }

  isDailyGoalMet(): boolean {
    return this.state.dailyGoalProgress >= this.state.dailyGoalTarget;
  }

  getDailyGoalPercent(): number {
    return Math.min(this.state.dailyGoalProgress / this.state.dailyGoalTarget, 1);
  }

  getState(): StreakState { return this.state; }

  setDailyGoalTarget(target: number) {
    this.state.dailyGoalTarget = target;
    this.save();
  }
}
