import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { DailyChallengeCalendarEntry, DailyChallengeService } from '../../services/daily-challenge.service';

interface CalendarCell extends DailyChallengeCalendarEntry {
  dayLabel: string;
  monthLabel: string;
  challengeLabel: string;
}

@Component({
  selector: 'app-challenge-calendar',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton],
  templateUrl: './challenge-calendar.page.html',
})
export class ChallengeCalendarPage {
  entries: CalendarCell[] = [];
  completionStreak = 0;

  private readonly challengeNames: Record<string, string> = {
    'queue-sweeper': 'Queue Sweeper',
    'boss-prep-sprint': 'Boss Prep Sprint',
    'streak-guardian': 'Streak Guardian',
  };

  constructor(private dailyChallenge: DailyChallengeService) {}

  ngOnInit() {
    this.load();
  }

  ionViewWillEnter() {
    this.load();
  }

  private load() {
    this.entries = this.dailyChallenge.getCalendarEntries(42).map(entry => {
      const [y, m, d] = entry.dateKey.split('-').map(Number);
      const date = new Date(y, (m ?? 1) - 1, d ?? 1);
      return {
        ...entry,
        dayLabel: String(date.getDate()),
        monthLabel: date.toLocaleDateString('en-ZA', { month: 'short' }),
        challengeLabel: entry.challengeId ? (this.challengeNames[entry.challengeId] ?? entry.challengeId) : 'No challenge assigned',
      };
    });

    this.completionStreak = this.dailyChallenge.getCompletionStreak(42);
  }
}
