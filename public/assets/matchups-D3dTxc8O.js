import{r as et,f as G,d as at,b as H,g as st,h as nt,t as U,e as u,w as rt,u as W,o as X,v as it,k as ot,m as O,i as D,p as I,j as V,q as K,n as Q}from"./index-CibLCON9.js";import{c as lt}from"./vbdAuction-Cb1K_nds.js";import{a as dt}from"./slots-BULL9fdw.js";import"./auctionMath-Cpr0Uxq8.js";async function xt(e){const t=new URLSearchParams(location.hash.split("?")[1]||""),g=t.get("week")?Number(t.get("week")):null,[y,l]=await Promise.all([et({week:g}),G().catch(()=>({}))]),v=y.week??g??"",h=y.leagueMatchups||[],x=y.nflSlate||[],s=typeof(l==null?void 0:l.data_source)=="string"&&l.data_source.toLowerCase()==="demo",o=typeof(l==null?void 0:l.weather_status)=="string"&&l.weather_status.toLowerCase()==="placeholder"||(l==null?void 0:l.weather_placeholder)===!0,n=new Map;h.forEach(a=>{const i=a.matchup_id==null?null:String(a.matchup_id);i!=null&&(n.has(i)||n.set(i,[]),n.get(i).push(a))});let r=[],c=new Map,w=new Map;if(n.size>0){const a=await at({week:g}).catch(()=>null),i=(a==null?void 0:a.rosters)||(a==null?void 0:a.teams)||null,d=a||await H({roster_id:"1"});r=d.leagueRosters||d.allTeams||[];const[m,f]=await Promise.all([(async()=>i&&typeof i=="object"?r.map(p=>{const _=String(p.roster_id),$=i[_]||i[Number(_)]||null;return $?{starters:$.starters||[],bench:$.bench||[],reserve:$.reserve||[],myRoster:$.starters||[],teamMeta:$.team_info||$.teamMeta||p,team_info:$.team_info||$.teamMeta||p}:null}):Promise.all(r.map(p=>H({roster_id:p.roster_id}).catch(()=>null))))(),st({limit:800}).catch(()=>({players:[]}))]);(f.players||[]).forEach(p=>{p.player_id&&w.set(String(p.player_id),p),p.player_name&&w.set(p.player_name.toLowerCase(),p)});const b=await nt(G,ot).catch(()=>null),F={vbdParams:lt(f.players||[],b),compPlayers:f.players||[]};m.forEach((p,_)=>{var q;if(!p)return;const $=p.teamMeta||p.team_info||r[_]||{},z=String($.roster_id||((q=r[_])==null?void 0:q.roster_id)||""),J=p.starters||p.myRoster||[],Z=p.bench||[],{starters:C,bench:R}=dt(J,Z,F),A=C.reduce((M,P)=>M+P.weekly,0),B=[...C,...R].reduce((M,P)=>M+(P.gridironAuction??0),0),N=[...C,...R].map(M=>M.marketAuction),tt=N.every(M=>M!=null)?N.reduce((M,P)=>M+P,0):null;c.set(z,{roster_id:z,owner_name:$.display_name||$.owner_name||`Team ${z}`,team_name:$.team_name||$.display_name||`Team ${z}`,avatar_url:$.avatar_url||null,starters:C,bench:R,starterFPTS:A,totalGridiron:B,totalMarket:tt})})}const j=[...c.values()].some(a=>[...a.starters,...a.bench].some(i=>i.marketAuction!=null)),k=new Map;x.forEach(a=>{k.set((a.home_team||a.home||"").toUpperCase(),a),k.set((a.away_team||a.away||"").toUpperCase(),a)});const T=`
    <div class="row" style="gap:8px">
      <span class="kicker">Week</span>
      <div class="filters week-picker-scroll" style="overflow-x:auto; flex-wrap:nowrap; max-width:100%; padding-bottom:4px">
        ${Array.from({length:18},(a,i)=>i+1).map(a=>`<button class="chip ${String(a)===String(v)?"active":""}" data-week="${a}" title="Show week ${a}" style="flex-shrink:0">${a}</button>`).join("")}
        <button class="chip" data-week="" title="Show all weeks" style="flex-shrink:0">All</button>
      </div>
    </div>
  `,S=[...n.entries()].sort((a,i)=>a[0]-i[0]);e.innerHTML=`
    <div class="hero reveal in">
      <h1>Matchups <span class="badge" style="background:var(--color-primary); color:white; vertical-align:middle" aria-live="polite">Week ${v||"—"}</span></h1>
      <p>Head-to-head fantasy matchups with model projections${j?" vs market consensus":""}. Click a matchup for slot breakdown.</p>
    </div>
    ${s?'<div class="alert alert-warn reveal in" role="status" style="margin-top:12px">Demo data: run refresh to load live Sleeper data.</div>':""}
    <div class="card reveal in" style="margin-top:12px">
      <div class="card-body">${T}</div>
    </div>

    <div style="display:flex; flex-direction:column; gap:16px; margin-top:12px">
      ${S.length>0?S.map(([a,i])=>{var f,b;const d=c.get(String((f=i[0])==null?void 0:f.roster_id))||null,m=i[1]&&c.get(String((b=i[1])==null?void 0:b.roster_id))||null;return ct(d,m,a,i,k,j)}).join(""):`<div class="card reveal in"><div class="empty">No matchups loaded for week ${v||"—"}. Start the backend server and refresh data.</div></div>`}
    </div>

    <!-- NFL Slate -->
    <div class="card reveal in" style="margin-top:24px">
      <div class="card-header"><h3>NFL Slate</h3><span class="kicker" aria-live="polite">${x.length?`${x.length} games`:"no data"}${o?" · Weather placeholder":""}</span></div>
      <div class="card-body" style="padding:0">
        ${x.length?`
          <div class="table-wrap" style="border:0; border-radius:0"><table aria-label="NFL slate">
            <caption class="sr-only">NFL games for week ${v||"—"}</caption>
            <thead><tr><th>Game</th><th>Stadium</th><th>Time</th><th>Spread</th><th>O/U</th><th>Wind</th><th>Precip</th></tr></thead>
            <tbody>
              ${x.map(a=>`
                <tr>
                  <td><div class="matchup-game">${U(a.away_team||a.away,20)} <span class="mono">${a.away_team||a.away||"—"}</span> <span class="faint">@</span> ${U(a.home_team||a.home,20)} <span class="mono">${a.home_team||a.home||"—"}</span></div></td>
                  <td class="faint">${u(a.stadium||"—")}</td>
                  <td class="micro" style="color:var(--text-muted)">${u(a.gameday||"")} ${u(a.gametime||"")}</td>
                  <td class="mono">${a.spread_line!=null?a.spread_line:"—"}</td>
                  <td class="mono">${a.total_line!=null?a.total_line:"—"}</td>
                  <td>${rt(a.wind_mph)}</td>
                  <td class="mono" style="font-size:12px">${a.precip_prob!=null?`${a.precip_prob}%`:"—"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table></div>
        `:`<div class="empty">No NFL schedule for week ${v||"—"}.</div>`}
      </div>
    </div>
  `,e.querySelectorAll("[data-week]").forEach(a=>{a.addEventListener("click",()=>{const i=a.getAttribute("data-week");location.hash=`matchups${i?`?week=${i}`:""}`})}),e.querySelectorAll("[data-matchup-id]").forEach(a=>{const i=()=>{var F,p;const d=String(a.getAttribute("data-matchup-id")),m=S.find(([_])=>String(_)===d);if(!m)return;const[,f]=m,b=c.get(String((F=f[0])==null?void 0:F.roster_id))||null,E=f[1]&&c.get(String((p=f[1])==null?void 0:p.roster_id))||null;b&&pt(b,E,d,k,e,c)};a.addEventListener("click",d=>{d.target.closest("[data-player-id]")||i()}),a.addEventListener("keydown",d=>{if(d.key==="Enter"||d.key===" "){if(d.target.closest&&d.target.closest("[data-player-id]"))return;d.preventDefault(),i()}})}),e.querySelectorAll("[data-player-id]").forEach(a=>{const i=()=>{const d=a.getAttribute("data-player-id");let m=null;c.forEach(f=>{const b=[...f.starters,...f.bench].find(E=>String(E.player_id)===d);b&&(m=b)}),m&&X(m,e)};a.addEventListener("click",d=>{d.stopPropagation(),i()}),a.addEventListener("keydown",d=>{(d.key==="Enter"||d.key===" ")&&(d.preventDefault(),d.stopPropagation(),i())})})}function ct(e,t,g,y,l,v=!0){if(!e)return`<div class="card reveal in"><div class="empty">Matchup ${g}: Missing roster data</div></div>`;const h=e.starterFPTS,x=t?t.starterFPTS:0,s=Math.sqrt(e.starters.reduce((c,w)=>c+w.width*w.width,0)+(t?t.starters.reduce((c,w)=>c+w.width*w.width,0):0))||10,o=h-x,n=t?Math.round(100*Y(o/s)):100,r=100-n;return`
    <div class="card reveal in matchup-card" data-matchup-id="${g}" tabindex="0" role="button" aria-label="Open breakdown for matchup ${g}" style="cursor:pointer">
      <div class="card-header">
        <div style="display:flex; align-items:center; gap:8px">
          <span class="badge badge-faint mono">Match ${g}</span>
          <span class="micro faint">Click for breakdown</span>
        </div>
        ${n!==r?`<span class="badge ${n>r?"badge-emerald":"badge-sky"}" style="font-size:11px">${n>r?u(e.team_name):u((t==null?void 0:t.team_name)||"—")} favored</span>`:""}
      </div>
      <div class="card-body" style="padding:0">
        <!-- Summary Bar -->
        <div style="display:grid; grid-template-columns:1fr auto 1fr; align-items:center; padding:16px; gap:12px">
          <!-- Team A -->
          <div style="display:flex; align-items:center; gap:10px">
            ${W(e,40)}
            <div>
              <div style="font-weight:700; font-size:15px">${u(e.team_name)}</div>
              <div class="micro faint">@${u(e.owner_name)}</div>
            </div>
          </div>

          <!-- Center: Score + Win Prob -->
          <div style="text-align:center; min-width:160px">
            <div style="display:flex; align-items:baseline; justify-content:center; gap:12px">
              <span class="mono" style="font-size:22px; font-weight:800; color:var(--amber)">${h.toFixed(1)}</span>
              <span class="faint" style="font-size:14px">vs</span>
              <span class="mono" style="font-size:22px; font-weight:800; color:var(--sky)">${x.toFixed(1)}</span>
            </div>
            <div style="font-size:11px; margin-top:4px">
              <span class="mono" style="color:${n>=50?"var(--emerald)":"var(--text-muted)"}">${n}%</span>
              <span class="faint" style="margin:0 4px">-</span>
              <span class="mono" style="color:${r>=50?"var(--emerald)":"var(--text-muted)"}">${r}%</span>
            </div>
            <!-- Win prob bar -->
            <div style="height:4px; border-radius:2px; background:var(--surface-raised); margin-top:6px; overflow:hidden; display:flex">
              <div style="width:${n}%; background:var(--amber); border-radius:2px 0 0 2px"></div>
              <div style="width:${r}%; background:var(--sky); border-radius:0 2px 2px 0"></div>
            </div>
          </div>

          <!-- Team B -->
          <div style="display:flex; align-items:center; justify-content:flex-end; gap:10px">
            <div style="text-align:right">
              <div style="font-weight:700; font-size:15px">${u((t==null?void 0:t.team_name)||"—")}</div>
              <div class="micro faint">@${u((t==null?void 0:t.owner_name)||"—")}</div>
            </div>
            ${t?W(t,40):""}
          </div>
        </div>

        <!-- Financial Summary -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0; border-top:1px solid var(--border)">
          <div style="padding:8px 16px; display:flex; gap:16px; align-items:center; border-right:1px solid var(--border)">
            <span class="micro faint">Model $</span>
            <span class="badge badge-amber mono">$${e.totalGridiron}</span>
            ${v?`<span class="micro faint">Market $</span>
            <span class="badge badge-sky mono">$${e.totalMarket}</span>`:""}
          </div>
          <div style="padding:8px 16px; display:flex; gap:16px; align-items:center; justify-content:flex-end">
            <span class="micro faint">Model $</span>
            <span class="badge badge-amber mono">$${(t==null?void 0:t.totalGridiron)||0}</span>
            ${v?`<span class="micro faint">Market $</span>
            <span class="badge badge-sky mono">$${t==null?void 0:t.totalMarket}</span>`:""}
          </div>
        </div>

      </div>
    </div>
  `}function pt(e,t,g,y,l,v){var a,i,d;let h=document.getElementById("matchupModalContainer");h||(h=document.createElement("div"),h.id="matchupModalContainer",document.body.appendChild(h));const x=e.starterFPTS,s=t?t.starterFPTS:0,o=Math.sqrt(e.starters.reduce((m,f)=>m+f.width*f.width,0)+(t?t.starters.reduce((m,f)=>m+f.width*f.width,0):0))||10,n=x-s,r=t?Math.round(100*Y(n/o)):100,c=100-r,w=gt(e,t,y),j=e.totalMarket!=null||(t==null?void 0:t.totalMarket)!=null;h.innerHTML=`
    <div class="matchup-modal-backdrop" id="matchupModalBackdrop">
      <div class="matchup-modal-card card reveal in" role="dialog" aria-modal="true" tabindex="-1" aria-label="Matchup ${g} breakdown">
        <button class="modal-close-btn" id="matchupCloseBtn" aria-label="Close modal">✕</button>

        <!-- Header: Team vs Team -->
        <div style="display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:16px; padding-bottom:16px; border-bottom:1px solid var(--border)">
          <div style="display:flex; align-items:center; gap:10px">
            ${W(e,48)}
            <div>
              <div style="font-weight:700; font-size:17px">${u(e.team_name)}</div>
              <div class="micro faint">@${u(e.owner_name)}</div>
            </div>
          </div>
          <div style="text-align:center; min-width:140px">
            <div style="display:flex; align-items:baseline; justify-content:center; gap:12px">
              <span class="mono" style="font-size:26px; font-weight:800; color:var(--amber)">${x.toFixed(1)}</span>
              <span class="faint" style="font-size:14px">vs</span>
              <span class="mono" style="font-size:26px; font-weight:800; color:var(--sky)">${s.toFixed(1)}</span>
            </div>
            <div style="font-size:11px; margin-top:4px">
              <span class="mono" style="color:${r>=50?"var(--emerald)":"var(--text-muted)"}">${r}%</span>
              <span class="faint" style="margin:0 4px">-</span>
              <span class="mono" style="color:${c>=50?"var(--emerald)":"var(--text-muted)"}">${c}%</span>
            </div>
            <div style="height:4px; border-radius:2px; background:var(--surface-raised); margin-top:6px; overflow:hidden; display:flex">
              <div style="width:${r}%; background:var(--amber)"></div>
              <div style="width:${c}%; background:var(--sky)"></div>
            </div>
          </div>
          <div style="display:flex; align-items:center; justify-content:flex-end; gap:10px">
            <div style="text-align:right">
              <div style="font-weight:700; font-size:17px">${u((t==null?void 0:t.team_name)||"—")}</div>
              <div class="micro faint">@${u((t==null?void 0:t.owner_name)||"—")}</div>
            </div>
            ${t?W(t,48):""}
          </div>
        </div>

        <!-- Financial comparison -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0; margin-top:12px; border:1px solid var(--border); border-radius:10px; overflow:hidden">
          <div style="padding:10px 16px; display:flex; gap:12px; align-items:center; background:var(--surface-raised); border-right:1px solid var(--border)">
            <span class="micro faint">Model $</span>
            <span class="badge badge-amber mono">$${e.totalGridiron}</span>
            ${j?`<span class="micro faint">Market $</span>
            <span class="badge badge-sky mono">$${e.totalMarket}</span>`:""}
          </div>
          <div style="padding:10px 16px; display:flex; gap:12px; align-items:center; justify-content:flex-end; background:var(--surface-raised)">
            <span class="micro faint">Model $</span>
            <span class="badge badge-amber mono">$${(t==null?void 0:t.totalGridiron)||0}</span>
            ${j?`<span class="micro faint">Market $</span>
            <span class="badge badge-sky mono">$${t==null?void 0:t.totalMarket}</span>`:""}
          </div>
        </div>

        <!-- Slot-by-slot breakdown -->
        ${ut(e,t,w,y)}

        <div style="margin-top:16px; display:flex; justify-content:flex-end">
          <button class="btn btn-ghost" id="matchupDismissBtn">Close</button>
        </div>
      </div>
    </div>
  `;const k=document.activeElement instanceof HTMLElement?document.activeElement:null;let T=()=>{};const S=()=>{try{T()}catch{}h.innerHTML="",k&&typeof k.focus=="function"&&document.contains(k)&&(!document.activeElement||document.activeElement===document.body)&&k.focus()};T=it(h.querySelector(".matchup-modal-card"),k,S),(a=document.getElementById("matchupCloseBtn"))==null||a.addEventListener("click",S),(i=document.getElementById("matchupDismissBtn"))==null||i.addEventListener("click",S),(d=document.getElementById("matchupModalBackdrop"))==null||d.addEventListener("click",m=>{m.target.id==="matchupModalBackdrop"&&S()}),h.querySelectorAll("[data-player-id]").forEach(m=>{const f=()=>{const b=m.getAttribute("data-player-id");let E=null;v.forEach(F=>{const p=[...F.starters,...F.bench].find(_=>String(_.player_id)===b);p&&(E=p)}),E&&X(E,l)};m.addEventListener("click",b=>{b.stopPropagation(),f()}),m.addEventListener("keydown",b=>{(b.key==="Enter"||b.key===" ")&&(b.preventDefault(),b.stopPropagation(),f())})})}function L(e,t){if(e==null)return 0;if(e.wind_mph>0)return e.wind_mph;const g=t&&t.get((e.team||"").toUpperCase());return g&&g.wind_mph||0}function ut(e,t,g,y){const l=["QB","RB1","RB2","WR1","WR2","TE","FLEX1","FLEX2","K","DEF"],v=new Map(e.starters.map(s=>[s.slot,s])),h=new Map(((t==null?void 0:t.starters)||[]).map(s=>[s.slot,s])),x=[...new Set([...e.starters.map(s=>s.slot),...((t==null?void 0:t.starters)||[]).map(s=>s.slot)])].filter(s=>!l.includes(s));return`
    <!-- Slot-by-Slot Breakdown -->
    <div style="border-top:1px solid var(--border)">
      <div class="table-wrap matchup-table-scroll" style="border:0; border-radius:0; overflow-x:auto; max-width:100%">
        <table style="min-width:900px" aria-label="Slot-by-slot matchup">
          <caption class="sr-only">Head-to-head starters by slot</caption>
          <thead>
            <tr>
              <th style="width:30%">${u(e.team_name)}</th>
              <th style="text-align:center; width:5%">Slot</th>
              <th style="width:30%; text-align:right">${u((t==null?void 0:t.team_name)||"—")}</th>
              <th style="text-align:center; width:10%">Edge</th>
              <th style="text-align:center; width:25%">Intervals</th>
            </tr>
          </thead>
          <tbody>
            ${[...l,...x].map((s,o)=>{const n=v.get(s)||null,r=h.get(s)||null;return!n&&!r?"":yt(n,r,s,o,y)}).join("")}
            <tr style="background:var(--surface-raised); font-weight:700">
              <td>
                <div style="display:flex; align-items:center; gap:8px; padding:4px 0">
                  <span class="mono" style="font-size:16px; color:var(--amber)">${e.starterFPTS.toFixed(1)} pts</span>
                </div>
              </td>
              <td style="text-align:center" class="mono micro faint">TOTAL</td>
              <td style="text-align:right">
                <span class="mono" style="font-size:16px; color:var(--sky)">${t?t.starterFPTS.toFixed(1):"0.0"} pts</span>
              </td>
              <td style="text-align:center">
                <span class="mono" style="font-weight:800; color:${e.starterFPTS>=((t==null?void 0:t.starterFPTS)||0)?"var(--emerald)":"var(--crimson)"}">
                  ${e.starterFPTS>=((t==null?void 0:t.starterFPTS)||0)?"+":""}${(e.starterFPTS-((t==null?void 0:t.starterFPTS)||0)).toFixed(1)}
                </span>
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    ${g.length>0?`
      <!-- Key Factors & Insights -->
      <div style="border-top:1px solid var(--border); padding:12px 16px">
        <span class="kicker" style="display:block; margin-bottom:8px">Key factors</span>
        <div style="display:flex; flex-wrap:wrap; gap:8px">
          ${g.map(s=>`
            <div style="display:inline-flex; align-items:center; gap:6px; padding:6px 10px; background:${s.bg}; border:1px solid ${s.border}; border-radius:8px; font-size:12px; color:${s.color}">
              <span style="font-size:14px">${s.icon}</span>
              <span>${u(s.text)}</span>
            </div>
          `).join("")}
        </div>
      </div>
    `:""}
  `}function yt(e,t,g,y,l){e!=null&&e.slot||t!=null&&t.slot||g||y!=null&&y+1;const v=((e==null?void 0:e.weekly)||0)-((t==null?void 0:t.weekly)||0),h=v>2?"color:var(--emerald)":v<-2?"color:var(--crimson)":"color:var(--text-muted)",x=e?O((e.team||"").toUpperCase()):"transparent";return t&&O((t.team||"").toUpperCase()),`
    <tr style="--team-accent:${x}">
      <td>
        ${e?`
          <div class="player-cell" data-player-id="${u(e.player_id)}" tabindex="0" role="button" aria-label="Open details for ${D(e.player_name||e.player_id)}" style="cursor:pointer">
            ${I(e,30)}
            <div class="player-cell-info">
              <div class="player-cell-name">${u(e.player_name)} ${V(e.position)}</div>
              <div style="display:flex; gap:8px; align-items:center; margin-top:2px">
                <span class="mono" style="font-weight:700; color:var(--amber); font-size:13px">${e.weekly.toFixed(1)}</span>
                ${e.marketWeekly!=null&&e.marketWeekly!==e.weekly?`<span class="micro faint">mkt ${e.marketWeekly.toFixed(1)}</span>`:""}
                <span class="micro faint">${U(e.team,12)} ${u(e.team)} vs ${u(e.opponent_team||"TBD")}</span>
              </div>
              <div style="display:flex; gap:6px; align-items:center; margin-top:2px">
                <span class="badge badge-amber mono" style="font-size:10px; padding:1px 5px" title="${e.gridironUncapped!=null&&e.gridironUncapped!==e.gridironAuction?`Uncapped $${e.gridironUncapped}`:""}">$${e.gridironAuction}${e.gridironUncapped!=null&&e.gridironUncapped!==e.gridironAuction?`<span style="font-size:9px; color:var(--text-faint)"> ($${e.gridironUncapped})</span>`:""}</span>
                ${e.marketAuction!=null?`<span class="badge badge-sky mono" style="font-size:10px; padding:1px 5px" title="Market consensus auction value">$${e.marketAuction}</span>`:""}
                ${e.injury_status?K(e.injury_status):""}
                ${L(e,l)>15?`<span class="micro" style="color:var(--crimson)">${Math.round(L(e,l))}mph</span>`:""}
              </div>
            </div>
          </div>
        `:'<span class="faint">Empty</span>'}
      </td>
      <td class="mono micro faint" style="text-align:center; font-weight:700">${u((e==null?void 0:e.slot)||(t==null?void 0:t.slot)||(y!=null?`S${y+1}`:"S?"))}</td>
      <td style="text-align:right">
        ${t?`
          <div class="player-cell" data-player-id="${u(t.player_id)}" tabindex="0" role="button" aria-label="Open details for ${D(t.player_name||t.player_id)}" style="cursor:pointer; justify-content:flex-end">
            <div class="player-cell-info" style="text-align:right">
              <div class="player-cell-name">${V(t.position)} ${u(t.player_name)}</div>
              <div style="display:flex; gap:8px; align-items:center; justify-content:flex-end; margin-top:2px">
                <span class="micro faint">${u(t.opponent_team||"TBD")} vs ${u(t.team)} ${U(t.team,12)}</span>
                ${t.marketWeekly!=null&&t.marketWeekly!==t.weekly?`<span class="micro faint">mkt ${t.marketWeekly.toFixed(1)}</span>`:""}
                <span class="mono" style="font-weight:700; color:var(--sky); font-size:13px">${t.weekly.toFixed(1)}</span>
              </div>
              <div style="display:flex; gap:6px; align-items:center; justify-content:flex-end; margin-top:2px">
                ${L(t,l)>15?`<span class="micro" style="color:var(--crimson)">${Math.round(L(t,l))}mph</span>`:""}
                ${t.injury_status?K(t.injury_status):""}
                ${t.marketAuction!=null?`<span class="badge badge-sky mono" style="font-size:10px; padding:1px 5px" title="Market consensus auction value">$${t.marketAuction}</span>`:""}
                <span class="badge badge-amber mono" style="font-size:10px; padding:1px 5px" title="${t.gridironUncapped!=null&&t.gridironUncapped!==t.gridironAuction?`Uncapped $${t.gridironUncapped}`:""}">$${t.gridironAuction}${t.gridironUncapped!=null&&t.gridironUncapped!==t.gridironAuction?`<span style="font-size:9px; color:var(--text-faint)"> ($${t.gridironUncapped})</span>`:""}</span>
              </div>
            </div>
            ${I(t,30)}
          </div>
        `:'<span class="faint" style="float:right">Empty</span>'}
      </td>
      <td style="text-align:center">
        <span class="mono" style="font-weight:700; ${h}; font-size:12px">
          ${v>0?"+":""}${v.toFixed(1)}
        </span>
      </td>
      <td style="text-align:center">
        <div style="display:flex; gap:4px; align-items:center; justify-content:center">
          ${e?`<div style="flex:1; max-width:110px">${Q({point:e.weekly,low:e.projection_lower??e.lower_bound??e.lower,high:e.projection_upper??e.upper_bound??e.upper,width:e.width??e.projection_width??e.interval_width,min:0,max:30})}</div>`:""}
          ${t?`<div style="flex:1; max-width:110px">${Q({point:t.weekly,low:t.projection_lower??t.lower_bound??t.lower,high:t.projection_upper??t.upper_bound??t.upper,width:t.width??t.projection_width??t.interval_width,min:0,max:30})}</div>`:""}
        </div>
      </td>
    </tr>
  `}function gt(e,t,g){const y=[],l=(s,o)=>{s.starters.forEach(n=>{const r=L(n,g);r>15&&y.push({icon:"💨",text:`${n.player_name} (${o}): ${Math.round(r)}mph wind`,bg:"rgba(239,68,68,0.08)",border:"rgba(239,68,68,0.2)",color:"var(--crimson)"})})},v=(s,o)=>{s.starters.forEach(n=>{if(n.injury_status&&n.injury_status!=="Active"){const r={Questionable:"⚠️",Doubtful:"🔴",Out:"❌",IR:"🏥"};y.push({icon:r[n.injury_status]||"⚠️",text:`${n.player_name} (${o}): ${n.injury_status}`,bg:"rgba(245,158,11,0.08)",border:"rgba(245,158,11,0.2)",color:"var(--amber)"})}})},h=(s,o)=>{const n=s.starters.filter(c=>c.edge==="BUY"),r=s.starters.filter(c=>c.edge==="SELL");n.length>0&&y.push({icon:"📈",text:`${o} has ${n.length} BUY-rated starter${n.length>1?"s":""}: ${n.map(c=>c.player_name).join(", ")}`,bg:"rgba(16,185,129,0.08)",border:"rgba(16,185,129,0.2)",color:"var(--emerald)"}),r.length>0&&y.push({icon:"📉",text:`${o} has ${r.length} SELL-rated starter${r.length>1?"s":""}: ${r.map(c=>c.player_name).join(", ")}`,bg:"rgba(239,68,68,0.08)",border:"rgba(239,68,68,0.2)",color:"var(--crimson)"})},x=(s,o)=>{if(s.totalMarket==null||(o==null?void 0:o.totalMarket)==null)return;const n=s.totalGridiron-s.totalMarket,r=((o==null?void 0:o.totalGridiron)||0)-((o==null?void 0:o.totalMarket)||0);if(Math.abs(n)>10||Math.abs(r)>10){const c=n>r?s.team_name:(o==null?void 0:o.team_name)||"—";y.push({icon:"💰",text:`${c} has stronger Model $ edge (Δ $${Math.abs(n-r)})`,bg:"rgba(56,189,248,0.08)",border:"rgba(56,189,248,0.2)",color:"var(--sky)"})}};return v(e,e.team_name),t&&v(t,t.team_name),l(e,e.team_name),t&&l(t,t.team_name),h(e,e.team_name),t&&h(t,t.team_name),t&&x(e,t),y}function Y(e){const t=.254829592,g=-.284496736,y=1.421413741,l=-1.453152027,v=1.061405429,h=.3275911,x=e<0?-1:1;e=Math.abs(e)/Math.SQRT2;const s=1/(1+h*e),o=1-((((v*s+l)*s+y)*s+g)*s+t)*s*Math.exp(-e*e);return .5*(1+x*o)}export{xt as renderMatchups};
