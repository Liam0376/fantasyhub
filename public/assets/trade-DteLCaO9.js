import{k as ee,h as c,M as be,r as te,p as we,i as je,j as Se,t as Re,J as Te,e as ke,m as Ne,f as Ae,q as Be}from"./index-BKp382fN.js";import{c as Le,v as Me,a as He}from"./vbdAuction-DKQV2yMt.js";import"./auctionMath-iJkvTDta.js";async function Oe(v){const P=new URLSearchParams(location.hash.split("?")[1]||"");let se=P.get("team_a")||"1",ae=P.get("team_b")||"2";v.innerHTML=`
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
  `;const A=v.querySelector("#selectTeamA"),B=v.querySelector("#selectTeamB"),V=v.querySelector("#tradeSummaryBanner"),re=v.querySelector("#teamARoster"),ne=v.querySelector("#teamBRoster"),ie=v.querySelector("#teamAHeader"),oe=v.querySelector("#teamBHeader"),de=v.querySelector("#teamASub"),le=v.querySelector("#teamBSub"),ce=v.querySelector("#runVbdBtn"),L=v.querySelector("#vbdResult"),M=v.querySelector("#tradeDepth"),H=new Map;let h=null,x=null;const b=new Set,w=new Set,F=new Set;let j=null,E=null;async function pe(){return j||E||(E=(async()=>{try{const e=await ke({limit:800}),a=(e==null?void 0:e.players)||[];if(a.length){const t=await Ne(Ae,Be).catch(()=>null);j=Le(a,t)}}catch{j=null}return j})(),E)}const $=e=>{const a=Number(e);return Number.isFinite(a)?a:0};function O(e){return e.proj_pass_yd!=null||e.proj_rush_yd!=null||e.proj_rec_yd!=null||e.proj_rec!=null?{proj_pass_yd:$(e.proj_pass_yd),proj_pass_td:$(e.proj_pass_td),proj_rush_yd:$(e.proj_rush_yd),proj_rush_td:$(e.proj_rush_td),proj_rec:$(e.proj_rec),proj_rec_yd:$(e.proj_rec_yd),proj_rec_td:$(e.proj_rec_td)}:{proj_pass_yd:$(e.pass_yds)/17,proj_pass_td:$(e.pass_tds)/17,proj_rush_yd:$(e.rush_yds)/17,proj_rush_td:$(e.rush_tds)/17,proj_rec:$(e.receptions)/17,proj_rec_yd:$(e.rec_yds)/17,proj_rec_td:$(e.rec_tds)/17}}function ue(e){const a=(e.position||"").toUpperCase(),t=O(e),p=n=>(Math.round(n*10)/10).toFixed(1),s=n=>(Math.round(n*100)/100).toFixed(2);return a==="QB"?`${p(t.proj_pass_yd)} PaYd · ${s(t.proj_pass_td)} PaTD · ${p(t.proj_rush_yd)} RuYd avg`:a==="RB"?`${p(t.proj_rush_yd)} RuYd · ${s(t.proj_rush_td)} RuTD · ${p(t.proj_rec)} Rec avg`:a==="WR"||a==="TE"?`${p(t.proj_rec)} Rec · ${p(t.proj_rec_yd)} RecYd avg`:""}function me(e){const a=String(e||"").toLowerCase().split(/[^a-z]+/).filter(Boolean);return a.includes("questionable")?.85:a.some(t=>["doubtful","out","ir","pup","nfi","suspended"].includes(t))?.6:1}function ve(e){if(e.remaining_games==null)return 1;const a=Number(e.remaining_games);return!Number.isFinite(a)||a<=0?1:Math.min(1,a/17)}function q(e){const a={pass_yd:0,pass_td:0,rush_yd:0,rush_td:0,rec:0,rec_yd:0,rec_td:0};let t=0;for(const p of e){const s=Number(p.remaining_games);if(p.remaining_games==null||!Number.isFinite(s)||s<=0){t++;continue}const n=O(p),r=Number(p.remaining_games);a.pass_yd+=n.proj_pass_yd*r,a.pass_td+=n.proj_pass_td*r,a.rush_yd+=n.proj_rush_yd*r,a.rush_td+=n.proj_rush_td*r,a.rec+=n.proj_rec*r,a.rec_yd+=n.proj_rec_yd*r,a.rec_td+=n.proj_rec_td*r}return{tot:a,excluded:t}}function ge(e){const a=(e.position||"").toUpperCase(),t=O(e),p=Te(a,{proj_pass_yd:t.proj_pass_yd||null,proj_pass_td:t.proj_pass_td||null,proj_rush_yd:t.proj_rush_yd||null,proj_rush_td:t.proj_rush_td||null,proj_rec:t.proj_rec||null,proj_rec_yd:t.proj_rec_yd||null,proj_rec_td:t.proj_rec_td||null,proj_fgm:null,proj_xpm:null}),s=Number(e.model_points??e.projected_points??e.weekly??0),n=Number(e.projection_lower??e.lower??Math.max(0,s-5)),r=Number(e.projection_upper??e.upper??s+5),u=Number(e.width??(r-n)/2),g=e.opponent_team?`vs ${c(String(e.opponent_team))}`:"no game",d=e.injury_status?` · ${c(String(e.injury_status))}`:"",o=e.remaining_games==null?"sched unknown":`${c(String(e.remaining_games))} games left`;return`${p}<div class="micro mono faint" style="margin-top:8px; text-align:center">Range ${n.toFixed(1)} – ${r.toFixed(1)} (width ${u.toFixed(1)}) · ${g}${d} · ${o}</div>`}try{const e=await ee(),a=(e==null?void 0:e.allTeams)||(e==null?void 0:e.leagueRosters)||[];a.length>0&&(A.innerHTML=a.map(t=>`<option value="${t.roster_id||t.owner_id}" ${String(t.roster_id||t.owner_id)===String(se)?"selected":""}>${c(t.team_name||t.display_name||`Team ${t.roster_id}`)} (${c(t.owner_name||t.display_name||"")})</option>`).join(""),B.innerHTML=a.map(t=>`<option value="${t.roster_id||t.owner_id}" ${String(t.roster_id||t.owner_id)===String(ae)?"selected":""}>${c(t.team_name||t.display_name||`Team ${t.roster_id}`)} (${c(t.owner_name||t.display_name||"")})</option>`).join(""))}catch(e){console.error("Failed to load team list:",e)}async function _e(e){const a=String(e);if(H.has(a))return H.get(a);const t=await ee({roster_id:a});return H.set(a,t),t}async function C(e){var g,d;const a=e==="A",t=a?A.value:B.value,p=a?re:ne,s=a?ie:oe,n=a?b:w;if(!t)return;H.has(String(t))||(p.innerHTML='<div class="empty">Loading team roster…</div>');const r=await _e(t);a?h=r:x=r;const u=((g=r==null?void 0:r.teamMeta)==null?void 0:g.team_name)||((d=r==null?void 0:r.teamMeta)==null?void 0:d.owner_name)||`Team ${t}`;s.textContent=`${u} (${a?"Sending":"Receiving"})`,ye(p,k(r),e,n),U(),G(),W()}function U(){de.textContent=`${b.size} player${b.size===1?"":"s"} selected`,le.textContent=`${w.size} player${w.size===1?"":"s"} selected`}function ye(e,a,t,p){if(!a||a.length===0){e.innerHTML='<div class="empty">No roster players found</div>';return}e.innerHTML=`
      <div style="display:flex; flex-direction:column">
        ${a.map(s=>{const n=String(s.player_id||s.id),r=p.has(n),u=Number(s.model_points??s.projected_points??s.weekly??0).toFixed(1),g=Number(s.model_season_points??s.ros??u*17).toFixed(0),d=s.auction_price_paid??s.auction??s.marketAuction??0,o=ue(s),m=`${t}:${n}`,y=F.has(m);return`
            <label class="row align-between" style="padding:10px 14px; cursor:pointer; background:${r?"var(--surface-raised)":"transparent"}; border-bottom:1px solid var(--border); transition:background 0.15s; border-top:1px solid ${te((s.team||"").toUpperCase())}">
              <div class="row align-center" style="gap:10px">
                <input type="checkbox" class="trade-check" data-side="${t}" data-pid="${n}" ${r?"checked":""} title="Select ${c(s.player_name||s.full_name||n)} for trade" style="width:16px; height:16px; cursor:pointer" />
                <span style="width:8px; height:8px; border-radius:50%; background:${te((s.team||"").toUpperCase())}; flex-shrink:0" aria-hidden="true"></span>
                ${we(s,28)}
                <div>
                  <div class="row align-center" style="gap:6px">
                    <strong style="font-size:13px">${c(s.player_name||s.full_name||n)}</strong>
                    ${je(s.position)}
                    ${s.injury_status?Se(s.injury_status):""}
                  </div>
                  <div class="micro faint" style="margin-top:2px; display:flex; align-items:center; gap:4px">
                    <span class="slot-tag" style="font-size:10px; font-weight:700; letter-spacing:0.3px; padding:1px 5px; border-radius:4px; background:${s.slot&&s.slot!=="BENCH"&&s.slot!=="IR"?"rgba(56,189,248,0.12); color:var(--sky); border:1px solid rgba(56,189,248,0.25)":s.slot==="IR"?"rgba(244,63,94,0.12); color:var(--crimson); border:1px solid rgba(244,63,94,0.25)":"rgba(148,163,184,0.12); color:var(--text-muted); border:1px solid rgba(148,163,184,0.2)"}">${c(s.slot||(s.position&&!s.team?"IR":"BENCH"))}</span>
                    <span>Draft Cost: $${d}</span> · ${Re(s.team,14)} <span>${s.team||"FA"} ${s.opponent_team?`vs ${s.opponent_team}`:""}</span>
                  </div>
                  ${o?`<div class="micro mono faint" style="margin-top:2px">${c(o)}</div>`:""}
                </div>
              </div>
              <div style="text-align:right">
                <div class="mono" style="font-weight:700; font-size:13px; color:var(--accent)">${u} <span class="micro faint">pts/wk</span></div>
                <div class="micro faint mono">${g} pts ROS</div>
                <button class="trade-expand" data-side="${t}" data-pid="${c(n)}" title="Show projected stats" style="margin-top:4px; font-size:11px; background:transparent; color:var(--text-muted); border:1px solid var(--border); border-radius:6px; padding:1px 8px; cursor:pointer">${y?"▾ stats":"▸ stats"}</button>
              </div>
            </label>
            <div class="trade-detail" data-side="${t}" data-pid="${c(n)}" style="display:${y?"block":"none"}; padding:10px 14px; border-bottom:1px solid var(--border); background:var(--surface-raised)">
              ${ge(s)}
            </div>
          `}).join("")}
      </div>
    `,e.querySelectorAll(".trade-check").forEach(s=>{s.addEventListener("change",n=>{const r=n.target.dataset.pid,u=n.target.dataset.side==="A"?b:w;n.target.checked?u.add(r):u.delete(r),U(),G(),W()})}),e.querySelectorAll(".trade-expand").forEach(s=>{s.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation();const r=`${s.dataset.side}:${s.dataset.pid}`,u=e.querySelector(`.trade-detail[data-side="${s.dataset.side}"][data-pid="${s.dataset.pid}"]`);F.has(r)?(F.delete(r),s.innerHTML="▸ stats",u&&(u.style.display="none")):(F.add(r),s.innerHTML="▾ stats",u&&(u.style.display="block"))})})}function fe(e,a,t,p){const s=q(e),n=q(a),r=_=>Math.round(_).toLocaleString("en-US"),u=_=>(Math.round(_*10)/10).toFixed(1),g=[["Pass","pass_yd","pass_td",r,u],["Rush","rush_yd","rush_td",r,u],["Rec","rec_yd","rec_td",r,u]].map(([_,R,N,S,T])=>{const K=s.tot[R],Y=s.tot[N],Q=n.tot[R],J=n.tot[N],z=Q-K,X=J-Y,xe=Z=>Z>0?"text-ok":Z<0?"text-bad":"faint";return`<div class="row align-between mono" style="padding:2px 0; font-size:12px"><span class="faint" style="width:44px">${_}</span><span>${S(K)} yd · ${T(Y)} TD</span><span class="faint">→</span><span>${S(Q)} yd · ${T(J)} TD</span><span class="${xe(z)}" style="min-width:110px; text-align:right">${z>=0?"+":""}${S(z)} yd · ${X>=0?"+":""}${T(X)} TD</span></div>`}).join(""),d=s.excluded+n.excluded,o=e.length,m=a.length,y=o===m?`Even player count (${o} ↔ ${m}) — no open slots change hands.`:o>m?`${c(t)} sends ${o}, receives ${m} — gains ${o-m} open slot${o-m>1?"s":""}. See Evaluate below for waiver value.`:`${c(p)} sends ${m}, receives ${o} — gains ${m-o} open slot${m-o>1?"s":""}. See Evaluate below for waiver value.`,i=[...e,...a].map(_=>Number(_.width)).filter(_=>Number.isFinite(_)),l=i.length?i.reduce((_,R)=>_+R,0)/i.length:NaN,f=Number.isFinite(l)?l>=7?`<span style="color:var(--amber)">Low confidence — wide intervals (avg width ${l.toFixed(1)})</span>`:l<=5?`<span style="color:var(--emerald)">High confidence — tight intervals (avg width ${l.toFixed(1)})</span>`:`<span class="faint">Medium confidence (avg width ${l.toFixed(1)})</span>`:"";return`<div style="font-size:12px"><div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px">ROS stat impact — ${c(t)} gives ↔ ${c(p)} gives (net for ${c(t)})</div>`+g+(d?`<div class="micro faint" style="margin-top:4px">ROS excludes ${d} player${d>1?"s":""} with unknown schedule data.</div>`:"")+`<div class="micro" style="margin-top:6px">${y}</div>`+(f?`<div class="micro" style="margin-top:2px">${f}</div>`:"")+"</div>"}const D=["QB","RB","WR","TE","FLEX","K","DEF"];function I(e,a,t,p){if(!e)return"";const s=d=>{const o=Number(d.model_points??d.projected_points??d.weekly??0);return Number.isFinite(o)?o:0},n=a||new Set;new Set((t||[]).map(d=>String(d.player_id||d.id)));const r={};for(const d of k(e)){const o=(d.position||"UNK").toUpperCase();(r[o]=r[o]||[]).push(d)}for(const d of t||[]){const o=(d.position||"UNK").toUpperCase();(r[o]=r[o]||[]).push({...d,_incoming:!0})}const g=Object.keys(r).sort((d,o)=>{const m=D.indexOf(d),y=D.indexOf(o);return(m<0?99:m)-(y<0?99:y)}).map(d=>{const o=r[d].slice().sort((l,f)=>s(f)-s(l)),m=o.filter(l=>!l._incoming&&!n.has(String(l.player_id||l.id))),y=m.reduce((l,f)=>l+s(f),0),i=o.map(l=>{const f=String(l.player_id||l.id),_=s(l).toFixed(1);return l._incoming?`<span class="mono" style="color:var(--emerald)">➕ ${c(l.player_name||f)} ${_}</span>`:n.has(f)?`<span class="mono faint" style="text-decoration:line-through">➖ ${c(l.player_name||f)} ${_}</span>`:`<span class="mono">${c(l.player_name||f)} ${_}</span>`}).join(" · ");return`<div style="padding:3px 0"><strong style="color:var(--text)">${c(d)}</strong> <span class="faint">(${m.length} kept · ${y.toFixed(1)} pts/wk)</span><br>${i}</div>`}).join("");return`<div><strong style="color:var(--text)">${c(p)} post-trade</strong>${g}</div>`}function W(){var s,n;if(!M)return;if(!h&&!x){M.innerHTML="";return}const e=k(h).filter(r=>b.has(String(r.player_id||r.id))),a=k(x).filter(r=>w.has(String(r.player_id||r.id)));if(!e.length&&!a.length){M.innerHTML="";return}const t=((s=h==null?void 0:h.teamMeta)==null?void 0:s.team_name)||"Team A",p=((n=x==null?void 0:x.teamMeta)==null?void 0:n.team_name)||"Team B";M.innerHTML='<div class="card"><div class="card-body"><div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px">Post-trade depth by position</div><div class="grid grid-2" style="font-size:12px">'+I(h,b,a,t)+I(x,w,e,p)+"</div></div></div>"}async function G(){var m,y;await pe();const e=k(h).filter(i=>b.has(String(i.player_id||i.id))),a=k(x).filter(i=>w.has(String(i.player_id||i.id))),t=((m=h==null?void 0:h.teamMeta)==null?void 0:m.team_name)||"Team A",p=((y=x==null?void 0:x.teamMeta)==null?void 0:y.team_name)||"Team B";if(e.length===0&&a.length===0){V.innerHTML=`
        <div class="alert alert-info" style="font-size:13px">
          Check players in <strong>${c(t)}</strong> and <strong>${c(p)}</strong> rosters above to calculate trade model impact.
        </div>
      `;return}const s=i=>{if(!i)return 0;let l;const f=Number(i.auction??i.auction_value);if((i.auction??i.auction_value)!=null&&Number.isFinite(f)&&f!==0)l=f;else{const R=(i.position||"").toUpperCase(),N=Number(i.model_season_points??i.ros??(i.model_points??i.projected_points??i.weekly??0)*17);if(j){const S=Me(N,R,j),T=He(N,R,j);S>1?l=S:T>0?l=Math.max(S,T):l=S}else l=Number(i.auction_price_paid??i.amount_paid??i.auction??i.auction_value??1)}const _=l*me(i.injury_status)*ve(i);return Number.isFinite(_)?Math.max(0,_):0},n=e.reduce((i,l)=>i+s(l),0),r=a.reduce((i,l)=>i+s(l),0),u=r-n;let g="EVEN / FAIR TRADE",d="var(--text-muted)",o="var(--surface-raised)";u>=8?(g=`WIN FOR ${t.toUpperCase()}`,d="var(--emerald)",o="rgba(16,185,129,0.1)"):u>=5?(g=`LEAN TO ${t.toUpperCase()}`,d="var(--emerald)",o="rgba(16,185,129,0.07)"):u<=-8?(g=`WIN FOR ${p.toUpperCase()}`,d="var(--amber)",o="rgba(245,158,11,0.1)"):u<=-5&&(g=`LEAN TO ${p.toUpperCase()}`,d="var(--amber)",o="rgba(245,158,11,0.07)"),V.innerHTML=`
      <div class="card" style="border-top:1px solid ${d}; background:${o}">
        <div class="card-body">
          <div class="row align-between align-center" style="flex-wrap:wrap; gap:12px">
            <div>
              <div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px">Trade verdict: $ VOR ROS</div>
              <h2 style="margin:2px 0 0; color:${d}">${c(g)}</h2>
            </div>
            <div class="row" style="gap:24px; flex-wrap:wrap">
              <div class="stat">
                <div class="stat-value mono ${u>=0?"text-ok":"text-bad"}" style="font-size:20px">
                  ${u>=0?"+":""}$${u.toFixed(0)}
                </div>
                <div class="stat-label">${c(t)} Net $ VOR ROS</div>
              </div>
              <div class="stat">
                <div class="stat-value mono" style="font-size:20px">$${n} vs $${r}</div>
                <div class="stat-label">$ VOR Traded · $${n} vs $${r}</div>
              </div>
            </div>
          </div>

          <div class="divider" style="margin:14px 0"></div>

          ${fe(e,a,t,p)}

          <div class="divider" style="margin:14px 0"></div>

          <div class="grid grid-2" style="font-size:12px">
            <div>
              <strong style="color:var(--text)">${c(t)} Gives ($${n} $ VOR ROS):</strong>
              ${e.length?e.map(i=>{const l=s(i);return`
                <div class="row align-between" style="padding:3px 0">
                  <span>${c(i.player_name)} (${i.position})</span>
                  <span class="mono faint">$${l} $ VOR</span>
                </div>
              `}).join(""):'<div class="faint">No players selected</div>'}
            </div>
            <div>
              <strong style="color:var(--text)">${c(p)} Gives ($${r} $ VOR ROS):</strong>
              ${a.length?a.map(i=>{const l=s(i);return`
                <div class="row align-between" style="padding:3px 0">
                  <span>${c(i.player_name)} (${i.position})</span>
                  <span class="mono faint">$${l} $ VOR</span>
                </div>
              `}).join(""):'<div class="faint">No players selected</div>'}
            </div>
          </div>
        </div>
      </div>
    `}async function $e(){L.innerHTML='<div class="empty">Running positional VBD analysis…</div>';try{const e=await be(A.value,B.value,{tradedA:[...b],tradedB:[...w]});if(!e){L.innerHTML='<div class="alert alert-warn">Trade evaluation returned no result.</div>';return}const a=he(e);L.innerHTML=`
        <div class="row align-between" style="margin-bottom:12px">
          <div>
            <div class="micro faint">Recommendation</div>
            <strong style="font-size:15px; color:var(--accent)">${c(e.winner||e.recommendation||"—")}</strong>
          </div>
          <div class="mono" style="font-size:13px">
            Diff: <span style="color:var(--amber); font-weight:700">${Number(e.value_difference??0).toFixed(1)}</span> VBD pts ROS
          </div>
        </div>
        <div class="faint" style="font-size:12px">${c(e.recommendation||"")}</div>
        ${a}
      `}catch{L.innerHTML='<div class="alert alert-bad">Trade evaluation failed. See console.</div>'}}function he(e){const a=Number(e.slots_gained_a??0),t=Number(e.slots_gained_b??0);if(!a&&!t)return"";const p=Number(e.slot_uplift_a??0),s=Number(e.slot_uplift_b??0),n=Array.isArray(e.slot_waiver_a)?e.slot_waiver_a:[],r=Array.isArray(e.slot_waiver_b)?e.slot_waiver_b:[],u=e.slot_rule==="experimental"?"experimental":"baseline",g=(d,o,m,y)=>o?`<div style="padding:2px 0">Team ${c(d)} gains ${o} open slot${o>1?"s":""}`+(y.length?` — waiver: ${y.map(i=>c(String(i))).join(", ")}`:"")+` (+${m.toFixed(1)} pts ROS marginal uplift)</div>`:"";return`<div class="divider" style="margin:12px 0"></div><div style="font-size:12px"><div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">Roster slots <span class="faint">(${c(u)}${u==="baseline"?" — informational, not in verdict":" — folded into verdict"})</span></div>`+g("A",a,p,n)+g("B",t,s,r)+"</div>"}A.addEventListener("change",()=>{b.clear(),C("A")}),B.addEventListener("change",()=>{w.clear(),C("B")}),ce.addEventListener("click",$e),await Promise.all([C("A"),C("B")])}function k(v){return v?[...v.starters||[],...Array.isArray(v.bench)?v.bench:[],...Array.isArray(v.reserve)?v.reserve:[]]:[]}export{Oe as renderTrade};
