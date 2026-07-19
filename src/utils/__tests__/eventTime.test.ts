import {
  HEADS_UP_HOURS,
  dayOfFirings,
  formatTimeOfDay,
  parseTimeOfDay,
  serializeTimeOfDay,
} from '@/utils/eventTime';

describe('parseTimeOfDay', () => {
  it('reads what Postgres returns', () => {
    expect(parseTimeOfDay('18:00:00')).toEqual({ hour: 18, minute: 0 });
    expect(parseTimeOfDay('09:30')).toEqual({ hour: 9, minute: 30 });
  });

  it('is null for anything unusable', () => {
    expect(parseTimeOfDay(null)).toBeNull();
    expect(parseTimeOfDay('')).toBeNull();
    expect(parseTimeOfDay('evening')).toBeNull();
    expect(parseTimeOfDay('24:00')).toBeNull();
    expect(parseTimeOfDay('12:75')).toBeNull();
  });
});

describe('serializeTimeOfDay', () => {
  it('pads and adds the seconds Postgres wants', () => {
    expect(serializeTimeOfDay({ hour: 9, minute: 5 })).toBe('09:05:00');
  });

  it('round-trips', () => {
    const time = { hour: 18, minute: 45 };
    expect(parseTimeOfDay(serializeTimeOfDay(time))).toEqual(time);
  });

  it('is null for no time', () => {
    expect(serializeTimeOfDay(null)).toBeNull();
  });
});

describe('formatTimeOfDay', () => {
  it('writes it the way a timetable does', () => {
    expect(formatTimeOfDay({ hour: 8, minute: 5 })).toBe('08:05');
  });

  it('is empty when there is no time', () => {
    expect(formatTimeOfDay(null)).toBe('');
    expect(formatTimeOfDay(undefined)).toBe('');
  });
});

describe('dayOfFirings', () => {
  it('gives an untimed event only the morning glance', () => {
    expect(dayOfFirings(null, 9)).toEqual([
      { dayOffset: 0, hour: 9, minute: 0, kind: 'heads-up' },
    ]);
  });

  it('adds a warning two hours before a timed event', () => {
    // The 18:00 course: heard about at 09:00, chased at 16:00.
    expect(dayOfFirings({ hour: 18, minute: 0 }, 9)).toEqual([
      { dayOffset: 0, hour: 9, minute: 0, kind: 'heads-up' },
      { dayOffset: 0, hour: 16, minute: 0, kind: 'imminent' },
    ]);
  });

  it('keeps the minutes', () => {
    expect(dayOfFirings({ hour: 18, minute: 30 }, 9)[1]).toEqual({
      dayOffset: 0, hour: 16, minute: 30, kind: 'imminent',
    });
  });

  it('drops the warning onto the previous day when it would go past midnight', () => {
    // A 01:00 event is warned about at 23:00 the night before — and the morning
    // glance is dropped, because 09:00 on the day is eight hours too late.
    expect(dayOfFirings({ hour: 1, minute: 0 }, 9)).toEqual([
      { dayOffset: 1, hour: 23, minute: 0, kind: 'imminent' },
    ]);
  });

  it('drops the glance when the warning would beat it to the punch', () => {
    // A 10:00 event with a 09:00 reminder hour: the warning is at 08:00, an
    // hour before the glance. Sending both would arrive out of order.
    expect(dayOfFirings({ hour: 10, minute: 0 }, 9)).toEqual([
      { dayOffset: 0, hour: 8, minute: 0, kind: 'imminent' },
    ]);
  });

  it('drops the glance when the two would land within the hour', () => {
    expect(dayOfFirings({ hour: 11, minute: 30 }, 9)).toHaveLength(1);
  });

  it('keeps both once they are far enough apart', () => {
    expect(dayOfFirings({ hour: 13, minute: 0 }, 9)).toHaveLength(2);
  });

  it('respects a reminder hour set late in the day', () => {
    // Reminder hour 20:00, event at 21:00: warning at 19:00, before the glance.
    expect(dayOfFirings({ hour: 21, minute: 0 }, 20)).toEqual([
      { dayOffset: 0, hour: 19, minute: 0, kind: 'imminent' },
    ]);
  });

  it('warns HEADS_UP_HOURS ahead, whatever that is set to', () => {
    const [, imminent] = dayOfFirings({ hour: 20, minute: 0 }, 9);
    expect(imminent.hour).toBe(20 - HEADS_UP_HOURS);
  });
});
