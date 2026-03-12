import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <ion-app>
      <!-- Single, non-tab router outlet — no page stacking -->
      <ion-router-outlet [animated]="false"></ion-router-outlet>

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
export class App {
  constructor() {}
}
