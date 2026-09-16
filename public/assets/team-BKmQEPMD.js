import{d as X,b as q,g as Q,h as J,s as Z,i as w,e as n,l as ee,p as T,j as E,o as j,k as ae,f as te,m as se,t as W,n as O,q as re}from"./index-CIIdx54w.js";import{g as ie,s as L,r as ne,b as oe}from"./teamSelector-CELYKD7S.js";import{c as de}from"./vbdAuction-Bn4eSdiY.js";import{a as le,e as ce}from"./slots-CS6N-R0a.js";import"./auctionMath-C3MdTGNI.js";async function pe(e){const o=await X().catch(()=>null),v=(o==null?void 0:o.rosters)||(o==null?void 0:o.teams)||null,b=(o==null?void 0:o.leagueRosters)||(o==null?void 0:o.allTeams)||[];let r=ie();!r&&b.length&&(r=String(b[0].roster_id),L(r));let d=null;if(v&&r&&(v[r]||v[Number(r)])){const a=v[r]||v[Number(r)];d={starters:a.starters||[],bench:a.bench||[],reserve:a.reserve||[],myRoster:a.starters||[],teamMeta:a.team_info||a.teamMeta||{},team_info:a.team_info||a.teamMeta||{},leagueRosters:b,allTeams:b}}else if(d=await q(r?{roster_id:r}:{}).catch(()=>({starters:[],bench:[],reserve:[],leagueRosters:[],allTeams:[]})),!r){const a=d.leagueRosters||d.allTeams||[];a.length&&(r=String(a[0].roster_id),L(r))}const y=await Q({limit:800}).catch(()=>({players:[]})),z=b.length?b:d.leagueRosters||d.allTeams||[],h=d.teamMeta||d.team_info||{},C=new Map;(y.players||[]).forEach(a=>{a.player_id&&C.set(String(a.player_id),a),a.player_name&&C.set(a.player_name.toLowerCase(),a)});const c=await J(te,ae).catch(()=>null),U={vbdParams:de(y.players||[],c),compPlayers:y.players||[]},G=d.starters||d.myRoster||[],N=d.bench||[],Y=d.reserve||[],{starters:f,bench:H}=le(G,N,U),S=Y.map((a,t)=>ce({...a,slot:`IR${t+1}`},null,{...U,defaultSlot:`IR${t+1}`})),u=H,x=[...f,...u,...S];let k=`#— of ${c?c.teams:"?"}`;try{if(v&&typeof v=="object"){const t=Object.entries(v).map(([i,s])=>{const p=((s==null?void 0:s.starters)||(s==null?void 0:s.myRoster)||[]).reduce(($,M)=>$+Number(M.projected_points||0),0),m=(s==null?void 0:s.team_info)||(s==null?void 0:s.teamMeta)||{};return{roster_id:String(m.roster_id||i||""),fpts:p}}).sort((i,s)=>s.fpts-i.fpts).findIndex(i=>String(i.roster_id)===String(r));t!==-1&&(k=`#${t+1} of ${c?c.teams:"?"}`)}else if(Array.isArray(o==null?void 0:o.league_leaderboard)&&o.league_leaderboard.length){const a=o.league_leaderboard.findIndex(t=>String(t.roster_id)===String(r));a!==-1&&(k=`#${a+1} of ${c?c.teams:"?"}`)}else if(Array.isArray(d.league_leaderboard)&&d.league_leaderboard.length){const a=d.league_leaderboard.findIndex(t=>String(t.roster_id)===String(r));a!==-1&&(k=`#${a+1} of ${c?c.teams:"?"}`)}}catch{}const _=x.reduce((a,t)=>a+t.gridironAuction,0),P=x.reduce((a,t)=>a+t.marketAuction,0),F=f.reduce((a,t)=>a+t.weekly,0),D=f.reduce((a,t)=>a+t.season,0),R=a=>{const t=f.filter($=>$.position===a||a==="WR"&&$.slot.startsWith("FLEX")&&$.position==="WR"||a==="RB"&&$.slot.startsWith("FLEX")&&$.position==="RB"),i=t.reduce(($,M)=>$+M.weekly,0),s=t.length||1,l=i/s;let p="SOLID",m="badge-amber";return a==="QB"?l>=18?(p="ELITE",m="badge-emerald"):l<14&&(p="WEAK",m="badge-crimson"):a==="RB"?l>=12?(p="STRONG",m="badge-emerald"):l<8&&(p="WEAK",m="badge-crimson"):a==="WR"?l>=14?(p="STRONG",m="badge-emerald"):l<9&&(p="WEAK",m="badge-crimson"):a==="TE"&&(l>=11?(p="STRONG",m="badge-emerald"):l<7&&(p="WEAK",m="badge-crimson")),{pos:a,totalPts:i.toFixed(1),avg:l.toFixed(1),count:t.length,label:p,cls:m}},V=[R("QB"),R("RB"),R("WR"),R("TE")],K=[5,6,7,8,9,10,11,12,13,14],A={};x.forEach(a=>{const t=a.bye_week||a.bye||null;t&&(A[t]=(A[t]||0)+1)});const g=[];u.forEach(a=>{a.weekly<5||f.forEach(t=>{if((a.position===t.position||["RB","WR","TE"].includes(a.position)&&t.slot.startsWith("FLEX"))&&a.upper>=t.weekly){const s=Number((a.upper-t.weekly).toFixed(1));g.push({benchPlayer:a,starterPlayer:t,overlap:s,advice:`Bench ${a.player_name} (${a.position}) ceiling (${a.upper.toFixed(1)} pts) overlaps Starter ${t.player_name} (${t.slot}) point (${t.weekly.toFixed(1)} pts).`})}})}),g.sort((a,t)=>t.overlap-a.overlap),e.innerHTML=`
    <!-- Executive Command Center Header -->
    <div class="team-hub-header reveal in">
      <div class="team-hero-card card" style="border-top:1px solid var(--amber)">
        <div class="team-hero-top">
          <div class="team-owner-info">
            <div class="team-owner-avatar">
              ${(()=>{const a=Z(h.avatar_url);return a?`<img src="${w(a)}" alt="${n(h.display_name)}" class="owner-img" />`:`<div class="owner-avatar-fallback">${n((h.display_name||h.owner_name||"T").charAt(0).toUpperCase())}</div>`})()}
            </div>
            <div>
              <div class="team-title-row">
                <h1 class="team-name">${n(h.team_name||h.display_name||"Team Hub")}</h1>
                <span class="badge badge-owner">Owner: @${n(h.display_name||h.owner_name||"user")}</span>
                <span class="badge badge-amber mono" style="font-size:12px; font-weight:700" aria-live="polite">Rank ${k}</span>
              </div>
              <div class="team-sub-row faint" style="margin-top:4px">
                Roster #${h.roster_id||r} <span style="color:var(--text-faint)">·</span> ${n(ee(c||{}))}
                <br><span class="micro">2 FLEX</span>
              </div>
            </div>
          </div>
          <div class="team-selector-header-box">
            <span class="kicker" style="display:block; margin-bottom:4px">Switch Team</span>
            ${ne(z,r)}
          </div>
        </div>

        <!-- Executive Financial & Power KPI Grid -->
        <div class="team-kpi-grid">
          <div class="kpi-card">
            <span class="kicker">Roster Rank</span>
            <div class="mono kpi-val" style="color:var(--amber)">${k}</div>
            <span class="micro faint">${c?c.teams:"?"}-Team Starter FPTS Leaderboard</span>
          </div>
          <div class="kpi-card">
            <span class="kicker">Total Model $</span>
            <div class="mono kpi-val" style="color:var(--emerald)">$${_}</div>
            <span class="micro faint">Sum of VBD auction values</span>
          </div>
          <div class="kpi-card">
            <span class="kicker">Total Market Consensus $</span>
            <div class="mono kpi-val" style="color:var(--sky)">$${P}</div>
            <div class="micro ${_>=P?"text-good":"text-bad"}">
              ${_>=P?"+":""}$${_-P} Value Edge
            </div>
          </div>
          <div class="kpi-card">
            <span class="kicker">Starter pts/wk</span>
            <div class="mono kpi-val" style="color:var(--amber)">${F.toFixed(1)} <span class="kpi-unit">pts/wk</span></div>
            <span class="micro faint">17-Game: ${D.toFixed(0)} pts</span>
          </div>
        </div>

        <!-- Position Group Heatmap & Bye Week Matrix -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:12px; padding-top:12px; border-top:1px solid var(--border)">
          <div>
            <span class="kicker" style="display:block; margin-bottom:6px">Position Group Strength Heatmap</span>
            <div style="display:flex; gap:8px; flex-wrap:wrap">
              ${V.map(a=>`
                <div style="background:var(--surface-raised); border:1px solid var(--border); border-radius:8px; padding:6px 10px; flex:1; min-width:80px">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px">
                    <span class="mono" style="font-weight:700; font-size:12px">${a.pos}</span>
                    <span class="badge ${a.cls} micro">${a.label}</span>
                  </div>
                  <div class="mono" style="font-size:13px; font-weight:700; color:var(--text)">${a.totalPts} <span class="micro faint">pts</span></div>
                </div>
              `).join("")}
            </div>
          </div>

          <div>
            <span class="kicker" style="display:block; margin-bottom:6px">Bye Week Distribution Matrix</span>
            <div class="bye-pills">
              ${K.map(a=>{const t=A[a]||0;return`<span class="bye-pill ${t>=3?"badge-crimson":t>0?"active":""}" title="Week ${a}: ${t} player(s) on bye">W${a}: <strong>${t}</strong></span>`}).join("")}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Start/Sit Toss-up Advisor Card -->
    <div class="card reveal in" style="margin-top:16px; border:1px solid ${g.length?"rgba(245,158,11,0.35)":"var(--border)"}; background:${g.length?"rgba(245,158,11,0.03)":"var(--surface)"}">
      <div class="card-header" style="border-bottom:1px solid ${g.length?"rgba(245,158,11,0.2)":"var(--border)"}">
        <div style="display:flex; align-items:center; gap:8px">
          <span class="badge ${g.length?"badge-amber":"badge-emerald"}" style="font-size:12px">Start/Sit Advisor</span>
          <span class="micro faint">${g.length?`${g.length} Ceiling-Over-Point Decision(s)`:"Optimal Lineup Configured"}</span>
        </div>
      </div>
      <div class="card-body" style="padding:12px">
        ${g.length?`
          <div style="display:flex; flex-direction:column; gap:8px">
            ${g.slice(0,3).map(a=>`
              <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; background:var(--surface-raised); border:1px solid var(--border); border-radius:10px; padding:10px 12px; flex-wrap:wrap">
                <div style="display:flex; align-items:center; gap:12px">
                  <div style="display:flex; align-items:center; gap:6px">
                    ${T(a.benchPlayer,32)}
                    <div>
                      <span class="mono" style="font-weight:700; color:var(--amber); font-size:12px">[BENCH] ${n(a.benchPlayer.player_name)}</span>
                      <div class="micro faint">${E(a.benchPlayer.position)} · ${a.benchPlayer.weekly.toFixed(1)} pts (Ceiling: <strong style="color:var(--emerald)">${a.benchPlayer.upper.toFixed(1)}</strong>)</div>
                    </div>
                  </div>
                  <span class="mono text-bad" style="font-weight:700; font-size:13px">VS</span>
                  <div style="display:flex; align-items:center; gap:6px">
                    ${T(a.starterPlayer,32)}
                    <div>
                      <span class="mono" style="font-weight:700; font-size:12px">[${n(a.starterPlayer.slot)}] ${n(a.starterPlayer.player_name)}</span>
                      <div class="micro faint">${E(a.starterPlayer.position)} · ${a.starterPlayer.weekly.toFixed(1)} pts (Point: <strong style="color:var(--crimson)">${a.starterPlayer.weekly.toFixed(1)}</strong>)</div>
                    </div>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px">
                  <span class="badge badge-amber mono">Ceiling Overlap: +${a.overlap} pts</span>
                </div>
              </div>
            `).join("")}
          </div>
        `:`
          <div style="display:flex; align-items:center; gap:10px; color:var(--emerald)" class="mono micro">
            <span>✓ No bench player ceiling overlaps with a starter's point. Your starter configuration maximizes point expectation.</span>
          </div>
        `}
      </div>
    </div>

    <!-- Starters Table & Cards -->
    <div class="card reveal in" style="margin-top:16px">
      <div class="card-header">
        <div>
          <h3>Starters (${f.length} Slots)</h3>
          <span class="kicker">10 Starter Slots · Click any player row or card to open detail breakdown</span>
        </div>
        <span class="badge badge-amber mono" style="font-size:13px; font-weight:700">${F.toFixed(1)} Wk Pts</span>
      </div>
      <div class="card-body" style="padding:0">
        <div class="responsive-view">
          <div class="table-wrap" style="border:0; border-radius:0">
            <table aria-label="Starters">
              <caption class="sr-only">Starting lineup with projections and auction values</caption>
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Player</th>
                  <th>Matchup</th>
                  <th style="color:var(--amber)">Projected FPTS (Wk/17G)</th>
                  <th style="color:var(--amber)">Model $</th>
                  <th style="color:var(--sky)">Market $</th>
                  <th>Δ $</th>
                  <th>Edge</th>
                  <th>ECR</th>
                  <th>ADP</th>
                  <th>Tier</th>
                  <th>Conformal Interval</th>
                  <th>17G Stat Totals</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${f.map(a=>B(a)).join("")}
              </tbody>
            </table>
          </div>
          <div class="player-cards-grid" style="padding:12px">
            ${f.map(a=>I(a)).join("")}
          </div>
        </div>
      </div>
    </div>

    <!-- Bench Table & Cards -->
    <div class="card reveal in" style="margin-top:16px">
      <div class="card-header">
        <div>
          <h3>Bench Roster (${u.length} Players)</h3>
          <span class="kicker">Depth &amp; upside reserves</span>
        </div>
      </div>
      <div class="card-body" style="padding:0">
        <div class="responsive-view">
          <div class="table-wrap" style="border:0; border-radius:0">
            <table aria-label="Bench roster">
              <caption class="sr-only">Bench players with projections and auction values</caption>
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Player</th>
                  <th>Matchup</th>
                  <th style="color:var(--amber)">Projected FPTS (Wk/17G)</th>
                  <th style="color:var(--amber)">Model $</th>
                  <th style="color:var(--sky)">Market $</th>
                  <th>Δ $</th>
                  <th>Edge</th>
                  <th>ECR</th>
                  <th>ADP</th>
                  <th>Tier</th>
                  <th>Conformal Interval</th>
                  <th>17G Stat Totals</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${u.map(a=>B(a)).join("")}
              </tbody>
            </table>
          </div>
          <div class="player-cards-grid" style="padding:12px">
            ${u.map(a=>I(a)).join("")}
          </div>
        </div>
      </div>
    </div>

    <!-- IR / Reserve Table & Cards -->
    ${S.length?`
      <div class="card reveal in" style="margin-top:16px">
        <div class="card-header">
          <div>
            <h3>Injured Reserve (${S.length} Players)</h3>
            <span class="kicker">IR reserve slots</span>
          </div>
        </div>
        <div class="card-body" style="padding:0">
          <div class="responsive-view">
            <div class="table-wrap" style="border:0; border-radius:0">
              <table aria-label="Injured reserve">
                <caption class="sr-only">Injured reserve players</caption>
                <thead>
                  <tr>
                    <th>Slot</th>
                    <th>Player</th>
                    <th>Matchup</th>
                    <th>Projected FPTS</th>
                    <th>Model $</th>
                    <th>Market $</th>
                    <th>Δ $</th>
                    <th>Edge</th>
                    <th>ECR</th>
                    <th>Conformal Interval</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${S.map(a=>B(a,!0)).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `:""}

    <div id="playerModalContainer"></div>
  `,oe(()=>{pe(e)}),e.querySelectorAll("[data-player-row]").forEach(a=>{a.addEventListener("click",t=>{if(t.target.closest("button, a"))return;const i=a.getAttribute("data-player-row"),s=x.find(l=>String(l.player_id)===String(i));s&&j(s,e)})}),e.querySelectorAll("[data-player-id]").forEach(a=>{const t=()=>{const i=a.getAttribute("data-player-id"),s=x.find(l=>String(l.player_id)===String(i));s&&j(s,e)};a.addEventListener("click",i=>{i.stopPropagation(),t()}),a.tagName!=="BUTTON"&&a.addEventListener("keydown",i=>{(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),t())})})}function B(e,o=!1){const v=e.deltaAuction>0?"text-good":e.deltaAuction<0?"text-bad":"faint",b=e.deltaAuction>0?"+":"",r=e.edge==="BUY"?"badge-emerald":e.edge==="SELL"?"badge-crimson":"badge-faint",d=e.edge==="BUY"?"▲ ":e.edge==="SELL"?"▼ ":"";let y="—";return e.position==="QB"?y=`${e.season_pass_yd} PassYd · ${e.season_tds} TD`:e.position==="RB"?y=`${e.season_rush_yd} RushYd · ${e.season_rec_yd} RecYd · ${e.season_tds} TD`:e.position==="WR"||e.position==="TE"?y=`${e.season_rec_yd} RecYd · ${e.season_rec} Rec · ${e.season_tds} TD`:y=`${e.season_tds} TD`,`
    <tr data-player-row="${n(e.player_id)}" data-team="${e.team||""}" class="clickable-row" style="cursor:pointer; --team-accent:${se((e.team||"").toUpperCase())}">
      <td class="micro faint mono" style="font-weight:700"><button class="row-open-btn" data-player-id="${n(e.player_id)}" aria-label="Open details for ${w(e.player_name||e.player_id)}" title="Open details for ${w(e.player_name||e.player_id)}" style="background:none; border:0; padding:0; font:inherit; color:inherit; cursor:pointer; font-weight:700">${n(e.slot)}</button></td>
      <td>
        <div class="player-cell">
          ${T(e,32)}
          <div class="player-cell-info">
            <div class="player-cell-name">${n(e.player_name)} ${E(e.position)}</div>
            <div class="player-cell-sub">${W(e.team,14)} ${n(e.team||"—")}</div>
          </div>
        </div>
      </td>
      <td class="micro faint">${n(e.team)} vs ${n(e.opponent_team||"TBD")}</td>
      <td class="mono">
        <span style="color:var(--amber); font-weight:700">${e.weekly.toFixed(1)}</span>
        <span class="micro faint"> / ${e.season.toFixed(0)}</span>
      </td>
      <td class="mono"><span class="badge badge-amber" title="${e.gridironUncapped!=null&&e.gridironUncapped!==e.gridironAuction?`Uncapped VOR $${e.gridironUncapped}`:""}">$${e.gridironAuction}${e.gridironUncapped!=null&&e.gridironUncapped!==e.gridironAuction?` <span class="micro faint">($${e.gridironUncapped})</span>`:""}</span></td>
      <td class="mono"><span class="badge badge-sky" title="${e.marketUncapped!=null&&e.marketUncapped!==e.marketAuction?`Uncapped $${e.marketUncapped}`:""}">$${e.marketAuction}${e.marketUncapped!=null&&e.marketUncapped!==e.marketAuction?` <span class="micro faint">($${e.marketUncapped})</span>`:""}</span></td>
      <td class="mono ${v}">${b}$${e.deltaAuction}</td>
      <td><span class="badge ${r}" aria-label="${w(e.edge)}">${d}${e.edge}</span></td>
      <td class="mono micro">${e.ecr?`#${e.ecr}${e.ecrPos?` (${e.ecrPos})`:""}`:"—"}</td>
      <td class="mono micro faint">${e.adp?`#${e.adp}`:"—"}</td>
      <td>${e.tier?`<span class="badge badge-violet">T${e.tier}</span>`:"—"}</td>
      <td>
        ${O({point:e.weekly,low:e.lower,high:e.upper,width:e.width,min:0,max:35})}
      </td>
      <td class="mono micro faint">${n(y)}</td>
      <td>${re(e.injury_status)}</td>
    </tr>
  `}function I(e){return`
    <div class="player-card clickable-card" data-player-id="${n(e.player_id)}" tabindex="0" role="button" aria-label="Open details for ${w(e.player_name||e.player_id)}" style="cursor:pointer">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px">
        <div style="display:flex; align-items:center; gap:8px">
          ${T(e,36)}
          <div>
            <div style="font-weight:700; color:var(--text)">${n(e.player_name)}</div>
            <div style="font-size:11px; color:var(--text-muted); display:flex; gap:4px; align-items:center">
              ${E(e.position)} · ${W(e.team,14)} ${n(e.team||"")} vs ${n(e.opponent_team||"—")}
            </div>
          </div>
        </div>
        <span class="badge badge-amber mono" style="font-size:13px" title="${e.gridironUncapped!==e.gridironAuction?`Uncapped $${e.gridironUncapped}`:""}">$${e.gridironAuction}${e.gridironUncapped!==e.gridironAuction?`<span style="font-size:10px; color:var(--text-faint)"> ($${e.gridironUncapped})</span>`:""}</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:11px; margin-bottom:8px" class="mono">
        <div><span class="faint">Model:</span> <strong style="color:var(--amber)">${e.weekly.toFixed(1)} wk</strong></div>
        <div><span class="faint">Market:</span> <span style="color:var(--sky)">$${e.marketAuction}${e.marketUncapped!==e.marketAuction?`<span style="font-size:10px; color:var(--text-faint)"> ($${e.marketUncapped})</span>`:""}</span></div>
        <div><span class="faint">ECR:</span> ${e.ecr?`#${e.ecr}`:"—"}</div>
        <div><span class="faint">Edge:</span> <strong style="color:${e.edge==="BUY"?"var(--emerald)":e.edge==="SELL"?"var(--crimson)":"var(--text-muted)"}">${e.edge==="BUY"?"▲ ":e.edge==="SELL"?"▼ ":""}${e.edge}</strong></div>
      </div>
      <div>${O({point:e.weekly,low:e.lower,high:e.upper,width:e.width,min:0,max:35})}</div>
    </div>
  `}export{pe as renderTeam};
