import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { IntervalQuestion, MusicTheoryService, NoteLabel } from '../../services/music-theory.service';
import { LearningPathService, Stage } from '../../services/learning-path.service';
import { HapticsService } from '../../services/haptics.service';
import { GameHudComponent } from '../../components/game-hud/game-hud.component';
import { ModeIntroComponent } from '../../components/mode-intro/mode-intro.component';

interface PlacementQuestion extends IntervalQuestion {
  tier: 1 | 2 | 3;
}

interface PlacementResult {
  question: PlacementQuestion;
  selected: NoteLabel;
  correct: boolean;
  responseMs: number;
}

@Component({
  selector: 'app-placement-test',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, GameHudComponent, ModeIntroComponent],
  templateUrl: './placement-test.page.html',
})
export class PlacementTestPage {
  notes: NoteLabel[] = [];
  readonly totalQuestions = 12;

  state: 'intro' | 'playing' | 'done' = 'intro';
  questions: PlacementQuestion[] = [];
  results: PlacementResult[] = [];
  currentIndex = 0;
  feedback = '';
  selectedNote: NoteLabel | null = null;
  currentStreak = 0;
  questionFlip = false;

  readonly introFacts = ['12 adaptive prompts', 'All three difficulty tiers', 'Auto stage recommendation'];

  recommendedStage: Stage = 1;
  recommendedStageName = '';

  private questionStart = 0;

  constructor(
    private theory: MusicTheoryService,
    private learningPath: LearningPathService,
    private haptics: HapticsService,
    private cdr: ChangeDetectorRef,
    public router: Router,
  ) {
    this.notes = this.theory.getChromaticNotes();
  }

  startTest() {
    this.questions = this.buildQuestionSet();
    this.results = [];
    this.currentIndex = 0;
    this.feedback = '';
    this.selectedNote = null;
    this.currentStreak = 0;
    this.questionFlip = false;
    this.state = 'playing';
    this.haptics.startRound();
    this.notes = this.questions.length > 0
      ? this.theory.getChromaticNotesForKey(this.questions[0].key)
      : this.theory.getChromaticNotes();
    this.questionStart = Date.now();
  }

  select(note: NoteLabel) {
    if (this.state !== 'playing') return;
    const question = this.questions[this.currentIndex];
    if (!question) return;

    this.selectedNote = note;
    const correct = note === question.answer;
    const responseMs = Date.now() - this.questionStart;
    this.results.push({ question, selected: note, correct, responseMs });

    if (correct) {
      try {
        this.haptics.success();
      } catch {
        // Keep placement flow moving if feedback hardware/audio fails.
      }
      this.feedback = '✅ Correct';
      this.currentStreak++;
    } else {
      try {
        this.haptics.error();
      } catch {
        // Keep placement flow moving if feedback hardware/audio fails.
      }
      this.feedback = `❌ Correct answer: ${question.answer}`;
      this.currentStreak = 0;
    }

    setTimeout(() => {
      this.currentIndex++;
      this.feedback = '';
      this.selectedNote = null;
      if (this.currentIndex >= this.questions.length) {
        this.finish();
      } else {
        this.notes = this.theory.getChromaticNotesForKey(this.questions[this.currentIndex].key);
        this.questionFlip = !this.questionFlip;
        this.questionStart = Date.now();
      }

      // Ensure the next question renders immediately even when timers do not auto-trigger CD.
      this.cdr.detectChanges();
    }, 450);
  }

  finish() {
    this.state = 'done';
    this.recommendedStage = this.estimateStage();
    this.recommendedStageName = this.learningPath.getStage(this.recommendedStage).title;
    this.learningPath.applyPlacement(this.recommendedStage);
  }

  continue() {
    this.router.navigateByUrl(this.learningPath.getDrillRoute(this.learningPath.getCurrentStage()));
  }

  get progressPct(): number {
    if (this.questions.length === 0) return 0;
    return Math.round((this.currentIndex / this.questions.length) * 100);
  }

  get scorePct(): number {
    if (this.results.length === 0) return 0;
    const correct = this.results.filter(result => result.correct).length;
    return Math.round((correct / this.results.length) * 100);
  }

  get tier3Pct(): number {
    const tier3 = this.results.filter(result => result.question.tier === 3);
    if (tier3.length === 0) return 0;
    const correct = tier3.filter(result => result.correct).length;
    return Math.round((correct / tier3.length) * 100);
  }

  get currentQuestion(): PlacementQuestion | null {
    return this.questions[this.currentIndex] ?? null;
  }

  get fxLayerClass(): '' | 'warning' | 'danger' | 'fever' {
    const remaining = this.totalQuestions - this.currentIndex;
    if (this.currentStreak >= 4) return 'fever';
    if (remaining <= 2) return 'danger';
    if (remaining <= 5) return 'warning';
    return '';
  }

  get pressureChipClass(): '' | 'hot' | 'danger' {
    const remaining = this.totalQuestions - this.currentIndex;
    if (remaining <= 2) return 'danger';
    if (this.currentStreak >= 3 || remaining <= 5) return 'hot';
    return '';
  }

  get pressureLabel(): string {
    const remaining = this.totalQuestions - this.currentIndex;
    if (remaining <= 2) return 'Final Calls';
    if (remaining <= 5) return 'Closing In';
    if (this.currentStreak >= 4) return 'Perfect Flow';
    return 'Calibration';
  }

  private estimateStage(): Stage {
    const score = this.scorePct;
    const advanced = this.tier3Pct;

    let stage: Stage;
    if (score < 40) stage = 1;
    else if (score < 55) stage = 2;
    else if (score < 68) stage = 3;
    else if (score < 78) stage = 4;
    else if (score < 86) stage = 5;
    else if (score < 93) stage = 6;
    else stage = 7;

    if (advanced < 50 && stage > 5) {
      stage = 5;
    }

    return stage;
  }

  private buildQuestionSet(): PlacementQuestion[] {
    const tier1Keys: NoteLabel[] = ['C', 'G', 'D'];
    const tier2Keys: NoteLabel[] = ['A', 'E', 'F', 'Bb'];
    const tier3Keys: NoteLabel[] = ['B', 'F#', 'Eb', 'Ab', 'Db'];

    const tier1Intervals = ['Major 2nd', 'Major 3rd', 'Perfect 5th'];
    const tier2Intervals = ['Perfect 4th', 'Major 6th', 'Major 7th'];
    const tier3Intervals = ['Minor 3rd', 'Minor 7th', 'Augmented 4th', 'Diminished 5th'];

    const out: PlacementQuestion[] = [];

    for (let i = 0; i < 4; i++) {
      out.push(this.makeQuestion(tier1Keys[i % tier1Keys.length], tier1Intervals[i % tier1Intervals.length], 1));
      out.push(this.makeQuestion(tier2Keys[i % tier2Keys.length], tier2Intervals[i % tier2Intervals.length], 2));
      out.push(this.makeQuestion(tier3Keys[i % tier3Keys.length], tier3Intervals[i % tier3Intervals.length], 3));
    }

    return this.shuffle(out).slice(0, this.totalQuestions);
  }

  private makeQuestion(key: NoteLabel, intervalName: string, tier: 1 | 2 | 3): PlacementQuestion {
    const intervalType = this.theory.DIATONIC_INTERVALS.some(interval => interval.name === intervalName)
      ? 'diatonic'
      : 'harmonic';

    return {
      key,
      intervalName,
      intervalType,
      answer: this.theory.getIntervalAnswer(key, intervalName),
      tier,
    };
  }

  private shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
