import{b as O,e as o,L as X,m as V,p as Y,j as Z,q as ee,t as te,g as ae,h as se,f as re,k as ie}from"./index-DBtAjWzC.js";import{c as ne,v as oe,a as de}from"./vbdAuction-DL7xlJRA.js";import"./auctionMath-BPp13K9h.js";async function pe(n){const B=new URLSearchParams(location.hash.split("?")[1]||"");let z=B.get("team_a")||"1",P=B.get("team_b")||"2";n.innerHTML=`
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

    <!-- Dual Roster Checkbox Columns -->
    <div class="grid grid-2 reveal in" style="margin-top:16px">
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

    <div class="card reveal in" style="margin-top:20px; background:var(--surface-raised)">
      <div class="card-header row align-between">
        <h3>Trade VBD</h3>
        <button class="btn btn-primary" id="runVbdBtn">Evaluate</button>
      </div>
      <div class="card-body" id="vbdResult">
        <div class="faint" style="font-size:12px">Click Evaluate for full roster VBD.</div>
      </div>
    </div>
  `;const $=n.querySelector("#selectTeamA"),h=n.querySelector("#selectTeamB"),k=n.querySelector("#tradeSummaryBanner"),q=n.querySelector("#teamARoster"),j=n.querySelector("#teamBRoster"),F=n.querySelector("#teamAHeader"),U=n.querySelector("#teamBHeader"),I=n.querySelector("#teamASub"),D=n.querySelector("#teamBSub"),G=n.querySelector("#runVbdBtn"),w=n.querySelector("#vbdResult"),_=new Map;let f=null,b=null;const g=new Set,y=new Set;let u=null,S=null;async function W(){return u||S||(S=(async()=>{try{const a=await ae({limit:800}),r=(a==null?void 0:a.players)||[];if(r.length){const t=await se(re,ie).catch(()=>null);u=ne(r,t)}}catch{u=null}return u})(),S)}try{const a=await O(),r=(a==null?void 0:a.allTeams)||(a==null?void 0:a.leagueRosters)||[];r.length>0&&($.innerHTML=r.map(t=>`<option value="${t.roster_id||t.owner_id}" ${String(t.roster_id||t.owner_id)===String(z)?"selected":""}>${o(t.team_name||t.display_name||`Team ${t.roster_id}`)} (${o(t.owner_name||t.display_name||"")})</option>`).join(""),h.innerHTML=r.map(t=>`<option value="${t.roster_id||t.owner_id}" ${String(t.roster_id||t.owner_id)===String(P)?"selected":""}>${o(t.team_name||t.display_name||`Team ${t.roster_id}`)} (${o(t.owner_name||t.display_name||"")})</option>`).join(""))}catch(a){console.error("Failed to load team list:",a)}async function J(a){const r=String(a);if(_.has(r))return _.get(r);const t=await O({roster_id:r});return _.set(r,t),t}async function A(a){var v,c;const r=a==="A",t=r?$.value:h.value,m=r?q:j,e=r?F:U,d=r?g:y;if(!t)return;_.has(String(t))||(m.innerHTML='<div class="empty">Loading team roster…</div>');const i=await J(t);r?f=i:b=i;const l=((v=i==null?void 0:i.teamMeta)==null?void 0:v.team_name)||((c=i==null?void 0:i.teamMeta)==null?void 0:c.owner_name)||`Team ${t}`;e.textContent=`${l} (${r?"Sending":"Receiving"})`,K(m,R(i),a,d),L(),H()}function L(){I.textContent=`${g.size} player${g.size===1?"":"s"} selected`,D.textContent=`${y.size} player${y.size===1?"":"s"} selected`}function K(a,r,t,m){if(!r||r.length===0){a.innerHTML='<div class="empty">No roster players found</div>';return}a.innerHTML=`
      <div style="display:flex; flex-direction:column">
        ${r.map(e=>{const d=String(e.player_id||e.id),i=m.has(d),l=Number(e.gridiron_points??e.model_points??e.projected_points??0).toFixed(1),v=Number(e.model_season_points??l*17).toFixed(0),c=e.auction_price_paid??e.auction??e.marketAuction??0;return`
            <label class="row align-between" style="padding:10px 14px; cursor:pointer; background:${i?"var(--surface-raised)":"transparent"}; border-bottom:1px solid var(--border); transition:background 0.15s; border-top:1px solid ${V((e.team||"").toUpperCase())}">
              <div class="row align-center" style="gap:10px">
                <input type="checkbox" class="trade-check" data-side="${t}" data-pid="${d}" ${i?"checked":""} title="Select ${o(e.player_name||e.full_name||d)} for trade" style="width:16px; height:16px; cursor:pointer" />
                <span style="width:8px; height:8px; border-radius:50%; background:${V((e.team||"").toUpperCase())}; flex-shrink:0" aria-hidden="true"></span>
                ${Y(e,28)}
                <div>
                  <div class="row align-center" style="gap:6px">
                    <strong style="font-size:13px">${o(e.player_name||e.full_name||d)}</strong>
                    ${Z(e.position)}
                    ${e.injury_status?ee(e.injury_status):""}
                  </div>
                  <div class="micro faint" style="margin-top:2px; display:flex; align-items:center; gap:4px">
                    <span class="slot-tag" style="font-size:10px; font-weight:700; letter-spacing:0.3px; padding:1px 5px; border-radius:4px; background:${e.slot&&e.slot!=="BENCH"&&e.slot!=="IR"?"rgba(56,189,248,0.12); color:var(--sky); border:1px solid rgba(56,189,248,0.25)":e.slot==="IR"?"rgba(244,63,94,0.12); color:var(--crimson); border:1px solid rgba(244,63,94,0.25)":"rgba(148,163,184,0.12); color:var(--text-muted); border:1px solid rgba(148,163,184,0.2)"}">${o(e.slot||(e.position&&!e.team?"IR":"BENCH"))}</span>
                    <span>Draft Cost: $${c}</span> · ${te(e.team,14)} <span>${e.team||"FA"} ${e.opponent_team?`vs ${e.opponent_team}`:""}</span>
                  </div>
                </div>
              </div>
              <div style="text-align:right">
                <div class="mono" style="font-weight:700; font-size:13px; color:var(--accent)">${l} <span class="micro faint">pts/wk</span></div>
                <div class="micro faint mono">${v} pts ROS</div>
              </div>
            </label>
          `}).join("")}
      </div>
    `,a.querySelectorAll(".trade-check").forEach(e=>{e.addEventListener("change",d=>{const i=d.target.dataset.pid,l=d.target.dataset.side==="A"?g:y;d.target.checked?l.add(i):l.delete(i),L(),H()})})}async function H(){var N,C;await W();const a=R(f).filter(s=>g.has(String(s.player_id||s.id))),r=R(b).filter(s=>y.has(String(s.player_id||s.id))),t=((N=f==null?void 0:f.teamMeta)==null?void 0:N.team_name)||"Team A",m=((C=b==null?void 0:b.teamMeta)==null?void 0:C.team_name)||"Team B";if(a.length===0&&r.length===0){k.innerHTML=`
        <div class="alert alert-info" style="font-size:13px">
          Check players in <strong>${o(t)}</strong> and <strong>${o(m)}</strong> rosters above to calculate trade model impact.
        </div>
      `;return}const e=s=>{if(!s)return 0;if(s.auction!=null&&Number(s.auction)!==0)return Number(s.auction);if(s.gridironAuction!=null&&Number(s.gridironAuction)!==0)return Number(s.gridironAuction);const p=(s.position||"").toUpperCase(),M=Number(s.model_season_points??s.modelSeasonPoints??(s.gridiron_points??s.model_points??s.projected_points??0)*17);if(u){const T=oe(M,p,u),E=de(M,p,u);return T>1?T:E>0?Math.max(T,E):T}return Number(s.auction_price_paid??s.auction??1)},d=a.reduce((s,p)=>s+e(p),0),i=r.reduce((s,p)=>s+e(p),0),l=i-d;let v="EVEN / FAIR TRADE",c="var(--text-muted)",x="var(--surface-raised)";l>=8?(v=`WIN FOR ${t.toUpperCase()}`,c="var(--emerald)",x="rgba(16,185,129,0.1)"):l>=5?(v=`LEAN TO ${t.toUpperCase()}`,c="var(--emerald)",x="rgba(16,185,129,0.07)"):l<=-8?(v=`WIN FOR ${m.toUpperCase()}`,c="var(--amber)",x="rgba(245,158,11,0.1)"):l<=-5&&(v=`LEAN TO ${m.toUpperCase()}`,c="var(--amber)",x="rgba(245,158,11,0.07)"),k.innerHTML=`
      <div class="card" style="border-top:1px solid ${c}; background:${x}">
        <div class="card-body">
          <div class="row align-between align-center" style="flex-wrap:wrap; gap:12px">
            <div>
              <div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px">Trade verdict: $ VOR ROS</div>
              <h2 style="margin:2px 0 0; color:${c}">${o(v)}</h2>
            </div>
            <div class="row" style="gap:24px; flex-wrap:wrap">
              <div class="stat">
                <div class="stat-value mono ${l>=0?"text-ok":"text-bad"}" style="font-size:20px">
                  ${l>=0?"+":""}$${l.toFixed(0)}
                </div>
                <div class="stat-label">${o(t)} Net $ VOR ROS</div>
              </div>
              <div class="stat">
                <div class="stat-value mono" style="font-size:20px">$${d} vs $${i}</div>
                <div class="stat-label">$ VOR Traded · $${d} vs $${i}</div>
              </div>
            </div>
          </div>

          <div class="divider" style="margin:14px 0"></div>

          <div class="grid grid-2" style="font-size:12px">
            <div>
              <strong style="color:var(--text)">${o(t)} Gives ($${d} $ VOR ROS):</strong>
              ${a.length?a.map(s=>{const p=e(s);return`
                <div class="row align-between" style="padding:3px 0">
                  <span>${o(s.player_name)} (${s.position})</span>
                  <span class="mono faint">$${p} $ VOR</span>
                </div>
              `}).join(""):'<div class="faint">No players selected</div>'}
            </div>
            <div>
              <strong style="color:var(--text)">${o(m)} Gives ($${i} $ VOR ROS):</strong>
              ${r.length?r.map(s=>{const p=e(s);return`
                <div class="row align-between" style="padding:3px 0">
                  <span>${o(s.player_name)} (${s.position})</span>
                  <span class="mono faint">$${p} $ VOR</span>
                </div>
              `}).join(""):'<div class="faint">No players selected</div>'}
            </div>
          </div>
        </div>
      </div>
    `}async function Q(){w.innerHTML='<div class="empty">Running positional VBD analysis…</div>';try{const a=await X($.value,h.value);if(!a){w.innerHTML='<div class="alert alert-warn">Trade evaluation returned no result.</div>';return}w.innerHTML=`
        <div class="row align-between" style="margin-bottom:12px">
          <div>
            <div class="micro faint">Recommendation</div>
            <strong style="font-size:15px; color:var(--accent)">${o(a.winner||a.recommendation||"—")}</strong>
          </div>
          <div class="mono" style="font-size:13px">
            Diff: <span style="color:var(--amber); font-weight:700">${Number(a.value_difference??0).toFixed(1)}</span> VBD pts ROS
          </div>
        </div>
        <div class="faint" style="font-size:12px">${o(a.recommendation||"")}</div>
      `}catch{w.innerHTML='<div class="alert alert-bad">Trade evaluation failed. See console.</div>'}}$.addEventListener("change",()=>{g.clear(),A("A")}),h.addEventListener("change",()=>{y.clear(),A("B")}),G.addEventListener("click",Q),await Promise.all([A("A"),A("B")])}function R(n){return n?[...n.starters||[],...Array.isArray(n.bench)?n.bench:[],...Array.isArray(n.reserve)?n.reserve:[]]:[]}export{pe as renderTrade};
