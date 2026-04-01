import { useState, useEffect } from "react";
import { useNakama } from "./hooks/useNakama";
import { useGame } from "./hooks/useGame";
import LoginScreen from "./components/LoginScreen";
import LobbyScreen from "./components/LobbyScreen";
import GameBoard from "./components/GameBoard";
import GameOverScreen from "./components/GameOverScreen";
import LeaderboardScreen from "./components/LeaderboardScreen";
import "./App.css";

type Page = "login" | "lobby" | "game" | "gameover" | "leaderboard";

export default function App() {
  const [page, setPage] = useState<Page>("login");
  const { connection, connecting, error, connect, disconnect } = useNakama();
  const { matchId, gameState, lastMessage, finding, timeLeft, findMatch, sendMove, leaveMatch } =
    useGame(connection);

  // If not logged in but on a protected page, go back to login
  useEffect(() => {
    if (!connection && page !== "login") {
      setPage("login");
    }
  }, [connection, page]);

  // Auto-navigate when game finishes
  useEffect(() => {
    if (gameState?.status === "finished" && page === "game") {
      setPage("gameover");
    }
  }, [gameState?.status]);

  // Auto-navigate when match is found and game state arrives
  useEffect(() => {
    if (matchId && gameState && page === "lobby") {
      setPage("game");
    }
  }, [matchId, gameState]);

  const handleLogin = async (username: string) => {
    await connect(username);
    setPage("lobby");
  };

  const handleLeave = async () => {
    await leaveMatch();
    setPage("lobby");
  };

  const handlePlayAgain = async () => {
    await leaveMatch();
    setPage("lobby");
  };

  const handleLogout = async () => {
    await leaveMatch();
    await disconnect();
    setPage("login");
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (page === "login") {
    return (
      <div className="app">
        <LoginScreen onLogin={handleLogin} loading={connecting} error={error} />
      </div>
    );
  }

  // All pages below require connection — show spinner if reconnecting
  if (!connection) {
    return (
      <div className="app">
        <div className="screen">
          <span className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {page === "lobby" && (
        <LobbyScreen
          username={connection.session.username || "Player"}
          finding={finding}
          onFindMatch={findMatch}
          onLeaderboard={() => setPage("leaderboard")}
          onLogout={handleLogout}
        />
      )}

      {page === "game" && gameState && (
        <GameBoard
          gameState={gameState}
          myUserId={connection.session.user_id!}
          myUsername={connection.session.username || ""}
          timeLeft={timeLeft}
          onMove={sendMove}
          onLeave={handleLeave}
        />
      )}

      {page === "gameover" && gameState && (
        <GameOverScreen
          gameState={gameState}
          lastMessage={lastMessage}
          myUserId={connection.session.user_id!}
          myUsername={connection.session.username || ""}
          onPlayAgain={handlePlayAgain}
          onLeaderboard={() => setPage("leaderboard")}
        />
      )}

      {page === "leaderboard" && (
        <LeaderboardScreen
          connection={connection}
          onBack={() => {
            if (gameState?.status === "finished") {
              setPage("gameover");
            } else {
              setPage("lobby");
            }
          }}
        />
      )}

      {/* Fallback: if page is game but gameState not yet loaded */}
      {page === "game" && !gameState && (
        <div className="screen">
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <span className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
            <p style={{ color: "var(--text-muted)" }}>Waiting for opponent…</p>
            <button className="btn btn-ghost btn-sm" onClick={handleLeave}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
