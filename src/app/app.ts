import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  gridOutline, mapOutline, barbellOutline, settingsOutline,
  homeOutline, bookOutline
} from 'ionicons/icons';

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
        <a routerLink="/practice" routerLinkActive="active" class="tab-btn">
          <span class="tab-icon">🎯</span>
          <span class="tab-label">Practice</span>
        </a>
        <a routerLink="/settings" routerLinkActive="active" class="tab-btn">
          <span class="tab-icon">⚙️</span>
          <span class="tab-label">Settings</span>
        </a>
      </nav>
    </ion-app>
  `,
})
export class App {
  constructor() {
    addIcons({
      gridOutline, mapOutline, barbellOutline, settingsOutline,
      homeOutline, bookOutline
    });
  }
}
