"use client";

import { useFormState, useFormStatus } from "react-dom";
import Mark from "@/components/Mark";
import { login, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState<LoginState, FormData>(login, {});

  return (
    <div className="login-wrap">
      <form className="login-card" action={action}>
        <div className="login-brand">
          <Mark />
          <b>Leadway</b>
        </div>
        <div className="login-h">Sign in</div>
        <div className="login-sub">Manage your team&apos;s leads and pipeline.</div>

        {state?.error && <div className="login-error">{state.error}</div>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" defaultValue="hafiz@company.my" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <SubmitButton />

        <div className="login-note">
          Demo accounts (password <b>password123</b>): aina@company.my · hafiz@company.my ·
          huiting@company.my · farid@company.my
        </div>
      </form>
    </div>
  );
}
