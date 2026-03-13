import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-combo-meter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="combo-meter"
         [class.low]="tier() === 'low'"
         [class.mid]="tier() === 'mid'"
         [class.high]="tier() === 'high'"
         [class.ultra]="tier() === 'ultra'">
      <div class="combo-meter-label">{{ label() }}</div>
      <div class="combo-meter-value">x{{ combo() }}</div>
    </div>
  `,
  styles: [
    `
      .combo-meter {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        padding: 5px 10px;
        border: 1px solid rgba(113, 206, 255, 0.34);
        background: rgba(26, 209, 255, 0.12);
        color: var(--df-text);
        transform: translateZ(0);
        transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
      }

      .combo-meter-label {
        font-size: 0.6rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--df-text2);
      }

      .combo-meter-value {
        font-size: 0.78rem;
        font-weight: 900;
        letter-spacing: 0.02em;
      }

      .combo-meter.low {
        opacity: 0.72;
      }

      .combo-meter.mid {
        border-color: rgba(255, 185, 87, 0.44);
        background: rgba(255, 185, 87, 0.16);
      }

      .combo-meter.high {
        border-color: rgba(255, 111, 120, 0.42);
        background: rgba(255, 111, 120, 0.14);
        animation: comboPulse 0.9s ease-in-out infinite;
      }

      .combo-meter.ultra {
        border-color: rgba(255, 255, 255, 0.62);
        background:
          linear-gradient(135deg, rgba(255, 185, 87, 0.22), rgba(26, 209, 255, 0.2));
        box-shadow: 0 0 16px rgba(26, 209, 255, 0.28);
        animation: comboPulse 0.66s ease-in-out infinite;
      }

      @keyframes comboPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.04); }
      }
    `,
  ],
})
export class ComboMeterComponent {
  combo = input<number>(0);
  label = input<string>('Combo');

  tier = computed<'low' | 'mid' | 'high' | 'ultra'>(() => {
    const value = this.combo();
    if (value >= 10) return 'ultra';
    if (value >= 6) return 'high';
    if (value >= 3) return 'mid';
    return 'low';
  });
}
