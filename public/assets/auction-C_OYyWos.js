import{E as ve,m as ue,p as P,t as T,j as C,o as xe,h as he,F as ke,x as we,g as Se,e as R,k as Le,f as Me}from"./index-DjgPke4c.js";import{B as me,d as W,e as U,m as Re,c as _e}from"./auctionMath-DJvIHGXo.js";import{p as Ee}from"./playerCard-BlK80AWo.js";import{b as Ae,r as ne,a as de}from"./relevance-C3SYLMeE.js";const N="ffba-auction-draft";function I(a){const r=a!==void 0?a:ve();return r?`${N}:${r}`:N}function Fe(a){const r=I(a);try{const s=localStorage.getItem(r);if(s)return JSON.parse(s);if(r!==N){const u=localStorage.getItem(N);if(u)return JSON.parse(u)}}catch{}return{drafted:{},myRoster:[],myBudget:me,nominations:[]}}function ce(a,r){try{localStorage.setItem(I(r),JSON.stringify(a))}catch{}}function Ce(a){try{localStorage.removeItem(I(a))}catch{}}function Be(a,r,s,u,f,k){const t=(a.position||"").toUpperCase(),m=f[t]??0,g=a.fp_tier??a.tier??5,d=a.edge||"NEUTRAL",n=Number(a.widthRos??a.width*4??20),l=a.auction??1,i=a.deltaRos;let c=Math.min(l+(d==="BUY"?6:d==="SELL"?-2:2),u);g<=2&&d==="BUY"&&(c=Math.min(c+4,u)),n>40&&(c=Math.max(1,c-2)),c=Math.max(1,Math.min(c,s-Math.max(0,k-1)));let o,b,S;return s<5?(o="BUDGET TIGHT: $1 only",b="var(--crimson)",S=`You have $${s} left. Only bid $1 unless ${a.player_name} is your last starter.`):a.isDrafted?(o="Already drafted",b="var(--text-faint)",S=`${a.player_name} is gone for $${a.draftedPrice??"?"} (${a.draftedBy}).`,c=0):d==="BUY"&&m>0?(o="STRONG BUY: bid aggressively",b="var(--emerald)",S=`Model sees +${i!=null?Number(i).toFixed(0):"?"} season vs Market (T${g}, ${t} need: ${m} left). Value $${l} → cap $${c} (max $${u}). Narrow interval ±${n.toFixed(0)} = floor play.`):d==="BUY"?(o="BUY: value but you're set at "+t,b="var(--emerald)",S=`Value says $${l} (+${i!=null?Number(i).toFixed(0):"?"} vs Market, T${g}) but you have no ${t} need (${m} left). Nominate to drain opponents, or cap $${c} if you want depth.`):d==="SELL"?(o="CAUTION: Market overpay",b="var(--crimson)",S=`Market pays ${i!=null?Math.abs(Number(i)).toFixed(0):"?"} season more than Model (T${g}). Let others burn cash: cap $${c} ($${l} sticker). Wide interval ±${n.toFixed(0)} = risky.`):(o=m>0?"Fair value: fill need":"Fair value: depth",b=m>0?"var(--amber)":"var(--text-muted)",S=`Neutral edge T${g}: fair at $${l} (Δ ${i!=null?(Number(i)>0?"+":"")+Number(i).toFixed(0):"—"}). ${m>0?`You need ${m} more ${t}: cap $${c}.`:`No ${t} need: cap $${c} for depth.`} Max $${u}, $${s} left.`),{title:o,color:b,text:S,cap:Math.max(0,Math.round(c))}}const Pe=new Set(["player_name","position","weekly","ros","marketRos","deltaRos","fp_ecr","fp_adp","statsguy_rank","vor","auction","marketAuction","deltaAuction","edge_score","tier"]);function Te(a){const r=Pe.has(a.get("sort"))?a.get("sort"):"auction",s=a.get("dir")==="1"?1:-1;return{sortKey:r,sortDir:s}}function Ue(a,r,s,u={}){const f=u.relevanceFirst?Ae(a,u.accessors):null;return[...a].sort((k,t)=>{if(f){const d=ne(k,u.accessors,f)-ne(t,u.accessors,f);if(d!==0)return d;const n=de(k,u.accessors,f)-de(t,u.accessors,f);if(n!==0)return n}const m=k[r],g=t[r];return m==null&&g==null?0:m==null?1:g==null?-1:typeof m=="number"&&typeof g=="number"?(m-g)*s:typeof m=="string"&&typeof g=="string"?m.localeCompare(g)*s:String(m).localeCompare(String(g))*s})}function Ne(a,r,s){return r!==a?"none":s===-1?"descending":"ascending"}function h(a,r,s,u,f=""){const k=s===a?u===-1?"▼":"▲":"↕",t=Ne(a,s,u);return`<th data-sort="${a}" tabindex="0" role="button" aria-label="Sort by ${r}" aria-sort="${t}" style="cursor:pointer${f?";"+f:""}">${r} ${k}</th>`}function De(a,r,s,u=!0){const f=a?`
    ${h("weekly","Model Wk",r,s,"color:var(--amber); border-bottom:2px solid var(--amber)")}
    ${h("ros","Model Season (17g)",r,s,"color:var(--amber); border-bottom:2px solid var(--amber)")}
    ${u?`
    ${h("marketRos","Market Season (17g)",r,s,"color:var(--sky); border-bottom:2px solid var(--sky)")}
    ${h("deltaRos","Season Δ",r,s,"border-bottom:2px solid var(--border)")}
    ${h("fp_ecr","ECR",r,s)}
    ${h("fp_adp","ADP",r,s)}
    ${h("statsguy_rank","StatsGuy",r,s,"color:var(--violet)")}
    `:""}
  `:`
    ${h("weekly","Model Wk",r,s)}
    ${h("ros","Season (17g)",r,s)}
  `,k=a?`
    ${u?`
    ${h("marketAuction","Market $",r,s,"color:var(--sky)")}
    ${h("deltaAuction","Δ $",r,s)}
    `:""}
    ${h("edge_score","Edge",r,s)}
  `:"";return`
    <th style="width:32px">#</th>
    ${h("player_name","Player",r,s)}
    ${h("position","Pos",r,s)}
    ${f}
    ${h("vor","VOR",r,s)}
    ${h("auction","Model $",r,s,"color:var(--amber)")}
    ${k}
    <th>Interval</th>
    ${h("tier","T",r,s)}
    <th>Draft</th>
  `}function pe(a,r,s,u=!0){const f=a.slice(0,120).map((t,m)=>`
    <tr style="${t.isDrafted?"opacity:0.35; text-decoration:line-through":""};--team-accent:${ue((t.team||"").toUpperCase())}; ${t.edge==="BUY"?"background:rgba(16,185,129,0.06)":t.edge==="SELL"?"background:rgba(239,68,68,0.06)":""}" data-pid="${t.player_id}" data-team="${t.team||""}">
      <td class="mono-muted" style="font-size:11px">${m+1}</td>
      <td>
        <div class="player-cell">${P(t,28)}<div class="player-cell-info"><div class="player-cell-name">${s(t.player_name)}</div><div class="player-cell-sub">${T(t.team,14)} ${s(t.team||"")}${t.opponent_team?" vs "+s(t.opponent_team):""}</div></div></div>
      </td>
      <td>${C(t.position)}</td>
      <td class="mono" style="color:var(--amber)">${t.weekly.toFixed(1)}</td>
      <td class="mono" style="font-weight:700">${t.ros.toFixed(0)}</td>
      ${r&&u?`
        <td class="mono" style="color:var(--sky)">${t.marketRos!=null?t.marketRos.toFixed(0):"—"}</td>
        <td>${W(t.deltaRos)}</td>
        <td class="mono" style="font-size:11px; color:var(--text-muted)">${t.fp_ecr!=null?`#${t.fp_ecr}${t.fp_tier?` <span style="background:var(--violet-dim); color:var(--violet); border:1px solid rgba(168,85,247,0.18); border-radius:999px; padding:1px 5px; font:700 10px ui-monospace, SFMono-Regular,monospace">T${t.fp_tier}</span>`:""}`:"—"}</td>
        <td class="mono" style="font-size:11px; color:var(--text-muted)">${t.fp_adp!=null?"#"+t.fp_adp:"—"}</td>
        <td class="mono" style="font-size:11px; color:var(--violet)">${t.statsguy_rank!=null?`#${t.statsguy_rank} <span style="color:var(--text-faint)">(${t.statsguy_value.toFixed(0)})</span>`:"—"}</td>
      `:""}
      <td class="mono" style="color:${t.vor>30?"var(--emerald)":t.vor>15?"var(--amber)":"var(--text-muted)"}">+${t.vor.toFixed(0)}</td>
      <td><span class="badge" style="background:${t.auction>=15?"var(--emerald)":t.auction>=5?"var(--amber-dim)":"var(--surface-raised)"}; color:${t.auction>=15?"white":t.auction>=5?"var(--amber)":"var(--text-muted)"}; border:1px solid ${t.auction>=15?"var(--emerald)":"var(--border)"}">$${t.auction}</span></td>
      ${r&&u?`<td class="mono" style="color:var(--sky)"><span class="badge" style="background:var(--sky-dim); color:var(--sky); border:1px solid rgba(56,189,248,0.2)">$${t.marketAuction}</span></td><td class="mono" style="font-weight:700; color:${t.deltaAuction>4?"var(--emerald)":t.deltaAuction<-4?"var(--crimson)":"var(--text-muted)"}">${t.deltaAuction!=null?`${t.deltaAuction>0?"+":""}$${t.deltaAuction}`:"—"}</td>`:""}
      ${r?`<td>${U(t.edge)}</td>`:""}
      <td class="mono-muted" style="font-size:11px">${(t.ros-t.widthRos).toFixed(0)}–${(t.ros+t.widthRos).toFixed(0)}</td>
      <td class="faint" style="font:600 11px Helvetica Neue, Helvetica,sans-serif">T${t.tier}</td>
      <td>
        <div style="display:flex; gap:4px; align-items:center">
          <button class="btn btn-ghost btn-sm focusBtn" data-pid="${t.player_id}" title="Focus for live advice" style="font-size:11px; padding:2px 6px">👁</button>
          ${t.isDrafted?`<span class="micro faint">${t.draftedBy==="me"?"Mine":"Taken"}${t.draftedPrice?" $"+t.draftedPrice:""}</span>`:`<button class="btn btn-ghost btn-sm draftBtn" data-pid="${t.player_id}" data-name="${s(t.player_name)}" data-val="${t.auction}" style="font-size:11px; padding:2px 8px">Draft</button>`}
        </div>
      </td>
    </tr>
  `).join(""),k=a.filter(t=>!t.isDrafted).slice(0,50).map(t=>{const m=Ee(t,{showDraftBtn:!0,showTeamLogo:!0});if(!r)return m;const g=t.deltaRos!=null?`<span class="mono" style="font-size:10px; color:${Number(t.deltaRos)>8?"var(--emerald)":Number(t.deltaRos)<-8?"var(--crimson)":"var(--text-faint)"}">${Number(t.deltaRos)>0?"+":""}${Number(t.deltaRos).toFixed(0)} season Δ</span>`:"",d=u&&t.marketRos!=null?`<span class="mono" style="font-size:10px; color:var(--text-muted)">Mkt ${t.marketRos.toFixed(0)}</span>`:"";return m.replace("</div>\\n",`  <div style="margin-top:8px; display:flex; gap:6px; align-items:center; flex-wrap:wrap; padding-top:8px; border-top:1px solid var(--border)"><button class="btn btn-ghost btn-sm focusBtn" data-pid="${t.player_id}" title="Focus for live advice" style="font-size:11px; padding:2px 6px">👁</button>${d}${g}<span class="spacer"></span>${U(t.edge)}</div></div>\\n`)}).join("");return{rows:f,cards:k}}function ze(a,r,s,u,f,k,t){var m,g,d;(m=a.querySelector("#copyModelVsMarketCsv"))==null||m.addEventListener("click",()=>{let n=s;u&&(n=n.filter(o=>(o.edge||"NEUTRAL")!=="NEUTRAL"||!0));const l=[["rank","player","pos","team","model_wk","model_season","market_season","season_delta","fp_ecr","fp_adp","vor","auction","edge"]];n.slice(0,150).forEach((o,b)=>{l.push([b+1,`"${o.player_name}"`,o.position,o.team,o.weekly.toFixed(1),o.ros.toFixed(1),o.marketRos!=null?o.marketRos.toFixed(1):"",o.deltaRos!=null?o.deltaRos.toFixed(1):"",o.fp_ecr??"",o.fp_adp??"",o.vor.toFixed(1),o.auction,o.edge])});const i=l.map(o=>o.join(",")).join(`
`);navigator.clipboard.writeText(i);const c=a.querySelector("#copyModelVsMarketCsv");if(c){const o=c.textContent;c.textContent="Copied",setTimeout(()=>c.textContent=o,1200)}}),a.querySelectorAll("[data-sort]").forEach(n=>{n.addEventListener("click",()=>{const l=n.getAttribute("data-sort"),i=new URLSearchParams(location.hash.split("?")[1]||""),c=i.get("sort")||"auction",o=i.get("dir")==="1"?1:-1;let b=-1;c===l?b=o*-1:b=l==="player_name"?1:-1,i.set("sort",l),i.set("dir",String(b)),location.hash="auction?"+i.toString()}),n.addEventListener("keydown",l=>{(l.key==="Enter"||l.key===" ")&&(l.preventDefault(),n.click())})}),(g=a.querySelector("#toggleSortDir"))==null||g.addEventListener("click",()=>{const n=new URLSearchParams(location.hash.split("?")[1]||""),l=n.get("dir")==="1"?1:-1;n.set("sort",n.get("sort")||"auction"),n.set("dir",String(l*-1)),location.hash="auction?"+n.toString()}),a.querySelectorAll(".draftBtn").forEach(n=>{n.addEventListener("click",()=>{const l=n.dataset.pid,i=n.dataset.name,c=n.dataset.val;fe(a,l,i,c,f,r,k,t)})}),a.querySelectorAll(".focusBtn").forEach(n=>{n.addEventListener("click",()=>{const l=n.dataset.pid,i=new URLSearchParams(location.hash.split("?")[1]||"");i.set("focus",l),location.hash="auction?"+i.toString()})}),a.querySelectorAll(".player-cell, [data-pid]").forEach(n=>{n.classList.contains("draftBtn")||(n.style.cursor="pointer",n.title="Open Draftea-style player details",n.addEventListener("click",l=>{if(l.target.closest(".draftBtn"))return;const i=n.closest("[data-pid]")||n,c=(i==null?void 0:i.dataset.pid)||(i==null?void 0:i.getAttribute("data-pid"));if(!c)return;const o=r.find(b=>String(b.player_id)===String(c));o&&xe(o,a)}))}),(d=a.querySelector("#copyAuction"))==null||d.addEventListener("click",()=>{const l=s.filter(o=>!o.isDrafted),i=["rank,player,pos,team,weekly,ros,vor,auction,market_season,season_delta,fp_ecr,fp_adp,edge,interval,tier"].concat(l.slice(0,120).map((o,b)=>`${b+1},"${o.player_name}",${o.position},${o.team},${o.weekly.toFixed(1)},${o.ros.toFixed(1)},${o.vor.toFixed(1)},${o.auction},${o.marketRos!=null?o.marketRos.toFixed(0):""},${o.deltaRos!=null?o.deltaRos.toFixed(0):""},${o.fp_ecr??""},${o.fp_adp??""},${o.edge},${(o.ros-o.widthRos).toFixed(0)}-${(o.ros+o.widthRos).toFixed(0)},T${o.tier}`)).join(`
`);navigator.clipboard.writeText(i);const c=a.querySelector("#copyAuction");c&&(c.textContent="Copied",setTimeout(()=>c.textContent="Copy CSV",1200))})}function fe(a,r,s,u,f,k,t,m){const g=a.querySelector("#draftModal");g&&g.remove();const d=document.createElement("div");d.id="draftModal",d.style.cssText="position:fixed; inset:0; z-index:1000; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.6)",d.innerHTML=`
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:24px; min-width:300px; max-width:400px">
      <h3 style="margin:0 0 16px 0">${t(s)}</h3>
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
        ${f.drafted[r]?'<button class="btn btn-ghost btn-sm" id="draftUndo" style="color:var(--crimson)">Undo pick</button>':""}
        <button class="btn btn-ghost btn-sm" id="draftCancel">Cancel</button>
      </div>
    </div>
  `,a.appendChild(d),d.querySelector("#draftCancel").addEventListener("click",()=>d.remove()),d.addEventListener("click",l=>{l.target===d&&d.remove()}),d.querySelectorAll(".draftWho").forEach(l=>{l.addEventListener("click",()=>{const i=l.dataset.who,c=Number(d.querySelector("#draftPrice").value)||1;f.drafted[r]={by:i,price:c},i==="me"&&!f.myRoster.includes(r)&&f.myRoster.push(r),ce(f),d.remove(),m()})});const n=d.querySelector("#draftUndo");n&&n.addEventListener("click",()=>{delete f.drafted[r],f.myRoster=f.myRoster.filter(l=>l!==r),ce(f),d.remove(),m()})}async function V(a){var K,ee,te,ae,se,re,oe,ie;const r=new URLSearchParams(location.hash.split("?")[1]||""),s=await he(Me,Le).catch(()=>null),u=Number(r.get("budget")||(s?s.budget:me)),f=r.get("focus")||null;if(await ke().catch(()=>"unknown")==="snake"){a.innerHTML=`
      <div class="hero reveal in"><h1>Auction Draft</h1><p>This league drafts snake-style, so auction values don't apply.</p></div>
      <div class="card reveal in" style="padding:20px">
        <div style="font-weight:700; margin-bottom:6px">Snake draft league detected</div>
        <div class="faint" style="margin-bottom:12px">Dollar values and VOR pricing assume an auction draft. Your projections, tiers, and trade lab all work normally — only this board is gated.</div>
        <div class="row" style="gap:8px">
          <a class="btn btn-primary btn-sm" href="#projections">Open Projections</a>
          <a class="btn btn-ghost btn-sm" href="#tierlists">Open Tier Lists</a>
        </div>
      </div>`;return}const[t,m]=await Promise.all([we({}),Se({limit:800}).catch(()=>({players:[],count:0,fetched_at:null,meta:{}}))]);let g=t.players||[];if(Re(g,m),!g.length){a.innerHTML=`
      <div class="hero reveal in"><h1>Auction Draft</h1><p>No projection data. Run start.sh to populate.</p></div>`;return}const d=new Map((m.players||[]).map(e=>[String(e.player_id),e])),n=new Map;for(const e of m.players||[]){const v=`${(e.player_name||"").toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim()}|${(e.position||"").toUpperCase()}`;n.set(v,e)}const l=d.size>0;let i=l;try{const e=localStorage.getItem("ffba-auction-compare");e==="0"&&(i=!1),e==="1"&&l&&(i=!0)}catch{}const c=Fe(ve());c.myBudget==null&&(c.myBudget=u);const o=_e(g,m,d,n,c,{budget:u,league:s}),{allRanked:b,posGroups:S,posBudget:ye,flexBudget:ge,nominationTargets:G,myRosterPlayers:D,myRosterCount:J,mySpent:be,myRemaining:_,maxBid:z,slotsLeft:H,draftedCount:q,availablePlayers:Y,budget:B}=o,X=[...d.values()].filter(e=>e.edge==="BUY").length,Q=[...d.values()].filter(e=>e.edge==="SELL").length,Z=[...d.values()].filter(e=>e.market_season_points!=null||e.market_points!=null).length,$=[...d.values()].some(e=>e.market_season_points!=null||e.market_points!=null||e.marketAuction!=null||e.fp_ecr!=null||e.fp_adp!=null);$||(i=!1);const F=r.get("pos")||"ALL",L=r.get("edge")||"ALL",{sortKey:M,sortDir:E}=Te(r);let A=F==="ALL"?[...Y]:Y.filter(e=>(e.position||"").toUpperCase()===F);l&&L!=="ALL"&&(A=A.filter(e=>(e.edge||"NEUTRAL")===L)),A=Ue(A,M,E,{relevanceFirst:!r.get("sort")});const p=f?b.find(e=>String(e.player_id)===String(f)):null,$e=o.myNeeds,w=p?Be(p,c,_,z,$e,H):null;a.innerHTML=`
    <div class="hero reveal in">
      <h1>Auction Draft <span class="badge" style="background:var(--color-accent,#16A34A); color:white; margin-left:8px; vertical-align:middle">$${B}</span></h1>
      <p>Model auction values · VBD tiers${$?" · Market season projections · ECR/ADP tiers":""}.</p>
    </div>

    ${l?`
    <div class="kpi-row reveal in" style="margin-top:12px">
      <div class="kpi-card" style="border-top:1px solid var(--emerald)">
        <div class="kpi-label" style="color:var(--emerald)">BUY edges: season</div>
        <div class="kpi-value" style="color:var(--emerald)">${X}</div>
        <div class="kpi-bar"><div class="kpi-bar-fill good" style="width:${Math.min(100,Math.round(X/Math.max(1,Math.min(40,d.size/6))*100))}%"></div></div>
        <div class="micro faint" style="font-size:11px; margin-top:6px">${$?"Model season ≥ +51 pts vs FantasyPros season (or rank ≥12 better than ECR)":"Model $/VOR ≥15% below pool average"}</div>
      </div>
      <div class="kpi-card" style="border-top:1px solid var(--crimson)">
        <div class="kpi-label" style="color:var(--crimson)">SELL flags: overpriced</div>
        <div class="kpi-value" style="color:var(--crimson)">${Q}</div>
        <div class="kpi-bar"><div class="kpi-bar-fill bad" style="width:${Math.min(100,Math.round(Q/Math.max(1,Math.min(40,d.size/6))*100))}%"></div></div>
        <div class="micro faint" style="font-size:11px; margin-top:6px">${$?"FantasyPros season ≥ +51 pts vs Model · avoid paying sticker":"Model $/VOR ≥15% above pool average"}</div>
      </div>
      ${$?`
      <div class="kpi-card" style="border-top:1px solid var(--sky)">
        <div class="kpi-label" style="color:var(--sky)">Market coverage (season)</div>
        <div class="kpi-value" style="color:var(--sky)">${Z} / ${d.size}</div>
        <div class="kpi-bar"><div class="kpi-bar-fill" style="background:var(--sky); width:${Math.round(Z/Math.max(1,d.size)*100)}%"></div></div>
        <div class="micro faint" style="font-size:11px; margin-top:6px">FantasyPros season projections (596, YDS/TDS) + ECR 519/ADP 695 CSVs · Sleeper weekly fallback 98 starters</div>
      </div>
      `:""}
      <div class="kpi-card" style="border-top:1px solid var(--amber)">
        <div class="kpi-label" style="color:var(--amber)">Auction vs Market</div>
        <div class="kpi-value" style="font-size:14px; line-height:1.2">VOR $ from Model<br><span style="font:600 11px Helvetica Neue, Helvetica,sans-serif; color:var(--text-muted); letter-spacing:0.04em; text-transform:uppercase">$${B} × ${s?s.teams:12} teams${$?` · ${i?"Market Δ shown":"toggle Market to see Δ"}`:""}</span></div>
        <div style="display:flex; gap:6px; margin-top:8px">${$?`<button class="chip ${i?"active":""}" id="toggleAuctionCompare" style="font-size:11px">${i?"✓ Market + ECR on":"Show Market + ECR"}</button><button class="chip" id="copyModelVsMarketCsv" style="font-size:11px">Copy Model vs Market CSV</button>`:""}</div>
      </div>
    </div>
    `:'<div class="alert alert-info reveal in" style="margin-top:12px">Market comparison not loaded. Showing model only.</div>'}

    <div class="kpi-row reveal in" id="auctionBudgetKpis" style="margin-top:12px; position:sticky; top:var(--header-height, 56px); z-index:10; background:var(--surface); padding:8px; border-radius:8px">
      <div class="kpi-card">
        <div class="kpi-label">My Budget</div>
        <div class="kpi-value mono" style="color:${_>50?"var(--color-accent)":_>20?"var(--amber)":"var(--crimson)"}">$${_}</div>
        <div class="kpi-bar"><div class="kpi-bar-fill ${_>100?"good":_>30?"ok":"bad"}" style="width:${(_/B*100).toFixed(0)}%"></div></div>
        <div class="micro faint">spent $${be} / $${B}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Max Bid</div>
        <div class="kpi-value mono">$${Math.max(0,z)}</div>
        <div class="micro faint">${H} roster slots left</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">My Roster</div>
        <div class="kpi-value mono">${J}/${s?s.startersPerTeam+s.benchPerTeam:14}</div>
        <div class="micro faint">${D.map(e=>(e.position||"").toUpperCase()).join(", ")||"empty"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Draft Progress</div>
        <div class="kpi-value mono">${q}/${(s?s.teams:12)*(s?s.startersPerTeam+s.benchPerTeam:14)}</div>
        <div class="kpi-bar"><div class="kpi-bar-fill ok" style="width:${(q/((s?s.teams:12)*(s?s.startersPerTeam+s.benchPerTeam:14))*100).toFixed(0)}%"></div></div>
        <div class="micro faint">${Y.length} available</div>
      </div>
    </div>

    <details class="card reveal in" style="margin-top:16px; padding:12px" ${q>0?"":"open"} aria-label="Draft prep: budget, nominations, strategy">
      <summary style="cursor:pointer; font-weight:700" title="Toggle draft prep panels">Draft prep: budget, nominations, strategy</summary>
    <div class="card reveal in" style="margin-top:16px">
      <div class="card-header"><h3>Budget Allocation</h3><span class="kicker">recommended spend by position</span></div>
      <div class="card-body" style="display:flex; gap:12px; flex-wrap:wrap">
        ${S.map(e=>{const v=ye[e],y=D.filter(x=>(x.position||"").toUpperCase()===e).reduce((x,O)=>{var le;return x+(((le=c.drafted[O.player_id])==null?void 0:le.price)||0)},0);return`<div style="flex:1; min-width:100px; text-align:center; padding:8px; background:var(--surface-raised); border-radius:8px; border:1px solid var(--border)">
            ${C(e)}
            <div class="mono" style="font-size:18px; margin:4px 0; color:${e==="K"||e==="DEF"?"var(--text-muted)":"var(--text)"}">$${v.recommended}</div>
            <div class="micro faint">${v.slots} slot${v.slots>1?"s":""} · $${v.perSlot}/slot</div>
            ${y>0?`<div class="micro" style="color:var(--amber)">spent $${y}</div>`:""}
          </div>`}).join("")}
        <div style="flex:1; min-width:100px; text-align:center; padding:8px; background:var(--surface-raised); border-radius:8px; border:1px solid var(--border)">
          <span class="badge" style="background:var(--amber-dim); color:var(--amber)">FLEX</span>
          <div class="mono" style="font-size:18px; margin:4px 0">$${Math.max(0,ge)}</div>
          <div class="micro faint">2 slots, split RB/WR/TE</div>
        </div>
      </div>
    </div>

    <div class="card reveal in" style="margin-top:16px">
      <div class="card-header"><h3>Nomination Strategy</h3><span class="kicker">nominate these to drain opponents</span></div>
      <div class="card-body" style="font:400 13px Helvetica Neue, Helvetica,sans-serif; color:var(--text-muted); line-height:1.6">
        <div class="alert alert-ok" style="margin-bottom:12px">Nominate players at positions you've filled (or don't need yet). Force opponents to spend early while you save budget for YOUR targets. <strong>Prefer high Market $ but lower Model $</strong>: let others overpay where Market is hot but Model is cool (SELL).</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap">
          ${G.map(e=>`
            <div style="padding:6px 10px; background:${e.edge==="BUY"?"rgba(16,185,129,0.06)":e.edge==="SELL"?"rgba(239,68,68,0.06)":"var(--surface-raised)"}; border:1px solid ${e.edge==="BUY"?"var(--emerald)":e.edge==="SELL"?"var(--crimson)":"var(--border)"}; border-radius:8px; display:flex; align-items:center; gap:6px;">
              ${P(e,24)}
              ${C(e.position)}
              <strong style="font:600 12px Helvetica Neue, Helvetica,sans-serif">${R(e.player_name)}</strong>
              ${T(e.team,14)}
              <span class="badge" style="background:var(--amber-dim); color:var(--amber)">$${e.auction}</span>
              ${i&&l?U(e.edge):""}
              ${i&&e.marketRos!=null?`<span class="mono" style="font-size:10px; color:var(--text-faint)">mkt ${Number(e.marketRos).toFixed(0)}</span>`:""}
            </div>
          `).join("")}
        </div>
        ${G.length===0?'<div class="micro faint">Fill some roster spots first to generate nomination targets.</div>':""}
      </div>
    </div>

    <div class="card reveal in" style="margin-top:16px">
      <div class="card-header"><h3>Draft Strategy</h3><span class="kicker">$${u} auction</span></div>
      <div class="card-body" style="font:400 13px Helvetica Neue, Helvetica,sans-serif; color:var(--text-muted); line-height:1.6">
        <ol style="margin:0; padding-left:18px">
          <li><strong>Stars &amp; Scrubs:</strong> Spend 60-70% ($150-175) on 4-5 elite starters. Your 2-FLEX league means 7 RB/WR/TE start: premium on volume backs and target hogs.</li>
            <li><strong>Model &gt; Market = value:</strong> Filter <code class="inline">BUY</code> in Auction to see where ${$?"Model season total beats Market season by ≥51 pts: bid up to Model $ there.":"Model $/VOR trails the pool: bid up to Model $ there."}</li>
          <li><strong>K/DEF = $1 always.</strong> MAE on kickers is 4+ pts: pure noise. Stream them.</li>
          <li><strong>$1 bench:</strong> Fill bench last at $1. Waiver wire value &gt; draft bench value in 12-team.</li>
          <li><strong>Nominate positions you've filled</strong>: prefer SELL-flagged players so opponents burn cash where you're cold.</li>
        </ol>
      </div>
    </div>
    </details>

    ${J>0?`
    <div class="card reveal in" style="margin-top:16px">
      <div class="card-header"><h3>My Drafted Players</h3>
        <button class="btn btn-ghost btn-sm" id="clearDraft" style="color:var(--crimson)">Reset Draft</button>
      </div>
      <div class="table-wrap" style="border:0; border-radius:0">
        <table>
          <thead><tr><th aria-sort="none">Player</th><th aria-sort="none">Pos</th><th aria-sort="none">Paid</th><th aria-sort="none">Value</th><th aria-sort="none">+/-</th>${i&&l?'<th aria-sort="none">Season Δ</th><th aria-sort="none">Edge</th>':""}</tr></thead>
          <tbody>
            ${D.map(e=>{var x;const v=((x=c.drafted[e.player_id])==null?void 0:x.price)||0,y=e.auction-v;return`<tr data-team="${e.team||""}" style="--team-accent:${ue((e.team||"").toUpperCase())}; ${e.edge==="BUY"?"background:rgba(16,185,129,0.06)":e.edge==="SELL"?"background:rgba(239,68,68,0.06)":""}">
                <td><div class="player-cell">${P(e,28)}<div class="player-cell-info"><div class="player-cell-name">${R(e.player_name)}</div><div class="player-cell-sub">${T(e.team,14)} ${R(e.team||"")}</div></div></div></td>
                <td>${C(e.position)}</td>
                <td class="mono">$${v}</td>
                <td class="mono">$${e.auction}</td>
                <td class="mono" style="color:${y>0?"var(--emerald)":y<0?"var(--crimson)":"var(--text-muted)"}">${y>0?"+":""}${y}</td>
                ${i&&l?`<td>${W(e.deltaRos)}</td><td>${U(e.edge)}</td>`:""}
              </tr>`}).join("")}
          </tbody>
        </table>
      </div>
    </div>`:""}

    <div class="card reveal in" id="liveAuctionCard" style="margin-top:16px; position:sticky; top:0; z-index:10; ${p?`border-top:1px solid ${w.color}; background: linear-gradient(90deg, ${w.color}14, transparent)`:""}">
      <div class="card-header"><h3 style="color:${p?w.color:"var(--text-muted)"}">${p?`On the Block: ${R(p.player_name)}`:"Live Auction: select the player being auctioned"}</h3><span class="kicker">${p?w.title:"Click 👁 to focus a row"}</span>${p?'<button class="chip" id="clearFocus" style="margin-left:auto">✕ Clear</button>':""}</div>
      <div class="card-body" style="display:flex; flex-direction:column; gap:12px">
        ${p?`
        <div style="display:flex; gap:16px; flex-wrap:wrap; align-items:center">
          <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:260px">${P(p,56)}<div><div style="font:700 16px Helvetica Neue, Helvetica,sans-serif; display:flex; gap:8px; align-items:center; flex-wrap:wrap">${R(p.player_name)} ${C(p.position)} ${T(p.team,20)} <span class="mono" style="font-size:11px; color:var(--text-muted)">T${p.fp_tier??p.tier}${$?` · ECR #${p.fp_ecr??"—"} · ADP #${p.fp_adp??"—"}`:""}${$&&p.statsguy_value!=null?` · <span style="color:var(--violet)">SG ${p.statsguy_value.toFixed(0)} (#${p.statsguy_rank})</span>`:""}</span></div><div class="mono" style="font-size:11px; color:var(--text-muted); margin-top:2px">Model ${p.weekly.toFixed(1)} wk → <span style="color:var(--amber); font-weight:700">${p.ros.toFixed(0)} season</span>${$?` · Market <span style="color:var(--sky); font-weight:700">${p.marketRos!=null?p.marketRos.toFixed(0):"—"}</span> · Δ ${p.deltaRos!=null?(Number(p.deltaRos)>0?"+":"")+Number(p.deltaRos).toFixed(0):"—"}`:""} · VOR +${p.vor.toFixed(0)} · <span style="color:var(--amber)">$${p.auction} val</span></div></div></div>
            <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end">
            <span class="badge" style="background:${p.edge==="BUY"?"var(--emerald-dim)":"var(--crimson-dim)"}; color:${p.edge==="BUY"?"var(--emerald)":"var(--crimson)"}; font-size:12px; padding:6px 10px">${p.edge} ${$?W(p.deltaRos):""}</span>
            ${$?p.statsguy_value!=null?`<span class="mono" style="font-size:11px; color:var(--violet)">StatsGuy market #${p.statsguy_rank} · ${p.statsguy_value.toFixed(0)}/10000</span>`:'<span class="mono" style="font-size:11px; color:var(--text-faint)">StatsGuy: no rank</span>':""}
          </div>
        </div>
        <div class="alert" style="background:${w.color}14; border:1px solid ${w.color}33; color:var(--text)"><strong style="color:${w.color}">${w.title}</strong>: ${w.text}</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; font:500 11px Helvetica Neue, Helvetica,sans-serif">
          <span class="kicker">Cap</span> <span class="mono" style="font-size:18px; font-weight:700; color:${w.color}">$${w.cap}</span> <span class="micro faint">(max $${z} · $${_} left · ${H} slots)</span>
          <span style="flex:1"></span>
          <button class="btn btn-primary btn-sm" data-pid="${p.player_id}" id="liveDraftBtn">Draft ${R(p.player_name)} for $${w.cap}</button>
          <button class="btn btn-ghost btn-sm" data-pid="${p.player_id}" id="livePassBtn">Pass: nominate next</button>
        </div>
        `:`<div class="micro faint">Search a name, then click <span class="mono" style="background:var(--surface-raised); padding:2px 6px; border-radius:6px">👁 Focus</span> on the row.</div>
          <div style="display:flex; gap:8px; margin-top:4px"><input id="liveSearch" placeholder="Search player to focus…" style="flex:1; background:var(--surface-raised); border:1px solid var(--border); color:var(--text); border-radius:8px; padding:8px; font:400 13px Helvetica Neue, Helvetica,sans-serif" /></div>
        `}
      </div>
    </div>

    <div class="responsive-view">
    <div class="card reveal in" style="margin-top:16px">
      <div class="card-header">
        <h3>Auction Board: ${F==="ALL"?"All Positions":F} ${L!=="ALL"?`· ${L}`:""}</h3>
        <div class="row" style="gap:8px; flex-wrap:wrap">
          ${["ALL",...S].map(e=>`
            <button class="btn btn-sm ${F===e?"":"btn-ghost"} posFilter" data-pos="${e}" title="Filter board by ${e}" style="${F===e?"background:var(--color-accent); color:white":""}">${e}</button>
          `).join("")}
          ${l?`
            <span style="border-left:1px solid var(--border); margin:0 4px"></span>
            ${["ALL","BUY","SELL"].map(e=>`<button class="btn btn-sm ${L===e?"":"btn-ghost"} edgeFilter" data-edge="${e}" title="Filter board by ${e==="ALL"?"all edges":e}" style="${L===e?e==="BUY"?"background:var(--emerald); color:white":e==="SELL"?"background:var(--crimson); color:white":"background:var(--color-accent); color:white":""}">${e==="ALL"?"All":e==="BUY"?"▲ BUY":"▼ SELL"}</button>`).join("")}
          `:""}
          <span style="border-left:1px solid var(--border); margin:0 4px"></span>
          <button class="btn btn-ghost btn-sm" id="copyAuction">Copy CSV</button>
          <label class="faint" style="font:500 12px Helvetica Neue, Helvetica,sans-serif">
            <input type="checkbox" id="hideDrafted" ${r.get("hide")==="1"?"checked":""}> hide drafted
          </label>
        </div>
      </div>
      ${i&&l&&$?`
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
        <button class="chip ${M==="auction"?"active":""}" data-sort="auction" title="Sort by Auction $">Auction $ ${M==="auction"?E===-1?"▼ Highest → Lowest":"▲ Lowest → Highest":"↕"}</button>
        <button class="chip ${M==="ros"?"active":""}" data-sort="ros">Model season ${M==="ros"?E===-1?"▼":"▲":"↕"}</button>
        ${i&&l&&$?`<button class="chip ${M==="marketRos"?"active":""}" data-sort="marketRos">Market Season ${M==="marketRos"?E===-1?"▼":"▲":"↕"}</button><button class="chip ${M==="deltaRos"?"active":""}" data-sort="deltaRos">Δ ${M==="deltaRos"?E===-1?"▼":"▲":"↕"}</button>`:""}
        <button class="chip" id="toggleSortDir" title="Flip highest↔lowest">↕ ${E===-1?"Highest → Lowest":"Lowest → Highest"}</button>
        <span class="mono" style="font-size:11px; color:var(--text-faint); margin-left:auto">Click headers to sort</span>
      </div>
      <div class="table-wrap" style="border:0; border-radius:0; overflow-x:auto; max-width:100%; margin-top:10px">
        <table style="width:100%; min-width:980px;">
          <colgroup>
            <col style="width:36px">
            <col style="min-width:210px">
            ${i&&l?'<col span="16">':'<col span="8">'}
          </colgroup>
          <thead>
            <tr>
              ${De(i&&l,M,E,$)}
            </tr>
          </thead>
          <tbody>
            ${(()=>{let e=A;l&&L!=="ALL"&&(e=e.filter(y=>(y.edge||"NEUTRAL")===L));const{rows:v}=pe(e,i&&l,R,$);return v})()}
          </tbody>
        </table>
      </div>
    </div>
    </div>
    <div class="player-cards-grid" id="auctionCards">
      ${(()=>{let e=A.filter(y=>!y.isDrafted);l&&L!=="ALL"&&(e=e.filter(y=>(y.edge||"NEUTRAL")===L));const{cards:v}=pe(e,i&&l,R,$);return v})()}
    </div>
    <div id="playerDetailModal" style="display:none; position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); align-items:center; justify-content:center; padding:16px"><div id="playerDetailContent" style="background:var(--surface); border:1px solid var(--border); border-radius:16px; max-width:640px; width:100%; max-height:90vh; overflow:auto"></div></div>
  `,(K=a.querySelector("#toggleAuctionCompare"))==null||K.addEventListener("click",()=>{const e=!i;try{localStorage.setItem("ffba-auction-compare",e?"1":"0")}catch{}V(a)}),(ee=a.querySelector("#fullscreenAuction"))==null||ee.addEventListener("click",()=>{var v,y;const e=a.querySelector(".table-wrap");document.fullscreenElement?(v=document.exitFullscreen)==null||v.call(document):(y=e==null?void 0:e.requestFullscreen)==null||y.call(e)}),(te=a.querySelector("#printAuction"))==null||te.addEventListener("click",()=>window.print()),a.querySelectorAll(".posFilter").forEach(e=>{e.addEventListener("click",()=>{const v=e.dataset.pos,y=new URLSearchParams(location.hash.split("?")[1]||"");v==="ALL"?y.delete("pos"):y.set("pos",v),location.hash="auction?"+y.toString()})}),a.querySelectorAll(".edgeFilter").forEach(e=>{e.addEventListener("click",()=>{const v=e.dataset.edge,y=new URLSearchParams(location.hash.split("?")[1]||"");v==="ALL"?y.delete("edge"):y.set("edge",v),location.hash="auction?"+y.toString()})}),(ae=a.querySelector("#hideDrafted"))==null||ae.addEventListener("change",e=>{const v=new URLSearchParams(location.hash.split("?")[1]||"");e.target.checked?v.set("hide","1"):v.delete("hide"),location.hash="auction?"+v.toString()}),(se=a.querySelector("#clearFocus"))==null||se.addEventListener("click",()=>{const e=new URLSearchParams(location.hash.split("?")[1]||"");e.delete("focus"),location.hash="auction?"+e.toString()});const j=a.querySelector("#liveSearch");j&&j.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();const v=j.value.trim().toLowerCase();if(!v)return;const y=b.find(x=>x.player_name.toLowerCase().includes(v)&&!x.isDrafted)||b.find(x=>x.player_name.toLowerCase().includes(v));if(y){const x=new URLSearchParams(location.hash.split("?")[1]||"");x.set("focus",y.player_id),location.hash="auction?"+x.toString()}}}),(re=a.querySelector("#liveDraftBtn"))==null||re.addEventListener("click",()=>{var x;const e=(x=a.querySelector("#liveDraftBtn"))==null?void 0:x.dataset.pid;if(!e)return;const v=b.find(O=>String(O.player_id)===String(e));if(!v)return;const y=w?w.cap:v.auction;fe(a,e,v.player_name,y,c,b,R,()=>V(a))}),(oe=a.querySelector("#livePassBtn"))==null||oe.addEventListener("click",()=>{const e=new URLSearchParams(location.hash.split("?")[1]||"");e.delete("focus"),location.hash="auction?"+e.toString()}),(ie=a.querySelector("#clearDraft"))==null||ie.addEventListener("click",()=>{confirm("Clear all drafted players?")&&(Ce(),location.hash="auction")}),ze(a,b,A,i&&l,c,R,()=>V(a))}export{V as renderAuction};
