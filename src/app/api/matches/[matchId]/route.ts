import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const id = parseInt(matchId, 10);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
    }

    const { home_score, away_score } = await request.json();

    if (home_score === undefined || away_score === undefined) {
      return NextResponse.json({ error: 'Home score and away score are required' }, { status: 400 });
    }

    const hScore = parseInt(home_score, 10);
    const aScore = parseInt(away_score, 10);

    if (isNaN(hScore) || isNaN(aScore) || hScore < 0 || aScore < 0) {
      return NextResponse.json({ error: 'Scores must be non-negative integers' }, { status: 400 });
    }

    // Validation: (Score A = 5 and Score B < 5) OR (Score B = 5 and Score A < 5)
    const isValid = (hScore === 5 && aScore < 5) || (aScore === 5 && hScore < 5);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid scores. One team must score exactly 5 and the other less than 5.' },
        { status: 400 }
      );
    }

    // Update match
    const updated = await sql`
      UPDATE matches
      SET home_score = ${hScore},
          away_score = ${aScore},
          played = true
      WHERE id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (err: any) {
    console.error('Update match score error:', err);
    return NextResponse.json({ error: 'Failed to update score' }, { status: 500 });
  }
}
