import{d as J,b as Z,g as ee,h as ae,s as te,i as P,e as n,l as se,p as A,j as M,o as O,k as re,f as ie,m as oe,t as N,n as Y,q as ne}from"./index-DYoWtgWQ.js";import{g as le,s as z,r as de,b as ce}from"./teamSelector-B3eYU_K3.js";import{c as pe}from"./vbdAuction-DIg-DBgs.js";import{a as ve,e as me}from"./slots-WnKCVvqE.js";import"./auctionMath-BVicd4QG.js";async function ge(a){const r=await J().catch(()=>null),g=(r==null?void 0:r.rosters)||(r==null?void 0:r.teams)||null,$=(r==null?void 0:r.leagueRosters)||(r==null?void 0:r.allTeams)||[];let i=le();!i&&$.length&&(i=String($[0].roster_id),z(i));let l=null;if(g&&i&&(g[i]||g[Number(i)])){const e=g[i]||g[Number(i)];l={starters:e.starters||[],bench:e.bench||[],reserve:e.reserve||[],myRoster:e.starters||[],teamMeta:e.team_info||e.teamMeta||{},team_info:e.team_info||e.teamMeta||{},leagueRosters:$,allTeams:$}}else if(l=await Z(i?{roster_id:i}:{}).catch(()=>({starters:[],bench:[],reserve:[],leagueRosters:[],allTeams:[]})),!i){const e=l.leagueRosters||l.allTeams||[];e.length&&(i=String(e[0].roster_id),z(i))}const k=await ee({limit:800}).catch(()=>({players:[]})),C=$.length?$:l.leagueRosters||l.allTeams||[],d=l.teamMeta||l.team_info||{},L=new Map;(k.players||[]).forEach(e=>{e.player_id&&L.set(String(e.player_id),e),e.player_name&&L.set(e.player_name.toLowerCase(),e)});const p=await ae(ie,re).catch(()=>null),I={vbdParams:pe(k.players||[],p),compPlayers:k.players||[]},H=l.starters||l.myRoster||[],V=l.bench||[],D=l.reserve||[],{starters:b,bench:K}=ve(H,V,I),R=D.map((e,t)=>me({...e,slot:`IR${t+1}`},null,{...I,defaultSlot:`IR${t+1}`})),w=K,u=[...b,...w,...R],f=u.some(e=>e.marketAuction!=null),x=u.some(e=>e.ecr!=null||e.adp!=null);let S=`#— of ${p?p.teams:"?"}`;try{if(g&&typeof g=="object"){const t=Object.entries(g).map(([o,s])=>{const v=((s==null?void 0:s.starters)||(s==null?void 0:s.myRoster)||[]).reduce((h,F)=>h+Number(F.projected_points||0),0),m=(s==null?void 0:s.team_info)||(s==null?void 0:s.teamMeta)||{};return{roster_id:String(m.roster_id||o||""),fpts:v}}).sort((o,s)=>s.fpts-o.fpts).findIndex(o=>String(o.roster_id)===String(i));t!==-1&&(S=`#${t+1} of ${p?p.teams:"?"}`)}else if(Array.isArray(r==null?void 0:r.league_leaderboard)&&r.league_leaderboard.length){const e=r.league_leaderboard.findIndex(t=>String(t.roster_id)===String(i));e!==-1&&(S=`#${e+1} of ${p?p.teams:"?"}`)}else if(Array.isArray(l.league_leaderboard)&&l.league_leaderboard.length){const e=l.league_leaderboard.findIndex(t=>String(t.roster_id)===String(i));e!==-1&&(S=`#${e+1} of ${p?p.teams:"?"}`)}}catch{}const T=u.reduce((e,t)=>e+(t.gridironAuction??0),0),W=u.map(e=>e.marketAuction),_=W.every(e=>e!=null)?W.reduce((e,t)=>e+t,0):null,U=b.reduce((e,t)=>e+t.weekly,0),X=b.reduce((e,t)=>e+t.season,0),E=e=>{const t=b.filter(h=>h.position===e||e==="WR"&&h.slot.startsWith("FLEX")&&h.position==="WR"||e==="RB"&&h.slot.startsWith("FLEX")&&h.position==="RB"),o=t.reduce((h,F)=>h+F.weekly,0),s=t.length||1,c=o/s;let v="SOLID",m="badge-amber";return e==="QB"?c>=18?(v="ELITE",m="badge-emerald"):c<14&&(v="WEAK",m="badge-crimson"):e==="RB"?c>=12?(v="STRONG",m="badge-emerald"):c<8&&(v="WEAK",m="badge-crimson"):e==="WR"?c>=14?(v="STRONG",m="badge-emerald"):c<9&&(v="WEAK",m="badge-crimson"):e==="TE"&&(c>=11?(v="STRONG",m="badge-emerald"):c<7&&(v="WEAK",m="badge-crimson")),{pos:e,totalPts:o.toFixed(1),avg:c.toFixed(1),count:t.length,label:v,cls:m}},q=[E("QB"),E("RB"),E("WR"),E("TE")],Q=[5,6,7,8,9,10,11,12,13,14],B={};u.forEach(e=>{const t=e.bye_week||e.bye||null;t&&(B[t]=(B[t]||0)+1)});const y=[];w.forEach(e=>{e.weekly<5||b.forEach(t=>{if((e.position===t.position||["RB","WR","TE"].includes(e.position)&&t.slot.startsWith("FLEX"))&&e.upper>=t.weekly){const s=Number((e.upper-t.weekly).toFixed(1));y.push({benchPlayer:e,starterPlayer:t,overlap:s,advice:`Bench ${e.player_name} (${e.position}) ceiling (${e.upper.toFixed(1)} pts) overlaps Starter ${t.player_name} (${t.slot}) point (${t.weekly.toFixed(1)} pts).`})}})}),y.sort((e,t)=>t.overlap-e.overlap),a.innerHTML=`
    <!-- Executive Command Center Header -->
    <div class="team-hub-header reveal in">
      <div class="team-hero-card card" style="border-top:1px solid var(--amber)">
        <div class="team-hero-top">
          <div class="team-owner-info">
            <div class="team-owner-avatar">
              ${(()=>{const e=te(d.avatar_url);return e?`<img src="${P(e)}" alt="${n(d.display_name)}" class="owner-img" />`:`<div class="owner-avatar-fallback">${n((d.display_name||d.owner_name||"T").charAt(0).toUpperCase())}</div>`})()}
            </div>
            <div>
              <div class="team-title-row">
                <h1 class="team-name">${n(d.team_name||d.display_name||"Team Hub")}</h1>
                <span class="badge badge-owner">Owner: @${n(d.display_name||d.owner_name||"user")}</span>
                <span class="badge badge-amber mono" style="font-size:12px; font-weight:700" aria-live="polite">Rank ${S}</span>
              </div>
              <div class="team-sub-row faint" style="margin-top:4px">
                Roster #${d.roster_id||i} <span style="color:var(--text-faint)">·</span> ${n(se(p||{}))}
                <br><span class="micro">2 FLEX</span>
              </div>
            </div>
          </div>
          <div class="team-selector-header-box">
            <span class="kicker" style="display:block; margin-bottom:4px">Switch Team</span>
            ${de(C,i)}
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
            <span class="micro faint">17-Game: ${X.toFixed(0)} pts</span>
          </div>
        </div>

        <!-- Position Group Heatmap & Bye Week Matrix -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:12px; padding-top:12px; border-top:1px solid var(--border)">
          <div>
            <span class="kicker" style="display:block; margin-bottom:6px">Position Group Strength Heatmap</span>
            <div style="display:flex; gap:8px; flex-wrap:wrap">
              ${q.map(e=>`
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
              ${Q.map(e=>{const t=B[e]||0;return`<span class="bye-pill ${t>=3?"badge-crimson":t>0?"active":""}" title="Week ${e}: ${t} player(s) on bye">W${e}: <strong>${t}</strong></span>`}).join("")}
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
                    ${A(e.benchPlayer,32)}
                    <div>
                      <span class="mono" style="font-weight:700; color:var(--amber); font-size:12px">[BENCH] ${n(e.benchPlayer.player_name)}</span>
                      <div class="micro faint">${M(e.benchPlayer.position)} · ${e.benchPlayer.weekly.toFixed(1)} pts (Ceiling: <strong style="color:var(--emerald)">${e.benchPlayer.upper.toFixed(1)}</strong>)</div>
                    </div>
                  </div>
                  <span class="mono text-bad" style="font-weight:700; font-size:13px">VS</span>
                  <div style="display:flex; align-items:center; gap:6px">
                    ${A(e.starterPlayer,32)}
                    <div>
                      <span class="mono" style="font-weight:700; font-size:12px">[${n(e.starterPlayer.slot)}] ${n(e.starterPlayer.player_name)}</span>
                      <div class="micro faint">${M(e.starterPlayer.position)} · ${e.starterPlayer.weekly.toFixed(1)} pts (Point: <strong style="color:var(--crimson)">${e.starterPlayer.weekly.toFixed(1)}</strong>)</div>
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
          <h3>Starters (${b.length} Slots)</h3>
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
                ${b.map(e=>j(e,!1,f,x)).join("")}
              </tbody>
            </table>
          </div>
          <div class="player-cards-grid" style="padding:12px">
            ${b.map(e=>G(e,f)).join("")}
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
                ${w.map(e=>j(e,!1,f,x)).join("")}
              </tbody>
            </table>
          </div>
          <div class="player-cards-grid" style="padding:12px">
            ${w.map(e=>G(e,f)).join("")}
          </div>
        </div>
      </div>
    </div>

    <!-- IR / Reserve Table & Cards -->
    ${R.length?`
      <div class="card reveal in" style="margin-top:16px">
        <div class="card-header">
          <div>
            <h3>Injured Reserve (${R.length} Players)</h3>
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
                  ${R.map(e=>j(e,!0,f,x)).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `:""}

    <div id="playerModalContainer"></div>
  `,ce(()=>{ge(a)}),a.querySelectorAll("[data-player-row]").forEach(e=>{e.addEventListener("click",t=>{if(t.target.closest("button, a"))return;const o=e.getAttribute("data-player-row"),s=u.find(c=>String(c.player_id)===String(o));s&&O(s,a)})}),a.querySelectorAll("[data-player-id]").forEach(e=>{const t=()=>{const o=e.getAttribute("data-player-id"),s=u.find(c=>String(c.player_id)===String(o));s&&O(s,a)};e.addEventListener("click",o=>{o.stopPropagation(),t()}),e.tagName!=="BUTTON"&&e.addEventListener("keydown",o=>{(o.key==="Enter"||o.key===" ")&&(o.preventDefault(),t())})})}function j(a,r=!1,g=!0,$=!0){const i=a.deltaAuction>0?"text-good":a.deltaAuction<0?"text-bad":"faint",l=a.deltaAuction>0?"+":"",k=a.edge==="BUY"?"badge-emerald":a.edge==="SELL"?"badge-crimson":"badge-faint",C=a.edge==="BUY"?"▲ ":a.edge==="SELL"?"▼ ":"";let d="—";return a.position==="QB"?d=`${a.season_pass_yd} PassYd · ${a.season_tds} TD`:a.position==="RB"?d=`${a.season_rush_yd} RushYd · ${a.season_rec_yd} RecYd · ${a.season_tds} TD`:a.position==="WR"||a.position==="TE"?d=`${a.season_rec_yd} RecYd · ${a.season_rec} Rec · ${a.season_tds} TD`:d=`${a.season_tds} TD`,`
    <tr data-player-row="${n(a.player_id)}" data-team="${a.team||""}" class="clickable-row" style="cursor:pointer; --team-accent:${oe((a.team||"").toUpperCase())}">
      <td class="micro faint mono" style="font-weight:700"><button class="row-open-btn" data-player-id="${n(a.player_id)}" aria-label="Open details for ${P(a.player_name||a.player_id)}" title="Open details for ${P(a.player_name||a.player_id)}" style="background:none; border:0; padding:0; font:inherit; color:inherit; cursor:pointer; font-weight:700">${n(a.slot)}</button></td>
      <td>
        <div class="player-cell">
          ${A(a,32)}
          <div class="player-cell-info">
            <div class="player-cell-name">${n(a.player_name)} ${M(a.position)}</div>
            <div class="player-cell-sub">${N(a.team,14)} ${n(a.team||"—")}</div>
          </div>
        </div>
      </td>
      <td class="micro faint">${n(a.team)} vs ${n(a.opponent_team||"TBD")}</td>
      <td class="mono">
        <span style="color:var(--amber); font-weight:700">${a.weekly.toFixed(1)}</span>
        <span class="micro faint"> / ${a.season.toFixed(0)}</span>
      </td>
      <td class="mono"><span class="badge badge-amber" title="${a.gridironUncapped!=null&&a.gridironUncapped!==a.gridironAuction?`Uncapped VOR $${a.gridironUncapped}`:""}">$${a.gridironAuction}${a.gridironUncapped!=null&&a.gridironUncapped!==a.gridironAuction?` <span class="micro faint">($${a.gridironUncapped})</span>`:""}</span></td>
      ${g?`<td class="mono"><span class="badge badge-sky" title="Market consensus auction value">$${a.marketAuction}</span></td>
      <td class="mono ${i}">${l}$${a.deltaAuction}</td>`:""}
      <td><span class="badge ${k}" aria-label="${P(a.edge)}">${C}${a.edge}</span></td>
      ${$?`<td class="mono micro">${a.ecr?`#${a.ecr}${a.ecrPos?` (${a.ecrPos})`:""}`:"—"}</td>
      <td class="mono micro faint">${a.adp?`#${a.adp}`:"—"}</td>`:""}
      <td>${a.tier?`<span class="badge badge-violet">T${a.tier}</span>`:"—"}</td>
      <td>
        ${Y({point:a.weekly,low:a.lower,high:a.upper,width:a.width,min:0,max:35})}
      </td>
      <td class="mono micro faint">${n(d)}</td>
      <td>${ne(a.injury_status)}</td>
    </tr>
  `}function G(a,r=!0){return`
    <div class="player-card clickable-card" data-player-id="${n(a.player_id)}" tabindex="0" role="button" aria-label="Open details for ${P(a.player_name||a.player_id)}" style="cursor:pointer">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px">
        <div style="display:flex; align-items:center; gap:8px">
          ${A(a,36)}
          <div>
            <div style="font-weight:700; color:var(--text)">${n(a.player_name)}</div>
            <div style="font-size:11px; color:var(--text-muted); display:flex; gap:4px; align-items:center">
              ${M(a.position)} · ${N(a.team,14)} ${n(a.team||"")} vs ${n(a.opponent_team||"—")}
            </div>
          </div>
        </div>
        <span class="badge badge-amber mono" style="font-size:13px" title="${a.gridironUncapped!==a.gridironAuction?`Uncapped $${a.gridironUncapped}`:""}">$${a.gridironAuction}${a.gridironUncapped!==a.gridironAuction?`<span style="font-size:10px; color:var(--text-faint)"> ($${a.gridironUncapped})</span>`:""}</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:11px; margin-bottom:8px" class="mono">
        <div><span class="faint">Model:</span> <strong style="color:var(--amber)">${a.weekly.toFixed(1)} wk</strong></div>
        ${r?`<div><span class="faint">Market:</span> <span style="color:var(--sky)">$${a.marketAuction}</span></div>`:""}
        <div><span class="faint">ECR:</span> ${a.ecr?`#${a.ecr}`:"—"}</div>
        <div><span class="faint">Edge:</span> <strong style="color:${a.edge==="BUY"?"var(--emerald)":a.edge==="SELL"?"var(--crimson)":"var(--text-muted)"}">${a.edge==="BUY"?"▲ ":a.edge==="SELL"?"▼ ":""}${a.edge}</strong></div>
      </div>
      <div>${Y({point:a.weekly,low:a.lower,high:a.upper,width:a.width,min:0,max:35})}</div>
    </div>
  `}export{ge as renderTeam};
