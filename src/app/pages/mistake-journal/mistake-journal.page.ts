import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { MistakeEntry, ProgressService } from '../../services/progress.service';

interface TopPair {
  key: string;
  intervalName: string;
  misses: number;
  avgResponseMs: number;
  lastSeen: number;
}

@Component({
  selector: 'app-mistake-journal',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton],
  templateUrl: './mistake-journal.page.html',
})
export class MistakeJournalPage {
  topPairs: TopPair[] = [];
  recentMistakes: MistakeEntry[] = [];

  constructor(
    private progress: ProgressService,
    public router: Router,
  ) {}

  ngOnInit() {
    this.load();
  }

  ionViewWillEnter() {
    this.load();
  }

  formatTime(ts: number): string {
    return new Date(ts).toLocaleString('en-ZA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  replayPair(pair: TopPair) {
    this.router.navigate(['/practice'], { queryParams: { key: pair.key, interval: pair.intervalName } });
  }

  startWeakReplay() {
    this.router.navigate(['/practice'], { queryParams: { mode: 'weak' } });
  }

  private load() {
    this.topPairs = this.progress.getTopMistakePairs(12);
    this.recentMistakes = this.progress.getRecentMistakes(30);
  }
}
