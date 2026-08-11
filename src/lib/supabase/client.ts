"use client";

import { createBrowserClient } from "@supabase/ssr";

let cached: ReturnType<typeof createBrowserClient> | null = null;

/** Set once, so ten failing requests do not fire ten navigations. */
let bouncing = false;

/**
 * A dead session used to end up on screen as whatever wording the server chose
 * — "JWT expired", "JWT issued at future" — printed in a red box on a page with
 * nothing on it and no way out but the Log out button. There is only one thing
 * to do about any of them, so the client does it: a 401 means this token will
 * not open anything again, so drop it and go back to the login form.
 *
 * The sign-out is local on purpose. Handing the bad token back to the server to
 * be revoked would be one more request to be refused, and would come back
 * through this same wrapper.
 */
async function bounceToLogin() {
  if (bouncing) return;
  bouncing = true;

  try {
    await cached?.auth.signOut({ scope: "local" });
  } catch {
    // Nothing to do about it; the cookies go with the navigation either way.
  }

  // Not the router: this is reached from library code, and the point is to
  // throw away the page and everything it thought it had loaded.
  window.location.replace("/login?expired=1");
}

/** Browser client for the admin screens — carries your signed-in session. */
export function supabaseBrowser() {
  if (!cached) {
    cached = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        global: {
          fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
            const res = await fetch(input, init);

            // 401 is only ever the token: a row this account may not read comes
            // back as an empty list or a 403, never this. On the login page it
            // is a failed sign-in attempt, which the form itself reports.
            if (res.status === 401 && !window.location.pathname.startsWith("/login")) {
              void bounceToLogin();
            }

            return res;
          },
        },
      },
    );
  }
  return cached;
}
