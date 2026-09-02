# Kindred

A private mobile app that remembers birthdays. You add a name and a date; it
tells you before the day arrives. That is the whole product.

It is deliberately small. It used to track people with relationships and photos,
notes and gift ideas, special days, personal events, weekly routines and shared
holidays — all of that was removed, because the app was doing eleven things
adequately and the one thing badly.

Built with Expo (SDK 54) and React Native, backed by Supabase. iOS, Android, and
a static web export.

## Getting started

```bash
npm install
npm start          # then press i / a, or scan the QR code
```

Create a `.env` in the project root (it is gitignored):

```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

The database schema is checked in as raw SQL under `supabase/` and applied by
hand in the Supabase SQL editor. A fresh project needs
`simple_birthdays.sql`, `feedback.sql` and `delete_user.sql`.

## Commands

```bash
npm start            # expo start
npm run ios          # / android / web
npm test             # jest
npm run test:watch
npm run lint         # expo lint
npx tsc --noEmit     # typecheck
```

Three gates, all of which must pass before any change is finished:

```bash
npx tsc --noEmit
npx jest
npx eslint src --ext .ts,.tsx
```

## Releasing

Builds go through EAS: `npm run build:preview` (internal APK),
`npm run build:production` (app bundle), `npm run submit:production` — which
uploads to the Play `internal` track.

**The version lives in `app.json`.** `eas.json` sets
`appVersionSource: "local"`, so `expo.version` is the version that ships and
`expo.android.versionCode` is the build number; `autoIncrement` bumps the latter
on production builds. Nothing is stored server-side, so what you read in the
file is what users get.

EAS needs these secrets (`eas secret:create`); the two public ones are also what
`.env` provides locally:

| Secret | What breaks without it |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Nothing signs in |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Nothing signs in |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry never starts — crashes go unreported |
| `SENTRY_AUTH_TOKEN` | Source maps do not upload, so crash reports are minified and unreadable |

The icon set is generated rather than drawn by hand:

```bash
node scripts/generate-icons.js   # rewrites every PNG in assets/images
```

The privacy policy and the account deletion page are served by GitHub Pages from
`docs/` on the **`main`** branch, and Google Play points at both. Editing them on
a feature branch changes nothing that anyone can see — **merge to `main` before
submitting a release**, or the store will be pointing at the previous version of
the text.

## How it is laid out

The app is split so that the interface can be replaced without disturbing the
logic underneath — date arithmetic, notification scheduling and the offline
cache all live outside the screens.

```
src/app/**         screens and navigation (expo-router, typed routes)
src/components/**  UI components
src/theme/**       palette, type scale, ThemeContext (light + dark)

src/context/**     AuthContext, UndoContext, BirthdaysContext
src/lib/**         Supabase client, i18n, Sentry, feedback
src/utils/**       dates, importance, notifications, cache, errors, auth helpers
src/locales/**     en.json + tr.json
supabase/**        SQL (supabase/legacy/ is history; nothing reads it)
```

Screens never call Supabase and never format a date by hand. If a screen needs
something the logic layer does not provide, the logic layer grows — it does not
get reached around.

A birthday's reminder is set by an importance slider rather than by picking lead
times: low means the morning of, medium adds three days' warning, high adds a
week. There is no importance column in the database — the level is stored as the
reminder presets it means, which is documented in `CONTRACT.md`.

## Read these before changing anything

- **`CONTRACT.md`** — what may be rewritten, what must be left alone, the
  Context APIs, and the components that have to stay mounted. The most important
  file in the repo.
- **`FEATURES.md`** — what the app does and how it should feel. The product
  brief.
- **`CLAUDE.md`** — the same ground, condensed for AI assistants.

## Testing

Jest with the `jest-expo` preset. The tests are logic-level only and live in
`src/utils/__tests__/`: date arithmetic, importance round-tripping, notification
planning and scheduling, password rules, and the auth error and link helpers.
Screens are not covered — `CONTRACT.md` lists the behaviours to preserve by hand.

## Licence

See `LICENSE`.
