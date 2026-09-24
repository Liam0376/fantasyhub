import{k as ee,h as l,M as je,r as te,p as se,i as ae,j as Se,t as Re,J as Te,e as ke,m as Ne,f as Ae,q as Be}from"./index-Cu44jiVg.js";import{c as Le,v as Me,a as He}from"./vbdAuction-B1XxIVHx.js";import"./auctionMath-Bpdt11Uq.js";async function Ce(_){const P=new URLSearchParams(location.hash.split("?")[1]||"");let re=P.get("team_a")||"1",ne=P.get("team_b")||"2";_.innerHTML=`
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

    <div class="card reveal in" style="margin-top:20px; background:var(--surface-raised)">
      <div class="card-header row align-between">
        <h3>Trade VBD</h3>
        <button class="btn btn-primary" id="runVbdBtn">Evaluate</button>
      </div>
      <div class="card-body" id="vbdResult">
        <div class="faint" style="font-size:12px">Click Evaluate for full roster VBD.</div>
      </div>
    </div>
  `;const A=_.querySelector("#selectTeamA"),B=_.querySelector("#selectTeamB"),V=_.querySelector("#tradeSummaryBanner"),ie=_.querySelector("#teamARoster"),oe=_.querySelector("#teamBRoster"),de=_.querySelector("#teamAHeader"),le=_.querySelector("#teamBHeader"),ce=_.querySelector("#teamASub"),pe=_.querySelector("#teamBSub"),ue=_.querySelector("#runVbdBtn"),L=_.querySelector("#vbdResult"),M=_.querySelector("#tradeDepth"),H=new Map;let h=null,x=null;const w=new Set,j=new Set,F=new Set;let R=null,E=null;async function me(){return R||E||(E=(async()=>{try{const e=await ke({limit:800}),a=(e==null?void 0:e.players)||[];if(a.length){const t=await Ne(Ae,Be).catch(()=>null);R=Le(a,t)}}catch{R=null}return R})(),E)}const $=e=>{const a=Number(e);return Number.isFinite(a)?a:0};function C(e){return e.proj_pass_yd!=null||e.proj_rush_yd!=null||e.proj_rec_yd!=null||e.proj_rec!=null?{proj_pass_yd:$(e.proj_pass_yd),proj_pass_td:$(e.proj_pass_td),proj_rush_yd:$(e.proj_rush_yd),proj_rush_td:$(e.proj_rush_td),proj_rec:$(e.proj_rec),proj_rec_yd:$(e.proj_rec_yd),proj_rec_td:$(e.proj_rec_td)}:{proj_pass_yd:$(e.pass_yds)/17,proj_pass_td:$(e.pass_tds)/17,proj_rush_yd:$(e.rush_yds)/17,proj_rush_td:$(e.rush_tds)/17,proj_rec:$(e.receptions)/17,proj_rec_yd:$(e.rec_yds)/17,proj_rec_td:$(e.rec_tds)/17}}function ve(e){const a=(e.position||"").toUpperCase(),t=C(e),c=n=>(Math.round(n*10)/10).toFixed(1),s=n=>(Math.round(n*100)/100).toFixed(2);return a==="QB"?`${c(t.proj_pass_yd)} PaYd · ${s(t.proj_pass_td)} PaTD · ${c(t.proj_rush_yd)} RuYd avg`:a==="RB"?`${c(t.proj_rush_yd)} RuYd · ${s(t.proj_rush_td)} RuTD · ${c(t.proj_rec)} Rec avg`:a==="WR"||a==="TE"?`${c(t.proj_rec)} Rec · ${c(t.proj_rec_yd)} RecYd avg`:""}function ge(e){const a=String(e||"").toLowerCase().split(/[^a-z]+/).filter(Boolean);return a.includes("questionable")?.85:a.some(t=>["doubtful","out","ir","pup","nfi","suspended"].includes(t))?.6:1}function _e(e){if(e.remaining_games==null)return 1;const a=Number(e.remaining_games);return!Number.isFinite(a)||a<=0?1:Math.min(1,a/17)}function q(e){const a={pass_yd:0,pass_td:0,rush_yd:0,rush_td:0,rec:0,rec_yd:0,rec_td:0};let t=0;for(const c of e){const s=Number(c.remaining_games);if(c.remaining_games==null||!Number.isFinite(s)||s<=0){t++;continue}const n=C(c),r=Number(c.remaining_games);a.pass_yd+=n.proj_pass_yd*r,a.pass_td+=n.proj_pass_td*r,a.rush_yd+=n.proj_rush_yd*r,a.rush_td+=n.proj_rush_td*r,a.rec+=n.proj_rec*r,a.rec_yd+=n.proj_rec_yd*r,a.rec_td+=n.proj_rec_td*r}return{tot:a,excluded:t}}function ye(e){const a=(e.position||"").toUpperCase(),t=C(e),c=Te(a,{proj_pass_yd:t.proj_pass_yd||null,proj_pass_td:t.proj_pass_td||null,proj_rush_yd:t.proj_rush_yd||null,proj_rush_td:t.proj_rush_td||null,proj_rec:t.proj_rec||null,proj_rec_yd:t.proj_rec_yd||null,proj_rec_td:t.proj_rec_td||null,proj_fgm:null,proj_xpm:null}),s=Number(e.model_points??e.projected_points??e.weekly??0),n=Number(e.projection_lower??e.lower??Math.max(0,s-5)),r=Number(e.projection_upper??e.upper??s+5),d=Number(e.width??(r-n)/2),y=e.opponent_team?`vs ${l(String(e.opponent_team))}`:"no game",v=e.injury_status?` · ${l(String(e.injury_status))}`:"",o=e.remaining_games==null?"sched unknown":`${l(String(e.remaining_games))} games left`;return`${c}<div class="micro mono faint" style="margin-top:8px; text-align:center">Range ${n.toFixed(1)} – ${r.toFixed(1)} (width ${d.toFixed(1)}) · ${y}${v} · ${o}</div>`}try{const e=await ee(),a=(e==null?void 0:e.allTeams)||(e==null?void 0:e.leagueRosters)||[];a.length>0&&(A.innerHTML=a.map(t=>`<option value="${t.roster_id||t.owner_id}" ${String(t.roster_id||t.owner_id)===String(re)?"selected":""}>${l(t.team_name||t.display_name||`Team ${t.roster_id}`)} (${l(t.owner_name||t.display_name||"")})</option>`).join(""),B.innerHTML=a.map(t=>`<option value="${t.roster_id||t.owner_id}" ${String(t.roster_id||t.owner_id)===String(ne)?"selected":""}>${l(t.team_name||t.display_name||`Team ${t.roster_id}`)} (${l(t.owner_name||t.display_name||"")})</option>`).join(""))}catch(e){console.error("Failed to load team list:",e)}async function fe(e){const a=String(e);if(H.has(a))return H.get(a);const t=await ee({roster_id:a});return H.set(a,t),t}async function O(e){var y,v;const a=e==="A",t=a?A.value:B.value,c=a?ie:oe,s=a?de:le,n=a?w:j;if(!t)return;H.has(String(t))||(c.innerHTML='<div class="empty">Loading team roster…</div>');const r=await fe(t);a?h=r:x=r;const d=((y=r==null?void 0:r.teamMeta)==null?void 0:y.team_name)||((v=r==null?void 0:r.teamMeta)==null?void 0:v.owner_name)||`Team ${t}`;s.textContent=`${d} (${a?"Sending":"Receiving"})`,$e(c,N(r),e,n),U(),G(),W()}function U(){ce.textContent=`${w.size} player${w.size===1?"":"s"} selected`,pe.textContent=`${j.size} player${j.size===1?"":"s"} selected`}function $e(e,a,t,c){if(!a||a.length===0){e.innerHTML='<div class="empty">No roster players found</div>';return}e.innerHTML=`
      <div style="display:flex; flex-direction:column">
        ${a.map(s=>{const n=String(s.player_id||s.id),r=c.has(n),d=Number(s.model_points??s.projected_points??s.weekly??0).toFixed(1),y=Number(s.model_season_points??s.ros??d*17).toFixed(0),v=s.auction_price_paid??s.auction??s.marketAuction??0,o=ve(s),p=`${t}:${n}`,f=F.has(p);return`
            <label class="row align-between" style="padding:10px 14px; cursor:pointer; background:${r?"var(--surface-raised)":"transparent"}; border-bottom:1px solid var(--border); transition:background 0.15s; border-top:1px solid ${te((s.team||"").toUpperCase())}">
              <div class="row align-center" style="gap:10px">
                <input type="checkbox" class="trade-check" data-side="${t}" data-pid="${n}" ${r?"checked":""} title="Select ${l(s.player_name||s.full_name||n)} for trade" style="width:16px; height:16px; cursor:pointer" />
                <span style="width:8px; height:8px; border-radius:50%; background:${te((s.team||"").toUpperCase())}; flex-shrink:0" aria-hidden="true"></span>
                ${se(s,28)}
                <div>
                  <div class="row align-center" style="gap:6px">
                    <strong style="font-size:13px">${l(s.player_name||s.full_name||n)}</strong>
                    ${ae(s.position)}
                    ${s.injury_status?Se(s.injury_status):""}
                  </div>
                  <div class="micro faint" style="margin-top:2px; display:flex; align-items:center; gap:4px">
                    <span class="slot-tag" style="font-size:10px; font-weight:700; letter-spacing:0.3px; padding:1px 5px; border-radius:4px; background:${s.slot&&s.slot!=="BENCH"&&s.slot!=="IR"?"rgba(56,189,248,0.12); color:var(--sky); border:1px solid rgba(56,189,248,0.25)":s.slot==="IR"?"rgba(244,63,94,0.12); color:var(--crimson); border:1px solid rgba(244,63,94,0.25)":"rgba(148,163,184,0.12); color:var(--text-muted); border:1px solid rgba(148,163,184,0.2)"}">${l(s.slot||(s.position&&!s.team?"IR":"BENCH"))}</span>
                    <span>Draft Cost: $${v}</span> · ${Re(s.team,14)} <span>${s.team||"FA"} ${s.opponent_team?`vs ${s.opponent_team}`:""}</span>
                  </div>
                  ${o?`<div class="micro mono faint" style="margin-top:2px">${l(o)}</div>`:""}
                </div>
              </div>
              <div style="text-align:right">
                <div class="mono" style="font-weight:700; font-size:13px; color:var(--accent)">${d} <span class="micro faint">pts/wk</span></div>
                <div class="micro faint mono">${y} pts ROS</div>
                <button class="trade-expand" data-side="${t}" data-pid="${l(n)}" title="Show projected stats" style="margin-top:4px; font-size:11px; background:transparent; color:var(--text-muted); border:1px solid var(--border); border-radius:6px; padding:1px 8px; cursor:pointer">${f?"▾ stats":"▸ stats"}</button>
              </div>
            </label>
            <div class="trade-detail" data-side="${t}" data-pid="${l(n)}" style="display:${f?"block":"none"}; padding:10px 14px; border-bottom:1px solid var(--border); background:var(--surface-raised)">
              ${ye(s)}
            </div>
          `}).join("")}
      </div>
    `,e.querySelectorAll(".trade-check").forEach(s=>{s.addEventListener("change",n=>{const r=n.target.dataset.pid,d=n.target.dataset.side==="A"?w:j;n.target.checked?d.add(r):d.delete(r),U(),G(),W()})}),e.querySelectorAll(".trade-expand").forEach(s=>{s.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation();const r=`${s.dataset.side}:${s.dataset.pid}`,d=e.querySelector(`.trade-detail[data-side="${s.dataset.side}"][data-pid="${s.dataset.pid}"]`);F.has(r)?(F.delete(r),s.innerHTML="▸ stats",d&&(d.style.display="none")):(F.add(r),s.innerHTML="▾ stats",d&&(d.style.display="block"))})})}function he(e,a,t,c){const s=q(e),n=q(a),r=m=>Math.round(m).toLocaleString("en-US"),d=m=>(Math.round(m*10)/10).toFixed(1),y=[["Pass","pass_yd","pass_td",r,d],["Rush","rush_yd","rush_td",r,d],["Rec","rec_yd","rec_td",r,d]].map(([m,b,T,S,k])=>{const K=s.tot[b],Y=s.tot[T],Q=n.tot[b],J=n.tot[T],z=Q-K,X=J-Y,we=Z=>Z>0?"text-ok":Z<0?"text-bad":"faint";return`<div class="row align-between mono" style="padding:2px 0; font-size:12px"><span class="faint" style="width:44px">${m}</span><span>${S(K)} yd · ${k(Y)} TD</span><span class="faint">→</span><span>${S(Q)} yd · ${k(J)} TD</span><span class="${we(z)}" style="min-width:110px; text-align:right">${z>=0?"+":""}${S(z)} yd · ${X>=0?"+":""}${k(X)} TD</span></div>`}).join(""),v=s.excluded+n.excluded,o=e.length,p=a.length,f=o===p?`Even player count (${o} ↔ ${p}) — no open slots change hands.`:o>p?`${l(t)} sends ${o}, receives ${p} — gains ${o-p} open slot${o-p>1?"s":""}. See Evaluate below for waiver value.`:`${l(c)} sends ${p}, receives ${o} — gains ${p-o} open slot${p-o>1?"s":""}. See Evaluate below for waiver value.`,i=[...e,...a].map(m=>Number(m.width)).filter(m=>Number.isFinite(m)),u=i.length?i.reduce((m,b)=>m+b,0)/i.length:NaN,g=Number.isFinite(u)?u>=7?`<span style="color:var(--amber)">Low confidence — wide intervals (avg width ${u.toFixed(1)})</span>`:u<=5?`<span style="color:var(--emerald)">High confidence — tight intervals (avg width ${u.toFixed(1)})</span>`:`<span class="faint">Medium confidence (avg width ${u.toFixed(1)})</span>`:"";return`<div style="font-size:12px"><div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px">ROS stat impact — ${l(t)} gives ↔ ${l(c)} gives (net for ${l(t)})</div>`+y+(v?`<div class="micro faint" style="margin-top:4px">ROS excludes ${v} player${v>1?"s":""} with unknown schedule data.</div>`:"")+`<div class="micro" style="margin-top:6px">${f}</div>`+(g?`<div class="micro" style="margin-top:2px">${g}</div>`:"")+"</div>"}const D=["QB","RB","WR","TE","FLEX","K","DEF"];function I(e,a,t,c){if(!e)return"";const s=o=>{const p=Number(o.model_points??o.projected_points??o.weekly??0);return Number.isFinite(p)?p:0},n=a||new Set,r=new Set((t||[]).map(o=>String(o.player_id||o.id))),d={};for(const o of N(e)){const p=(o.position||"UNK").toUpperCase();(d[p]=d[p]||[]).push(o)}for(const o of t||[]){const p=(o.position||"UNK").toUpperCase();(d[p]=d[p]||[]).push({...o,_incoming:!0})}const v=Object.keys(d).sort((o,p)=>{const f=D.indexOf(o),i=D.indexOf(p);return(f<0?99:f)-(i<0?99:i)}).map(o=>{const p=d[o].slice().sort((g,m)=>s(m)-s(g)),f=p.filter(g=>!g._incoming&&!n.has(String(g.player_id||g.id))),i=f.reduce((g,m)=>g+s(m),0),u=p.map(g=>{const m=String(g.player_id||g.id),b=g._incoming||r.has(m),T=!b&&n.has(m);return`<div class="depth-card depth-${b?"in":T?"out":"kept"}">
          ${se(g,34)}
          <div style="flex:1; min-width:0">
            <div class="depth-name">${l(g.player_name||m)}</div>
            <div class="micro faint">${ae(o)} · <span class="mono">${s(g).toFixed(1)}</span></div>
          </div>
          <span class="depth-tag">${b?"IN":T?"OUT":""}</span>
        </div>`}).join("");return`<div class="depth-group">
        <div class="depth-group-head"><strong>${l(o)}</strong><span class="faint"> · ${f.length} kept · ${i.toFixed(1)}/wk</span></div>
        <div class="depth-cards">${u}</div>
      </div>`}).join("");return`<div><div class="depth-team">${l(c)} <span class="faint">post-trade</span></div>${v}</div>`}function W(){var s,n;if(!M)return;if(!h&&!x){M.innerHTML="";return}const e=N(h).filter(r=>w.has(String(r.player_id||r.id))),a=N(x).filter(r=>j.has(String(r.player_id||r.id)));if(!e.length&&!a.length){M.innerHTML="";return}const t=((s=h==null?void 0:h.teamMeta)==null?void 0:s.team_name)||"Team A",c=((n=x==null?void 0:x.teamMeta)==null?void 0:n.team_name)||"Team B";M.innerHTML='<div class="card"><div class="card-body"><div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px">Post-trade depth by position</div><div class="grid grid-2" style="font-size:12px">'+I(h,w,a,t)+I(x,j,e,c)+"</div></div></div>"}async function G(){var p,f;await me();const e=N(h).filter(i=>w.has(String(i.player_id||i.id))),a=N(x).filter(i=>j.has(String(i.player_id||i.id))),t=((p=h==null?void 0:h.teamMeta)==null?void 0:p.team_name)||"Team A",c=((f=x==null?void 0:x.teamMeta)==null?void 0:f.team_name)||"Team B";if(e.length===0&&a.length===0){V.innerHTML=`
        <div class="alert alert-info" style="font-size:13px">
          Check players in <strong>${l(t)}</strong> and <strong>${l(c)}</strong> rosters above to calculate trade model impact.
        </div>
      `;return}const s=i=>{if(!i)return 0;let u;const g=Number(i.auction??i.auction_value);if((i.auction??i.auction_value)!=null&&Number.isFinite(g)&&g!==0)u=g;else{const b=(i.position||"").toUpperCase(),T=Number(i.model_season_points??i.ros??(i.model_points??i.projected_points??i.weekly??0)*17);if(R){const S=Me(T,b,R),k=He(T,b,R);S>1?u=S:k>0?u=Math.max(S,k):u=S}else u=Number(i.auction_price_paid??i.amount_paid??i.auction??i.auction_value??1)}const m=u*ge(i.injury_status)*_e(i);return Number.isFinite(m)?Math.max(0,m):0},n=e.reduce((i,u)=>i+s(u),0),r=a.reduce((i,u)=>i+s(u),0),d=r-n;let y="EVEN / FAIR TRADE",v="var(--text-muted)",o="var(--surface-raised)";d>=8?(y=`WIN FOR ${t.toUpperCase()}`,v="var(--emerald)",o="rgba(16,185,129,0.1)"):d>=5?(y=`LEAN TO ${t.toUpperCase()}`,v="var(--emerald)",o="rgba(16,185,129,0.07)"):d<=-8?(y=`WIN FOR ${c.toUpperCase()}`,v="var(--amber)",o="rgba(245,158,11,0.1)"):d<=-5&&(y=`LEAN TO ${c.toUpperCase()}`,v="var(--amber)",o="rgba(245,158,11,0.07)"),V.innerHTML=`
      <div class="card" style="border-top:1px solid ${v}; background:${o}">
        <div class="card-body">
          <div class="row align-between align-center" style="flex-wrap:wrap; gap:12px">
            <div>
              <div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px">Trade verdict: $ VOR ROS</div>
              <h2 style="margin:2px 0 0; color:${v}">${l(y)}</h2>
            </div>
            <div class="row" style="gap:24px; flex-wrap:wrap">
              <div class="stat">
                <div class="stat-value mono ${d>=0?"text-ok":"text-bad"}" style="font-size:20px">
                  ${d>=0?"+":""}$${d.toFixed(0)}
                </div>
                <div class="stat-label">${l(t)} Net $ VOR ROS</div>
              </div>
              <div class="stat">
                <div class="stat-value mono" style="font-size:20px">$${n} vs $${r}</div>
                <div class="stat-label">$ VOR Traded · $${n} vs $${r}</div>
              </div>
            </div>
          </div>

          <div class="divider" style="margin:14px 0"></div>

          ${he(e,a,t,c)}

          <div class="divider" style="margin:14px 0"></div>

          <div class="grid grid-2" style="font-size:12px">
            <div>
              <strong style="color:var(--text)">${l(t)} Gives ($${n} $ VOR ROS):</strong>
              ${e.length?e.map(i=>{const u=s(i);return`
                <div class="row align-between" style="padding:3px 0">
                  <span>${l(i.player_name)} (${i.position})</span>
                  <span class="mono faint">$${u} $ VOR</span>
                </div>
              `}).join(""):'<div class="faint">No players selected</div>'}
            </div>
            <div>
              <strong style="color:var(--text)">${l(c)} Gives ($${r} $ VOR ROS):</strong>
              ${a.length?a.map(i=>{const u=s(i);return`
                <div class="row align-between" style="padding:3px 0">
                  <span>${l(i.player_name)} (${i.position})</span>
                  <span class="mono faint">$${u} $ VOR</span>
                </div>
              `}).join(""):'<div class="faint">No players selected</div>'}
            </div>
          </div>
        </div>
      </div>
    `}async function xe(){L.innerHTML='<div class="empty">Running positional VBD analysis…</div>';try{const e=await je(A.value,B.value,{tradedA:[...w],tradedB:[...j]});if(!e){L.innerHTML='<div class="alert alert-warn">Trade evaluation returned no result.</div>';return}const a=be(e);L.innerHTML=`
        <div class="row align-between" style="margin-bottom:12px">
          <div>
            <div class="micro faint">Recommendation</div>
            <strong style="font-size:15px; color:var(--accent)">${l(e.winner||e.recommendation||"—")}</strong>
          </div>
          <div class="mono" style="font-size:13px">
            Diff: <span style="color:var(--amber); font-weight:700">${Number(e.value_difference??0).toFixed(1)}</span> VBD pts ROS
          </div>
        </div>
        <div class="faint" style="font-size:12px">${l(e.recommendation||"")}</div>
        ${a}
      `}catch{L.innerHTML='<div class="alert alert-bad">Trade evaluation failed. See console.</div>'}}function be(e){const a=Number(e.slots_gained_a??0),t=Number(e.slots_gained_b??0);if(!a&&!t)return"";const c=Number(e.slot_uplift_a??0),s=Number(e.slot_uplift_b??0),n=Array.isArray(e.slot_waiver_a)?e.slot_waiver_a:[],r=Array.isArray(e.slot_waiver_b)?e.slot_waiver_b:[],d=e.slot_rule==="experimental"?"experimental":"baseline",y=(v,o,p,f)=>o?`<div style="padding:2px 0">Team ${l(v)} gains ${o} open slot${o>1?"s":""}`+(f.length?` — waiver: ${f.map(i=>l(String(i))).join(", ")}`:"")+` (+${p.toFixed(1)} pts ROS marginal uplift)</div>`:"";return`<div class="divider" style="margin:12px 0"></div><div style="font-size:12px"><div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">Roster slots <span class="faint">(${l(d)}${d==="baseline"?" — informational, not in verdict":" — folded into verdict"})</span></div>`+y("A",a,c,n)+y("B",t,s,r)+"</div>"}A.addEventListener("change",()=>{w.clear(),O("A")}),B.addEventListener("change",()=>{j.clear(),O("B")}),ue.addEventListener("click",xe),await Promise.all([O("A"),O("B")])}function N(_){return _?[..._.starters||[],...Array.isArray(_.bench)?_.bench:[],...Array.isArray(_.reserve)?_.reserve:[]]:[]}export{Ce as renderTrade};
