import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons,
         IonList, IonItem, IonLabel, IonToggle } from '@ionic/angular/standalone';
import { ProgressService } from '../../services/progress.service';
import { StreakService } from '../../services/streak.service';
import { MusicTheoryService } from '../../services/music-theory.service';

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
  dailyGoal = 20;
  readonly GOAL_OPTIONS = [10, 20, 30, 50, 100];
  confirmReset = false;
  resetSuccess = false;

  constructor(
    private progress: ProgressService,
    private streak: StreakService,
    private theory: MusicTheoryService,
  ) {
    // Load persisted preferences
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const prefs = JSON.parse(raw);
      this.preferFlats = prefs.preferFlats ?? false;
    }
    this.dailyGoal = this.streak.getState().dailyGoalTarget;
  }

  onPreferFlatsChange(value: boolean) {
    this.preferFlats = value;
    this.theory.preferFlats = value;
    const raw = localStorage.getItem(PREFS_KEY);
    const prefs = raw ? JSON.parse(raw) : {};
    prefs.preferFlats = value;
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }

  setDailyGoal(goal: number) {
    this.dailyGoal = goal;
    this.streak.setDailyGoalTarget(goal);
  }

  resetAll() {
    if (!this.confirmReset) {
      this.confirmReset = true;
      return;
    }
    this.progress.resetProgress();
    localStorage.removeItem('dont-fret-streak');
    localStorage.removeItem('dont-fret-learning-path');
    localStorage.removeItem('dont-fret-milestones');
    this.confirmReset = false;
    this.resetSuccess = true;
    setTimeout(() => { this.resetSuccess = false; }, 3000);
  }

  cancelReset() { this.confirmReset = false; }
}
