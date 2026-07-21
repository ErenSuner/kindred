# Kindred — complete feature inventory

A brief for redesigning the interface from scratch.

This document describes **what the app does** and **what information needs a
home**. It deliberately does not defend the current layout. Tabs, hierarchy,
screen boundaries and navigation are all open — the current arrangement is one
solution, not a requirement.

---

## 1. What the app is

Kindred remembers the people you care about, so you don't have to.

It is **not** a productivity app, a CRM, or a calendar. There is no inbox, no
streak, no completion rate. The emotional register is closer to a private
notebook than to a dashboard.

**How it is actually used:** a few times a week, usually because a notification
said someone's birthday is coming up. Sessions are short. The user opens it,
sees what is near, maybe writes down a gift idea, and closes it. Occasionally
they sit with it longer — adding photos, reading back over what happened last
year.

**What the content is:** faces, dates, short notes, photographs. The people are
the interesting part. The interface should not compete with them.

**Who it is for:** individuals, not teams. Everything is private to one account.
There is no sharing, no collaboration, no social layer.

---

## 2. The things the app knows about

Six objects. Everything in the app is one of these.

**Person** — someone you care about. Has a name, a relationship (Family, Friend,
Partner, Colleague, Acquaintance), an optional photo, and a pinned flag. May be
linked to a phone contact.

**Special day** — a date attached to a person. Birthdays, anniversaries,
graduations, memorial days. Has a title, a date, a repeat cycle, and its own set
of reminders. A birthday is a special day with its title and cycle fixed.

**My event** — a date that belongs to the user, with no person attached. Dentist
appointments, passport renewals, rent. Has a title, date, repeat cycle, optional
time of day, and reminders.

**Routine** — something on the same weekdays every week. A course on Tuesdays and
Thursdays, a standing therapy appointment. Has a name, a set of weekdays, an
optional time, and reminders. No date, because it never ends.

**Note** — text attached to a person or to one of their days. Comes in four
flavours that behave differently:
- *Gift idea* — one short line, can be ticked off as bought
- *Memory* — a photograph, optionally tied to one past occurrence
- *Notebook* — one free-form document per person, edited in place
- *Day note* — plans and details for one specific occasion

**Shared occasion** — dates everyone has: Mother's Day, Valentine's Day, New
Year. Not tied to any person. The user chooses which ones they want to hear
about.

---

## 3. Every capability

### Remembering people

- Add a person by hand: name, relationship, photo
- Import people from the phone's address book — name, photo and birthday only.
  Multi-select, search, "select all with birthdays" shortcut, progress while it
  runs, and one undo for the whole import. **Phone numbers are never read**, and
  the interface says so.
- Edit a person's name, relationship and photo
- Delete a person, with a grace period to undo
- Pin someone so they stay near the top
- Open the linked address-book entry in the phone's own Contacts app (this is
  how calling and messaging happen — Kindred stores no way to reach anyone)
- Tap a photo to see it uncropped

### Dates

- Add a birthday to a person (day, month, year optional)
- Add any other special day: title, date, repeat cycle, reminders, notes
- Add a personal reminder with an optional time of day
- Add a weekly routine: pick weekdays, optional time
- Edit or delete any of the above
- Repeat cycles: one-time, or every N days / weeks / months, or yearly. Four
  quick choices plus a custom interval.
- The year is optional for anything that repeats. A date pinned to a real year
  cannot be set in the past, and if the user tries, it is moved forward and told
  so.

### Reminders

- Every date always notifies on the day itself — this is not switchable
- Up to four earlier reminders per date, chosen from presets (1 day, 3 days,
  1 week, 2 weeks, 1 month, 2 months) or a custom amount
- One global time of day for all reminders, set once in settings
- A dated thing with its own time gets two notifications: a morning heads-up
  and a warning two hours before
- Shared occasions notify a week and a day ahead
- The app shows a warning if notification permission was denied, because
  otherwise reminders silently never arrive

### Notes and memories

Per person:
- **Gift ideas** — a short line each. Tick one off when bought; it moves to a
  collapsed "bought" list and can be un-ticked.
- **Memories** — photographs. A grid, tap to view full size, delete.
- **Notebook** — one long free-form document. Sizes, allergies, what they love,
  what they said last time.

Per occasion:
- Notes attached to a specific day, previewed on that day's card

Looking back:
- Every past occurrence of a person's recurring days, listed newest first
- The user can write what actually happened on any of them
- Collapsed after four entries

### Finding things

- Search across people's names, relationships, day titles, dates and note text
- Accent- and case-insensitive, with Turkish character folding — typing "dogum"
  finds "Doğum", "cigdem" finds "Çiğdem"
- Word-start matches rank above mid-word ones; people rank above their days

### Browsing

- A chronological view of everything coming up, whoever it belongs to
- A birthday-only view, filterable by month
- The full list of people
- The user's own events and routines

### Settings

- Own profile: photo, name, surname, birth date, email
- Change password
- Turn all reminders on or off
- Choose which shared occasions to observe
- Choose what time of day reminders arrive
- Log out
- Delete account, behind a two-step confirmation

---

## 4. Screens that exist today

Listed so nothing is forgotten. **The grouping is negotiable** — if a better
structure merges, splits or reorders these, take it.

| Screen | Must be able to show / do |
|---|---|
| Welcome | App name, one-line pitch, sign up, log in |
| Log in / Register | Email, password, errors |
| Home | What is coming up, soonest first, across people + events + routines + shared occasions |
| People | Every person, search, pin, delete, add by hand, import from contacts |
| Person detail | Photo, name, relationship, next occasion, birthday, their other days, past occurrences, gift ideas, photos, notebook, open in Contacts, edit, delete |
| Events | The user's own dated reminders, their weekly routines, and ones that already happened |
| Settings | Profile, security, notification settings, shared occasions, account actions |
| Birthdays | Every birthday, filtered by month, split into upcoming and later |
| Add / edit person | Name, relationship, photo, duplicate-name warning |
| Add / edit special day | Title, date, repeat cycle, reminders, notes |
| Add / edit birthday | Date, reminders, notes |
| Add / edit personal reminder | Title, suggestions, date, repeat cycle, time, reminders |
| Add / edit routine | Name, suggestions, weekdays, time, reminders |
| Import contacts | Searchable contact list, selection, birthday badges, progress, privacy note |
| Shared occasions | List of holidays with on/off switches |
| Profile / Security | Form fields, save |

---

## 5. States the design must handle

These are easy to forget and expensive to add later.

**Empty** — no people at all; people but no dates; no gift ideas; no photos; no
past to look back on; a search with no results; a month with no birthdays. Each
needs its own words, not one generic shrug.

**Offline** — reads come from a local cache, so the app opens and works with no
connection. Note writes are queued, shown immediately as though they had
happened, and sent later. A banner says how many are waiting and offers to retry
now.

**Write failed** — people, days and events are *not* queued. If one of those
fails, the user is told plainly, and told whether it was the connection or a
refusal. Their typing is never discarded.

**Undo** — deleting a person, a day or a note hides it immediately and offers
five seconds to change your mind before it actually happens.

**Load failed** — the previous data stays on screen with an explanation and a
retry, never a blank list that reads as "everything is gone".

**Permission denied** — notifications and photo library. Both need a way back.

**In progress** — importing contacts, uploading a photo, saving.

---

## 6. Technical constraints

Built with **React Native and Expo (SDK 54)**, running on iOS and Android.

- No CSS gradients, backdrop blur, or filter effects. Anything the design relies
  on must be renderable by a plain React Native view.
- Shadows behave differently on iOS and Android and are unreliable as the only
  means of separating a surface from its background.
- Fonts are loaded from Google Fonts at startup. Currently Literata (serif) and
  Inter — both replaceable.
- Icons are Material Icons. A different set means bundling one.
- Animation is available and cheap (Reanimated) — layout transitions, fades,
  springs are all fine.
- The screen must work at 375pt wide, and text may be scaled up by the OS.
- Light theme only today. Dark theme is wanted but not yet built, so a palette
  that can eventually invert is worth more than one that cannot.

---

## 7. What is weak about the current design

An honest diagnosis, so the redesign solves the real problem.

**Everything is the same value.** Background `#fcf9f8`, cards `#ffffff`,
containers `#f6f3f2` — within 3% of each other. Shadows sit at 0.06 opacity.
Nothing separates from anything. The result reads as flat and undifferentiated.

**The accent does not act like an accent.** A desaturated dusty brick
(`#8b4c4d`) against a warm off-white. It never pops, so nothing signals
importance.

**No dark surface anywhere.** No anchor for the eye.

**Serif-plus-sans is the wellness-app default.** Competent, but it makes the app
look like every other mindful-reminder product.

**Small radii and low contrast together** make cards look pressed flat into the
page.

**Rows are undifferentiated.** A list of five things happening today looks
identical to a list of five things happening in a month. Nothing carries weight.

---

## 8. Hard-won details worth keeping

Behaviours that were fixed after they went wrong. A rewrite should not
reintroduce them.

- A long unbroken word in a note must not push out of its card — the text
  container needs to be allowed to shrink
- A thumbnail's tappable wrapper needs real dimensions, or the image inside
  collapses to nothing
- Ticking a gift off must update instantly and reconcile with the server
  afterwards; waiting for the round trip reads as the app hanging
- Rows that move between lists should travel, not teleport
- Date pickers should not offer a past month for a date pinned to this year, and
  should say so when they move a choice forward
- A secondary action must not be visually louder than the primary one — a filled
  "add" button once outshouted "Done"
- "Turning 36" belongs only to birthdays, and only where the message is
  rewritten each year
- An empty state after a failed load must not read as an empty state

---

## 9. How it should feel

One sentence governs everything below:

> **The user should never feel that they are the one doing the remembering.**

Most reminder apps run on anxiety — red badges, overdue counts, unread dots,
streaks. They make you feel behind so that you come back. Kindred is the
opposite. The user hands over the worry and gets on with their life.

### Trust, not vigilance

- No badges, no unread counts, no "3 overdue". Nothing that says you are behind.
- Nothing is ever *missed*. A date that has passed is simply past, and is shown
  as something to look back on, not as a failure.
- A countdown is anticipation, not a deadline. Three days away is a nice thing
  approaching, not a clock running out.
- **When something is saved, show that the app has taken the job on.** The
  reassurance is the product. Today the screen just closes, which asks the user
  to hope rather than to know.
- Let the mechanism be quietly visible — that reminders are armed, when they
  will arrive.
- **One exception, and it should be loud:** if notification permission is
  denied, the promise cannot be kept. That is the only alarm this app earns.

### Obvious, not explained

- Very little text. Labels, not paragraphs.
- Every action visible. Nothing important hidden behind a long-press — deleting
  a person currently is, and nobody will find it.
- One clear primary action per screen.
- **If a screen needs a paragraph to explain itself, the screen is wrong.** The
  fix is a better arrangement, not shorter prose. The current design leans on
  explanatory blurbs under almost every section; they should mostly disappear,
  not shrink.
- A first-time user should be able to work out what to do without reading.

### Fluid, with small delights

- Things move rather than appear and disappear. Lists reorder by travelling.
- Navigation should feel continuous, not like slides being swapped.
- Motion should *mean* something. Good places: a gift idea ticking off and
  moving to the bought list, a countdown reaching today, a photo landing in the
  grid, a new entry sliding into the timeline.
- Bad places: form fields, settings rows, error messages. Movement there reads
  as sluggishness.
- Playful, not cartoonish. One well-timed spring beats five bouncy ones. The
  target is "quietly charming", not "fun app for kids".

### Light and dark, both first-class

Both themes ship together. Neither is an afterthought or an inversion done
badly. The palette must hold up either way, and faces and photographs must look
right on both.

---

## 10. What the redesign is free to change

Everything visual and structural:

- The number of tabs and what they are
- Which information lives on which screen
- Whether the person detail screen is one page or several
- How dates are added — the current multi-field forms are not sacred
- Navigation patterns: sheets, modals, full screens, stacks
- The entire palette, type scale, spacing rhythm, and shape language
- Whether the app is light, dark, or both

What must not change is what the app *does* — every capability in section 3 needs
somewhere to live, and every state in section 5 needs a design.
