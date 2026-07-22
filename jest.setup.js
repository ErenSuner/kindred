// Native modules aren't there under Jest. The tests only exercise pure logic,
// so these stand in far enough for the imports to resolve.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-notifications', () => ({
  // The full set, matching the library. A missing member here reads as
  // `undefined` at the call site, which is exactly the shape of trigger expo
  // delivers immediately — so a gap in this mock hides the bug it should catch.
  SchedulableTriggerInputTypes: {
    CALENDAR: 'calendar',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
    DATE: 'date',
    TIME_INTERVAL: 'timeInterval',
  },
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Date, weekday and label formatting is locale-aware now. Pin the device to
// English so the assertions (which use English formatting) stay stable.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
  // The clock format follows the device, not the language, so it needs its own
  // pin: a 12-hour phone, matching the English assertions.
  getCalendars: () => [{ timeZone: 'UTC', uses24hourClock: true, calendar: 'gregory', firstWeekday: 1 }],
}));
