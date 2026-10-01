import{k as Pe,z as Ce,e as Be,h as M,r as Ae,A as Re,t as Z,p as Fe,i as ze,v as Te,B as qe,C as De,j as He,o as Ue,D as We,E as Ye}from"./index-5kxj__DE.js";import{p as Ie}from"./playerCard-CQY7KTuf.js";import{i as W}from"./intervals-BMgcr8bT.js";import{b as Ve,r as ve,a as ye}from"./relevance-C3SYLMeE.js";let k=[],b=new Map,u="",l=1,i=!0,_="ALL",J=new Set,f=!1,w=null;const X=50;function fe(o,s){const[d,g]=W(s,o);return(g-d)/2}function ge(o){return o==="BUY"?'<span class="badge" style="background:var(--emerald-dim); color:var(--emerald); border:1px solid rgba(16,185,129,0.22)">▲ BUY</span>':o==="SELL"?'<span class="badge" style="background:var(--crimson-dim); color:var(--crimson); border:1px solid rgba(239,68,68,0.22)">▼ SELL</span>':'<span class="badge" style="background:rgba(var(--text-rgb,0,0,0),0.05); color:var(--text-faint); border:1px solid var(--border)">—</span>'}function Ke(o){if(o==null)return'<span class="mono" style="color:var(--text-faint)">—</span>';const s=Number(o),d=s>.5?"var(--emerald)":s<-.5?"var(--crimson)":"var(--text-muted)",g=s>.5?"↑":s<-.5?"↓":"·",S=s>0?"+":"";return`<span class="mono" style="color:${d}; font-weight:700">${g} ${S}${s.toFixed(1)}</span>`}function Ge(o){if(o==null)return'<span class="mono" style="color:var(--text-faint)">—</span>';const s=Number(o),d=s>=12?"var(--emerald)":s<=-12?"var(--crimson)":"var(--text-muted)",g=s>0?"↑":s<0?"↓":"·",S=s>0?"+":"";return`<span class="mono" style="color:${d}; font-weight:700">${g} ${S}${s}</span>`}function Oe(o,s,d){if(s==null)return`<span class="mono" style="color:var(--text-faint); font-size:11px">${o!=null&&o.toFixed?o.toFixed(1):o} <span style="color:var(--text-faint)">· market —</span></span>`;const g=Math.max(Math.abs(o),Math.abs(s),10),S=Math.round(Math.abs(o)/g*100),D=Math.round(Math.abs(s)/g*100),T=d>0?"var(--emerald)":d<0?"var(--crimson)":"var(--text-faint)";return`<div style="display:flex; align-items:center; gap:6px; min-width:160px"><span class="mono" style="font-size:11px; min-width:44px; text-align:right">${o.toFixed(1)}</span><div style="flex:1; height:4px; background:rgba(var(--text-rgb,0,0,0),0.06); border-radius:999px; position:relative; overflow:hidden"><div style="position:absolute; left:0; top:0; bottom:0; width:${S}%; background:var(--amber); opacity:0.9; border-radius:999px"></div><div style="position:absolute; left:0; top:0; bottom:0; width:${D}%; background:var(--sky); opacity:0.35; border-radius:999px"></div></div><span class="mono" style="font-size:11px; color:var(--text-muted); min-width:36px">${s.toFixed(1)}</span><span class="mono" style="font-size:11px; color:${T}; font-weight:700; min-width:36px; text-align:right">${d>0?"+":""}${d.toFixed(1)}</span></div>`}async function ee(o){var se,le;const s=new URLSearchParams(location.hash.split("?")[1]||""),d=s.get("week");d!=null&&d!==""&&Number.isFinite(Number(d))&&(w=Number(d)),u=s.get("q")||((se=document.getElementById("globalSearch"))==null?void 0:se.value)||"",l=1;const g=Number(s.get("limit")||800),S=Number.isFinite(g)?Math.max(10,Math.min(2e3,Math.floor(g))):800,D=e=>String(e||"").toLowerCase().replace(/\b(jr\.?|sr\.?|ii|iii|iv|v)\b/g,"").replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();let T=new Map;J=new Set;try{const e=await Pe({}),a=[].concat(e.starters||[],e.bench||[],e.reserve||[]).map(r=>({player_id:r.player_id,team_name:r.team_name||""}));for(const r of a)if(r.player_id&&(J.add(String(r.player_id)),r.player_name)){const n=`${D(r.player_name)}|${(r.position||"").toUpperCase()}`;T.set(n,String(r.player_id))}}catch{}const Y=f?await We({limit:S}):await Ce({week:w,limit:S});k=f?(Y.players||[]).map(e=>{const a=Math.max(1,Number(e.remaining_games)||1),r=fe(e.position,Number(e.per_game_neutral)||0),n=Number((r*Math.sqrt(a)).toFixed(2));return{...e,projected_points:e.ros_points,point_estimate:e.ros_points,player_name:e.player_name||e.player_display_name,position_group:e.position,width:n,projection_lower:Math.max(0,Number((e.ros_points-n).toFixed(2))),projection_upper:Number((e.ros_points+n).toFixed(2))}}):Y.players||[];const C=Y.meta||{};!f&&w==null&&C.week!=null&&(w=C.week);let B={players:[],count:0,meta:{},fetched_at:null};try{B=await Be({limit:2e3})}catch{B={players:[],count:0,meta:{},fetched_at:null}}b=new Map((B.players||[]).map(e=>[String(e.player_id),e]));for(const e of k){const a=`${D(e.player_name||"")}|${(e.position||"").toUpperCase()}`;!e.sleeper_id&&T.has(a)&&(e.sleeper_id=T.get(a))}const te=new Set(k.map(e=>String(e.player_id)));for(const e of B.players||[]){const a=String(e.player_id||"");a&&!te.has(a)&&(te.add(a),k.push({player_id:a,sleeper_id:e.sleeper_id||(/^\d+$/.test(a)?a:null),espn_id:e.espn_id||null,player_name:e.player_name||e.full_name||a,position:(e.position||"UNK").toUpperCase(),team:(e.team||"").toUpperCase(),projected_points:e.model_points??e.projected_points??0,point_estimate:e.model_points??e.projected_points??0,projection_lower:e.projection_lower??W(e.model_points??0,e.position)[0],projection_upper:e.projection_upper??W(e.model_points??0,e.position)[1],width:e.width??fe(e.position,e.model_points??0),injury_status:e.injury_status||null,market_points:e.market_points,delta_points:e.delta_points,model_overall_rank:e.model_overall_rank,model_pos_rank:e.model_pos_rank,fp_ecr:e.fp_ecr,fp_ecr_pos:e.fp_ecr_pos,fp_adp:e.fp_adp,fp_tier:e.fp_tier,delta_rank:e.delta_rank,delta_pos_rank:e.delta_pos_rank,edge:e.edge||"NEUTRAL",edge_score:e.edge_score||0,stat_deltas:e.stat_deltas||[]}))}const m=b.size>0;for(const e of k){e.player_id&&/^\d+$/.test(String(e.player_id))&&(e.sleeper_id=e.player_id);const a=b.get(String(e.player_id));if(a?(a.sleeper_id&&(e.sleeper_id=a.sleeper_id),a.espn_id&&(e.espn_id=a.espn_id),e.market_points=a.market_points,e.delta_points=a.delta_points,e.model_overall_rank=a.model_overall_rank,e.model_pos_rank=a.model_pos_rank,e.fp_ecr=a.fp_ecr,e.fp_ecr_pos=a.fp_ecr_pos,e.fp_adp=a.fp_adp,e.fp_tier=a.fp_tier,e.delta_rank=a.delta_rank,e.delta_pos_rank=a.delta_pos_rank,e.edge=a.edge,e.edge_score=a.edge_score,e.stat_deltas=a.stat_deltas,e.market_season_stats=a.market_season_stats||null,e.auction=a.auction,e.modelAuction=a.auction,e.marketAuction=a.marketAuction,e.vor=a.vor):(e.market_points=null,e.delta_points=null,e.edge="NEUTRAL",e.stat_deltas=[]),f){e.weekly=Number(e.per_game_neutral)||0,e.lower=e.projection_lower,e.upper=e.projection_upper;const r=a&&a.market_season_points!=null&&Number(a.market_season_points)>0?Number(a.market_season_points):null;e.market_points=r,e.delta_points=r!=null?Number((e.projected_points-r).toFixed(2)):null}else{const r=a&&a.model_points!=null&&Number(a.model_points)>0?Number(a.model_points):null,n=e.projected_points!=null&&Number(e.projected_points)>0?Number(e.projected_points):null,L=a&&a.market_season_points!=null&&Number(a.market_season_points)>0?Number(a.market_season_points)/17:null,E=r??n??L??0;e.projected_points=Number(E.toFixed(2)),e.point_estimate=Number(E.toFixed(2)),e.weekly=Number(E.toFixed(2));const[F,z]=W(E,e.position);e.projection_lower=Number(F.toFixed(2)),e.projection_upper=Number(z.toFixed(2)),e.width=Number(((z-F)/2).toFixed(2)),e.lower=e.projection_lower,e.upper=e.projection_upper}e.ecr=e.fp_ecr,e.adp=e.fp_adp,e.tier=e.fp_tier}const y=document.getElementById("globalSearch");y&&!y.dataset.bound&&(y.dataset.bound="1",y.addEventListener("input",be(()=>{u=y.value,l=1,x(),O()},150)),y.addEventListener("keydown",e=>{e.key==="/"&&document.activeElement!==y&&(e.preventDefault(),y.focus())})),y&&(y.value=u);const I=[...b.values()].filter(e=>e.edge==="BUY").length,V=[...b.values()].filter(e=>e.edge==="SELL").length,K=[...b.values()].filter(e=>e.market_points!=null).length,$=K>0||[...b.values()].some(e=>e.fp_ecr!=null||e.fp_adp!=null);$||(i=!1),o.innerHTML=`
    <div class="hero reveal in">
      <h1>Projections</h1>
      <p>Weekly projections. Bars show floor–ceiling: 1-in-5 bad week to 1-in-5 good week (P20–P80, fit on 2024-25 results).</p>
      <p class="micro faint" style="margin-top:4px">Each week's projections are calculated after the previous week's games complete, from season-to-date stats blended with last season — early weeks lean on last season, later weeks on current form. Data refreshes daily.</p>
    </div>
    ${!f&&C.stale?`<div class="alert alert-warn reveal in" role="status" style="margin-top:12px">${M(C.note||`No precomputed projections for week ${w??C.week} — showing nearest available data.`)}</div>`:""}

    ${m?`
    <div class="kpi-row reveal in" style="margin-top:4px">
      <div class="kpi-card" style="border-top:1px solid var(--emerald)">
        <div class="kpi-label" style="color:var(--emerald)">BUY edges${$?": market sleeping":""}</div>
        <div class="kpi-value" style="color:var(--emerald)">${I}</div>
        <div class="kpi-bar"><div class="kpi-bar-fill good" style="width:${Math.min(100,Math.round(I/Math.max(1,Math.min(40,b.size/6))*100))}%"></div></div>
        <div class="mono" style="font-size:11px; color:var(--text-muted); margin-top:6px">${$?"Model rank ≥12 better than FP ECR or +3.0 pts vs Sleeper market":"Model $/VOR ≥15% below pool average"}</div>
      </div>
      <div class="kpi-card" style="border-top:1px solid var(--crimson)">
        <div class="kpi-label" style="color:var(--crimson)">SELL flags${$?": market overvalued":""}</div>
        <div class="kpi-value" style="color:var(--crimson)">${V}</div>
        <div class="kpi-bar"><div class="kpi-bar-fill bad" style="width:${Math.min(100,Math.round(V/Math.max(1,Math.min(40,b.size/6))*100))}%"></div></div>
        <div class="mono" style="font-size:11px; color:var(--text-muted); margin-top:6px">${$?"Market rank ≥12 higher or −3.0 pts vs model":"Model $/VOR ≥15% above pool average"}</div>
      </div>
      ${$?`
      <div class="kpi-card" style="border-top:1px solid var(--sky)">
        <div class="kpi-label" style="color:var(--sky)">Market coverage: Sleeper + FantasyPros</div>
        <div class="kpi-value" style="color:var(--sky)">${K} / ${b.size}</div>
        <div class="kpi-bar"><div class="kpi-bar-fill" style="background:var(--sky); width:${Math.round(K/Math.max(1,b.size)*100)}%"></div></div>
        <div class="mono" style="font-size:11px; color:var(--text-muted); margin-top:6px">Sleeper pts+stats keyed by gsis_id · FP ECR/ADP via name+team+pos</div>
      </div>
      `:""}
      <div class="kpi-card" style="border-top:1px solid var(--amber)">
        <div class="kpi-label" style="color:var(--amber)">Comparison source</div>
        <div class="kpi-value" style="font-size:14px; line-height:1.3">${$?"Model vs Market":"Model values"}<br><span style="font:600 11px "Helvetica Neue", Helvetica,sans-serif; color:var(--text-muted); letter-spacing:0.04em; text-transform:uppercase">${B.fetched_at?new Date(B.fetched_at).toLocaleString():"DB snapshot"} · ${b.size} ranked</span></div>
        <div class="mono" style="font-size:11px; color:var(--text-muted); margin-top:6px">${$?"Free, local: Sleeper projections + FP free ECR/ADP":"VBD auction values from league scoring"}</div>
      </div>
    </div>
    <div class="card reveal in" style="margin-top:8px; border-top:1px solid var(--amber)">
      <div class="card-body" style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between">
        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center">
          ${$?`<span class="kicker">Compare vs Market</span>
          <button class="chip ${i?"active":""}" id="toggleCompare" title="Toggle market comparison">${i?"Market + ECR on":"Show Market & ECR"}</button>`:'<span class="kicker">Value edges</span>'}
          <div style="display:flex; gap:6px; margin-left:8px; flex-wrap:wrap">
            <button class="chip ${_==="ALL"?"active":""}" data-edge="ALL">All (${b.size})</button>
            <button class="chip ${_==="BUY"?"active":""}" data-edge="BUY" style="${_==="BUY"?"background:var(--emerald-dim); border-color:rgba(16,185,129,0.35); color:var(--emerald)":""}">▲ BUY (${I})</button>
            <button class="chip ${_==="SELL"?"active":""}" data-edge="SELL" style="${_==="SELL"?"background:var(--crimson-dim); border-color:rgba(239,68,68,0.35); color:var(--crimson)":""}">▼ SELL (${V})</button>
          </div>
        </div>
        <span class="mono" style="font-size:11px; color:var(--text-faint)">Click row ▶ to see stat deltas (pass/rush/rec yds, TDs). Preseason: Sleeper pts empty until Week 1 publish: rank delta (ECR) works now.</span>
      </div>
    </div>
    `:'<div class="alert alert-info reveal in" style="margin-top:8px">Market comparison not loaded. Showing model only.</div>'}

    <div class="card reveal in" style="margin-top:12px">
      <div class="card-body" style="display:flex; flex-direction:column; gap:12px">
        ${f?"":`
        <div class="row" style="gap:8px">
          <span class="kicker">Week</span>
          <div class="filters week-picker-scroll" style="overflow-x:auto; flex-wrap:nowrap; max-width:100%; padding-bottom:4px">
            ${Array.from({length:18},(e,a)=>a+1).map(e=>`<button class="chip ${e===Number(w)?"active":""}" data-proj-week="${e}" title="Show week ${e} projections" style="flex-shrink:0">${e}</button>`).join("")}
          </div>
        </div>
        `}
        <div class="row">
          <label class="search-mini" style="flex:1; min-width:260px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input id="localSearch" placeholder="pos:WR healthy:true" autocomplete="off" />
          </label>
          <span class="kicker" id="countLabel" style="white-space:nowrap"></span>
          <button class="chip" id="toggleProjSortDir" title="Flip sorting: highest ↔ lowest">↕ Highest → Lowest</button>
          <button class="chip ${f?"active":""}" id="toggleRos" title="Switch between weekly and rest-of-season projections" style="${f?"background:var(--amber-dim); border-color:rgba(245,158,11,0.35); color:var(--amber)":""}">${f?"📅 RoS (×17)":"📊 Weekly"}</button>
        </div>
        <div class="filters" id="quickChips">
          <button class="chip" data-chip="pos:QB">QB</button>
          <button class="chip" data-chip="pos:RB">RB</button>
          <button class="chip" data-chip="pos:WR">WR</button>
          <button class="chip" data-chip="pos:TE">TE</button>
          <button class="chip" data-chip="healthy:true">Healthy</button>
          <button class="chip" data-chip="trending:true">Trending</button>
          <button class="chip" data-chip="roster:true">My Roster</button>
          <button class="chip" data-chip="interval<4">Tight (±&lt;4)</button>
        </div>
        ${C.cold?'<div class="alert alert-warn">No fresh data. Refresh to populate.</div>':""}
        ${k.length?"":'<div class="alert alert-info">No projections yet. Search works once data loads.</div>'}
      </div>
    </div>

    <div class="responsive-view">
    ${i&&m?`
    <details style="padding:8px 12px; background:var(--surface-raised); border:1px solid var(--border); border-radius:8px; margin-bottom:10px; font:500 11px "Helvetica Neue", Helvetica,sans-serif; line-height:1.4" aria-label="Projections legend: Model vs Market, BUY and SELL">
      <summary style="cursor:pointer; font-weight:700" title="Toggle legend">Legend: Model vs Market, BUY/SELL</summary>
      <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-top:8px">
      <span style="display:flex; align-items:center; gap:6px"><span style="width:10px; height:10px; background:var(--amber); border-radius:2px; display:inline-block"></span> <strong style="color:var(--amber)">Model</strong> <span>weekly PPR (×17 for Auction)</span></span>
      <span style="display:flex; align-items:center; gap:6px"><span style="width:10px; height:10px; background:var(--sky); border-radius:2px; display:inline-block"></span> <strong style="color:var(--sky)">Sleeper</strong> <span>Market: free Sleeper projections</span></span>
      </div>
      <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-top:6px">
      <span style="display:flex; align-items:center; gap:6px"><span style="width:10px; height:10px; background:var(--emerald); border-radius:2px; display:inline-block"></span> BUY = Model ≥ +3 pts / ≥12 ranks better</span>
      <span style="display:flex; align-items:center; gap:6px"><span style="width:10px; height:10px; background:var(--crimson); border-radius:2px; display:inline-block"></span> SELL = Market ≥ +3 / 12 better</span>
      <span class="mono" style="color:var(--text-faint); margin-left:auto">FP ECR/ADP sparse on free tier: Market pts primary</span>
      </div>
    </details>
    `:""}
    <div class="table-wrap sticky-player reveal in" style="margin-top:16px; overflow-x:auto; max-width:100%">
      <table id="projTable" style="min-width:${i&&m?"1180px":"760px"}">
        <thead>
          <tr>
            <th data-sort="player_name" tabindex="0" role="button" aria-label="Sort by Player">Player</th>
            <th data-sort="position" tabindex="0" role="button" aria-label="Sort by Position">Pos</th>
            <th data-sort="team" tabindex="0" role="button" aria-label="Sort by Team">Team</th>
            <th data-sort="projected_points" tabindex="0" role="button" aria-label="Sort by Model Points" style="${i&&m?"color:var(--amber); border-bottom:2px solid var(--amber)":""}">${f?"RoS":"Model"}<br><span style="font:600 10px "Helvetica Neue", Helvetica,sans-serif; color:${i&&m?"var(--amber)":"var(--text-faint)"}; opacity:0.7">${f?"total":"proj"}</span></th>
            ${i&&m?`
            <th data-sort="market_points" tabindex="0" role="button" aria-label="Sort by Sleeper Market Points" style="color:var(--sky); border-bottom:2px solid var(--sky)">Market<br><span style="font:600 10px "Helvetica Neue", Helvetica,sans-serif; color:var(--sky); opacity:0.7">${f?"Sleeper season":"Sleeper"}</span></th>
            <th data-sort="delta_points" tabindex="0" role="button" aria-label="Sort by Points Delta" style="border-bottom:2px solid var(--border)">Δ<br><span style="font:600 10px "Helvetica Neue", Helvetica,sans-serif; color:var(--text-faint)">Grid−Mkt</span></th>
            <th data-sort="fp_ecr" tabindex="0" role="button" aria-label="Sort by FantasyPros ECR">ECR</th>
            <th data-sort="delta_rank" tabindex="0" role="button" aria-label="Sort by Rank Delta">Δ Rk</th>
            <th data-sort="fp_adp" tabindex="0" role="button" aria-label="Sort by ADP">ADP</th>
            <th data-sort="edge_score" tabindex="0" role="button" aria-label="Sort by Edge">Edge</th>
            `:""}
            <th>Interval</th>
            <th data-sort="opponent_team" tabindex="0" role="button" aria-label="Sort by Matchup">Matchup</th>
            <th data-sort="width" tabindex="0" role="button" aria-label="Sort by Confidence Width">Conf</th>
            <th>Injury</th>
            ${i&&m?'<th style="width:28px"></th>':""}
          </tr>
        </thead>
        <tbody id="projBody"></tbody>
      </table>
    </div>
    </div>
    <div class="player-cards-grid" id="projCards"></div>
    <div id="paginationControls" style="display:flex; justify:space-between; align-items:center; margin-top:16px; flex-wrap:wrap; gap:8px"></div>
  `;const ae=o.querySelector("#toggleCompare");ae&&ae.addEventListener("click",()=>{i=!i,ee(o)});const re=o.querySelector("#toggleRos");re&&re.addEventListener("click",()=>{f=!f,ee(o)}),o.querySelectorAll("[data-proj-week]").forEach(e=>{e.addEventListener("click",()=>{const a=Number(e.getAttribute("data-proj-week"));w=a===w?null:a,l=1,ee(o)})}),o.querySelectorAll("[data-edge]").forEach(e=>{e.addEventListener("click",()=>{_=e.getAttribute("data-edge"),l=1,x(),o.querySelectorAll("[data-edge]").forEach(a=>{const r=a.getAttribute("data-edge");r===_?(a.classList.add("active"),r==="BUY"?(a.style.background="var(--emerald-dim)",a.style.borderColor="rgba(16,185,129,0.35)",a.style.color="var(--emerald)"):r==="SELL"?(a.style.background="var(--crimson-dim)",a.style.borderColor="rgba(239,68,68,0.35)",a.style.color="var(--crimson)"):(a.style.background="",a.style.borderColor="",a.style.color="")):(a.classList.remove("active"),a.style.background="",a.style.borderColor="",a.style.color="")})})});const A=o.querySelector("#localSearch");A&&(A.value=u,A.addEventListener("input",be(()=>{u=A.value,l=1,y&&(y.value=u),x(),O()},150))),o.querySelectorAll("[data-chip]").forEach(e=>{e.addEventListener("click",()=>{const a=e.getAttribute("data-chip");u=u.includes(a)?u.replace(a,"").replace(/\s{2,}/g," ").trim():u?`${u} ${a}`:a,l=1,A&&(A.value=u),y&&(y.value=u),x(),O()})});let R="projected_points",j=-1,H=!1;o.querySelectorAll("th[data-sort]").forEach(e=>{e.style.cursor="pointer";const a=()=>{const r=e.getAttribute("data-sort");R===r?j*=-1:(R=r,j=r==="player_name"?1:-1),H=!0,l=1,x(),G()};e.addEventListener("click",a),e.addEventListener("keydown",r=>{(r.key==="Enter"||r.key===" ")&&(r.preventDefault(),a())})});function G(){const e=o.querySelector("#toggleProjSortDir");if(!e)return;const a=j===-1?"Highest → Lowest":"Lowest → Highest";e.textContent=`↕ ${a}`,e.title=`Currently ${a} by ${R}: click to flip`}(le=o.querySelector("#toggleProjSortDir"))==null||le.addEventListener("click",()=>{j*=-1,H=!0,l=1,x(),G()}),G();function _e(e){for(const r of e)r._onRoster=J.has(String(r.player_id));let a=Ye(e,u);return m&&_!=="ALL"&&(i||!$)&&(a=a.filter(r=>(r.edge||"NEUTRAL")===_)),a}function oe(e,a){let r=e[a];if((r==null||r===""||r==="—")&&a==="projected_points"&&(r=e.point_estimate),r==null||r===""||r==="—"||r==="–"||r==="-")return null;if(typeof r=="number")return isNaN(r)?null:r;const n=String(r).trim(),L=Number(n);return!isNaN(L)&&n!==""?L:n.toLowerCase()}function x(){var de,pe,ce,ue;let e=_e(k);const a=H?null:Ve(k);e=[...e].sort((t,v)=>{if(!H){const h=ve(t,{},a)-ve(v,{},a);if(h!==0)return h;const q=ye(t,{},a)-ye(v,{},a);if(q!==0)return q}const p=oe(t,R),c=oe(v,R);return p===null&&c===null?0:p===null?1:c===null?-1:typeof p=="number"&&typeof c=="number"?(p-c)*j:String(p).localeCompare(String(c))*j}),o.querySelectorAll("th[data-sort]").forEach(t=>{t.getAttribute("data-sort")===R?t.setAttribute("aria-sort",j===1?"ascending":"descending"):t.removeAttribute("aria-sort")});const r=e.length,n=Math.max(1,Math.ceil(r/X));l>n&&(l=n);const L=(l-1)*X,E=Math.min(L+X,r),F=e.slice(L,E),z=o.querySelector("#countLabel");z&&(r===0?z.textContent="0 players":z.textContent=`Showing ${L+1}–${E} of ${r} players${r!==k.length?` (filtered from ${k.length})`:""}${m&&_!=="ALL"?` · ${_} only`:""}`);const U=o.querySelector("#projBody"),ne=i&&m?15:9;F.length?(U.innerHTML=F.map(t=>{const v=t.position||t.position_group||"UNK",p=Number(t.projected_points??t.point_estimate??0),c=Number(t.projection_lower??t.lower_bound??Math.max(0,p-(t.width??5))),h=Number(t.projection_upper??t.upper_bound??p+(t.width??5)),q=Number(t.width??t.projection_width??(h-c)/2),he=t.market_points!=null?Number(t.market_points).toFixed(1):"—",xe=t.fp_ecr!=null?`#${t.fp_ecr}${t.fp_ecr_pos?` (#${t.fp_ecr_pos} ${v})`:""}${t.fp_tier?` <span style="background:var(--violet-dim); color:var(--violet); border:1px solid rgba(168,85,247,0.18); border-radius:999px; padding:1px 5px; font:700 10px ui-monospace, SFMono-Regular,monospace">T${t.fp_tier}</span>`:""}`:"—",ke=t.fp_adp!=null?`#${t.fp_adp}`:"—",$e=i&&m?ge(t.edge):"",we=Ae(t.team),Q=Re(t.team),Se=t.team?`<span class="badge" style="background:${Q}1f; color:${Q}; border:1px solid ${Q}3d; font-weight:700">${Z(t.team,14)} ${M(t.team)}</span>`:"—",Le=t.opponent_team?`<span class="mono" style="font-size:11px; color:var(--text-faint)">vs</span> ${Z(t.opponent_team,14)} <span class="mono" style="font-size:11px; font-weight:700">${M(t.opponent_team)}</span>`:'<span class="mono" style="color:var(--text-faint)">—</span>',Me=t.edge==="BUY"?"var(--emerald)":t.edge==="SELL"?"var(--crimson)":we,je=i&&m?`<button class="chip" data-expand="${t.player_id}" aria-label="Show stat deltas for ${M(t.player_name)}" style="padding:4px 8px; font-size:11px">▶</button>`:"",me=`
          <tr data-team="${t.team||""}" data-pid="${t.player_id}" class="clickable-row" style="cursor:pointer; --team-accent:${Me}; ${t.edge==="BUY"?"background:rgba(16,185,129,0.04)":t.edge==="SELL"?"background:rgba(239,68,68,0.04)":""}">
            <td><div class="player-cell">${Fe(t,32)}<div class="player-cell-info"><div class="player-cell-name">${M(t.player_name||t.player_id)}</div><div class="player-cell-sub">${Z(t.team,14)} ${M(t.team||"—")} ${t.model_pos_rank?`<span style="color:var(--text-faint)">· #${t.model_pos_rank} ${v}</span>`:""}</div></div></div></td>
            <td>${ze(v)}</td>
            <td>${Se}</td>
            <td class="mono" style="font-weight:700; color:var(--amber)">${p.toFixed(1)}</td>
            ${i&&m?`
            <td class="mono" style="color:var(--sky)">${he}</td>
            <td>${Ke(t.delta_points)}</td>
            <td class="mono" style="font-size:11px; color:var(--text-muted)">${xe}</td>
            <td>${Ge(t.delta_rank)}</td>
            <td class="mono" style="font-size:11px; color:var(--text-muted)">${ke}</td>
            <td>${$e}</td>
            `:""}
            <td>${Te({point:p,low:c,high:h,width:q,min:0,max:35})}</td>
            <td>${Le}${qe(t.matchup_difficulty,t.matchup_rank,t.matchup_pts_allowed)}</td>
            <td>${De(q)}</td>
            <td>${He(t.injury_status)} ${t.trending?'<span class="badge" style="background:var(--sky-dim); color:var(--sky); margin-left:6px">↗ trending</span>':""}</td>
            ${i&&m?`<td>${je}</td>`:""}
          </tr>
        `;if(i&&m&&t.stat_deltas&&t.stat_deltas.length){const Ee=t.stat_deltas.filter(P=>P.market!=null||P.model!=null).slice(0,7).map(P=>`
            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding:4px 0; border-bottom:1px solid rgba(var(--text-rgb,0,0,0),0.06)">
              <span class="mono" style="font-size:11px; color:var(--text-muted); min-width:64px">${P.label}</span>
              ${Oe(P.model,P.market,P.delta)}
            </div>
          `).join(""),Ne=t.opponent_team?`vs ${t.opponent_team}`:"";return me+`<tr class="expand-panel" data-expand-panel="${t.player_id}" style="display:none; background:var(--surface-raised)"><td colspan="${ne}" style="padding:12px 12px 12px 48px"><div style="display:flex; flex-direction:column; gap:6px"><div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap"><span class="kicker">Stat deltas: Model vs Market</span><span class="mono" style="font-size:11px; color:var(--text-faint)">${M(t.player_name)} ${Ne} · <span style="color:var(--amber)">amber=Model</span> <span style="color:var(--sky)">, blue=Market</span></span></div>${Ee||'<span class="mono" style="font-size:11px; color:var(--text-faint)">No market stats for this player yet (preseason).</span>'}<div class="mono" style="font-size:11px; color:var(--text-faint); margin-top:6px">${t.fp_ecr!=null||t.fp_adp!=null?`FP ECR #${t.fp_ecr??"—"} ${t.fp_ecr_pos?`(pos #${t.fp_ecr_pos})`:""} · ADP #${t.fp_adp??"—"} · `:""}Model #${t.model_overall_rank??"—"} (pos #${t.model_pos_rank??"—"})${t.delta_rank!=null?` · ΔRk ${(t.delta_rank>0?"+":"")+t.delta_rank}`:""}${t.search_rank!=null||t.depth_order!=null?` · Sleeper #${t.search_rank??"—"}${t.depth_order!=null?` (${t.depth_position||t.position} ${t.depth_order})`:""}`:""}</div></div></td></tr>`}return me}).join(""),U.querySelectorAll("[data-expand]").forEach(t=>{t.addEventListener("click",v=>{v.stopPropagation();const p=t.getAttribute("data-expand"),c=U.querySelector(`[data-expand-panel="${p}"]`);if(!c)return;const h=c.style.display!=="none";c.style.display=h?"none":"table-row",t.textContent=h?"▶":"▼"})})):U.innerHTML=`<tr><td colspan="${ne}"><div class="empty">No matches for <code class="inline">${M(u||"—")}</code>${_!=="ALL"?` with edge ${_}`:""}. Try <code class="inline">pos:WR</code> or clear filters.</div></td></tr>`;const ie=o.querySelector("#projCards");ie&&(ie.innerHTML=F.map(t=>{const v=Ie(t,{showInterval:!0,showTeamLogo:!0,statWeek:w??void 0});if(!i||!m)return v;const p=t.market_points!=null?`<span class="mono" style="font-size:11px; color:var(--text-muted)">Market ${Number(t.market_points).toFixed(1)} · <span style="color:${Number(t.delta_points)>.5?"var(--emerald)":Number(t.delta_points)<-.5?"var(--crimson)":"var(--text-muted)"}">${t.delta_points>0?"+":""}${Number(t.delta_points).toFixed(1)}</span></span>`:"",c=t.fp_ecr?`ECR #${t.fp_ecr} · Δ ${t.delta_rank!=null?(t.delta_rank>0?"+":"")+t.delta_rank:"—"}`:t.search_rank!=null||t.depth_order!=null?`Sleeper #${t.search_rank??"—"}${t.depth_order!=null?` (${t.depth_position||t.position} ${t.depth_order})`:""}`:"ECR —",h=ge(t.edge);return v.replace(`</div>
`,`  <div style="margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; padding-top:8px; border-top:1px solid var(--border)">${p?`<span class="mono" style="font-size:11px; color:var(--text-muted)">${p}</span>`:""}<span class="mono" style="font-size:11px; color:var(--text-muted)">${c}</span><span class="spacer"></span>${h}</div></div>
`)}).join("")),o.querySelectorAll("[data-pid]").forEach(t=>{t.classList.contains("expand-panel")||(t.style.cursor="pointer",t.addEventListener("click",v=>{if(v.target.closest("[data-expand]"))return;const p=t.getAttribute("data-pid"),c=k.find(h=>String(h.player_id)===String(p));c&&Ue(c,o,w??void 0)}))});const N=o.querySelector("#paginationControls");N&&(n<=1?N.innerHTML="":(N.innerHTML=`
          <div style="font:400 13px "Helvetica Neue", Helvetica,sans-serif; color:var(--text-muted)">
            Page <strong>${l}</strong> of <strong>${n}</strong>
          </div>
          <div style="display:flex; gap:6px">
            <button class="chip" id="firstPageBtn" ${l===1?'disabled style="opacity:0.4; cursor:not-allowed"':""}>« First</button>
            <button class="chip" id="prevPageBtn" ${l===1?'disabled style="opacity:0.4; cursor:not-allowed"':""}>‹ Prev</button>
            <button class="chip" id="nextPageBtn" ${l===n?'disabled style="opacity:0.4; cursor:not-allowed"':""}>Next ›</button>
            <button class="chip" id="lastPageBtn" ${l===n?'disabled style="opacity:0.4; cursor:not-allowed"':""}>Last »</button>
          </div>
        `,(de=N.querySelector("#firstPageBtn"))==null||de.addEventListener("click",()=>{l>1&&(l=1,x())}),(pe=N.querySelector("#prevPageBtn"))==null||pe.addEventListener("click",()=>{l>1&&(l--,x())}),(ce=N.querySelector("#nextPageBtn"))==null||ce.addEventListener("click",()=>{l<n&&(l++,x())}),(ue=N.querySelector("#lastPageBtn"))==null||ue.addEventListener("click",()=>{l<n&&(l=n,x())})))}function O(){const e="projections";location.hash=u?`${e}?q=${encodeURIComponent(u)}`:e}x()}function be(o,s=150){let d;return(...g)=>{clearTimeout(d),d=setTimeout(()=>o(...g),s)}}export{ee as renderProjections};
