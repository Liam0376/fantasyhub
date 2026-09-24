import{k as ee,h as l,r as te,p as P,i as q,j as fe,t as se,J as $e,N as be}from"./index-D0XiqyTN.js";async function ke(m){const U=new URLSearchParams(location.hash.split("?")[1]||"");let re=U.get("team_a")||"1",ae=U.get("team_b")||"2";m.innerHTML=`
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
  `;const B=m.querySelector("#selectTeamA"),N=m.querySelector("#selectTeamB"),L=m.querySelector("#tradeSummaryBanner"),ie=m.querySelector("#teamARoster"),ne=m.querySelector("#teamBRoster"),oe=m.querySelector("#teamAHeader"),de=m.querySelector("#teamBHeader"),le=m.querySelector("#teamASub"),ce=m.querySelector("#teamBSub"),H=m.querySelector("#tradeDepth"),M=new Map;let _=null,g=null;const h=new Set,f=new Set,F=new Set;let O=null;const v=e=>{const r=Number(e);return Number.isFinite(r)?r:0};function I(e){return e.proj_pass_yd!=null||e.proj_rush_yd!=null||e.proj_rec_yd!=null||e.proj_rec!=null?{proj_pass_yd:v(e.proj_pass_yd),proj_pass_td:v(e.proj_pass_td),proj_rush_yd:v(e.proj_rush_yd),proj_rush_td:v(e.proj_rush_td),proj_rec:v(e.proj_rec),proj_rec_yd:v(e.proj_rec_yd),proj_rec_td:v(e.proj_rec_td)}:{proj_pass_yd:v(e.pass_yds)/17,proj_pass_td:v(e.pass_tds)/17,proj_rush_yd:v(e.rush_yds)/17,proj_rush_td:v(e.rush_tds)/17,proj_rec:v(e.receptions)/17,proj_rec_yd:v(e.rec_yds)/17,proj_rec_td:v(e.rec_tds)/17}}function pe(e){const r=(e.position||"").toUpperCase(),s=I(e),c=a=>(Math.round(a*10)/10).toFixed(1),t=a=>(Math.round(a*100)/100).toFixed(2);return r==="QB"?`${c(s.proj_pass_yd)} PaYd · ${t(s.proj_pass_td)} PaTD · ${c(s.proj_rush_yd)} RuYd avg`:r==="RB"?`${c(s.proj_rush_yd)} RuYd · ${t(s.proj_rush_td)} RuTD · ${c(s.proj_rec)} Rec avg`:r==="WR"||r==="TE"?`${c(s.proj_rec)} Rec · ${c(s.proj_rec_yd)} RecYd avg`:""}function me(e){const r=(e.position||"").toUpperCase(),s=I(e),c=$e(r,{proj_pass_yd:s.proj_pass_yd||null,proj_pass_td:s.proj_pass_td||null,proj_rush_yd:s.proj_rush_yd||null,proj_rush_td:s.proj_rush_td||null,proj_rec:s.proj_rec||null,proj_rec_yd:s.proj_rec_yd||null,proj_rec_td:s.proj_rec_td||null,proj_fgm:null,proj_xpm:null}),t=Number(e.model_points??e.projected_points??e.weekly??0),a=Number(e.projection_lower??e.lower??Math.max(0,t-5)),i=Number(e.projection_upper??e.upper??t+5),o=Number(e.width??(i-a)/2),$=e.opponent_team?`vs ${l(String(e.opponent_team))}`:"no game",y=e.injury_status?` · ${l(String(e.injury_status))}`:"",n=e.remaining_games==null?"sched unknown":`${l(String(e.remaining_games))} games left`;return`${c}<div class="micro mono faint" style="margin-top:8px; text-align:center">Range ${a.toFixed(1)} – ${i.toFixed(1)} (width ${o.toFixed(1)}) · ${$}${y} · ${n}</div>`}try{const e=await ee(),r=(e==null?void 0:e.allTeams)||(e==null?void 0:e.leagueRosters)||[];r.length>0&&(B.innerHTML=r.map(s=>`<option value="${s.roster_id||s.owner_id}" ${String(s.roster_id||s.owner_id)===String(re)?"selected":""}>${l(s.team_name||s.display_name||`Team ${s.roster_id}`)} (${l(s.owner_name||s.display_name||"")})</option>`).join(""),N.innerHTML=r.map(s=>`<option value="${s.roster_id||s.owner_id}" ${String(s.roster_id||s.owner_id)===String(ae)?"selected":""}>${l(s.team_name||s.display_name||`Team ${s.roster_id}`)} (${l(s.owner_name||s.display_name||"")})</option>`).join(""))}catch(e){console.error("Failed to load team list:",e)}async function ue(e){const r=String(e);if(M.has(r))return M.get(r);const s=await ee({roster_id:r});return M.set(r,s),s}async function E(e){var $,y;const r=e==="A",s=r?B.value:N.value,c=r?ie:ne,t=r?oe:de,a=r?h:f;if(!s)return;M.has(String(s))||(c.innerHTML='<div class="empty">Loading team roster…</div>');const i=await ue(s);r?_=i:g=i;const o=(($=i==null?void 0:i.teamMeta)==null?void 0:$.team_name)||((y=i==null?void 0:i.teamMeta)==null?void 0:y.owner_name)||`Team ${s}`;t.textContent=`${o} (${r?"Sending":"Receiving"})`,ve(c,j(i),e,a),D(),G(),Y()}function D(){le.textContent=`${h.size} player${h.size===1?"":"s"} selected`,ce.textContent=`${f.size} player${f.size===1?"":"s"} selected`}function ve(e,r,s,c){if(!r||r.length===0){e.innerHTML='<div class="empty">No roster players found</div>';return}e.innerHTML=`
      <div style="display:flex; flex-direction:column">
        ${r.map(t=>{const a=String(t.player_id||t.id),i=c.has(a),o=Number(t.model_points??t.projected_points??t.weekly??0).toFixed(1),$=Number(t.model_season_points??t.ros??o*17).toFixed(0),y=t.auction_price_paid??t.auction??t.marketAuction??0,n=pe(t),u=`${s}:${a}`,b=F.has(u);return`
            <label class="row align-between" style="padding:10px 14px; cursor:pointer; background:${i?"var(--surface-raised)":"transparent"}; border-bottom:1px solid var(--border); transition:background 0.15s; border-top:1px solid ${te((t.team||"").toUpperCase())}">
              <div class="row align-center" style="gap:10px">
                <input type="checkbox" class="trade-check" data-side="${s}" data-pid="${a}" ${i?"checked":""} title="Select ${l(t.player_name||t.full_name||a)} for trade" style="width:16px; height:16px; cursor:pointer" />
                <span style="width:8px; height:8px; border-radius:50%; background:${te((t.team||"").toUpperCase())}; flex-shrink:0" aria-hidden="true"></span>
                ${P(t,28)}
                <div>
                  <div class="row align-center" style="gap:6px">
                    <strong style="font-size:13px">${l(t.player_name||t.full_name||a)}</strong>
                    ${q(t.position)}
                    ${t.injury_status?fe(t.injury_status):""}
                  </div>
                  <div class="micro faint" style="margin-top:2px; display:flex; align-items:center; gap:4px">
                    <span class="slot-tag" style="font-size:10px; font-weight:700; letter-spacing:0.3px; padding:1px 5px; border-radius:4px; background:${t.slot&&t.slot!=="BENCH"&&t.slot!=="IR"?"rgba(56,189,248,0.12); color:var(--sky); border:1px solid rgba(56,189,248,0.25)":t.slot==="IR"?"rgba(244,63,94,0.12); color:var(--crimson); border:1px solid rgba(244,63,94,0.25)":"rgba(148,163,184,0.12); color:var(--text-muted); border:1px solid rgba(148,163,184,0.2)"}">${l(t.slot||(t.position&&!t.team?"IR":"BENCH"))}</span>
                    <span>Draft Cost: $${y}</span> · ${se(t.team,14)} <span>${t.team||"FA"} ${t.opponent_team?`vs ${t.opponent_team}`:""}</span>
                  </div>
                  ${n?`<div class="micro mono faint" style="margin-top:2px">${l(n)}</div>`:""}
                </div>
              </div>
              <div style="text-align:right">
                <div class="mono" style="font-weight:700; font-size:13px; color:var(--accent)">${o} <span class="micro faint">pts/wk</span></div>
                <div class="micro faint mono">${$} pts ROS</div>
                <button class="trade-expand" data-side="${s}" data-pid="${l(a)}" title="Show projected stats" style="margin-top:4px; font-size:11px; background:transparent; color:var(--text-muted); border:1px solid var(--border); border-radius:6px; padding:1px 8px; cursor:pointer">${b?"▾ stats":"▸ stats"}</button>
              </div>
            </label>
            <div class="trade-detail" data-side="${s}" data-pid="${l(a)}" style="display:${b?"block":"none"}; padding:10px 14px; border-bottom:1px solid var(--border); background:var(--surface-raised)">
              ${me(t)}
            </div>
          `}).join("")}
      </div>
    `,e.querySelectorAll(".trade-check").forEach(t=>{t.addEventListener("change",a=>{const i=a.target.dataset.pid,o=a.target.dataset.side==="A"?h:f;a.target.checked?o.add(i):o.delete(i),D(),G(),Y()})}),e.querySelectorAll(".trade-expand").forEach(t=>{t.addEventListener("click",a=>{a.preventDefault(),a.stopPropagation();const i=`${t.dataset.side}:${t.dataset.pid}`,o=e.querySelector(`.trade-detail[data-side="${t.dataset.side}"][data-pid="${t.dataset.pid}"]`);F.has(i)?(F.delete(i),t.innerHTML="▸ stats",o&&(o.style.display="none")):(F.add(i),t.innerHTML="▾ stats",o&&(o.style.display="block"))})})}const W=["QB","RB","WR","TE","FLEX","K","DEF"];function K(e,r,s,c){if(!e)return"";const t=n=>{const u=Number(n.model_points??n.projected_points??n.weekly??0);return Number.isFinite(u)?u:0},a=r||new Set,i=new Set((s||[]).map(n=>String(n.player_id||n.id))),o={};for(const n of j(e)){const u=(n.position||"UNK").toUpperCase();(o[u]=o[u]||[]).push(n)}for(const n of s||[]){const u=(n.position||"UNK").toUpperCase();(o[u]=o[u]||[]).push({...n,_incoming:!0})}const y=Object.keys(o).sort((n,u)=>{const b=W.indexOf(n),w=W.indexOf(u);return(b<0?99:b)-(w<0?99:w)}).map(n=>{const u=o[n].slice().sort((p,x)=>t(x)-t(p)),b=u.filter(p=>!p._incoming&&!a.has(String(p.player_id||p.id))),w=b.reduce((p,x)=>p+t(x),0),S=u.map(p=>{const x=String(p.player_id||p.id),T=p._incoming||i.has(x),R=!T&&a.has(x);return`<div class="depth-card depth-${T?"in":R?"out":"kept"}">
          ${P(p,34)}
          <div style="flex:1; min-width:0">
            <div class="depth-name">${l(p.player_name||x)}</div>
            <div class="micro faint">${q(n)} · <span class="mono">${t(p).toFixed(1)}</span></div>
          </div>
          <span class="depth-tag">${T?"IN":R?"OUT":""}</span>
        </div>`}).join("");return`<div class="depth-group">
        <div class="depth-group-head"><strong>${l(n)}</strong><span class="faint"> · ${b.length} kept · ${w.toFixed(1)}/wk</span></div>
        <div class="depth-cards">${S}</div>
      </div>`}).join("");return`<div><div class="depth-team">${l(c)} <span class="faint">post-trade</span></div>${y}</div>`}function Y(){var t,a;if(!H)return;if(!_&&!g){H.innerHTML="";return}const e=j(_).filter(i=>h.has(String(i.player_id||i.id))),r=j(g).filter(i=>f.has(String(i.player_id||i.id)));if(!e.length&&!r.length){H.innerHTML="";return}const s=((t=_==null?void 0:_.teamMeta)==null?void 0:t.team_name)||"Team A",c=((a=g==null?void 0:g.teamMeta)==null?void 0:a.team_name)||"Team B";H.innerHTML='<div class="card"><div class="card-body"><div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px">Post-trade depth by position</div><div class="grid grid-2" style="font-size:12px">'+K(_,h,r,s)+K(g,f,e,c)+"</div></div></div>"}function G(){clearTimeout(O),O=setTimeout(_e,400)}async function _e(){var c,t;const e=((c=_==null?void 0:_.teamMeta)==null?void 0:c.team_name)||"Team A",r=((t=g==null?void 0:g.teamMeta)==null?void 0:t.team_name)||"Team B";if(!h.size&&!f.size){L.innerHTML='<div class="alert alert-info" style="font-size:13px">Tick players on both sides to grade the trade.</div>';return}L.innerHTML='<div class="card"><div class="card-body"><div class="empty" style="padding:8px">Grading trade…</div></div></div>';let s=null;try{s=await be(B.value,N.value,{tradedA:[...h],tradedB:[...f]})}catch{}if(!s||s.cold){L.innerHTML='<div class="alert alert-warn" style="font-size:13px">Couldn’t grade this trade right now.</div>';return}L.innerHTML=ge(s,e,r,j(_).filter(a=>h.has(String(a.player_id||a.id))),j(g).filter(a=>f.has(String(a.player_id||a.id))))}function ge(e,r,s,c=[],t=[]){var V,J,X,Z;const a=e.winner==="Even"?"Fair trade":`${e.winner} wins the trade`,i=e.market_a!=null?Number(e.market_a).toLocaleString("en-US"):null,o=e.market_b!=null?Number(e.market_b).toLocaleString("en-US"):null,$=d=>({player_id:d.player_id||d.id,sleeper_id:d.sleeper_id||null,player_name:d.player_name||d.full_name,position:d.position,team:d.team,weekly:Number(d.model_points??d.projected_points??d.weekly??0),market:d.auction??d.marketAuction??null}),y=(J=(V=e.packages)==null?void 0:V.a)!=null&&J.length?e.packages.a:c.map($),n=(Z=(X=e.packages)==null?void 0:X.b)!=null&&Z.length?e.packages.b:t.map($),u=d=>d.reduce((A,z)=>A+Number(z.weekly??0),0),b=u(y).toFixed(1),w=u(n).toFixed(1),S=Number(e.value_difference??0),p=i!=null&&o!=null?Number(e.market_b)-Number(e.market_a):null,x=p!=null&&Number(e.market_a)+Number(e.market_b)>0?Math.abs(p)/(Number(e.market_a)+Number(e.market_b)):0,T=p!=null&&Math.abs(S)>=20&&x>=.1&&S>0!=p>0,R=d=>`
      <div class="mini-row">
        ${P(d,28)}
        <div style="flex:1; min-width:0">
          <div class="mini-name">${l(d.player_name||"")}</div>
          <div class="micro faint">${q(d.position)} ${se(d.team,12)}</div>
        </div>
        <div style="text-align:right">
          <div class="mono" style="font-weight:700; font-size:13px">${Number(d.weekly??0).toFixed(1)}<span class="micro faint">/wk</span></div>
          ${d.market!=null?`<div class="micro faint">mkt ${Number(d.market).toLocaleString("en-US")}</div>`:""}
        </div>
      </div>`,k=e.slots,Q=(d,A,z,C)=>{if(!A)return"";const ye=C&&C.length?` — adds ${C.map(he=>l(String(he))).join(", ")}`:"";return`<div class="micro" style="margin-top:4px">+${A} bench spot${A>1?"s":""} for ${l(d)}${ye} <span class="faint">(+${Number(z).toFixed(0)} ROS)</span></div>`};return`<div class="card"><div class="card-body">
      <div class="kicker">Trade verdict</div>
      <h2 class="verdict-headline">${l(a)}</h2>
      <div class="micro faint" style="margin-bottom:8px">${l(r)} gives ${b}/wk · gets ${w}/wk${i&&o?` · market ${i} vs ${o}`:""}</div>
      ${T?`<div class="alert alert-warn" style="font-size:12px; margin-bottom:8px">Model and market disagree here — the model likes the ${S>0?"incoming":"outgoing"} side, real leagues pay more for the other. Trust the market on stars, the model on depth.</div>`:""}
      <div class="signal-cols">
        <div><div class="kicker" style="margin-bottom:4px">${l(r)} gives</div>${y.map(R).join("")||'<div class="empty">—</div>'}</div>
        <div><div class="kicker" style="margin-bottom:4px">${l(s)} gives</div>${n.map(R).join("")||'<div class="empty">—</div>'}</div>
      </div>
      ${k?Q(r,k.gained_a,k.credit_a_ros,k.fill_a)+Q(s,k.gained_b,k.credit_b_ros,k.fill_b):""}
    </div></div>`}B.addEventListener("change",()=>{h.clear(),E("A")}),N.addEventListener("change",()=>{f.clear(),E("B")}),await Promise.all([E("A"),E("B")])}function j(m){return m?[...m.starters||[],...Array.isArray(m.bench)?m.bench:[],...Array.isArray(m.reserve)?m.reserve:[]]:[]}export{ke as renderTrade};
