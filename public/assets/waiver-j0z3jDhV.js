import{b as R,d as C,c as N,e as E,h as o,L as q,p as y,o as x,r as z,t as b,i as S}from"./index-v73tIri3.js";import{g as W,s as H,r as O,b as U}from"./teamSelector-B6EEvO6X.js";const M=["QB","RB","WR","TE","K","DEF"],k={improvement_desc:{label:"Δ roster: high to low",cmp:(a,t)=>(t.improvement_over_roster??-1/0)-(a.improvement_over_roster??-1/0)},points_desc:{label:"Proj points: high to low",cmp:(a,t)=>(t.projected_points??-1/0)-(a.projected_points??-1/0)},points_asc:{label:"Proj points: low to high",cmp:(a,t)=>(a.projected_points??1/0)-(t.projected_points??1/0)}};function L(a){return a.length?`
    <div class="responsive-view">
      <div class="table-wrap" style="border:0; border-radius:0"><table>
        <thead><tr><th aria-sort="none">#</th><th aria-sort="none">Player</th><th aria-sort="none">Pos</th><th aria-sort="none">Proj</th><th aria-sort="none">Δ roster</th><th aria-sort="none">Replaces</th><th aria-sort="none">Conf</th></tr></thead>
        <tbody>
          ${a.map(t=>`
            <tr data-pid="${o(t.player_id||"")}" data-team="${t.team||""}" style="--team-accent:${z((t.team||"").toUpperCase())}; cursor:pointer">
              <td class="mono">${t.waiver_priority??"—"}</td>
              <td><div class="player-cell">${y(t,28)}<div class="player-cell-info"><div class="player-cell-name">${o(t.player_name||t.player_id)}</div><div class="player-cell-sub">${b(t.team,14)} ${o(t.team||"")}</div></div></div></td>
              <td>${S(t.position)}</td>
              <td class="mono">${Number(t.projected_points??0).toFixed(1)}</td>
              <td class="mono" style="color:var(--emerald)">+${Number(t.improvement_over_roster??0).toFixed(1)}</td>
              <td class="faint">${o(t.replaces_player_name||t.replaces_player_id||"open FLEX")}</td>
              <td class="faint">${t.confidence||"—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table></div>
      <div class="player-cards-grid" style="padding:12px">
        ${a.map(t=>`
          <div class="player-card" data-pid="${o(t.player_id||"")}" style="cursor:pointer">
            <div style="display:flex; justify-content:space-between; align-items:center">
              <div style="display:flex; align-items:center; gap:8px">
                ${y(t,32)}
                <div>
                  <div style="font-weight:600">${o(t.player_name||t.player_id)}</div>
                  <div style="font-size:11px; color:var(--text-muted)">${S(t.position)} · ${b(t.team,12)} ${o(t.team||"")}</div>
                </div>
              </div>
              <div style="text-align:right">
                <div class="mono" style="color:var(--emerald); font-weight:700">+${Number(t.improvement_over_roster??0).toFixed(1)}</div>
                <div style="font-size:11px; color:var(--text-muted)">Proj ${Number(t.projected_points??0).toFixed(1)}</div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `:'<div class="empty">No waiver candidates match these filters.</div>'}async function Q(a){var u,w,_;const t=await R().catch(()=>null),d=(t==null?void 0:t.leagueRosters)||(t==null?void 0:t.allTeams)||[];let l=W();!l&&d.length&&(l=String(d[0].roster_id),H(l));const c=d.find(e=>String(e.roster_id)===String(l)),j=(c==null?void 0:c.owner_id)||null,[A,g,F]=await Promise.all([C({owner_id:j}),N(),E({limit:2e3}).catch(()=>({players:[]}))]),s=A.recommendations||[],I=new Map((F.players||[]).map(e=>[String(e.player_id),e]));for(const e of s){const i=I.get(String(e.player_id));i&&(e.market_season_stats=i.market_season_stats||null,e.auction=i.auction,e.modelAuction=i.auction,e.marketAuction=i.marketAuction,e.vor=i.vor)}const p=g.trending_adds||[],f=g.fantasypros_news||[],P=[...new Set(s.map(e=>(e.team||"").toUpperCase()).filter(Boolean))].sort(),n={pos:"ALL",team:"ALL",sort:"improvement_desc"};function T(){return s.filter(e=>n.pos==="ALL"||(e.position||"").toUpperCase()===n.pos).filter(e=>n.team==="ALL"||(e.team||"").toUpperCase()===n.team).sort(k[n.sort].cmp)}function h(e){const i=a.querySelector("#waiverBoard");i&&i.querySelectorAll("[data-pid]").forEach(r=>{r.addEventListener("click",()=>{const m=r.getAttribute("data-pid"),$=e.find(B=>String(B.player_id)===String(m));$&&x($,a)})})}function v(){const e=T(),i=a.querySelector("#waiverBoard"),r=a.querySelector("#waiverCount");i&&(i.innerHTML=L(e)),r&&(r.textContent=s.length?`${e.length} of ${s.length} candidates`:"no data"),h(e)}a.innerHTML=`
    <div class="hero reveal in">
      <h1>Waivers</h1>
      <p>Ranked by improvement over roster, not raw points. Free agents only — rostered players never appear here.</p>
      ${d.length?`<div style="margin-top:8px; max-width:280px">${O(d,l)}</div>`:""}
      <details style="margin-top:8px" aria-label="How waiver priority works">
        <summary style="cursor:pointer; font-weight:600" title="Toggle waiver explainer">How priority works</summary>
        <p style="margin-top:8px">Ranked by <code class="inline">improvement_over_roster</code> (<code class="inline">decision.py:get_waiver_priority</code>), not raw points. A 12-pt WR who replaces your 4-pt WR is worth more than a 13-pt QB you don't need.</p>
      </details>
    </div>

    ${f.length?`
      <div class="card reveal in" style="margin-top:12px">
        <div class="card-header"><h3>Breaking News &amp; Fantasy Impact</h3><span class="kicker">from FantasyPros API</span></div>
        <div class="card-body" style="display:flex; flex-direction:column; gap:10px">
          ${f.slice(0,6).map(e=>`
            <div style="padding:10px 12px; background:var(--surface-raised); border-radius:8px; border:1px solid var(--border)">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px">
                <strong style="font-size:14px; color:var(--text)">${o(e.title||"")}</strong>
                <span class="mono" style="font-size:11px; color:var(--text-muted)">${o(e.created_formated||"")}</span>
              </div>
              ${e.link?(()=>{const i=q(e.link);return i?`<a href="${i}" target="_blank" rel="noopener" style="font-size:12px; color:var(--sky); text-decoration:none">Read on FantasyPros →</a>`:""})():""}
            </div>
          `).join("")}
        </div>
      </div>
    `:""}

    ${p.length?`
      <div class="card reveal in" style="margin-top:12px">
        <div class="card-header"><h3>Trending adds</h3><span class="kicker">from Sleeper — ${p.length} players</span></div>
        <div class="card-body row" style="gap:8px; flex-wrap:wrap">
          ${p.slice(0,12).map(e=>`<button class="badge trending-badge" data-trending-pid="${e.player_id||""}" style="background:var(--sky-dim); color:var(--sky); border:1px solid rgba(56,189,248,0.2); display:inline-flex; align-items:center; gap:6px; cursor:pointer; font:inherit; padding:4px 8px">${e.player_id?y({player_id:e.player_id,player_name:e.player_name||"",position:e.position||"",team:e.team||""},20):""}${o(e.player_name||e.player_id||JSON.stringify(e).slice(0,24))}${e.count?`<span class="mono" style="font-size:10px; opacity:0.7">${(e.count/1e3).toFixed(1)}k</span>`:""}</button>`).join("")}
        </div>
      </div>
    `:""}

    <div class="card reveal in" style="margin-top:16px">
      <div class="card-header"><h3>Priority board</h3><span class="kicker" id="waiverCount">${s.length?`${s.length} candidates`:"no data"}</span></div>
      ${s.length?`
        <div class="card-body" style="display:flex; gap:10px; flex-wrap:wrap; padding-bottom:0">
          <select id="waiverPosFilter" class="team-select-dropdown" style="width:auto">
            <option value="ALL">All positions</option>
            ${M.map(e=>`<option value="${e}">${e}</option>`).join("")}
          </select>
          <select id="waiverTeamFilter" class="team-select-dropdown" style="width:auto">
            <option value="ALL">All NFL teams</option>
            ${P.map(e=>`<option value="${e}">${e}</option>`).join("")}
          </select>
          <select id="waiverSort" class="team-select-dropdown" style="width:auto">
            ${Object.entries(k).map(([e,i])=>`<option value="${e}">${o(i.label)}</option>`).join("")}
          </select>
        </div>
      `:""}
      <div class="card-body" id="waiverBoard" style="padding:0">
        ${L(s)}
      </div>
    </div>
  `,U(()=>Q(a)),(u=a.querySelector("#waiverPosFilter"))==null||u.addEventListener("change",e=>{n.pos=e.target.value,v()}),(w=a.querySelector("#waiverTeamFilter"))==null||w.addEventListener("change",e=>{n.team=e.target.value,v()}),(_=a.querySelector("#waiverSort"))==null||_.addEventListener("change",e=>{n.sort=e.target.value,v()}),h(s),a.querySelectorAll("[data-trending-pid]").forEach(e=>{e.addEventListener("click",()=>{const i=e.getAttribute("data-trending-pid"),r=p.find(m=>String(m.player_id)===String(i));r&&x({player_id:r.player_id,player_name:r.player_name||"",position:r.position||"",team:r.team||""},a)})})}export{Q as renderWaiver};
