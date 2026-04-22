"use client";

import { FormEvent, useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("demo@example.com");
  const [name, setName] = useState("QuickLaunch Demo User");
  const [error, setError] = useState<string | null>(null);

  async function onDemoLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const response = await fetch("/api/demo-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, name }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error || "Demo sign-in failed");
      return;
    }

    if (result?.url) {
      window.location.href = result.url;
    }
  }

  return (
    <main className="marketing-shell">
      <div className="topbar">
        <div className="brand-block">
          <span className="eyebrow">QuickLaunch access</span>
          <strong>Sign in to Team Command Center</strong>
        </div>
      </div>

      <section className="hero">
        <div>
          <div className="kicker">Controlled access</div>
          <h1>Enter the command center.</h1>
          <p>
            Use Google for normal organization access, or use the demo flow while you seed the first tenant and
            workspace on local or staging environments.
          </p>
          <div className="hero-actions">
            <a className="button-primary" href="/api/auth/signin/google?callbackUrl=/">
              Continue with Google
            </a>
          </div>
        </div>

        <div className="card">
          <h2>Demo sign-in</h2>
          <form onSubmit={onDemoLogin} style={{ display: "grid", gap: 12 }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(24, 35, 45, 0.12)", background: "white" }}
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(24, 35, 45, 0.12)", background: "white" }}
            />
            <button className="button-secondary" type="submit">
              Continue with demo access
            </button>
          </form>
          {error ? <p style={{ color: "var(--danger)", marginBottom: 0 }}>{error}</p> : null}
        </div>
      </section>
    </main>
  );
}
