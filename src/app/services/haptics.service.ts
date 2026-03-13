import { Injectable } from '@angular/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const PREFS_KEY = 'dont-fret-prefs';

@Injectable({ providedIn: 'root' })
export class HapticsService {
  private audioCtx: AudioContext | null = null;

  private getPrefs(): Record<string, unknown> {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private isHapticsEnabled(): boolean {
    const prefs = this.getPrefs();
    return prefs['hapticsEnabled'] !== false;
  }

  private isSoundEnabled(): boolean {
    const prefs = this.getPrefs();
    return prefs['soundEnabled'] !== false;
  }

  private supportsVibration(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  private pulse(pattern: number | number[]) {
    if (!this.isHapticsEnabled()) return;
    if (!this.supportsVibration()) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore unsupported browser/runtime edge cases.
    }
  }

  private getAudioContext(): AudioContext | null {
    if (!this.isSoundEnabled() || typeof window === 'undefined') return null;
    const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      || (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!this.audioCtx) this.audioCtx = new Ctx();
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume().catch(() => undefined);
    }
    return this.audioCtx;
  }

  private tone(
    frequency: number,
    durationMs: number,
    delayMs = 0,
    type: OscillatorType = 'triangle',
    gainLevel = 0.028,
  ) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const start = ctx.currentTime + delayMs / 1000;
    const end = start + durationMs / 1000;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainLevel, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.01);
  }

  private async nativeImpact(style: ImpactStyle): Promise<boolean> {
    if (!this.isHapticsEnabled()) return false;
    try {
      await Haptics.impact({ style });
      return true;
    } catch {
      return false;
    }
  }

  private async nativeNotification(type: NotificationType): Promise<boolean> {
    if (!this.isHapticsEnabled()) return false;
    try {
      await Haptics.notification({ type });
      return true;
    } catch {
      return false;
    }
  }

  light() {
    void this.nativeImpact(ImpactStyle.Light).then(ok => {
      if (!ok) this.pulse(10);
    });
    this.tone(640, 36, 0, 'triangle', 0.02);
  }

  success() {
    void this.nativeNotification(NotificationType.Success).then(ok => {
      if (!ok) this.pulse([12, 24, 20]);
    });
    this.tone(680, 40, 0, 'triangle', 0.03);
    this.tone(860, 62, 36, 'sine', 0.025);
  }

  error() {
    void this.nativeNotification(NotificationType.Warning).then(ok => {
      if (!ok) this.pulse([20, 34, 20]);
    });
    this.tone(320, 70, 0, 'sawtooth', 0.03);
    this.tone(220, 90, 44, 'triangle', 0.028);
  }

  timeout() {
    void this.nativeImpact(ImpactStyle.Medium).then(ok => {
      if (!ok) this.pulse([24, 30, 24]);
    });
    this.tone(250, 100, 0, 'sawtooth', 0.03);
    this.tone(190, 120, 60, 'triangle', 0.028);
  }

  startRound() {
    this.light();
    this.tone(460, 36, 28, 'triangle', 0.02);
    this.tone(580, 44, 56, 'triangle', 0.02);
  }

  streak(level = 1) {
    const clamped = Math.max(1, Math.min(level, 8));
    void this.nativeImpact(ImpactStyle.Light).then(ok => {
      if (!ok) this.pulse(14);
    });
    const base = 600 + (clamped * 18);
    this.tone(base, 34, 0, 'triangle', 0.024);
    this.tone(base + 110, 48, 26, 'triangle', 0.024);
  }
}
