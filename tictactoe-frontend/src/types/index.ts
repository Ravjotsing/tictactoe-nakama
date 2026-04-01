export interface GameState {
  board: (string | null)[];
  currentTurn: string;
  playerX: string;
  playerO: string;
  playerXUsername: string;
  playerOUsername: string;
  winner: string | null;
  status: "waiting" | "playing" | "finished";
  moveCount: number;
  timedMode: boolean;
  turnDeadline: number | null;
}

export interface ServerMessage {
  type: "waiting" | "game_start" | "game_update" | "game_over" | "error" | "server_shutdown";
  state?: GameState;
  reason?: "win" | "draw" | "forfeit" | "timeout";
  message?: string;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  currentStreak: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  wins: number;
  rank: number;
}
