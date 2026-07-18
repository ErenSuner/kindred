import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// How long a deletion sits reversible before it actually happens.
export const UNDO_WINDOW_MS = 5000;

export type UndoableAction = {
  // What the user sees, e.g. "Eleanor deleted".
  message: string;
  // Runs when the window closes without an undo — the real, irreversible bit.
  commit: () => void | Promise<void>;
  // Puts things back as they were.
  undo: () => void;
};

type UndoContextValue = {
  pending: { message: string } | null;
  // Stages an action. Anything already pending is committed first, so at most
  // one deletion is ever in flight.
  stage: (action: UndoableAction) => void;
  undo: () => void;
};

const UndoContext = createContext<UndoContextValue | null>(null);

// Deletions are staged rather than performed: the UI acts as if the thing is
// gone, and the database catches up once the undo window closes. If the app is
// killed mid-window the commit never runs and the record survives — the safe
// direction to fail in.
export function UndoProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<{ message: string } | null>(null);
  const actionRef = useRef<UndoableAction | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const commitPending = useCallback(async () => {
    const action = actionRef.current;
    actionRef.current = null;
    clearTimer();
    setPending(null);

    if (!action) return;
    try {
      await action.commit();
    } catch (e) {
      // The row is still there and the list will show it again on next refresh,
      // so this is reported rather than surfaced as a second banner.
      console.error('Undoable action failed to commit', e);
    }
  }, []);

  const stage = useCallback(
    (action: UndoableAction) => {
      // Two pending deletions would need two snackbars and two timers; the
      // earlier one is simply finalised instead.
      if (actionRef.current) commitPending();

      actionRef.current = action;
      setPending({ message: action.message });
      clearTimer();
      timerRef.current = setTimeout(commitPending, UNDO_WINDOW_MS);
    },
    [commitPending],
  );

  const undo = useCallback(() => {
    const action = actionRef.current;
    actionRef.current = null;
    clearTimer();
    setPending(null);
    action?.undo();
  }, []);

  useEffect(() => () => clearTimer(), []);

  return <UndoContext.Provider value={{ pending, stage, undo }}>{children}</UndoContext.Provider>;
}

export function useUndo() {
  const ctx = useContext(UndoContext);
  if (!ctx) throw new Error('useUndo must be used within UndoProvider');
  return ctx;
}
