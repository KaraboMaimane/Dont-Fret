import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  const STORAGE_KEY = 'dont-fret-progress';

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem(STORAGE_KEY);
  });

  it('records a wrong answer and stores a mistake entry', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const service = new ProgressService();

    service.recordAnswer('C', 'Major 3rd', false, 1200, 'Practice');

    expect(service.getTotalQuestions()).toBe(1);
    expect(service.getCorrectAnswers()).toBe(0);

    const mistakes = service.getRecentMistakes(1);
    expect(mistakes).toHaveLength(1);
    expect(mistakes[0]).toMatchObject({
      key: 'C',
      intervalName: 'Major 3rd',
      mode: 'Practice',
    });
  });

  it('schedules review after one correct answer using the 3-day interval', () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const service = new ProgressService();

    service.recordAnswer('C', 'Perfect 5th', true, 900);

    const cell = service.getCellRecord('C', 'Perfect 5th');
    expect(cell).toBeTruthy();
    expect(cell?.nextReviewAt).toBe(now + 3 * 86_400_000);
  });

  it('upgrades review schedule to 7 days once accuracy is strong with enough attempts', () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const service = new ProgressService();

    for (let i = 0; i < 5; i++) {
      service.recordAnswer('G', 'Major 2nd', true, 500);
    }

    const cell = service.getCellRecord('G', 'Major 2nd');
    expect(cell?.total).toBe(5);
    expect(cell?.correct).toBe(5);
    expect(cell?.nextReviewAt).toBe(now + 7 * 86_400_000);
  });

  it('returns weakest cells sorted by ascending accuracy (minimum 3 attempts)', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const service = new ProgressService();

    // C/M3 => 1/3 = 0.33
    service.recordAnswer('C', 'Major 3rd', true, 700);
    service.recordAnswer('C', 'Major 3rd', false, 700);
    service.recordAnswer('C', 'Major 3rd', false, 700);

    // D/P5 => 2/3 = 0.67
    service.recordAnswer('D', 'Perfect 5th', true, 700);
    service.recordAnswer('D', 'Perfect 5th', true, 700);
    service.recordAnswer('D', 'Perfect 5th', false, 700);

    const weakest = service.getWeakestCells(2);
    expect(weakest).toHaveLength(2);
    expect(weakest[0]).toMatchObject({ key: 'C', intervalName: 'Major 3rd' });
    expect(weakest[1]).toMatchObject({ key: 'D', intervalName: 'Perfect 5th' });
  });

  it('returns only due review cells', () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const service = new ProgressService();

    service.recordAnswer('A', 'Major 6th', true, 800);
    service.recordAnswer('E', 'Minor 7th', true, 800);

    const dueCell = service.getCellRecord('A', 'Major 6th');
    const futureCell = service.getCellRecord('E', 'Minor 7th');

    if (dueCell) dueCell.nextReviewAt = now - 1;
    if (futureCell) futureCell.nextReviewAt = now + 86_400_000;

    const due = service.getDueCells(10);
    expect(due.some(cell => cell.key === 'A' && cell.intervalName === 'Major 6th')).toBe(true);
    expect(due.some(cell => cell.key === 'E' && cell.intervalName === 'Minor 7th')).toBe(false);
  });
});
