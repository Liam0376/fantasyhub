import{k as K,h as d,r as W,p as M,i as F,j as oe,t as Y,J as de,N as le}from"./index-SMBmqp6p.js";async function me(c){const E=new URLSearchParams(location.hash.split("?")[1]||"");let D=E.get("team_a")||"1",G=E.get("team_b")||"2";c.innerHTML=`
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
  `;const k=c.querySelector("#selectTeamA"),S=c.querySelector("#selectTeamB"),T=c.querySelector("#tradeSummaryBanner"),Q=c.querySelector("#teamARoster"),V=c.querySelector("#teamBRoster"),J=c.querySelector("#teamAHeader"),X=c.querySelector("#teamBHeader"),Z=c.querySelector("#teamASub"),ee=c.querySelector("#teamBSub"),R=c.querySelector("#tradeDepth"),A=new Map;let h=null,f=null;const x=new Set,b=new Set,B=new Set;let C=null;const _=e=>{const r=Number(e);return Number.isFinite(r)?r:0};function P(e){return e.proj_pass_yd!=null||e.proj_rush_yd!=null||e.proj_rec_yd!=null||e.proj_rec!=null?{proj_pass_yd:_(e.proj_pass_yd),proj_pass_td:_(e.proj_pass_td),proj_rush_yd:_(e.proj_rush_yd),proj_rush_td:_(e.proj_rush_td),proj_rec:_(e.proj_rec),proj_rec_yd:_(e.proj_rec_yd),proj_rec_td:_(e.proj_rec_td)}:{proj_pass_yd:_(e.pass_yds)/17,proj_pass_td:_(e.pass_tds)/17,proj_rush_yd:_(e.rush_yds)/17,proj_rush_td:_(e.rush_tds)/17,proj_rec:_(e.receptions)/17,proj_rec_yd:_(e.rec_yds)/17,proj_rec_td:_(e.rec_tds)/17}}function te(e){const r=(e.position||"").toUpperCase(),s=P(e),l=i=>(Math.round(i*10)/10).toFixed(1),t=i=>(Math.round(i*100)/100).toFixed(2);return r==="QB"?`${l(s.proj_pass_yd)} PaYd · ${t(s.proj_pass_td)} PaTD · ${l(s.proj_rush_yd)} RuYd avg`:r==="RB"?`${l(s.proj_rush_yd)} RuYd · ${t(s.proj_rush_td)} RuTD · ${l(s.proj_rec)} Rec avg`:r==="WR"||r==="TE"?`${l(s.proj_rec)} Rec · ${l(s.proj_rec_yd)} RecYd avg`:""}function se(e){const r=(e.position||"").toUpperCase(),s=P(e),l=de(r,{proj_pass_yd:s.proj_pass_yd||null,proj_pass_td:s.proj_pass_td||null,proj_rush_yd:s.proj_rush_yd||null,proj_rush_td:s.proj_rush_td||null,proj_rec:s.proj_rec||null,proj_rec_yd:s.proj_rec_yd||null,proj_rec_td:s.proj_rec_td||null,proj_fgm:null,proj_xpm:null}),t=Number(e.model_points??e.projected_points??e.weekly??0),i=Number(e.projection_lower??e.lower??Math.max(0,t-5)),a=Number(e.projection_upper??e.upper??t+5),o=Number(e.width??(a-i)/2),$=e.opponent_team?`vs ${d(String(e.opponent_team))}`:"no game",m=e.injury_status?` · ${d(String(e.injury_status))}`:"",n=e.remaining_games==null?"sched unknown":`${d(String(e.remaining_games))} games left`;return`${l}<div class="micro mono faint" style="margin-top:8px; text-align:center">Range ${i.toFixed(1)} – ${a.toFixed(1)} (width ${o.toFixed(1)}) · ${$}${m} · ${n}</div>`}try{const e=await K(),r=(e==null?void 0:e.allTeams)||(e==null?void 0:e.leagueRosters)||[];r.length>0&&(k.innerHTML=r.map(s=>`<option value="${s.roster_id||s.owner_id}" ${String(s.roster_id||s.owner_id)===String(D)?"selected":""}>${d(s.team_name||s.display_name||`Team ${s.roster_id}`)} (${d(s.owner_name||s.display_name||"")})</option>`).join(""),S.innerHTML=r.map(s=>`<option value="${s.roster_id||s.owner_id}" ${String(s.roster_id||s.owner_id)===String(G)?"selected":""}>${d(s.team_name||s.display_name||`Team ${s.roster_id}`)} (${d(s.owner_name||s.display_name||"")})</option>`).join(""))}catch(e){console.error("Failed to load team list:",e)}async function re(e){const r=String(e);if(A.has(r))return A.get(r);const s=await K({roster_id:r});return A.set(r,s),s}async function L(e){var $,m;const r=e==="A",s=r?k.value:S.value,l=r?Q:V,t=r?J:X,i=r?x:b;if(!s)return;A.has(String(s))||(l.innerHTML='<div class="empty">Loading team roster…</div>');const a=await re(s);r?h=a:f=a;const o=(($=a==null?void 0:a.teamMeta)==null?void 0:$.team_name)||((m=a==null?void 0:a.teamMeta)==null?void 0:m.owner_name)||`Team ${s}`;t.textContent=`${o} (${r?"Sending":"Receiving"})`,ae(l,N(a),e,i),z(),I(),O()}function z(){Z.textContent=`${x.size} player${x.size===1?"":"s"} selected`,ee.textContent=`${b.size} player${b.size===1?"":"s"} selected`}function ae(e,r,s,l){if(!r||r.length===0){e.innerHTML='<div class="empty">No roster players found</div>';return}e.innerHTML=`
      <div style="display:flex; flex-direction:column">
        ${r.map(t=>{const i=String(t.player_id||t.id),a=l.has(i),o=Number(t.model_points??t.projected_points??t.weekly??0).toFixed(1),$=Number(t.model_season_points??t.ros??o*17).toFixed(0),m=t.auction_price_paid??t.auction??t.marketAuction??0,n=te(t),p=`${s}:${i}`,g=B.has(p);return`
            <label class="row align-between" style="padding:10px 14px; cursor:pointer; background:${a?"var(--surface-raised)":"transparent"}; border-bottom:1px solid var(--border); transition:background 0.15s; border-top:1px solid ${W((t.team||"").toUpperCase())}">
              <div class="row align-center" style="gap:10px">
                <input type="checkbox" class="trade-check" data-side="${s}" data-pid="${i}" ${a?"checked":""} title="Select ${d(t.player_name||t.full_name||i)} for trade" style="width:16px; height:16px; cursor:pointer" />
                <span style="width:8px; height:8px; border-radius:50%; background:${W((t.team||"").toUpperCase())}; flex-shrink:0" aria-hidden="true"></span>
                ${M(t,28)}
                <div>
                  <div class="row align-center" style="gap:6px">
                    <strong style="font-size:13px">${d(t.player_name||t.full_name||i)}</strong>
                    ${F(t.position)}
                    ${t.injury_status?oe(t.injury_status):""}
                  </div>
                  <div class="micro faint" style="margin-top:2px; display:flex; align-items:center; gap:4px">
                    <span class="slot-tag" style="font-size:10px; font-weight:700; letter-spacing:0.3px; padding:1px 5px; border-radius:4px; background:${t.slot&&t.slot!=="BENCH"&&t.slot!=="IR"?"rgba(56,189,248,0.12); color:var(--sky); border:1px solid rgba(56,189,248,0.25)":t.slot==="IR"?"rgba(244,63,94,0.12); color:var(--crimson); border:1px solid rgba(244,63,94,0.25)":"rgba(148,163,184,0.12); color:var(--text-muted); border:1px solid rgba(148,163,184,0.2)"}">${d(t.slot||(t.position&&!t.team?"IR":"BENCH"))}</span>
                    <span>Draft Cost: $${m}</span> · ${Y(t.team,14)} <span>${t.team||"FA"} ${t.opponent_team?`vs ${t.opponent_team}`:""}</span>
                  </div>
                  ${n?`<div class="micro mono faint" style="margin-top:2px">${d(n)}</div>`:""}
                </div>
              </div>
              <div style="text-align:right">
                <div class="mono" style="font-weight:700; font-size:13px; color:var(--accent)">${o} <span class="micro faint">pts/wk</span></div>
                <div class="micro faint mono">${$} pts ROS</div>
                <button class="trade-expand" data-side="${s}" data-pid="${d(i)}" title="Show projected stats" style="margin-top:4px; font-size:11px; background:transparent; color:var(--text-muted); border:1px solid var(--border); border-radius:6px; padding:1px 8px; cursor:pointer">${g?"▾ stats":"▸ stats"}</button>
              </div>
            </label>
            <div class="trade-detail" data-side="${s}" data-pid="${d(i)}" style="display:${g?"block":"none"}; padding:10px 14px; border-bottom:1px solid var(--border); background:var(--surface-raised)">
              ${se(t)}
            </div>
          `}).join("")}
      </div>
    `,e.querySelectorAll(".trade-check").forEach(t=>{t.addEventListener("change",i=>{const a=i.target.dataset.pid,o=i.target.dataset.side==="A"?x:b;i.target.checked?o.add(a):o.delete(a),z(),I(),O()})}),e.querySelectorAll(".trade-expand").forEach(t=>{t.addEventListener("click",i=>{i.preventDefault(),i.stopPropagation();const a=`${t.dataset.side}:${t.dataset.pid}`,o=e.querySelector(`.trade-detail[data-side="${t.dataset.side}"][data-pid="${t.dataset.pid}"]`);B.has(a)?(B.delete(a),t.innerHTML="▸ stats",o&&(o.style.display="none")):(B.add(a),t.innerHTML="▾ stats",o&&(o.style.display="block"))})})}const q=["QB","RB","WR","TE","FLEX","K","DEF"];function U(e,r,s,l){if(!e)return"";const t=n=>{const p=Number(n.model_points??n.projected_points??n.weekly??0);return Number.isFinite(p)?p:0},i=r||new Set,a=new Set((s||[]).map(n=>String(n.player_id||n.id))),o={};for(const n of N(e)){const p=(n.position||"UNK").toUpperCase();(o[p]=o[p]||[]).push(n)}for(const n of s||[]){const p=(n.position||"UNK").toUpperCase();(o[p]=o[p]||[]).push({...n,_incoming:!0})}const m=Object.keys(o).sort((n,p)=>{const g=q.indexOf(n),v=q.indexOf(p);return(g<0?99:g)-(v<0?99:v)}).map(n=>{const p=o[n].slice().sort((u,y)=>t(y)-t(u)),g=p.filter(u=>!u._incoming&&!i.has(String(u.player_id||u.id))),v=g.reduce((u,y)=>u+t(y),0),w=p.map(u=>{const y=String(u.player_id||u.id),j=u._incoming||a.has(y),H=!j&&i.has(y);return`<div class="depth-card depth-${j?"in":H?"out":"kept"}">
          ${M(u,34)}
          <div style="flex:1; min-width:0">
            <div class="depth-name">${d(u.player_name||y)}</div>
            <div class="micro faint">${F(n)} · <span class="mono">${t(u).toFixed(1)}</span></div>
          </div>
          <span class="depth-tag">${j?"IN":H?"OUT":""}</span>
        </div>`}).join("");return`<div class="depth-group">
        <div class="depth-group-head"><strong>${d(n)}</strong><span class="faint"> · ${g.length} kept · ${v.toFixed(1)}/wk</span></div>
        <div class="depth-cards">${w}</div>
      </div>`}).join("");return`<div><div class="depth-team">${d(l)} <span class="faint">post-trade</span></div>${m}</div>`}function O(){var t,i;if(!R)return;if(!h&&!f){R.innerHTML="";return}const e=N(h).filter(a=>x.has(String(a.player_id||a.id))),r=N(f).filter(a=>b.has(String(a.player_id||a.id)));if(!e.length&&!r.length){R.innerHTML="";return}const s=((t=h==null?void 0:h.teamMeta)==null?void 0:t.team_name)||"Team A",l=((i=f==null?void 0:f.teamMeta)==null?void 0:i.team_name)||"Team B";R.innerHTML='<div class="card"><div class="card-body"><div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px">Post-trade depth by position</div><div class="grid grid-2" style="font-size:12px">'+U(h,x,r,s)+U(f,b,e,l)+"</div></div></div>"}function I(){clearTimeout(C),C=setTimeout(ie,400)}async function ie(){var l,t;const e=((l=h==null?void 0:h.teamMeta)==null?void 0:l.team_name)||"Team A",r=((t=f==null?void 0:f.teamMeta)==null?void 0:t.team_name)||"Team B";if(!x.size&&!b.size){T.innerHTML='<div class="alert alert-info" style="font-size:13px">Tick players on both sides to grade the trade.</div>';return}T.innerHTML='<div class="card"><div class="card-body"><div class="empty" style="padding:8px">Grading trade…</div></div></div>';let s=null;try{s=await le(k.value,S.value,{tradedA:[...x],tradedB:[...b]})}catch{}if(!s||s.cold){T.innerHTML='<div class="alert alert-warn" style="font-size:13px">Couldn’t grade this trade right now.</div>';return}T.innerHTML=ne(s,e,r)}function ne(e,r,s){var p,g;const l=e.winner==="Even"?"Fair trade":`${e.winner} wins the trade`,t=Number(e.team_a_weekly??0).toFixed(1),i=Number(e.team_b_weekly??0).toFixed(1),a=e.market_a!=null?Number(e.market_a).toLocaleString("en-US"):null,o=e.market_b!=null?Number(e.market_b).toLocaleString("en-US"):null,$=v=>`
      <div class="mini-row">
        ${M(v,28)}
        <div style="flex:1; min-width:0">
          <div class="mini-name">${d(v.player_name||"")}</div>
          <div class="micro faint">${F(v.position)} ${Y(v.team,12)} ${d(v.team||"")}</div>
        </div>
        <div style="text-align:right">
          <div class="mono" style="font-weight:700; font-size:13px">${Number(v.weekly??0).toFixed(1)}<span class="micro faint">/wk</span></div>
          ${v.market!=null?`<div class="micro faint">mkt ${Number(v.market).toLocaleString("en-US")}</div>`:""}
        </div>
      </div>`,m=e.slots,n=(v,w,u,y)=>{if(!w)return"";const j=y&&y.length?` — adds ${y.map(H=>d(String(H))).join(", ")}`:"";return`<div class="micro" style="margin-top:4px">+${w} bench spot${w>1?"s":""} for ${d(v)}${j} <span class="faint">(+${Number(u).toFixed(0)} ROS)</span></div>`};return`<div class="card"><div class="card-body">
      <div class="kicker">Trade verdict</div>
      <h2 class="verdict-headline">${d(l)}</h2>
      <div class="micro faint" style="margin-bottom:8px">${d(r)} gives ${t}/wk · gets ${i}/wk${a&&o?` · market ${a} vs ${o}`:""}</div>
      <div class="signal-cols">
        <div><div class="kicker" style="margin-bottom:4px">${d(r)} gives</div>${(((p=e.packages)==null?void 0:p.a)||[]).map($).join("")||'<div class="empty">—</div>'}</div>
        <div><div class="kicker" style="margin-bottom:4px">${d(s)} gives</div>${(((g=e.packages)==null?void 0:g.b)||[]).map($).join("")||'<div class="empty">—</div>'}</div>
      </div>
      ${m?n(r,m.gained_a,m.credit_a_ros,m.fill_a)+n(s,m.gained_b,m.credit_b_ros,m.fill_b):""}
    </div></div>`}k.addEventListener("change",()=>{x.clear(),L("A")}),S.addEventListener("change",()=>{b.clear(),L("B")}),await Promise.all([L("A"),L("B")])}function N(c){return c?[...c.starters||[],...Array.isArray(c.bench)?c.bench:[],...Array.isArray(c.reserve)?c.reserve:[]]:[]}export{me as renderTrade};
