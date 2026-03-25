import { useState, useEffect, type FormEvent } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "auth_token";

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

// Wire up the auth token getter for all API calls
setAuthTokenGetter(() => getStoredToken());

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"checking" | "locked" | "unlocked">("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setState("locked");
      return;
    }

    fetch(`${import.meta.env.BASE_URL}api/auth/check`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        setState(res.ok ? "unlocked" : "locked");
        if (!res.ok) localStorage.removeItem(TOKEN_KEY);
      })
      .catch(() => {
        // Network error — allow through, API calls will fail individually
        setState("unlocked");
      });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError("Password errata");
        setSubmitting(false);
        return;
      }

      const { token } = await res.json();
      storeToken(token);
      setState("unlocked");
    } catch {
      setError("Errore di connessione");
      setSubmitting(false);
    }
  }

  if (state === "checking") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (state === "locked") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-[340px]">
          <div className="flex flex-col items-center mb-8">
            <img
              src={`${import.meta.env.BASE_URL}logo.avif`}
              alt="Beyond Asana"
              className="w-20 h-20 rounded-lg object-contain mb-4"
            />
            <h1 className="text-2xl font-serif text-foreground">Beyond Asana</h1>
            <p className="text-sm text-muted-foreground mt-1">Inserisci la password per accedere</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-foreground text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting || !password}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-medium text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              {submitting ? "..." : "Accedi"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
