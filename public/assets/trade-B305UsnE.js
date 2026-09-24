import{k as ee,h as c,M as ke,r as te,p as se,i as ae,j as Re,t as Te,J as Ne,e as Ae,m as Be,f as Le,q as Me}from"./index-BgG2ZwCW.js";import{c as Fe,v as He,a as Oe}from"./vbdAuction-C2XU5lhA.js";import"./auctionMath-DLJKqTvb.js";async function Pe(y){const P=new URLSearchParams(location.hash.split("?")[1]||"");let re=P.get("team_a")||"1",ne=P.get("team_b")||"2";y.innerHTML=`
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
  `;const A=y.querySelector("#selectTeamA"),B=y.querySelector("#selectTeamB"),U=y.querySelector("#tradeSummaryBanner"),ie=y.querySelector("#teamARoster"),oe=y.querySelector("#teamBRoster"),de=y.querySelector("#teamAHeader"),le=y.querySelector("#teamBHeader"),ce=y.querySelector("#teamASub"),pe=y.querySelector("#teamBSub"),ue=y.querySelector("#runVbdBtn"),L=y.querySelector("#vbdResult"),M=y.querySelector("#tradeDepth"),F=new Map;let b=null,x=null;const w=new Set,j=new Set,H=new Set;let k=null,O=null;async function me(){return k||O||(O=(async()=>{try{const e=await Ae({limit:800}),a=(e==null?void 0:e.players)||[];if(a.length){const t=await Be(Le,Me).catch(()=>null);k=Fe(a,t)}}catch{k=null}return k})(),O)}const $=e=>{const a=Number(e);return Number.isFinite(a)?a:0};function C(e){return e.proj_pass_yd!=null||e.proj_rush_yd!=null||e.proj_rec_yd!=null||e.proj_rec!=null?{proj_pass_yd:$(e.proj_pass_yd),proj_pass_td:$(e.proj_pass_td),proj_rush_yd:$(e.proj_rush_yd),proj_rush_td:$(e.proj_rush_td),proj_rec:$(e.proj_rec),proj_rec_yd:$(e.proj_rec_yd),proj_rec_td:$(e.proj_rec_td)}:{proj_pass_yd:$(e.pass_yds)/17,proj_pass_td:$(e.pass_tds)/17,proj_rush_yd:$(e.rush_yds)/17,proj_rush_td:$(e.rush_tds)/17,proj_rec:$(e.receptions)/17,proj_rec_yd:$(e.rec_yds)/17,proj_rec_td:$(e.rec_tds)/17}}function ve(e){const a=(e.position||"").toUpperCase(),t=C(e),l=n=>(Math.round(n*10)/10).toFixed(1),s=n=>(Math.round(n*100)/100).toFixed(2);return a==="QB"?`${l(t.proj_pass_yd)} PaYd · ${s(t.proj_pass_td)} PaTD · ${l(t.proj_rush_yd)} RuYd avg`:a==="RB"?`${l(t.proj_rush_yd)} RuYd · ${s(t.proj_rush_td)} RuTD · ${l(t.proj_rec)} Rec avg`:a==="WR"||a==="TE"?`${l(t.proj_rec)} Rec · ${l(t.proj_rec_yd)} RecYd avg`:""}function ge(e){const a=String(e||"").toLowerCase().split(/[^a-z]+/).filter(Boolean);return a.includes("questionable")?.85:a.some(t=>["doubtful","out","ir","pup","nfi","suspended"].includes(t))?.6:1}function _e(e){if(e.remaining_games==null)return 1;const a=Number(e.remaining_games);return!Number.isFinite(a)||a<=0?1:Math.min(1,a/17)}function V(e){const a={pass_yd:0,pass_td:0,rush_yd:0,rush_td:0,rec:0,rec_yd:0,rec_td:0};let t=0;for(const l of e){const s=Number(l.remaining_games);if(l.remaining_games==null||!Number.isFinite(s)||s<=0){t++;continue}const n=C(l),r=Number(l.remaining_games);a.pass_yd+=n.proj_pass_yd*r,a.pass_td+=n.proj_pass_td*r,a.rush_yd+=n.proj_rush_yd*r,a.rush_td+=n.proj_rush_td*r,a.rec+=n.proj_rec*r,a.rec_yd+=n.proj_rec_yd*r,a.rec_td+=n.proj_rec_td*r}return{tot:a,excluded:t}}function ye(e){const a=(e.position||"").toUpperCase(),t=C(e),l=Ne(a,{proj_pass_yd:t.proj_pass_yd||null,proj_pass_td:t.proj_pass_td||null,proj_rush_yd:t.proj_rush_yd||null,proj_rush_td:t.proj_rush_td||null,proj_rec:t.proj_rec||null,proj_rec_yd:t.proj_rec_yd||null,proj_rec_td:t.proj_rec_td||null,proj_fgm:null,proj_xpm:null}),s=Number(e.model_points??e.projected_points??e.weekly??0),n=Number(e.projection_lower??e.lower??Math.max(0,s-5)),r=Number(e.projection_upper??e.upper??s+5),d=Number(e.width??(r-n)/2),v=e.opponent_team?`vs ${c(String(e.opponent_team))}`:"no game",u=e.injury_status?` · ${c(String(e.injury_status))}`:"",i=e.remaining_games==null?"sched unknown":`${c(String(e.remaining_games))} games left`;return`${l}<div class="micro mono faint" style="margin-top:8px; text-align:center">Range ${n.toFixed(1)} – ${r.toFixed(1)} (width ${d.toFixed(1)}) · ${v}${u} · ${i}</div>`}try{const e=await ee(),a=(e==null?void 0:e.allTeams)||(e==null?void 0:e.leagueRosters)||[];a.length>0&&(A.innerHTML=a.map(t=>`<option value="${t.roster_id||t.owner_id}" ${String(t.roster_id||t.owner_id)===String(re)?"selected":""}>${c(t.team_name||t.display_name||`Team ${t.roster_id}`)} (${c(t.owner_name||t.display_name||"")})</option>`).join(""),B.innerHTML=a.map(t=>`<option value="${t.roster_id||t.owner_id}" ${String(t.roster_id||t.owner_id)===String(ne)?"selected":""}>${c(t.team_name||t.display_name||`Team ${t.roster_id}`)} (${c(t.owner_name||t.display_name||"")})</option>`).join(""))}catch(e){console.error("Failed to load team list:",e)}async function fe(e){const a=String(e);if(F.has(a))return F.get(a);const t=await ee({roster_id:a});return F.set(a,t),t}async function E(e){var v,u;const a=e==="A",t=a?A.value:B.value,l=a?ie:oe,s=a?de:le,n=a?w:j;if(!t)return;F.has(String(t))||(l.innerHTML='<div class="empty">Loading team roster…</div>');const r=await fe(t);a?b=r:x=r;const d=((v=r==null?void 0:r.teamMeta)==null?void 0:v.team_name)||((u=r==null?void 0:r.teamMeta)==null?void 0:u.owner_name)||`Team ${t}`;s.textContent=`${d} (${a?"Sending":"Receiving"})`,$e(l,N(r),e,n),q(),G(),W()}function q(){ce.textContent=`${w.size} player${w.size===1?"":"s"} selected`,pe.textContent=`${j.size} player${j.size===1?"":"s"} selected`}function $e(e,a,t,l){if(!a||a.length===0){e.innerHTML='<div class="empty">No roster players found</div>';return}e.innerHTML=`
      <div style="display:flex; flex-direction:column">
        ${a.map(s=>{const n=String(s.player_id||s.id),r=l.has(n),d=Number(s.model_points??s.projected_points??s.weekly??0).toFixed(1),v=Number(s.model_season_points??s.ros??d*17).toFixed(0),u=s.auction_price_paid??s.auction??s.marketAuction??0,i=ve(s),p=`${t}:${n}`,f=H.has(p);return`
            <label class="row align-between" style="padding:10px 14px; cursor:pointer; background:${r?"var(--surface-raised)":"transparent"}; border-bottom:1px solid var(--border); transition:background 0.15s; border-top:1px solid ${te((s.team||"").toUpperCase())}">
              <div class="row align-center" style="gap:10px">
                <input type="checkbox" class="trade-check" data-side="${t}" data-pid="${n}" ${r?"checked":""} title="Select ${c(s.player_name||s.full_name||n)} for trade" style="width:16px; height:16px; cursor:pointer" />
                <span style="width:8px; height:8px; border-radius:50%; background:${te((s.team||"").toUpperCase())}; flex-shrink:0" aria-hidden="true"></span>
                ${se(s,28)}
                <div>
                  <div class="row align-center" style="gap:6px">
                    <strong style="font-size:13px">${c(s.player_name||s.full_name||n)}</strong>
                    ${ae(s.position)}
                    ${s.injury_status?Re(s.injury_status):""}
                  </div>
                  <div class="micro faint" style="margin-top:2px; display:flex; align-items:center; gap:4px">
                    <span class="slot-tag" style="font-size:10px; font-weight:700; letter-spacing:0.3px; padding:1px 5px; border-radius:4px; background:${s.slot&&s.slot!=="BENCH"&&s.slot!=="IR"?"rgba(56,189,248,0.12); color:var(--sky); border:1px solid rgba(56,189,248,0.25)":s.slot==="IR"?"rgba(244,63,94,0.12); color:var(--crimson); border:1px solid rgba(244,63,94,0.25)":"rgba(148,163,184,0.12); color:var(--text-muted); border:1px solid rgba(148,163,184,0.2)"}">${c(s.slot||(s.position&&!s.team?"IR":"BENCH"))}</span>
                    <span>Draft Cost: $${u}</span> · ${Te(s.team,14)} <span>${s.team||"FA"} ${s.opponent_team?`vs ${s.opponent_team}`:""}</span>
                  </div>
                  ${i?`<div class="micro mono faint" style="margin-top:2px">${c(i)}</div>`:""}
                </div>
              </div>
              <div style="text-align:right">
                <div class="mono" style="font-weight:700; font-size:13px; color:var(--accent)">${d} <span class="micro faint">pts/wk</span></div>
                <div class="micro faint mono">${v} pts ROS</div>
                <button class="trade-expand" data-side="${t}" data-pid="${c(n)}" title="Show projected stats" style="margin-top:4px; font-size:11px; background:transparent; color:var(--text-muted); border:1px solid var(--border); border-radius:6px; padding:1px 8px; cursor:pointer">${f?"▾ stats":"▸ stats"}</button>
              </div>
            </label>
            <div class="trade-detail" data-side="${t}" data-pid="${c(n)}" style="display:${f?"block":"none"}; padding:10px 14px; border-bottom:1px solid var(--border); background:var(--surface-raised)">
              ${ye(s)}
            </div>
          `}).join("")}
      </div>
    `,e.querySelectorAll(".trade-check").forEach(s=>{s.addEventListener("change",n=>{const r=n.target.dataset.pid,d=n.target.dataset.side==="A"?w:j;n.target.checked?d.add(r):d.delete(r),q(),G(),W()})}),e.querySelectorAll(".trade-expand").forEach(s=>{s.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation();const r=`${s.dataset.side}:${s.dataset.pid}`,d=e.querySelector(`.trade-detail[data-side="${s.dataset.side}"][data-pid="${s.dataset.pid}"]`);H.has(r)?(H.delete(r),s.innerHTML="▸ stats",d&&(d.style.display="none")):(H.add(r),s.innerHTML="▾ stats",d&&(d.style.display="block"))})})}function be(e,a,t,l){const s=V(e),n=V(a),r=g=>Math.round(g).toLocaleString("en-US"),d=g=>(Math.round(g*10)/10).toFixed(1),v=[["Pass","pass_yd","pass_td",r,d],["Rush","rush_yd","rush_td",r,d],["Rec","rec_yd","rec_td",r,d]].map(([g,h,R,S,T])=>{const K=s.tot[h],Y=s.tot[R],Q=n.tot[h],J=n.tot[R],z=Q-K,X=J-Y,Se=Z=>Z>0?"text-ok":Z<0?"text-bad":"faint";return`<div class="row align-between mono" style="padding:2px 0; font-size:12px"><span class="faint" style="width:44px">${g}</span><span>${S(K)} yd · ${T(Y)} TD</span><span class="faint">→</span><span>${S(Q)} yd · ${T(J)} TD</span><span class="${Se(z)}" style="min-width:110px; text-align:right">${z>=0?"+":""}${S(z)} yd · ${X>=0?"+":""}${T(X)} TD</span></div>`}).join(""),u=s.excluded+n.excluded,i=e.length,p=a.length,f=i===p?`Even player count (${i} ↔ ${p}) — no open slots change hands.`:i>p?`${c(t)} sends ${i}, receives ${p} — gains ${i-p} open slot${i-p>1?"s":""}. See Evaluate below for waiver value.`:`${c(l)} sends ${p}, receives ${i} — gains ${p-i} open slot${p-i>1?"s":""}. See Evaluate below for waiver value.`,o=[...e,...a].map(g=>Number(g.width)).filter(g=>Number.isFinite(g)),m=o.length?o.reduce((g,h)=>g+h,0)/o.length:NaN,_=Number.isFinite(m)?m>=7?`<span style="color:var(--amber)">Low confidence — wide intervals (avg width ${m.toFixed(1)})</span>`:m<=5?`<span style="color:var(--emerald)">High confidence — tight intervals (avg width ${m.toFixed(1)})</span>`:`<span class="faint">Medium confidence (avg width ${m.toFixed(1)})</span>`:"";return`<div style="font-size:12px"><div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px">ROS stat impact — ${c(t)} gives ↔ ${c(l)} gives (net for ${c(t)})</div>`+v+(u?`<div class="micro faint" style="margin-top:4px">ROS excludes ${u} player${u>1?"s":""} with unknown schedule data.</div>`:"")+`<div class="micro" style="margin-top:6px">${f}</div>`+(_?`<div class="micro" style="margin-top:2px">${_}</div>`:"")+"</div>"}const D=["QB","RB","WR","TE","FLEX","K","DEF"];function I(e,a,t,l){if(!e)return"";const s=i=>{const p=Number(i.model_points??i.projected_points??i.weekly??0);return Number.isFinite(p)?p:0},n=a||new Set,r=new Set((t||[]).map(i=>String(i.player_id||i.id))),d={};for(const i of N(e)){const p=(i.position||"UNK").toUpperCase();(d[p]=d[p]||[]).push(i)}for(const i of t||[]){const p=(i.position||"UNK").toUpperCase();(d[p]=d[p]||[]).push({...i,_incoming:!0})}const u=Object.keys(d).sort((i,p)=>{const f=D.indexOf(i),o=D.indexOf(p);return(f<0?99:f)-(o<0?99:o)}).map(i=>{const p=d[i].slice().sort((_,g)=>s(g)-s(_)),f=p.filter(_=>!_._incoming&&!n.has(String(_.player_id||_.id))),o=f.reduce((_,g)=>_+s(g),0),m=p.map(_=>{const g=String(_.player_id||_.id),h=_._incoming||r.has(g),R=!h&&n.has(g);return`<div class="depth-card depth-${h?"in":R?"out":"kept"}">
          ${se(_,34)}
          <div style="flex:1; min-width:0">
            <div class="depth-name">${c(_.player_name||g)}</div>
            <div class="micro faint">${ae(i)} · <span class="mono">${s(_).toFixed(1)}</span></div>
          </div>
          <span class="depth-tag">${h?"IN":R?"OUT":""}</span>
        </div>`}).join("");return`<div class="depth-group">
        <div class="depth-group-head"><strong>${c(i)}</strong><span class="faint"> · ${f.length} kept · ${o.toFixed(1)}/wk</span></div>
        <div class="depth-cards">${m}</div>
      </div>`}).join("");return`<div><div class="depth-team">${c(l)} <span class="faint">post-trade</span></div>${u}</div>`}function W(){var s,n;if(!M)return;if(!b&&!x){M.innerHTML="";return}const e=N(b).filter(r=>w.has(String(r.player_id||r.id))),a=N(x).filter(r=>j.has(String(r.player_id||r.id)));if(!e.length&&!a.length){M.innerHTML="";return}const t=((s=b==null?void 0:b.teamMeta)==null?void 0:s.team_name)||"Team A",l=((n=x==null?void 0:x.teamMeta)==null?void 0:n.team_name)||"Team B";M.innerHTML='<div class="card"><div class="card-body"><div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px">Post-trade depth by position</div><div class="grid grid-2" style="font-size:12px">'+I(b,w,a,t)+I(x,j,e,l)+"</div></div></div>"}async function G(){var p,f;await me();const e=N(b).filter(o=>w.has(String(o.player_id||o.id))),a=N(x).filter(o=>j.has(String(o.player_id||o.id))),t=((p=b==null?void 0:b.teamMeta)==null?void 0:p.team_name)||"Team A",l=((f=x==null?void 0:x.teamMeta)==null?void 0:f.team_name)||"Team B";if(e.length===0&&a.length===0){U.innerHTML=`
        <div class="alert alert-info" style="font-size:13px">
          Check players in <strong>${c(t)}</strong> and <strong>${c(l)}</strong> rosters above to calculate trade model impact.
        </div>
      `;return}const s=o=>{if(!o)return 0;let m;const _=Number(o.auction??o.auction_value);if((o.auction??o.auction_value)!=null&&Number.isFinite(_)&&_!==0)m=_;else{const h=(o.position||"").toUpperCase(),R=Number(o.model_season_points??o.ros??(o.model_points??o.projected_points??o.weekly??0)*17);if(k){const S=He(R,h,k),T=Oe(R,h,k);S>1?m=S:T>0?m=Math.max(S,T):m=S}else m=Number(o.auction_price_paid??o.amount_paid??o.auction??o.auction_value??1)}const g=m*ge(o.injury_status)*_e(o);return Number.isFinite(g)?Math.max(0,g):0},n=e.reduce((o,m)=>o+s(m),0),r=a.reduce((o,m)=>o+s(m),0),d=r-n;let v="EVEN / FAIR TRADE",u="var(--text-muted)",i="var(--surface-raised)";d>=8?(v=`WIN FOR ${t.toUpperCase()}`,u="var(--emerald)",i="rgba(16,185,129,0.1)"):d>=5?(v=`LEAN TO ${t.toUpperCase()}`,u="var(--emerald)",i="rgba(16,185,129,0.07)"):d<=-8?(v=`WIN FOR ${l.toUpperCase()}`,u="var(--amber)",i="rgba(245,158,11,0.1)"):d<=-5&&(v=`LEAN TO ${l.toUpperCase()}`,u="var(--amber)",i="rgba(245,158,11,0.07)"),U.innerHTML=`
      <div class="card" style="border-top:1px solid ${u}; background:${i}">
        <div class="card-body">
          <div class="row align-between align-center" style="flex-wrap:wrap; gap:12px">
            <div>
              <div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px">Trade verdict: $ VOR ROS</div>
              <h2 style="margin:2px 0 0; color:${u}">${c(v)}</h2>
            </div>
            <div class="row" style="gap:24px; flex-wrap:wrap">
              <div class="stat">
                <div class="stat-value mono ${d>=0?"text-ok":"text-bad"}" style="font-size:20px">
                  ${d>=0?"+":""}$${d.toFixed(0)}
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

          ${be(e,a,t,l)}

          <div class="divider" style="margin:14px 0"></div>

          <div class="grid grid-2" style="font-size:12px">
            <div>
              <strong style="color:var(--text)">${c(t)} Gives ($${n} $ VOR ROS):</strong>
              ${e.length?e.map(o=>{const m=s(o);return`
                <div class="row align-between" style="padding:3px 0">
                  <span>${c(o.player_name)} (${o.position})</span>
                  <span class="mono faint">$${m} $ VOR</span>
                </div>
              `}).join(""):'<div class="faint">No players selected</div>'}
            </div>
            <div>
              <strong style="color:var(--text)">${c(l)} Gives ($${r} $ VOR ROS):</strong>
              ${a.length?a.map(o=>{const m=s(o);return`
                <div class="row align-between" style="padding:3px 0">
                  <span>${c(o.player_name)} (${o.position})</span>
                  <span class="mono faint">$${m} $ VOR</span>
                </div>
              `}).join(""):'<div class="faint">No players selected</div>'}
            </div>
          </div>
        </div>
      </div>
    `}async function xe(){L.innerHTML='<div class="empty">Running positional VBD analysis…</div>';try{const e=await ke(A.value,B.value,{tradedA:[...w],tradedB:[...j]});if(!e){L.innerHTML='<div class="alert alert-warn">Trade evaluation returned no result.</div>';return}const a=je(e),t=he(e),l=we(e);L.innerHTML=`
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
        ${t}
        ${l}
        ${a}
      `}catch{L.innerHTML='<div class="alert alert-bad">Trade evaluation failed. See console.</div>'}}function he(e){var r,d;if(e.market_a==null&&e.market_b==null)return"";const a=e.market_a!=null?Number(e.market_a).toLocaleString("en-US"):"—",t=e.market_b!=null?Number(e.market_b).toLocaleString("en-US"):"—",l=v=>(v||[]).filter(u=>Number.isFinite(Number(u.trend30))&&Number(u.trend30)!==0).map(u=>{const i=Number(u.trend30);return`<span class="micro" style="color:${i>0?"var(--emerald)":"var(--crimson)"}">${c(u.player_name||"")} ${i>0?"▲":"▼"}</span>`}).join(" · "),s=l((r=e.packages)==null?void 0:r.a),n=l((d=e.packages)==null?void 0:d.b);return`<div class="divider" style="margin:12px 0"></div><div style="font-size:12px"><div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">Market value — FantasyCalc (millions of real trades)</div><div class="mono">Team A pkg <strong>${a}</strong> vs Team B pkg <strong>${t}</strong></div>`+(s||n?`<div style="margin-top:4px">${s}${s&&n?" · ":""}${n} <span class="faint">30-day trend</span></div>`:"")+"</div>"}function we(e){const a=e.slots;if(!a||!a.gained_a&&!a.gained_b)return"";const t=(l,s,n,r)=>{if(!s)return"";const d=r&&r.length?` — best fill: ${r.map(v=>c(String(v))).join(", ")} (+${Number(n).toFixed(1)} pts ROS)`:` — no waiver fill found, credit +${Number(n).toFixed(1)}`;return`<div style="padding:2px 0">Team ${c(l)} gains ${s} open slot${s>1?"s":""}${d}</div>`};return'<div class="divider" style="margin:12px 0"></div><div style="font-size:12px"><div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">Open-slot waiver credit <span class="faint">(2-for-1s free a bench spot)</span></div>'+t("A",a.gained_a,a.credit_a_ros,a.fill_a)+t("B",a.gained_b,a.credit_b_ros,a.fill_b)+"</div>"}function je(e){const a=Number(e.slots_gained_a??0),t=Number(e.slots_gained_b??0);if(!a&&!t)return"";const l=Number(e.slot_uplift_a??0),s=Number(e.slot_uplift_b??0),n=Array.isArray(e.slot_waiver_a)?e.slot_waiver_a:[],r=Array.isArray(e.slot_waiver_b)?e.slot_waiver_b:[],d=e.slot_rule==="experimental"?"experimental":"baseline",v=(u,i,p,f)=>i?`<div style="padding:2px 0">Team ${c(u)} gains ${i} open slot${i>1?"s":""}`+(f.length?` — waiver: ${f.map(o=>c(String(o))).join(", ")}`:"")+` (+${p.toFixed(1)} pts ROS marginal uplift)</div>`:"";return`<div class="divider" style="margin:12px 0"></div><div style="font-size:12px"><div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">Roster slots <span class="faint">(${c(d)}${d==="baseline"?" — informational, not in verdict":" — folded into verdict"})</span></div>`+v("A",a,l,n)+v("B",t,s,r)+"</div>"}A.addEventListener("change",()=>{w.clear(),E("A")}),B.addEventListener("change",()=>{j.clear(),E("B")}),ue.addEventListener("click",xe),await Promise.all([E("A"),E("B")])}function N(y){return y?[...y.starters||[],...Array.isArray(y.bench)?y.bench:[],...Array.isArray(y.reserve)?y.reserve:[]]:[]}export{Pe as renderTrade};
