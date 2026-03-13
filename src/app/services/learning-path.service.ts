import { Injectable } from '@angular/core';
import { MusicTheoryService } from './music-theory.service';
import { ProgressService } from './progress.service';
import { environment } from '../../environments/environment';

export type Stage = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface LearningStage {
  id: Stage;
  title: string;
  subtitle: string;
  description: string;
  lessonText: string;
  keys: string[];
  intervals: string[];
  unlockThreshold: number;
  bossTotalQuestions: number;
  bossPassThreshold: number;
  /** Which page handles practice for this stage */
  drillType: 'foundations' | 'scale-builder' | 'practice';
  /** Sub-mode used by FoundationsPage (stages 1 & 2 only) */
  foundationType?: 'scale-fill' | 'key-sig' | 'degree';
  /** Per-question boss timer in seconds (undefined = no timer) */
  bossTimerSec?: number;
}

export interface LearningPathState {
  currentStage: Stage;
  unlockedStages: Stage[];
  stageProgress: Record<Stage, { correct: number; total: number }>;
  bossResults: Record<Stage, { passed: boolean; attempts: number }>;
  placementCompleted: boolean;
  placementResultStage?: Stage;
  placementTakenAt?: number;
  lastRoute?: string;
}

@Injectable({ providedIn: 'root' })
export class LearningPathService {
  private readonly STORAGE_KEY = 'dont-fret-learning-path';
  private readonly DEV_UNLOCK_KEY = 'dont-fret-dev-unlock-all-stages';
  private state!: LearningPathState;
  private devUnlockAllStages = false;

  readonly STAGES: LearningStage[] = [
    // ── Stage 1 (new): Scale Fill-in-the-Blank — Sharp Keys ─────────────────
    {
      id: 1,
      title: 'Scale Fill: Sharp Keys',
      subtitle: 'Fill the Blanks',
      description: 'Fill in missing notes of sharp-key major scales and learn how many sharps each key has.',
      lessonText: `Welcome to the foundations of music theory!

A major scale follows the pattern: Whole – Whole – Half – Whole – Whole – Whole – Half
(or 2-2-1-2-2-2-1 semitones)

In this stage you will:
  • Fill in missing notes in a scale (e.g. C _ _ F G _ _)
  • Identify scale degrees (what note is degree 5?)
  • Learn how many sharps each key has and which notes they are

Sharp keys and their signatures:
  C major  — 0 sharps
  G major  — 1 sharp:  F#
  D major  — 2 sharps: F#, C#
  A major  — 3 sharps: F#, C#, G#
  E major  — 4 sharps: F#, C#, G#, D#
  B major  — 5 sharps: F#, C#, G#, D#, A#
  F# major — 6 sharps: F#, C#, G#, D#, A#, E#

Memory trick for sharp order: Father Charles Goes Down And Ends Battle`,
      keys: ['C', 'G', 'D', 'A', 'E', 'B', 'F#'],
      intervals: [],
      unlockThreshold: 0.8,
      bossTotalQuestions: 10,
      bossPassThreshold: 0.8,
      drillType: 'foundations',
      foundationType: 'scale-fill',
      bossTimerSec: 10,
    },
    // ── Stage 2 (new): Key Signatures — All 12 keys ──────────────────────────
    {
      id: 2,
      title: 'Key Signatures',
      subtitle: 'Sharps & Flats',
      description: 'Learn how many sharps or flats each key has, and which notes they are — in order.',
      lessonText: `Every major key has a "key signature" — a set of sharps or flats that belong to it.

Order of SHARPS (memory trick: "Father Charles Goes Down And Ends Battle"):
  1: F#  2: C#  3: G#  4: D#  5: A#  6: E#

  C = 0 sharps  |  G = 1#  |  D = 2#  |  A = 3#  |  E = 4#  |  B = 5#  |  F# = 6#

Order of FLATS (reverse of sharps: "Battle Ends And Down Goes Charles' Father"):
  1: Bb  2: Eb  3: Ab  4: Db  5: Gb

  F = 1b  |  Bb = 2b  |  Eb = 3b  |  Ab = 4b  |  Db = 5b

In this stage you will:
  • Tap the number of sharps or flats a key has
  • Name each accidental in the correct order`,
      keys: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'],
      intervals: [],
      unlockThreshold: 0.8,
      bossTotalQuestions: 10,
      bossPassThreshold: 0.8,
      drillType: 'foundations',
      foundationType: 'key-sig',
      bossTimerSec: 8,
    },
    // ── Stage 3 (was 1): Scale Builder — Sharp Keys ──────────────────────────
    {
      id: 3,
      title: 'Major Scales: Natural & Sharp Keys',
      subtitle: 'Build the Scale',
      description: 'Build sharp major scales note-by-note using the W-W-H-W-W-W-H formula.',
      lessonText: `You already know the notes — now build the scales from memory in real time.
Use the chromatic grid to place each note of the scale in the correct order.

Starting on C: C → D → E → F → G → A → B → C
Starting on G: G → A → B → C → D → E → F# → G (one sharp!)
Starting on D: D → E → F# → G → A → B → C# → D (two sharps!)

Each new sharp key adds exactly one more sharp following the cycle of fifths.`,
      keys: ['C', 'G', 'D', 'A', 'E', 'B', 'F#'],
      intervals: [],
      unlockThreshold: 0.7,
      bossTotalQuestions: 10,
      bossPassThreshold: 0.7,
      drillType: 'scale-builder',
    },
    // ── Stage 4 (was 2): Scale Builder — Flat Keys ───────────────────────────
    {
      id: 4,
      title: 'Major Scales: Flat Keys',
      subtitle: 'The Other Side',
      description: 'Master the 5 flat major scales: F, Bb, Eb, Ab, Db.',
      lessonText: `Flat keys work the same way — just with flats instead of sharps.

Starting on F:  F → G → A → Bb → C → D → E → F (one flat: Bb)
Starting on Bb: Bb → C → D → Eb → F → G → A → Bb (two flats: Bb, Eb)
Starting on Eb: Eb → F → G → Ab → Bb → C → D → Eb
Starting on Ab: Ab → Bb → C → Db → Eb → F → G → Ab
Starting on Db: Db → Eb → F → Gb → Ab → Bb → C → Db

Memory tip: "Fat Boys Eat At Dinner" → F, Bb, Eb, Ab, Db`,
      keys: ['F', 'Bb', 'Eb', 'Ab', 'Db'],
      intervals: [],
      unlockThreshold: 0.7,
      bossTotalQuestions: 10,
      bossPassThreshold: 0.7,
      drillType: 'scale-builder',
    },
    // ── Stage 5 (was 3): Diatonic Intervals ─────────────────────────────────
    {
      id: 5,
      title: 'Diatonic Intervals',
      subtitle: 'Distances Within the Scale',
      description: 'Learn how to calculate the 2nd through 7th of any major scale.',
      lessonText: `An interval is the distance between two notes.
Diatonic intervals are measured from the root of any major scale to another note IN that scale.

In the key of C Major (C D E F G A B):
• Major 2nd  = D  (2 semitones from C)
• Major 3rd  = E  (4 semitones)
• Perfect 4th = F (5 semitones)
• Perfect 5th = G (7 semitones)
• Major 6th  = A  (9 semitones)
• Major 7th  = B  (11 semitones)

The formula works for ANY key. Just apply the same semitone offsets from the root.
Example: In G Major, the Major 3rd = B (4 semitones above G).`,
      keys: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'],
      intervals: ['Major 2nd', 'Major 3rd', 'Perfect 4th', 'Perfect 5th', 'Major 6th', 'Major 7th'],
      unlockThreshold: 0.7,
      bossTotalQuestions: 10,
      bossPassThreshold: 0.7,
      drillType: 'practice',
    },
    // ── Stage 6 (was 4): Harmonic Intervals ─────────────────────────────────
    {
      id: 6,
      title: 'Harmonic Intervals',
      subtitle: 'Beyond the Scale',
      description: 'Discover the Minor 3rd, Minor 7th, Augmented 4th, and Diminished 5th.',
      lessonText: `Harmonic intervals go beyond the major scale to create tension and colour.

• Minor 3rd (b3)      = 3 semitones from root  (e.g. C → Eb)
• Minor 7th (b7)      = 10 semitones from root (e.g. C → Bb)
• Augmented 4th (#4)  = 6 semitones from root  (e.g. C → F#)  — also called a Tritone
• Diminished 5th (b5) = 6 semitones from root  (e.g. C → Gb)  — enharmonic of #4

These intervals are the core of blues, jazz, and rock harmony.
The b3 and b7 give you the "blues" or minor feel.
The #4/b5 (tritone) is the most dissonant interval in music — use it wisely!`,
      keys: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'],
      intervals: ['Minor 3rd', 'Minor 7th', 'Augmented 4th', 'Diminished 5th'],
      unlockThreshold: 0.7,
      bossTotalQuestions: 10,
      bossPassThreshold: 0.7,
      drillType: 'practice',
    },
    // ── Stage 7 (was 5): Combined Mastery ───────────────────────────────────
    {
      id: 7,
      title: 'Combined Mastery',
      subtitle: 'All Keys × All Intervals',
      description: 'Full command of all 12 keys and all 10 interval types. Unlocks Blitz Mode and Theory Exam.',
      lessonText: `You've conquered all the building blocks. Now it's time to put it all together.

This stage combines every key (all 12) with every interval type (all 10) for complete mastery.

Tips for rapid recall:
• Visualise the scale first, THEN find the interval note
• Work key by key — master C, then G, then D...
• Use "anchors": know that the b3 is always 1 below the Major 3rd
• Time yourself — sub-2-second recall is the goal

Complete this stage to unlock Blitz Mode and take the Theory Exam.`,
      keys: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'],
      intervals: ['Major 2nd', 'Major 3rd', 'Perfect 4th', 'Perfect 5th',
                  'Major 6th', 'Major 7th', 'Minor 3rd', 'Minor 7th',
                  'Augmented 4th', 'Diminished 5th'],
      unlockThreshold: 0.8,
      bossTotalQuestions: 15,
      bossPassThreshold: 0.7,
      drillType: 'practice',
    },
  ];

  constructor(private progressService: ProgressService) {
    this.devUnlockAllStages = this.loadDevUnlockAllStages();
    this.load();
    this.migrateOldState();
  }

  private loadDevUnlockAllStages(): boolean {
    if (!environment.devTools) return false;
    const raw = localStorage.getItem(this.DEV_UNLOCK_KEY);
    if (raw === null) return environment.defaultUnlockAllStages;
    return raw === 'true';
  }

  private hasDevUnlockOverride(): boolean {
    return environment.devTools && this.devUnlockAllStages;
  }

  isDevToolsEnabled(): boolean {
    return environment.devTools;
  }

  isDevUnlockAllStagesEnabled(): boolean {
    return this.hasDevUnlockOverride();
  }

  setDevUnlockAllStages(enabled: boolean) {
    if (!environment.devTools) return;
    this.devUnlockAllStages = enabled;
    localStorage.setItem(this.DEV_UNLOCK_KEY, String(enabled));
  }

  private load() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      this.state = JSON.parse(raw);
    } else {
      this.state = this.freshState();
    }
  }

  private freshState(): LearningPathState {
    return {
      currentStage: 1,
      unlockedStages: [1],
      stageProgress: {
        1: { correct: 0, total: 0 },
        2: { correct: 0, total: 0 },
        3: { correct: 0, total: 0 },
        4: { correct: 0, total: 0 },
        5: { correct: 0, total: 0 },
        6: { correct: 0, total: 0 },
        7: { correct: 0, total: 0 },
      },
      bossResults: {
        1: { passed: false, attempts: 0 },
        2: { passed: false, attempts: 0 },
        3: { passed: false, attempts: 0 },
        4: { passed: false, attempts: 0 },
        5: { passed: false, attempts: 0 },
        6: { passed: false, attempts: 0 },
        7: { passed: false, attempts: 0 },
      },
      placementCompleted: false,
    };
  }

  /** Migrate saved data from the old 5-stage format (stages 1–5 → 3–7) */
  private migrateOldState() {
    const sp = this.state.stageProgress as Record<number, { correct: number; total: number }>;
    const br = this.state.bossResults as Record<number, { passed: boolean; attempts: number }>;

    if (sp[5] !== undefined && sp[7] === undefined) {
      // Remap old 1-5 → new 3-7
      const remapped: LearningPathState = this.freshState();
      for (let old = 1; old <= 5; old++) {
        const n = (old + 2) as Stage;
        remapped.stageProgress[n] = sp[old] ?? { correct: 0, total: 0 };
        remapped.bossResults[n]    = br[old] ?? { passed: false, attempts: 0 };
      }
      const remap = (s: number): Stage => Math.min(s + 2, 7) as Stage;
      remapped.currentStage  = remap(this.state.currentStage);
      remapped.unlockedStages = this.state.unlockedStages.map(s => remap(s));
      if (!remapped.unlockedStages.includes(1)) remapped.unlockedStages.unshift(1);
      remapped.placementCompleted = this.progressService.getTotalQuestions() > 0;
      remapped.placementResultStage = remapped.currentStage;
      remapped.placementTakenAt = remapped.placementCompleted ? Date.now() : undefined;
      remapped.lastRoute = this.state.lastRoute;

      this.state = remapped;
      this.save();
    }

    // Ensure stages 1–7 keys always exist (safe guard for any partial saves)
    for (let s = 1; s <= 7; s++) {
      if (!this.state.stageProgress[s as Stage]) {
        this.state.stageProgress[s as Stage] = { correct: 0, total: 0 };
      }
      if (!this.state.bossResults[s as Stage]) {
        this.state.bossResults[s as Stage] = { passed: false, attempts: 0 };
      }
    }
    if (!this.state.unlockedStages.includes(1)) {
      this.state.unlockedStages.unshift(1);
    }

    if (typeof this.state.placementCompleted !== 'boolean') {
      this.state.placementCompleted = this.progressService.getTotalQuestions() > 0;
    }

    if (this.state.placementCompleted && !this.state.placementResultStage) {
      this.state.placementResultStage = this.state.currentStage;
    }
  }

  private save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
  }

  getState(): LearningPathState { return this.state; }

  getCurrentStage(): LearningStage {
    return this.STAGES.find(s => s.id === this.state.currentStage)!;
  }

  getStage(id: Stage): LearningStage {
    return this.STAGES.find(s => s.id === id)!;
  }

  isStageUnlocked(id: Stage): boolean {
    return this.hasDevUnlockOverride() || this.state.unlockedStages.includes(id);
  }

  /** Returns which route to navigate to for a given stage */
  getDrillRoute(stage: LearningStage): string {
    switch (stage.drillType) {
      case 'foundations':    return '/foundations';
      case 'scale-builder':  return '/scale-builder';
      default:               return '/practice';
    }
  }

  /** Record progress on the boss round for a stage */
  recordBossResult(stage: Stage, correct: number, total: number): boolean {
    const passed = correct / total >= this.getStage(stage).bossPassThreshold;
    this.state.bossResults[stage].attempts++;
    this.state.bossResults[stage].passed = passed;
    if (passed) {
      this.unlockNextStage(stage);
    }
    this.save();
    return passed;
  }

  private unlockNextStage(completedStage: Stage) {
    const next = (completedStage + 1) as Stage;
    if (next <= 7 && !this.state.unlockedStages.includes(next)) {
      this.state.unlockedStages.push(next);
      this.state.currentStage = next;
    }
    this.save();
  }

  /** Check if advanced modes are available */
  isBlitzUnlocked():          boolean { return this.hasDevUnlockOverride() || this.state.unlockedStages.includes(7); }
  isExamUnlocked():           boolean { return this.hasDevUnlockOverride() || this.state.unlockedStages.includes(7); }
  isWorksheetUnlocked():      boolean { return this.hasDevUnlockOverride() || this.state.unlockedStages.includes(6); }
  isTimedChallengeUnlocked(): boolean { return this.hasDevUnlockOverride() || this.state.unlockedStages.includes(5); }

  saveLastRoute(route: string) {
    this.state.lastRoute = route;
    this.save();
  }

  getLastRoute(): string { return this.state.lastRoute ?? '/dashboard'; }

  hasPlacementCompleted(): boolean {
    return this.state.placementCompleted;
  }

  getPlacementResultStage(): Stage | null {
    return this.state.placementResultStage ?? null;
  }

  getPlacementTakenAt(): number | null {
    return this.state.placementTakenAt ?? null;
  }

  applyPlacement(stage: Stage) {
    const currentMax = this.state.unlockedStages.length > 0
      ? Math.max(...this.state.unlockedStages)
      : 1;
    const targetStage = Math.max(stage, currentMax) as Stage;
    const unlocked = Array.from({ length: targetStage }, (_, i) => (i + 1) as Stage);

    this.state.currentStage = targetStage;
    this.state.unlockedStages = unlocked;
    this.state.placementCompleted = true;
    this.state.placementResultStage = targetStage;
    this.state.placementTakenAt = Date.now();
    this.save();
  }
}
