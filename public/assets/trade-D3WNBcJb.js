import{k as xe,h as m,N as Fe,r as we,p as ne,i as ie,j as Ee,t as ke,J as ze}from"./index-BGtn1Ijh.js";const Ce=(r,y,g)=>Math.min(g,Math.max(y,r));function je(...r){const y=r.flat().map(Number).filter(Number.isFinite);return Math.max(1,...y)}function Q(r,y,g,b,f){if(!r||!y||!r.length||r.length!==y.length)return"";const l=r.length,o=B=>l===1?50:B/(l-1)*100,q=B=>29-Ce(Number(B)||0,0,g)/g*27,L=B=>B.map((H,F)=>`${o(F).toFixed(2)},${q(H).toFixed(2)}`).join(" "),O=Number(f||15),R=(b||[]).findIndex(B=>Number(B)>=O);return`<svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">${R>0&&R<l?`<rect x="${o(R).toFixed(2)}" y="0" width="${(100-o(R)).toFixed(2)}" height="30" class="po-shade"></rect>`:""}<polyline class="ln-before" vector-effect="non-scaling-stroke" points="${L(r)}"></polyline><polyline class="ln-after" vector-effect="non-scaling-stroke" points="${L(y)}"></polyline></svg>`}function se(r){if(!r)return"";const y=["QB","RB","WR","TE","DEF","K"],g=l=>{const o=y.indexOf(l);return o<0?99:o},b=Object.entries(r).map(([l,o])=>[l,Number(o)||0]).filter(([,l])=>Math.abs(l)>=.05).sort((l,o)=>g(l[0])-g(o[0]));if(!b.length)return"";const f=Math.max(...b.map(([,l])=>Math.abs(l)),1);return`<div class="gd-block">${b.map(([l,o])=>`
    <div class="gd-row"><span class="gd-lab">${l}</span>
      <div class="gd-track"><div class="gd-fill ${o>=0?"pos":"neg"}" style="width:${(Math.abs(o)/f*50).toFixed(1)}%"></div></div>
      <span class="gd-val ${o>=0?"pos":"neg"}">${o>0?"+":""}${o.toFixed(1)}</span>
    </div>`).join("")}</div>`}if(typeof process<"u"&&process.argv[1]&&import.meta.url===new URL(`file://${process.argv[1]}`).href){const r=(l,o)=>{if(!l)throw new Error(`tradeViz: ${o}`)},y=je([100,110,120],[110,120,130]);r(y===130,"sharedMax takes the top of every series");const g=Q([100,110,120],[110,120,130],y,[4,5,6],15);r(g.includes("ln-before")&&g.includes("ln-after"),"both lines render"),r(!g.includes("po-shade"),"no playoff shade outside the playoff window");const b=Q([100,110,120],[100,110,120],130,[14,15,16],15);r(b.includes("po-shade"),"shade starts at the first playoff week"),r(Q([1],[2,3],10,[],15)==="","length mismatch hides the chart"),r(Q([],[],10,[],15)==="","empty input hides the chart");const f=se({RB:15.3,WR:-7.8,QB:0});r(f.includes("gd-fill pos")&&f.includes("gd-fill neg"),"bars go both ways"),r(!f.includes(">QB<"),"zero deltas drop out"),r(se({})===""&&se(null)==="","empty deltas render nothing"),console.log("tradeViz self-check ok")}async function qe(r){const y=new URLSearchParams(location.hash.split("?")[1]||"");let g=y.get("team_a")||"1",b=y.get("team_b")||"2";r.innerHTML=`
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
  `;const f=r.querySelector("#selectTeamA"),l=r.querySelector("#selectTeamB"),o=r.querySelector("#tradeSummaryBanner"),q=r.querySelector("#teamARoster"),L=r.querySelector("#teamBRoster"),O=r.querySelector("#teamAHeader"),R=r.querySelector("#teamBHeader"),oe=r.querySelector("#teamASub"),B=r.querySelector("#teamBSub"),H=r.querySelector("#tradeDepth"),F=new Map;let w=null,k=null;const j=new Set,S=new Set,V=new Set;let E=null,Y=!1,I=!1,G=!1;const h=e=>{const a=Number(e);return Number.isFinite(a)?a:0};function de(e){return e.proj_pass_yd!=null||e.proj_rush_yd!=null||e.proj_rec_yd!=null||e.proj_rec!=null?{proj_pass_yd:h(e.proj_pass_yd),proj_pass_td:h(e.proj_pass_td),proj_rush_yd:h(e.proj_rush_yd),proj_rush_td:h(e.proj_rush_td),proj_rec:h(e.proj_rec),proj_rec_yd:h(e.proj_rec_yd),proj_rec_td:h(e.proj_rec_td)}:{proj_pass_yd:h(e.pass_yds)/17,proj_pass_td:h(e.pass_tds)/17,proj_rush_yd:h(e.rush_yds)/17,proj_rush_td:h(e.rush_tds)/17,proj_rec:h(e.receptions)/17,proj_rec_yd:h(e.rec_yds)/17,proj_rec_td:h(e.rec_tds)/17}}function Se(e){const a=(e.position||"").toUpperCase(),t=de(e),u=n=>(Math.round(n*10)/10).toFixed(1),s=n=>(Math.round(n*100)/100).toFixed(2);return a==="QB"?`${u(t.proj_pass_yd)} PaYd · ${s(t.proj_pass_td)} PaTD · ${u(t.proj_rush_yd)} RuYd avg`:a==="RB"?`${u(t.proj_rush_yd)} RuYd · ${s(t.proj_rush_td)} RuTD · ${u(t.proj_rec)} Rec avg`:a==="WR"||a==="TE"?`${u(t.proj_rec)} Rec · ${u(t.proj_rec_yd)} RecYd avg`:""}function Ae(e){const a=(e.position||"").toUpperCase(),t=de(e),u=ze(a,{proj_pass_yd:t.proj_pass_yd||null,proj_pass_td:t.proj_pass_td||null,proj_rush_yd:t.proj_rush_yd||null,proj_rush_td:t.proj_rush_td||null,proj_rec:t.proj_rec||null,proj_rec_yd:t.proj_rec_yd||null,proj_rec_td:t.proj_rec_td||null,proj_fgm:null,proj_xpm:null}),s=Number(e.model_points??e.projected_points??e.weekly??0),n=Number(e.projection_lower??e.lower??Math.max(0,s-5)),i=Number(e.projection_upper??e.upper??s+5),d=Number(e.width??(i-n)/2),$=e.opponent_team?`vs ${m(String(e.opponent_team))}`:"no game",x=e.injury_status?` · ${m(String(e.injury_status))}`:"",p=e.remaining_games==null?"sched unknown":`${m(String(e.remaining_games))} games left`;return`${u}<div class="micro mono faint" style="margin-top:8px; text-align:center">Range ${n.toFixed(1)} – ${i.toFixed(1)} (width ${d.toFixed(1)}) · ${$}${x} · ${p}</div>`}try{const e=await xe(),a=(e==null?void 0:e.allTeams)||(e==null?void 0:e.leagueRosters)||[];a.length>0&&(f.innerHTML=a.map(t=>`<option value="${t.roster_id||t.owner_id}" ${String(t.roster_id||t.owner_id)===String(g)?"selected":""}>${m(t.team_name||t.display_name||`Team ${t.roster_id}`)} (${m(t.owner_name||t.display_name||"")})</option>`).join(""),l.innerHTML=a.map(t=>`<option value="${t.roster_id||t.owner_id}" ${String(t.roster_id||t.owner_id)===String(b)?"selected":""}>${m(t.team_name||t.display_name||`Team ${t.roster_id}`)} (${m(t.owner_name||t.display_name||"")})</option>`).join(""))}catch(e){console.error("Failed to load team list:",e)}async function Be(e){const a=String(e);if(F.has(a))return F.get(a);const t=await xe({roster_id:a});return F.set(a,t),t}async function J(e){var $,x;const a=e==="A",t=a?f.value:l.value,u=a?q:L,s=a?O:R,n=a?j:S;if(!t)return;F.has(String(t))||(u.innerHTML='<div class="empty">Loading team roster…</div>');const i=await Be(t);a?w=i:k=i;const d=(($=i==null?void 0:i.teamMeta)==null?void 0:$.team_name)||((x=i==null?void 0:i.teamMeta)==null?void 0:x.owner_name)||`Team ${t}`;s.textContent=`${d} (${a?"Sending":"Receiving"})`,Te(u,K(i),e,n),le(),E=null,I=!1,G=!1,z(),me()}function le(){oe.textContent=`${j.size} player${j.size===1?"":"s"} selected`,B.textContent=`${S.size} player${S.size===1?"":"s"} selected`}function Te(e,a,t,u){if(!a||a.length===0){e.innerHTML='<div class="empty">No roster players found</div>';return}e.innerHTML=`
      <div style="display:flex; flex-direction:column">
        ${a.map(s=>{const n=String(s.player_id||s.id),i=u.has(n),d=Number(s.model_points??s.projected_points??s.weekly??0).toFixed(1),$=Number(s.model_season_points??s.ros??d*17).toFixed(0),x=s.auction_price_paid??s.auction??s.marketAuction??0,p=Se(s),_=`${t}:${n}`,A=V.has(_);return`
            <label class="row align-between" style="padding:10px 14px; cursor:pointer; background:${i?"var(--surface-raised)":"transparent"}; border-bottom:1px solid var(--border); transition:background 0.15s; border-top:1px solid ${we((s.team||"").toUpperCase())}">
              <div class="row align-center" style="gap:10px">
                <input type="checkbox" class="trade-check" data-side="${t}" data-pid="${n}" ${i?"checked":""} title="Select ${m(s.player_name||s.full_name||n)} for trade" style="width:16px; height:16px; cursor:pointer" />
                <span style="width:8px; height:8px; border-radius:50%; background:${we((s.team||"").toUpperCase())}; flex-shrink:0" aria-hidden="true"></span>
                ${ne(s,28)}
                <div>
                  <div class="row align-center" style="gap:6px">
                    <strong style="font-size:13px">${m(s.player_name||s.full_name||n)}</strong>
                    ${ie(s.position)}
                    ${s.injury_status?Ee(s.injury_status):""}
                  </div>
                  <div class="micro faint" style="margin-top:2px; display:flex; align-items:center; gap:4px">
                    <span class="slot-tag" style="font-size:10px; font-weight:700; letter-spacing:0.3px; padding:1px 5px; border-radius:4px; background:${s.slot&&s.slot!=="BENCH"&&s.slot!=="IR"?"rgba(56,189,248,0.12); color:var(--sky); border:1px solid rgba(56,189,248,0.25)":s.slot==="IR"?"rgba(244,63,94,0.12); color:var(--crimson); border:1px solid rgba(244,63,94,0.25)":"rgba(148,163,184,0.12); color:var(--text-muted); border:1px solid rgba(148,163,184,0.2)"}">${m(s.slot||(s.position&&!s.team?"IR":"BENCH"))}</span>
                    <span>Draft Cost: $${x}</span> · ${ke(s.team,14)} <span>${s.team||"FA"} ${s.opponent_team?`vs ${s.opponent_team}`:""}</span>
                  </div>
                  ${p?`<div class="micro mono faint" style="margin-top:2px">${m(p)}</div>`:""}
                </div>
              </div>
              <div style="text-align:right">
                <div class="mono" style="font-weight:700; font-size:13px; color:var(--accent)">${d} <span class="micro faint">pts/wk</span></div>
                <div class="micro faint mono">${$} pts ROS</div>
                <button class="trade-expand" data-side="${t}" data-pid="${m(n)}" title="Show projected stats" style="margin-top:4px; font-size:11px; background:transparent; color:var(--text-muted); border:1px solid var(--border); border-radius:6px; padding:1px 8px; cursor:pointer">${A?"▾ stats":"▸ stats"}</button>
              </div>
            </label>
            <div class="trade-detail" data-side="${t}" data-pid="${m(n)}" style="display:${A?"block":"none"}; padding:10px 14px; border-bottom:1px solid var(--border); background:var(--surface-raised)">
              ${Ae(s)}
            </div>
          `}).join("")}
      </div>
    `,e.querySelectorAll(".trade-check").forEach(s=>{s.addEventListener("change",n=>{const i=n.target.dataset.pid,d=n.target.dataset.side==="A"?j:S;n.target.checked?d.add(i):d.delete(i),le(),E&&(G=!0),E=null,I=!1,z(),me()})}),e.querySelectorAll(".trade-expand").forEach(s=>{s.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation();const i=`${s.dataset.side}:${s.dataset.pid}`,d=e.querySelector(`.trade-detail[data-side="${s.dataset.side}"][data-pid="${s.dataset.pid}"]`);V.has(i)?(V.delete(i),s.innerHTML="▸ stats",d&&(d.style.display="none")):(V.add(i),s.innerHTML="▾ stats",d&&(d.style.display="block"))})})}const ce=["QB","RB","WR","TE","FLEX","K","DEF"];function pe(e,a,t,u){if(!e)return"";const s=p=>{const _=Number(p.model_points??p.projected_points??p.weekly??0);return Number.isFinite(_)?_:0},n=a||new Set,i=new Set((t||[]).map(p=>String(p.player_id||p.id))),d={};for(const p of K(e)){const _=(p.position||"UNK").toUpperCase();(d[_]=d[_]||[]).push(p)}for(const p of t||[]){const _=(p.position||"UNK").toUpperCase();(d[_]=d[_]||[]).push({...p,_incoming:!0})}const x=Object.keys(d).sort((p,_)=>{const A=ce.indexOf(p),C=ce.indexOf(_);return(A<0?99:A)-(C<0?99:C)}).map(p=>{const _=d[p].slice().sort((v,T)=>s(T)-s(v)),A=_.filter(v=>!v._incoming&&!n.has(String(v.player_id||v.id))),C=A.reduce((v,T)=>v+s(T),0),W=_.map(v=>{const T=String(v.player_id||v.id),D=v._incoming||i.has(T),Z=!D&&n.has(T);return`<div class="depth-card depth-${D?"in":Z?"out":"kept"}">
          ${ne(v,34)}
          <div style="flex:1; min-width:0">
            <div class="depth-name">${m(v.player_name||T)}</div>
            <div class="micro faint">${ie(p)} · <span class="mono">${s(v).toFixed(1)}</span></div>
          </div>
          <span class="depth-tag">${D?"IN":Z?"OUT":""}</span>
        </div>`}).join("");return`<div class="depth-group">
        <div class="depth-group-head"><strong>${m(p)}</strong><span class="faint"> · ${A.length} kept · ${C.toFixed(1)}/wk</span></div>
        <div class="depth-cards">${W}</div>
      </div>`}).join("");return`<div><div class="depth-team">${m(u)} <span class="faint">post-trade</span></div>${x}</div>`}function me(){var s,n;if(!H)return;if(!w&&!k){H.innerHTML="";return}const e=K(w).filter(i=>j.has(String(i.player_id||i.id))),a=K(k).filter(i=>S.has(String(i.player_id||i.id)));if(!e.length&&!a.length){H.innerHTML="";return}const t=((s=w==null?void 0:w.teamMeta)==null?void 0:s.team_name)||"Team A",u=((n=k==null?void 0:k.teamMeta)==null?void 0:n.team_name)||"Team B";H.innerHTML='<div class="card"><div class="card-body"><div class="micro faint" style="text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px">Post-trade depth by position</div><div class="grid grid-2" style="font-size:12px">'+pe(w,j,a,t)+pe(k,S,e,u)+"</div></div></div>"}function X(e){const a=e==="A"?w:k,t=e==="A"?j:S;return K(a).filter(u=>t.has(String(u.player_id||u.id)))}function ue(e){return e.map(a=>m(a.player_name||a.full_name||"?")).join(", ")}function z(){if(Y){o.innerHTML='<div class="card"><div class="card-body"><div class="empty" style="padding:8px">Grading trade…</div></div></div>';return}if(E){const t=E;o.innerHTML=Ne(t.data,t.nameA,t.nameB,t.listA,t.listB);return}const e=X("A"),a=X("B");if(!e.length&&!a.length){o.innerHTML='<div class="alert alert-info" style="font-size:13px">Tick players on both sides to grade the trade.</div>';return}o.innerHTML=`
      ${I?'<div class="alert alert-warn" style="font-size:13px">Couldn’t grade this trade right now.</div>':""}
      <div class="alert alert-info" style="font-size:13px">
        <div><strong>Send:</strong> ${ue(e)||"—"} · <strong>Receive:</strong> ${ue(a)||"—"}</div>
        ${G?'<div class="faint" style="margin-top:4px">Selection changed — review the picks, then analyze again.</div>':""}
        <div style="margin-top:8px"><button class="btn btn-primary" id="tradeAnalyzeBtn">Analyze trade</button></div>
      </div>`}async function Re(){var d,$;if(Y)return;const e=((d=w==null?void 0:w.teamMeta)==null?void 0:d.team_name)||"Team A",a=(($=k==null?void 0:k.teamMeta)==null?void 0:$.team_name)||"Team B",t=[f.value,l.value,[...j].join(","),[...S].join(",")].join("\0"),u=X("A"),s=X("B");Y=!0,I=!1,G=!1,z();let n=null;try{n=await Fe(f.value,l.value,{tradedA:[...j],tradedB:[...S]})}catch{}if(Y=!1,[f.value,l.value,[...j].join(","),[...S].join(",")].join("\0")!==t){z();return}if(!n||n.cold){I=!0,z();return}E={data:n,nameA:e,nameB:a,listA:u,listB:s},z()}o.addEventListener("click",e=>{e.target.closest("#tradeAnalyzeBtn")&&Re()});function Ne(e,a,t,u=[],s=[]){var _e,ye,fe,he,$e,be;const n=e.winner==="Even"?"Fair trade":`${e.winner} wins the trade`,i=e.market_a!=null?Number(e.market_a).toLocaleString("en-US"):null,d=e.market_b!=null?Number(e.market_b).toLocaleString("en-US"):null,$=c=>({player_id:c.player_id||c.id,sleeper_id:c.sleeper_id||null,player_name:c.player_name||c.full_name,position:c.position,team:c.team,weekly:Number(c.model_points??c.projected_points??c.weekly??0),market:c.auction??c.marketAuction??null}),x=(ye=(_e=e.packages)==null?void 0:_e.a)!=null&&ye.length?e.packages.a:u.map($),p=(he=(fe=e.packages)==null?void 0:fe.b)!=null&&he.length?e.packages.b:s.map($),_=c=>c.reduce((M,P)=>M+Number(P.weekly??0),0),A=_(x).toFixed(1),C=_(p).toFixed(1),W=Number(e.value_difference??0),v=i!=null&&d!=null?Number(e.market_b)-Number(e.market_a):null,T=v!=null&&Number(e.market_a)+Number(e.market_b)>0?Math.abs(v)/(Number(e.market_a)+Number(e.market_b)):0,D=v!=null&&Math.abs(W)>=20&&T>=.1&&W>0!=v>0,Z=c=>`
      <div class="pcard">
        ${ne(c,36)}
        <div class="pcard-main">
          <div class="pcard-name">${m(c.player_name||"")}</div>
          <div class="micro faint">${ie(c.position)} ${ke(c.team,12)}</div>
        </div>
        <div style="text-align:right">
          <div class="pcard-pts">${Number(c.weekly??0).toFixed(1)}<span class="micro faint">/wk</span></div>
          ${c.market!=null?`<div class="micro faint">mkt ${Number(c.market).toLocaleString("en-US")}</div>`:""}
        </div>
      </div>`,N=e.slots,ge=(c,M,P,U)=>{if(!M)return"";const re=U&&U.length?` — adds ${U.map(He=>m(String(He))).join(", ")}`:"";return`<div class="micro" style="margin-top:4px">+${M} bench spot${M>1?"s":""} for ${m(c)}${re} <span class="faint">(+${Number(P).toFixed(0)} ROS)</span></div>`},ee=e.team_a||null,te=e.team_b||null,ae=e.calendar||{},Me=Array.isArray(ae.weeks_left)?ae.weeks_left:[],Le=je(ee?(ee.lineup_before||[]).concat(ee.lineup_after||[]):[],te?(te.lineup_before||[]).concat(te.lineup_after||[]):[]),ve=(c,M,P,U)=>`
      <div>
        <div class="kicker" style="margin-bottom:6px">${m(c)} gives</div>
        <div class="pcards">${M.map(Z).join("")||'<div class="empty">—</div>'}</div>
        ${P?Pe(P,Le,Me,ae):""}
        ${(U||[]).length?`
          <div class="kicker" style="margin:10px 0 4px">What ${m(c)} wins</div>
          <ul class="win-list">${U.map(re=>`<li>${m(re)}</li>`).join("")}</ul>`:""}
      </div>`;return`<div class="card"><div class="card-body">
      <div class="kicker">Trade verdict</div>
      <h2 class="verdict-headline">${m(n)}</h2>
      <div class="micro faint" style="margin-bottom:8px">${m(a)} gives ${A}/wk · gets ${C}/wk${i&&d?` · market ${i} vs ${d}`:""}</div>
      ${D?`<div class="alert alert-warn" style="font-size:12px; margin-bottom:8px">Model and market disagree here — the model likes the ${W>0?"incoming":"outgoing"} side, real leagues pay more for the other. Trust the market on stars, the model on depth.</div>`:""}
      <div class="signal-cols" style="margin-top:10px">
        ${ve(a,x,ee,($e=e.analysis)==null?void 0:$e.a)}
        ${ve(t,p,te,(be=e.analysis)==null?void 0:be.b)}
      </div>
      ${N?ge(a,N.gained_a,N.credit_a_ros,N.fill_a)+ge(t,N.gained_b,N.credit_b_ros,N.fill_b):""}
    </div></div>`}f.addEventListener("change",()=>{j.clear(),J("A")}),l.addEventListener("change",()=>{S.clear(),J("B")}),await Promise.all([J("A"),J("B")])}function Pe(r,y,g,b){const f=Q(r.lineup_before||[],r.lineup_after||[],y,g,b.playoff_week_start);if(!f)return"";const l=r.gains||{},o=Number(l.raw_per_week??l.gain_per_week??0)||0,q=o>.05?"pos":o<-.05?"neg":"",L=g.findIndex(R=>Number(R)>=Number(b.playoff_week_start||15)),O=g.length?`weeks ${g[0]}–${g[g.length-1]}`:"";return`
    <div class="row align-between" style="margin:10px 0 4px">
      <div class="kicker">Weekly impact</div>
      <span class="delta-badge ${q}">${o>0?"+":""}${o.toFixed(1)}/wk</span>
    </div>
    <div class="impact">${f}</div>
    <div class="impact-legend micro faint">
      <span><i class="lg lg-before"></i>before&nbsp;<i class="lg lg-after"></i>after</span>
      <span>${O}${L>0?" · shaded = playoffs":""}</span>
    </div>
    ${se(r.group_delta)}`}function K(r){return r?[...r.starters||[],...Array.isArray(r.bench)?r.bench:[],...Array.isArray(r.reserve)?r.reserve:[]]:[]}export{qe as renderTrade};
