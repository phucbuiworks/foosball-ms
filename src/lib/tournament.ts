export interface Player {
  id: number;
  name: string;
  is_seed: boolean;
}

export interface Team {
  id: number;
  name: string;
  player1_id: number;
  player2_id: number;
}

export interface MatchInput {
  round: number;
  home_team_id: number;
  away_team_id: number;
}

/**
 * Randomly pairs players into teams of 2.
 * Ensures that seed players (is_seed = true) do not play in the same team.
 */
export function randomizeTeams(players: Player[]): Omit<Team, 'id'>[] {
  const seeds = players.filter((p) => p.is_seed);
  const nonSeeds = players.filter((p) => !p.is_seed);

  // Shuffle both arrays using Fisher-Yates
  shuffleArray(seeds);
  shuffleArray(nonSeeds);

  const numTeams = players.length / 2;
  const teams: Omit<Team, 'id'>[] = [];

  // Create teams
  for (let i = 0; i < numTeams; i++) {
    let p1: Player;
    let p2: Player;

    if (i < seeds.length) {
      // Assign one seed player
      p1 = seeds[i];
      // Assign one non-seed player
      p2 = nonSeeds.pop()!;
    } else {
      // Assign two non-seed players
      p1 = nonSeeds.pop()!;
      p2 = nonSeeds.pop()!;
    }

    // Sort player names alphabetically to keep team name consistent
    const sortedPlayers = [p1, p2].sort((a, b) => a.name.localeCompare(b.name));

    teams.push({
      name: `${sortedPlayers[0].name} - ${sortedPlayers[1].name}`,
      player1_id: p1.id,
      player2_id: p2.id,
    });
  }

  return teams;
}

/**
 * Generates double round-robin matches using the Circle Method.
 */
export function buildSchedule(teamIds: number[]): MatchInput[] {
  let list = [...teamIds];
  const isOdd = list.length % 2 !== 0;

  if (isOdd) {
    // Push null for BYE team
    list.push(-1); // -1 represents BYE
  }

  const numTeams = list.length;
  const roundsInLeg = numTeams - 1;
  const matches: MatchInput[] = [];

  // Leg 1 (Lượt đi)
  for (let round = 0; round < roundsInLeg; round++) {
    for (let i = 0; i < numTeams / 2; i++) {
      const home = list[i];
      const away = list[numTeams - 1 - i];

      // Skip match if it involves a BYE (-1)
      if (home !== -1 && away !== -1) {
        // Alternate home/away to distribute sides evenly if possible
        if (round % 2 === 0) {
          matches.push({
            round: round + 1,
            home_team_id: home,
            away_team_id: away,
          });
        } else {
          matches.push({
            round: round + 1,
            home_team_id: away,
            away_team_id: home,
          });
        }
      }
    }

    // Rotate list: keep first element, shift the rest
    list = [list[0], list[numTeams - 1], ...list.slice(1, numTeams - 1)];
  }

  // Leg 2 (Lượt về) - Mirror Leg 1 with swapped home/away and new rounds
  const leg1MatchesCount = matches.length;
  for (let idx = 0; idx < leg1MatchesCount; idx++) {
    const m = matches[idx];
    matches.push({
      round: m.round + roundsInLeg,
      home_team_id: m.away_team_id,
      away_team_id: m.home_team_id,
    });
  }

  return matches;
}

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
