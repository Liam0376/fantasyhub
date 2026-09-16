// Fantasy Hub — main app
import { fetchLeague, fetchAnalytics } from '/lib/api.js';
import { renderTable, sortTable } from '/lib/table.js';

// State — week/season start null so the backend auto-detects the
// current NFL week instead of forcing week 1 on every league.
let league = null;
let analytics = null;
let currentWeek = null;
let currentSeason = null;
let sortState = { key: 'projected_points', dir: 'desc', tab: 'projections' };

// Projection columns
const PROJ_COLS = [
  { key: 'player_name', format: (v, r) => `${v}${r.injury_status ? ` <span class="injury">${r.injury_status}</span>` : ''}` },
  { key: 'position', format: v => `<span class="pos-badge pos-${v}">${v}</span>`, cls: 'pos' },
  { key: 'team' },
  { key: 'opponent_team' },
  { key: 'projected_points', cls: 'num', format: v => v?.toFixed(1) },
  { key: 'width', cls: 'num', format: v => `±${v?.toFixed(1)}` },
  { key: 'ros_points', cls: 'num', format: v => v?.toFixed(0) },
  { key: 'tier', format: v => `<span class="tier-badge tier-${v}">${v}</span>` },
];

// Auction columns
const AUCTION_COLS = [
  { key: 'player_name', format: (v, r) => `${v}${r.injury_status ? ` <span class="injury">${r.injury_status}</span>` : ''}` },
  { key: 'position', format: v => `<span class="pos-badge pos-${v}">${v}</span>`, cls: 'pos' },
  { key: 'team' },
  { key: 'projected_points', cls: 'num', format: v => v?.toFixed(1) },
  { key: 'vor', cls: 'num', format: v => v?.toFixed(1) },
  { key: 'auction_value', cls: 'num', format: v => `$${v}` },
  { key: 'tier', format: v => `<span class="tier-badge tier-${v}">${v}</span>` },
  { key: 'edge', format: v => `<span class="edge-${v?.toLowerCase()}">${v}</span>` },
];

// Extract league ID from URL or raw input
function extractLeagueId(input) {
  input = input.trim();
  // Full Sleeper URL
  const m = input.match(/sleeper\.app\/leagues?\/(\d+)/);
  if (m) return m[1];
  // Raw numeric ID
  if (/^\d+$/.test(input)) return input;
  return null;
}

// Import league
window.importLeague = async function() {
  const raw = document.getElementById('leagueInput').value;
  const leagueId = extractLeagueId(raw);
  if (!leagueId) {
    showError('Enter a valid Sleeper league URL or numeric ID');
    return;
  }

  const btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  hideError();
  showLoading('Importing league from Sleeper...');

  try {
    league = await fetchLeague(leagueId);
    currentSeason = league.season || null;

    showLoading('Computing auction values...');
    analytics = await fetchAnalytics(leagueId, currentWeek, currentSeason);
    // Adopt the backend-resolved week/season so the picker shows the
    // actual projections week, not a hardcoded default.
    if (analytics?.meta) {
      if (analytics.meta.week) currentWeek = analytics.meta.week;
      if (analytics.meta.season) currentSeason = analytics.meta.season;
      document.getElementById('weekLabel').textContent = `Week ${currentWeek}`;
    }

    showMain();
    render();
  } catch (e) {
    showLanding();
    showError(e.message || 'Failed to import league');
  } finally {
    btn.disabled = false;
  }
};

// Week navigation
window.changeWeek = function(delta) {
  const base = currentWeek || 1;
  currentWeek = Math.max(1, Math.min(18, base + delta));
  document.getElementById('weekLabel').textContent = `Week ${currentWeek}`;
  // Re-fetch analytics for new week
  if (league) {
    showLoading('Loading projections...');
    fetchAnalytics(league.league_id, currentWeek, currentSeason)
      .then(data => {
        analytics = data;
        if (data?.meta?.week) {
          currentWeek = data.meta.week;
          document.getElementById('weekLabel').textContent = `Week ${currentWeek}`;
        }
        render();
        hideLoading();
      })
      .catch(e => { hideLoading(); showError(`Failed to load week ${currentWeek}: ${e.message}`); });
  }
};

// Tab switching
window.switchTab = function(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${tab}`));
  sortState.tab = tab;
  render();
};

// Sort columns
document.addEventListener('click', e => {
  const th = e.target.closest('th.sortable');
  if (!th) return;
  const key = th.dataset.sort;
  if (sortState.key === key) {
    sortState.dir = sortState.dir === 'desc' ? 'asc' : 'desc';
  } else {
    sortState.key = key;
    sortState.dir = key === 'player_name' || key === 'position' || key === 'team' ? 'asc' : 'desc';
  }
  render();
});

// Filter
window.filterTable = function() {
  render();
};

// Render tables
function render() {
  const players = analytics?.players || [];
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const posFilter = document.getElementById('posFilter')?.value || '';

  let filtered = players.filter(p => {
    if (posFilter && p.position !== posFilter) return false;
    if (search) {
      const hay = `${p.player_name} ${p.team} ${p.position} ${p.opponent_team}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const sorted = sortTable(filtered, sortState.key, sortState.dir);
  sorted.forEach((p, i) => p._rank = i + 1);

  const isAuction = sortState.tab === 'auction';
  const cols = isAuction ? AUCTION_COLS : PROJ_COLS;
  const tbody = document.getElementById(isAuction ? 'auctionBody' : 'projBody');
  renderTable(tbody, sorted, cols, { emptyText: 'No players match filters' });

  // Update header — scoring format comes from the league's own
  // Sleeper scoring_settings (Standard/Half/PPR, TE premium, pass TD).
  if (league) {
    document.getElementById('leagueName').textContent = league.name;
    const scoringLabel = analytics?.meta?.scoring_format || '';
    const starters = (league.settings.roster_positions || []).filter(p => p !== 'BN' && p !== 'IR').length;
    document.getElementById('leagueMeta').textContent =
      `${league.settings.num_teams}-team · ${scoringLabel} · ${starters} starters`;
  }

  // Snake leagues have no auction budget — hide the auction tab and
  // show projections only instead of fake $200 values.
  const draftType = league?.settings?.draft_type || analytics?.meta?.draft_type || 'unknown';
  const auctionTab = document.querySelector('.tab[data-tab="auction"]');
  if (draftType && draftType !== 'auction' && draftType !== 'unknown') {
    if (auctionTab) auctionTab.style.display = 'none';
    if (sortState.tab === 'auction') window.switchTab('projections');
    const auctionPane = document.getElementById('tab-auction');
    if (auctionPane) auctionPane.innerHTML = `<div class="alert">This league drafts snake-style, so auction values don't apply.</div>`;
  } else if (auctionTab) {
    auctionTab.style.display = '';
  }

  // Update auction KPIs
  if (analytics?.meta) {
    document.getElementById('kpiBudget').textContent = analytics.meta.budget ? `$${analytics.meta.budget}` : '—';
    document.getElementById('kpiTeams').textContent = analytics.meta.num_teams ?? '—';
    document.getElementById('kpiPool').textContent = analytics.meta.total_budget ? `$${analytics.meta.total_budget.toLocaleString()}` : '—';
  }
}

// UI helpers
function showLanding() {
  document.getElementById('landing').style.display = 'flex';
  document.getElementById('loading').style.display = 'none';
  document.getElementById('main').style.display = 'none';
}

function showLoading(text) {
  document.getElementById('landing').style.display = 'none';
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('main').style.display = 'none';
  document.getElementById('loadingText').textContent = text || 'Loading...';
}

function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

function showMain() {
  document.getElementById('landing').style.display = 'none';
  document.getElementById('loading').style.display = 'none';
  document.getElementById('main').style.display = 'block';
}

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.style.display = 'block';
}

function hideError() {
  document.getElementById('error').style.display = 'none';
}

// Allow Enter key to submit
document.getElementById('leagueInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') importLeague();
});
