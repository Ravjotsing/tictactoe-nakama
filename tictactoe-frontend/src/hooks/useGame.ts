import { useCallback, useEffect, useRef, useState } from "react";
import type { NakamaConnection } from "./useNakama";
import type { GameState, ServerMessage } from "../types";

export function useGame(connection: NakamaConnection | null) {
  const matchIdRef = useRef<string | null>(null);
  const [matchId, setMatchIdState] = useState<string | null>(null);

  const setMatchId = (id: string | null) => {
    matchIdRef.current = id;
    setMatchIdState(id);
  };
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lastMessage, setLastMessage] = useState<ServerMessage | null>(null);
  const [finding, setFinding] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Attach socket listener
  useEffect(() => {
    if (!connection) return;
    const { socket } = connection;

    socket.onmatchdata = (matchData) => {
      try {
        const raw = new TextDecoder().decode(matchData.data);
        const msg: ServerMessage = JSON.parse(raw);
        if (msg.state) setGameState(msg.state);
        setLastMessage(msg);
      } catch (_) {}
    };

    return () => {
      socket.onmatchdata = () => {};
    };
  }, [connection]);

  // Countdown timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (gameState?.timedMode && gameState.turnDeadline && gameState.status === "playing") {
      const tick = () => {
        const remaining = Math.max(0, Math.ceil((gameState.turnDeadline! - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0 && timerRef.current) clearInterval(timerRef.current);
      };
      tick();
      timerRef.current = setInterval(tick, 500);
    } else {
      setTimeLeft(null);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.turnDeadline, gameState?.status, gameState?.timedMode]);

  const findMatch = useCallback(async (mode: "classic" | "timed") => {
    if (!connection) return;
    setFinding(true);
    try {
      const res = await connection.client.rpc(
        connection.session,
        "find_match",
        { mode }
      );
      const payload = typeof res.payload === "string" ? res.payload : JSON.stringify(res.payload);
      const { matchId: mid } = JSON.parse(payload || "{}");
      if (!mid) throw new Error("No match ID returned");
      // Send username in metadata so server always has the correct current name
      const username = connection.session.username || "";
      await connection.socket.joinMatch(mid, undefined, { username });
      setMatchId(mid);
    } catch (e: any) {
      console.error("findMatch error:", e);
    } finally {
      setFinding(false);
    }
  }, [connection]);

  const sendMove = useCallback(async (position: number) => {
    if (!connection || !matchIdRef.current) return;
    const data = new TextEncoder().encode(JSON.stringify({ position }));
    await connection.socket.sendMatchState(matchIdRef.current, 0, data);
  }, [connection]);

  const leaveMatch = useCallback(async () => {
    if (!connection || !matchIdRef.current) return;
    await connection.socket.leaveMatch(matchIdRef.current);
    setMatchId(null);
    setGameState(null);
    setLastMessage(null);
    setTimeLeft(null);
  }, [connection]);

  return { matchId, gameState, lastMessage, finding, timeLeft, findMatch, sendMove, leaveMatch };
}
