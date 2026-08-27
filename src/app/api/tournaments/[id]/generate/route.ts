import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { randomizeTeams, buildSchedule } from '@/lib/tournament';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id, 10);

    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
    }

    // 1. Fetch tournament and verify status
    const tournaments = await sql`
      SELECT * FROM tournaments WHERE id = ${tournamentId}
    `;

    if (tournaments.length === 0) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const tournament = tournaments[0];
    if (tournament.status !== 'Draft') {
      return NextResponse.json(
        { error: 'Tournament teams and schedule have already been generated' },
        { status: 400 }
      );
    }

    // 2. Fetch players
    const players = await sql`
      SELECT id, name, is_seed 
      FROM players 
      WHERE tournament_id = ${tournamentId}
    `;

    if (players.length < 6 || players.length % 2 !== 0) {
      return NextResponse.json(
        { error: 'Invalid player count. Must be an even number and >= 6' },
        { status: 400 }
      );
    }

    // 3. Generate teams using randomizeTeams
    const typedPlayers = players.map((p) => ({
      id: p.id,
      name: p.name,
      is_seed: !!p.is_seed,
    }));

    const generatedTeams = randomizeTeams(typedPlayers);

    // 4. Save teams and matches inside a transaction
    const result = await sql.begin(async (sqlTrans) => {
      // Clear any existing teams/matches (just in case)
      await sqlTrans`DELETE FROM teams WHERE tournament_id = ${tournamentId}`;
      await sqlTrans`DELETE FROM matches WHERE tournament_id = ${tournamentId}`;

      // Insert teams
      const insertedTeams = [];
      for (const team of generatedTeams) {
        const [insertedTeam] = await sqlTrans`
          INSERT INTO teams (tournament_id, name, player1_id, player2_id)
          VALUES (${tournamentId}, ${team.name}, ${team.player1_id}, ${team.player2_id})
          RETURNING id, name
        `;
        insertedTeams.push(insertedTeam);
      }

      // Generate schedules using team database IDs
      const teamIds = insertedTeams.map((t) => t.id);
      const generatedMatches = buildSchedule(teamIds);

      // Insert matches
      const matchesToInsert = generatedMatches.map((m) => ({
        tournament_id: tournamentId,
        round: m.round,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        home_score: null,
        away_score: null,
        played: false,
      }));

      const insertedMatches = await sqlTrans`
        INSERT INTO matches ${sqlTrans(
          matchesToInsert,
          'tournament_id',
          'round',
          'home_team_id',
          'away_team_id',
          'home_score',
          'away_score',
          'played'
        )}
        RETURNING id, round, home_team_id, away_team_id, played
      `;

      // Update tournament status
      const [updatedTournament] = await sqlTrans`
        UPDATE tournaments
        SET status = 'In Progress'
        WHERE id = ${tournamentId}
        RETURNING id, name, status
      `;

      return {
        tournament: updatedTournament,
        teams: insertedTeams,
        matches: insertedMatches,
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate teams and matches' }, { status: 500 });
  }
}
