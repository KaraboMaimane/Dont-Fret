import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { MilestoneService } from './services/milestone.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage, IonApp, IonRouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <ion-app>
      <div *ngIf="showSplash()"
           class="df-splash"
           role="dialog"
           aria-label="Don't Fret splash screen"
           (click)="dismissSplash()">
        <div class="df-splash-panel">
          <img ngSrc="/branding/dont-fret-logo.svg" width="108" height="108" priority alt="Don't Fret logo" class="df-splash-logo">
          <div class="df-splash-title">Don't Fret</div>
          <div class="df-splash-subtitle">Train your ear. Own every fret.</div>
          <div class="df-splash-loader" aria-hidden="true"><span></span></div>
          <button class="df-splash-skip" type="button" (click)="dismissSplash(); $event.stopPropagation()">Skip</button>
        </div>
      </div>

      <!-- Single, non-tab router outlet — no page stacking -->
      <ion-router-outlet [animated]="false"></ion-router-outlet>

      <!-- Global badge celebration toast (works across all pages) -->
      <div *ngIf="milestone.justUnlocked() as unlocked" class="fade-in-up"
           style="position:fixed; left:16px; right:16px; bottom:92px; z-index:10001;
                  background:var(--df-surface); border:1.5px solid var(--df-accent);
                  border-radius:16px; padding:14px 18px; display:flex;
                  align-items:center; gap:14px; box-shadow:0 8px 32px rgba(0,0,0,0.5);"
           (click)="milestone.dismissJustUnlocked()">
        <span style="font-size:2.2rem; line-height:1;">{{ unlocked.emoji }}</span>
        <div>
          <div style="font-size:0.65rem; font-weight:800; color:var(--df-accent); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:2px;">Badge Unlocked!</div>
          <div style="font-weight:800; font-size:0.95rem; color:var(--df-text);">{{ unlocked.title }}</div>
          <div style="font-size:0.75rem; color:var(--df-text2);">{{ unlocked.description }}</div>
        </div>
      </div>

      <!-- Custom bottom nav bar (plain HTML — no Ionic tab stacking) -->
      <nav class="custom-tab-bar">
        <a routerLink="/dashboard" routerLinkActive="active" class="tab-btn">
          <span class="tab-icon">🏠</span>
          <span class="tab-label">Home</span>
        </a>
        <a routerLink="/learning-path" routerLinkActive="active" class="tab-btn">
          <span class="tab-icon">🗺️</span>
          <span class="tab-label">Learn</span>
        </a>
        <a routerLink="/arcade" routerLinkActive="active" class="tab-btn">
          <span class="tab-icon">🕹️</span>
          <span class="tab-label">Arcade</span>
        </a>
        <a routerLink="/practice" routerLinkActive="active" class="tab-btn">
          <span class="tab-icon">🎯</span>
          <span class="tab-label">Practice</span>
        </a>
        <a routerLink="/profile" routerLinkActive="active" class="tab-btn">
          <span class="tab-icon">🧑</span>
          <span class="tab-label">Profile</span>
        </a>
      </nav>
    </ion-app>
  `,
})
export class App implements OnDestroy {
  readonly showSplash = signal(true);
  private splashTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(public milestone: MilestoneService) {
    this.splashTimer = setTimeout(() => this.dismissSplash(), 2200);
  }

  dismissSplash() {
    this.showSplash.set(false);
    if (this.splashTimer) {
      clearTimeout(this.splashTimer);
      this.splashTimer = null;
    }
  }

  ngOnDestroy() {
    if (this.splashTimer) {
      clearTimeout(this.splashTimer);
      this.splashTimer = null;
    }
  }
}
