import { Injectable } from '@angular/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

@Injectable({ providedIn: 'root' })
export class HapticsService {
  private supportsVibration(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  private pulse(pattern: number | number[]) {
    if (!this.supportsVibration()) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore unsupported browser/runtime edge cases.
    }
  }

  private async nativeImpact(style: ImpactStyle): Promise<boolean> {
    try {
      await Haptics.impact({ style });
      return true;
    } catch {
      return false;
    }
  }

  private async nativeNotification(type: NotificationType): Promise<boolean> {
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
  }

  success() {
    void this.nativeNotification(NotificationType.Success).then(ok => {
      if (!ok) this.pulse([12, 24, 20]);
    });
  }

  error() {
    void this.nativeNotification(NotificationType.Warning).then(ok => {
      if (!ok) this.pulse([20, 34, 20]);
    });
  }
}
