import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-game-hud',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="game-hud" [class.compact]="compact()" [class.has-chip]="!!chip()" [class]="'game-hud theme-' + theme()">
      <div class="game-hud-copy">
        <div class="game-hud-kicker">{{ kicker() }}</div>
        <div class="game-hud-title">{{ title() }}</div>
        <div *ngIf="subtitle()" class="game-hud-subtitle">{{ subtitle() }}</div>
      </div>

      <div class="game-hud-meta">
        <div *ngIf="chip()" class="game-hud-chip">{{ chip() }}</div>
        <div *ngIf="icon()" class="game-hud-icon">{{ icon() }}</div>
      </div>
    </section>
  `,
  styles: [
    `
      .game-hud {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
        padding: 13px 14px;
        border-radius: 14px;
        border: 1px solid rgba(113, 206, 255, 0.35);
        background:
          radial-gradient(circle at top right, rgba(26, 209, 255, 0.2), transparent 42%),
          linear-gradient(180deg, rgba(17, 31, 53, 0.96), rgba(10, 19, 34, 0.98));
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
      }

      .game-hud.compact {
        padding: 10px 12px;
      }

      .game-hud.theme-exam {
        border-color: rgba(255, 111, 120, 0.35);
        background:
          radial-gradient(circle at top right, rgba(255, 111, 120, 0.2), transparent 42%),
          linear-gradient(180deg, rgba(24, 28, 47, 0.96), rgba(13, 18, 34, 0.98));
      }

      .game-hud.theme-blitz {
        border-color: rgba(255, 185, 87, 0.35);
      }

      .game-hud-kicker {
        font-size: 0.62rem;
        font-weight: 800;
        color: var(--df-accent);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .game-hud-title {
        font-size: 0.98rem;
        font-weight: 800;
        color: var(--df-text);
        margin-top: 3px;
      }

      .game-hud-subtitle {
        font-size: 0.75rem;
        color: var(--df-text2);
        margin-top: 4px;
        line-height: 1.35;
      }

      .game-hud-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 6px;
      }

      .game-hud-chip {
        border: 1px solid rgba(113, 206, 255, 0.45);
        background: rgba(26, 209, 255, 0.14);
        color: var(--df-text);
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 0.66rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .game-hud-icon {
        font-size: 1.4rem;
        line-height: 1;
      }
    `,
  ],
})
export class GameHudComponent {
  kicker = input.required<string>();
  title = input.required<string>();
  subtitle = input<string>('');
  chip = input<string>('');
  icon = input<string>('');
  compact = input<boolean>(false);
  theme = input<'default' | 'blitz' | 'timed' | 'exam'>('default');
}
