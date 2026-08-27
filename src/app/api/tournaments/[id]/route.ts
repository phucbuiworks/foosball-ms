import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id, 10);

    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
    }

    // 1. Fetch tournament
    const tournaments = await sql`
      SELECT * FROM tournaments WHERE id = ${tournamentId}
    `;

    if (tournaments.length === 0) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const tournament = tournaments[0];

    // 2. Fetch players
    const players = await sql`
      SELECT id, name, is_seed 
      FROM players 
      WHERE tournament_id = ${tournamentId}
      ORDER BY name ASC
    `;

    // 3. Fetch teams
    const teams = await sql`
      SELECT id, name, player1_id, player2_id
      FROM teams
      WHERE tournament_id = ${tournamentId}
      ORDER BY name ASC
    `;

    // 4. Fetch matches
    const matches = await sql`
      SELECT 
        m.id, 
        m.round, 
        m.home_team_id, 
        m.away_team_id, 
        m.home_score, 
        m.away_score, 
        m.played,
        t1.name as home_team_name,
        t2.name as away_team_name
      FROM matches m
      JOIN teams t1 ON m.home_team_id = t1.id
      JOIN teams t2 ON m.away_team_id = t2.id
      WHERE m.tournament_id = ${tournamentId}
      ORDER BY m.round ASC, m.id ASC
    `;

    // 5. Compute leaderboard dynamically
    const leaderboardMap = new Map<number, any>();
    
    // Initialize leaderboard entries for all teams
    for (const team of teams) {
      leaderboardMap.set(team.id, {
        team_id: team.id,
        team_name: team.name,
        played: 0,
        wins: 0,
        losses: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0,
      });
    }

    // Calculate match outcomes
    for (const m of matches) {
      if (!m.played || m.home_score === null || m.away_score === null) {
        continue;
      }

      const home = leaderboardMap.get(m.home_team_id);
      const away = leaderboardMap.get(m.away_team_id);

      if (home && away) {
        home.played += 1;
        away.played += 1;

        home.gf += m.home_score;
        home.ga += m.away_score;
        away.gf += m.away_score;
        away.ga += m.home_score;

        home.gd = home.gf - home.ga;
        away.gd = away.gf - away.ga;

        if (m.home_score === 5 && m.away_score < 5) {
          home.wins += 1;
          home.points += 3;
          away.losses += 1;
        } else if (m.away_score === 5 && m.home_score < 5) {
          away.wins += 1;
          away.points += 3;
          home.losses += 1;
        }
      }
    }

    // Sort leaderboard array
    const leaderboard = Array.from(leaderboardMap.values()).sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.gd !== a.gd) {
        return b.gd - a.gd;
      }
      if (b.gf !== a.gf) {
        return b.gf - a.gf;
      }
      return a.team_name.localeCompare(b.team_name);
    });

    return NextResponse.json({
      tournament,
      players,
      teams,
      matches,
      leaderboard,
    });
  } catch (err: any) {
    console.error('Fetch tournament details error:', err);
    return NextResponse.json({ error: 'Failed to fetch tournament details' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    const { status, name } = await request.json();

    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
    }

    const updates: any = {};
    if (status !== undefined) {
      if (!['Draft', 'In Progress', 'Completed'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = status;
    }
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updated = await sql`
      UPDATE tournaments
      SET ${sql(updates)}
      WHERE id = ${tournamentId}
      RETURNING *
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (err: any) {
    console.error('Update tournament error:', err);
    return NextResponse.json({ error: 'Failed to update tournament' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id, 10);

    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
    }

    const deleted = await sql`
      DELETE FROM tournaments
      WHERE id = ${tournamentId}
      RETURNING id
    `;

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Tournament deleted successfully' });
  } catch (err: any) {
    console.error('Delete tournament error:', err);
    return NextResponse.json({ error: 'Failed to delete tournament' }, { status: 500 });
  }
}
