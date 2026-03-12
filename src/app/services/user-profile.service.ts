import { Injectable } from '@angular/core';

interface ProfileState {
  name: string;
  avatar: string;
  title: string;
}

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly STORAGE_KEY = 'dont-fret-profile';
  private state: ProfileState = {
    name: 'Player One',
    avatar: '🎮',
    title: 'Rookie',
  };

  constructor() {
    this.load();
  }

  private load() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Partial<ProfileState>;
      this.state.name = this.normalizeName(parsed.name);
      this.state.avatar = this.normalizeAvatar(parsed.avatar);
      this.state.title = this.normalizeTitle(parsed.title);
    } catch {
      this.state = {
        name: 'Player One',
        avatar: '🎮',
        title: 'Rookie',
      };
    }
  }

  private save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
  }

  private normalizeName(input: string | undefined): string {
    const trimmed = (input ?? '').trim();
    if (!trimmed) return 'Player One';
    return trimmed.slice(0, 24);
  }

  private normalizeAvatar(input: string | undefined): string {
    const trimmed = (input ?? '').trim();
    return trimmed || '🎮';
  }

  private normalizeTitle(input: string | undefined): string {
    const trimmed = (input ?? '').trim();
    if (!trimmed) return 'Rookie';
    return trimmed.slice(0, 28);
  }

  getName(): string {
    return this.state.name;
  }

  setName(name: string) {
    this.state.name = this.normalizeName(name);
    this.save();
  }

  getAvatar(): string {
    return this.state.avatar;
  }

  setAvatar(avatar: string) {
    this.state.avatar = this.normalizeAvatar(avatar);
    this.save();
  }

  getTitle(): string {
    return this.state.title;
  }

  setTitle(title: string) {
    this.state.title = this.normalizeTitle(title);
    this.save();
  }
}
