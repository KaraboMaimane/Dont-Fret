import { AdaptiveService } from './adaptive.service';

describe('AdaptiveService', () => {
  it('weights overdue cells above non-overdue cells in the question pool', () => {
    const theory = {
      DIATONIC_INTERVALS: [{ name: 'Major 2nd' }, { name: 'Minor 3rd' }],
      getIntervalAnswer: (key: string, interval: string) => `${key}-${interval}`,
    } as any;

    const progress = {
      getAccuracy: (_key: string, intervalName: string) => intervalName === 'Major 2nd' ? 0.9 : 0.9,
      isOverdue: (_key: string, intervalName: string) => intervalName === 'Major 2nd',
    } as any;

    const learningPath = {
      getCurrentStage: () => ({ keys: ['C'], intervals: ['Major 2nd', 'Minor 3rd'] }),
      getStage: () => ({ keys: ['C'], intervals: ['Major 2nd', 'Minor 3rd'] }),
    } as any;

    const service = new AdaptiveService(theory, progress, learningPath);
    const pool = service.buildQuestionPool(undefined, 20);

    const major2ndCount = pool.filter(q => q.intervalName === 'Major 2nd').length;
    const minor3rdCount = pool.filter(q => q.intervalName === 'Minor 3rd').length;

    expect(major2ndCount).toBeGreaterThan(minor3rdCount);
  });

  it('marks due harmonic intervals correctly and applies weak-cell weighting', () => {
    const theory = {
      DIATONIC_INTERVALS: [{ name: 'Major 2nd' }],
      getIntervalAnswer: (key: string, interval: string) => `${key}-${interval}`,
    } as any;

    const progress = {
      getDueCells: () => [{ key: 'Bb', intervalName: 'Minor 3rd', accuracy: 0.4 }],
    } as any;

    const learningPath = {} as any;

    const service = new AdaptiveService(theory, progress, learningPath);
    const pool = service.buildDueReviewPool(10);

    expect(pool.length).toBe(3);
    expect(pool.every(q => q.intervalType === 'harmonic')).toBe(true);
    expect(pool.every(q => q.intervalName === 'Minor 3rd')).toBe(true);
  });
});
