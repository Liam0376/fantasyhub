// Fantasy Hub — API client
const API_BASE = '/api';

export async function fetchLeague(leagueId) {
  const res = await fetch(`${API_BASE}/league?id=${encodeURIComponent(leagueId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch league (${res.status})`);
  }
  return res.json();
}

export async function fetchProjections(week, season) {
  const params = new URLSearchParams();
  if (week) params.set('week', week);
  if (season) params.set('season', season);
  const res = await fetch(`${API_BASE}/projections?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch projections (${res.status})`);
  return res.json();
}

export async function fetchAnalytics(leagueId, week, season) {
  const params = new URLSearchParams({ league_id: leagueId });
  if (week) params.set('week', week);
  if (season) params.set('season', season);
  const res = await fetch(`${API_BASE}/analytics?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch analytics (${res.status})`);
  return res.json();
}
