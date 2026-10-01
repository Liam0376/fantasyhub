import{f as H,H as C,n as $,h as r,O as _,P as w,y as D,q as R,Q as k,R as U,S as A,T as E,U as j}from"./index-BGtn1Ijh.js";function F(u){return`<div class="player-modal-backdrop show" id="setupBackdrop" style="position:fixed; inset:0; z-index:2000; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; padding:16px">
    <div class="card player-modal-card show" id="setupCard" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="setupTitle" style="max-width:520px; width:100%; max-height:90vh; overflow:auto; padding:20px">
      ${u}
    </div>
  </div>`}function I(u){return u==="auction"?'<span class="badge" style="background:var(--amber-dim); color:var(--amber)">auction</span>':u==="snake"?'<span class="badge" style="background:var(--sky-dim); color:var(--sky)">snake</span>':'<span class="badge">draft type unknown</span>'}async function z({onDone:u}={}){const g=document.activeElement;let d=document.getElementById("setupModalRoot");d||(d=document.createElement("div"),d.id="setupModalRoot",document.body.appendChild(d));let m=null;const S=()=>{try{m&&m()}catch{}m=null},p=a=>{S(),d.innerHTML="";try{g&&g.focus&&g.focus()}catch{}typeof u=="function"&&u(a)},h=a=>{S(),d.innerHTML=F(a);const t=d.querySelector("#setupCard");m=D(t,g,()=>p(!1));const e=d.querySelector("#setupClose");return e&&e.addEventListener("click",()=>p(!1)),d.querySelector("#setupBackdrop").addEventListener("click",l=>{l.target.id==="setupBackdrop"&&p(!1)}),t},y=await H().catch(()=>null),L=y&&y.configuredLeagues||[],T=C(),f=y&&y.season?String(y.season):String(new Date().getFullYear()),M=L.length?`<label class="faint" for="setupExisting" style="display:block; margin-bottom:4px">Synced leagues on this machine</label>
    <div class="row" style="gap:8px; margin-bottom:16px">
      <select id="setupExisting" class="team-select-dropdown" style="flex:1">${L.map(a=>{const t=String(a.league_id||"");if(!t)return"";const e=t===T?"selected":"",l=`${a.league_name||"League"} (${t.slice(0,6)}…)`;return`<option value="${$(t)}" ${e}>${r(l)}</option>`}).join("")}</select>
      <button class="btn btn-ghost btn-sm" id="setupUseExisting">Use</button>
    </div>`:"",x=()=>{const a=h(`
      <h2 id="setupTitle" style="margin:0 0 4px">Fantasy league setup</h2>
      <p class="faint" style="margin:0 0 16px">Enter your Sleeper username to find your leagues.</p>
      ${M}
      <label class="faint" for="setupUsername" style="display:block; margin-bottom:4px">Sleeper username</label>
      <div class="row" style="gap:8px; margin-bottom:12px">
        <input id="setupUsername" class="search-top" style="flex:1; border:1px solid var(--border); border-radius:8px; padding:8px 10px" placeholder="your_username" autocomplete="off" autocapitalize="none" spellcheck="false" />
        <button class="btn btn-primary btn-sm" id="setupLookup">Find leagues</button>
      </div>
      <div id="setupResult" aria-live="polite"></div>
      <div class="row" style="gap:8px; margin-top:16px; justify-content:flex-end">
        <button class="btn btn-ghost btn-sm" id="setupClose">Close</button>
      </div>
    `),t=a.querySelector("#setupUseExisting");t&&t.addEventListener("click",()=>{const s=a.querySelector("#setupExisting").value;_(s)&&(w(s),p(!0))});const e=a.querySelector("#setupResult"),l=async()=>{const s=(a.querySelector("#setupUsername").value||"").trim();if(!s){e.innerHTML='<div class="alert alert-bad">Enter your Sleeper username.</div>';return}e.innerHTML=`<div class="faint">Looking up <strong>${r(s)}</strong>…</div>`;let c;try{const o=await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(s)}`);if(!o.ok){e.innerHTML='<div class="alert alert-bad">User not found — check spelling. Sleeper usernames are case-sensitive.</div>';return}c=await o.json()}catch(o){e.innerHTML=`<div class="alert alert-bad">Network error: ${r(o&&o.message||"connection failed")}.</div>`;return}if(!c||!c.user_id){e.innerHTML=`<div class="alert alert-bad">Couldn't find that user on Sleeper.</div>`;return}const i=c.display_name||s;e.innerHTML=`<div class="faint">Found <strong>${r(i)}</strong> — loading ${r(f)} leagues…</div>`;let n=[];try{const o=await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(c.user_id)}/leagues/nfl/${f}`);o.ok&&(n=await o.json())}catch{n=[]}if(!Array.isArray(n)||!n.length){e.innerHTML=`<div class="alert alert-bad">No NFL leagues found for <strong>${r(i)}</strong> in ${r(f)}.</div>`;return}q(n,i)};a.querySelector("#setupLookup").addEventListener("click",l),a.querySelector("#setupUsername").addEventListener("keydown",s=>{s.key==="Enter"&&l()})},q=(a,t)=>{const e=h(`
      <h2 id="setupTitle" style="margin:0 0 4px">Pick your league</h2>
      <p class="faint" style="margin:0 0 12px">${r(t)}'s ${r(f)} leagues</p>
      <div style="max-height:380px; overflow-y:auto; display:flex; flex-direction:column; gap:4px">
        ${a.map(s=>{const c=String(s.league_id||""),i=r(s.name||`League ${c.slice(0,6)}…`),n=`${String(s.total_rosters||"?")} teams · ${r(String(s.season||""))}${s.status?` · ${r(s.status)}`:""}`;return`<div role="option" tabindex="0" data-lid="${$(c)}" class="search-item" style="padding:10px 12px; border-radius:8px; cursor:pointer"><div style="font-weight:700; margin-bottom:2px">${i}</div><div class="faint mono" style="font-size:11px">${n}</div></div>`}).join("")}
      </div>
      <div id="setupResult" aria-live="polite" style="margin-top:8px"></div>
      <div class="row" style="gap:8px; margin-top:16px; justify-content:flex-end">
        <button class="btn btn-ghost btn-sm" id="setupBack">← Back</button>
        <button class="btn btn-ghost btn-sm" id="setupClose">Close</button>
      </div>
    `);e.querySelector("#setupBack").addEventListener("click",x);const l=e.querySelector("#setupResult");e.querySelectorAll("[data-lid]").forEach(s=>{const c=async()=>{const i=s.getAttribute("data-lid");if(!i)return;l.innerHTML='<div class="faint">Fetching league details…</div>';const n=await R(i);if(!n||!n.league_id){l.innerHTML=`<div class="alert alert-bad">Couldn't fetch details. Try again.</div>`;return}B(i,n)};s.addEventListener("click",c),s.addEventListener("keydown",i=>{(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),c())})})},B=(a,t)=>{const e=h(`
      <h2 id="setupTitle" style="margin:0 0 4px">${r(t.league_name||"Unnamed league")}</h2>
      <p class="faint" style="margin:0 0 12px">${r(String(t.total_rosters||"?"))} teams · season ${r(String(t.season||"?"))} ${I(t.draft_type)}</p>
      <label class="faint" for="setupDraftType" style="display:block; margin-bottom:4px">Draft type <span class="faint">(auto-detected — override only if wrong)</span></label>
      <select id="setupDraftType" class="team-select-dropdown" style="width:100%; margin-bottom:16px">
        <option value="auto" ${k()==="auto"?"selected":""}>Auto (${r(t.draft_type)})</option>
        <option value="snake" ${k()==="snake"?"selected":""}>Snake</option>
        <option value="auction" ${k()==="auction"?"selected":""}>Auction</option>
      </select>
      <div class="row" style="gap:8px; justify-content:flex-end">
        <button class="btn btn-ghost btn-sm" id="setupBack">← Back</button>
        <button class="btn btn-primary" id="setupSave">Use this league</button>
      </div>
      <div id="setupDataCheck"></div>
    `);e.querySelector("#setupBack").addEventListener("click",x),e.querySelector("#setupSave").addEventListener("click",async()=>{U(e.querySelector("#setupDraftType").value),w(a),A(a,t.league_name,t.season);const l=e.querySelector("#setupDataCheck");if(l.innerHTML='<div class="faint" style="margin-top:8px">Checking synced data…</div>',await E().catch(()=>null)){p(!0);return}(n=>{l.innerHTML=`
          <div class="alert alert-info" style="margin-top:12px">
            <div><strong>Sync League Data</strong></div>
            <div class="faint" style="margin-top:4px">This league is set up. Click below to pull settings, rosters, and matchups from Sleeper directly into your local database.</div>
            <div id="syncProgressArea" style="margin-top:10px">${n}</div>
          </div>`})('<button class="btn btn-primary" id="setupSyncBtn">Sync League Data Now</button>');const i=()=>{const n=e.querySelector("#setupSyncBtn");n&&n.addEventListener("click",async()=>{n.disabled=!0,n.textContent="Starting sync…";const o=e.querySelector("#syncProgressArea");try{await j(a),o&&(o.innerHTML='<div class="faint" style="display:flex; align-items:center; gap:8px"><span class="spinner" style="width:14px; height:14px; border:2px solid var(--border); border-top-color: var(--amber); border-radius:50%; animation:spin 0.8s linear infinite"></span> Fetching Sleeper settings, rosters &amp; matchups…</div>');let v=0;const b=setInterval(async()=>{v++,(await E().catch(()=>null)||v>=15)&&(clearInterval(b),p(!0))},2e3)}catch(v){if(o){o.innerHTML=`
                <div class="alert alert-bad" style="margin-bottom:8px">Model backend unreachable or busy (${r(v.message||"connection failed")}). Make sure backend is running.</div>
                <button class="btn btn-primary btn-sm" id="setupSyncBtn">Retry Sync</button>
                <button class="btn btn-ghost btn-sm" id="setupDoneBtn" style="margin-left:8px">Done (sync later)</button>`,i();const b=e.querySelector("#setupDoneBtn");b&&b.addEventListener("click",()=>p(!0))}}})};i()})};x()}export{z as openSetupModal};
