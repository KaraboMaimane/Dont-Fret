import { Injectable } from '@angular/core';
import { NoteLabel } from './music-theory.service';

export interface DrillPreset {
  id: string;
  name: string;
  keys: NoteLabel[];
  intervals: string[];
  questionCount: number;
  createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class DrillPresetService {
  private readonly STORAGE_KEY = 'dont-fret-drill-presets';
  private presets: DrillPreset[] = [];

  constructor() {
    this.load();
  }

  getAll(): DrillPreset[] {
    return [...this.presets].sort((a, b) => b.createdAt - a.createdAt);
  }

  savePreset(input: { name: string; keys: NoteLabel[]; intervals: string[]; questionCount: number }): DrillPreset {
    const name = this.normalizeName(input.name);
    const id = `preset-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    const preset: DrillPreset = {
      id,
      name,
      keys: [...input.keys],
      intervals: [...input.intervals],
      questionCount: input.questionCount,
      createdAt: Date.now(),
    };

    this.presets.unshift(preset);
    this.presets = this.presets.slice(0, 20);
    this.save();
    return preset;
  }

  deletePreset(id: string) {
    this.presets = this.presets.filter(preset => preset.id !== id);
    this.save();
  }

  private load() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as DrillPreset[];
      this.presets = parsed
        .map(preset => ({
          ...preset,
          name: this.normalizeName(preset.name),
          keys: Array.isArray(preset.keys) ? preset.keys : [],
          intervals: Array.isArray(preset.intervals) ? preset.intervals : [],
          questionCount: Math.max(4, Math.min(30, Number(preset.questionCount) || 10)),
          createdAt: Number(preset.createdAt) || Date.now(),
        }))
        .filter(preset => preset.keys.length > 0 && preset.intervals.length > 0)
        .slice(0, 20);
    } catch {
      this.presets = [];
    }
  }

  private save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.presets));
  }

  private normalizeName(name: string | undefined): string {
    const value = (name ?? '').trim();
    if (!value) return 'Custom Loadout';
    return value.slice(0, 28);
  }
}
