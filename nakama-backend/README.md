# Nakama Backend

Server-side TypeScript game logic for multiplayer Tic-Tac-Toe.

## Quick Start

```bash
# Start Nakama + CockroachDB
docker-compose up -d

# Nakama Console: http://localhost:7351 (admin/admin)
# API endpoint:   http://localhost:7350
```

## Modify Game Logic

```bash
npm install
npm run build          # compiles tictactoe.ts → tictactoe.js
docker-compose restart nakama
```

## See root README.md for full documentation.
