# The boundary between logic and interface

Read this before changing any code. `FEATURES.md` says what to design; this says
what the design is allowed to touch and what it must keep calling.

Kindred does one thing: it remembers birthdays and tells you before they arrive.
The app was cut down to that one thing on purpose, and the interface sits on top
of a small logic layer — date arithmetic, notification scheduling, the offline
cache — that lives outside the screens. That separation is what makes a redesign
safe. Keeping the app small is what makes it worth having.

---

## Files you may rewrite freely

```
src/app/**          every screen and the navigation layout
src/components/**   every component
src/theme/**        tokens, type scale
```

New files anywhere are fine.

## Files to leave alone

```
src/lib/supabase.ts       the client and the session store
src/context/**            read from these; do not restructure them
src/utils/**              dates, recurrence, nudges, importance,
                          notifications, notificationPermission,
                          cache, loadError, auth*
src/data/mock.ts          the shared types
supabase/simple_birthdays.sql   the one table this app has
**/__tests__/**           the logic tests
```

If a screen needs something these do not provide, **add to them rather than
reaching around them**. Calling Supabase from a screen, or recomputing a date in
a component, is how the two halves start drifting apart.

`supabase/legacy/` holds migrations for tables the app no longer reads. They are
kept because they have already run against the live database. Nothing should
import from there.

---

## What the screens must keep doing

These are the parts most likely to be dropped by accident, because nothing
breaks loudly when they are. No test covers them — the suite is logic-level.

### Every screen that writes

Writes fail. When they do, the user must be told, and told which kind of failure
it was:

```ts
import { describeWriteError } from '@/utils/loadError';

try {
  await saveSomething();
} catch (e) {
  setError(describeWriteError(e));   // knows offline from rejected
}
```

Never swallow a write failure into `console.error` alone. Never clear the user's
typing on failure.

### Every screen that reads a list

`loadError` from the relevant context must be shown, with a retry. An empty list
after a failed load must not be presented as an empty state — it means "could
not fetch", not "you have nothing".

### Mounted once, near the root

Three pieces of global furniture. If the navigation shell forgets them, real
features go silent:

| Component | What dies without it |
|---|---|
| `<NotificationSync />` | All reminders. Nothing is ever scheduled. |
| `<UndoSnackbar />` | Undo. Deletions become instant and final. |
| `<AppErrorBoundary>` | A render error becomes a blank white screen. |

They can be restyled or repositioned. They cannot be removed.

---

## Context APIs

What the screens are given. Design freely, but these are the taps the water
comes out of.

### `useBirthdays()`

```
birthdays     SimpleBirthday[]   sorted by daysAway, soonest first
loading, loadError

getBirthday(id)
addBirthday({ name, date, importance })
updateBirthday(id, { name?, date?, importance? })
deleteBirthday(id)
deleteBirthdayWithUndo(birthday)
refreshBirthdays()
```

`date` is `YYYY-MM-DD`. A year of `1000` (`SKIPPED_YEAR`) means the user did not
give one, and no age is shown or spoken.

Reads fall back to the AsyncStorage cache and set `loadError`; the last good
list stays on screen. Writes do not queue — they throw, and the screen shows the
error.

`loading` starts **true** and only goes false once the first load has settled,
signed out included. "Nothing yet" and "nothing at all" have to be
distinguishable: an empty list is the instruction to cancel every scheduled
reminder, so a single frame of `loading === false` with no birthdays in it would
wipe the schedule on every cold start. Screens must gate their empty state on it
for the same reason.

### `useAuth()`

```
user, session, loading
signOut()
```

Email and password only. No OAuth, no magic link.

### `useUndo()`

```
pending    { message } | null
stage(action)
undo()
```

Used by the snackbar. Screens normally reach for `deleteBirthdayWithUndo`
instead of staging directly.

---

## Helpers worth using rather than reinventing

```
@/utils/dates         getNextOccurrence, getUpcomingOccurrences,
                      formatOccurrenceDate, toISODate, SKIPPED_YEAR
@/utils/importance    Importance, IMPORTANCE_ORDER, DEFAULT_IMPORTANCE,
                      nudgesForImportance, importanceFromNudges, leadDaysFor
@/utils/countdownLabel  daysChipLabel, daysLongLabel
@/utils/nudges        parseNudges, serializeNudges, PRESET_OFFSET_DAYS, DAY_OF
@/utils/notifications syncBirthdayNotifications, planBirthdayNotifications
@/utils/notificationPermission   useNotificationPermission()
@/utils/loadError     describeLoadError, describeWriteError
```

Every date shown in the app is formatted by `dates.ts`. Formatting one by hand
in a component is how two screens start disagreeing about what day it is.

### How importance is stored

There is no separate column. Importance is written into the existing
`nudges text[]` column as the reminder preset it means:

| Importance | `nudges` | Fires |
|---|---|---|
| `low` | `['day_of']` | on the day |
| `medium` | `['day_of', '3_days']` | three days before, and on the day |
| `high` | `['day_of', '1_week']` | a week before, and on the day |

`day_of` is added on read whatever the row says — a birthday that arrives with
no warning at all defeats the point of the app. Rows written by older versions
with other presets read back as the nearest importance, never as an error.

---

## Theming

`useTheme()` returns `{ c, mode, pref, setPref, cardShadow, floatShadow }`. `c`
is the active semantic `Palette` from `src/theme/tokens.ts` — `light` and `dark`
are both first-class and swap at runtime. Never hardcode a hex value in a
component.

Fonts are loaded in `src/app/_layout.tsx` from `@expo-google-fonts` (Fraunces
for display, Figtree for UI). Changing the typeface means changing the import
there as well as `src/theme/type.ts`.

---

## Before you finish

```bash
npx tsc --noEmit                # must be clean
npx jest                        # all must pass
npx eslint src --ext .ts,.tsx   # zero errors
```

If a test fails, the change reached past the boundary. That is the signal this
document exists to give.

---

## Adding something back

The app was much bigger once — people, notes, photos, events, routines, shared
holidays. It was cut down because the point of it got lost. Before adding
anything, the question is not "would this be useful" but "does someone open this
app to do it". Almost always the answer is no, and the feature belongs somewhere
else.
