# CLAUDE.md

Guidance for AI assistants working in this repository.

## ⚠️ Expo has changed

This project is on **Expo SDK 54 / React Native 0.81 / React 19**. APIs have
moved between versions. Before writing any Expo/React Native code, read the
exact versioned docs at <https://docs.expo.dev/versions/v54.0.0/>. Do not rely
on memory of older Expo APIs.

## Read these first

Two design documents govern how this codebase is meant to be changed. Read them
before touching anything — they are not optional background.

- **`CONTRACT.md`** — the boundary between logic and interface. Which files you
  may rewrite freely, which to leave alone, the exact Context APIs and util
  helpers you must call rather than reinvent, and the global components that
  must stay mounted. **This is the most important file in the repo.**
- **`FEATURES.md`** — what the app does and what information needs a home. The
  product brief; the "why" behind the data model.

## What this app is

**Kindred** — a private mobile app that remembers birthdays. Add a name and a
date, get told before the day arrives. That is the whole product.

It used to be much bigger — people with relationships and photos, notes and gift
ideas, special days, personal events, weekly routines, shared holidays, contacts
import, search. All of that was deliberately removed. If a change would add a
capability back, that is a product decision, not a refactor: raise it first.

## Stack

- **Expo SDK 54**, React Native 0.81, React 19, TypeScript (strict).
- **expo-router** — file-based routing, typed routes enabled, React Compiler on
  (see `app.json` `experiments`).
- **Supabase** (`@supabase/supabase-js`) — auth + Postgres backend. Session
  persisted via AsyncStorage. One table: `simple_birthdays`.
- **i18next / react-i18next** — English + Turkish (`src/locales/{en,tr}.json`).
- **react-native-reanimated** + **gesture-handler** for animation and the
  importance slider.
- Fonts: Fraunces (display) + Figtree (UI), via `@expo-google-fonts`.
- Targets iOS, Android, and web (static export, deployed on Vercel).

## Commands

```bash
npm start            # expo start
npm run ios          # / android / web
npm test             # jest (jest-expo preset)
npm run test:watch
npm run lint         # expo lint (eslint-config-expo, flat config)
npx tsc --noEmit     # typecheck — must be clean
```

Before finishing any change, all three must pass (per CONTRACT.md):

```bash
npx tsc --noEmit
npx jest                          # logic tests, all must pass
npx eslint src --ext .ts,.tsx     # zero errors
```

## Architecture — the logic/interface split

The app is deliberately structured so the **interface can be replaced without
disturbing the logic underneath**. Respecting this line is the whole point.

```
src/app/**        Screens + navigation (expo-router). REWRITE FREELY.
src/components/**  UI components. REWRITE FREELY.
src/theme/**       tokens, type scale, ThemeContext. REWRITE FREELY.

src/context/**    React providers exposing the Context APIs. READ, DON'T RESTRUCTURE.
src/lib/supabase.ts  the client. LEAVE ALONE.
src/utils/**       dates, recurrence, nudges, importance, notifications,
                   notificationPermission, cache, loadError, auth*. LEAVE ALONE.
src/data/mock.ts   the SimpleBirthday type. LEAVE ALONE.
supabase/**        SQL. LEAVE ALONE. (`supabase/legacy/` is history — nothing reads it.)
**/__tests__/**    Logic tests. LEAVE ALONE.
```

**Rule:** if a screen needs something the logic layer doesn't provide, *add to
the logic layer* rather than reaching around it. Never call Supabase from a
screen. Never compute or format a date by hand in a component — use
`@/utils/dates`. If a test fails, the change reached past the boundary.

### Data flow

`BirthdaysContext` talks to Supabase directly (one table, a handful of queries)
and exposes `useBirthdays()`; screens read from that hook. The Context APIs are
documented exhaustively in CONTRACT.md: `useBirthdays()`, `useAuth()`,
`useUndo()`.

### Provider tree

Set in `src/app/_layout.tsx`, outermost first:
`AppErrorBoundary → ThemeProvider → AuthProvider → UndoProvider →
BirthdaysProvider → ThemedApp`.

### Global furniture — must stay mounted near root

Removing any of these silently breaks a feature (they can be restyled/moved, not
removed):

| Component | Breaks if removed |
|---|---|
| `<NotificationSync />` | All scheduled reminders |
| `<UndoSnackbar />` | Undo — deletions become final |
| `<AppErrorBoundary>` | Render errors become a blank white screen |

## Conventions

- **Path alias:** `@/*` → `src/*`, `@/assets/*` → `assets/*`.
- **Domain type** lives in `src/data/mock.ts` (`SimpleBirthday`).
- **Every date** the user sees is formatted by `src/utils/dates.ts`. Formatting
  by hand in a component causes screens to disagree about "today".
- **Importance is stored as reminder presets**, not as a column. Go through
  `@/utils/importance` (`nudgesForImportance`, `importanceFromNudges`) — never
  write the `nudges` array by hand. See CONTRACT.md for the mapping.
- **Write errors must be surfaced**, never swallowed into `console.error`. Use
  `describeWriteError(e)` from `@/utils/loadError` and never clear the user's
  input on failure. Read failures must show `loadError` + retry — an empty list
  after a failed load is "could not fetch", not "you have nothing".
- **Nothing queues offline.** Reads fall back to the AsyncStorage cache; writes
  throw and the screen says so.
- **i18n:** all user-facing strings go through `t('key')` with entries in both
  `en.json` and `tr.json`. Helper scripts: `scripts/{add-i18n,find-untranslated,
  translate-manual}.ts`.
- **Theming:** `useTheme()` gives `{ c, mode, pref, setPref, cardShadow,
  floatShadow }`. `c` is the active semantic `Palette` (see `src/theme/tokens.ts`
  — light + dark both first-class, swapped at runtime). Never hardcode hex in a
  component; use palette tokens.

## Testing

Jest with the `jest-expo` preset; setup in `jest.setup.js`. Tests are
**logic-level only** — they live in `src/utils/__tests__/` and cover dates,
importance, notifications, password and the auth error/link helpers. Screens and
write/read-error handling are **not** covered by tests (CONTRACT.md lists what to
preserve by hand).

## Environment

`.env` (gitignored) provides `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY`. Supabase schema changes are checked in as raw
SQL under `supabase/` and applied manually.

## Auth & routing

`RootLayoutNav` in `_layout.tsx` gates navigation on `useAuth()`: signed-out
users are pushed to `/` (welcome) and the `(auth)` group; signed-in users land
on `/home`. There is no tab bar — `/home` is the only main screen, with settings
behind a gear in its header and a `+` FAB for adding a birthday.
