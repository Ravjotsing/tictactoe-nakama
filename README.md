# 🎮 Multiplayer Tic-Tac-Toe — Lila Assignment

A production-ready, real-time multiplayer Tic-Tac-Toe game built with **React (TypeScript)** on the frontend and **Nakama** as the server-authoritative backend.

---

## 🔗 Deliverables

| Item | Link |
|------|------|
| **Frontend (Live URL)** | `https://your-frontend-url.vercel.app` |
| **Nakama Server Endpoint** | `http://your-nakama-server:7350` |
| **Source Code** | This repository |

> Replace the above URLs with your actual deployed URLs before submission.

---

## 📁 Project Structure

```
/
├── nakama-backend/          # Nakama server-side TypeScript game logic
│   ├── data/
│   │   └── modules/
│   │       ├── tictactoe.ts     # Source TypeScript
│   │       ├── tictactoe.js     # Compiled JS (loaded by Nakama)
│   │       └── index.js         # Nakama JS entrypoint
│   ├── docker-compose.yml       # Nakama + CockroachDB stack
│   ├── tsconfig.json
│   └── package.json
│
└── tictactoe-frontend/      # React + TypeScript + Vite frontend
    ├── src/
    │   ├── components/          # UI screens
    │   ├── hooks/               # useNakama, useGame
    │   ├── types/               # Shared TypeScript types
    │   ├── App.tsx
    │   └── App.css
    ├── .env                     # Nakama connection config
    └── package.json
```

---

## 🏗️ Architecture & Design Decisions

### Server-Authoritative Design
All game logic runs on the Nakama server — the client only sends move intentions. The server:
- Validates every move (correct turn, valid position, not already filled)
- Maintains the single source of truth for board state
- Broadcasts validated state to both players after every move
- Prevents cheating — clients cannot manipulate game state

### Tech Stack
| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | React + TypeScript + Vite | Fast dev, type safety, component model |
| Backend | Nakama 3.x | Built-in matchmaking, real-time sockets, leaderboards, auth |
| Database | CockroachDB | Nakama's default — distributed, resilient |
| Deployment | Docker Compose | Simple, reproducible server setup |

### Matchmaking Flow
1. Client calls `find_match` RPC with `{ mode: "classic" | "timed" }`
2. Server searches for open matches with matching mode label
3. If found → returns existing match ID; if not → creates new match
4. Client joins match via WebSocket
5. When 2 players are present → game starts automatically

### Real-time Communication
- Uses Nakama's WebSocket match data protocol
- OpCode `1` = game state updates (broadcast to all)
- OpCode `2` = error messages (sent to specific player only)
- All messages are JSON encoded

### Username Handling
- `authenticateDevice` creates/logs in account using a persistent device ID stored in `localStorage`
- `updateAccount` is called on every login to update the username to what the user typed
- `matchJoinAttempt` stores the client-provided username from metadata
- `matchJoin` uses DB lookup (`usersGetId`) as source of truth — never the stale JWT

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm

### 1. Clone the repository
```bash
git clone https://github.com/your-username/tictactoe-nakama.git
cd tictactoe-nakama
```

### 2. Start the Nakama backend
```bash
cd nakama-backend
docker-compose up -d
```

Wait ~30 seconds for CockroachDB and Nakama to initialize.

Verify Nakama is running:
```
http://localhost:7351   ← Nakama Console (admin/admin)
http://localhost:7350   ← API endpoint
```

### 3. Build the backend TypeScript (if you modify tictactoe.ts)
```bash
cd nakama-backend
npm install
npm run build
# Then restart Nakama: docker-compose restart nakama
```

### 4. Start the frontend
```bash
cd tictactoe-frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## 🔧 Environment Configuration

Frontend `.env` file (`tictactoe-frontend/.env`):

```env
VITE_NAKAMA_HOST=localhost
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_USE_SSL=false
VITE_NAKAMA_SERVER_KEY=defaultkey
```

For production, update these to your deployed server values:
```env
VITE_NAKAMA_HOST=your-nakama-server.com
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_USE_SSL=true
VITE_NAKAMA_SERVER_KEY=defaultkey
```

---

## 🚀 Deployment

### Deploy Nakama Server (DigitalOcean / AWS / GCP)

**Option A — Docker Compose on a VPS:**
```bash
# SSH into your server
ssh user@your-server-ip

# Clone repo and start
git clone https://github.com/your-username/tictactoe-nakama.git
cd tictactoe-nakama/nakama-backend
docker-compose up -d

# Open ports: 7349 (socket), 7350 (API), 7351 (console)
```

**Option B — AWS EC2:**
1. Launch EC2 instance (Ubuntu 22.04, t3.small minimum)
2. Install Docker: `sudo apt install docker.io docker-compose -y`
3. Clone repo and run `docker-compose up -d`
4. Open Security Group ports: `7349`, `7350`, `7351`

### Deploy Frontend (Vercel — recommended)
```bash
cd tictactoe-frontend

# Set environment variables in Vercel dashboard:
# VITE_NAKAMA_HOST = your-nakama-server.com
# VITE_NAKAMA_PORT = 7350
# VITE_NAKAMA_USE_SSL = true
# VITE_NAKAMA_SERVER_KEY = defaultkey

# Deploy
npx vercel --prod
```

**Or Netlify:**
```bash
npm run build
# Upload dist/ folder to Netlify, set env vars in dashboard
```

---

## 🔌 API / Server Configuration

### Nakama RPC Endpoints

| RPC ID | Method | Description |
|--------|--------|-------------|
| `find_match` | POST | Find or create a match. Body: `{"mode":"classic"\|"timed"}` |
| `get_leaderboard` | GET | Returns top 20 players by wins |
| `get_stats` | GET | Returns current user's win/loss/draw stats |

### Match Message OpCodes (WebSocket)

| OpCode | Direction | Description |
|--------|-----------|-------------|
| `0` | Client → Server | Player move: `{"position": 0-8}` |
| `1` | Server → Client | Game state update (waiting/start/update/over) |
| `2` | Server → Client | Error message for invalid moves |

### Server Message Types

```typescript
// Server → Client (opCode 1)
{ type: "waiting",     state: GameState }
{ type: "game_start",  state: GameState }
{ type: "game_update", state: GameState }
{ type: "game_over",   state: GameState, reason: "win"|"draw"|"forfeit"|"timeout" }
```

### Nakama Console
- URL: `http://your-server:7351`
- Username: `admin`
- Password: `admin`
- Use console to inspect matches, storage, leaderboards

---

## 🧪 How to Test Multiplayer

### Local Testing (2 browser tabs)
1. Start backend: `cd nakama-backend && docker-compose up -d`
2. Start frontend: `cd tictactoe-frontend && npm run dev`
3. Open `http://localhost:5173` in **Tab 1** → enter username `Player1` → click Play Now
4. Open `http://localhost:5173` in **Tab 2** (or incognito) → enter username `Player2` → click Play Now
5. Both click **Classic** or **Timed** mode → they are matched automatically
6. Take turns clicking cells — moves are validated server-side in real-time

### Testing Specific Scenarios

**Forfeit:** Close one browser tab mid-game → other player wins automatically

**Timeout (Timed mode):** Select Timed mode → wait 30 seconds without moving → current player forfeits

**Leaderboard:** Win a game → click Leaderboard from lobby or game over screen

**Concurrent games:** Open 4 tabs (2 pairs) → each pair gets isolated match rooms

### Verify Server-Authoritative Logic
- Try sending a move out of turn → server rejects it with error message
- Try clicking an occupied cell → server rejects it
- All validation happens server-side in `tictactoe.js` match loop

---

## ✨ Features

### Core
- ✅ Real-time multiplayer via WebSocket
- ✅ Server-authoritative game logic (all validation on server)
- ✅ Automatic matchmaking (find or create match)
- ✅ Graceful disconnect handling (forfeit win for opponent)
- ✅ Responsive UI optimized for mobile

### Bonus
- ✅ **Leaderboard** — global ranking by total wins, persisted in CockroachDB
- ✅ **Player stats** — wins, losses, draws, win streak per player
- ✅ **Timed mode** — 30 second turn timer, auto-forfeit on timeout
- ✅ **Concurrent games** — multiple isolated match rooms simultaneously
- ✅ **Classic mode** — no time limit

---

## 🛠️ Development Notes

### Modifying Game Logic
1. Edit `nakama-backend/data/modules/tictactoe.ts`
2. Run `npm run build` in `nakama-backend/`
3. Restart Nakama: `docker-compose restart nakama`

### Nakama JS Runtime Notes
- Nakama loads all `.js` files from the modules folder
- `InitModule` function is the entry point — called on server boot
- Match handlers run in a sandboxed JS environment
- `nk.leaderboardRecordsList` requires `null` (not `[]`) for ownerIds param
- `presence.username` is stale (from JWT) — always use `nk.usersGetId` for fresh names
