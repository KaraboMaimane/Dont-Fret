import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { LearningPathService } from '../../services/learning-path.service';
import { ProgressService } from '../../services/progress.service';

interface ModeCard {
  title: string;
  icon: string;
  desc: string;
  tag: string;
  route: string;
  locked: boolean;
  unlockHint?: string;
}

@Component({
  selector: 'app-arcade',
  imports: [CommonModule, IonContent, IonHeader, IonTitle, IonToolbar],
  templateUrl: './arcade.page.html',
})
export class ArcadePage {
  readonly Math = Math;
  modeCards: ModeCard[] = [];
  dueCount = 0;
  dueReviews: { key: string; intervalName: string; accuracy: number }[] = [];
  weakCells: { key: string; intervalName: string; accuracy: number }[] = [];

  constructor(
    private learningPath: LearningPathService,
    private progress: ProgressService,
    public router: Router,
  ) {}

  ngOnInit() {
    this.loadData();
  }

  ionViewWillEnter() {
    this.loadData();
  }

  navigateTo(card: ModeCard) {
    if (!card.locked) this.router.navigateByUrl(card.route);
  }

  private loadData() {
    this.modeCards = [
      {
        title: 'Foundations',
        icon: '🎵',
        desc: 'Scales and key signatures',
        tag: 'BEGINNER',
        route: '/foundations',
        locked: false,
      },
      {
        title: 'Practice',
        icon: '🎯',
        desc: 'Adaptive drills with no timer',
        tag: 'LEARN',
        route: '/practice',
        locked: false,
      },
      {
        title: 'Scale Builder',
        icon: '🔨',
        desc: 'Build major scales note by note',
        tag: 'SCALES',
        route: '/scale-builder',
        locked: false,
      },
      {
        title: 'Timed Challenge',
        icon: '⏱️',
        desc: '10 questions. Beat the clock. Earn stars.',
        tag: 'TIMED',
        route: '/timed-challenge',
        locked: !this.learningPath.isTimedChallengeUnlocked(),
        unlockHint: 'Unlock by completing Stage 5 – Diatonic Intervals',
      },
      {
        title: 'Worksheet',
        icon: '📋',
        desc: '40 adaptive questions and a full breakdown.',
        tag: 'DRILL',
        route: '/worksheet-challenge',
        locked: !this.learningPath.isWorksheetUnlocked(),
        unlockHint: 'Unlock by completing Stage 6 – Harmonic Intervals',
      },
      {
        title: 'Blitz Mode',
        icon: '⚡',
        desc: '60-second speed challenge with bonus time.',
        tag: 'BLITZ',
        route: '/blitz-mode',
        locked: !this.learningPath.isBlitzUnlocked(),
        unlockHint: 'Unlock by completing Stage 7 – Combined Mastery',
      },
      {
        title: 'Theory Exam',
        icon: '🎓',
        desc: '20-question final exam. 80% to pass.',
        tag: 'EXAM',
        route: '/exam',
        locked: !this.learningPath.isExamUnlocked(),
        unlockHint: 'Unlock by completing Stage 7 – Combined Mastery',
      },
    ];

    this.dueCount = this.progress.getDueCount();
    this.dueReviews = this.progress.getDueCells(6);
    this.weakCells = this.progress.getWeakestCells(6);
  }
}
