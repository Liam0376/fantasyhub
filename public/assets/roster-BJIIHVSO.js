import{b as ae,k as X,e as se,m as re,h as s,l as Y,o as G,q as oe,f as le,u as ne,p as B,r as ie,n as $,i as j,t as de,v as ce,j as pe,s as A}from"./index-BgT1KpQD.js";import{c as me}from"./vbdAuction-hz1sTGD3.js";import{a as ve,e as ye}from"./slots-CIrAjNaS.js";import"./auctionMath-OgTQOWjR.js";let x="1",T="2",_="single";async function P(e){var O,U,W,V;const o=await ae().catch(()=>null),m=(o==null?void 0:o.rosters)||(o==null?void 0:o.teams)||null,y=o||await X({roster_id:"1"}),r=y.leagueRosters||y.allTeams||[];r.length&&!r.some(t=>String(t.roster_id)===String(x))&&(x=String(r[0].roster_id)),r.length>1&&!r.some(t=>String(t.roster_id)===String(T))&&(T=String(r[1].roster_id));const[h,c]=await Promise.all([(async()=>m&&typeof m=="object"?r.map(t=>{const p=String(t.roster_id),a=m[p]||m[Number(p)]||null;return a?{starters:a.starters||[],bench:a.bench||[],reserve:a.reserve||[],myRoster:a.starters||[],teamMeta:a.team_info||a.teamMeta||t,team_info:a.team_info||a.teamMeta||t}:null}):Promise.all(r.map(t=>X({roster_id:t.roster_id}).catch(()=>null))))(),se({limit:800}).catch(()=>({players:[]}))]),u=h,n=new Map;(c.players||[]).forEach(t=>{t.player_id&&n.set(String(t.player_id),t),t.player_name&&n.set(t.player_name.toLowerCase(),t)});const l=await re(le,oe).catch(()=>null),R={vbdParams:me(c.players||[],l),compPlayers:c.players||[]},L=(t,p)=>{if(!t)return null;const a=t.teamMeta||t.team_info||p||{},b=t.starters||t.myRoster||[],S=t.bench||[],k=t.reserve||[],{starters:f,bench:q}=ve(b,S,R),z=k.map((d,g)=>ye({...d,slot:`IR${g+1}`},null,{...R,defaultSlot:`IR${g+1}`})),F=[...f,...q,...z],Z=f.reduce((d,g)=>d+g.weekly,0),H=F.reduce((d,g)=>d+(g.modelAuction??0),0),N=F.map(d=>d.marketAuction),C=N.every(d=>d!=null)?N.reduce((d,g)=>d+g,0):null,D=C!=null?H-C:null,ee=[...F].sort((d,g)=>g.weekly-d.weekly)[0]||null,w={QB:0,RB:0,WR:0,TE:0};f.forEach(d=>{w[d.position]!==void 0&&(w[d.position]+=d.weekly)});const te={QB:w.QB/16,RB:w.RB/22,WR:w.WR/26,TE:w.TE/9};let I="TE",Q=999;return Object.entries(te).forEach(([d,g])=>{g<Q&&(Q=g,I=d)}),{roster_id:String(a.roster_id||""),owner_name:a.display_name||a.owner_name||a.team_name||`Team ${a.roster_id}`,team_name:a.team_name||a.display_name||`Team ${a.roster_id}`,avatar_url:a.avatar_url||null,starters:f,bench:q,reserve:z,allPlayers:F,starterFPTS:Z,totalModel:H,totalMarket:C,deltaTotal:D,topPlayer:ee,weakestPos:`${I} (${w[I].toFixed(1)} pts)`}},i=u.map((t,p)=>L(t,r[p])).filter(Boolean);i.sort((t,p)=>p.starterFPTS-t.starterFPTS),i.forEach((t,p)=>{t.rank=p+1});const M=i.some(t=>t.totalMarket!=null),E=i.find(t=>t.roster_id===x)||i[0],J=i.find(t=>t.roster_id===T)||i[1]||i[0];e.innerHTML=`
    <!-- Header Hero -->
    <div class="hero reveal in">
      <h1>League directory</h1>
      <p>${s(Y(l))} financial &amp; power leaderboard with side-by-side roster inspector.</p>
    </div>

    <!-- Financial & Power Leaderboard -->
    <div class="card reveal in" style="margin-top:8px">
      <div class="card-header">
        <div>
          <h3>${s(Y(l))} Financial &amp; Power Leaderboard</h3>
          <span class="kicker">Ranked by starter projected pts &amp; Model $</span>
        </div>
        <span class="badge badge-amber mono" aria-live="polite">${i.length} League Teams</span>
      </div>
      <div class="card-body" style="padding:0">
        <div class="table-wrap" style="border:0; border-radius:0">
          <table aria-label="League leaderboard">
            <caption class="sr-only">${l?l.teams:"?"}-team financial and power leaderboard</caption>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Roster ID</th>
                <th>Team &amp; Owner</th>
                <th style="color:var(--amber)">Starter Projected FPTS</th>
                <th style="color:var(--emerald)">Total Model $</th>
                ${M?`<th style="color:var(--sky)">Market Consensus $</th>
                <th>Δ $ Edge</th>`:""}
                <th>Top Player</th>
                <th>Weakest Position</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${i.map(t=>he(t,x,M)).join("")}
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
              ${i.map(t=>`<option value="${t.roster_id}" ${t.roster_id===x?"selected":""}>#${t.rank} ${s(t.team_name)} (@${s(t.owner_name)})</option>`).join("")}
            </select>
          </div>

          ${_==="compare"?`
            <div style="display:flex; align-items:center; gap:10px">
              <span class="mono" style="font-weight:700; font-size:12px; color:var(--sky)">TEAM B:</span>
              <select id="selectTeamB" class="team-select-dropdown">
                ${i.map(t=>`<option value="${t.roster_id}" ${t.roster_id===T?"selected":""}>#${t.rank} ${s(t.team_name)} (@${s(t.owner_name)})</option>`).join("")}
              </select>
            </div>
          `:""}
        </div>

        <!-- Inspector View Content -->
        ${_==="single"?ge(E):ue(E,J)}
      </div>
    </div>
  `,e.querySelectorAll("[data-inspect-id]").forEach(t=>{t.addEventListener("click",p=>{p.stopPropagation(),x=t.getAttribute("data-inspect-id"),P(e);const a=e.querySelector("#inspectorSection");a&&a.scrollIntoView({behavior:"smooth"})})}),(O=e.querySelector("#btnModeSingle"))==null||O.addEventListener("click",()=>{_="single",P(e)}),(U=e.querySelector("#btnModeCompare"))==null||U.addEventListener("click",()=>{_="compare",P(e)}),(W=e.querySelector("#selectTeamA"))==null||W.addEventListener("change",t=>{x=t.target.value,P(e)}),(V=e.querySelector("#selectTeamB"))==null||V.addEventListener("change",t=>{T=t.target.value,P(e)}),e.querySelectorAll("[data-player-row]").forEach(t=>{t.addEventListener("click",p=>{if(p.target.closest("button, a"))return;const a=t.getAttribute("data-player-row");let b=null;i.forEach(S=>{const k=S.allPlayers.find(f=>String(f.player_id)===String(a));k&&(b=k)}),b&&G(b,e)})}),e.querySelectorAll("[data-player-id]").forEach(t=>{const p=()=>{const a=t.getAttribute("data-player-id");let b=null;i.forEach(S=>{const k=S.allPlayers.find(f=>String(f.player_id)===String(a));k&&(b=k)}),b&&G(b,e)};t.addEventListener("click",a=>{a.stopPropagation(),p()}),t.tagName!=="BUTTON"&&t.addEventListener("keydown",a=>{(a.key==="Enter"||a.key===" ")&&(a.preventDefault(),p())})})}function he(e,o,m=!0){const y=e.roster_id===o,r=e.deltaTotal>0?"text-good":e.deltaTotal<0?"text-bad":"faint",h=e.deltaTotal>0?"+":"";return`
    <tr class="clickable-row ${y?"selected-row":""}" style="cursor:pointer; ${y?"background:rgba(245,158,11,0.06);":""}">
      <td class="mono" style="font-weight:700">
        <span class="badge ${e.rank<=3?"badge-emerald":e.rank<=8?"badge-amber":"badge-faint"}">#${e.rank}</span>
      </td>
      <td class="mono micro faint">Roster #${s(e.roster_id)}</td>
      <td>
        <div class="player-cell">
          ${ne(e,32)}
          <div class="player-cell-info">
            <div class="player-cell-name" style="font-weight:700">${s(e.team_name)}</div>
            <div class="player-cell-sub">@${s(e.owner_name)}</div>
          </div>
        </div>
      </td>
      <td class="mono" style="font-size:14px; font-weight:700; color:var(--amber)">
        ${e.starterFPTS.toFixed(1)} <span class="micro faint">pts/wk</span>
      </td>
      <td class="mono"><span class="badge badge-emerald">$${e.totalModel}</span></td>
      ${m?`<td class="mono"><span class="badge badge-sky">$${e.totalMarket}</span></td>
      <td class="mono ${r}">${h}$${e.deltaTotal}</td>`:""}
      <td>
        ${e.topPlayer?`
          <div style="display:flex; align-items:center; gap:6px" class="mono micro">
            ${B(e.topPlayer,24)}
            <span>${s(e.topPlayer.player_name)} (${e.topPlayer.position}, $${e.topPlayer.modelAuction})</span>
          </div>
        `:"—"}
      </td>
      <td class="mono micro text-bad">${s(e.weakestPos)}</td>
      <td>
        <button class="btn btn-ghost btn-sm" data-inspect-id="${s(e.roster_id)}">Inspect</button>
      </td>
    </tr>
  `}function ge(e){if(!e)return'<div class="empty">No team selected.</div>';const o=[...e.starters||[],...e.bench||[],...e.reserve||[]],m=o.some(r=>r.marketAuction!=null),y=o.some(r=>r.ecr!=null);return`
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
          <div class="mono kpi-val" style="color:var(--emerald)">$${e.totalModel}</div>
          ${e.totalMarket!=null?`<span class="micro faint">Market $${e.totalMarket}</span>`:""}
        </div>
        <div class="kpi-card">
          <span class="kicker">Weakest Position</span>
          <div class="mono kpi-val text-bad" style="font-size:16px; margin-top:6px">${s(e.weakestPos)}</div>
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
               ${m?`<th style="color:var(--sky)">Market $</th>
               <th>Δ $</th>`:""}
               <th>Edge</th>
               ${y?"<th>ECR</th>":""}
              <th>Conformal Interval</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${e.starters.map(r=>K(r,m,y)).join("")}
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
              ${m?`<th style="color:var(--sky)">Market $</th>
              <th>Δ $</th>`:""}
              <th>Edge</th>
              ${y?"<th>ECR</th>":""}
              <th>Conformal Interval</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${[...e.bench,...e.reserve].map(r=>K(r,m,y)).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `}function ue(e,o){if(!e||!o)return'<div class="empty">Select two teams to compare.</div>';const m=(r,h)=>r.starters.filter(c=>c.position===h||h==="WR"&&c.slot.startsWith("FLEX")&&c.position==="WR"||h==="RB"&&c.slot.startsWith("FLEX")&&c.position==="RB").reduce((c,u)=>c+u.weekly,0),y=["QB","RB","WR","TE"];return`
    <div class="reveal in">
      <!-- Head to Head Summary Cards -->
      <div style="display:grid; grid-template-columns:1fr 80px 1fr; gap:12px; align-items:center; margin-bottom:16px; background:var(--surface-raised); padding:16px; border-radius:12px; border:1px solid var(--border)">
        <!-- Team A -->
        <div style="display:flex; align-items:center; gap:12px">
          <div class="player-avatar" style="width:44px; height:44px">
            ${e.avatar_url&&A(e.avatar_url)?`<img src="${$(A(e.avatar_url))}" />`:`<div class="player-avatar-fallback" style="background:var(--amber)">${s(e.owner_name).charAt(0)}</div>`}
          </div>
          <div>
            <div style="font-weight:700; font-size:16px">${s(e.team_name)}</div>
            <div class="mono micro faint">Rank #${e.rank} · ${e.starterFPTS.toFixed(1)} FPTS<br>$${e.totalModel}</div>
          </div>
        </div>

        <!-- VS Badge -->
        <div style="text-align:center">
          <span class="badge badge-amber mono" style="font-size:14px">VS</span>
        </div>

        <!-- Team B -->
        <div style="display:flex; align-items:center; justify-content:flex-end; gap:12px">
          <div style="text-align:right">
            <div style="font-weight:700; font-size:16px">${s(o.team_name)}</div>
            <div class="mono micro faint">Rank #${o.rank} · ${o.starterFPTS.toFixed(1)} FPTS<br>$${o.totalModel}</div>
          </div>
          <div class="player-avatar" style="width:44px; height:44px">
            ${o.avatar_url&&A(o.avatar_url)?`<img src="${$(A(o.avatar_url))}" />`:`<div class="player-avatar-fallback" style="background:var(--sky)">${s(o.owner_name).charAt(0)}</div>`}
          </div>
        </div>
      </div>

      <!-- Positional Comparison Heatmap Grid -->
      <div style="margin-bottom:16px">
        <span class="kicker" style="display:block; margin-bottom:8px">Position-by-Position FPTS Advantage</span>
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px">
          ${y.map(r=>{const h=m(e,r),c=m(o,r),u=h-c,n=u>0?e.team_name:u<0?o.team_name:"EVEN",l=u>0?"color:var(--amber)":u<0?"color:var(--sky)":"color:var(--text-muted)";return`
              <div style="background:var(--surface-raised); border:1px solid var(--border); border-radius:10px; padding:10px; text-align:center">
                <span class="mono" style="font-weight:700; font-size:12px; color:var(--text-faint)">${r} POSITION</span>
                <div style="display:flex; justify-content:space-around; margin:6px 0; font-size:14px" class="mono">
                  <strong style="color:var(--amber)">${h.toFixed(1)}</strong>
                  <span class="faint">vs</span>
                  <strong style="color:var(--sky)">${c.toFixed(1)}</strong>
                </div>
                <span class="micro" style="font-weight:700; ${l}">
                  ${u!==0?`${n} +${Math.abs(u).toFixed(1)}`:"EVEN"}
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
              <th style="color:var(--amber)">${s(e.team_name)} Starter</th>
              <th>Slot</th>
              <th style="color:var(--sky)">${s(o.team_name)} Starter</th>
              <th>Advantage</th>
            </tr>
          </thead>
          <tbody>
            ${(()=>{const r=["QB","RB1","RB2","WR1","WR2","TE","FLEX1","FLEX2","K","DEF"],h=new Map(e.starters.map(n=>[n.slot,n])),c=new Map(o.starters.map(n=>[n.slot,n])),u=[...new Set([...e.starters.map(n=>n.slot),...o.starters.map(n=>n.slot)])].filter(n=>!r.includes(n));return[...r,...u].map(n=>{const l=h.get(n)||null,v=c.get(n)||null;if(!l&&!v)return"";const R=l?l.weekly:0,L=v?v.weekly:0,i=R-L,M=i>0?"text-good":i<0?"text-bad":"faint",E=i>0?"+":"";return`
                  <tr>
                    <td>
                      ${l?`
                        <div class="player-cell" style="cursor:pointer">
                          ${B(l,32)}
                          <div>
                            <div style="font-weight:700"><button class="row-open-btn" data-player-id="${s(l.player_id)}" aria-label="Open details for ${$(l.player_name||l.player_id)}" title="Open details for ${$(l.player_name||l.player_id)}" style="background:none; border:0; padding:0; font:inherit; color:inherit; cursor:pointer; font-weight:700; text-align:left">${s(l.player_name)}</button> ${j(l.position)}</div>
                            <div class="mono micro" style="color:var(--amber)">${l.weekly.toFixed(1)} pts · $${l.modelAuction}</div>
                          </div>
                        </div>
                      `:"—"}
                    </td>
                    <td class="mono micro faint" style="font-weight:700; text-align:center">${s(n)}</td>
                    <td>
                      ${v?`
                        <div class="player-cell" style="cursor:pointer">
                          ${B(v,32)}
                          <div>
                            <div style="font-weight:700"><button class="row-open-btn" data-player-id="${s(v.player_id)}" aria-label="Open details for ${$(v.player_name||v.player_id)}" title="Open details for ${$(v.player_name||v.player_id)}" style="background:none; border:0; padding:0; font:inherit; color:inherit; cursor:pointer; font-weight:700; text-align:left">${s(v.player_name)}</button> ${j(v.position)}</div>
                            <div class="mono micro" style="color:var(--sky)">${v.weekly.toFixed(1)} pts · $${v.modelAuction}</div>
                          </div>
                        </div>
                      `:"—"}
                    </td>
                    <td class="mono ${M}" style="font-weight:700">
                      ${E}${i.toFixed(1)} pts
                    </td>
                  </tr>
                `}).join("")})()}
          </tbody>
        </table>
      </div>
    </div>
  `}function K(e,o=!0,m=!0){const y=e.deltaAuction>0?"text-good":e.deltaAuction<0?"text-bad":"faint",r=e.deltaAuction>0?"+":"",h=e.edge==="BUY"?"badge-emerald":e.edge==="SELL"?"badge-crimson":"badge-faint",c=e.edge==="BUY"?"▲ ":e.edge==="SELL"?"▼ ":"";return`
    <tr data-player-row="${s(e.player_id)}" data-team="${e.team||""}" class="clickable-row" style="cursor:pointer; --team-accent:${ie((e.team||"").toUpperCase())}">
      <td class="micro faint mono" style="font-weight:700"><button class="row-open-btn" data-player-id="${s(e.player_id)}" aria-label="Open details for ${$(e.player_name||e.player_id)}" title="Open details for ${$(e.player_name||e.player_id)}" style="background:none; border:0; padding:0; font:inherit; color:inherit; cursor:pointer; font-weight:700">${s(e.slot)}</button></td>
      <td>
        <div class="player-cell">
          ${B(e,32)}
          <div class="player-cell-info">
            <div class="player-cell-name">${s(e.player_name)} ${j(e.position)}</div>
            <div class="player-cell-sub">${de(e.team,14)} ${s(e.team||"—")}</div>
          </div>
        </div>
      </td>
      <td class="micro faint">${s(e.team)} vs ${s(e.opponent_team||"TBD")}</td>
      <td class="mono" style="font-weight:700; color:var(--amber)">${e.weekly.toFixed(1)}</td>
      <td class="mono"><span class="badge badge-amber" title="${e.modelUncapped!=null&&e.modelUncapped!==e.modelAuction?`Uncapped $${e.modelUncapped}`:""}">$${e.modelAuction}${e.modelUncapped!=null&&e.modelUncapped!==e.modelAuction?` <span class="micro faint">($${e.modelUncapped})</span>`:""}</span></td>
      ${o?`<td class="mono"><span class="badge badge-sky" title="Market consensus auction value">$${e.marketAuction}</span></td>
      <td class="mono ${y}">${r}$${e.deltaAuction}</td>`:""}
      <td><span class="badge ${h}" aria-label="${$(e.edge)}">${c}${e.edge}</span></td>
      ${m?`<td class="mono micro">${e.ecr?`#${e.ecr}`:"—"}</td>`:""}
      <td>
        ${ce({point:e.weekly,low:e.lower,high:e.upper,width:e.width,min:0,max:35})}
      </td>
      <td>${pe(e.injury_status)}</td>
    </tr>
  `}export{P as renderRoster};
