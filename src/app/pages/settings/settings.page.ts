import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons,
         IonList, IonItem, IonLabel, IonToggle, IonButton, IonNote } from '@ionic/angular/standalone';
import { ProgressService } from '../../services/progress.service';
import { StreakService } from '../../services/streak.service';
import { LearningPathService } from '../../services/learning-path.service';
import { MilestoneService } from '../../services/milestone.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton,
            IonButtons, IonList, IonItem, IonLabel, IonToggle, IonButton, IonNote],
  templateUrl: './settings.page.html',
})
export class SettingsPage {
  preferFlats = false;
  dailyGoal = 20;
  confirmReset = false;

  constructor(
    private progress: ProgressService,
    private streak: StreakService,
    private learningPath: LearningPathService,
    private milestone: MilestoneService,
  ) {}

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
    alert('All progress has been reset.');
  }

  cancelReset() { this.confirmReset = false; }
}
