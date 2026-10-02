"use client";

import { useActionState } from "react";
import { type AuthFormState, idleState, MIN_PASSWORD_LENGTH } from "@/lib/auth/form";
import s from "./auth.module.css";

type Props = {
  mode: "sign-in" | "sign-up";
  action: (prev: AuthFormState, form: FormData) => Promise<AuthFormState>;
  next?: string;
};

export function AuthForm({ mode, action, next }: Props) {
  const [state, formAction, pending] = useActionState(action, idleState);

  if (state.status === "check-email") {
    return (
      <div className={s.sent} role="status">
        <h2 className={s.sentHead}>Check your email</h2>
        <p>
          We sent a link to <strong>{state.email}</strong>. Open it to finish
          creating your account. You&rsquo;ll be signed in when you do.
        </p>
      </div>
    );
  }

  const error = state.status === "error" ? state : null;
  const signUp = mode === "sign-up";

  return (
    <form action={formAction} className={s.form} noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <label className={s.field}>
        <span className={s.label}>Email</span>
        <input
          className={s.input}
          type="email"
          name="email"
          autoComplete="email"
          defaultValue={error?.email}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "auth-error" : undefined}
        />
      </label>

      <label className={s.field}>
        <span className={s.label}>Password</span>
        <input
          className={s.input}
          type="password"
          name="password"
          autoComplete={signUp ? "new-password" : "current-password"}
          minLength={signUp ? MIN_PASSWORD_LENGTH : undefined}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={signUp ? "password-note" : error ? "auth-error" : undefined}
        />
        {signUp ? (
          <span id="password-note" className={s.note}>
            At least {MIN_PASSWORD_LENGTH} characters.
          </span>
        ) : null}
      </label>

      {error ? (
        <p id="auth-error" className={s.error} role="alert">
          {error.message}
        </p>
      ) : null}

      <div className={s.actions}>
        <button type="submit" className={s.action} disabled={pending}>
          {pending
            ? signUp
              ? "Creating account…"
              : "Signing in…"
            : signUp
              ? "Create account"
              : "Sign in"}
        </button>
      </div>
    </form>
  );
}
