import type { GameState, ServerMessage } from "../types";

interface Props {
  gameState: GameState;
  lastMessage: ServerMessage | null;
  myUserId: string;
  myUsername: string;
  onPlayAgain: () => void;
  onLeaderboard: () => void;
}

export default function GameOverScreen({ gameState, lastMessage, myUserId, myUsername, onPlayAgain, onLeaderboard }: Props) {
  const { winner, playerX, playerXUsername, playerOUsername } = gameState;
  const reason = lastMessage?.reason;

  const isDraw = winner === "draw";
  const iWon = winner === myUserId;

  // Use local username for self as fallback, prefer server name now that server fetches fresh
  const displayXUsername = (gameState.playerX === myUserId && myUsername) ? myUsername : (playerXUsername || "Unknown");
  const displayOUsername = (gameState.playerO === myUserId && myUsername) ? myUsername : (playerOUsername || "Unknown");
  const winnerUsername = winner === playerX ? displayXUsername : displayOUsername;

  const headline = () => {
    if (isDraw) return "It's a Draw!";
    if (iWon) return "You Win! 🎉";
    return "You Lose 😔";
  };

  const subtext = () => {
    if (reason === "forfeit") return `Opponent disconnected.`;
    if (reason === "timeout") return `Time ran out!`;
    if (isDraw) return "Nobody wins this round.";
    return `${winnerUsername} wins the match!`;
  };

  return (
    <div className="screen gameover-screen">
      <div className="gameover-card">
        <div className={`result-icon ${isDraw ? "draw" : iWon ? "win" : "lose"}`}>
          {isDraw ? "🤝" : iWon ? "🏆" : "💀"}
        </div>
        <h1 className={`result-headline ${isDraw ? "" : iWon ? "win-text" : "lose-text"}`}>
          {headline()}
        </h1>
        <p className="result-subtext">{subtext()}</p>

        {/* Final board */}
        <div className="board board-sm">
          {gameState.board.map((cell, i) => (
            <div key={i} className={`cell cell-static ${cell === "X" ? "cell-x" : cell === "O" ? "cell-o" : ""}`}>
              {cell}
            </div>
          ))}
        </div>

        <div className="gameover-actions">
          <button className="btn btn-primary" onClick={onPlayAgain}>Play Again</button>
          <button className="btn btn-ghost" onClick={onLeaderboard}>🏆 Leaderboard</button>
        </div>
      </div>
    </div>
  );
}
