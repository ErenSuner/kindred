// Crash reporting. Local <AppErrorBoundary> catches render errors so the app
// doesn't die to a blank screen; Sentry is what makes those (and unhandled JS
// errors) visible in production, where there is no console to read.
//
// DSN comes from EXPO_PUBLIC_SENTRY_DSN. When it's absent — local dev, or before
// a project is set up — init is skipped and every Sentry call is a harmless
// no-op, so the rest of the app never has to guard for it.
import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const sentryEnabled = !!dsn;

if (dsn) {
  Sentry.init({
    dsn,
    // Errors only for v1 — no performance tracing, to keep the free quota for
    // what matters.
    tracesSampleRate: 0,
    // Breadcrumbs can carry note/contact text; keep them off personal data.
    sendDefaultPii: false,
    enabled: !__DEV__,
  });
}

export { Sentry };
