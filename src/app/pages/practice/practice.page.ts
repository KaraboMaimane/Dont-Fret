import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar
} from '@ionic/angular/standalone';
import { AdaptiveService } from '../../services/adaptive.service';
import { DrillPreset, DrillPresetService } from '../../services/drill-preset.service';
import { LearningPathService, Stage } from '../../services/learning-path.service';
import { MilestoneService } from '../../services/milestone.service';
import { MusicTheoryService, IntervalQuestion, NoteLabel } from '../../services/music-theory.service';
import { ProgressService } from '../../services/progress.service';
import { StreakService } from '../../services/streak.service';

type AnswerState = 'unanswered' | 'correct' | 'incorrect';
type PracticeGoal = 'warmup' | 'accuracy' | 'review' | 'weak-spots';
type SessionMode = 'recommended' | 'custom' | 'due' | 'weak' | 'focus' | 'preset';

@Component({
  selector: 'app-practice',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons],
  templateUrl: './practice.page.html',
})
export class PracticePage implements OnInit, OnDestroy {
  question: IntervalQuestion | null = null;
  notes: NoteLabel[] = [];
  answerState: AnswerState = 'unanswered';
  selectedNote: NoteLabel | null = null;
  feedbackText = '';
  hintText = '';
  showHint = false;
  responseMs = 0;
  sessionCorrect = 0;
  sessionTotal = 0;
  sessionStart = 0;
  showMistakeReplay = false;
  mistakeQueue: IntervalQuestion[] = [];
  showRoundSummary = false;
  roundAccuracy = 0;
  prevSessionAccuracy = 0;
  accuracyDelta = 0;
  showSetup = true;
  showBuilder = false;
  dueCount = 0;
  currentStageName = '';
  currentStageId: Stage = 1;
  sessionLabel = 'Recommended Practice';
  sessionSubtitle = 'A short, level-appropriate run.';
  setupGoal: PracticeGoal = 'warmup';
  setupQuestionCount = 8;
  availableKeys: NoteLabel[] = [];
  availableIntervals: string[] = [];
  selectedKeys: NoteLabel[] = [];
  selectedIntervals: string[] = [];
  presetName = '';
  presets: DrillPreset[] = [];
  private questionStart = 0;
  private pool: IntervalQuestion[] = [];
  private poolIndex = 0;
  public mistakes: IntervalQuestion[] = [];
  isReplayMode = false;
  private sessionMode: SessionMode = 'recommended';

  constructor(
    private theory: MusicTheoryService,
    private progress: ProgressService,
    private adaptive: AdaptiveService,
    private streak: StreakService,
    public milestone: MilestoneService,
    private learningPath: LearningPathService,
    private presetStore: DrillPresetService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.initializeSetup();
  }

  ngOnDestroy() {
    this.saveSession();
  }

  initializeSetup() {
    this.notes = this.theory.getChromaticNotes();
    this.dueCount = this.progress.getDueCount();

    const stage = this.learningPath.getCurrentStage();
    this.currentStageName = stage.title;
    this.currentStageId = stage.id;
    this.availableKeys = this.getPracticeKeysForStage(stage.id);
    this.availableIntervals = this.getPracticeIntervalsForStage(stage.id);
    this.selectedKeys = [...this.availableKeys];
    this.selectedIntervals = [...this.availableIntervals];
    this.presets = this.presetStore.getAll();
    this.applyGoal('warmup');

    const focusKey = this.route.snapshot.queryParams['key'] as string | undefined;
    const focusInterval = this.route.snapshot.queryParams['interval'] as string | undefined;
    const mode = this.route.snapshot.queryParams['mode'] as string | undefined;

    if (focusKey && focusInterval) {
      this.startFocusedSession(focusKey as NoteLabel, focusInterval);
      return;
    }

    if (mode === 'due') {
      this.setupGoal = 'review';
      this.startRecommendedSession();
      return;
    }

    if (mode === 'weak') {
      this.setupGoal = 'weak-spots';
      this.startRecommendedSession();
      return;
    }

    this.question = null;
    this.showSetup = true;
    this.showRoundSummary = false;
    this.showMistakeReplay = false;
  }

  applyGoal(goal: PracticeGoal) {
    this.setupGoal = goal;
    this.setupQuestionCount = goal === 'warmup' ? 8 : 12;
    if (goal === 'review' || goal === 'weak-spots') {
      this.setupQuestionCount = 10;
    }
  }

  toggleBuilder() {
    this.showBuilder = !this.showBuilder;
  }

  toggleKey(key: NoteLabel) {
    if (this.selectedKeys.includes(key)) {
      if (this.selectedKeys.length === 1) return;
      this.selectedKeys = this.selectedKeys.filter(entry => entry !== key);
      return;
    }

    this.selectedKeys = [...this.selectedKeys, key];
  }

  toggleInterval(interval: string) {
    if (this.selectedIntervals.includes(interval)) {
      if (this.selectedIntervals.length === 1) return;
      this.selectedIntervals = this.selectedIntervals.filter(entry => entry !== interval);
      return;
    }

    this.selectedIntervals = [...this.selectedIntervals, interval];
  }

  setQuestionCount(count: number) {
    this.setupQuestionCount = count;
  }

  startRecommendedSession() {
    if (this.setupGoal === 'review') {
      this.sessionMode = 'due';
      const hasDue = this.dueCount > 0;
      this.beginSession(
        this.adaptive.buildDueReviewPool(this.setupQuestionCount),
        hasDue ? 'Due Now' : 'Warm-up Run',
        hasDue ? 'Clear overdue review cards first.' : 'No overdue cards yet, so this run falls back to recommended practice.'
      );
      return;
    }

    if (this.setupGoal === 'weak-spots') {
      this.sessionMode = 'weak';
      this.beginSession(
        this.adaptive.buildStrugglePool(this.setupQuestionCount),
        'Weak Spots',
        'Your lowest-accuracy pairs, front and center.'
      );
      return;
    }

    this.sessionMode = 'recommended';
    this.beginSession(
      this.adaptive.buildCustomQuestionPool({
        keys: this.availableKeys,
        intervals: this.availableIntervals,
        count: this.setupQuestionCount,
      }),
      this.setupGoal === 'accuracy' ? 'Accuracy Run' : 'Warm-up Run',
      this.setupGoal === 'accuracy'
        ? 'A longer stage-safe set built to sharpen consistency.'
        : 'A short run tuned to your current level.'
    );
  }

  startCustomSession() {
    this.sessionMode = 'custom';
    this.beginSession(
      this.adaptive.buildCustomQuestionPool({
        keys: this.selectedKeys,
        intervals: this.selectedIntervals,
        count: this.setupQuestionCount,
        dueOnly: this.setupGoal === 'review',
        weakOnly: this.setupGoal === 'weak-spots',
      }),
      'Custom Drill',
      `${this.selectedKeys.length} key${this.selectedKeys.length === 1 ? '' : 's'} · ${this.selectedIntervals.length} interval${this.selectedIntervals.length === 1 ? '' : 's'}`
    );
  }

  saveCurrentAsPreset() {
    const preset = this.presetStore.savePreset({
      name: this.presetName,
      keys: this.selectedKeys,
      intervals: this.selectedIntervals,
      questionCount: this.setupQuestionCount,
    });
    this.presets = this.presetStore.getAll();
    this.presetName = '';
    this.loadPreset(preset);
  }

  loadPreset(preset: DrillPreset) {
    this.selectedKeys = [...preset.keys];
    this.selectedIntervals = [...preset.intervals];
    this.setupQuestionCount = preset.questionCount;
    this.showBuilder = true;
  }

  playPreset(preset: DrillPreset) {
    this.loadPreset(preset);
    this.sessionMode = 'preset';
    this.beginSession(
      this.adaptive.buildCustomQuestionPool({
        keys: preset.keys,
        intervals: preset.intervals,
        count: preset.questionCount,
      }),
      `Preset: ${preset.name}`,
      `${preset.keys.length} keys · ${preset.intervals.length} intervals`,
    );
  }

  removePreset(id: string) {
    this.presetStore.deletePreset(id);
    this.presets = this.presetStore.getAll();
  }

  startFocusedSession(key: NoteLabel, interval: string) {
    const answer = this.theory.getIntervalAnswer(key, interval);
    const intervalType: 'diatonic' | 'harmonic' = this.isDiatonic(interval) ? 'diatonic' : 'harmonic';
    const focusPool: IntervalQuestion[] = Array.from({ length: 8 }, () => ({
      key,
      intervalName: interval,
      intervalType,
      answer,
    }));

    this.sessionMode = 'focus';
    this.beginSession(
      [...focusPool, ...this.adaptive.buildCustomQuestionPool({
        keys: this.availableKeys,
        intervals: this.availableIntervals,
        count: 12,
      })],
      'Targeted Drill',
      `${key} ${interval} with stage-safe backup questions.`
    );
  }

  beginSession(pool: IntervalQuestion[], label: string, subtitle: string) {
    const sessions = this.progress.getRecentSessions(1);
    this.prevSessionAccuracy = sessions.length > 0
      ? Math.round((sessions[0].correct / (sessions[0].total || 1)) * 100)
      : 0;

    this.sessionLabel = label;
    this.sessionSubtitle = subtitle;
    this.pool = pool.length > 0
      ? pool
      : this.adaptive.buildCustomQuestionPool({
          keys: this.availableKeys,
          intervals: this.availableIntervals,
          count: this.setupQuestionCount,
        });
    this.poolIndex = 0;
    this.sessionCorrect = 0;
    this.sessionTotal = 0;
    this.sessionStart = Date.now();
    this.mistakes = [];
    this.isReplayMode = false;
    this.showSetup = false;
    this.showRoundSummary = false;
    this.showMistakeReplay = false;
    this.answerState = 'unanswered';
    this.feedbackText = '';
    this.showHint = false;
    this.question = null;
    this.nextQuestion();
    this.streak.recordActivity();
  }

  nextQuestion() {
    this.answerState = 'unanswered';
    this.selectedNote = null;
    this.showHint = false;
    this.hintText = '';
    this.feedbackText = '';

    if (this.isReplayMode) {
      if (this.mistakeQueue.length === 0) {
        this.showMistakeReplay = false;
        this.isReplayMode = false;
        if (this.mistakes.length === 0) {
          this.milestone.unlock('mistake_buster');
        }
        this.showRoundEnd();
        return;
      }
      this.question = this.mistakeQueue.shift()!;
    } else {
      if (this.poolIndex >= this.pool.length) {
        if (this.mistakes.length > 0) {
          this.showMistakeReplay = true;
          return;
        }
        this.showRoundEnd();
        return;
      }
      this.question = this.pool[this.poolIndex++];
    }

    this.notes = this.theory.getChromaticNotesForKey(this.question.key);

    this.questionStart = Date.now();
  }

  selectNote(note: NoteLabel) {
    if (this.answerState !== 'unanswered' || !this.question) return;

    this.responseMs = Date.now() - this.questionStart;
    this.selectedNote = note;
    const correct = note === this.question.answer;
    this.answerState = correct ? 'correct' : 'incorrect';

    if (correct) {
      this.feedbackText = `✅ Correct! ${this.question.key} ${this.question.intervalName} = ${this.question.answer} (${(this.responseMs / 1000).toFixed(1)}s)`;
    } else {
      const actualInterval = this.theory.getIntervalNameForNote(this.question.key, note);
      const clue = actualInterval ? ` (${note} is the ${actualInterval})` : '';
      this.feedbackText = `❌ Wrong${clue} — the ${this.question.intervalName} of ${this.question.key} is ${this.question.answer}`;
    }

    this.progress.recordAnswer(this.question.key, this.question.intervalName, correct, this.responseMs, this.sessionLabel);
    this.sessionTotal++;
    if (correct) {
      this.sessionCorrect++;
      this.milestone.unlock('first_note');
      this.streak.incrementDailyGoal(1);
    } else {
      this.mistakes.push({ ...this.question });
    }

    this.milestone.checkAutoMilestones(this.streak.getState().currentStreak, this.progress.getAverageResponseMs());
  }

  toggleHint() {
    if (!this.question) return;
    this.showHint = !this.showHint;
    if (this.showHint) {
      const scale = this.theory.generateMajorScale(this.question.key);
      this.hintText = `${this.question.key} Major Scale: ${scale.join(' – ')}`;
    }
  }

  startMistakeReplay() {
    this.mistakeQueue = [...this.mistakes];
    this.mistakes = [];
    this.isReplayMode = true;
    this.showMistakeReplay = false;
    this.nextQuestion();
  }

  skipMistakeReplay() {
    this.showMistakeReplay = false;
    this.showRoundEnd();
  }

  continueAfterSummary() {
    this.showRoundSummary = false;

    switch (this.sessionMode) {
      case 'custom':
        this.startCustomSession();
        break;
      case 'due':
        this.setupGoal = 'review';
        this.startRecommendedSession();
        break;
      case 'weak':
        this.setupGoal = 'weak-spots';
        this.startRecommendedSession();
        break;
      case 'preset':
        this.startCustomSession();
        break;
      default:
        this.startRecommendedSession();
        break;
    }
  }

  backToSetup() {
    this.saveSession();
    this.initializeSetup();
  }

  private showRoundEnd() {
    this.saveSession();
    this.roundAccuracy = this.accuracyPct;
    this.accuracyDelta = this.roundAccuracy - this.prevSessionAccuracy;
    this.showRoundSummary = true;
    this.question = null;
  }

  private saveSession() {
    if (this.sessionTotal > 0 && !this.showRoundSummary) {
      this.progress.recordSession('Practice', this.sessionCorrect, this.sessionTotal, Date.now() - this.sessionStart);
    }
  }

  getNoteClass(note: NoteLabel): string {
    if (!this.selectedNote || this.answerState === 'unanswered') return '';
    if (note === this.selectedNote) return this.answerState;
    if (this.answerState === 'incorrect' && this.question && note === this.question.answer) return 'correct';
    return '';
  }

  get accuracyPct(): number {
    if (!this.sessionTotal) return 0;
    return Math.round(this.sessionCorrect / this.sessionTotal * 100);
  }

  get questionsLeft(): number {
    if (this.isReplayMode) {
      return this.mistakeQueue.length + (this.question ? 1 : 0);
    }
    return Math.max(this.pool.length - this.poolIndex + (this.question ? 1 : 0), 0);
  }

  get goalDescription(): string {
    switch (this.setupGoal) {
      case 'accuracy':
        return 'Longer, cleaner reps inside your current level.';
      case 'review':
        return this.dueCount > 0 ? 'Overdue review cards first.' : 'No due cards yet — fallback to a guided warm-up.';
      case 'weak-spots':
        return 'The pairs you miss most often.';
      default:
        return 'Quick reps tuned to your current stage.';
    }
  }

  private getPracticeKeysForStage(stageId: Stage): NoteLabel[] {
    switch (stageId) {
      case 1:
      case 2:
        return ['C', 'G', 'D'];
      case 3:
        return ['C', 'G', 'D', 'A'];
      case 4:
        return ['C', 'G', 'D', 'A', 'E', 'F', 'Bb'];
      default:
        return this.learningPath.getCurrentStage().keys;
    }
  }

  private getPracticeIntervalsForStage(stageId: Stage): string[] {
    if (stageId <= 2) {
      return ['Major 2nd', 'Major 3rd', 'Perfect 5th'];
    }

    if (stageId <= 4) {
      return ['Major 2nd', 'Major 3rd', 'Perfect 4th', 'Perfect 5th'];
    }

    if (stageId === 5) {
      return [...this.learningPath.getStage(5).intervals];
    }

    if (stageId === 6) {
      return [
        ...this.learningPath.getStage(5).intervals,
        'Minor 3rd',
        'Minor 7th',
      ];
    }

    return this.theory.ALL_INTERVALS;
  }

  private isDiatonic(interval: string): boolean {
    return this.theory.DIATONIC_INTERVALS.some(entry => entry.name === interval);
  }
}
