import{k as ye,h as m,r as he,p as Z,i as ee,j as Be,t as fe,J as Ae,N as Me}from"./index-Bzl7saDG.js";const Le=(r,y,g)=>Math.min(g,Math.max(y,r));function $e(...r){const y=r.flat().map(Number).filter(Number.isFinite);return Math.max(1,...y)}function W(r,y,g,$,h){if(!r||!y||!r.length||r.length!==y.length)return"";const c=r.length,o=R=>c===1?50:R/(c-1)*100,q=R=>29-Le(Number(R)||0,0,g)/g*27,L=R=>R.map((H,F)=>`${o(F).toFixed(2)},${q(H).toFixed(2)}`).join(" "),U=Number(h||15),B=($||[]).findIndex(R=>Number(R)>=U);return`<svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">${B>0&&B<c?`<rect x="${o(B).toFixed(2)}" y="0" width="${(100-o(B)).toFixed(2)}" height="30" class="po-shade"></rect>`:""}<polyline class="ln-before" vector-effect="non-scaling-stroke" points="${L(r)}"></polyline><polyline class="ln-after" vector-effect="non-scaling-stroke" points="${L(y)}"></polyline></svg>`}function G(r){if(!r)return"";const y=["QB","RB","WR","TE","DEF","K"],g=c=>{const o=y.indexOf(c);return o<0?99:o},$=Object.entries(r).map(([c,o])=>[c,Number(o)||0]).filter(([,c])=>Math.abs(c)>=.05).sort((c,o)=>g(c[0])-g(o[0]));if(!$.length)return"";const h=Math.max(...$.map(([,c])=>Math.abs(c)),1);return`<div class="gd-block">${$.map(([c,o])=>`
    <div class="gd-row"><span class="gd-lab">${c}</span>
      <div class="gd-track"><div class="gd-fill ${o>=0?"pos":"neg"}" style="width:${(Math.abs(o)/h*50).toFixed(1)}%"></div></div>
      <span class="gd-val ${o>=0?"pos":"neg"}">${o>0?"+":""}${o.toFixed(1)}</span>
    </div>`).join("")}</div>`}if(typeof process<"u"&&process.argv[1]&&import.meta.url===new URL(`file://${process.argv[1]}`).href){const r=(c,o)=>{if(!c)throw new Error(`tradeViz: ${o}`)},y=$e([100,110,120],[110,120,130]);r(y===130,"sharedMax takes the top of every series");const g=W([100,110,120],[110,120,130],y,[4,5,6],15);r(g.includes("ln-before")&&g.includes("ln-after"),"both lines render"),r(!g.includes("po-shade"),"no playoff shade outside the playoff window");const $=W([100,110,120],[100,110,120],130,[14,15,16],15);r($.includes("po-shade"),"shade starts at the first playoff week"),r(W([1],[2,3],10,[],15)==="","length mismatch hides the chart"),r(W([],[],10,[],15)==="","empty input hides the chart");const h=G({RB:15.3,WR:-7.8,QB:0});r(h.includes("gd-fill pos")&&h.includes("gd-fill neg"),"bars go both ways"),r(!h.includes(">QB<"),"zero deltas drop out"),r(G({})===""&&G(null)==="","empty deltas render nothing"),console.log("tradeViz self-check ok")}async function Ee(r){const y=new URLSearchParams(location.hash.split("?")[1]||"");let g=y.get("team_a")||"1",$=y.get("team_b")||"2";r.innerHTML=`
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
  `;const h=r.querySelector("#selectTeamA"),c=r.querySelector("#selectTeamB"),o=r.querySelector("#tradeSummaryBanner"),q=r.querySelector("#teamARoster"),L=r.querySelector("#teamBRoster"),U=r.querySelector("#teamAHeader"),B=r.querySelector("#teamBHeader"),te=r.querySelector("#teamASub"),R=r.querySelector("#teamBSub"),H=r.querySelector("#tradeDepth"),F=new Map;let x=null,b=null;const k=new Set,j=new Set,D=new Set;let se=null;const f=e=>{const a=Number(e);return Number.isFinite(a)?a:0};function re(e){return e.proj_pass_yd!=null||e.proj_rush_yd!=null||e.proj_rec_yd!=null||e.proj_rec!=null?{proj_pass_yd:f(e.proj_pass_yd),proj_pass_td:f(e.proj_pass_td),proj_rush_yd:f(e.proj_rush_yd),proj_rush_td:f(e.proj_rush_td),proj_rec:f(e.proj_rec),proj_rec_yd:f(e.proj_rec_yd),proj_rec_td:f(e.proj_rec_td)}:{proj_pass_yd:f(e.pass_yds)/17,proj_pass_td:f(e.pass_tds)/17,proj_rush_yd:f(e.rush_yds)/17,proj_rush_td:f(e.rush_tds)/17,proj_rec:f(e.receptions)/17,proj_rec_yd:f(e.rec_yds)/17,proj_rec_td:f(e.rec_tds)/17}}function xe(e){const a=(e.position||"").toUpperCase(),s=re(e),u=n=>(Math.round(n*10)/10).toFixed(1),t=n=>(Math.round(n*100)/100).toFixed(2);return a==="QB"?`${u(s.proj_pass_yd)} PaYd · ${t(s.proj_pass_td)} PaTD · ${u(s.proj_rush_yd)} RuYd avg`:a==="RB"?`${u(s.proj_rush_yd)} RuYd · ${t(s.proj_rush_td)} RuTD · ${u(s.proj_rec)} Rec avg`:a==="WR"||a==="TE"?`${u(s.proj_rec)} Rec · ${u(s.proj_rec_yd)} RecYd avg`:""}function be(e){const a=(e.position||"").toUpperCase(),s=re(e),u=Ae(a,{proj_pass_yd:s.proj_pass_yd||null,proj_pass_td:s.proj_pass_td||null,proj_rush_yd:s.proj_rush_yd||null,proj_rush_td:s.proj_rush_td||null,proj_rec:s.proj_rec||null,proj_rec_yd:s.proj_rec_yd||null,proj_rec_td:s.proj_rec_td||null,proj_fgm:null,proj_xpm:null}),t=Number(e.model_points??e.projected_points??e.weekly??0),n=Number(e.projection_lower??e.lower??Math.max(0,t-5)),i=Number(e.projection_upper??e.upper??t+5),p=Number(e.width??(i-n)/2),S=e.opponent_team?`vs ${m(String(e.opponent_team))}`:"no game",w=e.injury_status?` · ${m(String(e.injury_status))}`:"",l=e.remaining_games==null?"sched unknown":`${m(String(e.remaining_games))} games left`;return`${u}<div class="micro mono faint" style="margin-top:8px; text-align:center">Range ${n.toFixed(1)} – ${i.toFixed(1)} (width ${p.toFixed(1)}) · ${S}${w} · ${l}</div>`}try{const e=await ye(),a=(e==null?void 0:e.allTeams)||(e==null?void 0:e.leagueRosters)||[];a.length>0&&(h.innerHTML=a.map(s=>`<option value="${s.roster_id||s.owner_id}" ${String(s.roster_id||s.owner_id)===String(g)?"selected":""}>${m(s.team_name||s.display_name||`Team ${s.roster_id}`)} (${m(s.owner_name||s.display_name||"")})</option>`).join(""),c.innerHTML=a.map(s=>`<option value="${s.roster_id||s.owner_id}" ${String(s.roster_id||s.owner_id)===String($)?"selected":""}>${m(s.team_name||s.display_name||`Team ${s.roster_id}`)} (${m(s.owner_name||s.display_name||"")})</option>`).join(""))}catch(e){console.error("Failed to load team list:",e)}async function we(e){const a=String(e);if(F.has(a))return F.get(a);const s=await ye({roster_id:a});return F.set(a,s),s}async function K(e){var S,w;const a=e==="A",s=a?h.value:c.value,u=a?q:L,t=a?U:B,n=a?k:j;if(!s)return;F.has(String(s))||(u.innerHTML='<div class="empty">Loading team roster…</div>');const i=await we(s);a?x=i:b=i;const p=((S=i==null?void 0:i.teamMeta)==null?void 0:S.team_name)||((w=i==null?void 0:i.teamMeta)==null?void 0:w.owner_name)||`Team ${s}`;t.textContent=`${p} (${a?"Sending":"Receiving"})`,ke(u,P(i),e,n),ae(),de(),oe()}function ae(){te.textContent=`${k.size} player${k.size===1?"":"s"} selected`,R.textContent=`${j.size} player${j.size===1?"":"s"} selected`}function ke(e,a,s,u){if(!a||a.length===0){e.innerHTML='<div class="empty">No roster players found</div>';return}e.innerHTML=`
      <div style="display:flex; flex-direction:column">
        ${a.map(t=>{const n=String(t.player_id||t.id),i=u.has(n),p=Number(t.model_points??t.projected_points??t.weekly??0).toFixed(1),S=Number(t.model_season_points??t.ros??p*17).toFixed(0),w=t.auction_price_paid??t.auction??t.marketAuction??0,l=xe(t),_=`${s}:${n}`,T=D.has(_);return`
            <label class="row align-between" style="padding:10px 14px; cursor:pointer; background:${i?"var(--surface-raised)":"transparent"}; border-bottom:1px solid var(--border); transition:background 0.15s; border-top:1px solid ${he((t.team||"").toUpperCase())}">
              <div class="row align-center" style="gap:10px">
                <input type="checkbox" class="trade-check" data-side="${s}" data-pid="${n}" ${i?"checked":""} title="Select ${m(t.player_name||t.full_name||n)} for trade" style="width:16px; height:16px; cursor:pointer" />
                <span style="width:8px; height:8px; border-radius:50%; background:${he((t.team||"").toUpperCase())}; flex-shrink:0" aria-hidden="true"></span>
                ${Z(t,28)}
                <div>
                  <div class="row align-center" style="gap:6px">
                    <strong style="font-size:13px">${m(t.player_name||t.full_name||n)}</strong>
                    ${ee(t.position)}
                    ${t.injury_status?Be(t.injury_status):""}
                  </div>
                  <div class="micro faint" style="margin-top:2px; display:flex; align-items:center; gap:4px">
                    <span class="slot-tag" style="font-size:10px; font-weight:700; letter-spacing:0.3px; padding:1px 5px; border-radius:4px; background:${t.slot&&t.slot!=="BENCH"&&t.slot!=="IR"?"rgba(56,189,248,0.12); color:var(--sky); border:1px solid rgba(56,189,248,0.25)":t.slot==="IR"?"rgba(244,63,94,0.12); color:var(--crimson); border:1px solid rgba(244,63,94,0.25)":"rgba(148,163,184,0.12); color:var(--text-muted); border:1px solid rgba(148,163,184,0.2)"}">${m(t.slot||(t.position&&!t.team?"IR":"BENCH"))}</span>
                    <span>Draft Cost: $${w}</span> · ${fe(t.team,14)} <span>${t.team||"FA"} ${t.opponent_team?`vs ${t.opponent_team}`:""}</span>
                  </div>
                  ${l?`<div class="micro mono faint" style="margin-top:2px">${m(l)}</div>`:""}
                </div>
              </div>
              <div style="text-align:right">
                <div class="mono" style="font-weight:700; font-size:13px; color:var(--accent)">${p} <span class="micro faint">pts/wk</span></div>
                <div class="micro faint mono">${S} pts ROS</div>
                <button class="trade-expand" data-side="${s}" data-pid="${m(n)}" title="Show projected stats" style="margin-top:4px; font-size:11px; background:transparent; color:var(--text-muted); border:1px solid var(--border); border-radius:6px; padding:1px 8px; cursor:pointer">${T?"▾ stats":"▸ stats"}</button>
              </div>
            </label>
            <div class="trade-detail" data-side="${s}" data-pid="${m(n)}" style="display:${T?"block":"none"}; padding:10px 14px; border-bottom:1px solid var(--border); background:var(--surface-raised)">
              ${be(t)}
            </div>
          `}).join("")}
      </div>
    `,e.querySelectorAll(".trade-check").forEach(t=>{t.addEventListener("change",n=>{const i=n.target.dataset.pid,p=n.target.dataset.side==="A"?k:j;n.target.checked?p.add(i):p.delete(i),ae(),de(),oe()})}),e.querySelectorAll(".trade-expand").forEach(t=>{t.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation();const i=`${t.dataset.side}:${t.dataset.pid}`,p=e.querySelector(`.trade-detail[data-side="${t.dataset.side}"][data-pid="${t.dataset.pid}"]`);D.has(i)?(D.delete(i),t.innerHTML="▸ stats",p&&(p.style.display="none")):(D.add(i),t.innerHTML="▾ stats",p&&(p.style.display="block"))})})}const ne=["QB","RB","WR","TE","FLEX","K","DEF"];function ie(e,a,s,u){if(!e)return"";const t=l=>{const _=Number(l.model_points??l.projected_points??l.weekly??0);return Number.isFinite(_)?_:0},n=a||new Set,i=new Set((s||[]).map(l=>String(l.player_id||l.id))),p={};for(const l of P(e)){const _=(l.position||"UNK").toUpperCase();(p[_]=p[_]||[]).push(l)}for(const l of s||[]){const _=(l.position||"UNK").toUpperCase();(p[_]=p[_]||[]).push({...l,_incoming:!0})}const w=Object.keys(p).sort((l,_)=>{const T=ne.indexOf(l),E=ne.indexOf(_);return(T<0?99:T)-(E<0?99:E)}).map(l=>{const _=p[l].slice().sort((v,N)=>t(N)-t(v)),T=_.filter(v=>!v._incoming&&!n.has(String(v.player_id||v.id))),E=T.reduce((v,N)=>v+t(N),0),O=_.map(v=>{const N=String(v.player_id||v.id),I=v._incoming||i.has(N),Q=!I&&n.has(N);return`<div class="depth-card depth-${I?"in":Q?"out":"kept"}">
          ${Z(v,34)}
          <div style="flex:1; min-width:0">
            <div class="depth-name">${m(v.player_name||N)}</div>
            <div class="micro faint">${ee(l)} · <span class="mono">${t(v).toFixed(1)}</span></div>
          </div>
          <span class="depth-tag">${I?"IN":Q?"OUT":""}</span>
        </div>`}).join("");return`<div class="depth-group">
        <div class="depth-group-head"><strong>${m(l)}</strong><span class="faint"> · ${T.length} kept · ${E.toFixed(1)}/wk</span></div>
        <div class="depth-cards">${O}</div>
      </div>`}).join("");return`<div><div class="depth-team">${m(u)} <span class="faint">post-trade</span></div>${w}</div>`}function oe(){var t,n;if(!H)return;if(!x&&!b){H.innerHTML="";return}const e=P(x).filter(i=>k.has(String(i.player_id||i.id))),a=P(b).filter(i=>j.has(String(i.player_id||i.id)));if(!e.length&&!a.length){H.innerHTML="";return}const s=((t=x==null?void 0:x.teamMeta)==null?void 0:t.team_name)||"Team A",u=((n=b==null?void 0:b.teamMeta)==null?void 0:n.team_name)||"Team B";H.innerHTML='<div class="card"><div class="card-body"><div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px">Post-trade depth by position</div><div class="grid grid-2" style="font-size:12px">'+ie(x,k,a,s)+ie(b,j,e,u)+"</div></div></div>"}function de(){clearTimeout(se),se=setTimeout(je,400)}async function je(){var u,t;const e=((u=x==null?void 0:x.teamMeta)==null?void 0:u.team_name)||"Team A",a=((t=b==null?void 0:b.teamMeta)==null?void 0:t.team_name)||"Team B";if(!k.size&&!j.size){o.innerHTML='<div class="alert alert-info" style="font-size:13px">Tick players on both sides to grade the trade.</div>';return}o.innerHTML='<div class="card"><div class="card-body"><div class="empty" style="padding:8px">Grading trade…</div></div></div>';let s=null;try{s=await Me(h.value,c.value,{tradedA:[...k],tradedB:[...j]})}catch{}if(!s||s.cold){o.innerHTML='<div class="alert alert-warn" style="font-size:13px">Couldn’t grade this trade right now.</div>';return}o.innerHTML=Se(s,e,a,P(x).filter(n=>k.has(String(n.player_id||n.id))),P(b).filter(n=>j.has(String(n.player_id||n.id))))}function Se(e,a,s,u=[],t=[]){var pe,me,ue,ge,ve,_e;const n=e.winner==="Even"?"Fair trade":`${e.winner} wins the trade`,i=e.market_a!=null?Number(e.market_a).toLocaleString("en-US"):null,p=e.market_b!=null?Number(e.market_b).toLocaleString("en-US"):null,S=d=>({player_id:d.player_id||d.id,sleeper_id:d.sleeper_id||null,player_name:d.player_name||d.full_name,position:d.position,team:d.team,weekly:Number(d.model_points??d.projected_points??d.weekly??0),market:d.auction??d.marketAuction??null}),w=(me=(pe=e.packages)==null?void 0:pe.a)!=null&&me.length?e.packages.a:u.map(S),l=(ge=(ue=e.packages)==null?void 0:ue.b)!=null&&ge.length?e.packages.b:t.map(S),_=d=>d.reduce((M,z)=>M+Number(z.weekly??0),0),T=_(w).toFixed(1),E=_(l).toFixed(1),O=Number(e.value_difference??0),v=i!=null&&p!=null?Number(e.market_b)-Number(e.market_a):null,N=v!=null&&Number(e.market_a)+Number(e.market_b)>0?Math.abs(v)/(Number(e.market_a)+Number(e.market_b)):0,I=v!=null&&Math.abs(O)>=20&&N>=.1&&O>0!=v>0,Q=d=>`
      <div class="pcard">
        ${Z(d,36)}
        <div class="pcard-main">
          <div class="pcard-name">${m(d.player_name||"")}</div>
          <div class="micro faint">${ee(d.position)} ${fe(d.team,12)}</div>
        </div>
        <div style="text-align:right">
          <div class="pcard-pts">${Number(d.weekly??0).toFixed(1)}<span class="micro faint">/wk</span></div>
          ${d.market!=null?`<div class="micro faint">mkt ${Number(d.market).toLocaleString("en-US")}</div>`:""}
        </div>
      </div>`,A=e.slots,le=(d,M,z,C)=>{if(!M)return"";const X=C&&C.length?` — adds ${C.map(Ne=>m(String(Ne))).join(", ")}`:"";return`<div class="micro" style="margin-top:4px">+${M} bench spot${M>1?"s":""} for ${m(d)}${X} <span class="faint">(+${Number(z).toFixed(0)} ROS)</span></div>`},V=e.team_a||null,Y=e.team_b||null,J=e.calendar||{},Te=Array.isArray(J.weeks_left)?J.weeks_left:[],Re=$e(V?(V.lineup_before||[]).concat(V.lineup_after||[]):[],Y?(Y.lineup_before||[]).concat(Y.lineup_after||[]):[]),ce=(d,M,z,C)=>`
      <div>
        <div class="kicker" style="margin-bottom:6px">${m(d)} gives</div>
        <div class="pcards">${M.map(Q).join("")||'<div class="empty">—</div>'}</div>
        ${z?He(z,Re,Te,J):""}
        ${(C||[]).length?`
          <div class="kicker" style="margin:10px 0 4px">What ${m(d)} wins</div>
          <ul class="win-list">${C.map(X=>`<li>${m(X)}</li>`).join("")}</ul>`:""}
      </div>`;return`<div class="card"><div class="card-body">
      <div class="kicker">Trade verdict</div>
      <h2 class="verdict-headline">${m(n)}</h2>
      <div class="micro faint" style="margin-bottom:8px">${m(a)} gives ${T}/wk · gets ${E}/wk${i&&p?` · market ${i} vs ${p}`:""}</div>
      ${I?`<div class="alert alert-warn" style="font-size:12px; margin-bottom:8px">Model and market disagree here — the model likes the ${O>0?"incoming":"outgoing"} side, real leagues pay more for the other. Trust the market on stars, the model on depth.</div>`:""}
      <div class="signal-cols" style="margin-top:10px">
        ${ce(a,w,V,(ve=e.analysis)==null?void 0:ve.a)}
        ${ce(s,l,Y,(_e=e.analysis)==null?void 0:_e.b)}
      </div>
      ${A?le(a,A.gained_a,A.credit_a_ros,A.fill_a)+le(s,A.gained_b,A.credit_b_ros,A.fill_b):""}
    </div></div>`}h.addEventListener("change",()=>{k.clear(),K("A")}),c.addEventListener("change",()=>{j.clear(),K("B")}),await Promise.all([K("A"),K("B")])}function He(r,y,g,$){const h=W(r.lineup_before||[],r.lineup_after||[],y,g,$.playoff_week_start);if(!h)return"";const c=r.gains||{},o=Number(c.raw_per_week??c.gain_per_week??0)||0,q=o>.05?"pos":o<-.05?"neg":"",L=g.findIndex(B=>Number(B)>=Number($.playoff_week_start||15)),U=g.length?`weeks ${g[0]}–${g[g.length-1]}`:"";return`
    <div class="row align-between" style="margin:10px 0 4px">
      <div class="kicker">Weekly impact</div>
      <span class="delta-badge ${q}">${o>0?"+":""}${o.toFixed(1)}/wk</span>
    </div>
    <div class="impact">${h}</div>
    <div class="impact-legend micro faint">
      <span><i class="lg lg-before"></i>before&nbsp;<i class="lg lg-after"></i>after</span>
      <span>${U}${L>0?" · shaded = playoffs":""}</span>
    </div>
    ${G(r.group_delta)}`}function P(r){return r?[...r.starters||[],...Array.isArray(r.bench)?r.bench:[],...Array.isArray(r.reserve)?r.reserve:[]]:[]}export{Ee as renderTrade};
