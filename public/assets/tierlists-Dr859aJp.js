import{z as S,e as M,h as _,r as T,p as L,i as C,t as R,o as A}from"./index-D75xmtCM.js";import{b as F,a as E}from"./relevance-C3SYLMeE.js";function W(a,{gap:r=2,cap:p=6,useFlex:u=!1}={}){if(!a||a.length===0)return[];const l=[...a].sort((c,o)=>(o.projected_points??o.point_estimate??0)-(c.projected_points??c.point_estimate??0)),d=P(l.map(c=>{const o=Number(c.width??c.projection_width??5);return Math.max(3,Math.min(14,o))})),f=Math.max(r,d*.7),g=[];let i=[];for(let c=0;c<l.length;c++){const o=l[c],n=l[c-1],h=n?n.projected_points??n.point_estimate??0:null,w=o.projected_points??o.point_estimate??0,x=h!==null?h-w:0;n&&(x>f||i.length>=p)&&(g.push(i),i=[]),i.push(o)}return i.length&&g.push(i),g.forEach((c,o)=>c.forEach(n=>{n.tier=o+1})),g}function P(a){if(!a.length)return 5;const r=[...a].sort((u,l)=>u-l),p=Math.floor(r.length/2);return r.length%2?r[p]:(r[p-1]+r[p])/2}const q=["QB","RB","WR","TE","FLEX"];async function I(a){var N,j;const r=new URLSearchParams(location.hash.split("?")[1]||""),p=(r.get("pos")||"WR").toUpperCase(),u=Number(r.get("gap")||2),l=Number(r.get("cap")||6),d=(r.get("view")||"week").toLowerCase(),[f,g]=await Promise.all([S({}),M({limit:2e3}).catch(()=>({players:[]}))]);let i=f.players||[];const c=new Map((g.players||[]).map(e=>[String(e.player_id),e]));for(const e of i){const t=c.get(String(e.player_id));t&&(e.market_season_stats=t.market_season_stats||null,e.auction=t.auction,e.modelAuction=t.auction,e.marketAuction=t.marketAuction,e.vor=t.vor)}const o=Number((N=f.meta)==null?void 0:N.week)||null,n=o?Math.max(1,18-o+1):9;d==="season"&&(i=i.map(e=>({...e,projected_points:Number(e.projected_points??0)*n,point_estimate:Number(e.point_estimate??0)*n,projection_lower:Number(e.projection_lower??e.lower_bound??0)*n,projection_upper:Number(e.projection_upper??e.upper_bound??0)*n,width:Number(e.width??5)*Math.sqrt(n),ros_weeks:n}))),p==="FLEX"?i=i.filter(e=>["RB","WR","TE"].includes((e.position||e.position_group||"").toUpperCase())):i=i.filter(e=>(e.position||e.position_group||"").toUpperCase()===p);const h=W(i,{gap:u,cap:l}),w=F(i),x=e=>Number(e.projected_points??e.point_estimate??0)||0;for(const e of h)e.sort((t,m)=>E(t,{},w)-E(m,{},w)||x(m)-x(t));a.innerHTML=`
    <div class="hero reveal in">
      <h1>Tiers <span class="badge" style="background:var(--color-primary); color:white; margin-left:8px; vertical-align:middle">${d==="season"?"SEASON ROS":o?`WEEK ${o}`:"WEEK"}</span></h1>
      <p>Deterministic tiers by point estimate.</p>
      <details style="margin-top:8px" aria-label="How tiering works">
        <summary style="cursor:pointer; font-weight:600" title="Toggle tiering explainer">How tiering works</summary>
        <p style="margin-top:8px">Deterministic: sorted by <code class="inline">point_estimate</code> then cut when gap &gt; <code class="inline">max(${u}, 0.7×median width)</code> or tier hits <code class="inline">cap=${l}</code>. No LLM. <strong>Week</strong> = next game (star-aware ±${d==="season"?"~15-35":"~6-10"}). <strong>Season</strong> = ROS `+(d==="season"?`${n} games${o?` (weeks ${o}-18)`:""} × weekly, width ×√${n}`:"weekly")+`: switch to <strong>FLEX</strong> for your 2-FLEX board (RB/WR/TE <code class="inline">×1.05</code>).</p>
      </details>
    </div>
    <div class="card reveal in" style="margin-top:12px">
      <div class="card-body row">
        <div class="filters">
          <button class="chip ${d==="week"?"active":""}" data-view="week">Week</button>
          <button class="chip ${d==="season"?"active":""}" data-view="season">Season ROS</button>
          <span class="divider" style="width:1px; height:24px; background:var(--border); margin:0 4px"></span>
          ${q.map(e=>`<button class="chip ${e===p?"active":""}" data-pos="${e}">${e}</button>`).join("")}
        </div>
        <div class="spacer"></div>
        <label class="faint" style="font:500 12px "Helvetica Neue", Helvetica, sans-serif">gap <input id="gapInput" type="number" step="0.5" min="0.5" max="6" value="${u}" style="width:64px; background:var(--surface-raised); border:1px solid var(--border); color:var(--text); border-radius:8px; padding:6px 8px; margin-left:6px"></label>
        <label class="faint" style="font:500 12px "Helvetica Neue", Helvetica, sans-serif; margin-left:8px">cap <input id="capInput" type="number" step="1" min="3" max="12" value="${l}" style="width:64px; background:var(--surface-raised); border:1px solid var(--border); color:var(--text); border-radius:8px; padding:6px 8px; margin-left:6px"></label>
        <button class="btn btn-ghost btn-sm" id="copyMd" title="Copy tiers as markdown">Copy markdown</button>
      </div>
    </div>

    ${i.length?`<div style="margin-top:16px; display:flex; flex-direction:column; gap:12px">
        ${h.map((e,t)=>{const m=e.map(s=>Number(s.projected_points??s.point_estimate??0)||0),b=Math.max(...m),v=Math.min(...m);return`
          <div class="tier reveal in">
            <div class="tier-head"><strong style="color:${H(t)}">Tier ${t+1}</strong><span class="micro faint">${e.length} players · ${b.toFixed(1)} → ${v.toFixed(1)} pts</span></div>
            <div class="tier-body">
              ${e.map(s=>`
                <div class="player-card" data-pid="${_(s.player_id||"")}" style="--team-accent:${T((s.team||"").toUpperCase())}; border-top:1px solid var(--team-accent); background:linear-gradient(90deg, color-mix(in srgb, var(--team-accent) 7%, var(--surface-raised)) 0%, var(--surface-raised) 50%); cursor:pointer">
                  <div class="row" style="gap:8px">${L(s,28)} <div style="flex:1; min-width:0"><div class="row" style="gap:6px">${C(s.position||s.position_group)} <span class="name">${_(s.player_name||s.player_id)}</span></div><div class="meta">${R(s.team,14)} ${_(s.team||"—")} vs ${_(s.opponent_team||"—")} · ${s.wind_mph?`${Number(s.wind_mph).toFixed(0)} mph`:"—"}</div></div></div>
                  <div class="pts">${Number(s.projected_points??s.point_estimate??0).toFixed(1)} <span style="font:500 11px ui-monospace, SFMono-Regular, monospace; color:var(--text-muted)">±${Number(s.width??5).toFixed(1)}</span></div>
                </div>
              `).join("")}
            </div>
          </div>
        `}).join("")}
       </div>`:`<div class="card reveal in" style="margin-top:16px"><div class="empty">No players for <strong>${p}</strong> yet. Refresh in-season or check <code class="inline">Projections</code>: tiering needs <code class="inline">projected_points</code>.</div></div>`}
  `,a.querySelectorAll("[data-pid]").forEach(e=>{e.addEventListener("click",()=>{const t=e.getAttribute("data-pid"),m=i.find(b=>String(b.player_id)===String(t));m&&A(m,a)})}),a.querySelectorAll("[data-pos]").forEach(e=>{e.addEventListener("click",()=>{const t=e.getAttribute("data-pos");location.hash=`tierlists?pos=${t}&gap=${u}&cap=${l}&view=${d}`})}),a.querySelectorAll("[data-view]").forEach(e=>{e.addEventListener("click",()=>{const t=e.getAttribute("data-view");location.hash=`tierlists?pos=${p}&gap=${u}&cap=${l}&view=${t}`})});const y=a.querySelector("#gapInput"),$=a.querySelector("#capInput");function k(){location.hash=`tierlists?pos=${p}&gap=${Number(y.value)||2}&cap=${Number($.value)||6}&view=${d}`}y==null||y.addEventListener("change",k),$==null||$.addEventListener("change",k),(j=a.querySelector("#copyMd"))==null||j.addEventListener("click",()=>{const e=h.map((m,b)=>`### Tier ${b+1}
`+m.map(v=>`- ${v.player_name||v.player_id} (${v.position||v.position_group}) - ${Number(v.projected_points??0).toFixed(1)} pts`).join(`
`)).join(`

`);navigator.clipboard.writeText(e||"No tiers yet");const t=a.querySelector("#copyMd");t&&(t.textContent="Copied",setTimeout(()=>t.textContent="Copy markdown",1200))})}function H(a){const r=["var(--amber)","var(--sky)","var(--emerald)","var(--violet)","var(--pos-k)","var(--pos-def)"];return r[a%r.length]}export{I as renderTierlists};
