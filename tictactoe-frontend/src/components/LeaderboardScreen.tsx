import { useEffect, useState } from "react";
import type { NakamaConnection } from "../hooks/useNakama";
import type { LeaderboardEntry } from "../types";

interface Props {
  connection: NakamaConnection;
  onBack: () => void;
}

export default function LeaderboardScreen({ connection, onBack }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setFetchError(null);
    connection.client
      .rpc(connection.session, "get_leaderboard", null as any)
      .then((res: any) => {
        const raw =
          typeof res.payload === "string"
            ? res.payload
            : JSON.stringify(res.payload ?? "{}");
        const data = JSON.parse(raw || "{}");
        setEntries(data.leaderboard || []);
      })
      .catch((e: any) => {
        console.error("get_leaderboard RPC failed:", e);
        setFetchError("Could not load leaderboard. Try again.");
        setEntries([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [connection]);

  return (
    <div className="screen leaderboard-screen">
      <div className="leaderboard-card">
        <div className="leaderboard-header">
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
          <h1>🏆 Leaderboard</h1>
        </div>

        {loading ? (
          <div className="loading-state"><span className="spinner" /> Loading…</div>
        ) : fetchError ? (
          <div className="empty-state" style={{ flexDirection: "column", gap: 12 }}>
            <span>⚠️ {fetchError}</span>
            <button className="btn btn-ghost btn-sm" onClick={load}>Retry</button>
          </div>
        ) : entries.length === 0 ? (
          <p className="empty-state">No records yet. Be the first to win!</p>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr><th>#</th><th>Player</th><th>Wins</th></tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.userId} className={e.userId === connection.session.user_id ? "my-row" : ""}>
                  <td className="rank-cell">
                    {e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : e.rank}
                  </td>
                  <td>{e.username || "Unknown"}</td>
                  <td className="wins-cell">{e.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
