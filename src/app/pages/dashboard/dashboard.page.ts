import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { ProgressService } from '../../services/progress.service';
import { StreakService } from '../../services/streak.service';
import { LearningPathService } from '../../services/learning-path.service';
import { UserProfileService } from '../../services/user-profile.service';
import { DailyChallengeService } from '../../services/daily-challenge.service';

interface ModeCard {
  title: string;
  icon: string;
  desc: string;
  tag: string;
  route: string;
  locked: boolean;
  unlockHint?: string;
}

interface DailyQuest {
  title: string;
  subtitle: string;
  progressText: string;
  done: boolean;
}

interface RotatingChallenge {
  id: string;
  title: string;
  subtitle: string;
  reward: string;
  route: string;
  cta: string;
  progressText: string;
  done: boolean;
}

interface RewardDrop {
  icon: string;
  title: string;
  subtitle: string;
  unlocked: boolean;
}

interface WelcomeBanner {
  type: 'new-user' | 'just-placed' | 'long-break' | 'daily-sweep';
  daysAway?: number;
  stageName?: string;
  stageId?: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IonContent],
  templateUrl: './dashboard.page.html',
})
export class DashboardPage implements OnInit {
  public progress = inject(ProgressService);
  private streak$ = inject(StreakService);
  public learningPath = inject(LearningPathService);
  private profile = inject(UserProfileService);
  private dailyChallenge = inject(DailyChallengeService);
  public router = inject(Router);

  readonly Math = Math;
  playerName = 'Player One';
  rankLabel = 'Rookie';
  xpPoints = 0;
  xpProgressPct = 0;
  xpToNext: number | null = null;

  accuracy = 0;
  totalQuestions = 0;
  streak = 0;
  currentStageName = '';
  stageProgress = 0;

  recentSessions: { date: number; mode: string; correct: number; total: number; durationMs: number }[] = [];
  modeCards: ModeCard[] = [];
  dueCount = 0;
  continueCard: { label: string; icon: string; route: string; acc: number; timeAgo: string } | null = null;
  dailyGoalRemaining = 0;
  dailyQuests: DailyQuest[] = [];
  dailySpotlight: RotatingChallenge | null = null;
  rewardDrops: RewardDrop[] = [];
  streakMultiplier = 1;
  nextUnlockCard: ModeCard | null = null;
  needsPlacement = false;
  welcomeBanner: WelcomeBanner | null = null;
  welcomeBannerDismissed = false;

  ngOnInit() {
    this.loadData();
  }

  ionViewWillEnter() {
    this.loadData();
  }

  loadData() {
    this.playerName = this.profile.getName();

    this.accuracy = Math.round(this.progress.getOverallAccuracy() * 100);
    this.totalQuestions = this.progress.getTotalQuestions();
    const streakState = this.streak$.getState();
    this.streak = streakState.currentStreak;
    this.dailyGoalRemaining = Math.max(streakState.dailyGoalTarget - streakState.dailyGoalProgress, 0);

    this.xpPoints = (this.totalQuestions * 5) + (this.accuracy * 3) + (this.streak * 20);
    const rank = this.getRankMeta(this.xpPoints);
    this.rankLabel = rank.label;
    this.xpProgressPct = rank.progressPct;
    this.xpToNext = rank.toNext;

    const stage = this.learningPath.getCurrentStage();
    this.currentStageName = stage.title;
    const stageProgress = this.learningPath.getState().stageProgress[stage.id];
    this.stageProgress = stageProgress.total > 0
      ? Math.round((stageProgress.correct / stageProgress.total) * 100)
      : 0;

    this.dueCount = this.progress.getDueCount();

    this.recentSessions = this.progress.getRecentSessions(5);
    this.dailyQuests = this.buildDailyQuests();
    this.streakMultiplier = this.getStreakMultiplier(this.streak);
    this.needsPlacement = this.totalQuestions === 0 && !this.learningPath.hasPlacementCompleted();

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

    this.modeCards = this.buildModeCards();
    this.nextUnlockCard = this.modeCards.find(card => card.locked) ?? null;
    this.dailySpotlight = this.buildRotatingChallenge();
    this.rewardDrops = this.buildRewardDrops();
    this.welcomeBanner = this.computeWelcomeBanner();
  }

  navigateTo(card: ModeCard) {
    if (!card.locked) this.router.navigateByUrl(card.route);
  }

  dismissWelcomeBanner() {
    this.welcomeBannerDismissed = true;
    this.welcomeBanner = null;
  }

  private computeWelcomeBanner(): WelcomeBanner | null {
    // Always show for brand-new users regardless of dismissed state
    if (this.totalQuestions === 0) {
      return { type: 'new-user' };
    }

    if (this.welcomeBannerDismissed) return null;

    // Show briefly after placement test (within 24h, still early in journey)
    const placementAt = this.learningPath.getPlacementTakenAt();
    if (placementAt && Date.now() - placementAt < 24 * 60 * 60 * 1000 && this.totalQuestions < 15) {
      const stage = this.learningPath.getCurrentStage();
      return { type: 'just-placed', stageName: stage.title, stageId: stage.id };
    }

    // Returning after a long break (5+ days since last session)
    if (this.recentSessions.length > 0) {
      const daysSince = (Date.now() - this.recentSessions[0].date) / 86_400_000;
      if (daysSince >= 5) {
        return { type: 'long-break', daysAway: Math.floor(daysSince) };
      }
    }

    // All daily quests complete — surface a quick celebration
    if (this.questsDoneCount >= 3) {
      return { type: 'daily-sweep' };
    }

    return null;
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

  get stageProgressLabel(): string {
    if (this.stageProgress === 0) return 'Fresh stage';
    if (this.stageProgress >= 80) return 'Boss-ready run';
    if (this.stageProgress >= 60) return 'Dialing it in';
    return 'Building momentum';
  }

  get questsDoneCount(): number {
    return this.dailyQuests.filter(quest => quest.done).length;
  }

  get questsPct(): number {
    if (this.dailyQuests.length === 0) return 0;
    return Math.round((this.questsDoneCount / this.dailyQuests.length) * 100);
  }

  private buildDailyQuests(): DailyQuest[] {
    const streakState = this.streak$.getState();
    const lastSessionToday = this.recentSessions.length > 0
      ? this.isToday(this.recentSessions[0].date)
      : false;

    return [
      {
        title: 'Daily Goal',
        subtitle: 'Answer your daily target questions',
        progressText: `${streakState.dailyGoalProgress}/${streakState.dailyGoalTarget}`,
        done: this.dailyGoalRemaining === 0,
      },
      {
        title: 'Review Queue',
        subtitle: 'Clear due cards before they pile up',
        progressText: `${this.dueCount} left`,
        done: this.dueCount === 0,
      },
      {
        title: 'Stay Active',
        subtitle: 'Play at least one session today',
        progressText: lastSessionToday ? 'Done' : 'Pending',
        done: lastSessionToday,
      },
    ];
  }

  private buildModeCards(): ModeCard[] {
    return [
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

  private buildRotatingChallenge(): RotatingChallenge {
    const todayKey = this.dailyChallenge.todayKey();

    const challengePool: RotatingChallenge[] = [
      {
        id: 'queue-sweeper',
        title: 'Queue Sweeper',
        subtitle: 'Clear your due review queue today',
        reward: '+35 XP and focus boost',
        route: '/practice?mode=due',
        cta: 'Clear Queue',
        progressText: `${this.dueCount} due`,
        done: this.dueCount === 0,
      },
      {
        id: 'boss-prep-sprint',
        title: 'Boss Prep Sprint',
        subtitle: 'Push your current stage to 80%+',
        reward: '+1.5x stage XP',
        route: this.learningPath.getDrillRoute(this.learningPath.getCurrentStage()),
        cta: 'Train Stage',
        progressText: `${this.stageProgress}%`,
        done: this.stageProgress >= 80,
      },
      {
        id: 'streak-guardian',
        title: 'Streak Guardian',
        subtitle: 'Complete your daily question target',
        reward: `Streak multiplier x${this.getStreakMultiplier(this.streak).toFixed(1)}`,
        route: '/practice',
        cta: 'Protect Streak',
        progressText: this.dailyGoalRemaining === 0 ? 'Complete' : `${this.dailyGoalRemaining} to go`,
        done: this.dailyGoalRemaining === 0,
      },
    ];

    const selectedId = this.dailyChallenge.getOrAssignChallenge(
      todayKey,
      challengePool.map(challenge => challenge.id),
    );

    const selected = challengePool.find(challenge => challenge.id === selectedId)
      ?? challengePool[0];

    if (selected.done) {
      this.dailyChallenge.markCompleted(todayKey, selected.id);
    }

    return {
      ...selected,
      done: selected.done || this.dailyChallenge.isCompleted(todayKey, selected.id),
    };
  }

  private buildRewardDrops(): RewardDrop[] {
    return [
      {
        icon: '🔥',
        title: `Streak Multiplier x${this.streakMultiplier.toFixed(1)}`,
        subtitle: this.streak >= 7 ? 'Active on your current run' : 'Reach a 7-day streak to activate',
        unlocked: this.streak >= 7,
      },
      {
        icon: '🎁',
        title: this.questsDoneCount >= 3 ? 'Daily Crate Unlocked' : 'Daily Crate Progress',
        subtitle: `${this.questsDoneCount}/3 quests complete`,
        unlocked: this.questsDoneCount >= 3,
      },
      {
        icon: '🛡️',
        title: this.dueCount === 0 ? 'Review Shield Active' : 'Review Shield Offline',
        subtitle: this.dueCount === 0 ? 'Queue cleared, decay paused for today' : `${this.dueCount} due card${this.dueCount === 1 ? '' : 's'} waiting`,
        unlocked: this.dueCount === 0,
      },
    ];
  }

  private getStreakMultiplier(streak: number): number {
    if (streak >= 30) return 3;
    if (streak >= 21) return 2.5;
    if (streak >= 14) return 2;
    if (streak >= 7) return 1.5;
    return 1;
  }

  private isToday(ts: number): boolean {
    const d = new Date(ts).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    return d === today;
  }

  private getRankMeta(xp: number): { label: string; progressPct: number; toNext: number | null } {
    if (xp < 300) {
      return {
        label: 'Rookie',
        progressPct: Math.round((xp / 300) * 100),
        toNext: 300 - xp,
      };
    }

    if (xp < 1000) {
      return {
        label: 'Pathfinder',
        progressPct: Math.round(((xp - 300) / 700) * 100),
        toNext: 1000 - xp,
      };
    }

    if (xp < 2500) {
      return {
        label: 'Fret Hunter',
        progressPct: Math.round(((xp - 1000) / 1500) * 100),
        toNext: 2500 - xp,
      };
    }

    return {
      label: 'Theory Titan',
      progressPct: 100,
      toNext: null,
    };
  }
}
