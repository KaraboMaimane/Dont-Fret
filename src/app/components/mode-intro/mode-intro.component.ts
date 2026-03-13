import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-mode-intro',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="mode-intro" [class]="'mode-intro theme-' + theme()">
      <div class="mode-intro-orb"></div>
      <div class="mode-intro-icon">{{ icon() }}</div>
      <div class="mode-intro-kicker">{{ kicker() }}</div>
      <div class="mode-intro-title">{{ title() }}</div>
      <div class="mode-intro-subtitle">{{ subtitle() }}</div>

      <div class="mode-intro-facts" *ngIf="facts().length > 0">
        <span *ngFor="let fact of facts()">{{ fact }}</span>
      </div>
    </section>
  `,
  styles: [
    `
      .mode-intro {
        position: relative;
        overflow: hidden;
        border-radius: 18px;
        border: 1px solid rgba(113, 206, 255, 0.32);
        background:
          radial-gradient(circle at 20% 15%, rgba(26, 209, 255, 0.2), transparent 42%),
          radial-gradient(circle at 80% 0%, rgba(255, 185, 87, 0.18), transparent 36%),
          linear-gradient(180deg, rgba(16, 30, 52, 0.96), rgba(11, 20, 35, 0.99));
        padding: 22px 16px 18px;
        text-align: left;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.26);
        margin-bottom: 18px;
        animation: introRise 0.4s ease both;
      }

      .mode-intro.theme-exam {
        border-color: rgba(255, 111, 120, 0.42);
        background:
          radial-gradient(circle at 20% 15%, rgba(255, 111, 120, 0.2), transparent 42%),
          radial-gradient(circle at 82% 0%, rgba(255, 185, 87, 0.16), transparent 34%),
          linear-gradient(180deg, rgba(30, 19, 35, 0.97), rgba(18, 12, 24, 0.99));
      }

      .mode-intro.theme-blitz {
        border-color: rgba(255, 185, 87, 0.45);
      }

      .mode-intro-orb {
        position: absolute;
        width: 190px;
        height: 190px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(26, 209, 255, 0.26), transparent 65%);
        top: -90px;
        right: -70px;
        filter: blur(2px);
        animation: orbDrift 6s ease-in-out infinite;
        pointer-events: none;
      }

      .mode-intro-icon {
        font-size: 2rem;
        line-height: 1;
        margin-bottom: 10px;
      }

      .mode-intro-kicker {
        font-size: 0.66rem;
        letter-spacing: 0.11em;
        text-transform: uppercase;
        font-weight: 800;
        color: var(--df-accent);
      }

      .mode-intro-title {
        font-family: var(--df-display-font);
        font-size: 1.32rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--df-text);
        margin-top: 5px;
      }

      .mode-intro-subtitle {
        margin-top: 7px;
        font-size: 0.82rem;
        line-height: 1.45;
        color: var(--df-text2);
      }

      .mode-intro-facts {
        margin-top: 14px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .mode-intro-facts span {
        padding: 4px 8px;
        border-radius: 999px;
        font-size: 0.65rem;
        font-weight: 700;
        color: var(--df-text);
        background: rgba(26, 209, 255, 0.12);
        border: 1px solid rgba(113, 206, 255, 0.32);
      }

      @keyframes orbDrift {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(10px) scale(1.04); }
      }

      @keyframes introRise {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.99);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `,
  ],
})
export class ModeIntroComponent {
  icon = input.required<string>();
  kicker = input.required<string>();
  title = input.required<string>();
  subtitle = input.required<string>();
  theme = input<'blitz' | 'timed' | 'exam'>('timed');
  facts = input<string[]>([]);
}
