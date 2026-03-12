import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { LearningPathService, Stage } from '../../services/learning-path.service';
import { MilestoneService } from '../../services/milestone.service';
import { MusicTheoryService } from '../../services/music-theory.service';
import { ProgressService } from '../../services/progress.service';
import { StreakService } from '../../services/streak.service';
import { UserProfileService } from '../../services/user-profile.service';

interface WeeklyChallenge {
  title: string;
  subtitle: string;
  sessionsDone: number;
  sessionsTarget: number;
  avgAccuracy: number;
  accuracyTarget: number;
  reward: string;
  progressPct: number;
  completed: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar],
  templateUrl: './profile.page.html',
})
export class ProfilePage {
  draftName = '';
  savedToast = false;
  selectedAvatar = '🎮';
  selectedTitle = 'Rookie';
  avatarOptions = ['🎮', '🎸', '🎯', '⚡', '🔥', '🧠', '🏆', '🎵'];
  titleOptions: string[] = [];

  accuracy = 0;
  totalQuestions = 0;
  avgResponseSec = 0;
  streak = 0;
  bestStreak = 0;
  dailyGoalPct = 0;
  dueCount = 0;
  xpPoints = 0;
  rankLabel = 'Rookie';
  placementCompleted = false;
  placementStage: Stage | null = null;

  readonly Math = Math;

  recentSessions: { date: number; mode: string; correct: number; total: number; durationMs: number }[] = [];
  sparklineData: { accuracy: number; mode: string }[] = [];
  badges: { title: string; description: string; emoji: string; unlocked: boolean }[] = [];
  heatmapKeys: string[] = [];
  heatmapIntervals: string[] = [];

  weeklyChallenge: WeeklyChallenge = {
    title: 'Weekly Cadence',
    subtitle: 'Play 8 sessions with 70%+ average accuracy',
    sessionsDone: 0,
    sessionsTarget: 8,
    avgAccuracy: 0,
    accuracyTarget: 70,
    reward: 'Vanguard title unlock',
    progressPct: 0,
    completed: false,
  };

  constructor(
    private profile: UserProfileService,
    public progress: ProgressService,
    private streakService: StreakService,
    private milestone: MilestoneService,
    private theory: MusicTheoryService,
    private learningPath: LearningPathService,
    public router: Router,
  ) {}

  ngOnInit() {
    this.loadData();
  }

  ionViewWillEnter() {
    this.loadData();
  }

  loadData() {
    this.draftName = this.profile.getName();
    this.selectedAvatar = this.profile.getAvatar();

    this.accuracy = Math.round(this.progress.getOverallAccuracy() * 100);
    this.totalQuestions = this.progress.getTotalQuestions();
    this.avgResponseSec = +(this.progress.getAverageResponseMs() / 1000).toFixed(1);

    const streakState = this.streakService.getState();
    this.streak = streakState.currentStreak;
    this.bestStreak = streakState.bestStreak;
    this.dailyGoalPct = this.streakService.getDailyGoalPercent();

    this.dueCount = this.progress.getDueCount();
    this.placementCompleted = this.learningPath.hasPlacementCompleted();
    this.placementStage = this.learningPath.getPlacementResultStage();

    this.recentSessions = this.progress.getRecentSessions(12);
    this.sparklineData = [...this.recentSessions]
      .reverse()
      .slice(-8)
      .map(session => ({
        accuracy: session.total > 0 ? Math.round((session.correct / session.total) * 100) : 0,
        mode: session.mode || 'Practice',
      }));

    this.badges = this.milestone.getAllBadges();
    this.heatmapKeys = this.theory.ALL_KEYS;
    this.heatmapIntervals = this.theory.ALL_INTERVALS;

    this.xpPoints = (this.totalQuestions * 5) + (this.accuracy * 3) + (this.streak * 20);
    this.rankLabel = this.getRankLabel(this.xpPoints);
    this.weeklyChallenge = this.buildWeeklyChallenge();
    this.titleOptions = this.buildUnlockedTitles();

    const savedTitle = this.profile.getTitle();
    this.selectedTitle = this.titleOptions.includes(savedTitle) ? savedTitle : this.rankLabel;
    if (!this.titleOptions.includes(savedTitle)) {
      this.profile.setTitle(this.selectedTitle);
    }
  }

  saveName() {
    this.profile.setName(this.draftName);
    this.draftName = this.profile.getName();
    this.savedToast = true;
    setTimeout(() => {
      this.savedToast = false;
    }, 1800);
  }

  selectAvatar(avatar: string) {
    this.selectedAvatar = avatar;
    this.profile.setAvatar(avatar);
  }

  selectTitle(title: string) {
    if (!this.titleOptions.includes(title)) return;
    this.selectedTitle = title;
    this.profile.setTitle(title);
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

  getModeText(session: { mode: string }): string {
    return session.mode || 'Practice';
  }

  get weekDaysRemaining(): number {
    const today = new Date();
    const day = today.getDay();
    return (7 - day) % 7;
  }

  private buildWeeklyChallenge(): WeeklyChallenge {
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const weeklySessions = this.progress.getRecentSessions(80).filter(session => session.date >= weekAgo);
    const sessionsDone = weeklySessions.length;
    const avgAccuracy = weeklySessions.length > 0
      ? Math.round(
          weeklySessions.reduce((sum, s) => sum + (s.total > 0 ? s.correct / s.total : 0), 0)
          / weeklySessions.length
          * 100,
        )
      : 0;

    const sessionsTarget = 8;
    const accuracyTarget = 70;
    const sessionPct = Math.min(sessionsDone / sessionsTarget, 1);
    const accuracyPct = Math.min(avgAccuracy / accuracyTarget, 1);
    const progressPct = Math.round((sessionPct * 0.65 + accuracyPct * 0.35) * 100);

    return {
      title: 'Weekly Cadence',
      subtitle: 'Play 8 sessions with 70%+ average accuracy',
      sessionsDone,
      sessionsTarget,
      avgAccuracy,
      accuracyTarget,
      reward: 'Vanguard title unlock',
      progressPct,
      completed: sessionsDone >= sessionsTarget && avgAccuracy >= accuracyTarget,
    };
  }

  private buildUnlockedTitles(): string[] {
    const unlocked = new Set<string>(['Rookie']);
    if (this.totalQuestions >= 150) unlocked.add('String Scout');
    if (this.totalQuestions >= 500) unlocked.add('Pathfinder');
    if (this.streak >= 7) unlocked.add('Streak Keeper');
    if (this.streak >= 21) unlocked.add('Flame Warden');
    if (this.accuracy >= 75) unlocked.add('Pitch Sharpshot');
    if (this.accuracy >= 88) unlocked.add('Precision Chief');
    if (this.xpPoints >= 2500) unlocked.add('Theory Titan');
    if (this.weeklyChallenge.completed) unlocked.add('Vanguard');
    return Array.from(unlocked);
  }

  private getRankLabel(xp: number): string {
    if (xp < 300) return 'Rookie';
    if (xp < 1000) return 'Pathfinder';
    if (xp < 2500) return 'Fret Hunter';
    return 'Theory Titan';
  }

  getPlacementLabel(): string {
    if (!this.placementCompleted || !this.placementStage) return 'Not started';
    const stage = this.learningPath.getStage(this.placementStage);
    return `Stage ${this.placementStage}: ${stage.title}`;
  }
}
