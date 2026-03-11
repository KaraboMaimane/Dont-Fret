import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton
} from '@ionic/angular/standalone';
import { LearningPathService, LearningStage, Stage } from '../../services/learning-path.service';

@Component({
  selector: 'app-learning-path',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton],
  templateUrl: './learning-path.page.html',
})
export class LearningPathPage implements OnInit {
  stages: LearningStage[] = [];
  selectedStage: LearningStage | null = null;
  showLesson = false;

  constructor(public learningPath: LearningPathService, private router: Router) {}

  ngOnInit() {
    this.stages = this.learningPath.STAGES;
  }

  ionViewWillEnter() {
    this.stages = this.learningPath.STAGES;
  }

  isUnlocked(stage: LearningStage): boolean {
    return this.learningPath.isStageUnlocked(stage.id as Stage);
  }

  isCurrent(stage: LearningStage): boolean {
    return this.learningPath.getCurrentStage().id === stage.id;
  }

  selectStage(stage: LearningStage) {
    if (!this.isUnlocked(stage)) return;
    this.selectedStage = stage;
    this.showLesson = true;
  }

  closeLesson() {
    this.showLesson = false;
    this.selectedStage = null;
  }

  startPractice() {
    this.closeLesson();
    this.router.navigateByUrl('/practice');
  }

  startScaleBuilder() {
    this.closeLesson();
    this.router.navigateByUrl('/scale-builder');
  }

  getStageStatus(stage: LearningStage): 'locked' | 'current' | 'unlocked' {
    if (!this.isUnlocked(stage)) return 'locked';
    if (this.isCurrent(stage)) return 'current';
    return 'unlocked';
  }

  getDotLabel(stage: LearningStage): string {
    const status = this.getStageStatus(stage);
    if (status === 'locked') return '🔒';
    if (status === 'current') return '▶';
    return '✓';
  }
}
