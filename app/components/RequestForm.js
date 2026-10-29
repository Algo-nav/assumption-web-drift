"use client";

import { useState } from "react";
import { REQUEST_ROLES } from "../lib/site";

export default function RequestForm() {
  const [state, setState] = useState({ phase: "idle", message: "" });

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setState({ phase: "sending", message: "" });
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: data.get("company"),
          email: data.get("email"),
          role: data.get("role"),
          website: data.get("website"),
        }),
      });
      if (res.ok) {
        form.reset();
        setState({ phase: "done", message: "Recorded. We will email you when we add it." });
        return;
      }
      const body = await res.json().catch(() => ({}));
      setState({
        phase: "error",
        message: res.status === 503 ? "Something went wrong. Try again shortly." : body.error || "Something went wrong. Try again shortly.",
      });
    } catch {
      setState({ phase: "error", message: "Something went wrong. Try again shortly." });
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {/* Honeypot: off-screen, skipped by keyboard and screen readers. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="req-website">Leave this empty</label>
        <input id="req-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="fields fields-3">
        <div>
          <label className="label" htmlFor="req-company">Company name or ticker</label>
          <input id="req-company" name="company" className="input" required maxLength={120} />
        </div>
        <div>
          <label className="label" htmlFor="req-email">Email</label>
          <input id="req-email" name="email" type="email" className="input" required maxLength={200} />
        </div>
        <div>
          <label className="label" htmlFor="req-role">Role</label>
          <select id="req-role" name="role" className="input" defaultValue="" required>
            <option value="" disabled>Choose one</option>
            {REQUEST_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <button type="submit" className="btn btn-cta" disabled={state.phase === "sending"}>
          Request a company
        </button>
        <p role="status" style={{ margin: 0, color: state.phase === "error" ? "var(--red)" : "var(--ink)" }}>
          {state.message}
        </p>
      </div>
    </form>
  );
}
