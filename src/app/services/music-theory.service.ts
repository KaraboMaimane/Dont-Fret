import { Injectable } from '@angular/core';

export type NoteLabel = string;

export interface IntervalQuestion {
  key: NoteLabel;
  intervalName: string;
  intervalType: 'diatonic' | 'harmonic';
  answer: NoteLabel;
}

export interface ScaleQuestion {
  key: NoteLabel;
  scale: NoteLabel[];
}

// ── Foundation question types ──────────────────────────────────────────────

/** Scale with some notes blanked out. User fills one blank at a time L→R. */
export interface ScaleFillQuestion {
  type: 'scale-fill';
  key: NoteLabel;
  /** 7-slot array; null = blank the user must fill */
  scale: (NoteLabel | null)[];
  /** Sorted indexes (into scale[]) that started as blanks */
  blankIndexes: number[];
  /** Which entry in blankIndexes we're asking about right now */
  currentBlankIndex: number;
  /** Correct note for blank at blankIndexes[currentBlankIndex] */
  answer: NoteLabel;
  hadError: boolean;
}

/** "What is degree N of Key major?" */
export interface DegreeQuestion {
  type: 'degree';
  key: NoteLabel;
  degree: number;  // 2–7
  answer: NoteLabel;
  hadError: boolean;
}

/** "How many sharps/flats does Key major have?" → tap 0–7 */
export interface KeySigCountQuestion {
  type: 'key-sig-count';
  key: NoteLabel;
  accidentalType: 'sharp' | 'flat' | 'none';
  answer: number;
  hadError: boolean;
}

/** "Name the sharps/flats of Key major in order" → tap each from grid */
export interface KeySigListQuestion {
  type: 'key-sig-list';
  key: NoteLabel;
  accidentalType: 'sharp' | 'flat';
  /** Full ordered list of accidentals for this key */
  accidentals: NoteLabel[];
  /** Index of the next blank to fill */
  currentIndex: number;
  /** Correct note for accidentals[currentIndex] */
  answer: NoteLabel;
  hadError: boolean;
}

export type FoundationQuestion =
  | ScaleFillQuestion
  | DegreeQuestion
  | KeySigCountQuestion
  | KeySigListQuestion;

@Injectable({ providedIn: 'root' })
export class MusicTheoryService {
  // Keep sharp and flat spellings separate so each key can stay consistent.
  private readonly SHARP_CHROMATIC: NoteLabel[] = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
  ];

  private readonly FLAT_CHROMATIC: NoteLabel[] = [
    'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'
  ];

  private readonly LETTER_SEQUENCE: NoteLabel[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  private readonly NATURAL_PITCH: Record<NoteLabel, number> = {
    C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
  };

  // Enharmonic equivalents map
  private readonly ENHARMONIC: Record<string, string> = {
    'C#': 'Db', 'Db': 'C#',
    'D#': 'Eb', 'Eb': 'D#',
    'E#': 'F',  'F':  'E#',   // needed for F# major (6th sharp = E#)
    'Fb': 'E',  'E':  'Fb',
    'F#': 'Gb', 'Gb': 'F#',
    'G#': 'Ab', 'Ab': 'G#',
    'A#': 'Bb', 'Bb': 'A#',
    'B': 'Cb',  'Cb': 'B',
    'C': 'B#',  'B#': 'C',
  };

  // All 12 major key roots (preferred spelling)
  readonly ALL_KEYS: NoteLabel[] = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'];

  // Sharp keys (stages 1) and flat keys (stage 2)
  readonly SHARP_KEYS: NoteLabel[] = ['C', 'G', 'D', 'A', 'E', 'B', 'F#'];
  readonly FLAT_KEYS: NoteLabel[] = ['F', 'Bb', 'Eb', 'Ab', 'Db'];

  // Diatonic intervals: degree index (1-based) and semitone offset
  readonly DIATONIC_INTERVALS: { name: string; semitones: number; degree: number }[] = [
    { name: 'Major 2nd',  semitones: 2,  degree: 2 },
    { name: 'Major 3rd',  semitones: 4,  degree: 3 },
    { name: 'Perfect 4th', semitones: 5, degree: 4 },
    { name: 'Perfect 5th', semitones: 7, degree: 5 },
    { name: 'Major 6th',  semitones: 9,  degree: 6 },
    { name: 'Major 7th',  semitones: 11, degree: 7 },
  ];

  // Harmonic (non-diatonic) intervals
  readonly HARMONIC_INTERVALS: { name: string; semitones: number }[] = [
    { name: 'Minor 3rd',        semitones: 3  },
    { name: 'Minor 7th',        semitones: 10 },
    { name: 'Augmented 4th',    semitones: 6  },
    { name: 'Diminished 5th',   semitones: 6  },
  ];

  // All interval names (for heatmap keys)
  readonly ALL_INTERVALS: string[] = [
    'Major 2nd', 'Major 3rd', 'Perfect 4th', 'Perfect 5th',
    'Major 6th', 'Major 7th',
    'Minor 3rd', 'Minor 7th', 'Augmented 4th', 'Diminished 5th'
  ];

  /** Key signature data: accidentals listed in canonical order */
  readonly KEY_SIGNATURES: Record<string, {
    count: number;
    type: 'sharp' | 'flat' | 'none';
    accidentals: NoteLabel[];
  }> = {
    'C':  { count: 0, type: 'none',  accidentals: [] },
    'G':  { count: 1, type: 'sharp', accidentals: ['F#'] },
    'D':  { count: 2, type: 'sharp', accidentals: ['F#', 'C#'] },
    'A':  { count: 3, type: 'sharp', accidentals: ['F#', 'C#', 'G#'] },
    'E':  { count: 4, type: 'sharp', accidentals: ['F#', 'C#', 'G#', 'D#'] },
    'B':  { count: 5, type: 'sharp', accidentals: ['F#', 'C#', 'G#', 'D#', 'A#'] },
    'F#': { count: 6, type: 'sharp', accidentals: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'] },
    'F':  { count: 1, type: 'flat',  accidentals: ['Bb'] },
    'Bb': { count: 2, type: 'flat',  accidentals: ['Bb', 'Eb'] },
    'Eb': { count: 3, type: 'flat',  accidentals: ['Bb', 'Eb', 'Ab'] },
    'Ab': { count: 4, type: 'flat',  accidentals: ['Bb', 'Eb', 'Ab', 'Db'] },
    'Db': { count: 5, type: 'flat',  accidentals: ['Bb', 'Eb', 'Ab', 'Db', 'Gb'] },
  };

  /** Mnemonic for remembering the order of sharps */
  readonly SHARP_MNEMONIC =
    '"Father Charles Goes Down And Ends Battle"\n→ F#  C#  G#  D#  A#  E#';

  /** Mnemonic for remembering the order of flats */
  readonly FLAT_MNEMONIC =
    '"Battle Ends And Down Goes Charles\' Father"\n→ Bb  Eb  Ab  Db  Gb';

  /** Scale formula as a readable hint */
  readonly SCALE_FORMULA =
    'Scale formula: W – W – H – W – W – W – H\n(Whole step = 2 semitones, Half step = 1 semitone)';

  // W-W-H-W-W-W-H in semitones
  private readonly MAJOR_SCALE_STEPS = [2, 2, 1, 2, 2, 2, 1];

  /** Loaded once from localStorage; pages pick this up on their next ngOnInit. */
  preferFlats = false;

  constructor() {
    const raw = localStorage.getItem('dont-fret-prefs');
    if (raw) this.preferFlats = JSON.parse(raw).preferFlats ?? false;
  }

  private getAccidentalFamilyForKey(key: NoteLabel): 'sharp' | 'flat' {
    return this.FLAT_KEYS.includes(key) ? 'flat' : 'sharp';
  }

  private getChromaticScaleForKey(key: NoteLabel): NoteLabel[] {
    const base = this.getAccidentalFamilyForKey(key) === 'flat'
      ? [...this.FLAT_CHROMATIC]
      : [...this.SHARP_CHROMATIC];

    // F# major needs E# instead of F in key-consistent displays/answers.
    if (key === 'F#') base[5] = 'E#';
    return base;
  }

  private spellMajorScaleDegree(targetPitch: number, letter: NoteLabel): NoteLabel {
    const natural = this.NATURAL_PITCH[letter];
    const diff = (targetPitch - natural + 12) % 12;
    if (diff === 0) return letter;
    if (diff === 1) return `${letter}#`;
    if (diff === 11) return `${letter}b`;

    // Fallback for unsupported theoretical keys (double accidentals).
    return this.SHARP_CHROMATIC[targetPitch];
  }

  private chromaticIndexOf(note: NoteLabel): number {
    const sharpIdx = this.SHARP_CHROMATIC.indexOf(note);
    if (sharpIdx !== -1) return sharpIdx;

    const flatIdx = this.FLAT_CHROMATIC.indexOf(note);
    if (flatIdx !== -1) return flatIdx;

    // Try enharmonic
    const enh = this.ENHARMONIC[note];
    if (!enh) return -1;

    const enhSharpIdx = this.SHARP_CHROMATIC.indexOf(enh);
    if (enhSharpIdx !== -1) return enhSharpIdx;

    return this.FLAT_CHROMATIC.indexOf(enh);
  }

  /**
   * Generates a Major Scale from a root note using W-W-H-W-W-W-H
   */
  generateMajorScale(root: NoteLabel): NoteLabel[] {
    const rootPitch = this.chromaticIndexOf(root);
    if (rootPitch === -1) throw new Error(`Unknown note: ${root}`);

    const rootLetter = root[0] as NoteLabel;
    const rootLetterIndex = this.LETTER_SEQUENCE.indexOf(rootLetter);
    if (rootLetterIndex === -1) throw new Error(`Unknown key letter: ${root}`);

    const offsets = [0, 2, 4, 5, 7, 9, 11];
    const scale: NoteLabel[] = [];

    for (let i = 0; i < offsets.length; i++) {
      const letter = this.LETTER_SEQUENCE[(rootLetterIndex + i) % this.LETTER_SEQUENCE.length];
      const targetPitch = (rootPitch + offsets[i]) % 12;
      scale.push(this.spellMajorScaleDegree(targetPitch, letter));
    }

    return scale;
  }

  /**
   * Returns the note at a given semitone offset from root
   */
  getNoteAtInterval(root: NoteLabel, semitones: number, preferFlat = false): NoteLabel {
    const startIdx = this.chromaticIndexOf(root);
    const targetIdx = (startIdx + semitones) % 12;
    const chromatic = preferFlat ? this.FLAT_CHROMATIC : this.getChromaticScaleForKey(root);
    return chromatic[targetIdx];
  }

  /**
   * Get an interval answer for a given key + interval name
   */
  getIntervalAnswer(key: NoteLabel, intervalName: string): NoteLabel {
    const diatonic = this.DIATONIC_INTERVALS.find(i => i.name === intervalName);
    if (diatonic) {
      const majorScale = this.generateMajorScale(key);
      return majorScale[diatonic.degree - 1];
    }

    const harmonic = this.HARMONIC_INTERVALS.find(i => i.name === intervalName);
    if (harmonic) {
      const preferFlat = this.getAccidentalFamilyForKey(key) === 'flat';
      return this.getNoteAtInterval(key, harmonic.semitones, preferFlat);
    }

    throw new Error(`Unknown interval: ${intervalName}`);
  }

  /**
   * Generate a random diatonic interval question for a given key
   */
  generateDiatonicQuestion(key: NoteLabel): IntervalQuestion {
    const interval = this.DIATONIC_INTERVALS[Math.floor(Math.random() * this.DIATONIC_INTERVALS.length)];
    return {
      key,
      intervalName: interval.name,
      intervalType: 'diatonic',
      answer: this.getIntervalAnswer(key, interval.name)
    };
  }

  /**
   * Generate a random harmonic interval question for a given key
   */
  generateHarmonicQuestion(key: NoteLabel): IntervalQuestion {
    const interval = this.HARMONIC_INTERVALS[Math.floor(Math.random() * this.HARMONIC_INTERVALS.length)];
    return {
      key,
      intervalName: interval.name,
      intervalType: 'harmonic',
      answer: this.getIntervalAnswer(key, interval.name)
    };
  }

  /**
   * All chromatic notes for the note button grid
   */
  getChromaticNotes(): NoteLabel[] {
    return this.preferFlats ? [...this.FLAT_CHROMATIC] : [...this.SHARP_CHROMATIC];
  }

  /** Chromatic button labels aligned to a specific key's accidental system. */
  getChromaticNotesForKey(key: NoteLabel): NoteLabel[] {
    return this.getChromaticScaleForKey(key);
  }

  /**
   * Check if two note names are enharmonically equivalent
   */
  areEnharmonicEquals(a: NoteLabel, b: NoteLabel): boolean {
    const aIdx = this.chromaticIndexOf(a);
    const bIdx = this.chromaticIndexOf(b);
    return aIdx !== -1 && aIdx === bIdx;
  }

  /**
   * Returns the semitone distance (0–11) from `key` root up to `note`.
   * Returns -1 if either note is unrecognised.
   */
  getSemitonesFromRoot(key: NoteLabel, note: NoteLabel): number {
    const rootIdx = this.chromaticIndexOf(key);
    const noteIdx = this.chromaticIndexOf(note);
    if (rootIdx === -1 || noteIdx === -1) return -1;
    return (noteIdx - rootIdx + 12) % 12;
  }

  /**
   * Identifies what interval `note` represents from `key` root.
   * Checks diatonic intervals first, then harmonic.
   * Returns null for unison (0) or unrecognised distances.
   */
  getIntervalNameForNote(key: NoteLabel, note: NoteLabel): string | null {
    const semitones = this.getSemitonesFromRoot(key, note);
    if (semitones <= 0) return null;
    const diatonic = this.DIATONIC_INTERVALS.find(i => i.semitones === semitones);
    if (diatonic) return diatonic.name;
    const harmonic = this.HARMONIC_INTERVALS.find(i => i.semitones === semitones);
    if (harmonic) return harmonic.name;
    return null;
  }

  // ── Foundation question generators ────────────────────────────────────────

  getKeySig(key: NoteLabel) {
    return this.KEY_SIGNATURES[key] ?? { count: 0, type: 'none' as const, accidentals: [] };
  }

  /**
   * Scale with `blankCount` random positions erased. User fills left-to-right.
   */
  generateScaleFillQuestion(key: NoteLabel, blankCount = 3): ScaleFillQuestion {
    const fullScale = this.generateMajorScale(key);
    const positions = [0, 1, 2, 3, 4, 5, 6];
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    const blankIndexes = positions.slice(0, blankCount).sort((a, b) => a - b);
    const scale: (NoteLabel | null)[] = fullScale.map((note, i) =>
      blankIndexes.includes(i) ? null : note
    );
    return {
      type: 'scale-fill',
      key,
      scale,
      blankIndexes,
      currentBlankIndex: 0,
      answer: fullScale[blankIndexes[0]],
      hadError: false,
    };
  }

  /**
   * "What is degree N of Key major?" (degree 2–7)
   */
  generateDegreeQuestion(key: NoteLabel, degree?: number): DegreeQuestion {
    const deg = degree ?? (Math.floor(Math.random() * 6) + 2);
    const scale = this.generateMajorScale(key);
    return {
      type: 'degree',
      key,
      degree: deg,
      answer: scale[deg - 1],
      hadError: false,
    };
  }

  /**
   * "How many sharps/flats does Key major have?" → answer is 0–7
   */
  generateKeySigCountQuestion(key: NoteLabel): KeySigCountQuestion {
    const ks = this.getKeySig(key);
    return {
      type: 'key-sig-count',
      key,
      accidentalType: ks.type,
      answer: ks.count,
      hadError: false,
    };
  }

  /**
   * "Name the accidentals of Key major in order" → null if key has none
   */
  generateKeySigListQuestion(key: NoteLabel): KeySigListQuestion | null {
    const ks = this.getKeySig(key);
    if (ks.count === 0) return null;
    return {
      type: 'key-sig-list',
      key,
      accidentalType: ks.type as 'sharp' | 'flat',
      accidentals: [...ks.accidentals],
      currentIndex: 0,
      answer: ks.accidentals[0],
      hadError: false,
    };
  }
}
