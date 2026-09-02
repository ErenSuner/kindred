# Superseded migrations

These ran against the live database when Kindred still tracked people, notes,
photos, personal events, weekly routines and shared holidays. They are kept
because they have already been applied — deleting them would not undo them, and
anyone reading the current schema needs to know why the extra tables and columns
are there.

Nothing in `src/` reads any of it. The app has one table now:
`../simple_birthdays.sql`.

If those tables are ever dropped for real, write a new migration next to this
folder that does it; do not edit these.
