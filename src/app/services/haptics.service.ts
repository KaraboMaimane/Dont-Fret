import { Injectable } from '@angular/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const PREFS_KEY = 'dont-fret-prefs';

@Injectable({ providedIn: 'root' })
export class HapticsService {
  private audioCtx: AudioContext | null = null;
  private bedOscillators: OscillatorNode[] = [];
  private bedGains: GainNode[] = [];
  private bedLevel = 0;

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

  private ensureAdaptiveBed(): AudioContext | null {
    const ctx = this.getAudioContext();
    if (!ctx) return null;

    if (this.bedOscillators.length > 0 && this.bedGains.length > 0) {
      return ctx;
    }

    const freqs = [82, 123, 164];
    const types: OscillatorType[] = ['sine', 'triangle', 'triangle'];

    this.bedOscillators = freqs.map((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = types[index];
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this.bedGains.push(gain);
      return osc;
    });

    return ctx;
  }

  setAdaptiveIntensity(level: number) {
    if (!this.isSoundEnabled()) {
      this.stopAdaptiveIntensity();
      return;
    }

    const clamped = Math.max(0, Math.min(Math.round(level), 3));
    if (clamped === 0) {
      this.stopAdaptiveIntensity();
      return;
    }

    const ctx = this.ensureAdaptiveBed();
    if (!ctx) return;

    const levelGains: Record<number, number[]> = {
      1: [0.0035, 0.0018, 0.0012],
      2: [0.0058, 0.0032, 0.0022],
      3: [0.009, 0.0052, 0.0034],
    };

    const gains = levelGains[clamped];
    this.bedGains.forEach((node, index) => {
      const next = gains[index] ?? 0.001;
      node.gain.setTargetAtTime(next, ctx.currentTime, 0.15);
    });

    this.bedLevel = clamped;
  }

  stopAdaptiveIntensity() {
    this.bedLevel = 0;
    if (this.bedOscillators.length === 0 && this.bedGains.length === 0) return;

    for (const osc of this.bedOscillators) {
      try {
        osc.stop();
      } catch {
        // Ignore already-stopped oscillator errors.
      }
      try {
        osc.disconnect();
      } catch {
        // Ignore disconnect errors.
      }
    }

    for (const gain of this.bedGains) {
      try {
        gain.disconnect();
      } catch {
        // Ignore disconnect errors.
      }
    }

    this.bedOscillators = [];
    this.bedGains = [];
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
