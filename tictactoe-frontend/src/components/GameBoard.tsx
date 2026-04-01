import type { GameState } from "../types";

interface Props {
  gameState: GameState;
  myUserId: string;
  myUsername: string;
  timeLeft: number | null;
  onMove: (position: number) => void;
  onLeave: () => void;
}

export default function GameBoard({ gameState, myUserId, myUsername, timeLeft, onMove, onLeave }: Props) {
  const { board, currentTurn, playerX, playerO, playerXUsername, playerOUsername, status, timedMode } = gameState;

  const isMyTurn = currentTurn === myUserId;
  const mySymbol = myUserId === playerX ? "X" : "O";

  // Use local username for self as fallback (in case server sends stale name)
  const displayXUsername = (playerX === myUserId && myUsername) ? myUsername : (playerXUsername || "…");
  const displayOUsername = (playerO === myUserId && myUsername) ? myUsername : (playerOUsername || "…");
  const opponentUsername = myUserId === playerX ? displayOUsername : displayXUsername;

  const statusText = () => {
    if (status === "waiting") return "Waiting for opponent…";
    if (isMyTurn) return "Your turn";
    return `${opponentUsername}'s turn`;
  };

  return (
    <div className="screen game-screen">
      <div className="game-container">
        {/* Header */}
        <div className="game-header">
          <button className="btn btn-ghost btn-sm" onClick={onLeave}>← Leave</button>
          {timedMode
            ? <span className="mode-tag timed-tag">⏱ Timed</span>
            : <span className="mode-tag classic-tag">♟ Classic</span>
          }
        </div>

        {/* Players */}
        <div className="players-row">
          <div className={`player-info ${currentTurn === playerX ? "active-player" : ""}`}>
            <span className="symbol-badge x-badge">X</span>
            <span className="player-name">{displayXUsername || "…"}</span>
            {myUserId === playerX && <span className="you-tag">(you)</span>}
          </div>
          <span className="vs-divider">VS</span>
          <div className={`player-info ${currentTurn === playerO ? "active-player" : ""}`}>
            <span className="symbol-badge o-badge">O</span>
            <span className="player-name">{displayOUsername || "…"}</span>
            {myUserId === playerO && <span className="you-tag">(you)</span>}
          </div>
        </div>

        {/* Timer */}
        {timedMode && timeLeft !== null && status === "playing" && (
          <div className={`timer-bar ${timeLeft <= 10 ? "timer-urgent" : ""}`}>
            <div className="timer-fill" style={{ width: `${(timeLeft / 30) * 100}%` }} />
            <span className="timer-text">{timeLeft}s</span>
          </div>
        )}

        {/* Status */}
        <p className={`status-text ${isMyTurn && status === "playing" ? "my-turn-text" : ""}`}>
          {statusText()}
        </p>

        {/* Board */}
        <div className="board">
          {board.map((cell, i) => (
            <button
              key={i}
              className={`cell ${cell === "X" ? "cell-x" : cell === "O" ? "cell-o" : ""} ${!cell && isMyTurn && status === "playing" ? "cell-hoverable" : "cell-static"}`}
              onClick={() => !cell && isMyTurn && status === "playing" && onMove(i)}
              disabled={!!cell || !isMyTurn || status !== "playing"}
              aria-label={`Cell ${i + 1}${cell ? `, ${cell}` : ""}`}
            >
              {cell}
            </button>
          ))}
        </div>

        <p className="my-symbol-hint">You are playing as <strong>{mySymbol}</strong></p>
      </div>
    </div>
  );
}
