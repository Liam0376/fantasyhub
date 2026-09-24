import{k as G,h as o,r as Q,p as P,i as z,j as ve,t as V,J as _e,N as ge}from"./index-BNRZTpCj.js";async function he(p){const q=new URLSearchParams(location.hash.split("?")[1]||"");let J=q.get("team_a")||"1",X=q.get("team_b")||"2";p.innerHTML=`
    <div class="hero reveal in">
      <h1>Trade</h1>
      <p>Select two teams, pick the players being traded on each side, and analyze Model weekly &amp; ROS trade impact.</p>
    </div>

    <div class="card reveal in" style="margin-top:16px">
      <div class="card-body row align-center" style="gap:16px; flex-wrap:wrap">
        <div style="flex:1; min-width:220px">
          <label class="micro faint" style="display:block; margin-bottom:6px">Team A (Sending Package)</label>
          <select id="selectTeamA" class="search-mini" title="Select Team A" style="width:100%; padding:8px 12px; font:500 13px "Helvetica Neue", Helvetica, sans-serif; background:var(--surface); color:var(--text); border:1px solid var(--border); border-radius:8px">
            <option value="">Loading teams…</option>
          </select>
        </div>
        
        <div class="mono faint" style="font-size:18px; font-weight:700; padding-top:16px">⇄</div>

        <div style="flex:1; min-width:220px">
          <label class="micro faint" style="display:block; margin-bottom:6px">Team B (Receiving Package)</label>
          <select id="selectTeamB" class="search-mini" title="Select Team B" style="width:100%; padding:8px 12px; font:500 13px "Helvetica Neue", Helvetica, sans-serif; background:var(--surface); color:var(--text); border:1px solid var(--border); border-radius:8px">
            <option value="">Loading teams…</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Live Trade Analysis Banner -->
    <div id="tradeSummaryBanner" class="reveal in" style="margin-top:16px"></div>

    <!-- Dual Roster Columns — always side by side, internal scroll -->
    <div class="trade-cols reveal in" style="margin-top:16px">
      <div class="card">
        <div class="card-header row align-between">
          <h3 id="teamAHeader">Team A Roster</h3>
          <span class="micro faint" id="teamASub">0 players selected</span>
        </div>
        <div class="card-body" id="teamARoster" style="padding:0">
          <div class="empty">Loading roster…</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header row align-between">
          <h3 id="teamBHeader">Team B Roster</h3>
          <span class="micro faint" id="teamBSub">0 players selected</span>
        </div>
        <div class="card-body" id="teamBRoster" style="padding:0">
          <div class="empty">Loading roster…</div>
        </div>
      </div>
    </div>

    <!-- Post-trade depth (position groups after the hypothetical swap) -->
    <div id="tradeDepth" class="reveal in" style="margin-top:16px"></div>
  `;const R=p.querySelector("#selectTeamA"),A=p.querySelector("#selectTeamB"),B=p.querySelector("#tradeSummaryBanner"),Z=p.querySelector("#teamARoster"),ee=p.querySelector("#teamBRoster"),te=p.querySelector("#teamAHeader"),se=p.querySelector("#teamBHeader"),re=p.querySelector("#teamASub"),ae=p.querySelector("#teamBSub"),L=p.querySelector("#tradeDepth"),H=new Map;let _=null,g=null;const h=new Set,f=new Set,N=new Set;let U=null;const v=e=>{const r=Number(e);return Number.isFinite(r)?r:0};function O(e){return e.proj_pass_yd!=null||e.proj_rush_yd!=null||e.proj_rec_yd!=null||e.proj_rec!=null?{proj_pass_yd:v(e.proj_pass_yd),proj_pass_td:v(e.proj_pass_td),proj_rush_yd:v(e.proj_rush_yd),proj_rush_td:v(e.proj_rush_td),proj_rec:v(e.proj_rec),proj_rec_yd:v(e.proj_rec_yd),proj_rec_td:v(e.proj_rec_td)}:{proj_pass_yd:v(e.pass_yds)/17,proj_pass_td:v(e.pass_tds)/17,proj_rush_yd:v(e.rush_yds)/17,proj_rush_td:v(e.rush_tds)/17,proj_rec:v(e.receptions)/17,proj_rec_yd:v(e.rec_yds)/17,proj_rec_td:v(e.rec_tds)/17}}function ie(e){const r=(e.position||"").toUpperCase(),s=O(e),c=a=>(Math.round(a*10)/10).toFixed(1),t=a=>(Math.round(a*100)/100).toFixed(2);return r==="QB"?`${c(s.proj_pass_yd)} PaYd · ${t(s.proj_pass_td)} PaTD · ${c(s.proj_rush_yd)} RuYd avg`:r==="RB"?`${c(s.proj_rush_yd)} RuYd · ${t(s.proj_rush_td)} RuTD · ${c(s.proj_rec)} Rec avg`:r==="WR"||r==="TE"?`${c(s.proj_rec)} Rec · ${c(s.proj_rec_yd)} RecYd avg`:""}function ne(e){const r=(e.position||"").toUpperCase(),s=O(e),c=_e(r,{proj_pass_yd:s.proj_pass_yd||null,proj_pass_td:s.proj_pass_td||null,proj_rush_yd:s.proj_rush_yd||null,proj_rush_td:s.proj_rush_td||null,proj_rec:s.proj_rec||null,proj_rec_yd:s.proj_rec_yd||null,proj_rec_td:s.proj_rec_td||null,proj_fgm:null,proj_xpm:null}),t=Number(e.model_points??e.projected_points??e.weekly??0),a=Number(e.projection_lower??e.lower??Math.max(0,t-5)),i=Number(e.projection_upper??e.upper??t+5),d=Number(e.width??(i-a)/2),$=e.opponent_team?`vs ${o(String(e.opponent_team))}`:"no game",y=e.injury_status?` · ${o(String(e.injury_status))}`:"",n=e.remaining_games==null?"sched unknown":`${o(String(e.remaining_games))} games left`;return`${c}<div class="micro mono faint" style="margin-top:8px; text-align:center">Range ${a.toFixed(1)} – ${i.toFixed(1)} (width ${d.toFixed(1)}) · ${$}${y} · ${n}</div>`}try{const e=await G(),r=(e==null?void 0:e.allTeams)||(e==null?void 0:e.leagueRosters)||[];r.length>0&&(R.innerHTML=r.map(s=>`<option value="${s.roster_id||s.owner_id}" ${String(s.roster_id||s.owner_id)===String(J)?"selected":""}>${o(s.team_name||s.display_name||`Team ${s.roster_id}`)} (${o(s.owner_name||s.display_name||"")})</option>`).join(""),A.innerHTML=r.map(s=>`<option value="${s.roster_id||s.owner_id}" ${String(s.roster_id||s.owner_id)===String(X)?"selected":""}>${o(s.team_name||s.display_name||`Team ${s.roster_id}`)} (${o(s.owner_name||s.display_name||"")})</option>`).join(""))}catch(e){console.error("Failed to load team list:",e)}async function oe(e){const r=String(e);if(H.has(r))return H.get(r);const s=await G({roster_id:r});return H.set(r,s),s}async function M(e){var $,y;const r=e==="A",s=r?R.value:A.value,c=r?Z:ee,t=r?te:se,a=r?h:f;if(!s)return;H.has(String(s))||(c.innerHTML='<div class="empty">Loading team roster…</div>');const i=await oe(s);r?_=i:g=i;const d=(($=i==null?void 0:i.teamMeta)==null?void 0:$.team_name)||((y=i==null?void 0:i.teamMeta)==null?void 0:y.owner_name)||`Team ${s}`;t.textContent=`${d} (${r?"Sending":"Receiving"})`,de(c,S(i),e,a),I(),D(),Y()}function I(){re.textContent=`${h.size} player${h.size===1?"":"s"} selected`,ae.textContent=`${f.size} player${f.size===1?"":"s"} selected`}function de(e,r,s,c){if(!r||r.length===0){e.innerHTML='<div class="empty">No roster players found</div>';return}e.innerHTML=`
      <div style="display:flex; flex-direction:column">
        ${r.map(t=>{const a=String(t.player_id||t.id),i=c.has(a),d=Number(t.model_points??t.projected_points??t.weekly??0).toFixed(1),$=Number(t.model_season_points??t.ros??d*17).toFixed(0),y=t.auction_price_paid??t.auction??t.marketAuction??0,n=ie(t),m=`${s}:${a}`,x=N.has(m);return`
            <label class="row align-between" style="padding:10px 14px; cursor:pointer; background:${i?"var(--surface-raised)":"transparent"}; border-bottom:1px solid var(--border); transition:background 0.15s; border-top:1px solid ${Q((t.team||"").toUpperCase())}">
              <div class="row align-center" style="gap:10px">
                <input type="checkbox" class="trade-check" data-side="${s}" data-pid="${a}" ${i?"checked":""} title="Select ${o(t.player_name||t.full_name||a)} for trade" style="width:16px; height:16px; cursor:pointer" />
                <span style="width:8px; height:8px; border-radius:50%; background:${Q((t.team||"").toUpperCase())}; flex-shrink:0" aria-hidden="true"></span>
                ${P(t,28)}
                <div>
                  <div class="row align-center" style="gap:6px">
                    <strong style="font-size:13px">${o(t.player_name||t.full_name||a)}</strong>
                    ${z(t.position)}
                    ${t.injury_status?ve(t.injury_status):""}
                  </div>
                  <div class="micro faint" style="margin-top:2px; display:flex; align-items:center; gap:4px">
                    <span class="slot-tag" style="font-size:10px; font-weight:700; letter-spacing:0.3px; padding:1px 5px; border-radius:4px; background:${t.slot&&t.slot!=="BENCH"&&t.slot!=="IR"?"rgba(56,189,248,0.12); color:var(--sky); border:1px solid rgba(56,189,248,0.25)":t.slot==="IR"?"rgba(244,63,94,0.12); color:var(--crimson); border:1px solid rgba(244,63,94,0.25)":"rgba(148,163,184,0.12); color:var(--text-muted); border:1px solid rgba(148,163,184,0.2)"}">${o(t.slot||(t.position&&!t.team?"IR":"BENCH"))}</span>
                    <span>Draft Cost: $${y}</span> · ${V(t.team,14)} <span>${t.team||"FA"} ${t.opponent_team?`vs ${t.opponent_team}`:""}</span>
                  </div>
                  ${n?`<div class="micro mono faint" style="margin-top:2px">${o(n)}</div>`:""}
                </div>
              </div>
              <div style="text-align:right">
                <div class="mono" style="font-weight:700; font-size:13px; color:var(--accent)">${d} <span class="micro faint">pts/wk</span></div>
                <div class="micro faint mono">${$} pts ROS</div>
                <button class="trade-expand" data-side="${s}" data-pid="${o(a)}" title="Show projected stats" style="margin-top:4px; font-size:11px; background:transparent; color:var(--text-muted); border:1px solid var(--border); border-radius:6px; padding:1px 8px; cursor:pointer">${x?"▾ stats":"▸ stats"}</button>
              </div>
            </label>
            <div class="trade-detail" data-side="${s}" data-pid="${o(a)}" style="display:${x?"block":"none"}; padding:10px 14px; border-bottom:1px solid var(--border); background:var(--surface-raised)">
              ${ne(t)}
            </div>
          `}).join("")}
      </div>
    `,e.querySelectorAll(".trade-check").forEach(t=>{t.addEventListener("change",a=>{const i=a.target.dataset.pid,d=a.target.dataset.side==="A"?h:f;a.target.checked?d.add(i):d.delete(i),I(),D(),Y()})}),e.querySelectorAll(".trade-expand").forEach(t=>{t.addEventListener("click",a=>{a.preventDefault(),a.stopPropagation();const i=`${t.dataset.side}:${t.dataset.pid}`,d=e.querySelector(`.trade-detail[data-side="${t.dataset.side}"][data-pid="${t.dataset.pid}"]`);N.has(i)?(N.delete(i),t.innerHTML="▸ stats",d&&(d.style.display="none")):(N.add(i),t.innerHTML="▾ stats",d&&(d.style.display="block"))})})}const K=["QB","RB","WR","TE","FLEX","K","DEF"];function W(e,r,s,c){if(!e)return"";const t=n=>{const m=Number(n.model_points??n.projected_points??n.weekly??0);return Number.isFinite(m)?m:0},a=r||new Set,i=new Set((s||[]).map(n=>String(n.player_id||n.id))),d={};for(const n of S(e)){const m=(n.position||"UNK").toUpperCase();(d[m]=d[m]||[]).push(n)}for(const n of s||[]){const m=(n.position||"UNK").toUpperCase();(d[m]=d[m]||[]).push({...n,_incoming:!0})}const y=Object.keys(d).sort((n,m)=>{const x=K.indexOf(n),k=K.indexOf(m);return(x<0?99:x)-(k<0?99:k)}).map(n=>{const m=d[n].slice().sort((u,b)=>t(b)-t(u)),x=m.filter(u=>!u._incoming&&!a.has(String(u.player_id||u.id))),k=x.reduce((u,b)=>u+t(b),0),w=m.map(u=>{const b=String(u.player_id||u.id),j=u._incoming||i.has(b),T=!j&&a.has(b);return`<div class="depth-card depth-${j?"in":T?"out":"kept"}">
          ${P(u,34)}
          <div style="flex:1; min-width:0">
            <div class="depth-name">${o(u.player_name||b)}</div>
            <div class="micro faint">${z(n)} · <span class="mono">${t(u).toFixed(1)}</span></div>
          </div>
          <span class="depth-tag">${j?"IN":T?"OUT":""}</span>
        </div>`}).join("");return`<div class="depth-group">
        <div class="depth-group-head"><strong>${o(n)}</strong><span class="faint"> · ${x.length} kept · ${k.toFixed(1)}/wk</span></div>
        <div class="depth-cards">${w}</div>
      </div>`}).join("");return`<div><div class="depth-team">${o(c)} <span class="faint">post-trade</span></div>${y}</div>`}function Y(){var t,a;if(!L)return;if(!_&&!g){L.innerHTML="";return}const e=S(_).filter(i=>h.has(String(i.player_id||i.id))),r=S(g).filter(i=>f.has(String(i.player_id||i.id)));if(!e.length&&!r.length){L.innerHTML="";return}const s=((t=_==null?void 0:_.teamMeta)==null?void 0:t.team_name)||"Team A",c=((a=g==null?void 0:g.teamMeta)==null?void 0:a.team_name)||"Team B";L.innerHTML='<div class="card"><div class="card-body"><div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px">Post-trade depth by position</div><div class="grid grid-2" style="font-size:12px">'+W(_,h,r,s)+W(g,f,e,c)+"</div></div></div>"}function D(){clearTimeout(U),U=setTimeout(le,400)}async function le(){var c,t;const e=((c=_==null?void 0:_.teamMeta)==null?void 0:c.team_name)||"Team A",r=((t=g==null?void 0:g.teamMeta)==null?void 0:t.team_name)||"Team B";if(!h.size&&!f.size){B.innerHTML='<div class="alert alert-info" style="font-size:13px">Tick players on both sides to grade the trade.</div>';return}B.innerHTML='<div class="card"><div class="card-body"><div class="empty" style="padding:8px">Grading trade…</div></div></div>';let s=null;try{s=await ge(R.value,A.value,{tradedA:[...h],tradedB:[...f]})}catch{}if(!s||s.cold){B.innerHTML='<div class="alert alert-warn" style="font-size:13px">Couldn’t grade this trade right now.</div>';return}B.innerHTML=ce(s,e,r,S(_).filter(a=>h.has(String(a.player_id||a.id))),S(g).filter(a=>f.has(String(a.player_id||a.id))))}function ce(e,r,s,c=[],t=[]){var b,j,T,F;const a=e.winner==="Even"?"Fair trade":`${e.winner} wins the trade`,i=Number(e.team_a_weekly??0).toFixed(1),d=Number(e.team_b_weekly??0).toFixed(1),$=e.market_a!=null?Number(e.market_a).toLocaleString("en-US"):null,y=e.market_b!=null?Number(e.market_b).toLocaleString("en-US"):null,n=l=>({player_id:l.player_id||l.id,sleeper_id:l.sleeper_id||null,player_name:l.player_name||l.full_name,position:l.position,team:l.team,weekly:Number(l.model_points??l.projected_points??l.weekly??0),market:l.auction??l.marketAuction??null}),m=(j=(b=e.packages)==null?void 0:b.a)!=null&&j.length?e.packages.a:c.map(n),x=(F=(T=e.packages)==null?void 0:T.b)!=null&&F.length?e.packages.b:t.map(n),k=l=>`
      <div class="mini-row">
        ${P(l,28)}
        <div style="flex:1; min-width:0">
          <div class="mini-name">${o(l.player_name||"")}</div>
          <div class="micro faint">${z(l.position)} ${V(l.team,12)} ${o(l.team||"")}</div>
        </div>
        <div style="text-align:right">
          <div class="mono" style="font-weight:700; font-size:13px">${Number(l.weekly??0).toFixed(1)}<span class="micro faint">/wk</span></div>
          ${l.market!=null?`<div class="micro faint">mkt ${Number(l.market).toLocaleString("en-US")}</div>`:""}
        </div>
      </div>`,w=e.slots,u=(l,E,pe,C)=>{if(!E)return"";const me=C&&C.length?` — adds ${C.map(ue=>o(String(ue))).join(", ")}`:"";return`<div class="micro" style="margin-top:4px">+${E} bench spot${E>1?"s":""} for ${o(l)}${me} <span class="faint">(+${Number(pe).toFixed(0)} ROS)</span></div>`};return`<div class="card"><div class="card-body">
      <div class="kicker">Trade verdict</div>
      <h2 class="verdict-headline">${o(a)}</h2>
      <div class="micro faint" style="margin-bottom:8px">${o(r)} gives ${i}/wk · gets ${d}/wk${$&&y?` · market ${$} vs ${y}`:""}</div>
      <div class="signal-cols">
        <div><div class="kicker" style="margin-bottom:4px">${o(r)} gives</div>${m.map(k).join("")||'<div class="empty">—</div>'}</div>
        <div><div class="kicker" style="margin-bottom:4px">${o(s)} gives</div>${x.map(k).join("")||'<div class="empty">—</div>'}</div>
      </div>
      ${w?u(r,w.gained_a,w.credit_a_ros,w.fill_a)+u(s,w.gained_b,w.credit_b_ros,w.fill_b):""}
    </div></div>`}R.addEventListener("change",()=>{h.clear(),M("A")}),A.addEventListener("change",()=>{f.clear(),M("B")}),await Promise.all([M("A"),M("B")])}function S(p){return p?[...p.starters||[],...Array.isArray(p.bench)?p.bench:[],...Array.isArray(p.reserve)?p.reserve:[]]:[]}export{he as renderTrade};
