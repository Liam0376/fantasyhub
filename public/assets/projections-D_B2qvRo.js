import{b as Le,x as Me,g as je,e as B,m as Ee,t as ce,p as Ne,j as Pe,n as Ce,w as Be,y as Ae,q as Re,o as Fe,z as Te,A as qe}from"./index-BUQ5dhSf.js";import{p as ze}from"./playerCard-DxkLTTJF.js";import{b as Ue,r as ue,a as me}from"./relevance-C3SYLMeE.js";let k=[],x=new Map,p="",n=1,i=!0,g="ALL",G=new Set,f=!1,A=null;const O=50,He={QB:1.55,RB:1.07,WR:1.12,TE:.88,K:.85,DEF:.75};function z(o,s){const c=He[(o||"UNK").toUpperCase()]??1,b=s>12?Math.min(1.6,1+(s-12)*.022):1;return Math.max(3,Math.min(14,5*c*b))}function ve(o){return o==="BUY"?'<span class="badge" style="background:var(--emerald-dim); color:var(--emerald); border:1px solid rgba(16,185,129,0.22)">▲ BUY</span>':o==="SELL"?'<span class="badge" style="background:var(--crimson-dim); color:var(--crimson); border:1px solid rgba(239,68,68,0.22)">▼ SELL</span>':'<span class="badge" style="background:rgba(var(--text-rgb,0,0,0),0.05); color:var(--text-faint); border:1px solid var(--border)">—</span>'}function De(o){if(o==null)return'<span class="mono" style="color:var(--text-faint)">—</span>';const s=Number(o),c=s>.5?"var(--emerald)":s<-.5?"var(--crimson)":"var(--text-muted)",b=s>.5?"↑":s<-.5?"↓":"·",$=s>0?"+":"";return`<span class="mono" style="color:${c}; font-weight:700">${b} ${$}${s.toFixed(1)}</span>`}function We(o){if(o==null)return'<span class="mono" style="color:var(--text-faint)">—</span>';const s=Number(o),c=s>=12?"var(--emerald)":s<=-12?"var(--crimson)":"var(--text-muted)",b=s>0?"↑":s<0?"↓":"·",$=s>0?"+":"";return`<span class="mono" style="color:${c}; font-weight:700">${b} ${$}${s}</span>`}function Ye(o,s,c){if(s==null)return`<span class="mono" style="color:var(--text-faint); font-size:11px">${o!=null&&o.toFixed?o.toFixed(1):o} <span style="color:var(--text-faint)">· market —</span></span>`;const b=Math.max(Math.abs(o),Math.abs(s),10),$=Math.round(Math.abs(o)/b*100),R=Math.round(Math.abs(s)/b*100),F=c>0?"var(--emerald)":c<0?"var(--crimson)":"var(--text-faint)";return`<div style="display:flex; align-items:center; gap:6px; min-width:160px"><span class="mono" style="font-size:11px; min-width:44px; text-align:right">${o.toFixed(1)}</span><div style="flex:1; height:4px; background:rgba(var(--text-rgb,0,0,0),0.06); border-radius:999px; position:relative; overflow:hidden"><div style="position:absolute; left:0; top:0; bottom:0; width:${$}%; background:var(--amber); opacity:0.9; border-radius:999px"></div><div style="position:absolute; left:0; top:0; bottom:0; width:${R}%; background:var(--sky); opacity:0.35; border-radius:999px"></div></div><span class="mono" style="font-size:11px; color:var(--text-muted); min-width:36px">${s.toFixed(1)}</span><span class="mono" style="font-size:11px; color:${F}; font-weight:700; min-width:36px; text-align:right">${c>0?"+":""}${c.toFixed(1)}</span></div>`}async function V(o){var ae,re;const s=new URLSearchParams(location.hash.split("?")[1]||"");p=s.get("q")||((ae=document.getElementById("globalSearch"))==null?void 0:ae.value)||"",n=1;const c=Number(s.get("limit")||800),b=Number.isFinite(c)?Math.max(10,Math.min(2e3,Math.floor(c))):800,$=e=>String(e||"").toLowerCase().replace(/\b(jr\.?|sr\.?|ii|iii|iv|v)\b/g,"").replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();let R=new Map;G=new Set;try{const e=await Le({}),t=[].concat(e.starters||[],e.bench||[],e.reserve||[]).map(r=>({player_id:r.player_id,team_name:r.team_name||""}));for(const r of t)if(r.player_id&&(G.add(String(r.player_id)),r.player_name)){const l=`${$(r.player_name)}|${(r.position||"").toUpperCase()}`;R.set(l,String(r.player_id))}}catch{}const F=f?await Te({limit:b}):await Me({week:A,limit:b});k=f?(F.players||[]).map(e=>{const t=Math.max(1,Number(e.remaining_games)||1),r=z(e.position,Number(e.per_game_neutral)||0),l=Number((r*Math.sqrt(t)).toFixed(2));return{...e,projected_points:e.ros_points,point_estimate:e.ros_points,player_name:e.player_name||e.player_display_name,position_group:e.position,width:l,projection_lower:Math.max(0,Number((e.ros_points-l).toFixed(2))),projection_upper:Number((e.ros_points+l).toFixed(2))}}):F.players||[];const W=F.meta||{};!f&&A==null&&W.week!=null&&(A=W.week);let N={players:[],count:0,meta:{},fetched_at:null};try{N=await je({limit:2e3})}catch{N={players:[],count:0,meta:{},fetched_at:null}}x=new Map((N.players||[]).map(e=>[String(e.player_id),e]));for(const e of k){const t=`${$(e.player_name||"")}|${(e.position||"").toUpperCase()}`;!e.sleeper_id&&R.has(t)&&(e.sleeper_id=R.get(t))}const Z=new Set(k.map(e=>String(e.player_id)));for(const e of N.players||[]){const t=String(e.player_id||"");t&&!Z.has(t)&&(Z.add(t),k.push({player_id:t,sleeper_id:e.sleeper_id||(/^\d+$/.test(t)?t:null),espn_id:e.espn_id||null,player_name:e.player_name||e.full_name||t,position:(e.position||"UNK").toUpperCase(),team:(e.team||"").toUpperCase(),projected_points:e.model_points??e.projected_points??0,point_estimate:e.model_points??e.projected_points??0,projection_lower:e.projection_lower??(e.model_points??0)-z(e.position,e.model_points??0),projection_upper:e.projection_upper??(e.model_points??0)+z(e.position,e.model_points??0),width:e.width??z(e.position,e.model_points??0),injury_status:e.injury_status||null,market_points:e.market_points,delta_points:e.delta_points,model_overall_rank:e.model_overall_rank,model_pos_rank:e.model_pos_rank,fp_ecr:e.fp_ecr,fp_ecr_pos:e.fp_ecr_pos,fp_adp:e.fp_adp,fp_tier:e.fp_tier,delta_rank:e.delta_rank,delta_pos_rank:e.delta_pos_rank,edge:e.edge||"NEUTRAL",edge_score:e.edge_score||0,stat_deltas:e.stat_deltas||[]}))}const u=x.size>0;for(const e of k){e.player_id&&/^\d+$/.test(String(e.player_id))&&(e.sleeper_id=e.player_id);const t=x.get(String(e.player_id));if(t?(t.sleeper_id&&(e.sleeper_id=t.sleeper_id),t.espn_id&&(e.espn_id=t.espn_id),e.market_points=t.market_points,e.delta_points=t.delta_points,e.model_overall_rank=t.model_overall_rank,e.model_pos_rank=t.model_pos_rank,e.fp_ecr=t.fp_ecr,e.fp_ecr_pos=t.fp_ecr_pos,e.fp_adp=t.fp_adp,e.fp_tier=t.fp_tier,e.delta_rank=t.delta_rank,e.delta_pos_rank=t.delta_pos_rank,e.edge=t.edge,e.edge_score=t.edge_score,e.stat_deltas=t.stat_deltas,e.market_season_stats=t.market_season_stats||null,e.auction=t.auction,e.gridironAuction=t.auction,e.marketAuction=t.marketAuction,e.vor=t.vor):(e.market_points=null,e.delta_points=null,e.edge="NEUTRAL",e.stat_deltas=[]),f){e.weekly=Number(e.per_game_neutral)||0,e.lower=e.projection_lower,e.upper=e.projection_upper;const r=t&&t.market_season_points!=null&&Number(t.market_season_points)>0?Number(t.market_season_points):null;e.market_points=r,e.delta_points=r!=null?Number((e.projected_points-r).toFixed(2)):null}else{const r=t&&t.model_points!=null&&Number(t.model_points)>0?Number(t.model_points):null,l=e.projected_points!=null&&Number(e.projected_points)>0?Number(e.projected_points):null,S=t&&t.market_season_points!=null&&Number(t.market_season_points)>0?Number(t.market_season_points)/17:null,w=r??l??S??0;e.projected_points=Number(w.toFixed(2)),e.point_estimate=Number(w.toFixed(2)),e.weekly=Number(w.toFixed(2));const T=(t==null?void 0:t.interval_width)??(t==null?void 0:t.width)??e.width,M=Number(T??z(e.position,w));e.width=Number(M.toFixed(2)),e.projection_lower=Number(Math.max(0,w-M).toFixed(2)),e.projection_upper=Number((w+M).toFixed(2)),e.lower=e.projection_lower,e.upper=e.projection_upper}e.ecr=e.fp_ecr,e.adp=e.fp_adp,e.tier=e.fp_tier}const y=document.getElementById("globalSearch");y&&!y.dataset.bound&&(y.dataset.bound="1",y.addEventListener("input",ye(()=>{p=y.value,n=1,h(),Q()},150)),y.addEventListener("keydown",e=>{e.key==="/"&&document.activeElement!==y&&(e.preventDefault(),y.focus())})),y&&(y.value=p);const Y=[...x.values()].filter(e=>e.edge==="BUY").length,I=[...x.values()].filter(e=>e.edge==="SELL").length,J=[...x.values()].filter(e=>e.market_points!=null).length;o.innerHTML=`
    <div class="hero reveal in">
      <h1>Projections</h1>
      <p>Weekly projections. Bars show the model range (floor–ceiling); overlap = toss-up (heuristic, not a statistical test).</p>
    </div>

    ${u?`
    <div class="kpi-row reveal in" style="margin-top:4px">
      <div class="kpi-card" style="border-top:1px solid var(--emerald)">
        <div class="kpi-label" style="color:var(--emerald)">BUY edges: market sleeping</div>
        <div class="kpi-value" style="color:var(--emerald)">${Y}</div>
        <div class="kpi-bar"><div class="kpi-bar-fill good" style="width:${Math.min(100,Math.round(Y/Math.max(1,Math.min(40,x.size/6))*100))}%"></div></div>
        <div class="mono" style="font-size:11px; color:var(--text-muted); margin-top:6px">Model rank ≥12 better than FP ECR or +3.0 pts vs Sleeper market</div>
      </div>
      <div class="kpi-card" style="border-top:1px solid var(--crimson)">
        <div class="kpi-label" style="color:var(--crimson)">SELL flags: market overvalued</div>
        <div class="kpi-value" style="color:var(--crimson)">${I}</div>
        <div class="kpi-bar"><div class="kpi-bar-fill bad" style="width:${Math.min(100,Math.round(I/Math.max(1,Math.min(40,x.size/6))*100))}%"></div></div>
        <div class="mono" style="font-size:11px; color:var(--text-muted); margin-top:6px">Market rank ≥12 higher or −3.0 pts vs model</div>
      </div>
      <div class="kpi-card" style="border-top:1px solid var(--sky)">
        <div class="kpi-label" style="color:var(--sky)">Market coverage: Sleeper + FantasyPros</div>
        <div class="kpi-value" style="color:var(--sky)">${J} / ${x.size}</div>
        <div class="kpi-bar"><div class="kpi-bar-fill" style="background:var(--sky); width:${Math.round(J/Math.max(1,x.size)*100)}%"></div></div>
        <div class="mono" style="font-size:11px; color:var(--text-muted); margin-top:6px">Sleeper pts+stats keyed by gsis_id · FP ECR/ADP via name+team+pos</div>
      </div>
      <div class="kpi-card" style="border-top:1px solid var(--amber)">
        <div class="kpi-label" style="color:var(--amber)">Comparison source</div>
        <div class="kpi-value" style="font-size:14px; line-height:1.3">Model vs Market<br><span style="font:600 11px "Helvetica Neue", Helvetica,sans-serif; color:var(--text-muted); letter-spacing:0.04em; text-transform:uppercase">${N.fetched_at?new Date(N.fetched_at).toLocaleString():"DB snapshot"} · ${x.size} ranked</span></div>
        <div class="mono" style="font-size:11px; color:var(--text-muted); margin-top:6px">Free, local: Sleeper projections + FP free ECR/ADP</div>
      </div>
    </div>
    <div class="card reveal in" style="margin-top:8px; border-top:1px solid var(--amber)">
      <div class="card-body" style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between">
        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center">
          <span class="kicker">Compare vs Market</span>
          <button class="chip ${i?"active":""}" id="toggleCompare" title="Toggle market comparison">${i?"Market + ECR on":"Show Market & ECR"}</button>
          <div style="display:flex; gap:6px; margin-left:8px; flex-wrap:wrap">
            <button class="chip ${g==="ALL"?"active":""}" data-edge="ALL">All (${x.size})</button>
            <button class="chip ${g==="BUY"?"active":""}" data-edge="BUY" style="${g==="BUY"?"background:var(--emerald-dim); border-color:rgba(16,185,129,0.35); color:var(--emerald)":""}">▲ BUY (${Y})</button>
            <button class="chip ${g==="SELL"?"active":""}" data-edge="SELL" style="${g==="SELL"?"background:var(--crimson-dim); border-color:rgba(239,68,68,0.35); color:var(--crimson)":""}">▼ SELL (${I})</button>
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
            ${Array.from({length:18},(e,t)=>t+1).map(e=>`<button class="chip ${e===Number(A)?"active":""}" data-proj-week="${e}" title="Show week ${e} projections" style="flex-shrink:0">${e}</button>`).join("")}
          </div>
        </div>
        `}
        <div class="row">
          <label class="search-mini" style="flex:1; min-width:260px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input id="localSearch" placeholder="pos:WR wind>15 healthy:true" autocomplete="off" />
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
          <button class="chip" data-chip="wind>15">Wind &gt;15</button>
          <button class="chip" data-chip="interval<4">Tight (±&lt;4)</button>
        </div>
        ${W.cold?'<div class="alert alert-warn">No fresh data. Refresh to populate.</div>':""}
        ${k.length?"":'<div class="alert alert-info">No projections yet. Search works once data loads.</div>'}
      </div>
    </div>

    <div class="responsive-view">
    ${i&&u?`
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
      <table id="projTable" style="min-width:${i&&u?"1180px":"760px"}">
        <thead>
          <tr>
            <th data-sort="player_name" tabindex="0" role="button" aria-label="Sort by Player">Player</th>
            <th data-sort="position" tabindex="0" role="button" aria-label="Sort by Position">Pos</th>
            <th data-sort="team" tabindex="0" role="button" aria-label="Sort by Team">Team</th>
            <th data-sort="projected_points" tabindex="0" role="button" aria-label="Sort by Model Points" style="${i&&u?"color:var(--amber); border-bottom:2px solid var(--amber)":""}">${f?"RoS":"Model"}<br><span style="font:600 10px "Helvetica Neue", Helvetica,sans-serif; color:${i&&u?"var(--amber)":"var(--text-faint)"}; opacity:0.7">${f?"total":"proj"}</span></th>
            ${i&&u?`
            <th data-sort="market_points" tabindex="0" role="button" aria-label="Sort by Sleeper Market Points" style="color:var(--sky); border-bottom:2px solid var(--sky)">Market<br><span style="font:600 10px "Helvetica Neue", Helvetica,sans-serif; color:var(--sky); opacity:0.7">${f?"Sleeper season":"Sleeper"}</span></th>
            <th data-sort="delta_points" tabindex="0" role="button" aria-label="Sort by Points Delta" style="border-bottom:2px solid var(--border)">Δ<br><span style="font:600 10px "Helvetica Neue", Helvetica,sans-serif; color:var(--text-faint)">Grid−Mkt</span></th>
            <th data-sort="fp_ecr" tabindex="0" role="button" aria-label="Sort by FantasyPros ECR">ECR</th>
            <th data-sort="delta_rank" tabindex="0" role="button" aria-label="Sort by Rank Delta">Δ Rk</th>
            <th data-sort="fp_adp" tabindex="0" role="button" aria-label="Sort by ADP">ADP</th>
            <th data-sort="edge_score" tabindex="0" role="button" aria-label="Sort by Edge">Edge</th>
            `:""}
            <th>Interval</th>
            <th data-sort="wind_mph" tabindex="0" role="button" aria-label="Sort by Wind Speed">Wind</th>
            <th data-sort="width" tabindex="0" role="button" aria-label="Sort by Confidence Width">Conf</th>
            <th>Injury</th>
            ${i&&u?'<th style="width:28px"></th>':""}
          </tr>
        </thead>
        <tbody id="projBody"></tbody>
      </table>
    </div>
    </div>
    <div class="player-cards-grid" id="projCards"></div>
    <div id="paginationControls" style="display:flex; justify:space-between; align-items:center; margin-top:16px; flex-wrap:wrap; gap:8px"></div>
  `;const X=o.querySelector("#toggleCompare");X&&X.addEventListener("click",()=>{i=!i,V(o)});const ee=o.querySelector("#toggleRos");ee&&ee.addEventListener("click",()=>{f=!f,V(o)}),o.querySelectorAll("[data-proj-week]").forEach(e=>{e.addEventListener("click",()=>{const t=Number(e.getAttribute("data-proj-week"));A=t===A?null:t,n=1,V(o)})}),o.querySelectorAll("[data-edge]").forEach(e=>{e.addEventListener("click",()=>{g=e.getAttribute("data-edge"),n=1,h(),o.querySelectorAll("[data-edge]").forEach(t=>{const r=t.getAttribute("data-edge");r===g?(t.classList.add("active"),r==="BUY"?(t.style.background="var(--emerald-dim)",t.style.borderColor="rgba(16,185,129,0.35)",t.style.color="var(--emerald)"):r==="SELL"?(t.style.background="var(--crimson-dim)",t.style.borderColor="rgba(239,68,68,0.35)",t.style.color="var(--crimson)"):(t.style.background="",t.style.borderColor="",t.style.color="")):(t.classList.remove("active"),t.style.background="",t.style.borderColor="",t.style.color="")})})});const P=o.querySelector("#localSearch");P&&(P.value=p,P.addEventListener("input",ye(()=>{p=P.value,n=1,y&&(y.value=p),h(),Q()},150))),o.querySelectorAll("[data-chip]").forEach(e=>{e.addEventListener("click",()=>{const t=e.getAttribute("data-chip");p=p.includes(t)?p.replace(t,"").replace(/\s{2,}/g," ").trim():p?`${p} ${t}`:t,n=1,P&&(P.value=p),y&&(y.value=p),h(),Q()})});let C="projected_points",L=-1,U=!1;o.querySelectorAll("th[data-sort]").forEach(e=>{e.style.cursor="pointer";const t=()=>{const r=e.getAttribute("data-sort");C===r?L*=-1:(C=r,L=r==="player_name"?1:-1),U=!0,n=1,h(),K()};e.addEventListener("click",t),e.addEventListener("keydown",r=>{(r.key==="Enter"||r.key===" ")&&(r.preventDefault(),t())})});function K(){const e=o.querySelector("#toggleProjSortDir");if(!e)return;const t=L===-1?"Highest → Lowest":"Lowest → Highest";e.textContent=`↕ ${t}`,e.title=`Currently ${t} by ${C}: click to flip`}(re=o.querySelector("#toggleProjSortDir"))==null||re.addEventListener("click",()=>{L*=-1,U=!0,n=1,h(),K()}),K();function be(e){for(const r of e)r._onRoster=G.has(String(r.player_id));let t=qe(e,p);return i&&u&&g!=="ALL"&&(t=t.filter(r=>(r.edge||"NEUTRAL")===g)),t}function te(e,t){let r=e[t];if((r==null||r===""||r==="—")&&t==="projected_points"&&(r=e.point_estimate),r==null||r===""||r==="—"||r==="–"||r==="-")return null;if(typeof r=="number")return isNaN(r)?null:r;const l=String(r).trim(),S=Number(l);return!isNaN(S)&&l!==""?S:l.toLowerCase()}function h(){var ne,le,ie,de;let e=be(k);const t=U?null:Ue(k);e=[...e].sort((a,v)=>{if(!U){const _=ue(a,{},t)-ue(v,{},t);if(_!==0)return _;const q=me(a,{},t)-me(v,{},t);if(q!==0)return q}const m=te(a,C),d=te(v,C);return m===null&&d===null?0:m===null?1:d===null?-1:typeof m=="number"&&typeof d=="number"?(m-d)*L:String(m).localeCompare(String(d))*L}),o.querySelectorAll("th[data-sort]").forEach(a=>{a.getAttribute("data-sort")===C?a.setAttribute("aria-sort",L===1?"ascending":"descending"):a.removeAttribute("aria-sort")});const r=e.length,l=Math.max(1,Math.ceil(r/O));n>l&&(n=l);const S=(n-1)*O,w=Math.min(S+O,r),T=e.slice(S,w),M=o.querySelector("#countLabel");M&&(r===0?M.textContent="0 players":M.textContent=`Showing ${S+1}–${w} of ${r} players${r!==k.length?` (filtered from ${k.length})`:""}${u&&g!=="ALL"?` · ${g} only`:""}`);const H=o.querySelector("#projBody"),oe=i&&u?15:9;T.length?(H.innerHTML=T.map(a=>{const v=a.position||a.position_group||"UNK",m=Number(a.projected_points??a.point_estimate??0),d=Number(a.projection_lower??a.lower_bound??Math.max(0,m-(a.width??5))),_=Number(a.projection_upper??a.upper_bound??m+(a.width??5)),q=Number(a.width??a.projection_width??(_-d)/2),ge=a.market_points!=null?Number(a.market_points).toFixed(1):"—",fe=a.fp_ecr!=null?`#${a.fp_ecr}${a.fp_ecr_pos?` (#${a.fp_ecr_pos} ${v})`:""}${a.fp_tier?` <span style="background:var(--violet-dim); color:var(--violet); border:1px solid rgba(168,85,247,0.18); border-radius:999px; padding:1px 5px; font:700 10px ui-monospace, SFMono-Regular,monospace">T${a.fp_tier}</span>`:""}`:"—",_e=a.fp_adp!=null?`#${a.fp_adp}`:"—",xe=i&&u?ve(a.edge):"",D=Ee(a.team),he=a.team?`<span class="badge" style="background:${D}1f; color:${D}; border:1px solid ${D}3d; font-weight:700">${ce(a.team,14)} ${B(a.team)}</span>`:"—",ke=a.edge==="BUY"?"var(--emerald)":a.edge==="SELL"?"var(--crimson)":D,we=i&&u?`<button class="chip" data-expand="${a.player_id}" aria-label="Show stat deltas for ${B(a.player_name)}" style="padding:4px 8px; font-size:11px">▶</button>`:"",pe=`
          <tr data-team="${a.team||""}" data-pid="${a.player_id}" class="clickable-row" style="cursor:pointer; --team-accent:${ke}; ${a.edge==="BUY"?"background:rgba(16,185,129,0.04)":a.edge==="SELL"?"background:rgba(239,68,68,0.04)":""}">
            <td><div class="player-cell">${Ne(a,32)}<div class="player-cell-info"><div class="player-cell-name">${B(a.player_name||a.player_id)}</div><div class="player-cell-sub">${ce(a.team,14)} ${B(a.team||"—")} ${a.model_pos_rank?`<span style="color:var(--text-faint)">· #${a.model_pos_rank} ${v}</span>`:""}</div></div></div></td>
            <td>${Pe(v)}</td>
            <td>${he}</td>
            <td class="mono" style="font-weight:700; color:var(--amber)">${m.toFixed(1)}</td>
            ${i&&u?`
            <td class="mono" style="color:var(--sky)">${ge}</td>
            <td>${De(a.delta_points)}</td>
            <td class="mono" style="font-size:11px; color:var(--text-muted)">${fe}</td>
            <td>${We(a.delta_rank)}</td>
            <td class="mono" style="font-size:11px; color:var(--text-muted)">${_e}</td>
            <td>${xe}</td>
            `:""}
            <td>${Ce({point:m,low:d,high:_,width:q,min:0,max:35})}</td>
            <td>${Be(a.wind_mph)}</td>
            <td>${Ae(q)}</td>
            <td>${Re(a.injury_status)} ${a.trending?'<span class="badge" style="background:var(--sky-dim); color:var(--sky); margin-left:6px">↗ trending</span>':""}</td>
            ${i&&u?`<td>${we}</td>`:""}
          </tr>
        `;if(i&&u&&a.stat_deltas&&a.stat_deltas.length){const $e=a.stat_deltas.filter(E=>E.market!=null||E.model!=null).slice(0,7).map(E=>`
            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding:4px 0; border-bottom:1px solid rgba(var(--text-rgb,0,0,0),0.06)">
              <span class="mono" style="font-size:11px; color:var(--text-muted); min-width:64px">${E.label}</span>
              ${Ye(E.model,E.market,E.delta)}
            </div>
          `).join(""),Se=a.opponent_team?`vs ${a.opponent_team}`:"";return pe+`<tr class="expand-panel" data-expand-panel="${a.player_id}" style="display:none; background:var(--surface-raised)"><td colspan="${oe}" style="padding:12px 12px 12px 48px"><div style="display:flex; flex-direction:column; gap:6px"><div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap"><span class="kicker">Stat deltas: Model vs Market</span><span class="mono" style="font-size:11px; color:var(--text-faint)">${B(a.player_name)} ${Se} · <span style="color:var(--amber)">amber=Model</span> <span style="color:var(--sky)">, blue=Market</span></span></div>${$e||'<span class="mono" style="font-size:11px; color:var(--text-faint)">No market stats for this player yet (preseason).</span>'}<div class="mono" style="font-size:11px; color:var(--text-faint); margin-top:6px">FP ECR #${a.fp_ecr??"—"} ${a.fp_ecr_pos?`(pos #${a.fp_ecr_pos})`:""} · ADP #${a.fp_adp??"—"} · Model #${a.model_overall_rank??"—"} (pos #${a.model_pos_rank??"—"}) · ΔRk ${a.delta_rank!=null?(a.delta_rank>0?"+":"")+a.delta_rank:"—"}</div></div></td></tr>`}return pe}).join(""),H.querySelectorAll("[data-expand]").forEach(a=>{a.addEventListener("click",v=>{v.stopPropagation();const m=a.getAttribute("data-expand"),d=H.querySelector(`[data-expand-panel="${m}"]`);if(!d)return;const _=d.style.display!=="none";d.style.display=_?"none":"table-row",a.textContent=_?"▶":"▼"})})):H.innerHTML=`<tr><td colspan="${oe}"><div class="empty">No matches for <code class="inline">${B(p||"—")}</code>${g!=="ALL"?` with edge ${g}`:""}. Try <code class="inline">pos:WR</code> or clear filters.</div></td></tr>`;const se=o.querySelector("#projCards");se&&(se.innerHTML=T.map(a=>{const v=ze(a,{showInterval:!0,showTeamLogo:!0});if(!i||!u)return v;const m=a.market_points!=null?`Market ${Number(a.market_points).toFixed(1)} · <span style="color:${Number(a.delta_points)>.5?"var(--emerald)":Number(a.delta_points)<-.5?"var(--crimson)":"var(--text-muted)"}">${a.delta_points>0?"+":""}${Number(a.delta_points).toFixed(1)}</span>`:"Market —",d=a.fp_ecr?`ECR #${a.fp_ecr} · Δ ${a.delta_rank!=null?(a.delta_rank>0?"+":"")+a.delta_rank:"—"}`:"ECR —",_=ve(a.edge);return v.replace(`</div>
`,`  <div style="margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; padding-top:8px; border-top:1px solid var(--border)"><span class="mono" style="font-size:11px; color:var(--text-muted)">${m}</span><span class="mono" style="font-size:11px; color:var(--text-muted)">${d}</span><span class="spacer"></span>${_}</div></div>
`)}).join("")),o.querySelectorAll("[data-pid]").forEach(a=>{a.classList.contains("expand-panel")||(a.style.cursor="pointer",a.addEventListener("click",v=>{if(v.target.closest("[data-expand]"))return;const m=a.getAttribute("data-pid"),d=k.find(_=>String(_.player_id)===String(m));d&&Fe(d,o)}))});const j=o.querySelector("#paginationControls");j&&(l<=1?j.innerHTML="":(j.innerHTML=`
          <div style="font:400 13px "Helvetica Neue", Helvetica,sans-serif; color:var(--text-muted)">
            Page <strong>${n}</strong> of <strong>${l}</strong>
          </div>
          <div style="display:flex; gap:6px">
            <button class="chip" id="firstPageBtn" ${n===1?'disabled style="opacity:0.4; cursor:not-allowed"':""}>« First</button>
            <button class="chip" id="prevPageBtn" ${n===1?'disabled style="opacity:0.4; cursor:not-allowed"':""}>‹ Prev</button>
            <button class="chip" id="nextPageBtn" ${n===l?'disabled style="opacity:0.4; cursor:not-allowed"':""}>Next ›</button>
            <button class="chip" id="lastPageBtn" ${n===l?'disabled style="opacity:0.4; cursor:not-allowed"':""}>Last »</button>
          </div>
        `,(ne=j.querySelector("#firstPageBtn"))==null||ne.addEventListener("click",()=>{n>1&&(n=1,h())}),(le=j.querySelector("#prevPageBtn"))==null||le.addEventListener("click",()=>{n>1&&(n--,h())}),(ie=j.querySelector("#nextPageBtn"))==null||ie.addEventListener("click",()=>{n<l&&(n++,h())}),(de=j.querySelector("#lastPageBtn"))==null||de.addEventListener("click",()=>{n<l&&(n=l,h())})))}function Q(){const e="projections";location.hash=p?`${e}?q=${encodeURIComponent(p)}`:e}h()}function ye(o,s=150){let c;return(...b)=>{clearTimeout(c),c=setTimeout(()=>o(...b),s)}}export{V as renderProjections};
