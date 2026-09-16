import{d as ee,b as Q,g as te,h as ae,e as r,l as G,o as X,k as re,f as se,u as oe,p as A,m as ie,i as u,j as I,t as ne,n as le,q as de,s as F}from"./index-CIIdx54w.js";import{c as ce}from"./vbdAuction-Bn4eSdiY.js";import{a as pe,e as me}from"./slots-CS6N-R0a.js";import"./auctionMath-C3MdTGNI.js";let x="1",T="2",_="single";async function P(e){var U,j,O,W;const s=await ee().catch(()=>null),y=(s==null?void 0:s.rosters)||(s==null?void 0:s.teams)||null,$=s||await Q({roster_id:"1"}),o=$.leagueRosters||$.allTeams||[];o.length&&!o.some(t=>String(t.roster_id)===String(x))&&(x=String(o[0].roster_id)),o.length>1&&!o.some(t=>String(t.roster_id)===String(T))&&(T=String(o[1].roster_id));const[h,c]=await Promise.all([(async()=>y&&typeof y=="object"?o.map(t=>{const d=String(t.roster_id),a=y[d]||y[Number(d)]||null;return a?{starters:a.starters||[],bench:a.bench||[],reserve:a.reserve||[],myRoster:a.starters||[],teamMeta:a.team_info||a.teamMeta||t,team_info:a.team_info||a.teamMeta||t}:null}):Promise.all(o.map(t=>Q({roster_id:t.roster_id}).catch(()=>null))))(),te({limit:800}).catch(()=>({players:[]}))]),g=h,n=new Map;(c.players||[]).forEach(t=>{t.player_id&&n.set(String(t.player_id),t),t.player_name&&n.set(t.player_name.toLowerCase(),t)});const i=await ae(se,re).catch(()=>null),R={vbdParams:ce(c.players||[],i),compPlayers:c.players||[]},B=(t,d)=>{if(!t)return null;const a=t.teamMeta||t.team_info||d||{},b=t.starters||t.myRoster||[],S=t.bench||[],k=t.reserve||[],{starters:f,bench:q}=pe(b,S,R),z=k.map((m,v)=>me({...m,slot:`IR${v+1}`},null,{...R,defaultSlot:`IR${v+1}`})),M=[...f,...q,...z],K=f.reduce((m,v)=>m+v.weekly,0),H=M.reduce((m,v)=>m+v.gridironAuction,0),V=M.reduce((m,v)=>m+v.marketAuction,0),J=H-V,Z=[...M].sort((m,v)=>v.weekly-m.weekly)[0]||null,w={QB:0,RB:0,WR:0,TE:0};f.forEach(m=>{w[m.position]!==void 0&&(w[m.position]+=m.weekly)});const D={QB:w.QB/16,RB:w.RB/22,WR:w.WR/26,TE:w.TE/9};let C="TE",N=999;return Object.entries(D).forEach(([m,v])=>{v<N&&(N=v,C=m)}),{roster_id:String(a.roster_id||""),owner_name:a.display_name||a.owner_name||a.team_name||`Team ${a.roster_id}`,team_name:a.team_name||a.display_name||`Team ${a.roster_id}`,avatar_url:a.avatar_url||null,starters:f,bench:q,reserve:z,allPlayers:M,starterFPTS:K,totalGridiron:H,totalMarket:V,deltaTotal:J,topPlayer:Z,weakestPos:`${C} (${w[C].toFixed(1)} pts)`}},l=g.map((t,d)=>B(t,o[d])).filter(Boolean);l.sort((t,d)=>d.starterFPTS-t.starterFPTS),l.forEach((t,d)=>{t.rank=d+1});const E=l.find(t=>t.roster_id===x)||l[0],L=l.find(t=>t.roster_id===T)||l[1]||l[0];e.innerHTML=`
    <!-- Header Hero -->
    <div class="hero reveal in">
      <h1>League directory</h1>
      <p>${r(G(i))} financial &amp; power leaderboard with side-by-side roster inspector.</p>
    </div>

    <!-- Financial & Power Leaderboard -->
    <div class="card reveal in" style="margin-top:8px">
      <div class="card-header">
        <div>
          <h3>${r(G(i))} Financial &amp; Power Leaderboard</h3>
          <span class="kicker">Ranked by starter projected pts &amp; Model $</span>
        </div>
        <span class="badge badge-amber mono" aria-live="polite">${l.length} League Teams</span>
      </div>
      <div class="card-body" style="padding:0">
        <div class="table-wrap" style="border:0; border-radius:0">
          <table aria-label="League leaderboard">
            <caption class="sr-only">${i?i.teams:"?"}-team financial and power leaderboard</caption>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Roster ID</th>
                <th>Team &amp; Owner</th>
                <th style="color:var(--amber)">Starter Projected FPTS</th>
                <th style="color:var(--emerald)">Total Model $</th>
                <th style="color:var(--sky)">Market Consensus $</th>
                <th>Δ $ Edge</th>
                <th>Top Player</th>
                <th>Weakest Position</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${l.map(t=>ve(t,x)).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Side-by-Side Team Roster Inspector Section -->
    <div class="card reveal in" style="margin-top:20px" id="inspectorSection">
      <div class="card-header" style="flex-wrap:wrap">
        <div>
          <h3>Side-by-Side Team Roster Inspector</h3>
          <span class="kicker">Inspect and compare full starters, bench, and position strength</span>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
          <div class="filters">
            <button class="chip ${_==="single"?"active":""}" id="btnModeSingle">Single Team View</button>
            <button class="chip ${_==="compare"?"active":""}" id="btnModeCompare">Side-by-Side Compare</button>
          </div>
        </div>
      </div>
      <div class="card-body">
        <!-- Team Selectors Bar -->
        <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:16px; background:var(--surface-raised); padding:12px; border-radius:10px; border:1px solid var(--border); flex-wrap:wrap">
          <div style="display:flex; align-items:center; gap:10px">
            <span class="mono" style="font-weight:700; font-size:12px; color:var(--amber)">TEAM A:</span>
            <select id="selectTeamA" class="team-select-dropdown">
              ${l.map(t=>`<option value="${t.roster_id}" ${t.roster_id===x?"selected":""}>#${t.rank} ${r(t.team_name)} (@${r(t.owner_name)})</option>`).join("")}
            </select>
          </div>

          ${_==="compare"?`
            <div style="display:flex; align-items:center; gap:10px">
              <span class="mono" style="font-weight:700; font-size:12px; color:var(--sky)">TEAM B:</span>
              <select id="selectTeamB" class="team-select-dropdown">
                ${l.map(t=>`<option value="${t.roster_id}" ${t.roster_id===T?"selected":""}>#${t.rank} ${r(t.team_name)} (@${r(t.owner_name)})</option>`).join("")}
              </select>
            </div>
          `:""}
        </div>

        <!-- Inspector View Content -->
        ${_==="single"?ye(E):ge(E,L)}
      </div>
    </div>

    <div id="playerModalContainer"></div>
  `,e.querySelectorAll("[data-inspect-id]").forEach(t=>{t.addEventListener("click",d=>{d.stopPropagation(),x=t.getAttribute("data-inspect-id"),P(e);const a=e.querySelector("#inspectorSection");a&&a.scrollIntoView({behavior:"smooth"})})}),(U=e.querySelector("#btnModeSingle"))==null||U.addEventListener("click",()=>{_="single",P(e)}),(j=e.querySelector("#btnModeCompare"))==null||j.addEventListener("click",()=>{_="compare",P(e)}),(O=e.querySelector("#selectTeamA"))==null||O.addEventListener("change",t=>{x=t.target.value,P(e)}),(W=e.querySelector("#selectTeamB"))==null||W.addEventListener("change",t=>{T=t.target.value,P(e)}),e.querySelectorAll("[data-player-row]").forEach(t=>{t.addEventListener("click",d=>{if(d.target.closest("button, a"))return;const a=t.getAttribute("data-player-row");let b=null;l.forEach(S=>{const k=S.allPlayers.find(f=>String(f.player_id)===String(a));k&&(b=k)}),b&&X(b,e)})}),e.querySelectorAll("[data-player-id]").forEach(t=>{const d=()=>{const a=t.getAttribute("data-player-id");let b=null;l.forEach(S=>{const k=S.allPlayers.find(f=>String(f.player_id)===String(a));k&&(b=k)}),b&&X(b,e)};t.addEventListener("click",a=>{a.stopPropagation(),d()}),t.tagName!=="BUTTON"&&t.addEventListener("keydown",a=>{(a.key==="Enter"||a.key===" ")&&(a.preventDefault(),d())})})}function ve(e,s){const y=e.roster_id===s,$=e.deltaTotal>0?"text-good":e.deltaTotal<0?"text-bad":"faint",o=e.deltaTotal>0?"+":"";return`
    <tr class="clickable-row ${y?"selected-row":""}" style="cursor:pointer; ${y?"background:rgba(245,158,11,0.06);":""}">
      <td class="mono" style="font-weight:700">
        <span class="badge ${e.rank<=3?"badge-emerald":e.rank<=8?"badge-amber":"badge-faint"}">#${e.rank}</span>
      </td>
      <td class="mono micro faint">Roster #${r(e.roster_id)}</td>
      <td>
        <div class="player-cell">
          ${oe(e,32)}
          <div class="player-cell-info">
            <div class="player-cell-name" style="font-weight:700">${r(e.team_name)}</div>
            <div class="player-cell-sub">@${r(e.owner_name)}</div>
          </div>
        </div>
      </td>
      <td class="mono" style="font-size:14px; font-weight:700; color:var(--amber)">
        ${e.starterFPTS.toFixed(1)} <span class="micro faint">pts/wk</span>
      </td>
      <td class="mono"><span class="badge badge-emerald">$${e.totalGridiron}</span></td>
      <td class="mono"><span class="badge badge-sky">$${e.totalMarket}</span></td>
      <td class="mono ${$}">${o}$${e.deltaTotal}</td>
      <td>
        ${e.topPlayer?`
          <div style="display:flex; align-items:center; gap:6px" class="mono micro">
            ${A(e.topPlayer,24)}
            <span>${r(e.topPlayer.player_name)} (${e.topPlayer.position}, $${e.topPlayer.gridironAuction})</span>
          </div>
        `:"—"}
      </td>
      <td class="mono micro text-bad">${r(e.weakestPos)}</td>
      <td>
        <button class="btn btn-ghost btn-sm" data-inspect-id="${r(e.roster_id)}">Inspect</button>
      </td>
    </tr>
  `}function ye(e){return e?`
    <div class="reveal in">
      <!-- Team Summary Hero Bar -->
      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-bottom:16px">
        <div class="kpi-card">
          <span class="kicker">Team Rank</span>
          <div class="mono kpi-val" style="color:var(--amber)">#${e.rank} of 12</div>
          <span class="micro faint">Roster ID #${e.roster_id}</span>
        </div>
        <div class="kpi-card">
          <span class="kicker">Starter Projected FPTS</span>
          <div class="mono kpi-val" style="color:var(--amber)">${e.starterFPTS.toFixed(1)} pts/wk</div>
          <span class="micro faint">10 Active Starters</span>
        </div>
        <div class="kpi-card">
          <span class="kicker">Model $ VOR</span>
          <div class="mono kpi-val" style="color:var(--emerald)">$${e.totalGridiron}</div>
          <span class="micro faint">Market $${e.totalMarket}</span>
        </div>
        <div class="kpi-card">
          <span class="kicker">Weakest Position</span>
          <div class="mono kpi-val text-bad" style="font-size:16px; margin-top:6px">${r(e.weakestPos)}</div>
          <span class="micro faint">Needs Upgrade</span>
        </div>
      </div>

      <!-- Starters Table -->
      <div class="table-wrap" style="margin-bottom:16px; overflow-x:auto; max-width:100%">
        <table aria-label="Team starters">
          <caption class="sr-only">Team starters with projections</caption>
          <thead>
            <tr>
              <th>Slot</th>
              <th>Player</th>
              <th>Matchup</th>
              <th style="color:var(--amber)">Model pts/wk</th>
              <th style="color:var(--emerald)">Model $</th>
              <th style="color:var(--sky)">Market $</th>
              <th>Δ $</th>
              <th>Edge</th>
              <th>ECR</th>
              <th>Conformal Interval</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${e.starters.map(s=>Y(s)).join("")}
          </tbody>
        </table>
      </div>

      <!-- Bench Table -->
      <div style="margin-top:12px">
        <span class="kicker" style="display:block; margin-bottom:8px">Bench &amp; Reserves (${e.bench.length+e.reserve.length})</span>
        <div class="table-wrap" style="overflow-x:auto; max-width:100%">
          <table aria-label="Bench and reserves">
            <caption class="sr-only">Bench and reserve players</caption>
            <thead>
              <tr>
                <th>Slot</th>
                <th>Player</th>
                <th>Matchup</th>
<th style="color:var(--amber)">Model pts/wk</th>
              <th style="color:var(--emerald)">Model $</th>
              <th style="color:var(--sky)">Market $</th>
              <th>Δ $</th>
              <th>Edge</th>
              <th>ECR</th>
              <th>Conformal Interval</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${[...e.bench,...e.reserve].map(s=>Y(s)).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `:'<div class="empty">No team selected.</div>'}function ge(e,s){if(!e||!s)return'<div class="empty">Select two teams to compare.</div>';const y=(o,h)=>o.starters.filter(c=>c.position===h||h==="WR"&&c.slot.startsWith("FLEX")&&c.position==="WR"||h==="RB"&&c.slot.startsWith("FLEX")&&c.position==="RB").reduce((c,g)=>c+g.weekly,0),$=["QB","RB","WR","TE"];return`
    <div class="reveal in">
      <!-- Head to Head Summary Cards -->
      <div style="display:grid; grid-template-columns:1fr 80px 1fr; gap:12px; align-items:center; margin-bottom:16px; background:var(--surface-raised); padding:16px; border-radius:12px; border:1px solid var(--border)">
        <!-- Team A -->
        <div style="display:flex; align-items:center; gap:12px">
          <div class="player-avatar" style="width:44px; height:44px">
            ${e.avatar_url&&F(e.avatar_url)?`<img src="${u(F(e.avatar_url))}" />`:`<div class="player-avatar-fallback" style="background:var(--amber)">${r(e.owner_name).charAt(0)}</div>`}
          </div>
          <div>
            <div style="font-weight:700; font-size:16px">${r(e.team_name)}</div>
            <div class="mono micro faint">Rank #${e.rank} · ${e.starterFPTS.toFixed(1)} FPTS<br>$${e.totalGridiron}</div>
          </div>
        </div>

        <!-- VS Badge -->
        <div style="text-align:center">
          <span class="badge badge-amber mono" style="font-size:14px">VS</span>
        </div>

        <!-- Team B -->
        <div style="display:flex; align-items:center; justify-content:flex-end; gap:12px">
          <div style="text-align:right">
            <div style="font-weight:700; font-size:16px">${r(s.team_name)}</div>
            <div class="mono micro faint">Rank #${s.rank} · ${s.starterFPTS.toFixed(1)} FPTS<br>$${s.totalGridiron}</div>
          </div>
          <div class="player-avatar" style="width:44px; height:44px">
            ${s.avatar_url&&F(s.avatar_url)?`<img src="${u(F(s.avatar_url))}" />`:`<div class="player-avatar-fallback" style="background:var(--sky)">${r(s.owner_name).charAt(0)}</div>`}
          </div>
        </div>
      </div>

      <!-- Positional Comparison Heatmap Grid -->
      <div style="margin-bottom:16px">
        <span class="kicker" style="display:block; margin-bottom:8px">Position-by-Position FPTS Advantage</span>
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px">
          ${$.map(o=>{const h=y(e,o),c=y(s,o),g=h-c,n=g>0?e.team_name:g<0?s.team_name:"EVEN",i=g>0?"color:var(--amber)":g<0?"color:var(--sky)":"color:var(--text-muted)";return`
              <div style="background:var(--surface-raised); border:1px solid var(--border); border-radius:10px; padding:10px; text-align:center">
                <span class="mono" style="font-weight:700; font-size:12px; color:var(--text-faint)">${o} POSITION</span>
                <div style="display:flex; justify-content:space-around; margin:6px 0; font-size:14px" class="mono">
                  <strong style="color:var(--amber)">${h.toFixed(1)}</strong>
                  <span class="faint">vs</span>
                  <strong style="color:var(--sky)">${c.toFixed(1)}</strong>
                </div>
                <span class="micro" style="font-weight:700; ${i}">
                  ${g!==0?`${n} +${Math.abs(g).toFixed(1)}`:"EVEN"}
                </span>
              </div>
            `}).join("")}
        </div>
      </div>

      <!-- Slot Matchup Table — slot-aligned (QB vs QB, RB1 vs RB1, etc.) -->
      <div class="table-wrap" style="overflow-x:auto; max-width:100%">
        <table aria-label="Slot comparison">
          <caption class="sr-only">Head-to-head slot comparison</caption>
          <thead>
            <tr>
              <th style="color:var(--amber)">${r(e.team_name)} Starter</th>
              <th>Slot</th>
              <th style="color:var(--sky)">${r(s.team_name)} Starter</th>
              <th>Advantage</th>
            </tr>
          </thead>
          <tbody>
            ${(()=>{const o=["QB","RB1","RB2","WR1","WR2","TE","FLEX1","FLEX2","K","DEF"],h=new Map(e.starters.map(n=>[n.slot,n])),c=new Map(s.starters.map(n=>[n.slot,n])),g=[...new Set([...e.starters.map(n=>n.slot),...s.starters.map(n=>n.slot)])].filter(n=>!o.includes(n));return[...o,...g].map(n=>{const i=h.get(n)||null,p=c.get(n)||null;if(!i&&!p)return"";const R=i?i.weekly:0,B=p?p.weekly:0,l=R-B,E=l>0?"text-good":l<0?"text-bad":"faint",L=l>0?"+":"";return`
                  <tr>
                    <td>
                      ${i?`
                        <div class="player-cell" style="cursor:pointer">
                          ${A(i,32)}
                          <div>
                            <div style="font-weight:700"><button class="row-open-btn" data-player-id="${r(i.player_id)}" aria-label="Open details for ${u(i.player_name||i.player_id)}" title="Open details for ${u(i.player_name||i.player_id)}" style="background:none; border:0; padding:0; font:inherit; color:inherit; cursor:pointer; font-weight:700; text-align:left">${r(i.player_name)}</button> ${I(i.position)}</div>
                            <div class="mono micro" style="color:var(--amber)">${i.weekly.toFixed(1)} pts · $${i.gridironAuction}</div>
                          </div>
                        </div>
                      `:"—"}
                    </td>
                    <td class="mono micro faint" style="font-weight:700; text-align:center">${r(n)}</td>
                    <td>
                      ${p?`
                        <div class="player-cell" style="cursor:pointer">
                          ${A(p,32)}
                          <div>
                            <div style="font-weight:700"><button class="row-open-btn" data-player-id="${r(p.player_id)}" aria-label="Open details for ${u(p.player_name||p.player_id)}" title="Open details for ${u(p.player_name||p.player_id)}" style="background:none; border:0; padding:0; font:inherit; color:inherit; cursor:pointer; font-weight:700; text-align:left">${r(p.player_name)}</button> ${I(p.position)}</div>
                            <div class="mono micro" style="color:var(--sky)">${p.weekly.toFixed(1)} pts · $${p.gridironAuction}</div>
                          </div>
                        </div>
                      `:"—"}
                    </td>
                    <td class="mono ${E}" style="font-weight:700">
                      ${L}${l.toFixed(1)} pts
                    </td>
                  </tr>
                `}).join("")})()}
          </tbody>
        </table>
      </div>
    </div>
  `}function Y(e){const s=e.deltaAuction>0?"text-good":e.deltaAuction<0?"text-bad":"faint",y=e.deltaAuction>0?"+":"",$=e.edge==="BUY"?"badge-emerald":e.edge==="SELL"?"badge-crimson":"badge-faint",o=e.edge==="BUY"?"▲ ":e.edge==="SELL"?"▼ ":"";return`
    <tr data-player-row="${r(e.player_id)}" data-team="${e.team||""}" class="clickable-row" style="cursor:pointer; --team-accent:${ie((e.team||"").toUpperCase())}">
      <td class="micro faint mono" style="font-weight:700"><button class="row-open-btn" data-player-id="${r(e.player_id)}" aria-label="Open details for ${u(e.player_name||e.player_id)}" title="Open details for ${u(e.player_name||e.player_id)}" style="background:none; border:0; padding:0; font:inherit; color:inherit; cursor:pointer; font-weight:700">${r(e.slot)}</button></td>
      <td>
        <div class="player-cell">
          ${A(e,32)}
          <div class="player-cell-info">
            <div class="player-cell-name">${r(e.player_name)} ${I(e.position)}</div>
            <div class="player-cell-sub">${ne(e.team,14)} ${r(e.team||"—")}</div>
          </div>
        </div>
      </td>
      <td class="micro faint">${r(e.team)} vs ${r(e.opponent_team||"TBD")}</td>
      <td class="mono" style="font-weight:700; color:var(--amber)">${e.weekly.toFixed(1)}</td>
      <td class="mono"><span class="badge badge-amber" title="${e.gridironUncapped!=null&&e.gridironUncapped!==e.gridironAuction?`Uncapped $${e.gridironUncapped}`:""}">$${e.gridironAuction}${e.gridironUncapped!=null&&e.gridironUncapped!==e.gridironAuction?` <span class="micro faint">($${e.gridironUncapped})</span>`:""}</span></td>
      <td class="mono"><span class="badge badge-sky" title="${e.marketUncapped!=null&&e.marketUncapped!==e.marketAuction?`Uncapped $${e.marketUncapped}`:""}">$${e.marketAuction}${e.marketUncapped!=null&&e.marketUncapped!==e.marketAuction?` <span class="micro faint">($${e.marketUncapped})</span>`:""}</span></td>
      <td class="mono ${s}">${y}$${e.deltaAuction}</td>
      <td><span class="badge ${$}" aria-label="${u(e.edge)}">${o}${e.edge}</span></td>
      <td class="mono micro">${e.ecr?`#${e.ecr}`:"—"}</td>
      <td>
        ${le({point:e.weekly,low:e.lower,high:e.upper,width:e.width,min:0,max:35})}
      </td>
      <td>${de(e.injury_status)}</td>
    </tr>
  `}export{P as renderRoster};
