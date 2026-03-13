import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons,
         IonList, IonItem, IonLabel, IonToggle } from '@ionic/angular/standalone';
import { ProgressService } from '../../services/progress.service';
import { StreakService } from '../../services/streak.service';
import { MusicTheoryService } from '../../services/music-theory.service';
import { LearningPathService } from '../../services/learning-path.service';

const PREFS_KEY = 'dont-fret-prefs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton,
            IonButtons, IonList, IonItem, IonLabel, IonToggle],
  templateUrl: './settings.page.html',
})
export class SettingsPage {
  preferFlats = false;
  soundEnabled = true;
  hapticsEnabled = true;
  dailyGoal = 20;
  readonly GOAL_OPTIONS = [10, 20, 30, 50, 100];
  confirmReset = false;
  resetSuccess = false;
  devToolsEnabled = false;
  devUnlockAllStages = false;

  constructor(
    private progress: ProgressService,
    private streak: StreakService,
    private theory: MusicTheoryService,
    private learningPath: LearningPathService,
  ) {
    // Load persisted preferences
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const prefs = JSON.parse(raw);
      this.preferFlats = prefs.preferFlats ?? false;
      this.soundEnabled = prefs.soundEnabled ?? true;
      this.hapticsEnabled = prefs.hapticsEnabled ?? true;
    }
    this.dailyGoal = this.streak.getState().dailyGoalTarget;
    this.devToolsEnabled = this.learningPath.isDevToolsEnabled();
    this.devUnlockAllStages = this.learningPath.isDevUnlockAllStagesEnabled();
  }

  onPreferFlatsChange(value: boolean) {
    this.preferFlats = value;
    this.theory.preferFlats = value;
    this.persistPrefs({ preferFlats: value });
  }

  onSoundEnabledChange(value: boolean) {
    this.soundEnabled = value;
    this.persistPrefs({ soundEnabled: value });
  }

  onHapticsEnabledChange(value: boolean) {
    this.hapticsEnabled = value;
    this.persistPrefs({ hapticsEnabled: value });
  }

  setDailyGoal(goal: number) {
    this.dailyGoal = goal;
    this.streak.setDailyGoalTarget(goal);
  }

  onDevUnlockAllStagesChange(value: boolean) {
    this.devUnlockAllStages = value;
    this.learningPath.setDevUnlockAllStages(value);
  }

  resetAll() {
    if (!this.confirmReset) {
      this.confirmReset = true;
      return;
    }
    // Clear all progress-related keys
    this.progress.resetProgress();
    const keysToRemove = [
      'dont-fret-streak',
      'dont-fret-learning-path',
      'dont-fret-milestones',
      'dont-fret-records',
      'dont-fret-daily-challenges',
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));
    this.confirmReset = false;
    this.resetSuccess = true;
    // Reload the page after brief toast so all singleton services reinitialize
    // from clean storage (removing items from localStorage does not update
    // already-constructed service instances in memory).
    setTimeout(() => { window.location.reload(); }, 1800);
  }

  cancelReset() { this.confirmReset = false; }

  private persistPrefs(patch: Record<string, unknown>) {
    const raw = localStorage.getItem(PREFS_KEY);
    const prefs = raw ? JSON.parse(raw) : {};
    Object.assign(prefs, patch);
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }
}
