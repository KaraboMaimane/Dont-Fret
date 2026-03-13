import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons } from '@ionic/angular/standalone';
import { MusicTheoryService, NoteLabel } from '../../services/music-theory.service';
import { ProgressService } from '../../services/progress.service';
import { StreakService } from '../../services/streak.service';
import { LearningPathService } from '../../services/learning-path.service';
import { MilestoneService } from '../../services/milestone.service';
import { HapticsService } from '../../services/haptics.service';

type BuilderState = 'building' | 'complete' | 'boss';

@Component({
  selector: 'app-scale-builder',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons],
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
  }

  newChallenge() {
    const stage = this.learningPath.getCurrentStage();
    const keys = stage.keys.length ? stage.keys : this.theory.ALL_KEYS;
    this.currentKey = keys[Math.floor(Math.random() * keys.length)];
    this.targetScale = this.theory.generateMajorScale(this.currentKey);
    this.notes = this.theory.getChromaticNotesForKey(this.currentKey);
    this.builtScale = [];
    this.lastFeedback = null;
    this.state = 'building';
    this.haptics.startRound();
  }

  selectNote(note: NoteLabel) {
    if (this.state !== 'building') return;
    const expectedIndex = this.builtScale.length;
    const expected = this.targetScale[expectedIndex];
    const correct = note === expected;

    if (correct) {
      this.haptics.success();
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
      this.lastFeedback = 'incorrect';
      this.progress.recordAnswer(this.currentKey, 'Major Scale', false, 0);
      this.sessionTotal++;
    }
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
    this.lastFeedback = null;
    this.state = 'building';
  }
}
