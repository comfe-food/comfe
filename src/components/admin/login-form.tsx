"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { t } from "@/lib/static-config";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = getBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError("Credenciais inválidas. Verifica o email e a palavra-passe.");
      setSubmitting(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card mx-auto w-full max-w-sm space-y-4 p-6">
      <h1 className="text-2xl">Entrar no painel</h1>

      <div>
        <label htmlFor="login-email" className="field-label">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          className="field-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="login-password" className="field-label">
          Palavra-passe
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          className="field-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="border border-danger/40 bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
        {submitting ? t("processing") : "Entrar"}
      </button>
    </form>
  );
}