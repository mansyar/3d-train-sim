import { describe, expect, it } from 'vitest';
import { DAY_PHASES, nextPhase } from '../core/day-clock';
import { DAY_ICONS, nextDayIcon } from './toy-icons';

describe('the sun/moon rail button', () => {
  it('previews the phase a tap brings: the moon for night, the sun for day', () => {
    // From dawn a tap brings morning, noon -> dusk, dusk -> night, night -> dawn.
    expect(DAY_PHASES.map(nextDayIcon)).toEqual(['☀️', '☀️', '🌙', '🌙', '☀️']);
  });

  it('never shows a sun for a nightfall destination, or a moon at midday', () => {
    // The trap this pins: dusk reads as day in the source table but as night
    // in the lookup, so the two halves of the rule are checked separately.
    // `nextDayIcon` already advances, so these name the phase you tap *from*.
    expect(nextDayIcon('dusk')).toBe('🌙'); // dusk -> night
    expect(nextDayIcon('noon')).toBe('🌙'); // noon -> dusk, nightfall
    expect(nextDayIcon('morning')).toBe('☀️'); // morning -> noon
  });

  it('agrees with the phase table it is keyed by', () => {
    // One icon per phase, and a tap always moves the day on.
    expect(Object.keys(DAY_ICONS).sort()).toEqual([...DAY_PHASES].sort());
    expect(new Set(Object.values(DAY_ICONS))).toEqual(new Set(['☀️', '🌙']));
    expect(DAY_PHASES.map((phase) => DAY_ICONS[nextPhase(phase)])).toContain('☀️');
  });
});
