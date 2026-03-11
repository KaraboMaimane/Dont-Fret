import { Injectable } from '@angular/core';
import { ProgressService } from './progress.service';

export type BadgeId =
  | 'first_note'
  | 'sharp_keys_master'
  | 'flat_keys_champion'
  | 'interval_initiate'
  | 'harmonic_hero'
  | 'blitz_debut'
  | 'week_warrior'
  | 'theory_titan'
  | 'mistake_buster'
  | 'streak_5'
  | 'speed_demon'
  | 'boss_slayer';

export interface Badge {
  id: BadgeId;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  unlockedAt?: number;
}

@Injectable({ providedIn: 'root' })
export class MilestoneService {
  private readonly STORAGE_KEY = 'dont-fret-milestones';
  private earned: Set<BadgeId> = new Set();

  readonly BADGES: Badge[] = [
    { id: 'first_note',        emoji: '🎵', title: 'First Note',          description: 'Answer your first question correctly', unlocked: false },
    { id: 'sharp_keys_master', emoji: '🔑', title: 'Sharp Keys Master',    description: 'Score 100% across all sharp key scales', unlocked: false },
    { id: 'flat_keys_champion',emoji: '♭',  title: 'Flat Keys Champion',   description: 'Score 100% across all flat key scales', unlocked: false },
    { id: 'interval_initiate', emoji: '📐', title: 'Interval Initiate',    description: 'Complete Stage 3 (Diatonic Intervals)', unlocked: false },
    { id: 'harmonic_hero',     emoji: '🎸', title: 'Harmonic Hero',        description: 'Complete Stage 4 (Harmonic Intervals)', unlocked: false },
    { id: 'blitz_debut',       emoji: '⚡', title: 'Blitz Debut',          description: 'Finish your first Blitz Mode round', unlocked: false },
    { id: 'week_warrior',      emoji: '🔥', title: 'Week Warrior',         description: 'Maintain a 7-day streak', unlocked: false },
    { id: 'theory_titan',      emoji: '🏆', title: 'Theory Titan',         description: 'Pass the Theory Exam (80%+)', unlocked: false },
    { id: 'mistake_buster',    emoji: '🔂', title: 'Mistake Buster',       description: 'Get all Mistake Replay questions correct', unlocked: false },
    { id: 'streak_5',          emoji: '🌟', title: 'On Fire',              description: 'Keep a 5-day streak', unlocked: false },
    { id: 'speed_demon',       emoji: '🚀', title: 'Speed Demon',          description: 'Average response time under 2 seconds', unlocked: false },
    { id: 'boss_slayer',       emoji: '😤', title: 'Boss Slayer',          description: 'Pass all 5 Boss Rounds on the first attempt', unlocked: false },
  ];

  constructor(private progress: ProgressService) {
    this.load();
  }

  private load() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      const data: { id: BadgeId; unlockedAt: number }[] = JSON.parse(raw);
      for (const { id, unlockedAt } of data) {
        this.earned.add(id);
        const badge = this.BADGES.find(b => b.id === id);
        if (badge) { badge.unlocked = true; badge.unlockedAt = unlockedAt; }
      }
    }
  }

  private save() {
    const data = this.BADGES.filter(b => b.unlocked).map(b => ({ id: b.id, unlockedAt: b.unlockedAt }));
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  unlock(id: BadgeId): boolean {
    if (this.earned.has(id)) return false;
    this.earned.add(id);
    const badge = this.BADGES.find(b => b.id === id);
    if (badge) { badge.unlocked = true; badge.unlockedAt = Date.now(); }
    this.save();
    return true; // newly unlocked
  }

  isUnlocked(id: BadgeId): boolean { return this.earned.has(id); }

  getAllBadges(): Badge[] { return this.BADGES; }

  getEarnedBadges(): Badge[] { return this.BADGES.filter(b => b.unlocked); }

  checkAutoMilestones(streak: number, avgResponseMs: number) {
    if (this.progress.getCorrectAnswers() >= 1) this.unlock('first_note');
    if (streak >= 5) this.unlock('streak_5');
    if (streak >= 7) this.unlock('week_warrior');
    if (avgResponseMs > 0 && avgResponseMs < 2000) this.unlock('speed_demon');
  }
}
