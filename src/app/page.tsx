'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Plus,
  Trash2,
  Play,
  CheckCircle,
  Clock,
  User,
  Users,
  LogOut,
  RefreshCw,
  AlertCircle,
  Calendar,
  List,
  ChevronRight,
  Home,
  X,
  PlusCircle,
  MinusCircle
} from 'lucide-react';

interface Tournament {
  id: number;
  name: string;
  status: 'Draft' | 'In Progress' | 'Completed';
  created_at: string;
  player_count?: number;
  team_count?: number;
  match_count?: number;
}

interface Player {
  id: number;
  name: string;
  is_seed: boolean;
}

interface Team {
  id: number;
  name: string;
  player1_id: number;
  player2_id: number;
}

interface Match {
  id: number;
  round: number;
  home_team_id: number;
  away_team_id: number;
  home_score: number | null;
  away_score: number | null;
  played: boolean;
  home_team_name: string;
  away_team_name: string;
}

interface LeaderboardRow {
  team_id: number;
  team_name: string;
  played: number;
  wins: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export default function Dashboard() {
  const router = useRouter();
  
  // Auth state
  const [username, setUsername] = useState<string>('User');
  
  // Tournaments list state
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  
  // Selected tournament state
  const [activeId, setActiveId] = useState<number | null>(null);
  const [tournamentDetails, setTournamentDetails] = useState<{
    tournament: Tournament;
    players: Player[];
    teams: Team[];
    matches: Match[];
    leaderboard: LeaderboardRow[];
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'matches' | 'teams'>('leaderboard');
  const [matchFilter, setMatchFilter] = useState<string>('all'); // 'all', 'pending', or round number
  
  // Creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newPlayers, setNewPlayers] = useState<{ name: string; is_seed: boolean }[]>([
    { name: '', is_seed: false },
    { name: '', is_seed: false },
    { name: '', is_seed: false },
    { name: '', is_seed: false },
    { name: '', is_seed: false },
    { name: '', is_seed: false },
  ]);
  const [formError, setFormError] = useState('');
  const [submittingForm, setSubmittingForm] = useState(false);

  // Score Modal State
  const [scoreModalMatch, setScoreModalMatch] = useState<Match | null>(null);
  const [homeScoreInput, setHomeScoreInput] = useState('');
  const [awayScoreInput, setAwayScoreInput] = useState('');
  const [scoreError, setScoreError] = useState('');
  const [submittingScore, setSubmittingScore] = useState(false);

  // Auto-polling interval reference
  const [pollingActive, setPollingActive] = useState(true);

  // Parse user session on load
  useEffect(() => {
    // Attempt to parse cookie for username if available (fallback to 'User')
    const cookies = document.cookie.split(';');
    const sessionCookie = cookies.find(c => c.trim().startsWith('foosball_session='));
    if (sessionCookie) {
      try {
        const token = sessionCookie.split('=')[1];
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const decoded = JSON.parse(atob(payloadBase64));
          if (decoded && decoded.username) {
            setUsername(decoded.username);
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }, []);

  // Fetch list of tournaments
  const fetchTournamentsList = async () => {
    try {
      const res = await fetch('/api/tournaments');
      if (res.ok) {
        const data = await res.json();
        setTournaments(data);
      }
    } catch (err) {
      console.error('Error fetching tournaments list', err);
    } finally {
      setLoadingList(false);
    }
  };

  // Fetch single tournament details
  const fetchTournamentDetails = async (id: number, silent = false) => {
    if (!silent) setLoadingDetails(true);
    try {
      const res = await fetch(`/api/tournaments/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTournamentDetails(data);
      } else {
        // If not found, revert to list
        setActiveId(null);
        setTournamentDetails(null);
      }
    } catch (err) {
      console.error('Error fetching tournament details', err);
    } finally {
      if (!silent) setLoadingDetails(false);
    }
  };

  // Initial list load
  useEffect(() => {
    fetchTournamentsList();
  }, []);

  // Auto-polling logic (every 8 seconds to satisfy realtime/auto-sync requirement)
  useEffect(() => {
    if (!pollingActive) return;

    const interval = setInterval(() => {
      if (activeId !== null) {
        fetchTournamentDetails(activeId, true);
      } else {
        fetchTournamentsList();
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [activeId, pollingActive]);

  // Handle Select Tournament
  const handleSelectTournament = (id: number) => {
    setActiveId(id);
    setActiveTab('leaderboard');
    setMatchFilter('all');
    fetchTournamentDetails(id);
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  // Player input management
  const handleAddPlayerField = () => {
    setNewPlayers([...newPlayers, { name: '', is_seed: false }]);
  };

  const handleRemovePlayerField = (index: number) => {
    const updated = [...newPlayers];
    updated.splice(index, 1);
    setNewPlayers(updated);
  };

  const handlePlayerChange = (index: number, field: 'name' | 'is_seed', value: any) => {
    const updated = [...newPlayers];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setNewPlayers(updated);
  };

  // Create Tournament Submission
  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedName = newTournamentName.trim();
    if (!trimmedName) {
      setFormError('Please enter a tournament name');
      return;
    }

    const validPlayers = newPlayers.filter((p) => p.name.trim() !== '');

    // Validation Rules
    if (validPlayers.length < 6) {
      setFormError('Minimum of 6 players required');
      return;
    }

    if (validPlayers.length % 2 !== 0) {
      setFormError('Total number of players must be an even number');
      return;
    }

    const seedCount = validPlayers.filter((p) => p.is_seed).length;
    const teamCount = validPlayers.length / 2;

    if (seedCount > teamCount) {
      setFormError(`Number of seed players (${seedCount}) cannot exceed number of teams (${teamCount})`);
      return;
    }

    setSubmittingForm(true);

    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          players: validPlayers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to create tournament');
      } else {
        // Reset states and select new tournament
        setNewTournamentName('');
        setNewPlayers([
          { name: '', is_seed: false },
          { name: '', is_seed: false },
          { name: '', is_seed: false },
          { name: '', is_seed: false },
          { name: '', is_seed: false },
          { name: '', is_seed: false },
        ]);
        setShowCreateModal(false);
        fetchTournamentsList();
        handleSelectTournament(data.id);
      }
    } catch (err) {
      setFormError('Network error occurred');
    } finally {
      setSubmittingForm(false);
    }
  };

  // Generate Teams & Matches
  const handleGenerateTournament = async () => {
    if (!activeId) return;
    setLoadingDetails(true);

    try {
      const res = await fetch(`/api/tournaments/${activeId}/generate`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Generation failed');
      } else {
        fetchTournamentDetails(activeId);
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred during generation');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Score Submit
  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoreModalMatch) return;
    setScoreError('');

    const hScore = parseInt(homeScoreInput, 10);
    const aScore = parseInt(awayScoreInput, 10);

    if (isNaN(hScore) || isNaN(aScore) || hScore < 0 || aScore < 0) {
      setScoreError('Scores must be positive numbers');
      return;
    }

    // Validation: one must be exactly 5, the other < 5
    const isValid = (hScore === 5 && aScore < 5) || (aScore === 5 && hScore < 5);
    if (!isValid) {
      setScoreError('Invalid score! One team must score exactly 5 and the other less than 5.');
      return;
    }

    setSubmittingScore(true);

    try {
      const res = await fetch(`/api/matches/${scoreModalMatch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ home_score: hScore, away_score: aScore }),
      });

      const data = await res.json();

      if (!res.ok) {
        setScoreError(data.error || 'Failed to update score');
      } else {
        setScoreModalMatch(null);
        setHomeScoreInput('');
        setAwayScoreInput('');
        // Re-fetch details to update leaderboard and lists
        fetchTournamentDetails(activeId!);
      }
    } catch (err) {
      setScoreError('Network error occurred');
    } finally {
      setSubmittingScore(false);
    }
  };

  // Delete Tournament
  const handleDeleteTournament = async () => {
    if (!activeId) return;
    if (!confirm('Are you sure you want to delete this tournament? This will erase all teams, players and matches.')) {
      return;
    }

    setLoadingDetails(true);

    try {
      const res = await fetch(`/api/tournaments/${activeId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setActiveId(null);
        setTournamentDetails(null);
        fetchTournamentsList();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete tournament');
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Complete Tournament Status Update
  const handleCompleteTournament = async () => {
    if (!activeId) return;

    try {
      const res = await fetch(`/api/tournaments/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' }),
      });

      if (res.ok) {
        fetchTournamentDetails(activeId);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to complete tournament');
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred');
    }
  };

  // Calculate unique rounds for filtering
  const getUniqueRounds = () => {
    if (!tournamentDetails?.matches) return [];
    const rounds = tournamentDetails.matches.map((m) => m.round);
    return Array.from(new Set(rounds)).sort((a, b) => a - b);
  };

  // Filter matches based on criteria
  const getFilteredMatches = () => {
    if (!tournamentDetails?.matches) return [];
    const list = tournamentDetails.matches;

    if (matchFilter === 'all') {
      return list;
    } else if (matchFilter === 'pending') {
      return list.filter((m) => !m.played);
    } else {
      const roundNum = parseInt(matchFilter, 10);
      return list.filter((m) => m.round === roundNum);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-gray-50 text-gray-900 font-sans min-h-screen">
      {/* Navbar Header */}
      <header className="sticky top-0 bg-indigo-900 text-white shadow-md z-40 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveId(null); setTournamentDetails(null); }}>
          <Trophy className="h-6 w-6 text-yellow-400" />
          <h1 className="font-bold text-lg sm:text-xl tracking-tight">Foosball MS</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-indigo-850 px-2 py-1 rounded text-xs sm:text-sm">
            <User className="h-4 w-4" />
            <span>{username}</span>
          </div>
          <button
            onClick={() => setPollingActive(!pollingActive)}
            title={pollingActive ? 'Pause auto-sync' : 'Resume auto-sync'}
            className={`p-1 rounded hover:bg-indigo-800 ${pollingActive ? 'text-green-400' : 'text-gray-400'}`}
          >
            <RefreshCw className={`h-4 w-4 ${pollingActive ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-xs sm:text-sm px-2.5 py-1 rounded transition-colors text-white"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 max-w-4xl w-full mx-auto pb-24">
        {activeId === null ? (
          /* Tournaments List Dashboard */
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Tournaments</h2>
                <p className="text-sm text-gray-500">Create and track foosball leagues</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-medium text-sm px-3.5 py-2 rounded-lg shadow transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create New</span>
              </button>
            </div>

            {loadingList ? (
              <div className="text-center py-12 text-gray-500">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                Loading tournaments...
              </div>
            ) : tournaments.length === 0 ? (
              <div className="text-center bg-white p-8 rounded-xl border border-gray-200 text-gray-500">
                <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="font-semibold text-lg">No tournaments found</p>
                <p className="text-sm mt-1 text-gray-400">Get started by creating a new tournament above</p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {tournaments.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTournament(t.id)}
                    className="bg-white border border-gray-200 hover:border-indigo-300 rounded-xl p-4 shadow-sm hover:shadow transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 h-1.5 w-full bg-indigo-500" />
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-800 text-lg leading-snug">{t.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 font-semibold rounded-full ${
                          t.status === 'Completed'
                            ? 'bg-green-100 text-green-800'
                            : t.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 text-xs text-gray-500 border-t border-gray-50 pt-3">
                      <div>
                        <span className="block font-bold text-gray-700 text-sm">{t.player_count ?? 0}</span>
                        Players
                      </div>
                      <div>
                        <span className="block font-bold text-gray-700 text-sm">{t.team_count ?? 0}</span>
                        Teams
                      </div>
                      <div>
                        <span className="block font-bold text-gray-700 text-sm">{t.match_count ?? 0}</span>
                        Matches
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(t.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-indigo-600 font-medium flex items-center gap-0.5">
                        Manage <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Single Tournament Workspace */
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
              <button
                onClick={() => { setActiveId(null); setTournamentDetails(null); }}
                className="flex items-center gap-1.5 text-indigo-700 hover:text-indigo-900 text-sm font-medium"
              >
                <Home className="h-4 w-4" />
                <span>All Tournaments</span>
              </button>
              <button
                onClick={handleDeleteTournament}
                className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-semibold"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </div>

            {loadingDetails || !tournamentDetails ? (
              <div className="text-center py-12 text-gray-500">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-600" />
                Loading tournament workspace...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header Information */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                        {tournamentDetails.tournament.name}
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">
                        Created on {new Date(tournamentDetails.tournament.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span
                        className={`text-sm px-3 py-1 font-bold rounded-full ${
                          tournamentDetails.tournament.status === 'Completed'
                            ? 'bg-green-100 text-green-800'
                            : tournamentDetails.tournament.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {tournamentDetails.tournament.status}
                      </span>
                    </div>
                  </div>

                  {/* Actions for Draft Status */}
                  {tournamentDetails.tournament.status === 'Draft' && (
                    <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                      <h4 className="font-semibold text-indigo-900 text-sm mb-1">Teams & Matches Not Generated</h4>
                      <p className="text-xs text-indigo-700 mb-4">
                        This tournament is currently in Draft. Add seed flags below, then trigger randomization to create pairs and double round-robin matches.
                      </p>
                      <button
                        onClick={handleGenerateTournament}
                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg shadow-sm transition-colors"
                      >
                        <Play className="h-4 w-4" />
                        <span>Generate Teams & Matches</span>
                      </button>
                    </div>
                  )}

                  {/* Actions to Complete Tournament */}
                  {tournamentDetails.tournament.status === 'In Progress' && (
                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-xs">
                      <span className="text-gray-500 font-medium">
                        {tournamentDetails.matches.filter((m) => m.played).length} / {tournamentDetails.matches.length} matches completed
                      </span>
                      {tournamentDetails.matches.every((m) => m.played) && (
                        <button
                          onClick={handleCompleteTournament}
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded font-bold transition-colors"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Complete Tournament</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Tournament details tabs (Only if generated) */}
                {tournamentDetails.tournament.status !== 'Draft' ? (
                  <div className="space-y-4">
                    {/* Tab Selection */}
                    <div className="flex border-b border-gray-200 bg-white rounded-t-lg overflow-hidden">
                      <button
                        onClick={() => setActiveTab('leaderboard')}
                        className={`flex-1 py-3 text-center font-bold text-sm border-b-2 transition-all ${
                          activeTab === 'leaderboard'
                            ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Leaderboard
                      </button>
                      <button
                        onClick={() => setActiveTab('matches')}
                        className={`flex-1 py-3 text-center font-bold text-sm border-b-2 transition-all ${
                          activeTab === 'matches'
                            ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Matches ({tournamentDetails.matches.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('teams')}
                        className={`flex-1 py-3 text-center font-bold text-sm border-b-2 transition-all ${
                          activeTab === 'teams'
                            ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Teams ({tournamentDetails.teams.length})
                      </button>
                    </div>

                    {/* Tab panels */}
                    {activeTab === 'leaderboard' && (
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                          <h3 className="font-bold text-gray-800 text-sm sm:text-base">Leaderboard Ranking</h3>
                          <span className="text-[10px] text-gray-400 font-mono">Sorted by: Pts → GD → GF</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs sm:text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 text-gray-400 bg-gray-50/20 font-semibold">
                                <th className="py-2.5 px-3 w-10 text-center">Pos</th>
                                <th className="py-2.5 px-3">Team Name</th>
                                <th className="py-2.5 px-2 text-center w-10">P</th>
                                <th className="py-2.5 px-2 text-center w-10">W</th>
                                <th className="py-2.5 px-2 text-center w-10">L</th>
                                <th className="py-2.5 px-2 text-center w-10">GF</th>
                                <th className="py-2.5 px-2 text-center w-10">GA</th>
                                <th className="py-2.5 px-2 text-center w-12">GD</th>
                                <th className="py-2.5 px-3 text-center font-bold text-indigo-700 bg-indigo-50/10 w-16">Pts</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tournamentDetails.leaderboard.map((row, idx) => (
                                <tr
                                  key={row.team_id}
                                  className="border-b border-gray-150 hover:bg-gray-50/50 transition-colors"
                                >
                                  <td className="py-3 px-3 text-center font-bold text-gray-500">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3 px-3 font-semibold text-gray-800 truncate max-w-[160px] sm:max-w-none">
                                    {row.team_name}
                                  </td>
                                  <td className="py-3 px-2 text-center">{row.played}</td>
                                  <td className="py-3 px-2 text-center text-green-600 font-medium">{row.wins}</td>
                                  <td className="py-3 px-2 text-center text-red-500">{row.losses}</td>
                                  <td className="py-3 px-2 text-center text-gray-500">{row.gf}</td>
                                  <td className="py-3 px-2 text-center text-gray-500">{row.ga}</td>
                                  <td className={`py-3 px-2 text-center font-semibold ${row.gd > 0 ? 'text-green-600' : row.gd < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                    {row.gd > 0 ? `+${row.gd}` : row.gd}
                                  </td>
                                  <td className="py-3 px-3 text-center font-black text-indigo-700 bg-indigo-55/10">
                                    {row.points}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {activeTab === 'matches' && (
                      <div className="space-y-4">
                        {/* Filters */}
                        <div className="flex flex-wrap gap-2 bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-xs">
                          <button
                            onClick={() => setMatchFilter('all')}
                            className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                              matchFilter === 'all'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            All Matches
                          </button>
                          <button
                            onClick={() => setMatchFilter('pending')}
                            className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                              matchFilter === 'pending'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            Pending
                          </button>
                          {getUniqueRounds().map((roundNum) => (
                            <button
                              key={roundNum}
                              onClick={() => setMatchFilter(roundNum.toString())}
                              className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                                matchFilter === roundNum.toString()
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              Round {roundNum}
                            </button>
                          ))}
                        </div>

                        {/* Matches List Grid */}
                        <div className="grid gap-3 grid-cols-1">
                          {getFilteredMatches().map((m) => (
                            <div
                              key={m.id}
                              onClick={() => {
                                if (tournamentDetails.tournament.status === 'Completed') return;
                                setScoreModalMatch(m);
                                setHomeScoreInput(m.home_score !== null ? m.home_score.toString() : '');
                                setAwayScoreInput(m.away_score !== null ? m.away_score.toString() : '');
                                setScoreError('');
                              }}
                              className={`bg-white border rounded-xl p-3 shadow-sm transition-all flex items-center justify-between gap-4 select-none ${
                                tournamentDetails.tournament.status !== 'Completed'
                                  ? 'hover:border-indigo-300 hover:shadow cursor-pointer'
                                  : ''
                              } ${m.played ? 'border-gray-200 opacity-90' : 'border-indigo-150'}`}
                            >
                              {/* Left column: round and home team info */}
                              <div className="flex-1 min-w-0">
                                <span className="inline-block text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold mb-2">
                                  Round {m.round}
                                </span>
                                
                                {/* Home Team (White / Trắng) */}
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="h-3 w-3 rounded-full border border-gray-400 bg-white shadow-sm inline-block shrink-0" title="Home (White)" />
                                  <span className={`font-semibold text-sm truncate ${m.played && m.home_score === 5 ? 'text-indigo-900 font-extrabold' : 'text-gray-700'}`}>
                                    {m.home_team_name}
                                  </span>
                                </div>

                                {/* Away Team (Red / Đỏ) */}
                                <div className="flex items-center gap-2">
                                  <span className="h-3 w-3 rounded-full bg-red-600 inline-block shrink-0 shadow-sm" title="Away (Red)" />
                                  <span className={`font-semibold text-sm truncate ${m.played && m.away_score === 5 ? 'text-indigo-900 font-extrabold' : 'text-gray-700'}`}>
                                    {m.away_team_name}
                                  </span>
                                </div>
                              </div>

                              {/* Right column: score and status indicators */}
                              <div className="flex items-center gap-3 shrink-0">
                                {m.played ? (
                                  <div className="flex flex-col items-center bg-gray-50 border border-gray-150 px-3 py-2 rounded-lg font-bold text-gray-800 text-sm min-w-14 text-center">
                                    <span>{m.home_score}</span>
                                    <div className="h-[1px] w-full bg-gray-200 my-0.5" />
                                    <span>{m.away_score}</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center border border-dashed border-gray-300 px-3 py-2 rounded-lg text-[10px] font-bold text-gray-400 min-w-14 text-center hover:bg-gray-50 transition-colors">
                                    <Clock className="h-3.5 w-3.5 mb-1" />
                                    <span>Pending</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === 'teams' && (
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                        {tournamentDetails.teams.map((team, idx) => {
                          const player1 = tournamentDetails.players.find((p) => p.id === team.player1_id);
                          const player2 = tournamentDetails.players.find((p) => p.id === team.player2_id);

                          return (
                            <div
                              key={team.id}
                              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                            >
                              <h4 className="font-bold text-gray-800 text-base mb-3 border-b border-gray-50 pb-1.5 truncate">
                                {team.name}
                              </h4>
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                                  <span className="font-semibold text-gray-700">{player1?.name || 'Unknown'}</span>
                                  {player1?.is_seed && (
                                    <span className="bg-yellow-100 text-yellow-800 text-[9px] px-1.5 py-0.5 rounded font-bold">
                                      Seed
                                    </span>
                                  )}
                                </div>
                                <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                                  <span className="font-semibold text-gray-700">{player2?.name || 'Unknown'}</span>
                                  {player2?.is_seed && (
                                    <span className="bg-yellow-100 text-yellow-800 text-[9px] px-1.5 py-0.5 rounded font-bold">
                                      Seed
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Draft Players List View */
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                    <h3 className="font-bold text-gray-800 text-lg border-b border-gray-100 pb-2">
                      Registered Players ({tournamentDetails.players.length})
                    </h3>
                    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                      {tournamentDetails.players.map((p) => (
                        <div
                          key={p.id}
                          className="flex justify-between items-center p-3 rounded-lg border border-gray-150 bg-gray-50/50"
                        >
                          <span className="font-semibold text-sm text-gray-700">{p.name}</span>
                          {p.is_seed ? (
                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                              Seed
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">Regular</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE TOURNAMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in-50 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-250 flex justify-between items-center bg-indigo-900 text-white">
              <h3 className="font-bold text-lg">Create Tournament</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-indigo-800 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateTournament} className="flex-1 overflow-y-auto p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Tournament Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Autumn Foosball Cup 2026"
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              {/* Dynamic Players list */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Players ({newPlayers.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddPlayerField}
                    className="flex items-center gap-0.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Add Player</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                  {newPlayers.map((player, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-5 text-right">{idx + 1}.</span>
                      <input
                        type="text"
                        placeholder="Player Name"
                        value={player.name}
                        onChange={(e) => handlePlayerChange(idx, 'name', e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-550"
                      />
                      <label className="flex items-center gap-1 cursor-pointer shrink-0 text-xs select-none">
                        <input
                          type="checkbox"
                          checked={player.is_seed}
                          onChange={(e) => handlePlayerChange(idx, 'is_seed', e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-gray-300"
                        />
                        <span className="font-semibold text-gray-600">Seed</span>
                      </label>
                      {newPlayers.length > 6 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePlayerField(idx)}
                          className="text-red-500 hover:text-red-750"
                        >
                          <MinusCircle className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 leading-normal">
                  * Rules: Total player count must be an even number &ge; 6. Number of seed players must be &le; total player count / 2. Empty name rows will be automatically ignored.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-150 pt-4 flex gap-3 justify-end text-sm">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold shadow disabled:bg-indigo-400"
                >
                  {submittingForm ? 'Creating...' : 'Create Tournament'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCORE INPUT MODAL */}
      {scoreModalMatch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl overflow-hidden animate-in fade-in-50 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-250 flex justify-between items-center bg-indigo-900 text-white">
              <h3 className="font-bold text-sm sm:text-base">Enter Score (Round {scoreModalMatch.round})</h3>
              <button onClick={() => setScoreModalMatch(null)} className="p-1 hover:bg-indigo-800 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleScoreSubmit} className="p-5 space-y-4">
              {scoreError && (
                <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded text-xs text-red-700 flex items-start gap-1">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{scoreError}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Home Team Score (White) */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-3.5 w-3.5 rounded-full border border-gray-400 bg-white shadow-sm inline-block shrink-0" />
                    <span className="font-bold text-sm text-gray-800 truncate">{scoreModalMatch.home_team_name}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    required
                    placeholder="0"
                    value={homeScoreInput}
                    onChange={(e) => setHomeScoreInput(e.target.value)}
                    className="w-16 px-2.5 py-1.5 border border-gray-300 rounded text-center font-bold text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="text-center font-bold text-xs text-gray-400 uppercase tracking-widest my-1">— VS —</div>

                {/* Away Team Score (Red) */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-3.5 w-3.5 rounded-full bg-red-600 inline-block shrink-0 shadow-sm" />
                    <span className="font-bold text-sm text-gray-800 truncate">{scoreModalMatch.away_team_name}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    required
                    placeholder="0"
                    value={awayScoreInput}
                    onChange={(e) => setAwayScoreInput(e.target.value)}
                    className="w-16 px-2.5 py-1.5 border border-gray-300 rounded text-center font-bold text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded p-2.5 text-[10px] text-gray-500 leading-normal">
                💡 Rule: Exactly one team must score <strong>5</strong>, and the other team must score <strong>less than 5</strong> (e.g. 5-3, 0-5). Draws or scores like 5-5 are invalid.
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-150 pt-4 flex gap-3 justify-end text-sm">
                <button
                  type="button"
                  onClick={() => setScoreModalMatch(null)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-150 font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingScore}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold shadow disabled:bg-indigo-400"
                >
                  {submittingScore ? 'Saving...' : 'Save Score'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
