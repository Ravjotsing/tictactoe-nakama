import { Client, Session, type Socket } from "@heroiclabs/nakama-js";
import { useCallback, useRef, useState } from "react";

const NAKAMA_HOST = import.meta.env.VITE_NAKAMA_HOST || "localhost";
const NAKAMA_PORT = import.meta.env.VITE_NAKAMA_PORT || "7350";
const NAKAMA_USE_SSL = import.meta.env.VITE_NAKAMA_USE_SSL === "true";
const SERVER_KEY = import.meta.env.VITE_NAKAMA_SERVER_KEY || "defaultkey";

export interface NakamaConnection {
  client: Client;
  session: Session;
  socket: Socket;
}

export function useNakama() {
  const [connection, setConnection] = useState<NakamaConnection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connRef = useRef<NakamaConnection | null>(null);

  const connect = useCallback(async (username: string): Promise<NakamaConnection> => {
    setConnecting(true);
    setError(null);
    try {
      const client = new Client(SERVER_KEY, NAKAMA_HOST, NAKAMA_PORT, NAKAMA_USE_SSL);
      const deviceId = getOrCreateDeviceId();

      // Authenticate — username only applied on first creation by Nakama
      const session = await client.authenticateDevice(deviceId, true, username);

      // Force-update username every login so returning users get their typed name
      try {
        await client.updateAccount(session, { username });
      } catch (_) {
        // Non-fatal — continue even if update fails
      }

      // Connect socket
      const socket = client.createSocket(NAKAMA_USE_SSL, false);
      await socket.connect(session, true);

      // Patch session.username in memory to the typed name immediately
      // The JWT still holds the old name until next token refresh, but
      // we pass username explicitly in joinMatch metadata so server gets correct name
      (session as any).username = username;

      const conn: NakamaConnection = { client, session, socket };
      connRef.current = conn;
      setConnection(conn);
      return conn;
    } catch (e: any) {
      const msg = e?.message || "Connection failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (connRef.current) {
      try {
        await connRef.current.socket.disconnect(true);
      } catch (_) {}
      connRef.current = null;
      setConnection(null);
    }
  }, []);

  return { connection, connecting, error, connect, disconnect };
}

function getOrCreateDeviceId(): string {
  const key = "ttt_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
