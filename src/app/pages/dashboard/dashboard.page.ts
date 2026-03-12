import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
  unlockHint?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon],
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
  foundationStage1Keys: string[] = [];
  foundationStage2Keys: string[] = [];
  showHistory = false;
  sparklineData: { accuracy: number; mode: string }[] = [];
  continueCard: { label: string; icon: string; route: string; acc: number; timeAgo: string } | null = null;

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
    this.weakCells = this.progress.getWeakestCells(2);

    // Recent sessions
    this.recentSessions = this.progress.getRecentSessions(5);

    // Continue card
    if (this.recentSessions.length > 0) {
      const last = this.recentSessions[0];
      const modeMap: Record<string, { route: string; icon: string }> = {
        'Practice':         { route: '/practice',          icon: '🎯' },
        'Foundations':      { route: '/foundations',       icon: '🎵' },
        'Scale Builder':    { route: '/scale-builder',     icon: '🔨' },
        'Timed Challenge':  { route: '/timed-challenge',   icon: '⏱️' },
        'Worksheet':        { route: '/worksheet-challenge', icon: '📋' },
        'Blitz Mode':       { route: '/blitz-mode',        icon: '⚡' },
        'Theory Exam':      { route: '/exam',              icon: '🎓' },
      };
      const entry = modeMap[last.mode] ?? { route: '/practice', icon: '🎯' };
      this.continueCard = {
        label: last.mode || 'Practice',
        icon: entry.icon,
        route: entry.route,
        acc: Math.round((last.correct / (last.total || 1)) * 100),
        timeAgo: this.timeAgo(last.date),
      };
    } else {
      this.continueCard = null;
    }

    // Sparkline (last 7 sessions, oldest → newest)
    const last7 = this.progress.getRecentSessions(7).reverse();
    this.sparklineData = last7.map(s => ({
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      mode: s.mode || 'Practice',
    }));

    // Foundation stage keys
    this.foundationStage1Keys = this.learningPath.getStage(1).keys;
    this.foundationStage2Keys = this.learningPath.getStage(2).keys;

    // Mode cards
    this.modeCards = [
      {
        title: 'Foundations',
        icon: '🎵',
        desc: 'Scales & key signatures',
        tag: 'BEGINNER',
        route: '/foundations',
        locked: false,
      },
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
        desc: '10 questions. Beat the clock. Earn stars.',
        tag: 'TIMED',
        route: '/timed-challenge',
        locked: !this.learningPath.isTimedChallengeUnlocked(),
        unlockHint: 'Unlock by completing Stage 5 – Diatonic Intervals',
      },
      {
        title: 'Worksheet',
        icon: '📋',
        desc: '40 adaptive questions — full interval breakdown.',
        tag: 'DRILL',
        route: '/worksheet-challenge',
        locked: !this.learningPath.isWorksheetUnlocked(),
        unlockHint: 'Unlock by completing Stage 6 – Harmonic Intervals',
      },
      {
        title: 'Blitz Mode',
        icon: '⚡',
        desc: '60 seconds. How many can you name?',
        tag: 'BLITZ',
        route: '/blitz-mode',
        locked: !this.learningPath.isBlitzUnlocked(),
        unlockHint: 'Unlock by completing Stage 7 – Combined Mastery',
      },
      {
        title: 'Theory Exam',
        icon: '🎓',
        desc: '20 questions, 80% to pass. Earn the Titan badge.',
        tag: 'EXAM',
        route: '/exam',
        locked: !this.learningPath.isExamUnlocked(),
        unlockHint: 'Unlock by completing Stage 7 – Combined Mastery',
      },
    ];
  }

  getFoundationChipColor(key: string, cellName: string): string {
    const acc = this.progress.getAccuracy(key, cellName);
    if (acc >= 0.8) return 'var(--df-green)';
    if (acc >= 0.5) return 'var(--df-amber)';
    if (acc > 0)   return 'var(--df-red)';
    return 'var(--df-surface2)';
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

  timeAgo(ts: number): string {
    const diffMins = Math.floor((Date.now() - ts) / 60000);
    if (diffMins < 2)  return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffH = Math.floor(diffMins / 60);
    if (diffH < 24)    return diffH === 1 ? '1h ago' : `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1)   return 'yesterday';
    if (diffD < 7)     return `${diffD} days ago`;
    return new Date(ts).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
  }

  // 12 positions for the streak ring circumference
  get ringCircumference() { return 2 * Math.PI * 26; }
  get ringDashOffset() {
    return this.ringCircumference * (1 - this.dailyGoalPct);
  }
}
