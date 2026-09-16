import{D as pe,m as ve,p as B,t as P,j as F,o as xe,h as $e,E as he,x as ke,g as we,e as M,k as Se,f as Le}from"./index-CIIdx54w.js";import{B as ue,d as V,e as T,m as Me,c as Re}from"./auctionMath-C3MdTGNI.js";import{p as _e}from"./playerCard-sUltim5K.js";import{b as Ee,r as ne,a as le}from"./relevance-C3SYLMeE.js";const U="ffba-auction-draft";function W(a){const r=a!==void 0?a:pe();return r?`${U}:${r}`:U}function Ae(a){const r=W(a);try{const s=localStorage.getItem(r);if(s)return JSON.parse(s);if(r!==U){const u=localStorage.getItem(U);if(u)return JSON.parse(u)}}catch{}return{drafted:{},myRoster:[],myBudget:ue,nominations:[]}}function de(a,r){try{localStorage.setItem(W(r),JSON.stringify(a))}catch{}}function Fe(a){try{localStorage.removeItem(W(a))}catch{}}function Ce(a,r,s,u,m,t){const b=(a.position||"").toUpperCase(),y=m[b]??0,x=a.fp_tier??a.tier??5,p=a.edge||"NEUTRAL",l=Number(a.widthRos??a.width*4??20),n=a.auction??1,i=a.deltaRos;let d=Math.min(n+(p==="BUY"?6:p==="SELL"?-2:2),u);x<=2&&p==="BUY"&&(d=Math.min(d+4,u)),l>40&&(d=Math.max(1,d-2)),d=Math.max(1,Math.min(d,s-Math.max(0,t-1)));let o,g,w;return s<5?(o="BUDGET TIGHT: $1 only",g="var(--crimson)",w=`You have $${s} left. Only bid $1 unless ${a.player_name} is your last starter.`):a.isDrafted?(o="Already drafted",g="var(--text-faint)",w=`${a.player_name} is gone for $${a.draftedPrice??"?"} (${a.draftedBy}).`,d=0):p==="BUY"&&y>0?(o="STRONG BUY: bid aggressively",g="var(--emerald)",w=`Model sees +${i!=null?Number(i).toFixed(0):"?"} season vs Market (T${x}, ${b} need: ${y} left). Value $${n} → cap $${d} (max $${u}). Narrow interval ±${l.toFixed(0)} = floor play.`):p==="BUY"?(o="BUY: value but you're set at "+b,g="var(--emerald)",w=`Value says $${n} (+${i!=null?Number(i).toFixed(0):"?"} vs Market, T${x}) but you have no ${b} need (${y} left). Nominate to drain opponents, or cap $${d} if you want depth.`):p==="SELL"?(o="CAUTION: Market overpay",g="var(--crimson)",w=`Market pays ${i!=null?Math.abs(Number(i)).toFixed(0):"?"} season more than Model (T${x}). Let others burn cash: cap $${d} ($${n} sticker). Wide interval ±${l.toFixed(0)} = risky.`):(o=y>0?"Fair value: fill need":"Fair value: depth",g=y>0?"var(--amber)":"var(--text-muted)",w=`Neutral edge T${x}: fair at $${n} (Δ ${i!=null?(Number(i)>0?"+":"")+Number(i).toFixed(0):"—"}). ${y>0?`You need ${y} more ${b}: cap $${d}.`:`No ${b} need: cap $${d} for depth.`} Max $${u}, $${s} left.`),{title:o,color:g,text:w,cap:Math.max(0,Math.round(d))}}const Be=new Set(["player_name","position","weekly","ros","marketRos","deltaRos","fp_ecr","fp_adp","statsguy_rank","vor","auction","marketAuction","deltaAuction","edge_score","tier"]);function Pe(a){const r=Be.has(a.get("sort"))?a.get("sort"):"auction",s=a.get("dir")==="1"?1:-1;return{sortKey:r,sortDir:s}}function Te(a,r,s,u={}){const m=u.relevanceFirst?Ee(a,u.accessors):null;return[...a].sort((t,b)=>{if(m){const p=ne(t,u.accessors,m)-ne(b,u.accessors,m);if(p!==0)return p;const l=le(t,u.accessors,m)-le(b,u.accessors,m);if(l!==0)return l}const y=t[r],x=b[r];return y==null&&x==null?0:y==null?1:x==null?-1:typeof y=="number"&&typeof x=="number"?(y-x)*s:typeof y=="string"&&typeof x=="string"?y.localeCompare(x)*s:String(y).localeCompare(String(x))*s})}function Ue(a,r,s){return r!==a?"none":s===-1?"descending":"ascending"}function h(a,r,s,u,m=""){const t=s===a?u===-1?"▼":"▲":"↕",b=Ue(a,s,u);return`<th data-sort="${a}" tabindex="0" role="button" aria-label="Sort by ${r}" aria-sort="${b}" style="cursor:pointer${m?";"+m:""}">${r} ${t}</th>`}function Ne(a,r,s){const u=a?`
    ${h("weekly","Model Wk",r,s,"color:var(--amber); border-bottom:2px solid var(--amber)")}
    ${h("ros","Model Season (17g)",r,s,"color:var(--amber); border-bottom:2px solid var(--amber)")}
    ${h("marketRos","Market Season (17g)",r,s,"color:var(--sky); border-bottom:2px solid var(--sky)")}
    ${h("deltaRos","Season Δ",r,s,"border-bottom:2px solid var(--border)")}
    ${h("fp_ecr","ECR",r,s)}
    ${h("fp_adp","ADP",r,s)}
    ${h("statsguy_rank","StatsGuy",r,s,"color:var(--violet)")}
  `:`
    ${h("weekly","Model Wk",r,s)}
    ${h("ros","Season (17g)",r,s)}
  `,m=a?`
    ${h("marketAuction","Market $",r,s,"color:var(--sky)")}
    ${h("deltaAuction","Δ $",r,s)}
    ${h("edge_score","Edge",r,s)}
  `:"";return`
    <th style="width:32px">#</th>
    ${h("player_name","Player",r,s)}
    ${h("position","Pos",r,s)}
    ${u}
    ${h("vor","VOR",r,s)}
    ${h("auction","Model $",r,s,"color:var(--amber)")}
    ${m}
    <th>Interval</th>
    ${h("tier","T",r,s)}
    <th>Draft</th>
  `}function ce(a,r,s){const u=a.slice(0,120).map((t,b)=>`
    <tr style="${t.isDrafted?"opacity:0.35; text-decoration:line-through":""};--team-accent:${ve((t.team||"").toUpperCase())}; ${t.edge==="BUY"?"background:rgba(16,185,129,0.06)":t.edge==="SELL"?"background:rgba(239,68,68,0.06)":""}" data-pid="${t.player_id}" data-team="${t.team||""}">
      <td class="mono-muted" style="font-size:11px">${b+1}</td>
      <td>
        <div class="player-cell">${B(t,28)}<div class="player-cell-info"><div class="player-cell-name">${s(t.player_name)}</div><div class="player-cell-sub">${P(t.team,14)} ${s(t.team||"")}${t.opponent_team?" vs "+s(t.opponent_team):""}</div></div></div>
      </td>
      <td>${F(t.position)}</td>
      <td class="mono" style="color:var(--amber)">${t.weekly.toFixed(1)}</td>
      <td class="mono" style="font-weight:700">${t.ros.toFixed(0)}</td>
      ${r?`
        <td class="mono" style="color:var(--sky)">${t.marketRos!=null?t.marketRos.toFixed(0):"—"}</td>
        <td>${V(t.deltaRos)}</td>
        <td class="mono" style="font-size:11px; color:var(--text-muted)">${t.fp_ecr!=null?`#${t.fp_ecr}${t.fp_tier?` <span style="background:var(--violet-dim); color:var(--violet); border:1px solid rgba(168,85,247,0.18); border-radius:999px; padding:1px 5px; font:700 10px ui-monospace, SFMono-Regular,monospace">T${t.fp_tier}</span>`:""}`:"—"}</td>
        <td class="mono" style="font-size:11px; color:var(--text-muted)">${t.fp_adp!=null?"#"+t.fp_adp:"—"}</td>
        <td class="mono" style="font-size:11px; color:var(--violet)">${t.statsguy_rank!=null?`#${t.statsguy_rank} <span style="color:var(--text-faint)">(${t.statsguy_value.toFixed(0)})</span>`:"—"}</td>
      `:""}
      <td class="mono" style="color:${t.vor>30?"var(--emerald)":t.vor>15?"var(--amber)":"var(--text-muted)"}">+${t.vor.toFixed(0)}</td>
      <td><span class="badge" style="background:${t.auction>=15?"var(--emerald)":t.auction>=5?"var(--amber-dim)":"var(--surface-raised)"}; color:${t.auction>=15?"white":t.auction>=5?"var(--amber)":"var(--text-muted)"}; border:1px solid ${t.auction>=15?"var(--emerald)":"var(--border)"}">$${t.auction}</span></td>
      ${r?`<td class="mono" style="color:var(--sky)"><span class="badge" style="background:var(--sky-dim); color:var(--sky); border:1px solid rgba(56,189,248,0.2)">$${t.marketAuction}</span></td><td class="mono" style="font-weight:700; color:${t.deltaAuction>4?"var(--emerald)":t.deltaAuction<-4?"var(--crimson)":"var(--text-muted)"}">${t.deltaAuction>0?"+":""}$${t.deltaAuction}</td>`:""}
      ${r?`<td>${T(t.edge)}</td>`:""}
      <td class="mono-muted" style="font-size:11px">${(t.ros-t.widthRos).toFixed(0)}–${(t.ros+t.widthRos).toFixed(0)}</td>
      <td class="faint" style="font:600 11px Helvetica Neue, Helvetica,sans-serif">T${t.tier}</td>
      <td>
        <div style="display:flex; gap:4px; align-items:center">
          <button class="btn btn-ghost btn-sm focusBtn" data-pid="${t.player_id}" title="Focus for live advice" style="font-size:11px; padding:2px 6px">👁</button>
          ${t.isDrafted?`<span class="micro faint">${t.draftedBy==="me"?"Mine":"Taken"}${t.draftedPrice?" $"+t.draftedPrice:""}</span>`:`<button class="btn btn-ghost btn-sm draftBtn" data-pid="${t.player_id}" data-name="${s(t.player_name)}" data-val="${t.auction}" style="font-size:11px; padding:2px 8px">Draft</button>`}
        </div>
      </td>
    </tr>
  `).join(""),m=a.filter(t=>!t.isDrafted).slice(0,50).map(t=>{const b=_e(t,{showDraftBtn:!0,showTeamLogo:!0});if(!r)return b;const y=t.deltaRos!=null?`<span class="mono" style="font-size:10px; color:${Number(t.deltaRos)>8?"var(--emerald)":Number(t.deltaRos)<-8?"var(--crimson)":"var(--text-faint)"}">${Number(t.deltaRos)>0?"+":""}${Number(t.deltaRos).toFixed(0)} season Δ</span>`:'<span class="mono" style="font-size:10px; color:var(--text-faint)">season Δ —</span>';return b.replace("</div>\\n",`  <div style="margin-top:8px; display:flex; gap:6px; align-items:center; flex-wrap:wrap; padding-top:8px; border-top:1px solid var(--border)"><button class="btn btn-ghost btn-sm focusBtn" data-pid="${t.player_id}" title="Focus for live advice" style="font-size:11px; padding:2px 6px">👁</button><span class="mono" style="font-size:10px; color:var(--text-muted)">Mkt ${t.marketRos!=null?t.marketRos.toFixed(0):"—"}</span>${y}<span class="spacer"></span>${T(t.edge)}</div></div>\\n`)}).join("");return{rows:u,cards:m}}function De(a,r,s,u,m,t,b){var y,x,p;(y=a.querySelector("#copyModelVsMarketCsv"))==null||y.addEventListener("click",()=>{let l=s;u&&(l=l.filter(o=>(o.edge||"NEUTRAL")!=="NEUTRAL"||!0));const n=[["rank","player","pos","team","model_wk","model_season","market_season","season_delta","fp_ecr","fp_adp","vor","auction","edge"]];l.slice(0,150).forEach((o,g)=>{n.push([g+1,`"${o.player_name}"`,o.position,o.team,o.weekly.toFixed(1),o.ros.toFixed(1),o.marketRos!=null?o.marketRos.toFixed(1):"",o.deltaRos!=null?o.deltaRos.toFixed(1):"",o.fp_ecr??"",o.fp_adp??"",o.vor.toFixed(1),o.auction,o.edge])});const i=n.map(o=>o.join(",")).join(`
`);navigator.clipboard.writeText(i);const d=a.querySelector("#copyModelVsMarketCsv");if(d){const o=d.textContent;d.textContent="Copied",setTimeout(()=>d.textContent=o,1200)}}),a.querySelectorAll("[data-sort]").forEach(l=>{l.addEventListener("click",()=>{const n=l.getAttribute("data-sort"),i=new URLSearchParams(location.hash.split("?")[1]||""),d=i.get("sort")||"auction",o=i.get("dir")==="1"?1:-1;let g=-1;d===n?g=o*-1:g=n==="player_name"?1:-1,i.set("sort",n),i.set("dir",String(g)),location.hash="auction?"+i.toString()}),l.addEventListener("keydown",n=>{(n.key==="Enter"||n.key===" ")&&(n.preventDefault(),l.click())})}),(x=a.querySelector("#toggleSortDir"))==null||x.addEventListener("click",()=>{const l=new URLSearchParams(location.hash.split("?")[1]||""),n=l.get("dir")==="1"?1:-1;l.set("sort",l.get("sort")||"auction"),l.set("dir",String(n*-1)),location.hash="auction?"+l.toString()}),a.querySelectorAll(".draftBtn").forEach(l=>{l.addEventListener("click",()=>{const n=l.dataset.pid,i=l.dataset.name,d=l.dataset.val;me(a,n,i,d,m,r,t,b)})}),a.querySelectorAll(".focusBtn").forEach(l=>{l.addEventListener("click",()=>{const n=l.dataset.pid,i=new URLSearchParams(location.hash.split("?")[1]||"");i.set("focus",n),location.hash="auction?"+i.toString()})}),a.querySelectorAll(".player-cell, [data-pid]").forEach(l=>{l.classList.contains("draftBtn")||(l.style.cursor="pointer",l.title="Open Draftea-style player details",l.addEventListener("click",n=>{if(n.target.closest(".draftBtn"))return;const i=l.closest("[data-pid]")||l,d=(i==null?void 0:i.dataset.pid)||(i==null?void 0:i.getAttribute("data-pid"));if(!d)return;const o=r.find(g=>String(g.player_id)===String(d));o&&xe(o,a)}))}),(p=a.querySelector("#copyAuction"))==null||p.addEventListener("click",()=>{const n=s.filter(o=>!o.isDrafted),i=["rank,player,pos,team,weekly,ros,vor,auction,market_season,season_delta,fp_ecr,fp_adp,edge,interval,tier"].concat(n.slice(0,120).map((o,g)=>`${g+1},"${o.player_name}",${o.position},${o.team},${o.weekly.toFixed(1)},${o.ros.toFixed(1)},${o.vor.toFixed(1)},${o.auction},${o.marketRos!=null?o.marketRos.toFixed(0):""},${o.deltaRos!=null?o.deltaRos.toFixed(0):""},${o.fp_ecr??""},${o.fp_adp??""},${o.edge},${(o.ros-o.widthRos).toFixed(0)}-${(o.ros+o.widthRos).toFixed(0)},T${o.tier}`)).join(`
`);navigator.clipboard.writeText(i);const d=a.querySelector("#copyAuction");d&&(d.textContent="Copied",setTimeout(()=>d.textContent="Copy CSV",1200))})}function me(a,r,s,u,m,t,b,y){const x=a.querySelector("#draftModal");x&&x.remove();const p=document.createElement("div");p.id="draftModal",p.style.cssText="position:fixed; inset:0; z-index:1000; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.6)",p.innerHTML=`
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:24px; min-width:300px; max-width:400px">
      <h3 style="margin:0 0 16px 0">${b(s)}</h3>
      <div style="margin-bottom:12px">
        <label style="font:500 13px Helvetica Neue, Helvetica,sans-serif; color:var(--text-muted)">Price paid</label>
        <input type="number" id="draftPrice" value="${u}" min="1" max="200" style="width:100%; background:var(--surface-raised); border:1px solid var(--border); color:var(--text); border-radius:8px; padding:8px; font-size:16px; margin-top:4px">
      </div>
      <div style="margin-bottom:16px">
        <label style="font:500 13px Helvetica Neue, Helvetica,sans-serif; color:var(--text-muted)">Who got them?</label>
        <div style="display:flex; gap:8px; margin-top:8px">
          <button class="btn btn-sm draftWho" data-who="me" style="flex:1; background:var(--color-accent); color:white">Me</button>
          <button class="btn btn-sm btn-ghost draftWho" data-who="other" style="flex:1">Other team</button>
        </div>
      </div>
      <div style="display:flex; gap:8px; justify-content:flex-end">
        ${m.drafted[r]?'<button class="btn btn-ghost btn-sm" id="draftUndo" style="color:var(--crimson)">Undo pick</button>':""}
        <button class="btn btn-ghost btn-sm" id="draftCancel">Cancel</button>
      </div>
    </div>
  `,a.appendChild(p),p.querySelector("#draftCancel").addEventListener("click",()=>p.remove()),p.addEventListener("click",n=>{n.target===p&&p.remove()}),p.querySelectorAll(".draftWho").forEach(n=>{n.addEventListener("click",()=>{const i=n.dataset.who,d=Number(p.querySelector("#draftPrice").value)||1;m.drafted[r]={by:i,price:d},i==="me"&&!m.myRoster.includes(r)&&m.myRoster.push(r),de(m),p.remove(),y()})});const l=p.querySelector("#draftUndo");l&&l.addEventListener("click",()=>{delete m.drafted[r],m.myRoster=m.myRoster.filter(n=>n!==r),de(m),p.remove(),y()})}async function O(a){var Z,K,ee,te,ae,se,re,oe;const r=new URLSearchParams(location.hash.split("?")[1]||""),s=await $e(Le,Se).catch(()=>null),u=Number(r.get("budget")||(s?s.budget:ue)),m=r.get("focus")||null;if(await he().catch(()=>"unknown")==="snake"){a.innerHTML=`
      <div class="hero reveal in"><h1>Auction Draft</h1><p>This league drafts snake-style, so auction values don't apply.</p></div>
      <div class="card reveal in" style="padding:20px">
        <div style="font-weight:700; margin-bottom:6px">Snake draft league detected</div>
        <div class="faint" style="margin-bottom:12px">Dollar values and VOR pricing assume an auction draft. Your projections, tiers, and trade lab all work normally — only this board is gated.</div>
        <div class="row" style="gap:8px">
          <a class="btn btn-primary btn-sm" href="#projections">Open Projections</a>
          <a class="btn btn-ghost btn-sm" href="#tierlists">Open Tier Lists</a>
        </div>
      </div>`;return}const[b,y]=await Promise.all([ke({}),we({limit:800}).catch(()=>({players:[],count:0,fetched_at:null,meta:{}}))]);let x=b.players||[];if(Me(x,y),!x.length){a.innerHTML=`
      <div class="hero reveal in"><h1>Auction Draft</h1><p>No projection data. Run start.sh to populate.</p></div>`;return}const p=new Map((y.players||[]).map(e=>[String(e.player_id),e])),l=new Map;for(const e of y.players||[]){const v=`${(e.player_name||"").toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim()}|${(e.position||"").toUpperCase()}`;l.set(v,e)}const n=p.size>0;let i=n;try{const e=localStorage.getItem("ffba-auction-compare");e==="0"&&(i=!1),e==="1"&&n&&(i=!0)}catch{}const d=Ae(pe());d.myBudget==null&&(d.myBudget=u);const o=Re(x,y,p,l,d,{budget:u,league:s}),{allRanked:g,posGroups:w,posBudget:fe,flexBudget:ye,nominationTargets:I,myRosterPlayers:N,myRosterCount:G,mySpent:ge,myRemaining:R,maxBid:D,slotsLeft:z,draftedCount:H,availablePlayers:q,budget:C}=o,J=[...p.values()].filter(e=>e.edge==="BUY").length,X=[...p.values()].filter(e=>e.edge==="SELL").length,Q=[...p.values()].filter(e=>e.market_season_points!=null||e.market_points!=null).length,A=r.get("pos")||"ALL",S=r.get("edge")||"ALL",{sortKey:L,sortDir:_}=Pe(r);let E=A==="ALL"?[...q]:q.filter(e=>(e.position||"").toUpperCase()===A);n&&i&&S!=="ALL"&&(E=E.filter(e=>(e.edge||"NEUTRAL")===S)),E=Te(E,L,_,{relevanceFirst:!r.get("sort")});const c=m?g.find(e=>String(e.player_id)===String(m)):null,be=o.myNeeds,k=c?Ce(c,d,R,D,be,z):null;a.innerHTML=`
    <div class="hero reveal in">
      <h1>Auction Draft <span class="badge" style="background:var(--color-accent,#16A34A); color:white; margin-left:8px; vertical-align:middle">$${C}</span></h1>
      <p>Market season projections · ECR/ADP tiers.</p>
    </div>

    ${n?`
    <div class="kpi-row reveal in" style="margin-top:12px">
      <div class="kpi-card" style="border-top:1px solid var(--emerald)">
        <div class="kpi-label" style="color:var(--emerald)">BUY edges: season</div>
        <div class="kpi-value" style="color:var(--emerald)">${J}</div>
        <div class="kpi-bar"><div class="kpi-bar-fill good" style="width:${Math.min(100,Math.round(J/Math.max(1,Math.min(40,p.size/6))*100))}%"></div></div>
        <div class="micro faint" style="font-size:11px; margin-top:6px">Model season ≥ +51 pts vs FantasyPros season (or rank ≥12 better than ECR)</div>
      </div>
      <div class="kpi-card" style="border-top:1px solid var(--crimson)">
        <div class="kpi-label" style="color:var(--crimson)">SELL flags: overpriced</div>
        <div class="kpi-value" style="color:var(--crimson)">${X}</div>
        <div class="kpi-bar"><div class="kpi-bar-fill bad" style="width:${Math.min(100,Math.round(X/Math.max(1,Math.min(40,p.size/6))*100))}%"></div></div>
        <div class="micro faint" style="font-size:11px; margin-top:6px">FantasyPros season ≥ +51 pts vs Model · avoid paying sticker</div>
      </div>
      <div class="kpi-card" style="border-top:1px solid var(--sky)">
        <div class="kpi-label" style="color:var(--sky)">Market coverage (season)</div>
        <div class="kpi-value" style="color:var(--sky)">${Q} / ${p.size}</div>
        <div class="kpi-bar"><div class="kpi-bar-fill" style="background:var(--sky); width:${Math.round(Q/Math.max(1,p.size)*100)}%"></div></div>
        <div class="micro faint" style="font-size:11px; margin-top:6px">FantasyPros season projections (596, YDS/TDS) + ECR 519/ADP 695 CSVs · Sleeper weekly fallback 98 starters</div>
      </div>
      <div class="kpi-card" style="border-top:1px solid var(--amber)">
        <div class="kpi-label" style="color:var(--amber)">Auction vs Market</div>
        <div class="kpi-value" style="font-size:14px; line-height:1.2">VOR $ from Model<br><span style="font:600 11px Helvetica Neue, Helvetica,sans-serif; color:var(--text-muted); letter-spacing:0.04em; text-transform:uppercase">$${C} × ${s?s.teams:12} teams · ${i?"Market Δ shown":"toggle Market to see Δ"}</span></div>
        <div style="display:flex; gap:6px; margin-top:8px"><button class="chip ${i?"active":""}" id="toggleAuctionCompare" style="font-size:11px">${i?"✓ Market + ECR on":"Show Market + ECR"}</button><button class="chip" id="copyModelVsMarketCsv" style="font-size:11px">Copy Model vs Market CSV</button></div>
      </div>
    </div>
    `:'<div class="alert alert-info reveal in" style="margin-top:12px">Market comparison not loaded. Showing model only.</div>'}

    <div class="kpi-row reveal in" id="auctionBudgetKpis" style="margin-top:12px; position:sticky; top:var(--header-height, 56px); z-index:10; background:var(--surface); padding:8px; border-radius:8px">
      <div class="kpi-card">
        <div class="kpi-label">My Budget</div>
        <div class="kpi-value mono" style="color:${R>50?"var(--color-accent)":R>20?"var(--amber)":"var(--crimson)"}">$${R}</div>
        <div class="kpi-bar"><div class="kpi-bar-fill ${R>100?"good":R>30?"ok":"bad"}" style="width:${(R/C*100).toFixed(0)}%"></div></div>
        <div class="micro faint">spent $${ge} / $${C}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Max Bid</div>
        <div class="kpi-value mono">$${Math.max(0,D)}</div>
        <div class="micro faint">${z} roster slots left</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">My Roster</div>
        <div class="kpi-value mono">${G}/${s?s.startersPerTeam+s.benchPerTeam:14}</div>
        <div class="micro faint">${N.map(e=>(e.position||"").toUpperCase()).join(", ")||"empty"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Draft Progress</div>
        <div class="kpi-value mono">${H}/${(s?s.teams:12)*(s?s.startersPerTeam+s.benchPerTeam:14)}</div>
        <div class="kpi-bar"><div class="kpi-bar-fill ok" style="width:${(H/((s?s.teams:12)*(s?s.startersPerTeam+s.benchPerTeam:14))*100).toFixed(0)}%"></div></div>
        <div class="micro faint">${q.length} available</div>
      </div>
    </div>

    <details class="card reveal in" style="margin-top:16px; padding:12px" ${H>0?"":"open"} aria-label="Draft prep: budget, nominations, strategy">
      <summary style="cursor:pointer; font-weight:700" title="Toggle draft prep panels">Draft prep: budget, nominations, strategy</summary>
    <div class="card reveal in" style="margin-top:16px">
      <div class="card-header"><h3>Budget Allocation</h3><span class="kicker">recommended spend by position</span></div>
      <div class="card-body" style="display:flex; gap:12px; flex-wrap:wrap">
        ${w.map(e=>{const v=fe[e],f=N.filter($=>($.position||"").toUpperCase()===e).reduce(($,j)=>{var ie;return $+(((ie=d.drafted[j.player_id])==null?void 0:ie.price)||0)},0);return`<div style="flex:1; min-width:100px; text-align:center; padding:8px; background:var(--surface-raised); border-radius:8px; border:1px solid var(--border)">
            ${F(e)}
            <div class="mono" style="font-size:18px; margin:4px 0; color:${e==="K"||e==="DEF"?"var(--text-muted)":"var(--text)"}">$${v.recommended}</div>
            <div class="micro faint">${v.slots} slot${v.slots>1?"s":""} · $${v.perSlot}/slot</div>
            ${f>0?`<div class="micro" style="color:var(--amber)">spent $${f}</div>`:""}
          </div>`}).join("")}
        <div style="flex:1; min-width:100px; text-align:center; padding:8px; background:var(--surface-raised); border-radius:8px; border:1px solid var(--border)">
          <span class="badge" style="background:var(--amber-dim); color:var(--amber)">FLEX</span>
          <div class="mono" style="font-size:18px; margin:4px 0">$${Math.max(0,ye)}</div>
          <div class="micro faint">2 slots, split RB/WR/TE</div>
        </div>
      </div>
    </div>

    <div class="card reveal in" style="margin-top:16px">
      <div class="card-header"><h3>Nomination Strategy</h3><span class="kicker">nominate these to drain opponents</span></div>
      <div class="card-body" style="font:400 13px Helvetica Neue, Helvetica,sans-serif; color:var(--text-muted); line-height:1.6">
        <div class="alert alert-ok" style="margin-bottom:12px">Nominate players at positions you've filled (or don't need yet). Force opponents to spend early while you save budget for YOUR targets. <strong>Prefer high Market $ but lower Model $</strong>: let others overpay where Market is hot but Model is cool (SELL).</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap">
          ${I.map(e=>`
            <div style="padding:6px 10px; background:${e.edge==="BUY"?"rgba(16,185,129,0.06)":e.edge==="SELL"?"rgba(239,68,68,0.06)":"var(--surface-raised)"}; border:1px solid ${e.edge==="BUY"?"var(--emerald)":e.edge==="SELL"?"var(--crimson)":"var(--border)"}; border-radius:8px; display:flex; align-items:center; gap:6px;">
              ${B(e,24)}
              ${F(e.position)}
              <strong style="font:600 12px Helvetica Neue, Helvetica,sans-serif">${M(e.player_name)}</strong>
              ${P(e.team,14)}
              <span class="badge" style="background:var(--amber-dim); color:var(--amber)">$${e.auction}</span>
              ${i&&n?T(e.edge):""}
              ${i&&e.marketRos!=null?`<span class="mono" style="font-size:10px; color:var(--text-faint)">mkt ${Number(e.marketRos).toFixed(0)}</span>`:""}
            </div>
          `).join("")}
        </div>
        ${I.length===0?'<div class="micro faint">Fill some roster spots first to generate nomination targets.</div>':""}
      </div>
    </div>

    <div class="card reveal in" style="margin-top:16px">
      <div class="card-header"><h3>Draft Strategy</h3><span class="kicker">$${u} auction</span></div>
      <div class="card-body" style="font:400 13px Helvetica Neue, Helvetica,sans-serif; color:var(--text-muted); line-height:1.6">
        <ol style="margin:0; padding-left:18px">
          <li><strong>Stars &amp; Scrubs:</strong> Spend 60-70% ($150-175) on 4-5 elite starters. Your 2-FLEX league means 7 RB/WR/TE start: premium on volume backs and target hogs.</li>
          <li><strong>Model &gt; Market = value:</strong> Filter <code class="inline">BUY</code> in Auction to see where Model season total beats Market season by ≥51 pts: bid up to Model $ there.</li>
          <li><strong>K/DEF = $1 always.</strong> MAE on kickers is 4+ pts: pure noise. Stream them.</li>
          <li><strong>$1 bench:</strong> Fill bench last at $1. Waiver wire value &gt; draft bench value in 12-team.</li>
          <li><strong>Nominate positions you've filled</strong>: prefer SELL-flagged players so opponents burn cash where you're cold.</li>
        </ol>
      </div>
    </div>
    </details>

    ${G>0?`
    <div class="card reveal in" style="margin-top:16px">
      <div class="card-header"><h3>My Drafted Players</h3>
        <button class="btn btn-ghost btn-sm" id="clearDraft" style="color:var(--crimson)">Reset Draft</button>
      </div>
      <div class="table-wrap" style="border:0; border-radius:0">
        <table>
          <thead><tr><th aria-sort="none">Player</th><th aria-sort="none">Pos</th><th aria-sort="none">Paid</th><th aria-sort="none">Value</th><th aria-sort="none">+/-</th>${i&&n?'<th aria-sort="none">Season Δ</th><th aria-sort="none">Edge</th>':""}</tr></thead>
          <tbody>
            ${N.map(e=>{var $;const v=(($=d.drafted[e.player_id])==null?void 0:$.price)||0,f=e.auction-v;return`<tr data-team="${e.team||""}" style="--team-accent:${ve((e.team||"").toUpperCase())}; ${e.edge==="BUY"?"background:rgba(16,185,129,0.06)":e.edge==="SELL"?"background:rgba(239,68,68,0.06)":""}">
                <td><div class="player-cell">${B(e,28)}<div class="player-cell-info"><div class="player-cell-name">${M(e.player_name)}</div><div class="player-cell-sub">${P(e.team,14)} ${M(e.team||"")}</div></div></div></td>
                <td>${F(e.position)}</td>
                <td class="mono">$${v}</td>
                <td class="mono">$${e.auction}</td>
                <td class="mono" style="color:${f>0?"var(--emerald)":f<0?"var(--crimson)":"var(--text-muted)"}">${f>0?"+":""}${f}</td>
                ${i&&n?`<td>${V(e.deltaRos)}</td><td>${T(e.edge)}</td>`:""}
              </tr>`}).join("")}
          </tbody>
        </table>
      </div>
    </div>`:""}

    <div class="card reveal in" id="liveAuctionCard" style="margin-top:16px; position:sticky; top:0; z-index:10; ${c?`border-top:1px solid ${k.color}; background: linear-gradient(90deg, ${k.color}14, transparent)`:""}">
      <div class="card-header"><h3 style="color:${c?k.color:"var(--text-muted)"}">${c?`On the Block: ${M(c.player_name)}`:"Live Auction: select the player being auctioned"}</h3><span class="kicker">${c?k.title:"Click 👁 to focus a row"}</span>${c?'<button class="chip" id="clearFocus" style="margin-left:auto">✕ Clear</button>':""}</div>
      <div class="card-body" style="display:flex; flex-direction:column; gap:12px">
        ${c?`
        <div style="display:flex; gap:16px; flex-wrap:wrap; align-items:center">
          <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:260px">${B(c,56)}<div><div style="font:700 16px Helvetica Neue, Helvetica,sans-serif; display:flex; gap:8px; align-items:center; flex-wrap:wrap">${M(c.player_name)} ${F(c.position)} ${P(c.team,20)} <span class="mono" style="font-size:11px; color:var(--text-muted)">T${c.fp_tier??c.tier} · ECR #${c.fp_ecr??"—"} · ADP #${c.fp_adp??"—"}${c.statsguy_value!=null?` · <span style="color:var(--violet)">SG ${c.statsguy_value.toFixed(0)} (#${c.statsguy_rank})</span>`:""}</span></div><div class="mono" style="font-size:11px; color:var(--text-muted); margin-top:2px">Model ${c.weekly.toFixed(1)} wk → <span style="color:var(--amber); font-weight:700">${c.ros.toFixed(0)} season</span> · Market <span style="color:var(--sky); font-weight:700">${c.marketRos!=null?c.marketRos.toFixed(0):"—"}</span> · Δ ${c.deltaRos!=null?(Number(c.deltaRos)>0?"+":"")+Number(c.deltaRos).toFixed(0):"—"} · VOR +${c.vor.toFixed(0)} · <span style="color:var(--amber)">$${c.auction} val</span></div></div></div>
          <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end">
            <span class="badge" style="background:${c.edge==="BUY"?"var(--emerald-dim)":"var(--crimson-dim)"}; color:${c.edge==="BUY"?"var(--emerald)":"var(--crimson)"}; font-size:12px; padding:6px 10px">${c.edge} ${V(c.deltaRos)}</span>
            ${c.statsguy_value!=null?`<span class="mono" style="font-size:11px; color:var(--violet)">StatsGuy market #${c.statsguy_rank} · ${c.statsguy_value.toFixed(0)}/10000</span>`:'<span class="mono" style="font-size:11px; color:var(--text-faint)">StatsGuy: no rank</span>'}
          </div>
        </div>
        <div class="alert" style="background:${k.color}14; border:1px solid ${k.color}33; color:var(--text)"><strong style="color:${k.color}">${k.title}</strong>: ${k.text}</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; font:500 11px Helvetica Neue, Helvetica,sans-serif">
          <span class="kicker">Cap</span> <span class="mono" style="font-size:18px; font-weight:700; color:${k.color}">$${k.cap}</span> <span class="micro faint">(max $${D} · $${R} left · ${z} slots)</span>
          <span style="flex:1"></span>
          <button class="btn btn-primary btn-sm" data-pid="${c.player_id}" id="liveDraftBtn">Draft ${M(c.player_name)} for $${k.cap}</button>
          <button class="btn btn-ghost btn-sm" data-pid="${c.player_id}" id="livePassBtn">Pass: nominate next</button>
        </div>
        `:`<div class="micro faint">Search a name, then click <span class="mono" style="background:var(--surface-raised); padding:2px 6px; border-radius:6px">👁 Focus</span> on the row.</div>
          <div style="display:flex; gap:8px; margin-top:4px"><input id="liveSearch" placeholder="Search player to focus…" style="flex:1; background:var(--surface-raised); border:1px solid var(--border); color:var(--text); border-radius:8px; padding:8px; font:400 13px Helvetica Neue, Helvetica,sans-serif" /></div>
        `}
      </div>
    </div>

    <div class="responsive-view">
    <div class="card reveal in" style="margin-top:16px">
      <div class="card-header">
        <h3>Auction Board: ${A==="ALL"?"All Positions":A} ${S!=="ALL"?`· ${S}`:""}</h3>
        <div class="row" style="gap:8px; flex-wrap:wrap">
          ${["ALL",...w].map(e=>`
            <button class="btn btn-sm ${A===e?"":"btn-ghost"} posFilter" data-pos="${e}" title="Filter board by ${e}" style="${A===e?"background:var(--color-accent); color:white":""}">${e}</button>
          `).join("")}
          ${n?`
            <span style="border-left:1px solid var(--border); margin:0 4px"></span>
            ${["ALL","BUY","SELL"].map(e=>`<button class="btn btn-sm ${S===e?"":"btn-ghost"} edgeFilter" data-edge="${e}" title="Filter board by ${e==="ALL"?"all edges":e}" style="${S===e?e==="BUY"?"background:var(--emerald); color:white":e==="SELL"?"background:var(--crimson); color:white":"background:var(--color-accent); color:white":""}">${e==="ALL"?"All":e==="BUY"?"▲ BUY":"▼ SELL"}</button>`).join("")}
          `:""}
          <span style="border-left:1px solid var(--border); margin:0 4px"></span>
          <button class="btn btn-ghost btn-sm" id="copyAuction">Copy CSV</button>
          <label class="faint" style="font:500 12px Helvetica Neue, Helvetica,sans-serif">
            <input type="checkbox" id="hideDrafted" ${r.get("hide")==="1"?"checked":""}> hide drafted
          </label>
        </div>
      </div>
      ${i&&n?`
      <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center; padding:8px 12px; background:var(--surface-raised); border:1px solid var(--border); border-radius:8px; margin-bottom:10px; font:500 11px Helvetica Neue, Helvetica,sans-serif; line-height:1.4">
        <span style="display:flex; align-items:center; gap:6px"><span style="width:10px; height:10px; background:var(--amber); border-radius:2px; display:inline-block"></span> <strong style="color:var(--amber)">Model</strong> · Wk ×17 = season</span>
        <span style="display:flex; align-items:center; gap:6px"><span style="width:10px; height:10px; background:var(--sky); border-radius:2px; display:inline-block"></span> <strong style="color:var(--sky)">Market</strong> · FantasyPros season projections (596, full YDS/TDS) + Sleeper weekly fallback</span>
        <span style="display:flex; align-items:center; gap:6px"><span style="width:10px; height:10px; background:var(--emerald); border-radius:2px; display:inline-block"></span> BUY = Model ≥ +51 pts vs Market (3/wk)</span>
        <span style="display:flex; align-items:center; gap:6px"><span style="width:10px; height:10px; background:var(--crimson); border-radius:2px; display:inline-block"></span> SELL = Market ≥ +51 pts vs Model</span>
        <span class="mono" style="color:var(--text-faint); margin-left:auto">ECR 519 / ADP 695 via CSVs: full, not sparse</span>
      </div>
      `:""}
      <div class="card" style="padding:8px 12px; background:var(--surface-raised); border:1px solid var(--border); border-radius:8px; display:flex; gap:8px; flex-wrap:wrap; align-items:center">
        <span class="kicker">Sort</span>
        <span class="mono" style="font-size:11px; color:var(--text-muted)">Click header to sort: </span>
        <button class="chip ${L==="auction"?"active":""}" data-sort="auction" title="Sort by Auction $">Auction $ ${L==="auction"?_===-1?"▼ Highest → Lowest":"▲ Lowest → Highest":"↕"}</button>
        <button class="chip ${L==="ros"?"active":""}" data-sort="ros">Model season ${L==="ros"?_===-1?"▼":"▲":"↕"}</button>
        ${i&&n?`<button class="chip ${L==="marketRos"?"active":""}" data-sort="marketRos">Market Season ${L==="marketRos"?_===-1?"▼":"▲":"↕"}</button><button class="chip ${L==="deltaRos"?"active":""}" data-sort="deltaRos">Δ ${L==="deltaRos"?_===-1?"▼":"▲":"↕"}</button>`:""}
        <button class="chip" id="toggleSortDir" title="Flip highest↔lowest">↕ ${_===-1?"Highest → Lowest":"Lowest → Highest"}</button>
        <span class="mono" style="font-size:11px; color:var(--text-faint); margin-left:auto">Click headers to sort</span>
      </div>
      <div class="table-wrap" style="border:0; border-radius:0; overflow-x:auto; max-width:100%; margin-top:10px">
        <table style="width:100%; min-width:980px;">
          <colgroup>
            <col style="width:36px">
            <col style="min-width:210px">
            ${i&&n?'<col span="16">':'<col span="8">'}
          </colgroup>
          <thead>
            <tr>
              ${Ne(i&&n,L,_)}
            </tr>
          </thead>
          <tbody>
            ${(()=>{let e=E;n&&i&&S!=="ALL"&&(e=e.filter(f=>(f.edge||"NEUTRAL")===S));const{rows:v}=ce(e,i&&n,M);return v})()}
          </tbody>
        </table>
      </div>
    </div>
    </div>
    <div class="player-cards-grid" id="auctionCards">
      ${(()=>{let e=E.filter(f=>!f.isDrafted);n&&i&&S!=="ALL"&&(e=e.filter(f=>(f.edge||"NEUTRAL")===S));const{cards:v}=ce(e,i&&n,M);return v})()}
    </div>
    <div id="playerDetailModal" style="display:none; position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); align-items:center; justify-content:center; padding:16px"><div id="playerDetailContent" style="background:var(--surface); border:1px solid var(--border); border-radius:16px; max-width:640px; width:100%; max-height:90vh; overflow:auto"></div></div>
  `,(Z=a.querySelector("#toggleAuctionCompare"))==null||Z.addEventListener("click",()=>{const e=!i;try{localStorage.setItem("ffba-auction-compare",e?"1":"0")}catch{}O(a)}),(K=a.querySelector("#fullscreenAuction"))==null||K.addEventListener("click",()=>{var v,f;const e=a.querySelector(".table-wrap");document.fullscreenElement?(v=document.exitFullscreen)==null||v.call(document):(f=e==null?void 0:e.requestFullscreen)==null||f.call(e)}),(ee=a.querySelector("#printAuction"))==null||ee.addEventListener("click",()=>window.print()),a.querySelectorAll(".posFilter").forEach(e=>{e.addEventListener("click",()=>{const v=e.dataset.pos,f=new URLSearchParams(location.hash.split("?")[1]||"");v==="ALL"?f.delete("pos"):f.set("pos",v),location.hash="auction?"+f.toString()})}),a.querySelectorAll(".edgeFilter").forEach(e=>{e.addEventListener("click",()=>{const v=e.dataset.edge,f=new URLSearchParams(location.hash.split("?")[1]||"");v==="ALL"?f.delete("edge"):f.set("edge",v),location.hash="auction?"+f.toString()})}),(te=a.querySelector("#hideDrafted"))==null||te.addEventListener("change",e=>{const v=new URLSearchParams(location.hash.split("?")[1]||"");e.target.checked?v.set("hide","1"):v.delete("hide"),location.hash="auction?"+v.toString()}),(ae=a.querySelector("#clearFocus"))==null||ae.addEventListener("click",()=>{const e=new URLSearchParams(location.hash.split("?")[1]||"");e.delete("focus"),location.hash="auction?"+e.toString()});const Y=a.querySelector("#liveSearch");Y&&Y.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();const v=Y.value.trim().toLowerCase();if(!v)return;const f=g.find($=>$.player_name.toLowerCase().includes(v)&&!$.isDrafted)||g.find($=>$.player_name.toLowerCase().includes(v));if(f){const $=new URLSearchParams(location.hash.split("?")[1]||"");$.set("focus",f.player_id),location.hash="auction?"+$.toString()}}}),(se=a.querySelector("#liveDraftBtn"))==null||se.addEventListener("click",()=>{var $;const e=($=a.querySelector("#liveDraftBtn"))==null?void 0:$.dataset.pid;if(!e)return;const v=g.find(j=>String(j.player_id)===String(e));if(!v)return;const f=k?k.cap:v.auction;me(a,e,v.player_name,f,d,g,M,()=>O(a))}),(re=a.querySelector("#livePassBtn"))==null||re.addEventListener("click",()=>{const e=new URLSearchParams(location.hash.split("?")[1]||"");e.delete("focus"),location.hash="auction?"+e.toString()}),(oe=a.querySelector("#clearDraft"))==null||oe.addEventListener("click",()=>{confirm("Clear all drafted players?")&&(Fe(),location.hash="auction")}),De(a,g,E,i&&n,d,M,()=>O(a))}export{O as renderAuction};
