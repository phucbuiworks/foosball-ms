# Foosball Tournament Tracker

A mobile-first responsive full-stack web application designed to track internal foosball tournaments, manage participants, pair teams randomly with seed restrictions, generate double round-robin schedules, log match results, and calculate real-time leaderboards.

Built with **Next.js 16.3 (App Router)**, **React 19**, **Tailwind CSS v4**, and **Supabase Postgres**.

---

## 🚀 Key Features

1. **Authentication Module**
   - Direct password hash registration and sign-in.
   - Session management via Edge-compatible secure HTTP-only cookies and JWT tokens.
   - Default administrator account seeded: `admin` / `admin123`.

2. **Tournament Setup Module**
   - Create new tournaments with custom names.
   - Dynamic player entry list with "Seed" checkbox.
   - Strong validation engine:
     - Player count must be even and $\ge 6$.
     - Number of seeds must not exceed the number of generated teams (player count / 2).

3. **Core Generation Engine**
   - **Team Randomization:** Pairs players into teams of 2. Splices and spreads seed players evenly across teams to prevent them from teaming up together.
   - **Fixture Generator:** Creates a Double Round-Robin schedule using the **Circle Method** (mirroring matches for Leg 1 and Leg 2).
   - **Side Assigner:** Assigns hardcoded home (White) and away (Red) tags to teams. Leg 2 matches swap home/away roles.

4. **Tournament Dashboard UI**
   - Tab-based workspace:
     - **Leaderboard:** Dynamic table calculating Played (P), Wins (W), Losses (L), Goals For (GF), Goals Against (GA), Goal Difference (GD), and Points (3 for Win, 0 for Loss). Auto-sorted by Points $\rightarrow$ GD $\rightarrow$ GF.
     - **Matches List:** Real-time matches overview sorted by Round. Contains tab filters (All, Pending, or specific Round) and White vs Red side indicators for positioning.
     - **Teams View:** Grid layout showing generated team names and their players.
   - **Score Entry Validator:** Click on a pending match to input scores. Validates that exactly one team scores exactly `5` goals, and the other team scores `< 5` goals.
   - **Auto-Sync / Real-Time Polling:** Polling engine that fetches the latest data every 8 seconds, ensuring all devices around the table see the latest standings and live scores.

---

## 🛠️ Database Schema

The application uses Supabase Postgres database. Here is the relational schema:

```mermaid
erDiagram
    users {
        int id PK
        varchar username UK
        varchar password_hash
        timestamp created_at
    }
    tournaments {
        int id PK
        varchar name
        varchar status
        timestamp created_at
    }
    players {
        int id PK
        int tournament_id FK
        varchar name
        boolean is_seed
        timestamp created_at
    }
    teams {
        int id PK
        int tournament_id FK
        varchar name
        int player1_id FK
        int player2_id FK
        timestamp created_at
    }
    matches {
        int id PK
        int tournament_id FK
        int round
        int home_team_id FK
        int away_team_id FK
        int home_score
        int away_score
        boolean played
        timestamp created_at
    }

    tournaments ||--o{ players : "has"
    tournaments ||--o{ teams : "has"
    tournaments ||--o{ matches : "has"
    players ||--o{ teams : "player 1"
    players ||--o{ teams : "player 2"
    teams ||--o{ matches : "plays as home"
    teams ||--o{ matches : "plays as away"
```

---

## 💻 Getting Started

### 1. Prerequisites
Ensure you have `Node.js (v18+)` and `npm` installed.

### 2. Environment Variables
The application parameters are configured in `.env.local` at the root of the project:
```env
DATABASE_URL=postgresql://postgres.rbxnkfzsethxbopxxihu:Cahoihoang%402013@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
JWT_SECRET=super-secret-key-for-foosball-tournament-tracker-2026
```
*(An active Supabase database pooler is configured by default).*

### 3. Initialize Database
Run the database schema setup and seed the default user account:
```bash
node scripts/db-init.js
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your desktop or mobile device.

### 5. Build for Production
To generate a production-ready optimized build:
```bash
npm run build
npm start
```
