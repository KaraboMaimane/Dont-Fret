import { MusicTheoryService } from './music-theory.service';

describe('MusicTheoryService', () => {
  let service: MusicTheoryService;

  beforeEach(() => {
    localStorage.removeItem('dont-fret-prefs');
    service = new MusicTheoryService();
  });

  it('generates F# major with E# spelling', () => {
    expect(service.generateMajorScale('F#')).toEqual([
      'F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'
    ]);
  });

  it('returns a harmonic answer using flat spelling for flat keys', () => {
    expect(service.getIntervalAnswer('Bb', 'Minor 3rd')).toBe('Db');
  });

  it('treats enharmonic notes as equal', () => {
    expect(service.areEnharmonicEquals('C#', 'Db')).toBe(true);
    expect(service.areEnharmonicEquals('C', 'C#')).toBe(false);
  });

  it('returns null key-signature list question for C major', () => {
    expect(service.generateKeySigListQuestion('C')).toBeNull();
  });

  it('builds key-signature list question for sharp keys', () => {
    const question = service.generateKeySigListQuestion('E');
    expect(question).toBeTruthy();
    expect(question?.accidentals).toEqual(['F#', 'C#', 'G#', 'D#']);
    expect(question?.answer).toBe('F#');
  });
});
