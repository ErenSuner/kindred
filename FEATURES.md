# Kindred — complete feature inventory

A brief for the interface.

This document describes **what the app does** and **what information needs a
home**. It deliberately does not defend the current layout. Hierarchy, screen
boundaries and navigation are all open — the current arrangement is one
solution, not a requirement.

---

## 1. What the app is

**Kindred remembers birthdays, so you don't have to.**

That is the whole product. Not a CRM, not a calendar, not a contacts app, not a
productivity tool. There is no inbox, no streak, no completion rate, no notes,
no photographs. The emotional register is closer to a friend nudging you than to
a dashboard.

It used to be much bigger — people with relationships and photos, notes and gift
ideas, personal events, weekly routines, shared holidays. All of it was removed.
The app was doing eleven things adequately and the one thing badly. Now it does
one thing.

**How it is actually used:** rarely, and always because a notification arrived.
The user is told a birthday is coming, they act on it in the world, and they
close the app. The other kind of session is adding a birthday they just learned
about, which takes fifteen seconds. Nothing else should take longer.

**Who it is for:** individuals. Everything is private to one account. No
sharing, no collaboration, no social layer.

---

## 2. The thing the app knows about

One object.

**Birthday** — a name, a date, and how much it matters.

- **Name** — free text. Whatever the user calls this person.
- **Date** — day and month, required. Year optional; without it there is no age.
- **Importance** — one of three levels, chosen on a slider. It decides how much
  warning the reminder gives.

Nothing else. No photo, no emoji, no relationship, no phone number, no notes.
Anything the user wants to remember beyond the date belongs in a different app.

---

## 3. Every capability

**Adding** — name, date, importance. One screen, three fields, one button.

**Editing** — the same screen with the values filled in, plus delete.

**Deleting** — immediate, with five seconds of undo. Never a confirmation
dialog; the undo is the confirmation.

**Browsing** — a single chronological list, soonest first. The next birthday is
given more room than the rest, because it is the one thing the user came to see.

**Age** — when a year was given, the list and the notification both say what age
this one turns. When it was skipped, neither mentions age at all.

**Reminding** — the job the app exists to do. The day itself always fires,
whatever else is set. Importance adds one earlier warning:

| Importance | Reminder |
|---|---|
| Low | On the morning of the day |
| Medium | Three days before, and on the day |
| High | A week before, and on the day |

Reminders arrive at 09:00 local time. There is a master switch in settings to
turn them off entirely, and a warning if the operating system has denied
permission.

**Account** — email and password sign-in, email confirmation, password reset,
email change, password change, account deletion. Name and surname on the
profile. Language (English, Turkish) and theme (light, dark, system).

**Support** — a short FAQ and a feedback form.

---

## 4. Screens

| Screen | What it is |
|---|---|
| Welcome | Signed-out landing; leads to sign in or register |
| Log in / Register | Email and password |
| Home | The list of birthdays. The only main screen. |
| Add / Edit birthday | Name, date, importance |
| Settings | Reminders, theme, language, account, support |

Settings has a small stack behind it: profile, security, feedback, help. The
grouping is negotiable; the list is not much longer than this.

---

## 5. States the design must handle

- **Empty** — no birthdays yet. This is the first thing most users see, and it
  is the app's only chance to explain itself.
- **Offline** — the list is served from the cache. It must be visibly the
  saved copy, not silently stale.
- **Write failed** — saving a birthday does not queue. It surfaces an error, and
  what the user typed stays on screen.
- **Load failed** — an error with a retry. Never dressed up as an empty state.
- **Undo** — five seconds after a delete.
- **Permission denied** — notifications are switched off at the OS level. The
  app's whole promise is broken; say so clearly.
- **In progress** — saving, loading, signing in.

---

## 6. Technical constraints

- React Native via Expo SDK 54. iOS and Android are the real targets; web is a
  static export that should not crash.
- Shadows behave differently on the two platforms — use `cardShadow` /
  `floatShadow` from the theme rather than raw shadow props.
- Fonts come from Google Fonts (Fraunces for display, Figtree for UI) and are
  replaceable.
- Icons are Material Icons via `@expo/vector-icons`.
- `react-native-reanimated` and `react-native-gesture-handler` are available and
  used by the importance slider.
- Design for 375pt wide. Respect OS text scaling.
- Light and dark both ship.

---

## 7. Hard-won details worth keeping

Behaviours that were fixed after they went wrong. A rewrite should not
reintroduce them.

- Rows that move between positions should travel, not teleport
- A date picker must not be able to offer the 31st of February — capping the day
  list to the chosen month is cheaper than validating afterwards
- A secondary action must not be visually louder than the primary one — a filled
  "add" button once outshouted "Done"
- "Turning 36" belongs only where a year was given, and the message is rewritten
  each year rather than baked in once
- A long unbroken name must not push out of its card — let the text container
  shrink
- An empty state after a failed load must not read as an empty state
- A repeating yearly notification cannot carry an age, because the operating
  system will read the same text out every year. Only dated reminders may.
- Reminders must not be scheduled before permission has actually been granted,
  and the schedule must be retried once it is — the permission prompt and the
  first data load run on different timelines, and whichever loses the race, the
  user must not end up with nothing booked
- A run that failed to book its reminders must not be remembered as a run that
  succeeded, or the retry never happens
- A lead time worked out in a leap year lands on a different day than the same
  lead time in a common year. A repeating yearly slot cannot hold both, so it is
  always worked out in a common year — the answer must not depend on when the
  app was last opened
- An animation belongs to a style property, never inside an expression:
  `width: base + withSpring(x)` turns the animation into a string and the
  element freezes at its last good value

---

## 8. How it should feel

One sentence governs everything below:

> **The user should never feel that they are the one doing the remembering.**

Most reminder apps run on anxiety — red badges, overdue counts, unread dots,
streaks. They make you feel behind so that you come back. Kindred is the
opposite. The user hands over the worry and gets on with their life.

### Trust, not vigilance

- No badges, no unread counts, no "3 overdue". Nothing that says you are behind.
- Nothing is ever *missed*. A date that has passed is simply past.
- A countdown is anticipation, not a deadline. Three days away is a nice thing
  approaching, not a clock running out.
- **When something is saved, show that the app has taken the job on.** The
  reassurance is the product.
- Let the mechanism be quietly visible — that reminders are armed, and when they
  will arrive. This is what the importance slider is really for: it is not a
  setting, it is the user watching the promise being made.
- **One exception, and it should be loud:** if notification permission is
  denied, the promise cannot be kept. That is the only alarm this app earns.

### Obvious, not explained

- Very little text. Labels, not paragraphs.
- Every action visible. Nothing important hidden behind a long-press.
- One clear primary action per screen.
- **If a screen needs a paragraph to explain itself, the screen is wrong.** The
  fix is a better arrangement, not shorter prose.
- A first-time user should be able to work out what to do without reading.

### Fluid, with small delights

- Things move rather than appear and disappear.
- Navigation should feel continuous, not like slides being swapped.
- Motion should *mean* something. Good places: a countdown reaching today, a new
  birthday sliding into the list, the importance slider settling onto a stop.
- Bad places: form fields, settings rows, error messages. Movement there reads
  as sluggishness.
- Playful, not cartoonish. One well-timed spring beats five bouncy ones. The
  target is "quietly charming", not "fun app for kids".

### Light and dark, both first-class

Both themes ship together. Neither is an afterthought or an inversion done
badly. The palette must hold up either way.

---

## 9. What the design is free to change

Everything visual and structural: which information lives on which screen, how
the date is entered, navigation patterns, the entire palette, type scale,
spacing rhythm and shape language.

What must not change is the size of the app. Every capability in section 3 needs
somewhere to live and every state in section 5 needs a design — and nothing
outside section 3 gets built. A feature that is merely useful is still a
feature this app does not want.
