import{w as te,f as H,b as ae,k as O,e as se,m as ne,t as U,h as u,x as re,u as W,o as Y,y as oe,q as ie,r as D,n as I,p as V,i as K,j as Q,v as X}from"./index-Cu44jiVg.js";import{c as le}from"./vbdAuction-B1XxIVHx.js";import{a as de}from"./slots-Viz7YpfV.js";import"./auctionMath-Bpdt11Uq.js";async function xe(t){const e=new URLSearchParams(location.hash.split("?")[1]||""),v=e.get("week")?Number(e.get("week")):null,[y,l]=await Promise.all([te({week:v}),H().catch(()=>({}))]),h=y.week??v??"",m=y.leagueMatchups||[],x=y.nflSlate||[],s=typeof(l==null?void 0:l.data_source)=="string"&&l.data_source.toLowerCase()==="demo",i=typeof(l==null?void 0:l.weather_status)=="string"&&l.weather_status.toLowerCase()==="placeholder"||(l==null?void 0:l.weather_placeholder)===!0,n=new Map;m.forEach(a=>{const o=a.matchup_id==null?null:String(a.matchup_id);o!=null&&(n.has(o)||n.set(o,[]),n.get(o).push(a))});let r=[],c=new Map,w=new Map;if(n.size>0){const a=await ae({week:v}).catch(()=>null),o=(a==null?void 0:a.rosters)||(a==null?void 0:a.teams)||null,d=a||await O({roster_id:"1"});r=d.leagueRosters||d.allTeams||[];const[f,g]=await Promise.all([(async()=>o&&typeof o=="object"?r.map(p=>{const _=String(p.roster_id),$=o[_]||o[Number(_)]||null;return $?{starters:$.starters||[],bench:$.bench||[],reserve:$.reserve||[],myRoster:$.starters||[],teamMeta:$.team_info||$.teamMeta||p,team_info:$.team_info||$.teamMeta||p}:null}):Promise.all(r.map(p=>O({roster_id:p.roster_id}).catch(()=>null))))(),se({limit:800}).catch(()=>({players:[]}))]);(g.players||[]).forEach(p=>{p.player_id&&w.set(String(p.player_id),p),p.player_name&&w.set(p.player_name.toLowerCase(),p)});const b=await ne(H,ie).catch(()=>null),F={vbdParams:le(g.players||[],b),compPlayers:g.players||[]};f.forEach((p,_)=>{var q;if(!p)return;const $=p.teamMeta||p.team_info||r[_]||{},z=String($.roster_id||((q=r[_])==null?void 0:q.roster_id)||""),J=p.starters||p.myRoster||[],Z=p.bench||[],{starters:C,bench:R}=de(J,Z,F),A=C.reduce((M,P)=>M+P.weekly,0),B=[...C,...R].reduce((M,P)=>M+(P.modelAuction??0),0),N=[...C,...R].map(M=>M.marketAuction),ee=N.every(M=>M!=null)?N.reduce((M,P)=>M+P,0):null;c.set(z,{roster_id:z,owner_name:$.display_name||$.owner_name||`Team ${z}`,team_name:$.team_name||$.display_name||`Team ${z}`,avatar_url:$.avatar_url||null,starters:C,bench:R,starterFPTS:A,totalModel:B,totalMarket:ee})})}const j=[...c.values()].some(a=>[...a.starters,...a.bench].some(o=>o.marketAuction!=null)),k=new Map;x.forEach(a=>{k.set((a.home_team||a.home||"").toUpperCase(),a),k.set((a.away_team||a.away||"").toUpperCase(),a)});const T=`
    <div class="row" style="gap:8px">
      <span class="kicker">Week</span>
      <div class="filters week-picker-scroll" style="overflow-x:auto; flex-wrap:nowrap; max-width:100%; padding-bottom:4px">
        ${Array.from({length:18},(a,o)=>o+1).map(a=>`<button class="chip ${String(a)===String(h)?"active":""}" data-week="${a}" title="Show week ${a}" style="flex-shrink:0">${a}</button>`).join("")}
        <button class="chip" data-week="" title="Show all weeks" style="flex-shrink:0">All</button>
      </div>
    </div>
  `,S=[...n.entries()].sort((a,o)=>a[0]-o[0]);t.innerHTML=`
    <div class="hero reveal in">
      <h1>Matchups <span class="badge" style="background:var(--color-primary); color:white; vertical-align:middle" aria-live="polite">Week ${h||"—"}</span></h1>
      <p>Head-to-head fantasy matchups with model projections${j?" vs market consensus":""}. Click a matchup for slot breakdown.</p>
    </div>
    ${s?'<div class="alert alert-warn reveal in" role="status" style="margin-top:12px">Demo data: run refresh to load live Sleeper data.</div>':""}
    <div class="card reveal in" style="margin-top:12px">
      <div class="card-body">${T}</div>
    </div>

    <div style="display:flex; flex-direction:column; gap:16px; margin-top:12px">
      ${S.length>0?S.map(([a,o])=>{var g,b;const d=c.get(String((g=o[0])==null?void 0:g.roster_id))||null,f=o[1]&&c.get(String((b=o[1])==null?void 0:b.roster_id))||null;return ce(d,f,a,o,k,j)}).join(""):`<div class="card reveal in"><div class="empty">No matchups loaded for week ${h||"—"}. Start the backend server and refresh data.</div></div>`}
    </div>

    <!-- NFL Slate -->
    <div class="card reveal in" style="margin-top:24px">
      <div class="card-header"><h3>NFL Slate</h3><span class="kicker" aria-live="polite">${x.length?`${x.length} games`:"no data"}${i?" · Weather placeholder":""}</span></div>
      <div class="card-body" style="padding:0">
        ${x.length?`
          <div class="table-wrap" style="border:0; border-radius:0"><table aria-label="NFL slate">
            <caption class="sr-only">NFL games for week ${h||"—"}</caption>
            <thead><tr><th>Game</th><th>Stadium</th><th>Time</th><th>Spread</th><th>O/U</th><th>Wind</th><th>Precip</th></tr></thead>
            <tbody>
              ${x.map(a=>`
                <tr>
                  <td><div class="matchup-game">${U(a.away_team||a.away,20)} <span class="mono">${a.away_team||a.away||"—"}</span> <span class="faint">@</span> ${U(a.home_team||a.home,20)} <span class="mono">${a.home_team||a.home||"—"}</span></div></td>
                  <td class="faint">${u(a.stadium||"—")}</td>
                  <td class="micro" style="color:var(--text-muted)">${u(a.gameday||"")} ${u(a.gametime||"")}</td>
                  <td class="mono">${a.spread_line!=null?a.spread_line:"—"}</td>
                  <td class="mono">${a.total_line!=null?a.total_line:"—"}</td>
                  <td>${re(a.wind_mph)}</td>
                  <td class="mono" style="font-size:12px">${a.precip_prob!=null?`${a.precip_prob}%`:"—"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table></div>
        `:`<div class="empty">No NFL schedule for week ${h||"—"}.</div>`}
      </div>
    </div>
  `,t.querySelectorAll("[data-week]").forEach(a=>{a.addEventListener("click",()=>{const o=a.getAttribute("data-week");location.hash=`matchups${o?`?week=${o}`:""}`})}),t.querySelectorAll("[data-matchup-id]").forEach(a=>{const o=()=>{var F,p;const d=String(a.getAttribute("data-matchup-id")),f=S.find(([_])=>String(_)===d);if(!f)return;const[,g]=f,b=c.get(String((F=g[0])==null?void 0:F.roster_id))||null,E=g[1]&&c.get(String((p=g[1])==null?void 0:p.roster_id))||null;b&&pe(b,E,d,k,t,c)};a.addEventListener("click",d=>{d.target.closest("[data-player-id]")||o()}),a.addEventListener("keydown",d=>{if(d.key==="Enter"||d.key===" "){if(d.target.closest&&d.target.closest("[data-player-id]"))return;d.preventDefault(),o()}})}),t.querySelectorAll("[data-player-id]").forEach(a=>{const o=()=>{const d=a.getAttribute("data-player-id");let f=null;c.forEach(g=>{const b=[...g.starters,...g.bench].find(E=>String(E.player_id)===d);b&&(f=b)}),f&&Y(f,t)};a.addEventListener("click",d=>{d.stopPropagation(),o()}),a.addEventListener("keydown",d=>{(d.key==="Enter"||d.key===" ")&&(d.preventDefault(),d.stopPropagation(),o())})})}function ce(t,e,v,y,l,h=!0){if(!t)return`<div class="card reveal in"><div class="empty">Matchup ${v}: Missing roster data</div></div>`;const m=t.starterFPTS,x=e?e.starterFPTS:0,s=Math.sqrt(t.starters.reduce((c,w)=>c+w.width*w.width,0)+(e?e.starters.reduce((c,w)=>c+w.width*w.width,0):0))||10,i=m-x,n=e?Math.round(100*G(i/s)):100,r=100-n;return`
    <div class="card reveal in matchup-card" data-matchup-id="${v}" tabindex="0" role="button" aria-label="Open breakdown for matchup ${v}" style="cursor:pointer">
      <div class="card-header">
        <div style="display:flex; align-items:center; gap:8px">
          <span class="badge badge-faint mono">Match ${v}</span>
          <span class="micro faint">Click for breakdown</span>
        </div>
        ${n!==r?`<span class="badge ${n>r?"badge-emerald":"badge-sky"}" style="font-size:11px">${n>r?u(t.team_name):u((e==null?void 0:e.team_name)||"—")} favored</span>`:""}
      </div>
      <div class="card-body" style="padding:0">
        <!-- Summary Bar -->
        <div style="display:grid; grid-template-columns:1fr auto 1fr; align-items:center; padding:16px; gap:12px">
          <!-- Team A -->
          <div style="display:flex; align-items:center; gap:10px">
            ${W(t,40)}
            <div>
              <div style="font-weight:700; font-size:15px">${u(t.team_name)}</div>
              <div class="micro faint">@${u(t.owner_name)}</div>
            </div>
          </div>

          <!-- Center: Score + Win Prob -->
          <div style="text-align:center; min-width:160px">
            <div style="display:flex; align-items:baseline; justify-content:center; gap:12px">
              <span class="mono" style="font-size:22px; font-weight:800; color:var(--amber)">${m.toFixed(1)}</span>
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
              <div style="font-weight:700; font-size:15px">${u((e==null?void 0:e.team_name)||"—")}</div>
              <div class="micro faint">@${u((e==null?void 0:e.owner_name)||"—")}</div>
            </div>
            ${e?W(e,40):""}
          </div>
        </div>

        <!-- Financial Summary -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0; border-top:1px solid var(--border)">
          <div style="padding:8px 16px; display:flex; gap:16px; align-items:center; border-right:1px solid var(--border)">
            <span class="micro faint">Model $</span>
            <span class="badge badge-amber mono">$${t.totalModel}</span>
            ${h?`<span class="micro faint">Market $</span>
            <span class="badge badge-sky mono">$${t.totalMarket}</span>`:""}
          </div>
          <div style="padding:8px 16px; display:flex; gap:16px; align-items:center; justify-content:flex-end">
            <span class="micro faint">Model $</span>
            <span class="badge badge-amber mono">$${(e==null?void 0:e.totalModel)||0}</span>
            ${h?`<span class="micro faint">Market $</span>
            <span class="badge badge-sky mono">$${e==null?void 0:e.totalMarket}</span>`:""}
          </div>
        </div>

      </div>
    </div>
  `}function pe(t,e,v,y,l,h){var a,o,d;let m=document.getElementById("matchupModalContainer");m||(m=document.createElement("div"),m.id="matchupModalContainer",document.body.appendChild(m));const x=t.starterFPTS,s=e?e.starterFPTS:0,i=Math.sqrt(t.starters.reduce((f,g)=>f+g.width*g.width,0)+(e?e.starters.reduce((f,g)=>f+g.width*g.width,0):0))||10,n=x-s,r=e?Math.round(100*G(n/i)):100,c=100-r,w=ve(t,e,y),j=t.totalMarket!=null||(e==null?void 0:e.totalMarket)!=null;m.innerHTML=`
    <div class="matchup-modal-backdrop" id="matchupModalBackdrop">
      <div class="matchup-modal-card card reveal in" role="dialog" aria-modal="true" tabindex="-1" aria-label="Matchup ${v} breakdown">
        <button class="modal-close-btn" id="matchupCloseBtn" aria-label="Close modal">✕</button>

        <!-- Header: Team vs Team -->
        <div style="display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:16px; padding-bottom:16px; border-bottom:1px solid var(--border)">
          <div style="display:flex; align-items:center; gap:10px">
            ${W(t,48)}
            <div>
              <div style="font-weight:700; font-size:17px">${u(t.team_name)}</div>
              <div class="micro faint">@${u(t.owner_name)}</div>
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
              <div style="font-weight:700; font-size:17px">${u((e==null?void 0:e.team_name)||"—")}</div>
              <div class="micro faint">@${u((e==null?void 0:e.owner_name)||"—")}</div>
            </div>
            ${e?W(e,48):""}
          </div>
        </div>

        <!-- Financial comparison -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0; margin-top:12px; border:1px solid var(--border); border-radius:10px; overflow:hidden">
          <div style="padding:10px 16px; display:flex; gap:12px; align-items:center; background:var(--surface-raised); border-right:1px solid var(--border)">
            <span class="micro faint">Model $</span>
            <span class="badge badge-amber mono">$${t.totalModel}</span>
            ${j?`<span class="micro faint">Market $</span>
            <span class="badge badge-sky mono">$${t.totalMarket}</span>`:""}
          </div>
          <div style="padding:10px 16px; display:flex; gap:12px; align-items:center; justify-content:flex-end; background:var(--surface-raised)">
            <span class="micro faint">Model $</span>
            <span class="badge badge-amber mono">$${(e==null?void 0:e.totalModel)||0}</span>
            ${j?`<span class="micro faint">Market $</span>
            <span class="badge badge-sky mono">$${e==null?void 0:e.totalMarket}</span>`:""}
          </div>
        </div>

        <!-- Slot-by-slot breakdown -->
        ${ue(t,e,w,y)}

        <div style="margin-top:16px; display:flex; justify-content:flex-end">
          <button class="btn btn-ghost" id="matchupDismissBtn">Close</button>
        </div>
      </div>
    </div>
  `;const k=document.activeElement instanceof HTMLElement?document.activeElement:null;let T=()=>{};const S=()=>{try{T()}catch{}m.innerHTML="",k&&typeof k.focus=="function"&&document.contains(k)&&(!document.activeElement||document.activeElement===document.body)&&k.focus()};T=oe(m.querySelector(".matchup-modal-card"),k,S),(a=document.getElementById("matchupCloseBtn"))==null||a.addEventListener("click",S),(o=document.getElementById("matchupDismissBtn"))==null||o.addEventListener("click",S),(d=document.getElementById("matchupModalBackdrop"))==null||d.addEventListener("click",f=>{f.target.id==="matchupModalBackdrop"&&S()}),m.querySelectorAll("[data-player-id]").forEach(f=>{const g=()=>{const b=f.getAttribute("data-player-id");let E=null;h.forEach(F=>{const p=[...F.starters,...F.bench].find(_=>String(_.player_id)===b);p&&(E=p)}),E&&Y(E,l)};f.addEventListener("click",b=>{b.stopPropagation(),g()}),f.addEventListener("keydown",b=>{(b.key==="Enter"||b.key===" ")&&(b.preventDefault(),b.stopPropagation(),g())})})}function L(t,e){if(t==null)return 0;if(t.wind_mph>0)return t.wind_mph;const v=e&&e.get((t.team||"").toUpperCase());return v&&v.wind_mph||0}function ue(t,e,v,y){const l=["QB","RB1","RB2","WR1","WR2","TE","FLEX1","FLEX2","K","DEF"],h=new Map(t.starters.map(s=>[s.slot,s])),m=new Map(((e==null?void 0:e.starters)||[]).map(s=>[s.slot,s])),x=[...new Set([...t.starters.map(s=>s.slot),...((e==null?void 0:e.starters)||[]).map(s=>s.slot)])].filter(s=>!l.includes(s));return`
    <!-- Slot-by-Slot Breakdown -->
    <div style="border-top:1px solid var(--border)">
      <div class="table-wrap matchup-table-scroll" style="border:0; border-radius:0; overflow-x:auto; max-width:100%">
        <table style="min-width:900px" aria-label="Slot-by-slot matchup">
          <caption class="sr-only">Head-to-head starters by slot</caption>
          <thead>
            <tr>
              <th style="width:30%">${u(t.team_name)}</th>
              <th style="text-align:center; width:5%">Slot</th>
              <th style="width:30%; text-align:right">${u((e==null?void 0:e.team_name)||"—")}</th>
              <th style="text-align:center; width:10%">Edge</th>
              <th style="text-align:center; width:25%">Intervals</th>
            </tr>
          </thead>
          <tbody>
            ${[...l,...x].map((s,i)=>{const n=h.get(s)||null,r=m.get(s)||null;return!n&&!r?"":ye(n,r,s,i,y)}).join("")}
            <tr style="background:var(--surface-raised); font-weight:700">
              <td>
                <div style="display:flex; align-items:center; gap:8px; padding:4px 0">
                  <span class="mono" style="font-size:16px; color:var(--amber)">${t.starterFPTS.toFixed(1)} pts</span>
                </div>
              </td>
              <td style="text-align:center" class="mono micro faint">TOTAL</td>
              <td style="text-align:right">
                <span class="mono" style="font-size:16px; color:var(--sky)">${e?e.starterFPTS.toFixed(1):"0.0"} pts</span>
              </td>
              <td style="text-align:center">
                <span class="mono" style="font-weight:800; color:${t.starterFPTS>=((e==null?void 0:e.starterFPTS)||0)?"var(--emerald)":"var(--crimson)"}">
                  ${t.starterFPTS>=((e==null?void 0:e.starterFPTS)||0)?"+":""}${(t.starterFPTS-((e==null?void 0:e.starterFPTS)||0)).toFixed(1)}
                </span>
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    ${v.length>0?`
      <!-- Key Factors & Insights -->
      <div style="border-top:1px solid var(--border); padding:12px 16px">
        <span class="kicker" style="display:block; margin-bottom:8px">Key factors</span>
        <div style="display:flex; flex-wrap:wrap; gap:8px">
          ${v.map(s=>`
            <div style="display:inline-flex; align-items:center; gap:6px; padding:6px 10px; background:${s.bg}; border:1px solid ${s.border}; border-radius:8px; font-size:12px; color:${s.color}">
              <span style="font-size:14px">${s.icon}</span>
              <span>${u(s.text)}</span>
            </div>
          `).join("")}
        </div>
      </div>
    `:""}
  `}function ye(t,e,v,y,l){t!=null&&t.slot||e!=null&&e.slot||v||y!=null&&y+1;const h=((t==null?void 0:t.weekly)||0)-((e==null?void 0:e.weekly)||0),m=h>2?"color:var(--emerald)":h<-2?"color:var(--crimson)":"color:var(--text-muted)",x=t?D((t.team||"").toUpperCase()):"transparent";return e&&D((e.team||"").toUpperCase()),`
    <tr style="--team-accent:${x}">
      <td>
        ${t?`
          <div class="player-cell" data-player-id="${u(t.player_id)}" tabindex="0" role="button" aria-label="Open details for ${I(t.player_name||t.player_id)}" style="cursor:pointer">
            ${V(t,30)}
            <div class="player-cell-info">
              <div class="player-cell-name">${u(t.player_name)} ${K(t.position)}</div>
              <div style="display:flex; gap:8px; align-items:center; margin-top:2px">
                <span class="mono" style="font-weight:700; color:var(--amber); font-size:13px">${t.weekly.toFixed(1)}</span>
                ${t.marketWeekly!=null&&t.marketWeekly!==t.weekly?`<span class="micro faint">mkt ${t.marketWeekly.toFixed(1)}</span>`:""}
                <span class="micro faint">${U(t.team,12)} ${u(t.team)} vs ${u(t.opponent_team||"TBD")}</span>
              </div>
              <div style="display:flex; gap:6px; align-items:center; margin-top:2px">
                <span class="badge badge-amber mono" style="font-size:10px; padding:1px 5px" title="${t.modelUncapped!=null&&t.modelUncapped!==t.modelAuction?`Uncapped $${t.modelUncapped}`:""}">$${t.modelAuction}${t.modelUncapped!=null&&t.modelUncapped!==t.modelAuction?`<span style="font-size:9px; color:var(--text-faint)"> ($${t.modelUncapped})</span>`:""}</span>
                ${t.marketAuction!=null?`<span class="badge badge-sky mono" style="font-size:10px; padding:1px 5px" title="Market consensus auction value">$${t.marketAuction}</span>`:""}
                ${t.injury_status?Q(t.injury_status):""}
                ${L(t,l)>15?`<span class="micro" style="color:var(--crimson)">${Math.round(L(t,l))}mph</span>`:""}
              </div>
            </div>
          </div>
        `:'<span class="faint">Empty</span>'}
      </td>
      <td class="mono micro faint" style="text-align:center; font-weight:700">${u((t==null?void 0:t.slot)||(e==null?void 0:e.slot)||(y!=null?`S${y+1}`:"S?"))}</td>
      <td style="text-align:right">
        ${e?`
          <div class="player-cell" data-player-id="${u(e.player_id)}" tabindex="0" role="button" aria-label="Open details for ${I(e.player_name||e.player_id)}" style="cursor:pointer; justify-content:flex-end">
            <div class="player-cell-info" style="text-align:right">
              <div class="player-cell-name">${K(e.position)} ${u(e.player_name)}</div>
              <div style="display:flex; gap:8px; align-items:center; justify-content:flex-end; margin-top:2px">
                <span class="micro faint">${u(e.opponent_team||"TBD")} vs ${u(e.team)} ${U(e.team,12)}</span>
                ${e.marketWeekly!=null&&e.marketWeekly!==e.weekly?`<span class="micro faint">mkt ${e.marketWeekly.toFixed(1)}</span>`:""}
                <span class="mono" style="font-weight:700; color:var(--sky); font-size:13px">${e.weekly.toFixed(1)}</span>
              </div>
              <div style="display:flex; gap:6px; align-items:center; justify-content:flex-end; margin-top:2px">
                ${L(e,l)>15?`<span class="micro" style="color:var(--crimson)">${Math.round(L(e,l))}mph</span>`:""}
                ${e.injury_status?Q(e.injury_status):""}
                ${e.marketAuction!=null?`<span class="badge badge-sky mono" style="font-size:10px; padding:1px 5px" title="Market consensus auction value">$${e.marketAuction}</span>`:""}
                <span class="badge badge-amber mono" style="font-size:10px; padding:1px 5px" title="${e.modelUncapped!=null&&e.modelUncapped!==e.modelAuction?`Uncapped $${e.modelUncapped}`:""}">$${e.modelAuction}${e.modelUncapped!=null&&e.modelUncapped!==e.modelAuction?`<span style="font-size:9px; color:var(--text-faint)"> ($${e.modelUncapped})</span>`:""}</span>
              </div>
            </div>
            ${V(e,30)}
          </div>
        `:'<span class="faint" style="float:right">Empty</span>'}
      </td>
      <td style="text-align:center">
        <span class="mono" style="font-weight:700; ${m}; font-size:12px">
          ${h>0?"+":""}${h.toFixed(1)}
        </span>
      </td>
      <td style="text-align:center">
        <div style="display:flex; gap:4px; align-items:center; justify-content:center">
          ${t?`<div style="flex:1; max-width:110px">${X({point:t.weekly,low:t.projection_lower??t.lower_bound??t.lower,high:t.projection_upper??t.upper_bound??t.upper,width:t.width??t.projection_width??t.interval_width,min:0,max:30})}</div>`:""}
          ${e?`<div style="flex:1; max-width:110px">${X({point:e.weekly,low:e.projection_lower??e.lower_bound??e.lower,high:e.projection_upper??e.upper_bound??e.upper,width:e.width??e.projection_width??e.interval_width,min:0,max:30})}</div>`:""}
        </div>
      </td>
    </tr>
  `}function ve(t,e,v){const y=[],l=(s,i)=>{s.starters.forEach(n=>{const r=L(n,v);r>15&&y.push({icon:"💨",text:`${n.player_name} (${i}): ${Math.round(r)}mph wind`,bg:"rgba(239,68,68,0.08)",border:"rgba(239,68,68,0.2)",color:"var(--crimson)"})})},h=(s,i)=>{s.starters.forEach(n=>{if(n.injury_status&&n.injury_status!=="Active"){const r={Questionable:"⚠️",Doubtful:"🔴",Out:"❌",IR:"🏥"};y.push({icon:r[n.injury_status]||"⚠️",text:`${n.player_name} (${i}): ${n.injury_status}`,bg:"rgba(245,158,11,0.08)",border:"rgba(245,158,11,0.2)",color:"var(--amber)"})}})},m=(s,i)=>{const n=s.starters.filter(c=>c.edge==="BUY"),r=s.starters.filter(c=>c.edge==="SELL");n.length>0&&y.push({icon:"📈",text:`${i} has ${n.length} BUY-rated starter${n.length>1?"s":""}: ${n.map(c=>c.player_name).join(", ")}`,bg:"rgba(16,185,129,0.08)",border:"rgba(16,185,129,0.2)",color:"var(--emerald)"}),r.length>0&&y.push({icon:"📉",text:`${i} has ${r.length} SELL-rated starter${r.length>1?"s":""}: ${r.map(c=>c.player_name).join(", ")}`,bg:"rgba(239,68,68,0.08)",border:"rgba(239,68,68,0.2)",color:"var(--crimson)"})},x=(s,i)=>{if(s.totalMarket==null||(i==null?void 0:i.totalMarket)==null)return;const n=s.totalModel-s.totalMarket,r=((i==null?void 0:i.totalModel)||0)-((i==null?void 0:i.totalMarket)||0);if(Math.abs(n)>10||Math.abs(r)>10){const c=n>r?s.team_name:(i==null?void 0:i.team_name)||"—";y.push({icon:"💰",text:`${c} has stronger Model $ edge (Δ $${Math.abs(n-r)})`,bg:"rgba(56,189,248,0.08)",border:"rgba(56,189,248,0.2)",color:"var(--sky)"})}};return h(t,t.team_name),e&&h(e,e.team_name),l(t,t.team_name),e&&l(e,e.team_name),m(t,t.team_name),e&&m(e,e.team_name),e&&x(t,e),y}function G(t){const e=.254829592,v=-.284496736,y=1.421413741,l=-1.453152027,h=1.061405429,m=.3275911,x=t<0?-1:1;t=Math.abs(t)/Math.SQRT2;const s=1/(1+m*t),i=1-((((h*s+l)*s+y)*s+v)*s+e)*s*Math.exp(-t*t);return .5*(1+x*i)}export{xe as renderMatchups};
