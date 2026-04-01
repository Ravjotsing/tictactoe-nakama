// Nakama Server-Side TypeScript for Multiplayer Tic-Tac-Toe
// This file handles all server-authoritative game logic

const MODULE_NAME = "tictactoe";
const COLLECTION_STATS = "player_stats";
const LEADERBOARD_ID = "tictactoe_wins";
const TURN_TIMER_SECONDS = 30;

// ─── Types ────────────────────────────────────────────────────────────────────

interface GameState {
  board: (string | null)[];   // 9 cells: null | "X" | "O"
  currentTurn: string;        // userId of whose turn it is
  playerX: string;            // userId
  playerO: string;            // userId
  playerXUsername: string;
  playerOUsername: string;
  winner: string | null;      // userId or "draw"
  status: "waiting" | "playing" | "finished";
  moveCount: number;
  timedMode: boolean;
  turnDeadline: number | null; // epoch ms
}

interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  currentStreak: number;
}

interface MoveMessage {
  position: number; // 0-8
}

interface MatchLabel {
  mode: "classic" | "timed";
  open: number; // 1 = open, 0 = closed (Nakama label search requires numeric for bool)
}

// ─── Win Conditions ───────────────────────────────────────────────────────────

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

function checkWinner(board: (string | null)[]): string | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]!;
    }
  }
  return null;
}

function isBoardFull(board: (string | null)[]): boolean {
  return board.every(cell => cell !== null);
}

// ─── Player Stats Helpers ─────────────────────────────────────────────────────

function getPlayerStats(ctx: nkruntime.Context, nk: nkruntime.Nakama, userId: string): PlayerStats {
  try {
    const objects = nk.storageRead([{ collection: COLLECTION_STATS, key: "stats", userId }]);
    if (objects.length > 0) {
      return objects[0].value as PlayerStats;
    }
  } catch (_) {}
  return { wins: 0, losses: 0, draws: 0, winStreak: 0, currentStreak: 0 };
}

function savePlayerStats(ctx: nkruntime.Context, nk: nkruntime.Nakama, userId: string, stats: PlayerStats): void {
  nk.storageWrite([{
    collection: COLLECTION_STATS,
    key: "stats",
    userId,
    value: stats,
    permissionRead: 2,
    permissionWrite: 0,
  }]);
}

function updateStatsAfterGame(
  ctx: nkruntime.Context,
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  winnerUserId: string | null,
  isDraw: boolean,
  playerX: string,
  playerO: string
): void {
  const statsX = getPlayerStats(ctx, nk, playerX);
  const statsO = getPlayerStats(ctx, nk, playerO);

  if (isDraw) {
    statsX.draws++;
    statsO.draws++;
    statsX.currentStreak = 0;
    statsO.currentStreak = 0;
  } else if (winnerUserId === playerX) {
    statsX.wins++;
    statsX.currentStreak++;
    statsX.winStreak = Math.max(statsX.winStreak, statsX.currentStreak);
    statsO.losses++;
    statsO.currentStreak = 0;
  } else {
    statsO.wins++;
    statsO.currentStreak++;
    statsO.winStreak = Math.max(statsO.winStreak, statsO.currentStreak);
    statsX.losses++;
    statsX.currentStreak = 0;
  }

  savePlayerStats(ctx, nk, playerX, statsX);
  savePlayerStats(ctx, nk, playerO, statsO);

  // Update leaderboard — always fetch fresh username from account
  if (!isDraw && winnerUserId) {
    const winnerStats = winnerUserId === playerX ? statsX : statsO;
    let freshUsername = "";
    try {
      const users = nk.usersGetId([winnerUserId], []);
      if (users && users.length > 0) {
        freshUsername = users[0].username || "";
      }
    } catch (e) {
      logger.warn("usersGetId failed for %s: %s", winnerUserId, e);
    }
    nk.leaderboardRecordWrite(LEADERBOARD_ID, winnerUserId, freshUsername, winnerStats.wins, 0, {});
    logger.info("leaderboard updated: %s (%s) wins=%d", freshUsername, winnerUserId, winnerStats.wins);
  }
}

// ─── RPC: Get Player Stats ────────────────────────────────────────────────────

const rpcGetStats: nkruntime.RpcFunction = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string => {
  const stats = getPlayerStats(ctx, nk, ctx.userId);
  return JSON.stringify(stats);
};

// ─── RPC: Get Leaderboard ─────────────────────────────────────────────────────

const rpcGetLeaderboard: nkruntime.RpcFunction = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string => {
  try {
    // null for ownerIds = no filter, returns top records by score
    const records = nk.leaderboardRecordsList(LEADERBOARD_ID, null as any, 20, null as any, 0);
    const rawRecords = records.records || [];

    if (rawRecords.length === 0) {
      return JSON.stringify({ leaderboard: [] });
    }

    // Fetch fresh usernames from accounts for all owners
    const ownerIds = rawRecords.map(r => r.ownerId);
    let usernameMap: { [userId: string]: string } = {};
    try {
      const users = nk.usersGetId(ownerIds, []);
      for (const u of (users || [])) {
        usernameMap[u.id] = u.username || "";
      }
    } catch (e) {
      logger.warn("usersGetId batch failed: %s", e);
    }

    const entries = rawRecords.map(r => ({
      userId: r.ownerId,
      // Use fresh username from account, fall back to stored record username
      username: usernameMap[r.ownerId] || r.username || "Unknown",
      wins: r.score,
      rank: r.rank,
    }));

    logger.info("leaderboard fetched: %d entries", entries.length);
    return JSON.stringify({ leaderboard: entries });
  } catch (e) {
    logger.error("leaderboard fetch error: %s", e);
    return JSON.stringify({ leaderboard: [] });
  }
};

// ─── RPC: Find or Create Match ────────────────────────────────────────────────

const rpcFindMatch: nkruntime.RpcFunction = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string => {
  let mode: "classic" | "timed" = "classic";
  try {
    const raw = typeof payload === "string" ? JSON.parse(payload || "{}") : payload;
    if (raw && raw.mode === "timed") mode = "timed";
  } catch (_) {}

  // Search for open matches with same mode
  const query = `+label.open:1 +label.mode:${mode}`;
  const matches = nk.matchList(10, true, null, 1, 1, query);

  if (matches.length > 0) {
    return JSON.stringify({ matchId: matches[0].matchId });
  }

  // Create new match
  const matchId = nk.matchCreate(MODULE_NAME, { mode });
  return JSON.stringify({ matchId });
};

// ─── Match Handler ────────────────────────────────────────────────────────────

const matchInit: nkruntime.MatchInitFunction = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  params: { [key: string]: string }
): { state: GameState; tickRate: number; label: string } => {
  const timedMode = params?.mode === "timed";

  const state: GameState = {
    board: Array(9).fill(null),
    currentTurn: "",
    playerX: "",
    playerO: "",
    playerXUsername: "",
    playerOUsername: "",
    winner: null,
    status: "waiting",
    moveCount: 0,
    timedMode,
    turnDeadline: null,
  };

  const label: MatchLabel = { mode: timedMode ? "timed" : "classic", open: 1 };

  return { state, tickRate: 5, label: JSON.stringify(label) };
};

const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  presence: nkruntime.Presence,
  metadata: { [key: string]: any }
): { state: GameState; accept: boolean; rejectMessage?: string } => {
  if (state.status === "finished") {
    return { state, accept: false, rejectMessage: "Match already finished" };
  }
  if (state.playerX && state.playerO && state.playerX !== presence.userId && state.playerO !== presence.userId) {
    return { state, accept: false, rejectMessage: "Match is full" };
  }
  // Store the client-provided username in state so matchJoin can use it
  // metadata is available here but not in matchJoin
  if (metadata && metadata.username) {
    if (!state.pendingUsernames) (state as any).pendingUsernames = {};
    (state as any).pendingUsernames[presence.userId] = metadata.username;
  }
  return { state, accept: true };
};

const matchJoin: nkruntime.MatchJoinFunction = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  presences: nkruntime.Presence[]
): { state: GameState } | null => {
  for (const presence of presences) {
    // Priority: client metadata username > DB lookup > stale JWT presence.username
    let username = presence.username;
    // Check if client sent username via joinMatch metadata (stored in matchJoinAttempt)
    const pending = (state as any).pendingUsernames;
    if (pending && pending[presence.userId]) {
      username = pending[presence.userId];
      delete pending[presence.userId];
    } else {
      // Fall back to DB lookup
      try {
        const users = nk.usersGetId([presence.userId], []);
        if (users && users.length > 0 && users[0].username) {
          username = users[0].username;
        }
      } catch (_) {}
    }

    if (!state.playerX) {
      state.playerX = presence.userId;
      state.playerXUsername = username;
    } else if (!state.playerO && presence.userId !== state.playerX) {
      state.playerO = presence.userId;
      state.playerOUsername = username;
    }
  }

  // Both players joined — start game
  if (state.playerX && state.playerO) {
    state.status = "playing";
    state.currentTurn = state.playerX; // X always goes first
    if (state.timedMode) {
      state.turnDeadline = Date.now() + TURN_TIMER_SECONDS * 1000;
    }

    // Close match to new joiners
    const label: MatchLabel = {
      mode: state.timedMode ? "timed" : "classic",
      open: 0,
    };
    dispatcher.matchLabelUpdate(JSON.stringify(label));

    dispatcher.broadcastMessage(1, JSON.stringify({
      type: "game_start",
      state: sanitizeState(state),
    }), null, null, true);
  } else {
    // Still waiting — broadcast waiting state
    dispatcher.broadcastMessage(1, JSON.stringify({
      type: "waiting",
      state: sanitizeState(state),
    }), null, null, true);
  }

  return { state };
};

const matchLeave: nkruntime.MatchLeaveFunction = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  presences: nkruntime.Presence[]
): { state: GameState } | null => {
  for (const presence of presences) {
    if (state.status === "playing") {
      // The other player wins by forfeit
      const winner = presence.userId === state.playerX ? state.playerO : state.playerX;
      state.winner = winner;
      state.status = "finished";

      updateStatsAfterGame(ctx, nk, logger, winner, false, state.playerX, state.playerO);

      dispatcher.broadcastMessage(1, JSON.stringify({
        type: "game_over",
        reason: "forfeit",
        state: sanitizeState(state),
      }), null, null, true);
    }
  }
  return { state };
};

const matchLoop: nkruntime.MatchLoopFunction = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  messages: nkruntime.MatchMessage[]
): { state: GameState } | null => {
  if (state.status === "finished") return { state };

  // ── Timer check ──────────────────────────────────────────────────────────
  if (state.status === "playing" && state.timedMode && state.turnDeadline) {
    if (Date.now() > state.turnDeadline) {
      // Current player forfeits their turn (auto-forfeit = opponent wins)
      const winner = state.currentTurn === state.playerX ? state.playerO : state.playerX;
      state.winner = winner;
      state.status = "finished";
      state.turnDeadline = null;

      updateStatsAfterGame(ctx, nk, logger, winner, false, state.playerX, state.playerO);

      dispatcher.broadcastMessage(1, JSON.stringify({
        type: "game_over",
        reason: "timeout",
        state: sanitizeState(state),
      }), null, null, true);

      return { state };
    }
  }

  // ── Process messages ──────────────────────────────────────────────────────
  for (const msg of messages) {
    if (state.status !== "playing") continue;

    let data: MoveMessage;
    try {
      const raw = msg.data;
      const str = typeof raw === "string" ? raw : String.fromCharCode(...Array.from(new Uint8Array(raw as any)));
      data = JSON.parse(str);
    } catch (_) {
      continue;
    }

    // Validate it's this player's turn
    if (msg.sender.userId !== state.currentTurn) {
      dispatcher.broadcastMessage(2, JSON.stringify({
        type: "error",
        message: "Not your turn",
      }), [msg.sender], null, true);
      continue;
    }

    const pos = data.position;

    // Validate position
    if (typeof pos !== "number" || pos < 0 || pos > 8 || state.board[pos] !== null) {
      dispatcher.broadcastMessage(2, JSON.stringify({
        type: "error",
        message: "Invalid move",
      }), [msg.sender], null, true);
      continue;
    }

    // Apply move
    const symbol = msg.sender.userId === state.playerX ? "X" : "O";
    state.board[pos] = symbol;
    state.moveCount++;

    const winSymbol = checkWinner(state.board);

    if (winSymbol) {
      state.winner = winSymbol === "X" ? state.playerX : state.playerO;
      state.status = "finished";
      state.turnDeadline = null;

      updateStatsAfterGame(ctx, nk, logger, state.winner, false, state.playerX, state.playerO);

      dispatcher.broadcastMessage(1, JSON.stringify({
        type: "game_over",
        reason: "win",
        state: sanitizeState(state),
      }), null, null, true);
    } else if (isBoardFull(state.board)) {
      state.winner = "draw";
      state.status = "finished";
      state.turnDeadline = null;

      updateStatsAfterGame(ctx, nk, logger, null, true, state.playerX, state.playerO);

      dispatcher.broadcastMessage(1, JSON.stringify({
        type: "game_over",
        reason: "draw",
        state: sanitizeState(state),
      }), null, null, true);
    } else {
      // Switch turn
      state.currentTurn = state.currentTurn === state.playerX ? state.playerO : state.playerX;
      if (state.timedMode) {
        state.turnDeadline = Date.now() + TURN_TIMER_SECONDS * 1000;
      }

      dispatcher.broadcastMessage(1, JSON.stringify({
        type: "game_update",
        state: sanitizeState(state),
      }), null, null, true);
    }
  }

  return { state };
};

const matchTerminate: nkruntime.MatchTerminateFunction = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  graceSeconds: number
): { state: GameState } | null => {
  dispatcher.broadcastMessage(1, JSON.stringify({ type: "server_shutdown" }), null, null, true);
  return { state };
};

const matchSignal: nkruntime.MatchSignalFunction = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  data: string
): { state: GameState; data: string } => {
  return { state, data: "" };
};

// Strip internal fields before sending to clients
function sanitizeState(state: GameState) {
  return {
    board: state.board,
    currentTurn: state.currentTurn,
    playerX: state.playerX,
    playerO: state.playerO,
    playerXUsername: state.playerXUsername,
    playerOUsername: state.playerOUsername,
    winner: state.winner,
    status: state.status,
    moveCount: state.moveCount,
    timedMode: state.timedMode,
    turnDeadline: state.turnDeadline,
  };
}

// ─── Initializer ─────────────────────────────────────────────────────────────

function InitModule(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer
): void {
  // Create leaderboard (idempotent — safe to call on every boot)
  try {
    nk.leaderboardCreate(LEADERBOARD_ID, false, "desc", "set", "", {});
    logger.info("Leaderboard '%s' ready", LEADERBOARD_ID);
  } catch (e) {
    logger.warn("leaderboardCreate skipped (may already exist): %s", e);
  }

  initializer.registerRpc("get_stats", rpcGetStats);
  initializer.registerRpc("get_leaderboard", rpcGetLeaderboard);
  initializer.registerRpc("find_match", rpcFindMatch);

  initializer.registerMatch(MODULE_NAME, {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchTerminate,
    matchSignal,
  });

  logger.info("TicTacToe module loaded");
}
