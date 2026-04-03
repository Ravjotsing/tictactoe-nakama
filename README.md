# 🎮 Multiplayer Tic-Tac-Toe — Lila Assignment

A production-ready, real-time multiplayer Tic-Tac-Toe game built with **React (TypeScript)** on the frontend and **Nakama** as the server-authoritative backend.

---

## 🔗 Deliverables

| Item | Link |
|------|------|
| **Source Code** | https://github.com/Ravjotsing/tictactoe-nakama |
| **Frontend** | Run locally — see setup below |
| **Nakama Server** | Run locally via Docker — see setup below |

---

## ⚡ Quick Start (Run Locally in 3 Steps)

### Prerequisites
- [Node.js 18+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com)

---

### Step 1 — Clone the repository
```bash
git clone https://github.com/Ravjotsing/tictactoe-nakama.git
cd tictactoe-nakama
```

---

### Step 2 — Start the Nakama backend
```bash
cd nakama-backend
docker-compose up -d
```

Wait **30–60 seconds** for CockroachDB and Nakama to fully initialize.

Verify it's running by opening:
```
http://localhost:7351
```
Login with `admin` / `admin` — you should see the Nakama console.

---

### Step 3 — Start the frontend
```bash
cd ../tictactoe-frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🧪 How to Test Multiplayer

### Two players on the same machine
1. Open **http://localhost:5173** in a normal browser tab → enter username `Player1` → click **Play Now**
2. Open **http://localhost:5173** in an **incognito/private** tab → enter username `Player2` → click **Play Now**
3. Both select **Classic** or **Timed** mode → they match automatically
4. Take turns clicking cells — all moves validated server-side in real-time

### Test specific scenarios

| Scenario | How to test |
|----------|-------------|
| **Forfeit** | Close one tab mid-game → other player wins automatically |
| **Timeout** | Select Timed mode → wait 30 seconds without moving |
| **Leaderboard** | Win a game → click 🏆 Leaderboard |
| **Concurrent games** | Open 4 tabs (2 pairs) → each pair gets isolated match room |
| **Server validation** | Try clicking opponent's turn → server rejects it |

---

## 📁 Project Structure

```
/
├── nakama-backend/              # Nakama server-side game logic
│   ├── data/modules/
│   │   ├── tictactoe.ts         # Source TypeScript (game logic)
│   │   ├── tictactoe.js         # Compiled JS loaded by Nakama
│   │   └── index.js             # Nakama JS entrypoint
│   ├── docker-compose.yml       # Nakama + CockroachDB stack
│   ├── Dockerfile
│   └── package.json
│
└── tictactoe-frontend/          # React + TypeScript + Vite
    ├── src/
    │   ├── components/          # LoginScreen, LobbyScreen, GameBoard,
    │   │                        # GameOverScreen, LeaderboardScreen
    │   ├── hooks/               # useNakama.ts, useGame.ts
    │   ├── types/               # Shared TypeScript types
    │   ├── App.tsx
    │   └── App.css
    └── .env                     # Nakama connection config
```

---

## 🏗️ Architecture & Design Decisions

### Server-Authoritative Design
All game logic runs **exclusively on the Nakama server**. The client only sends move intentions (position 0–8). The server:
- Validates every move (correct turn, valid position, cell not occupied)
- Maintains the single source of truth for board state
- Broadcasts validated state to both players after every move
- Handles disconnects — opponent wins by forfeit automatically
- Prevents all client-side cheating

### Tech Stack
| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | React + TypeScript + Vite | Fast dev, type safety, component model |
| Backend | Nakama 3.x | Built-in matchmaking, real-time WebSockets, leaderboards, auth |
| Database | CockroachDB | Nakama's default — distributed, resilient |
| Deployment | Docker Compose | Simple, reproducible local setup |

### Matchmaking Flow
1. Client calls `find_match` RPC with `{ mode: "classic" | "timed" }`
2. Server searches for open matches with matching mode label
3. If found → returns existing match ID; if not → creates new match
4. Client joins match via WebSocket with username in metadata
5. When 2 players present → game starts automatically, match closed to new joiners

### Username Handling
- `authenticateDevice` creates/logs in using persistent device ID from `localStorage`
- `updateAccount` called every login to update username to what user typed
- Username sent in `joinMatch` metadata so server always has the correct current name
- Server uses `nk.usersGetId` (DB lookup) — never the stale JWT `presence.username`

### Real-time Communication
- Nakama WebSocket match data protocol
- OpCode `0` = player move (Client → Server)
- OpCode `1` = game state broadcast (Server → Client)
- OpCode `2` = error messages (Server → specific Client)

---

## 🔌 API / Server Configuration

### Nakama RPC Endpoints

| RPC ID | Description |
|--------|-------------|
| `find_match` | Find or create a match. Body: `{"mode":"classic"\|"timed"}` |
| `get_leaderboard` | Returns top 20 players by wins |
| `get_stats` | Returns current user's win/loss/draw stats |

### Match Message OpCodes

| OpCode | Direction | Payload |
|--------|-----------|---------|
| `0` | Client → Server | `{"position": 0-8}` |
| `1` | Server → Client | `{"type": "...", "state": GameState}` |
| `2` | Server → Client | `{"type": "error", "message": "..."}` |

### Server Message Types
```typescript
{ type: "waiting",     state: GameState }
{ type: "game_start",  state: GameState }
{ type: "game_update", state: GameState }
{ type: "game_over",   state: GameState, reason: "win"|"draw"|"forfeit"|"timeout" }
```

### Nakama Console
- URL: `http://localhost:7351`
- Username: `admin` / Password: `admin`
- Use to inspect matches, storage, leaderboard records

### Frontend Environment Variables (`tictactoe-frontend/.env`)
```env
VITE_NAKAMA_HOST=localhost
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_USE_SSL=false
VITE_NAKAMA_SERVER_KEY=defaultkey
```

---

## ✨ Features Implemented

### Core Requirements ✅
- ✅ Real-time multiplayer via WebSocket
- ✅ Server-authoritative game logic (all validation on server)
- ✅ Automatic matchmaking (find or create match)
- ✅ Graceful disconnect handling (forfeit win for opponent)
- ✅ Responsive UI optimized for mobile

### Bonus Features ✅
- ✅ **Leaderboard** — global ranking by total wins, persisted in CockroachDB
- ✅ **Player stats** — wins, losses, draws, win streak per player
- ✅ **Timed mode** — 30 second turn timer, auto-forfeit on timeout
- ✅ **Concurrent games** — multiple isolated match rooms simultaneously
- ✅ **Classic mode** — unlimited time per turn

---

## 🛠️ Modifying Game Logic

```bash
cd nakama-backend
npm install
# Edit data/modules/tictactoe.ts
npm run build          # compiles .ts → .js
docker-compose restart nakama
```

---

## 🐳 Docker Services

| Service | Port | Description |
|---------|------|-------------|
| Nakama API | 7350 | REST + WebSocket API |
| Nakama Console | 7351 | Admin dashboard |
| Nakama Socket | 7349 | Real-time socket |
| CockroachDB | 26257 | Database |

---

## 📝 Notes

- First startup takes ~60 seconds for CockroachDB to initialize
- Device ID stored in `localStorage` — clearing browser storage logs you out
- Leaderboard updates after every completed game (win only, not draws)
- Timed mode: 30 seconds per turn, auto-forfeit on timeout
