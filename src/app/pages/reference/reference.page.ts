import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { MusicTheoryService, NoteLabel } from '../../services/music-theory.service';

interface IntervalRow {
  name: string;
  shorthand: string;
  semitones: number;
  type: 'diatonic' | 'harmonic';
  fromC: string;
}

interface KeySigRow {
  key: string;
  symbol: string;
  count: number;
  accidentals: string;
}

interface ScaleStep {
  note: string;
  step: string;
  isRoot: boolean;
}

@Component({
  selector: 'app-reference',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton],
  templateUrl: './reference.page.html',
})
export class ReferencePage implements OnInit {
  intervalRows: IntervalRow[] = [];
  keySigRows: KeySigRow[] = [];
  scaleSteps: ScaleStep[] = [];
  sharpMnemonic = '';
  flatMnemonic = '';
  cMajorScale: NoteLabel[] = [];

  constructor(
    public theory: MusicTheoryService,
    public router: Router,
  ) {}

  ngOnInit() {
    this.cMajorScale = this.theory.generateMajorScale('C');

    this.scaleSteps = [
      { note: 'C', step: '', isRoot: true },
      { note: 'D', step: 'W', isRoot: false },
      { note: 'E', step: 'W', isRoot: false },
      { note: 'F', step: 'H', isRoot: false },
      { note: 'G', step: 'W', isRoot: false },
      { note: 'A', step: 'W', isRoot: false },
      { note: 'B', step: 'W', isRoot: false },
      { note: 'C', step: 'H', isRoot: true },
    ];

    this.intervalRows = [
      ...this.theory.DIATONIC_INTERVALS.map(i => ({
        name: i.name,
        shorthand: this.shorthand(i.name),
        semitones: i.semitones,
        type: 'diatonic' as const,
        fromC: this.theory.getIntervalAnswer('C', i.name),
      })),
      ...this.theory.HARMONIC_INTERVALS.map(i => ({
        name: i.name,
        shorthand: this.shorthand(i.name),
        semitones: i.semitones,
        type: 'harmonic' as const,
        fromC: this.theory.getIntervalAnswer('C', i.name),
      })),
    ];

    this.keySigRows = this.theory.ALL_KEYS.map(key => {
      const ks = this.theory.KEY_SIGNATURES[key] ?? { count: 0, type: 'none', accidentals: [] };
      return {
        key,
        symbol: ks.type === 'sharp' ? '♯' : ks.type === 'flat' ? '♭' : '○',
        count: ks.count,
        accidentals: ks.accidentals.length > 0 ? ks.accidentals.join(' · ') : 'None',
      };
    });

    this.sharpMnemonic = this.theory.SHARP_MNEMONIC;
    this.flatMnemonic = this.theory.FLAT_MNEMONIC;
  }

  private shorthand(name: string): string {
    const map: Record<string, string> = {
      'Major 2nd': 'M2', 'Major 3rd': 'M3', 'Perfect 4th': 'P4',
      'Perfect 5th': 'P5', 'Major 6th': 'M6', 'Major 7th': 'M7',
      'Minor 3rd': 'm3', 'Minor 7th': 'm7',
      'Augmented 4th': 'Aug4', 'Diminished 5th': 'Dim5',
    };
    return map[name] ?? name;
  }
}
