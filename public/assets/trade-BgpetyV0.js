import{k as te,h as l,r as se,p as P,i as q,j as be,t as re,J as xe,N as ke}from"./index-UyDjkkdl.js";async function je(m){const U=new URLSearchParams(location.hash.split("?")[1]||"");let ae=U.get("team_a")||"1",ie=U.get("team_b")||"2";m.innerHTML=`
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
  `;const B=m.querySelector("#selectTeamA"),L=m.querySelector("#selectTeamB"),H=m.querySelector("#tradeSummaryBanner"),ne=m.querySelector("#teamARoster"),oe=m.querySelector("#teamBRoster"),de=m.querySelector("#teamAHeader"),le=m.querySelector("#teamBHeader"),ce=m.querySelector("#teamASub"),pe=m.querySelector("#teamBSub"),M=m.querySelector("#tradeDepth"),F=new Map;let _=null,g=null;const h=new Set,f=new Set,z=new Set;let O=null;const v=e=>{const r=Number(e);return Number.isFinite(r)?r:0};function I(e){return e.proj_pass_yd!=null||e.proj_rush_yd!=null||e.proj_rec_yd!=null||e.proj_rec!=null?{proj_pass_yd:v(e.proj_pass_yd),proj_pass_td:v(e.proj_pass_td),proj_rush_yd:v(e.proj_rush_yd),proj_rush_td:v(e.proj_rush_td),proj_rec:v(e.proj_rec),proj_rec_yd:v(e.proj_rec_yd),proj_rec_td:v(e.proj_rec_td)}:{proj_pass_yd:v(e.pass_yds)/17,proj_pass_td:v(e.pass_tds)/17,proj_rush_yd:v(e.rush_yds)/17,proj_rush_td:v(e.rush_tds)/17,proj_rec:v(e.receptions)/17,proj_rec_yd:v(e.rec_yds)/17,proj_rec_td:v(e.rec_tds)/17}}function me(e){const r=(e.position||"").toUpperCase(),s=I(e),c=a=>(Math.round(a*10)/10).toFixed(1),t=a=>(Math.round(a*100)/100).toFixed(2);return r==="QB"?`${c(s.proj_pass_yd)} PaYd · ${t(s.proj_pass_td)} PaTD · ${c(s.proj_rush_yd)} RuYd avg`:r==="RB"?`${c(s.proj_rush_yd)} RuYd · ${t(s.proj_rush_td)} RuTD · ${c(s.proj_rec)} Rec avg`:r==="WR"||r==="TE"?`${c(s.proj_rec)} Rec · ${c(s.proj_rec_yd)} RecYd avg`:""}function ue(e){const r=(e.position||"").toUpperCase(),s=I(e),c=xe(r,{proj_pass_yd:s.proj_pass_yd||null,proj_pass_td:s.proj_pass_td||null,proj_rush_yd:s.proj_rush_yd||null,proj_rush_td:s.proj_rush_td||null,proj_rec:s.proj_rec||null,proj_rec_yd:s.proj_rec_yd||null,proj_rec_td:s.proj_rec_td||null,proj_fgm:null,proj_xpm:null}),t=Number(e.model_points??e.projected_points??e.weekly??0),a=Number(e.projection_lower??e.lower??Math.max(0,t-5)),i=Number(e.projection_upper??e.upper??t+5),d=Number(e.width??(i-a)/2),$=e.opponent_team?`vs ${l(String(e.opponent_team))}`:"no game",y=e.injury_status?` · ${l(String(e.injury_status))}`:"",n=e.remaining_games==null?"sched unknown":`${l(String(e.remaining_games))} games left`;return`${c}<div class="micro mono faint" style="margin-top:8px; text-align:center">Range ${a.toFixed(1)} – ${i.toFixed(1)} (width ${d.toFixed(1)}) · ${$}${y} · ${n}</div>`}try{const e=await te(),r=(e==null?void 0:e.allTeams)||(e==null?void 0:e.leagueRosters)||[];r.length>0&&(B.innerHTML=r.map(s=>`<option value="${s.roster_id||s.owner_id}" ${String(s.roster_id||s.owner_id)===String(ae)?"selected":""}>${l(s.team_name||s.display_name||`Team ${s.roster_id}`)} (${l(s.owner_name||s.display_name||"")})</option>`).join(""),L.innerHTML=r.map(s=>`<option value="${s.roster_id||s.owner_id}" ${String(s.roster_id||s.owner_id)===String(ie)?"selected":""}>${l(s.team_name||s.display_name||`Team ${s.roster_id}`)} (${l(s.owner_name||s.display_name||"")})</option>`).join(""))}catch(e){console.error("Failed to load team list:",e)}async function ve(e){const r=String(e);if(F.has(r))return F.get(r);const s=await te({roster_id:r});return F.set(r,s),s}async function C(e){var $,y;const r=e==="A",s=r?B.value:L.value,c=r?ne:oe,t=r?de:le,a=r?h:f;if(!s)return;F.has(String(s))||(c.innerHTML='<div class="empty">Loading team roster…</div>');const i=await ve(s);r?_=i:g=i;const d=(($=i==null?void 0:i.teamMeta)==null?void 0:$.team_name)||((y=i==null?void 0:i.teamMeta)==null?void 0:y.owner_name)||`Team ${s}`;t.textContent=`${d} (${r?"Sending":"Receiving"})`,_e(c,S(i),e,a),W(),G(),Y()}function W(){ce.textContent=`${h.size} player${h.size===1?"":"s"} selected`,pe.textContent=`${f.size} player${f.size===1?"":"s"} selected`}function _e(e,r,s,c){if(!r||r.length===0){e.innerHTML='<div class="empty">No roster players found</div>';return}e.innerHTML=`
      <div style="display:flex; flex-direction:column">
        ${r.map(t=>{const a=String(t.player_id||t.id),i=c.has(a),d=Number(t.model_points??t.projected_points??t.weekly??0).toFixed(1),$=Number(t.model_season_points??t.ros??d*17).toFixed(0),y=t.auction_price_paid??t.auction??t.marketAuction??0,n=me(t),u=`${s}:${a}`,b=z.has(u);return`
            <label class="row align-between" style="padding:10px 14px; cursor:pointer; background:${i?"var(--surface-raised)":"transparent"}; border-bottom:1px solid var(--border); transition:background 0.15s; border-top:1px solid ${se((t.team||"").toUpperCase())}">
              <div class="row align-center" style="gap:10px">
                <input type="checkbox" class="trade-check" data-side="${s}" data-pid="${a}" ${i?"checked":""} title="Select ${l(t.player_name||t.full_name||a)} for trade" style="width:16px; height:16px; cursor:pointer" />
                <span style="width:8px; height:8px; border-radius:50%; background:${se((t.team||"").toUpperCase())}; flex-shrink:0" aria-hidden="true"></span>
                ${P(t,28)}
                <div>
                  <div class="row align-center" style="gap:6px">
                    <strong style="font-size:13px">${l(t.player_name||t.full_name||a)}</strong>
                    ${q(t.position)}
                    ${t.injury_status?be(t.injury_status):""}
                  </div>
                  <div class="micro faint" style="margin-top:2px; display:flex; align-items:center; gap:4px">
                    <span class="slot-tag" style="font-size:10px; font-weight:700; letter-spacing:0.3px; padding:1px 5px; border-radius:4px; background:${t.slot&&t.slot!=="BENCH"&&t.slot!=="IR"?"rgba(56,189,248,0.12); color:var(--sky); border:1px solid rgba(56,189,248,0.25)":t.slot==="IR"?"rgba(244,63,94,0.12); color:var(--crimson); border:1px solid rgba(244,63,94,0.25)":"rgba(148,163,184,0.12); color:var(--text-muted); border:1px solid rgba(148,163,184,0.2)"}">${l(t.slot||(t.position&&!t.team?"IR":"BENCH"))}</span>
                    <span>Draft Cost: $${y}</span> · ${re(t.team,14)} <span>${t.team||"FA"} ${t.opponent_team?`vs ${t.opponent_team}`:""}</span>
                  </div>
                  ${n?`<div class="micro mono faint" style="margin-top:2px">${l(n)}</div>`:""}
                </div>
              </div>
              <div style="text-align:right">
                <div class="mono" style="font-weight:700; font-size:13px; color:var(--accent)">${d} <span class="micro faint">pts/wk</span></div>
                <div class="micro faint mono">${$} pts ROS</div>
                <button class="trade-expand" data-side="${s}" data-pid="${l(a)}" title="Show projected stats" style="margin-top:4px; font-size:11px; background:transparent; color:var(--text-muted); border:1px solid var(--border); border-radius:6px; padding:1px 8px; cursor:pointer">${b?"▾ stats":"▸ stats"}</button>
              </div>
            </label>
            <div class="trade-detail" data-side="${s}" data-pid="${l(a)}" style="display:${b?"block":"none"}; padding:10px 14px; border-bottom:1px solid var(--border); background:var(--surface-raised)">
              ${ue(t)}
            </div>
          `}).join("")}
      </div>
    `,e.querySelectorAll(".trade-check").forEach(t=>{t.addEventListener("change",a=>{const i=a.target.dataset.pid,d=a.target.dataset.side==="A"?h:f;a.target.checked?d.add(i):d.delete(i),W(),G(),Y()})}),e.querySelectorAll(".trade-expand").forEach(t=>{t.addEventListener("click",a=>{a.preventDefault(),a.stopPropagation();const i=`${t.dataset.side}:${t.dataset.pid}`,d=e.querySelector(`.trade-detail[data-side="${t.dataset.side}"][data-pid="${t.dataset.pid}"]`);z.has(i)?(z.delete(i),t.innerHTML="▸ stats",d&&(d.style.display="none")):(z.add(i),t.innerHTML="▾ stats",d&&(d.style.display="block"))})})}const D=["QB","RB","WR","TE","FLEX","K","DEF"];function K(e,r,s,c){if(!e)return"";const t=n=>{const u=Number(n.model_points??n.projected_points??n.weekly??0);return Number.isFinite(u)?u:0},a=r||new Set,i=new Set((s||[]).map(n=>String(n.player_id||n.id))),d={};for(const n of S(e)){const u=(n.position||"UNK").toUpperCase();(d[u]=d[u]||[]).push(n)}for(const n of s||[]){const u=(n.position||"UNK").toUpperCase();(d[u]=d[u]||[]).push({...n,_incoming:!0})}const y=Object.keys(d).sort((n,u)=>{const b=D.indexOf(n),j=D.indexOf(u);return(b<0?99:b)-(j<0?99:j)}).map(n=>{const u=d[n].slice().sort((p,x)=>t(x)-t(p)),b=u.filter(p=>!p._incoming&&!a.has(String(p.player_id||p.id))),j=b.reduce((p,x)=>p+t(x),0),T=u.map(p=>{const x=String(p.player_id||p.id),R=p._incoming||i.has(x),A=!R&&a.has(x);return`<div class="depth-card depth-${R?"in":A?"out":"kept"}">
          ${P(p,34)}
          <div style="flex:1; min-width:0">
            <div class="depth-name">${l(p.player_name||x)}</div>
            <div class="micro faint">${q(n)} · <span class="mono">${t(p).toFixed(1)}</span></div>
          </div>
          <span class="depth-tag">${R?"IN":A?"OUT":""}</span>
        </div>`}).join("");return`<div class="depth-group">
        <div class="depth-group-head"><strong>${l(n)}</strong><span class="faint"> · ${b.length} kept · ${j.toFixed(1)}/wk</span></div>
        <div class="depth-cards">${T}</div>
      </div>`}).join("");return`<div><div class="depth-team">${l(c)} <span class="faint">post-trade</span></div>${y}</div>`}function Y(){var t,a;if(!M)return;if(!_&&!g){M.innerHTML="";return}const e=S(_).filter(i=>h.has(String(i.player_id||i.id))),r=S(g).filter(i=>f.has(String(i.player_id||i.id)));if(!e.length&&!r.length){M.innerHTML="";return}const s=((t=_==null?void 0:_.teamMeta)==null?void 0:t.team_name)||"Team A",c=((a=g==null?void 0:g.teamMeta)==null?void 0:a.team_name)||"Team B";M.innerHTML='<div class="card"><div class="card-body"><div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px">Post-trade depth by position</div><div class="grid grid-2" style="font-size:12px">'+K(_,h,r,s)+K(g,f,e,c)+"</div></div></div>"}function G(){clearTimeout(O),O=setTimeout(ge,400)}async function ge(){var c,t;const e=((c=_==null?void 0:_.teamMeta)==null?void 0:c.team_name)||"Team A",r=((t=g==null?void 0:g.teamMeta)==null?void 0:t.team_name)||"Team B";if(!h.size&&!f.size){H.innerHTML='<div class="alert alert-info" style="font-size:13px">Tick players on both sides to grade the trade.</div>';return}H.innerHTML='<div class="card"><div class="card-body"><div class="empty" style="padding:8px">Grading trade…</div></div></div>';let s=null;try{s=await ke(B.value,L.value,{tradedA:[...h],tradedB:[...f]})}catch{}if(!s||s.cold){H.innerHTML='<div class="alert alert-warn" style="font-size:13px">Couldn’t grade this trade right now.</div>';return}H.innerHTML=ye(s,e,r,S(_).filter(a=>h.has(String(a.player_id||a.id))),S(g).filter(a=>f.has(String(a.player_id||a.id))))}function ye(e,r,s,c=[],t=[]){var J,X,Z,ee;const a=e.winner==="Even"?"Fair trade":`${e.winner} wins the trade`,i=e.market_a!=null?Number(e.market_a).toLocaleString("en-US"):null,d=e.market_b!=null?Number(e.market_b).toLocaleString("en-US"):null,$=o=>({player_id:o.player_id||o.id,sleeper_id:o.sleeper_id||null,player_name:o.player_name||o.full_name,position:o.position,team:o.team,weekly:Number(o.model_points??o.projected_points??o.weekly??0),market:o.auction??o.marketAuction??null}),y=(X=(J=e.packages)==null?void 0:J.a)!=null&&X.length?e.packages.a:c.map($),n=(ee=(Z=e.packages)==null?void 0:Z.b)!=null&&ee.length?e.packages.b:t.map($),u=o=>o.reduce((w,N)=>w+Number(N.weekly??0),0),b=u(y).toFixed(1),j=u(n).toFixed(1),T=Number(e.value_difference??0),p=i!=null&&d!=null?Number(e.market_b)-Number(e.market_a):null,x=p!=null&&Number(e.market_a)+Number(e.market_b)>0?Math.abs(p)/(Number(e.market_a)+Number(e.market_b)):0,R=p!=null&&Math.abs(T)>=20&&x>=.1&&T>0!=p>0,A=o=>`
      <div class="mini-row">
        ${P(o,28)}
        <div style="flex:1; min-width:0">
          <div class="mini-name">${l(o.player_name||"")}</div>
          <div class="micro faint">${q(o.position)} ${re(o.team,12)}</div>
        </div>
        <div style="text-align:right">
          <div class="mono" style="font-weight:700; font-size:13px">${Number(o.weekly??0).toFixed(1)}<span class="micro faint">/wk</span></div>
          ${o.market!=null?`<div class="micro faint">mkt ${Number(o.market).toLocaleString("en-US")}</div>`:""}
        </div>
      </div>`,k=e.slots,Q=(o,w,N,E)=>{if(!w)return"";const fe=E&&E.length?` — adds ${E.map($e=>l(String($e))).join(", ")}`:"";return`<div class="micro" style="margin-top:4px">+${w} bench spot${w>1?"s":""} for ${l(o)}${fe} <span class="faint">(+${Number(N).toFixed(0)} ROS)</span></div>`},V=(o,w)=>`
      <div>
        <div class="kicker" style="margin-bottom:4px">What ${l(o)} wins</div>
        <ul style="font-size:12.5px; line-height:1.5; padding-left:16px; margin:0">
          ${(w||[]).map(N=>`<li style="margin-bottom:3px">${l(N)}</li>`).join("")}
        </ul>
      </div>`,he=e.analysis&&((e.analysis.a||[]).length||(e.analysis.b||[]).length)?`<div class="signal-cols" style="margin-bottom:10px">
          ${V(r,e.analysis.a)}${V(s,e.analysis.b)}
        </div>`:"";return`<div class="card"><div class="card-body">
      <div class="kicker">Trade verdict</div>
      <h2 class="verdict-headline">${l(a)}</h2>
      <div class="micro faint" style="margin-bottom:8px">${l(r)} gives ${b}/wk · gets ${j}/wk${i&&d?` · market ${i} vs ${d}`:""}</div>
      ${he}
      ${R?`<div class="alert alert-warn" style="font-size:12px; margin-bottom:8px">Model and market disagree here — the model likes the ${T>0?"incoming":"outgoing"} side, real leagues pay more for the other. Trust the market on stars, the model on depth.</div>`:""}
      <div class="signal-cols">
        <div><div class="kicker" style="margin-bottom:4px">${l(r)} gives</div>${y.map(A).join("")||'<div class="empty">—</div>'}</div>
        <div><div class="kicker" style="margin-bottom:4px">${l(s)} gives</div>${n.map(A).join("")||'<div class="empty">—</div>'}</div>
      </div>
      ${k?Q(r,k.gained_a,k.credit_a_ros,k.fill_a)+Q(s,k.gained_b,k.credit_b_ros,k.fill_b):""}
    </div></div>`}B.addEventListener("change",()=>{h.clear(),C("A")}),L.addEventListener("change",()=>{f.clear(),C("B")}),await Promise.all([C("A"),C("B")])}function S(m){return m?[...m.starters||[],...Array.isArray(m.bench)?m.bench:[],...Array.isArray(m.reserve)?m.reserve:[]]:[]}export{je as renderTrade};
