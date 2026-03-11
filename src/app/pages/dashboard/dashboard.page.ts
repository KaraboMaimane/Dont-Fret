import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { settingsOutline, flameOutline, trophyOutline } from 'ionicons/icons';
import { MusicTheoryService } from '../../services/music-theory.service';
import { ProgressService, MasteryLevel } from '../../services/progress.service';
import { StreakService } from '../../services/streak.service';
import { MilestoneService } from '../../services/milestone.service';
import { LearningPathService } from '../../services/learning-path.service';

interface ModeCard {
  title: string;
  icon: string;
  desc: string;
  tag: string;
  route: string;
  locked: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon],
  templateUrl: './dashboard.page.html',
})
export class DashboardPage implements OnInit {
  accuracy = 0;
  totalQuestions = 0;
  avgResponseSec = 0;
  streak = 0;
  bestStreak = 0;
  dailyGoalPct = 0;
  currentStageName = '';
  stageProgress = 0;
  readonly Math = Math;
  recentSessions: any[] = [];
  badges: any[] = [];
  heatmapKeys: string[] = [];
  heatmapIntervals: string[] = [];
  heatmapCells: { key: string; interval: string; level: MasteryLevel }[] = [];
  modeCards: ModeCard[] = [];
  weakCells: { key: string; intervalName: string; accuracy: number }[] = [];

  constructor(
    public progress: ProgressService,
    private streak$: StreakService,
    private milestone: MilestoneService,
    public learningPath: LearningPathService,
    private theory: MusicTheoryService,
    public router: Router,
  ) {
    addIcons({ settingsOutline, flameOutline, trophyOutline });
  }

  ngOnInit() {
    this.loadData();
  }

  ionViewWillEnter() {
    this.loadData();
  }

  loadData() {
    // Stats
    this.accuracy = Math.round(this.progress.getOverallAccuracy() * 100);
    this.totalQuestions = this.progress.getTotalQuestions();
    this.avgResponseSec = +(this.progress.getAverageResponseMs() / 1000).toFixed(1);

    // Streak
    const streakState = this.streak$.getState();
    this.streak = streakState.currentStreak;
    this.bestStreak = streakState.bestStreak;
    this.dailyGoalPct = this.streak$.getDailyGoalPercent();

    // Learning Path
    const stage = this.learningPath.getCurrentStage();
    this.currentStageName = stage.title;

    // Heatmap
    this.heatmapKeys = this.theory.ALL_KEYS;
    this.heatmapIntervals = this.theory.ALL_INTERVALS;
    this.heatmapCells = [];
    for (const key of this.heatmapKeys) {
      for (const interval of this.heatmapIntervals) {
        this.heatmapCells.push({ key, interval, level: this.progress.getMasteryLevel(key, interval) });
      }
    }

    // Badges
    this.badges = this.milestone.getAllBadges();

    // Weak cells
    this.weakCells = this.progress.getWeakestCells(3);

    // Recent sessions
    this.recentSessions = this.progress.getRecentSessions(5);

    // Mode cards
    this.modeCards = [
      {
        title: 'Practice',
        icon: '🎯',
        desc: 'No timer, hints available',
        tag: 'LEARN',
        route: '/practice',
        locked: false,
      },
      {
        title: 'Scale Builder',
        icon: '🔨',
        desc: 'Build keys note by note',
        tag: 'SCALES',
        route: '/scale-builder',
        locked: false,
      },
      {
        title: 'Timed Challenge',
        icon: '⏱️',
        desc: '10 questions, beat the clock',
        tag: 'TIMED',
        route: '/timed-challenge',
        locked: !this.learningPath.isTimedChallengeUnlocked(),
      },
      {
        title: 'Worksheet',
        icon: '📋',
        desc: '40 adaptive questions',
        tag: 'DRILL',
        route: '/worksheet-challenge',
        locked: !this.learningPath.isWorksheetUnlocked(),
      },
      {
        title: 'Blitz Mode',
        icon: '⚡',
        desc: '60s — how many can you name?',
        tag: 'BLITZ',
        route: '/blitz-mode',
        locked: !this.learningPath.isBlitzUnlocked(),
      },
      {
        title: 'Theory Exam',
        icon: '🎓',
        desc: '20 questions, 80% to pass',
        tag: 'EXAM',
        route: '/exam',
        locked: !this.learningPath.isExamUnlocked(),
      },
    ];
  }

  navigateTo(card: ModeCard) {
    if (!card.locked) this.router.navigateByUrl(card.route);
  }

  getHeatmapColumn(intervalIndex: number): { key: string; interval: string; level: MasteryLevel }[] {
    return this.heatmapCells.filter((_, i) => i % this.heatmapIntervals.length === intervalIndex);
  }

  getModeText(session: any): string {
    return session.mode || 'Practice';
  }

  formatDuration(ms: number): string {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  formatDate(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
  }

  // 12 positions for the streak ring circumference
  get ringCircumference() { return 2 * Math.PI * 26; }
  get ringDashOffset() {
    return this.ringCircumference * (1 - this.dailyGoalPct);
  }
}
