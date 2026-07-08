import { useEffect, useState } from "react";
import { LockKeyhole, UserPlus } from "lucide-react";
import { fetchAuthConfig, login, register, setToken } from "../api.js";
import type { User } from "../types.js";

interface AuthPanelProps {
  onAuthenticated: (user: User) => void;
}

export function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [allowPublicRegistration, setAllowPublicRegistration] = useState(false);

  useEffect(() => {
    fetchAuthConfig()
      .then((config) => {
        setAllowPublicRegistration(config.allowPublicRegistration);
        if (!config.allowPublicRegistration) {
          setMode("login");
        }
      })
      .catch(() => {
        setAllowPublicRegistration(false);
        setMode("login");
      });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = isLogin
        ? await login(email.trim(), password)
        : await register(name.trim(), email.trim(), password);
      setToken(response.token);
      onAuthenticated(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zalogować. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setError("");
    if (!allowPublicRegistration) {
      setMode("login");
      return;
    }
    setMode(mode === "login" ? "register" : "login");
  }

  const isLogin = mode === "login" || !allowPublicRegistration;

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={submit} key={mode}>
        <div className="brand-mark">
          <div className="logo">CV</div>
          <div>
            <strong>CRM Rekrutacje</strong>
            <span>CRM kandydatów</span>
          </div>
        </div>
        <div className="auth-heading">
          <h1>{isLogin ? "Logowanie" : "Rejestracja"}</h1>
          <p>
            {isLogin
              ? "Zaloguj się, żeby zarządzać kandydatami, ogłoszeniami i etapami rekrutacji."
              : "Utwórz konto pracownika. Każda zmiana statusu, etapu i notatki będzie zapisana w historii."}
          </p>
        </div>
        {!isLogin && allowPublicRegistration && (
          <label>
            Imię i nazwisko
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              disabled={loading}
            />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            disabled={loading}
          />
        </label>
        <label>
          Hasło
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={isLogin ? "current-password" : "new-password"}
            disabled={loading}
          />
        </label>
        {error && <div className="form-error auth-error" role="alert" aria-live="polite">{error}</div>}
        <button className="icon-button primary auth-submit" type="submit" disabled={loading}>
          {isLogin ? <LockKeyhole size={18} /> : <UserPlus size={18} />}
          {loading ? (isLogin ? "Logowanie..." : "Tworzenie konta...") : (isLogin ? "Zaloguj" : "Utwórz konto")}
        </button>
        {allowPublicRegistration && (
          <button className="link-button auth-switch" type="button" onClick={toggleMode} disabled={loading}>
            {isLogin ? "Nie mam konta - rejestracja" : "Mam konto - logowanie"}
          </button>
        )}
      </form>
    </main>
  );
}
