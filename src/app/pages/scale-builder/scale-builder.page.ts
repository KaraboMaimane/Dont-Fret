import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons } from '@ionic/angular/standalone';
import { MusicTheoryService, NoteLabel } from '../../services/music-theory.service';
import { ProgressService } from '../../services/progress.service';
import { StreakService } from '../../services/streak.service';
import { LearningPathService } from '../../services/learning-path.service';

type BuilderState = 'building' | 'complete' | 'boss';

@Component({
  selector: 'app-scale-builder',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons],
  templateUrl: './scale-builder.page.html',
})
export class ScaleBuilderPage implements OnInit {
  currentKey: NoteLabel = 'C';
  targetScale: NoteLabel[] = [];
  builtScale: NoteLabel[] = [];
  notes: NoteLabel[] = [];
  lastFeedback: 'correct' | 'incorrect' | null = null;
  state: BuilderState = 'building';
  sessionCorrect = 0;
  sessionTotal = 0;

  constructor(
    private theory: MusicTheoryService,
    private progress: ProgressService,
    private streak: StreakService,
    private learningPath: LearningPathService,
  ) {}

  ngOnInit() {
    this.notes = this.theory.getChromaticNotes();
    this.newChallenge();
    this.streak.recordActivity();
  }

  newChallenge() {
    const stage = this.learningPath.getCurrentStage();
    const keys = stage.keys.length ? stage.keys : this.theory.ALL_KEYS;
    this.currentKey = keys[Math.floor(Math.random() * keys.length)];
    this.targetScale = this.theory.generateMajorScale(this.currentKey);
    this.builtScale = [];
    this.lastFeedback = null;
    this.state = 'building';
  }

  selectNote(note: NoteLabel) {
    if (this.state !== 'building') return;
    const expectedIndex = this.builtScale.length;
    const expected = this.targetScale[expectedIndex];
    const correct = this.theory.areEnharmonicEquals(note, expected);

    if (correct) {
      this.builtScale.push(note);
      this.lastFeedback = 'correct';
      this.progress.recordAnswer(this.currentKey, 'Major Scale', true, 0);
      if (this.builtScale.length === 7) {
        this.state = 'complete';
        this.sessionCorrect++;
        this.sessionTotal++;
        this.streak.incrementDailyGoal(1);
      }
    } else {
      this.lastFeedback = 'incorrect';
      this.progress.recordAnswer(this.currentKey, 'Major Scale', false, 0);
      this.sessionTotal++;
    }
  }

  getNoteState(note: NoteLabel): 'correct' | 'incorrect' | '' {
    if (!this.lastFeedback) return '';
    const expected = this.targetScale[this.builtScale.length];
    if (this.lastFeedback === 'incorrect' && this.theory.areEnharmonicEquals(note, expected)) return 'correct';
    return '';
  }

  get progress$() { return Math.round(this.builtScale.length / 7 * 100); }
}
