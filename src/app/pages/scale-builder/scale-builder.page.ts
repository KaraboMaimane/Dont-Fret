import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons } from '@ionic/angular/standalone';
import { MusicTheoryService, NoteLabel } from '../../services/music-theory.service';
import { ProgressService } from '../../services/progress.service';
import { StreakService } from '../../services/streak.service';
import { LearningPathService } from '../../services/learning-path.service';
import { MilestoneService } from '../../services/milestone.service';
import { HapticsService } from '../../services/haptics.service';
import { GameHudComponent } from '../../components/game-hud/game-hud.component';
import { ComboMeterComponent } from '../../components/combo-meter/combo-meter.component';

type BuilderState = 'building' | 'complete' | 'boss';

@Component({
  selector: 'app-scale-builder',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons, GameHudComponent, ComboMeterComponent],
  templateUrl: './scale-builder.page.html',
})
export class ScaleBuilderPage implements OnInit, OnDestroy {
  currentKey: NoteLabel = 'C';
  targetScale: NoteLabel[] = [];
  builtScale: NoteLabel[] = [];
  notes: NoteLabel[] = [];
  stageKeys: NoteLabel[] = [];
  lastFeedback: 'correct' | 'incorrect' | null = null;
  state: BuilderState = 'building';
  sessionCorrect = 0;
  sessionTotal = 0;
  currentStreak = 0;
  questionFlip = false;
  private sessionStart = 0;

  constructor(
    private theory: MusicTheoryService,
    private progress: ProgressService,
    private streak: StreakService,
    private learningPath: LearningPathService,
    private milestone: MilestoneService,
    private haptics: HapticsService,
  ) {}

  ngOnInit() {
    const stage = this.learningPath.getCurrentStage();
    this.stageKeys = (stage.keys.length ? stage.keys : this.theory.ALL_KEYS) as NoteLabel[];
    this.sessionStart = Date.now();
    this.newChallenge();
    this.streak.recordActivity();
  }

  ngOnDestroy() {
    if (this.sessionTotal > 0) {
      this.progress.recordSession('Scale Builder', this.sessionCorrect, this.sessionTotal, Date.now() - this.sessionStart);
    }
    this.haptics.stopAdaptiveIntensity();
  }

  newChallenge() {
    const stage = this.learningPath.getCurrentStage();
    const keys = stage.keys.length ? stage.keys : this.theory.ALL_KEYS;
    this.currentKey = keys[Math.floor(Math.random() * keys.length)];
    this.targetScale = this.theory.generateMajorScale(this.currentKey);
    this.notes = this.theory.getChromaticNotesForKey(this.currentKey);
    this.builtScale = [];
    this.questionFlip = !this.questionFlip;
    this.lastFeedback = null;
    this.state = 'building';
    this.haptics.startRound();
    this.haptics.setAdaptiveIntensity(this.getAdaptiveLevel());
  }

  selectNote(note: NoteLabel) {
    if (this.state !== 'building') return;
    const expectedIndex = this.builtScale.length;
    const expected = this.targetScale[expectedIndex];
    const correct = note === expected;

    if (correct) {
      this.haptics.success();
      this.currentStreak++;
      this.builtScale.push(expected);
      this.lastFeedback = 'correct';
      this.progress.recordAnswer(this.currentKey, 'Major Scale', true, 0);
      if (this.builtScale.length === 7) {
        this.state = 'complete';
        this.sessionCorrect++;
        this.sessionTotal++;
        this.streak.incrementDailyGoal(1);
        this.milestone.checkAutoMilestones(this.streak.getState().currentStreak, this.progress.getAverageResponseMs());
      }
    } else {
      this.haptics.error();
      this.currentStreak = 0;
      this.lastFeedback = 'incorrect';
      this.progress.recordAnswer(this.currentKey, 'Major Scale', false, 0);
      this.sessionTotal++;
    }
    this.haptics.setAdaptiveIntensity(this.getAdaptiveLevel());
  }

  getNoteState(note: NoteLabel): 'correct' | 'incorrect' | '' {
    if (this.state !== 'building' || !this.lastFeedback) return '';
    const expected = this.targetScale[this.builtScale.length];
    if (this.lastFeedback === 'incorrect' && note === expected) return 'correct';
    return '';
  }

  get progress$() { return Math.round(this.builtScale.length / 7 * 100); }

  selectKey(key: NoteLabel) {
    if (this.state === 'building' && this.builtScale.length > 0) return; // mid-answer, don't interrupt
    this.currentKey = key;
    this.targetScale = this.theory.generateMajorScale(this.currentKey);
    this.notes = this.theory.getChromaticNotesForKey(this.currentKey);
    this.builtScale = [];
    this.currentStreak = 0;
    this.lastFeedback = null;
    this.state = 'building';
    this.haptics.setAdaptiveIntensity(this.getAdaptiveLevel());
  }

  get fxLayerClass(): '' | 'warning' | 'danger' | 'fever' {
    if (this.currentStreak >= 4) return 'fever';
    if (this.builtScale.length >= 5) return 'danger';
    if (this.builtScale.length >= 3) return 'warning';
    return '';
  }

  get pressureChipClass(): '' | 'hot' | 'danger' {
    if (this.builtScale.length >= 5) return 'danger';
    if (this.currentStreak >= 3 || this.builtScale.length >= 3) return 'hot';
    return '';
  }

  get pressureLabel(): string {
    if (this.builtScale.length >= 5) return 'Final Degrees';
    if (this.currentStreak >= 4) return 'Perfect Chain';
    if (this.builtScale.length >= 3) return 'Mid Build';
    return 'Scale Forge';
  }

  private getAdaptiveLevel(): number {
    if (this.builtScale.length >= 5 || this.currentStreak >= 6) return 3;
    if (this.builtScale.length >= 3 || this.currentStreak >= 3) return 2;
    return 1;
  }
}
