# The boundary between logic and interface

Read this before changing any code. `FEATURES.md` says what to design; this says
what the design is allowed to touch and what it must keep calling.

The app was deliberately restructured so the interface could be replaced without
disturbing what is underneath. Data fetching, offline queueing, notification
scheduling and date arithmetic all live outside the screens. That separation is
what makes a full redesign safe — but only if it is respected.

---

## Files you may rewrite freely

```
src/app/**          every screen and the navigation layout
src/components/**   every component
src/theme/**        tokens, type scale — expected to change completely
```

New files anywhere are fine. A theme provider for light/dark does not exist yet
and will need to be added — that is expected.

## Files to leave alone

```
src/lib/**          Supabase client and every database call
src/context/**      read from these; do not restructure them
src/utils/**        dates, recurrence, routines, nudges, notifications,
                    outbox, timeline, search, holidays, history, notes
src/data/mock.ts    the shared types
supabase/**         SQL migrations
**/__tests__/**     173 tests covering the logic above
```

If a screen needs something these do not provide, **add to them rather than
reaching around them**. Calling Supabase from a screen, or recomputing a date in
a component, is how the two halves start drifting apart.

`src/utils/timeline.ts` is the one exception worth knowing about: it exists
purely to feed the home screen. If the home screen changes shape, that file is
allowed to change with it.

---

## What the screens must keep doing

These are the parts most likely to be dropped by accident, because nothing
breaks loudly when they are. No test covers them — all 173 are logic-level.

### Every screen that writes

Writes fail. When they do, the user must be told, and told which kind of failure
it was:

```ts
import { describeWriteError } from '@/utils/loadError';

try {
  await savesomething();
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

Three pieces of global furniture. If the new navigation shell forgets them, real
features go silent:

| Component | What dies without it |
|---|---|
| `<NotificationSync />` | All reminders. Nothing is ever scheduled. |
| `<UndoSnackbar />` | Undo. Deletions become instant and final. |
| `<PendingWrites />` | Offline queue is invisible, and background write failures are never reported. |
| `<AppErrorBoundary>` | A render error becomes a blank white screen. |

They can be restyled or repositioned. They cannot be removed.

---

## Context APIs

What the screens are given. Design freely, but these are the taps the water
comes out of.

### `usePeople()`

```
people              Person[]   already sorted, pinned first
loading, loadError
pendingWrites       number     writes waiting for a connection
writeError          string|null  a failure nobody was watching
clearWriteError()
retryPendingWrites()

getPerson(id)
addPerson(data) -> id
importPeople(entries) -> count      batch, with undo
updatePerson(id, data)
removePerson(id)
removePersonWithUndo(person)
togglePin(id, isPinned)
refreshPeople()

addSpecialDay(personId, data)
updateSpecialDay(dayId, data)
deleteSpecialDay(dayId)
deleteSpecialDayWithUndo(dayId, title)
addBirthday(personId, data)
updateBirthday(birthdayId, data)
deleteBirthday(birthdayId)

addNoteToPerson(personId, kind, body, target?, photoUrl?)
updateNote(noteId, data)
setNoteDone(noteId, done)        gift ideas; optimistic
deleteNote(noteId)
deleteNoteWithUndo(noteId)
saveNotebook(personId, body, existingNoteId?)
saveMemory(personId, dayId, occurredOn, body, existingNoteId?)
syncNotes(personId, target, existing, next)
```

Note operations queue when offline and appear immediately. People, days and
events do not queue — they surface an error instead. This asymmetry is
deliberate; see `FEATURES.md` section 5.

### `useEvents()`

```
events        MyEvent[]   dated reminders, soonest first
routines      MyEvent[]   weekly routines, kept separate on purpose
pastEvents    MyEvent[]   already happened, newest first
loading, loadError

getEvent(id)
addEvent(data)
updateEvent(id, data)
deleteEvent(id)
deleteEventWithUndo(event)
refreshEvents()
```

An event with a non-empty `weekdays` array is a routine and has no meaningful
date of its own.

### `useHolidays()`

```
enabledIds, loading
isEnabled(id)
toggleHoliday(id, enabled)
upcoming     UpcomingHoliday[]   every enabled one
imminent     UpcomingHoliday[]   close enough to act on
```

### `useAuth()`

```
user, session, loading
signOut()
```

### `useUndo()`

```
pending    { message } | null
stage(action)
undo()
```

Used by the snackbar. Screens normally reach for the `...WithUndo` helpers on
`usePeople()` instead of staging directly.

---

## Helpers worth using rather than reinventing

```
@/utils/dates         getNextOccurrence, getUpcomingOccurrences,
                      getPastOccurrences, formatOccurrenceDate, toISODate
@/utils/recurrence    recurrenceLabel, recurrenceShortLabel, recurrenceIcon
@/utils/routines      weekdaysLabel, WEEKDAYS, nextRoutineDate
@/utils/eventTime     formatTimeOfDay, dayOfFirings, HEADS_UP_HOURS
@/utils/nudges        parseNudges, serializeNudges, PRESET_REMINDERS
@/utils/notes         GIFT_IDEA, MEMORY, NOTEBOOK, NOTE
@/utils/search        searchPeople, normalize (Turkish-aware)
@/utils/timeline      buildTimeline
@/utils/avatars       pickPhoto, uploadPhoto, pickAvatarImage, uploadAvatar
@/utils/contacts      loadContacts, openInContacts, readContactPhoto
```

Every date shown in the app is formatted by `dates.ts`. Formatting one by hand
in a component is how two screens start disagreeing about what day it is.

---

## Theming

`src/theme/tokens.ts` currently exports a flat object of ~45 Material 3 colours,
most of them unused. It is imported directly by every component.

Light and dark both ship, so this needs to become something a provider can swap
at runtime. Replacing the flat export with a hook is expected and welcome — but
it touches every component, so do it first, before designing screens on top of
the old shape.

Fonts are loaded in `src/app/_layout.tsx` from `@expo-google-fonts`. Changing
the typeface means changing the import there as well as `src/theme/type.ts`.

---

## Before you finish

```bash
npx tsc --noEmit      # must be clean
npx jest              # 173 tests, all must pass
npx eslint src --ext .ts,.tsx   # zero errors
```

If a test fails, the change reached past the boundary. That is the signal this
document exists to give.
