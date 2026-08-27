import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const tournaments = await sql`
      SELECT t.*, 
        (SELECT COUNT(*)::int FROM players WHERE tournament_id = t.id) as player_count,
        (SELECT COUNT(*)::int FROM teams WHERE tournament_id = t.id) as team_count,
        (SELECT COUNT(*)::int FROM matches WHERE tournament_id = t.id) as match_count
      FROM tournaments t
      ORDER BY t.created_at DESC
    `;
    return NextResponse.json(tournaments);
  } catch (err: any) {
    console.error('Fetch tournaments error:', err);
    return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, players } = await request.json();

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Tournament name is required' }, { status: 400 });
    }

    if (!Array.isArray(players) || players.length < 6 || players.length % 2 !== 0) {
      return NextResponse.json(
        { error: 'Total players must be an even number and at least 6' },
        { status: 400 }
      );
    }

    // Validate player names and seeds
    const seedCount = players.filter((p: any) => p.is_seed === true).length;
    const maxSeeds = players.length / 2;

    if (seedCount > maxSeeds) {
      return NextResponse.json(
        { error: `Number of seeds (${seedCount}) cannot exceed number of teams (${maxSeeds})` },
        { status: 400 }
      );
    }

    for (const player of players) {
      if (!player.name || typeof player.name !== 'string' || player.name.trim() === '') {
        return NextResponse.json({ error: 'All players must have a valid name' }, { status: 400 });
      }
    }

    // Create tournament and players inside a transaction
    const result = await sql.begin(async (sqlTrans) => {
      const [tournament] = await sqlTrans`
        INSERT INTO tournaments (name, status)
        VALUES (${name.trim()}, 'Draft')
        RETURNING id, name, status, created_at
      `;

      const playersToInsert = players.map((p) => ({
        tournament_id: tournament.id,
        name: p.name.trim(),
        is_seed: !!p.is_seed,
      }));

      const insertedPlayers = await sqlTrans`
        INSERT INTO players ${sqlTrans(playersToInsert, 'tournament_id', 'name', 'is_seed')}
        RETURNING id, name, is_seed
      `;

      return {
        ...tournament,
        players: insertedPlayers,
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Create tournament error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create tournament' }, { status: 500 });
  }
}
