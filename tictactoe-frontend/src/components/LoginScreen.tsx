import { useState } from "react";

interface Props {
  onLogin: (username: string) => void;
  loading: boolean;
  error: string | null;
}

export default function LoginScreen({ onLogin, loading, error }: Props) {
  const [username, setUsername] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length >= 2) onLogin(trimmed);
  };

  return (
    <div className="screen login-screen">
      <div className="login-card">
        <div className="game-logo">
          <span className="logo-x">X</span>
          <span className="logo-sep">vs</span>
          <span className="logo-o">O</span>
        </div>
        <h1>Tic-Tac-Toe</h1>
        <p className="subtitle">Multiplayer · Real-time</p>
        <form onSubmit={handleSubmit} className="login-form">
          <input
            className="input"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={2}
            maxLength={20}
            autoFocus
            disabled={loading}
          />
          {error && <p className="error-msg">{error}</p>}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading || username.trim().length < 2}
          >
            {loading ? "Connecting…" : "Play Now"}
          </button>
        </form>
      </div>
    </div>
  );
}
