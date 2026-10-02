/**
 * Pure helpers behind the sign-in and sign-up Server Functions, kept apart
 * so they can be tested without a Supabase project.
 */

export const MIN_PASSWORD_LENGTH = 8;

export type AuthFormState =
  | { status: "idle" }
  | { status: "error"; message: string; email: string }
  | { status: "check-email"; email: string };

export const idleState: AuthFormState = { status: "idle" };

export type Credentials = { email: string; password: string };

/** Returns the credentials, or the message to show when they won't do. */
export function readCredentials(
  form: FormData,
  mode: "sign-in" | "sign-up",
): Credentials | { error: string; email: string } {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) {
    return { error: "Enter your email and a password.", email };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "That email address doesn't look complete.", email };
  }
  if (mode === "sign-up" && password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Use a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
      email,
    };
  }
  return { email, password };
}

/**
 * Where to send someone after they sign in. Only paths on this site are
 * allowed, so a crafted `next` link can't bounce a user to another domain.
 */
export function safeNextPath(next: unknown, fallback = "/analyze"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  if (next === "/sign-in" || next === "/sign-up") return fallback;
  return next;
}

/** Turns a Supabase auth error into a sentence for the person signing in. */
export function describeAuthError(
  mode: "sign-in" | "sign-up",
  error: { code?: string; message: string; status?: number },
): string {
  const code = error.code ?? "";
  if (code === "invalid_credentials") {
    return "That email and password don't match an account.";
  }
  if (code === "email_not_confirmed") {
    return "Confirm your email first. The link is in the message we sent when you signed up.";
  }
  if (code === "user_already_exists" || code === "email_exists") {
    return "There's already an account with that email. Sign in instead.";
  }
  if (code === "weak_password") {
    return "Pick a longer password, or one that's harder to guess.";
  }
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || error.status === 429) {
    return "Too many attempts in a short time. Wait a minute and try again.";
  }
  if (code === "signup_disabled") {
    return "New accounts can't be created right now.";
  }
  return mode === "sign-in"
    ? "Sign-in didn't go through. Try again in a minute."
    : "The account wasn't created. Try again in a minute.";
}
