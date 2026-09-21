import{d as X,b as Q,g as J,h as Z,s as ee,i as E,e as d,l as ae,p as F,j as I,o as j,k as te,f as se,m as re,t as ie,n as oe,q as ne}from"./index-B-4KdT_p.js";import{g as le,s as G,r as de,b as ce}from"./teamSelector-DzJVhgid.js";import{p as pe}from"./playerCard-ChAFuOem.js";import{c as me}from"./vbdAuction-DgSYSsT3.js";import{a as ve,e as ge}from"./slots-DPojx5vl.js";import"./auctionMath-BYrSrbjC.js";async function ye(a){const o=await X().catch(()=>null),g=(o==null?void 0:o.rosters)||(o==null?void 0:o.teams)||null,b=(o==null?void 0:o.leagueRosters)||(o==null?void 0:o.allTeams)||[];let i=le();!i&&b.length&&(i=String(b[0].roster_id),G(i));let n=null;if(g&&i&&(g[i]||g[Number(i)])){const e=g[i]||g[Number(i)];n={starters:e.starters||[],bench:e.bench||[],reserve:e.reserve||[],myRoster:e.starters||[],teamMeta:e.team_info||e.teamMeta||{},team_info:e.team_info||e.teamMeta||{},leagueRosters:b,allTeams:b}}else if(n=await Q(i?{roster_id:i}:{}).catch(()=>({starters:[],bench:[],reserve:[],leagueRosters:[],allTeams:[]})),!i){const e=n.leagueRosters||n.allTeams||[];e.length&&(i=String(e[0].roster_id),G(i))}const k=await J({limit:800}).catch(()=>({players:[]})),A=b.length?b:n.leagueRosters||n.allTeams||[],c=n.teamMeta||n.team_info||{},L=new Map;(k.players||[]).forEach(e=>{e.player_id&&L.set(String(e.player_id),e),e.player_name&&L.set(e.player_name.toLowerCase(),e)});const p=await Z(se,te).catch(()=>null),W={vbdParams:me(k.players||[],p),compPlayers:k.players||[]},z=n.starters||n.myRoster||[],H=n.bench||[],V=n.reserve||[],{starters:$,bench:D}=ve(z,H,W),P=V.map((e,t)=>ge({...e,slot:`IR${t+1}`},null,{...W,defaultSlot:`IR${t+1}`})),w=D,u=[...$,...w,...P],f=u.some(e=>e.marketAuction!=null),x=u.some(e=>e.ecr!=null||e.adp!=null);let S=`#— of ${p?p.teams:"?"}`;try{if(g&&typeof g=="object"){const t=Object.entries(g).map(([r,s])=>{const m=((s==null?void 0:s.starters)||(s==null?void 0:s.myRoster)||[]).reduce((h,M)=>h+Number(M.projected_points||0),0),v=(s==null?void 0:s.team_info)||(s==null?void 0:s.teamMeta)||{};return{roster_id:String(v.roster_id||r||""),fpts:m}}).sort((r,s)=>s.fpts-r.fpts).findIndex(r=>String(r.roster_id)===String(i));t!==-1&&(S=`#${t+1} of ${p?p.teams:"?"}`)}else if(Array.isArray(o==null?void 0:o.league_leaderboard)&&o.league_leaderboard.length){const e=o.league_leaderboard.findIndex(t=>String(t.roster_id)===String(i));e!==-1&&(S=`#${e+1} of ${p?p.teams:"?"}`)}else if(Array.isArray(n.league_leaderboard)&&n.league_leaderboard.length){const e=n.league_leaderboard.findIndex(t=>String(t.roster_id)===String(i));e!==-1&&(S=`#${e+1} of ${p?p.teams:"?"}`)}}catch{}const T=u.reduce((e,t)=>e+(t.gridironAuction??0),0),O=u.map(e=>e.marketAuction),_=O.every(e=>e!=null)?O.reduce((e,t)=>e+t,0):null,U=$.reduce((e,t)=>e+t.weekly,0),Y=$.reduce((e,t)=>e+t.season,0),R=e=>{const t=$.filter(h=>h.position===e||e==="WR"&&h.slot.startsWith("FLEX")&&h.position==="WR"||e==="RB"&&h.slot.startsWith("FLEX")&&h.position==="RB"),r=t.reduce((h,M)=>h+M.weekly,0),s=t.length||1,l=r/s;let m="SOLID",v="badge-amber";return e==="QB"?l>=18?(m="ELITE",v="badge-emerald"):l<14&&(m="WEAK",v="badge-crimson"):e==="RB"?l>=12?(m="STRONG",v="badge-emerald"):l<8&&(m="WEAK",v="badge-crimson"):e==="WR"?l>=14?(m="STRONG",v="badge-emerald"):l<9&&(m="WEAK",v="badge-crimson"):e==="TE"&&(l>=11?(m="STRONG",v="badge-emerald"):l<7&&(m="WEAK",v="badge-crimson")),{pos:e,totalPts:r.toFixed(1),avg:l.toFixed(1),count:t.length,label:m,cls:v}},K=[R("QB"),R("RB"),R("WR"),R("TE")],q=[5,6,7,8,9,10,11,12,13,14],C={};u.forEach(e=>{const t=e.bye_week||e.bye||null;t&&(C[t]=(C[t]||0)+1)});const y=[];w.forEach(e=>{e.weekly<5||$.forEach(t=>{if((e.position===t.position||["RB","WR","TE"].includes(e.position)&&t.slot.startsWith("FLEX"))&&e.upper>=t.weekly){const s=Number((e.upper-t.weekly).toFixed(1));y.push({benchPlayer:e,starterPlayer:t,overlap:s,advice:`Bench ${e.player_name} (${e.position}) ceiling (${e.upper.toFixed(1)} pts) overlaps Starter ${t.player_name} (${t.slot}) point (${t.weekly.toFixed(1)} pts).`})}})}),y.sort((e,t)=>t.overlap-e.overlap),a.innerHTML=`
    <!-- Executive Command Center Header -->
    <div class="team-hub-header reveal in">
      <div class="team-hero-card card" style="border-top:1px solid var(--amber)">
        <div class="team-hero-top">
          <div class="team-owner-info">
            <div class="team-owner-avatar">
              ${(()=>{const e=ee(c.avatar_url);return e?`<img src="${E(e)}" alt="${d(c.display_name)}" class="owner-img" />`:`<div class="owner-avatar-fallback">${d((c.display_name||c.owner_name||"T").charAt(0).toUpperCase())}</div>`})()}
            </div>
            <div>
              <div class="team-title-row">
                <h1 class="team-name">${d(c.team_name||c.display_name||"Team Hub")}</h1>
                <span class="badge badge-owner">Owner: @${d(c.display_name||c.owner_name||"user")}</span>
                <span class="badge badge-amber mono" style="font-size:12px; font-weight:700" aria-live="polite">Rank ${S}</span>
              </div>
              <div class="team-sub-row faint" style="margin-top:4px">
                Roster #${c.roster_id||i} <span style="color:var(--text-faint)">·</span> ${d(ae(p||{}))}
                <br><span class="micro">2 FLEX</span>
              </div>
            </div>
          </div>
          <div class="team-selector-header-box">
            <span class="kicker" style="display:block; margin-bottom:4px">Switch Team</span>
            ${de(A,i)}
          </div>
        </div>

        <!-- Executive Financial & Power KPI Grid -->
        <div class="team-kpi-grid">
          <div class="kpi-card">
            <span class="kicker">Roster Rank</span>
            <div class="mono kpi-val" style="color:var(--amber)">${S}</div>
            <span class="micro faint">${p?p.teams:"?"}-Team Starter FPTS Leaderboard</span>
          </div>
          <div class="kpi-card">
            <span class="kicker">Total Model $</span>
            <div class="mono kpi-val" style="color:var(--emerald)">$${T}</div>
            <span class="micro faint">Sum of VBD auction values</span>
          </div>
          ${_!=null?`
          <div class="kpi-card">
            <span class="kicker">Total Market Consensus $</span>
            <div class="mono kpi-val" style="color:var(--sky)">$${_}</div>
            <div class="micro ${T>=_?"text-good":"text-bad"}">
              ${T>=_?"+":""}$${T-_} Value Edge
            </div>
          </div>`:""}
          <div class="kpi-card">
            <span class="kicker">Starter pts/wk</span>
            <div class="mono kpi-val" style="color:var(--amber)">${U.toFixed(1)} <span class="kpi-unit">pts/wk</span></div>
            <span class="micro faint">17-Game: ${Y.toFixed(0)} pts</span>
          </div>
        </div>

        <!-- Position Group Heatmap & Bye Week Matrix -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:12px; padding-top:12px; border-top:1px solid var(--border)">
          <div>
            <span class="kicker" style="display:block; margin-bottom:6px">Position Group Strength Heatmap</span>
            <div style="display:flex; gap:8px; flex-wrap:wrap">
              ${K.map(e=>`
                <div style="background:var(--surface-raised); border:1px solid var(--border); border-radius:8px; padding:6px 10px; flex:1; min-width:80px">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px">
                    <span class="mono" style="font-weight:700; font-size:12px">${e.pos}</span>
                    <span class="badge ${e.cls} micro">${e.label}</span>
                  </div>
                  <div class="mono" style="font-size:13px; font-weight:700; color:var(--text)">${e.totalPts} <span class="micro faint">pts</span></div>
                </div>
              `).join("")}
            </div>
          </div>

          <div>
            <span class="kicker" style="display:block; margin-bottom:6px">Bye Week Distribution Matrix</span>
            <div class="bye-pills">
              ${q.map(e=>{const t=C[e]||0;return`<span class="bye-pill ${t>=3?"badge-crimson":t>0?"active":""}" title="Week ${e}: ${t} player(s) on bye">W${e}: <strong>${t}</strong></span>`}).join("")}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Start/Sit Toss-up Advisor Card -->
    <div class="card reveal in" style="margin-top:16px; border:1px solid ${y.length?"rgba(245,158,11,0.35)":"var(--border)"}; background:${y.length?"rgba(245,158,11,0.03)":"var(--surface)"}">
      <div class="card-header" style="border-bottom:1px solid ${y.length?"rgba(245,158,11,0.2)":"var(--border)"}">
        <div style="display:flex; align-items:center; gap:8px">
          <span class="badge ${y.length?"badge-amber":"badge-emerald"}" style="font-size:12px">Start/Sit Advisor</span>
          <span class="micro faint">${y.length?`${y.length} Ceiling-Over-Point Decision(s)`:"Optimal Lineup Configured"}</span>
        </div>
      </div>
      <div class="card-body" style="padding:12px">
        ${y.length?`
          <div style="display:flex; flex-direction:column; gap:8px">
            ${y.slice(0,3).map(e=>`
              <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; background:var(--surface-raised); border:1px solid var(--border); border-radius:10px; padding:10px 12px; flex-wrap:wrap">
                <div style="display:flex; align-items:center; gap:12px">
                  <div style="display:flex; align-items:center; gap:6px">
                    ${F(e.benchPlayer,32)}
                    <div>
                      <span class="mono" style="font-weight:700; color:var(--amber); font-size:12px">[BENCH] ${d(e.benchPlayer.player_name)}</span>
                      <div class="micro faint">${I(e.benchPlayer.position)} · ${e.benchPlayer.weekly.toFixed(1)} pts (Ceiling: <strong style="color:var(--emerald)">${e.benchPlayer.upper.toFixed(1)}</strong>)</div>
                    </div>
                  </div>
                  <span class="mono text-bad" style="font-weight:700; font-size:13px">VS</span>
                  <div style="display:flex; align-items:center; gap:6px">
                    ${F(e.starterPlayer,32)}
                    <div>
                      <span class="mono" style="font-weight:700; font-size:12px">[${d(e.starterPlayer.slot)}] ${d(e.starterPlayer.player_name)}</span>
                      <div class="micro faint">${I(e.starterPlayer.position)} · ${e.starterPlayer.weekly.toFixed(1)} pts (Point: <strong style="color:var(--crimson)">${e.starterPlayer.weekly.toFixed(1)}</strong>)</div>
                    </div>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px">
                  <span class="badge badge-amber mono">Ceiling Overlap: +${e.overlap} pts</span>
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
          <h3>Starters (${$.length} Slots)</h3>
          <span class="kicker">10 Starter Slots · Click any player row or card to open detail breakdown</span>
        </div>
        <span class="badge badge-amber mono" style="font-size:13px; font-weight:700">${U.toFixed(1)} Wk Pts</span>
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
                  ${f?`<th style="color:var(--sky)">Market $</th>
                  <th>Δ $</th>`:""}
                  <th>Edge</th>
                  ${x?`<th>ECR</th>
                  <th>ADP</th>`:""}
                  <th>Tier</th>
                  <th>Conformal Interval</th>
                  <th>17G Stat Totals</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${$.map(e=>B(e,!1,f,x)).join("")}
              </tbody>
            </table>
          </div>
          <div class="player-cards-grid" style="padding:12px">
            ${$.map(e=>N(e)).join("")}
          </div>
        </div>
      </div>
    </div>

    <!-- Bench Table & Cards -->
    <div class="card reveal in" style="margin-top:16px">
      <div class="card-header">
        <div>
          <h3>Bench Roster (${w.length} Players)</h3>
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
                  ${f?`<th style="color:var(--sky)">Market $</th>
                  <th>Δ $</th>`:""}
                  <th>Edge</th>
                  ${x?`<th>ECR</th>
                  <th>ADP</th>`:""}
                  <th>Tier</th>
                  <th>Conformal Interval</th>
                  <th>17G Stat Totals</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${w.map(e=>B(e,!1,f,x)).join("")}
              </tbody>
            </table>
          </div>
          <div class="player-cards-grid" style="padding:12px">
            ${w.map(e=>N(e)).join("")}
          </div>
        </div>
      </div>
    </div>

    <!-- IR / Reserve Table & Cards -->
    ${P.length?`
      <div class="card reveal in" style="margin-top:16px">
        <div class="card-header">
          <div>
            <h3>Injured Reserve (${P.length} Players)</h3>
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
                    ${f?`<th>Market $</th>
                    <th>Δ $</th>`:""}
                    <th>Edge</th>
                    ${x?"<th>ECR</th>":""}
                    <th>Conformal Interval</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${P.map(e=>B(e,!0,f,x)).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `:""}

  `,ce(()=>{ye(a)}),a.querySelectorAll("[data-player-row]").forEach(e=>{e.addEventListener("click",t=>{if(t.target.closest("button, a"))return;const r=e.getAttribute("data-player-row"),s=u.find(l=>String(l.player_id)===String(r));s&&j(s,a)})}),a.querySelectorAll("[data-player-id]").forEach(e=>{const t=()=>{const r=e.getAttribute("data-player-id"),s=u.find(l=>String(l.player_id)===String(r));s&&j(s,a)};e.addEventListener("click",r=>{r.stopPropagation(),t()}),e.tagName!=="BUTTON"&&e.addEventListener("keydown",r=>{(r.key==="Enter"||r.key===" ")&&(r.preventDefault(),t())})}),a.querySelectorAll("[data-pid]").forEach(e=>{e.style.cursor="pointer",e.addEventListener("click",t=>{t.stopPropagation();const r=e.getAttribute("data-pid"),s=u.find(l=>String(l.player_id)===String(r));s&&j(s,a)})})}function B(a,o=!1,g=!0,b=!0){const i=a.deltaAuction>0?"text-good":a.deltaAuction<0?"text-bad":"faint",n=a.deltaAuction>0?"+":"",k=a.edge==="BUY"?"badge-emerald":a.edge==="SELL"?"badge-crimson":"badge-faint",A=a.edge==="BUY"?"▲ ":a.edge==="SELL"?"▼ ":"";let c="—";return a.position==="QB"?c=`${a.season_pass_yd} PassYd · ${a.season_tds} TD`:a.position==="RB"?c=`${a.season_rush_yd} RushYd · ${a.season_rec_yd} RecYd · ${a.season_tds} TD`:a.position==="WR"||a.position==="TE"?c=`${a.season_rec_yd} RecYd · ${a.season_rec} Rec · ${a.season_tds} TD`:c=`${a.season_tds} TD`,`
    <tr data-player-row="${d(a.player_id)}" data-team="${a.team||""}" class="clickable-row" style="cursor:pointer; --team-accent:${re((a.team||"").toUpperCase())}">
      <td class="micro faint mono" style="font-weight:700"><button class="row-open-btn" data-player-id="${d(a.player_id)}" aria-label="Open details for ${E(a.player_name||a.player_id)}" title="Open details for ${E(a.player_name||a.player_id)}" style="background:none; border:0; padding:0; font:inherit; color:inherit; cursor:pointer; font-weight:700">${d(a.slot)}</button></td>
      <td>
        <div class="player-cell">
          ${F(a,32)}
          <div class="player-cell-info">
            <div class="player-cell-name">${d(a.player_name)} ${I(a.position)}</div>
            <div class="player-cell-sub">${ie(a.team,14)} ${d(a.team||"—")}</div>
          </div>
        </div>
      </td>
      <td class="micro faint">${d(a.team)} vs ${d(a.opponent_team||"TBD")}</td>
      <td class="mono">
        <span style="color:var(--amber); font-weight:700">${a.weekly.toFixed(1)}</span>
        <span class="micro faint"> / ${a.season.toFixed(0)}</span>
      </td>
      <td class="mono"><span class="badge badge-amber" title="${a.gridironUncapped!=null&&a.gridironUncapped!==a.gridironAuction?`Uncapped VOR $${a.gridironUncapped}`:""}">$${a.gridironAuction}${a.gridironUncapped!=null&&a.gridironUncapped!==a.gridironAuction?` <span class="micro faint">($${a.gridironUncapped})</span>`:""}</span></td>
      ${g?`<td class="mono"><span class="badge badge-sky" title="Market consensus auction value">$${a.marketAuction}</span></td>
      <td class="mono ${i}">${n}$${a.deltaAuction}</td>`:""}
      <td><span class="badge ${k}" aria-label="${E(a.edge)}">${A}${a.edge}</span></td>
      ${b?`<td class="mono micro">${a.ecr?`#${a.ecr}${a.ecrPos?` (${a.ecrPos})`:""}`:"—"}</td>
      <td class="mono micro faint">${a.adp?`#${a.adp}`:"—"}</td>`:""}
      <td>${a.tier?`<span class="badge badge-violet">T${a.tier}</span>`:"—"}</td>
      <td>
        ${oe({point:a.weekly,low:a.lower,high:a.upper,width:a.width,min:0,max:35})}
      </td>
      <td class="mono micro faint">${d(c)}</td>
      <td>${ne(a.injury_status)}</td>
    </tr>
  `}function N(a){return pe({...a,projected_points:a.weekly,point_estimate:a.weekly,projection_lower:a.lower,projection_upper:a.upper,auction:a.gridironAuction},{showInterval:!0,showTeamLogo:!0})}export{ye as renderTeam};
