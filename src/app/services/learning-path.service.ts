import { Injectable } from '@angular/core';
import { MusicTheoryService } from './music-theory.service';
import { ProgressService } from './progress.service';

export type Stage = 1 | 2 | 3 | 4 | 5;

export interface LearningStage {
  id: Stage;
  title: string;
  subtitle: string;
  description: string;
  lessonText: string;
  keys: string[];
  intervals: string[];
  unlockThreshold: number; // accuracy % to unlock next stage
  bossTotalQuestions: number;
  bossPassThreshold: number; // ratio
}

export interface LearningPathState {
  currentStage: Stage;
  unlockedStages: Stage[];
  stageProgress: Record<Stage, { correct: number; total: number }>;
  bossResults: Record<Stage, { passed: boolean; attempts: number }>;
  lastRoute?: string;
}

@Injectable({ providedIn: 'root' })
export class LearningPathService {
  private readonly STORAGE_KEY = 'dont-fret-learning-path';
  private state!: LearningPathState;

  readonly STAGES: LearningStage[] = [
    {
      id: 1,
      title: 'Major Scales: Natural & Sharp Keys',
      subtitle: 'The Foundation',
      description: 'Learn the 7 natural and sharp major scales using the W-W-H-W-W-W-H formula.',
      lessonText: `The Major Scale is the foundation of all Western music theory.
It's built by moving up the musical alphabet using this step pattern:
Whole – Whole – Half – Whole – Whole – Whole – Half

In practice, a "Whole" step = 2 semitones, a "Half" step = 1 semitone.

Starting on C: C → D → E → F → G → A → B → C
Starting on G: G → A → B → C → D → E → F# → G (one sharp!)
Starting on D: D → E → F# → G → A → B → C# → D (two sharps!)

Each new sharp key adds exactly one more sharp. The order of sharps follows the cycle of fifths.`,
      keys: ['C', 'G', 'D', 'A', 'E', 'B', 'F#'],
      intervals: [],
      unlockThreshold: 0.7,
      bossTotalQuestions: 10,
      bossPassThreshold: 0.7,
    },
    {
      id: 2,
      title: 'Major Scales: Flat Keys',
      subtitle: 'The Other Side',
      description: 'Master the 5 flat major scales: F, Bb, Eb, Ab, Db.',
      lessonText: `Flat keys work the same way — just with flats instead of sharps.
The flat key cycle moves in the opposite direction to the sharp cycle.

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
    },
    {
      id: 3,
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
    },
    {
      id: 4,
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
    },
    {
      id: 5,
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
    },
  ];

  constructor(private progressService: ProgressService) {
    this.load();
  }

  private load() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      this.state = JSON.parse(raw);
    } else {
      this.state = {
        currentStage: 1,
        unlockedStages: [1],
        stageProgress: {
          1: { correct: 0, total: 0 },
          2: { correct: 0, total: 0 },
          3: { correct: 0, total: 0 },
          4: { correct: 0, total: 0 },
          5: { correct: 0, total: 0 },
        },
        bossResults: {
          1: { passed: false, attempts: 0 },
          2: { passed: false, attempts: 0 },
          3: { passed: false, attempts: 0 },
          4: { passed: false, attempts: 0 },
          5: { passed: false, attempts: 0 },
        },
      };
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
    return this.state.unlockedStages.includes(id);
  }

  /** Record progress on the boss round for a stage */
  recordBossResult(stage: Stage, correct: number, total: number): boolean {
    const passed = correct / total >= this.STAGES[stage - 1].bossPassThreshold;
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
    if (next <= 5 && !this.state.unlockedStages.includes(next)) {
      this.state.unlockedStages.push(next);
      this.state.currentStage = next;
    }
    this.save();
  }

  /** Check if advanced modes are available */
  isBlitzUnlocked(): boolean { return this.state.unlockedStages.includes(5); }
  isExamUnlocked(): boolean { return this.state.unlockedStages.includes(5); }
  isWorksheetUnlocked(): boolean { return this.state.unlockedStages.includes(4); }
  isTimedChallengeUnlocked(): boolean { return this.state.unlockedStages.includes(3); }

  saveLastRoute(route: string) {
    this.state.lastRoute = route;
    this.save();
  }

  getLastRoute(): string { return this.state.lastRoute ?? '/dashboard'; }
}
