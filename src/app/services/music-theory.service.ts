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

@Injectable({ providedIn: 'root' })
export class MusicTheoryService {
  // The chromatic scale using both sharp and flat names
  private readonly CHROMATIC: NoteLabel[] = [
    'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'
  ];

  // Enharmonic equivalents map
  private readonly ENHARMONIC: Record<string, string> = {
    'C#': 'Db', 'Db': 'C#',
    'D#': 'Eb', 'Eb': 'D#',
    'F#': 'Gb', 'Gb': 'F#',
    'G#': 'Ab', 'Ab': 'G#',
    'A#': 'Bb', 'Bb': 'A#',
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

  // W-W-H-W-W-W-H in semitones
  private readonly MAJOR_SCALE_STEPS = [2, 2, 1, 2, 2, 2, 1];

  private chromaticIndexOf(note: NoteLabel): number {
    const idx = this.CHROMATIC.indexOf(note);
    if (idx !== -1) return idx;
    // Try enharmonic
    const enh = this.ENHARMONIC[note];
    return enh ? this.CHROMATIC.indexOf(enh) : -1;
  }

  /**
   * Generates a Major Scale from a root note using W-W-H-W-W-W-H
   */
  generateMajorScale(root: NoteLabel): NoteLabel[] {
    const startIdx = this.chromaticIndexOf(root);
    if (startIdx === -1) throw new Error(`Unknown note: ${root}`);

    const scale: NoteLabel[] = [root];
    let current = startIdx;

    for (let i = 0; i < 6; i++) {
      current = (current + this.MAJOR_SCALE_STEPS[i]) % 12;
      let note = this.CHROMATIC[current];
      // Prefer flat spelling for flat keys
      if (this.FLAT_KEYS.includes(root) && this.ENHARMONIC[note] && note.includes('#')) {
        note = this.ENHARMONIC[note];
      }
      scale.push(note);
    }
    return scale;
  }

  /**
   * Returns the note at a given semitone offset from root
   */
  getNoteAtInterval(root: NoteLabel, semitones: number, preferFlat = false): NoteLabel {
    const startIdx = this.chromaticIndexOf(root);
    const targetIdx = (startIdx + semitones) % 12;
    let note = this.CHROMATIC[targetIdx];
    if (preferFlat && this.ENHARMONIC[note] && note.includes('#')) {
      note = this.ENHARMONIC[note];
    }
    return note;
  }

  /**
   * Get an interval answer for a given key + interval name
   */
  getIntervalAnswer(key: NoteLabel, intervalName: string): NoteLabel {
    const preferFlat = this.FLAT_KEYS.includes(key);
    const diatonic = this.DIATONIC_INTERVALS.find(i => i.name === intervalName);
    if (diatonic) {
      return this.getNoteAtInterval(key, diatonic.semitones, preferFlat);
    }
    const harmonic = this.HARMONIC_INTERVALS.find(i => i.name === intervalName);
    if (harmonic) {
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
    return [...this.CHROMATIC];
  }

  /**
   * Check if two note names are enharmonically equivalent
   */
  areEnharmonicEquals(a: NoteLabel, b: NoteLabel): boolean {
    if (a === b) return true;
    return this.ENHARMONIC[a] === b || this.ENHARMONIC[b] === a;
  }
}
