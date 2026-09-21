import{C as b,e as c,i as m,t as f,v as x,D as g,m as _,p as w,j as $,q as k}from"./index-DBtAjWzC.js";import{s as P}from"./relevance-C3SYLMeE.js";function h(e,o){return e==null?'<span class="mono" style="background:var(--surface-raised); color:var(--text-faint); border-radius:6px; padding:2px 6px; font-weight:700">—</span>':`<span class="mono" style="background:${o?"var(--emerald-dim)":"var(--surface-raised)"}; color:${o?"var(--emerald)":"var(--text-muted)"}; border-radius:6px; padding:2px 6px; font-weight:700">${Math.round(e*100)}%</span>`}function A(e){return`<span class="badge" style="background:${e?"var(--surface-raised)":"var(--sky-dim, var(--surface-raised))"}; color:${e?"var(--text-muted)":"var(--sky, var(--text))"}; border:1px solid var(--border)">${e?"FINAL":"UPCOMING"}</span>`}const S={passing_yards:"Pass Yds",passing_tds:"Pass TD",rushing_yards:"Rush Yds",receiving_yards:"Rec Yds",receptions:"Rec",carries:"Carries",anytime_td:"Any TD"};function L(e){const o=S[e.market]||e.market,s=e.market==="anytime_td",r=s?e.p_yes!=null?`${(Number(e.p_yes)*100).toFixed(0)}%`:"—":Number(e.fair_line).toFixed(1),t=s?e.actual_p_yes==null?null:e.actual_p_yes>0?"YES":"NO":e.actual==null?null:Number(e.actual).toFixed(1),i=!s&&e.sigma!=null?` <span style="color:var(--text-faint); font-weight:400">±${Number(e.sigma).toFixed(1)}</span>`:"",d=t==null?"":`
        <div style="margin-top:3px; padding-top:3px; border-top:1px dashed var(--border)">
          <span style="font-size:9px; color:var(--text-faint); text-transform:uppercase">Actual</span>
          <span class="mono" style="font-weight:700; font-size:13px; color:var(--emerald); margin-left:4px">${t}</span>
        </div>`;return`
      <div style="background:var(--surface-raised); border-radius:8px; padding:6px 8px; min-width:76px">
        <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.03em">${c(o)}</div>
        <div class="mono" style="font-weight:700; font-size:14px">${r}${i}</div>
        ${d}
      </div>`}function C(e){const o=(e.position||"UNK").toUpperCase(),s=e.team||"",r=e.available===!1;return`
    <div class="player-card-v2" data-pid="${m(e.playerId)}" style="--team-accent:${_(s)}; ${r?"opacity:.6":""}">
      <div class="pc-header">
        ${w({player_id:e.playerId,sleeper_id:e.sleeperId,player_name:e.name,position:o,team:s},44)}
        <div class="pc-info">
          <div class="pc-name">${c(e.name)}</div>
          <div class="pc-meta">${$(o)} ${f(s,16)} ${c(s)}</div>
        </div>
      </div>
      <div class="pc-badges" style="margin-top:6px">${k(e.injuryStatus)}</div>
      ${r?'<div style="margin-top:4px; font-size:11px; color:var(--amber)">Projection may be stale — player is not expected to play.</div>':""}
      <div class="pc-details" style="flex-wrap:wrap; gap:6px; margin-top:8px">
        ${e.rows.map(L).join("")}
      </div>
    </div>`}function N(e,o=!1){const s=new Map;for(const t of e){s.has(t.player_id)||s.set(t.player_id,{playerId:t.player_id,sleeperId:t.sleeper_id,name:t.player_name,position:t.position,team:t.team,injuryStatus:t.injury_status,available:t.available,rows:[],totalFair:0,totalActual:0,hasActual:!1});const i=s.get(t.player_id);i.rows.push(t),i.totalFair+=Number(t.fair_line)||0,t.actual!=null&&(i.totalActual+=Number(t.actual)||0,i.hasActual=!0),t.actual_p_yes!=null&&(i.totalActual+=t.actual_p_yes?1:0,i.hasActual=!0)}const r=[...s.values()].map(t=>({...t,totalActual:t.hasActual?t.totalActual:null}));return P(r,{},o)}let l=null;function F(){l&&(l.innerHTML="")}async function M(e,o,s,r=!1){l||(l=document.createElement("div"),l.id="gamePropsModalRoot",document.body.appendChild(l));const t=o.replace(","," @ ");l.innerHTML=`
    <div class="player-modal-backdrop" id="gamePropsBackdrop">
      <div class="player-modal-card card" role="dialog" aria-modal="true" aria-label="Player props for ${m(t)}" tabindex="-1" style="max-width:920px">
        <button class="modal-close-btn" id="gamePropsCloseBtn" aria-label="Close">✕</button>
        <h3 style="margin:0 0 12px">${c(t)}</h3>
        <div id="gamePropsBody" style="font-size:13px; color:var(--text-muted)">Loading…</div>
      </div>
    </div>`;const i=l.querySelector("#gamePropsBackdrop"),d=l.querySelector(".player-modal-card");requestAnimationFrame(()=>requestAnimationFrame(()=>{i.classList.add("show"),d.classList.add("show")}));let a=()=>{};const p=()=>{try{a()}catch{}F()};a=x(d,e,p),l.querySelector("#gamePropsCloseBtn").addEventListener("click",p),i.addEventListener("click",v=>{v.target===i&&p()});let n;try{n=await g({teams:o,week:s})}catch{n={players:[],meta:{cold:!0}}}const u=N(n&&n.players||[],r),y=l.querySelector("#gamePropsBody");y&&(y.innerHTML=u.length?`
    <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(min(250px,100%),1fr)); gap:10px">
      ${u.map(C).join("")}
    </div>
    <div style="margin-top:10px; font-size:11px; color:var(--text-faint)">
      ${r?"Final game — cards ordered by actual box-score production.":`Fair = model projection median for this stat. "Actual" appears once that week's real box score has posted.`}
      Injury status is fetched live — a flagged player's projection may not reflect their real availability.
    </div>`:'<div style="padding:8px 0">No projected players found for this game/week.</div>')}async function R(e){const o=new URLSearchParams(location.hash.split("?")[1]||""),s=o.get("week")?Number(o.get("week")):null;let r;try{r=await b({week:s})}catch{r={games:[],meta:{cold:!0}}}const t=r&&r.games||[],i=!!(r&&r.meta&&r.meta.cold),d=r.meta&&r.meta.week||s||"";e.innerHTML=`
    <div class="hero reveal in">
      <h1>Props</h1>
      <p>Market-consensus game predictions. Click a game for player props.</p>
    </div>

    <div class="card reveal in" role="note" aria-label="Responsible gambling notice"
         style="margin-top:12px; border-left:4px solid var(--amber)">
      <div class="card-body" style="font-size:13px; color:var(--text)">
        <strong>Entertainment only.</strong> Predictions are uncertain estimates, not guarantees.
        Never bet more than you can afford to lose.
      </div>
    </div>

    <div class="card reveal in" style="margin-top:16px">
      <div class="card-body">
        <div class="filters week-picker-scroll" style="overflow-x:auto; flex-wrap:nowrap; max-width:100%; padding-bottom:4px">
          ${Array.from({length:18},(a,p)=>p+1).map(a=>`<button class="chip ${String(a)===String(d)?"active":""}" data-week="${a}" title="Show week ${a}" style="flex-shrink:0">${a}</button>`).join("")}
        </div>
      </div>
    </div>

    <div class="card reveal in" style="margin-top:16px">
      <div class="card-header"><h3>Week ${c(String(d||""))} games</h3><span class="kicker">${t.length?`${t.length} games · market consensus`:i?"model cold":"no schedule"}</span></div>
      <div class="card-body" style="padding:0">
        ${i?`
          <div style="padding:20px; font-size:13px; color:var(--text-muted)">
            Model cache is cold — run <code class="inline">POST /refresh</code> (Dashboard → Sync) to load the schedule.
          </div>`:t.length?`
          <div class="responsive-view">
            <div class="table-wrap" style="border:0; border-radius:0"><table>
              <thead><tr><th>Matchup</th><th>Win %</th><th>Predicted score</th><th>Status</th></tr></thead>
              <tbody>
                ${t.map(a=>{const n=a.home_win_prob!=null&&a.away_win_prob!=null&&a.home_win_prob>=a.away_win_prob,u=`${a.away_team},${a.home_team}`,y=!a.final&&a.source!=="market_consensus"?' <span class="badge" style="background:var(--surface-raised); color:var(--text-faint); border:1px solid var(--border)">lines pending</span>':"";return`
                  <tr class="props-game-row" data-teams="${m(u)}" data-final="${a.final?"1":""}" tabindex="0"
                      aria-label="View player props for ${m(a.away_team||"")} at ${m(a.home_team||"")}"
                      style="cursor:pointer" title="Click to browse this game's player props">
                    <td>
                      <div style="display:flex; align-items:center; gap:6px">${f(a.away_team,20)}<span style="font-weight:${n?400:700}">${c(a.away_team||"")}</span></div>
                      <div style="display:flex; align-items:center; gap:6px; margin-top:2px">${f(a.home_team,20)}<span style="font-weight:${n?700:400}">${c(a.home_team||"")}</span></div>
                    </td>
                    <td class="mono">
                      <div>${h(a.away_win_prob,!n)}</div>
                      <div style="margin-top:4px">${h(a.home_win_prob,n)}</div>
                    </td>
                    <td class="mono">
                      ${a.final&&a.actual_away_score!=null?`<span style="font-weight:700">${a.actual_away_score}</span><br><span class="faint" style="font-size:11px">pred ${a.predicted_away_score!=null?Number(a.predicted_away_score).toFixed(1):"—"}</span>`:a.predicted_away_score!=null?`${Number(a.predicted_away_score).toFixed(1)}`:"—"}<br>
                      ${a.final&&a.actual_home_score!=null?`<span style="font-weight:700">${a.actual_home_score}</span><br><span class="faint" style="font-size:11px">pred ${a.predicted_home_score!=null?Number(a.predicted_home_score).toFixed(1):"—"}</span>`:a.predicted_home_score!=null?`${Number(a.predicted_home_score).toFixed(1)}`:"—"}
                    </td>
                    <td>${A(a.final)}${y}</td>
                  </tr>`}).join("")}
              </tbody>
            </table></div>
          </div>
          <div style="padding:10px 16px; font-size:11px; color:var(--text-faint)">
            Win% and predicted score are real market consensus (spread/total/moneyline, devigged) — not this app's own model.
            Final games show the actual score alongside the prediction for comparison. Games whose books haven't posted lines yet show — but stay clickable for props.
          </div>`:`
          <div style="padding:20px; font-size:13px; color:var(--text-muted)">
            No schedule loaded for this week yet.
          </div>`}
      </div>
    </div>`,j(e),z(e,d)}function j(e,o){e.querySelectorAll("[data-week]").forEach(s=>{s.addEventListener("click",()=>{const r=s.getAttribute("data-week");location.hash=`props${r?`?week=${r}`:""}`})})}function z(e,o){e.querySelectorAll(".props-game-row").forEach(s=>{const r=()=>M(s,s.getAttribute("data-teams"),o,s.getAttribute("data-final")==="1");s.addEventListener("click",r),s.addEventListener("keydown",t=>{(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),r())})})}export{R as renderProps};
