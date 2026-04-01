interface Props {
  username: string;
  finding: boolean;
  onFindMatch: (mode: "classic" | "timed") => void;
  onLeaderboard: () => void;
  onLogout: () => void;
}

export default function LobbyScreen({ username, finding, onFindMatch, onLeaderboard, onLogout }: Props) {
  return (
    <div className="screen lobby-screen">
      <div className="lobby-card">
        <div className="lobby-header">
          <span className="player-badge">👤 {username}</span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Logout</button>
        </div>

        <div className="game-logo">
          <span className="logo-x">X</span>
          <span className="logo-sep">vs</span>
          <span className="logo-o">O</span>
        </div>
        <h1>Find a Match</h1>

        <div className="mode-cards">
          <div className="mode-card">
            <div className="mode-icon">♟️</div>
            <h2>Classic</h2>
            <p>No time limit. Take your time.</p>
            <button
              className="btn btn-primary"
              onClick={() => onFindMatch("classic")}
              disabled={finding}
            >
              {finding ? "Searching…" : "Play Classic"}
            </button>
          </div>

          <div className="mode-card">
            <div className="mode-icon">⏱️</div>
            <h2>Timed</h2>
            <p>30 seconds per turn. Stay sharp.</p>
            <button
              className="btn btn-accent"
              onClick={() => onFindMatch("timed")}
              disabled={finding}
            >
              {finding ? "Searching…" : "Play Timed"}
            </button>
          </div>
        </div>

        {finding && (
          <div className="searching-banner">
            <span className="spinner" />
            Searching for an opponent…
          </div>
        )}

        <button className="btn btn-ghost" onClick={onLeaderboard}>
          🏆 Leaderboard
        </button>
      </div>
    </div>
  );
}
