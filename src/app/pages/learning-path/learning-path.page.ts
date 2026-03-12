import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent
} from '@ionic/angular/standalone';
import { LearningPathService, LearningStage, Stage } from '../../services/learning-path.service';

@Component({
  selector: 'app-learning-path',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent],
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
    if (!this.selectedStage) return;
    const route = this.learningPath.getDrillRoute(this.selectedStage);
    this.closeLesson();
    this.router.navigateByUrl(route);
  }

  startScaleBuilder() {
    this.closeLesson();
    this.router.navigateByUrl('/scale-builder');
  }

  startBossRound() {
    if (!this.selectedStage) return;
    const route = this.learningPath.getDrillRoute(this.selectedStage);
    this.closeLesson();
    this.router.navigateByUrl(`${route}?boss=true`);
  }

  /** True if this stage uses the Foundations page (not practice/scale-builder) */
  isFoundationsStage(stage: LearningStage): boolean {
    return stage.drillType === 'foundations';
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

  getVisualCards(stage: LearningStage): { title: string; caption: string; tokens: string[] }[] {
    if (stage.id === 2) {
      return [
        {
          title: 'Order of Sharps',
          caption: 'Add sharps in this sequence',
          tokens: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'],
        },
        {
          title: 'Order of Flats',
          caption: 'Reverse logic for flat keys',
          tokens: ['Bb', 'Eb', 'Ab', 'Db', 'Gb'],
        },
      ];
    }

    if (stage.id <= 4) {
      return [
        {
          title: 'Major Scale Formula',
          caption: 'Whole and half steps',
          tokens: ['W', 'W', 'H', 'W', 'W', 'W', 'H'],
        },
        {
          title: 'Stage Keys',
          caption: 'Roots you will drill here',
          tokens: stage.keys,
        },
      ];
    }

    return [
      {
        title: 'Interval Targets',
        caption: 'Core shapes to lock in',
        tokens: stage.intervals.map(interval => this.compactInterval(interval)),
      },
      {
        title: 'Keys in Rotation',
        caption: 'Where the drill will move',
        tokens: stage.keys,
      },
    ];
  }

  private compactInterval(interval: string): string {
    const map: Record<string, string> = {
      'Major 2nd': 'M2',
      'Major 3rd': 'M3',
      'Perfect 4th': 'P4',
      'Perfect 5th': 'P5',
      'Major 6th': 'M6',
      'Major 7th': 'M7',
      'Minor 3rd': 'm3',
      'Minor 7th': 'm7',
      'Augmented 4th': '#4',
      'Diminished 5th': 'b5',
    };

    return map[interval] ?? interval;
  }
}
