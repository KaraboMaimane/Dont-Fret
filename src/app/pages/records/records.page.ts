import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar,
} from '@ionic/angular/standalone';
import { PersonalRecordsService, TimedRecord, BlitzRecord, ExamRecord } from '../../services/personal-records.service';

@Component({
  selector: 'app-records',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton],
  templateUrl: './records.page.html',
})
export class RecordsPage {
  bestTimed: TimedRecord | null = null;
  bestBlitz: BlitzRecord | null = null;
  timedHistory: TimedRecord[] = [];
  blitzHistory: BlitzRecord[] = [];
  examHistory: ExamRecord[] = [];
  examPassRate = 0;
  examPassCount = 0;
  activeTab: 'bests' | 'timed' | 'blitz' | 'exam' = 'bests';

  constructor(
    private records: PersonalRecordsService,
    public router: Router,
  ) {}

  ionViewWillEnter() {
    this.refresh();
  }

  refresh() {
    this.bestTimed = this.records.getBestTimed();
    this.bestBlitz = this.records.getBestBlitz();
    this.timedHistory = this.records.getTimedHistory().slice(0, 20);
    this.blitzHistory = this.records.getBlitzHistory().slice(0, 20);
    this.examHistory = this.records.getExamHistory().slice(0, 20);
    this.examPassRate = this.records.getExamPassRate();
    this.examPassCount = this.records.getExamPassCount();
  }

  setTab(tab: 'bests' | 'timed' | 'blitz' | 'exam') {
    this.activeTab = tab;
  }

  formatDate(iso: string | number): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  formatDuration(ms: number): string {
    if (!ms) return '–';
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  starsLabel(stars: number): string {
    return '⭐'.repeat(stars) || '–';
  }

  get totalTimedRuns(): number {
    return this.records.getTimedHistory().length;
  }

  get totalBlitzRuns(): number {
    return this.records.getBlitzHistory().length;
  }

  get totalExamRuns(): number {
    return this.records.getExamHistory().length;
  }
}
