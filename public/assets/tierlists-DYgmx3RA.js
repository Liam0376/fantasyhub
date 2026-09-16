import{x as j,g as N,e as w,m as S,p as E,j as M,t as T,o as L}from"./index-BUQ5dhSf.js";import{b as C,a as k}from"./relevance-C3SYLMeE.js";function R(a,{gap:o=2,cap:c=6,useFlex:u=!1}={}){if(!a||a.length===0)return[];const p=[...a].sort((n,r)=>(r.projected_points??r.point_estimate??0)-(n.projected_points??n.point_estimate??0)),l=A(p.map(n=>{const r=Number(n.width??n.projection_width??5);return Math.max(3,Math.min(14,r))})),x=Math.max(o,l*.7),v=[];let i=[];for(let n=0;n<p.length;n++){const r=p[n],m=p[n-1],b=m?m.projected_points??m.point_estimate??0:null,h=r.projected_points??r.point_estimate??0,y=b!==null?b-h:0;m&&(y>x||i.length>=c)&&(v.push(i),i=[]),i.push(r)}return i.length&&v.push(i),v.forEach((n,r)=>n.forEach(m=>{m.tier=r+1})),v}function A(a){if(!a.length)return 5;const o=[...a].sort((u,p)=>u-p),c=Math.floor(o.length/2);return o.length%2?o[c]:(o[c-1]+o[c])/2}const F=["QB","RB","WR","TE","FLEX"];async function W(a){var _;const o=new URLSearchParams(location.hash.split("?")[1]||""),c=(o.get("pos")||"WR").toUpperCase(),u=Number(o.get("gap")||2),p=Number(o.get("cap")||6),l=(o.get("view")||"week").toLowerCase(),[x,v]=await Promise.all([j({}),N({limit:2e3}).catch(()=>({players:[]}))]);let i=x.players||[];const n=new Map((v.players||[]).map(e=>[String(e.player_id),e]));for(const e of i){const t=n.get(String(e.player_id));t&&(e.market_season_stats=t.market_season_stats||null,e.auction=t.auction,e.gridironAuction=t.auction,e.marketAuction=t.marketAuction,e.vor=t.vor)}l==="season"&&(i=i.map(t=>({...t,projected_points:Number(t.projected_points??0)*9,point_estimate:Number(t.point_estimate??0)*9,projection_lower:Number(t.projection_lower??t.lower_bound??0)*9,projection_upper:Number(t.projection_upper??t.upper_bound??0)*9,width:Number(t.width??5)*Math.sqrt(9),ros_weeks:9}))),c==="FLEX"?i=i.filter(e=>["RB","WR","TE"].includes((e.position||e.position_group||"").toUpperCase())):i=i.filter(e=>(e.position||e.position_group||"").toUpperCase()===c);const r=R(i,{gap:u,cap:p}),m=C(i),b=e=>Number(e.projected_points??e.point_estimate??0)||0;for(const e of r)e.sort((t,d)=>k(t,{},m)-k(d,{},m)||b(d)-b(t));a.innerHTML=`
    <div class="hero reveal in">
      <h1>Tiers <span class="badge" style="background:var(--color-primary); color:white; margin-left:8px; vertical-align:middle">${l==="season"?"SEASON ROS":"WEEK 10"}</span></h1>
      <p>Deterministic tiers by point estimate.</p>
      <details style="margin-top:8px" aria-label="How tiering works">
        <summary style="cursor:pointer; font-weight:600" title="Toggle tiering explainer">How tiering works</summary>
        <p style="margin-top:8px">Deterministic: sorted by <code class="inline">point_estimate</code> then cut when gap &gt; <code class="inline">max(${u}, 0.7×median width)</code> or tier hits <code class="inline">cap=${p}</code>. No LLM. <strong>Week</strong> = next game (star-aware ±${l==="season"?"~15-35":"~6-10"}). <strong>Season</strong> = ROS `+(l==="season"?"9 games (weeks 10-18) × weekly, width ×√9":"weekly")+`: switch to <strong>FLEX</strong> for your 2-FLEX board (RB/WR/TE <code class="inline">×1.05</code>).</p>
      </details>
    </div>
    <div class="card reveal in" style="margin-top:12px">
      <div class="card-body row">
        <div class="filters">
          <button class="chip ${l==="week"?"active":""}" data-view="week">Week</button>
          <button class="chip ${l==="season"?"active":""}" data-view="season">Season ROS</button>
          <span class="divider" style="width:1px; height:24px; background:var(--border); margin:0 4px"></span>
          ${F.map(e=>`<button class="chip ${e===c?"active":""}" data-pos="${e}">${e}</button>`).join("")}
        </div>
        <div class="spacer"></div>
        <label class="faint" style="font:500 12px "Helvetica Neue", Helvetica, sans-serif">gap <input id="gapInput" type="number" step="0.5" min="0.5" max="6" value="${u}" style="width:64px; background:var(--surface-raised); border:1px solid var(--border); color:var(--text); border-radius:8px; padding:6px 8px; margin-left:6px"></label>
        <label class="faint" style="font:500 12px "Helvetica Neue", Helvetica, sans-serif; margin-left:8px">cap <input id="capInput" type="number" step="1" min="3" max="12" value="${p}" style="width:64px; background:var(--surface-raised); border:1px solid var(--border); color:var(--text); border-radius:8px; padding:6px 8px; margin-left:6px"></label>
        <button class="btn btn-ghost btn-sm" id="copyMd" title="Copy tiers as markdown">Copy markdown</button>
      </div>
    </div>

    ${i.length?`<div style="margin-top:16px; display:flex; flex-direction:column; gap:12px">
        ${r.map((e,t)=>{const d=e.map(s=>Number(s.projected_points??s.point_estimate??0)||0),f=Math.max(...d),g=Math.min(...d);return`
          <div class="tier reveal in">
            <div class="tier-head"><strong style="color:${P(t)}">Tier ${t+1}</strong><span class="micro faint">${e.length} players · ${f.toFixed(1)} → ${g.toFixed(1)} pts</span></div>
            <div class="tier-body">
              ${e.map(s=>`
                <div class="player-card" data-pid="${w(s.player_id||"")}" style="--team-accent:${S((s.team||"").toUpperCase())}; border-top:1px solid var(--team-accent); background:linear-gradient(90deg, color-mix(in srgb, var(--team-accent) 7%, var(--surface-raised)) 0%, var(--surface-raised) 50%); cursor:pointer">
                  <div class="row" style="gap:8px">${E(s,28)} <div style="flex:1; min-width:0"><div class="row" style="gap:6px">${M(s.position||s.position_group)} <span class="name">${w(s.player_name||s.player_id)}</span></div><div class="meta">${T(s.team,14)} ${w(s.team||"—")} vs ${w(s.opponent_team||"—")} · ${s.wind_mph?`${Number(s.wind_mph).toFixed(0)} mph`:"—"}</div></div></div>
                  <div class="pts">${Number(s.projected_points??s.point_estimate??0).toFixed(1)} <span style="font:500 11px ui-monospace, SFMono-Regular, monospace; color:var(--text-muted)">±${Number(s.width??5).toFixed(1)}</span></div>
                </div>
              `).join("")}
            </div>
          </div>
        `}).join("")}
       </div>`:`<div class="card reveal in" style="margin-top:16px"><div class="empty">No players for <strong>${c}</strong> yet. Refresh in-season or check <code class="inline">Projections</code>: tiering needs <code class="inline">projected_points</code>.</div></div>`}
  `,a.querySelectorAll("[data-pid]").forEach(e=>{e.addEventListener("click",()=>{const t=e.getAttribute("data-pid"),d=i.find(f=>String(f.player_id)===String(t));d&&L(d,a)})}),a.querySelectorAll("[data-pos]").forEach(e=>{e.addEventListener("click",()=>{const t=e.getAttribute("data-pos");location.hash=`tierlists?pos=${t}&gap=${u}&cap=${p}&view=${l}`})}),a.querySelectorAll("[data-view]").forEach(e=>{e.addEventListener("click",()=>{const t=e.getAttribute("data-view");location.hash=`tierlists?pos=${c}&gap=${u}&cap=${p}&view=${t}`})});const h=a.querySelector("#gapInput"),y=a.querySelector("#capInput");function $(){location.hash=`tierlists?pos=${c}&gap=${Number(h.value)||2}&cap=${Number(y.value)||6}&view=${l}`}h==null||h.addEventListener("change",$),y==null||y.addEventListener("change",$),(_=a.querySelector("#copyMd"))==null||_.addEventListener("click",()=>{const e=r.map((d,f)=>`### Tier ${f+1}
`+d.map(g=>`- ${g.player_name||g.player_id} (${g.position||g.position_group}) - ${Number(g.projected_points??0).toFixed(1)} pts`).join(`
`)).join(`

`);navigator.clipboard.writeText(e||"No tiers yet");const t=a.querySelector("#copyMd");t&&(t.textContent="Copied",setTimeout(()=>t.textContent="Copy markdown",1200))})}function P(a){const o=["var(--amber)","var(--sky)","var(--emerald)","var(--violet)","var(--pos-k)","var(--pos-def)"];return o[a%o.length]}export{W as renderTierlists};
