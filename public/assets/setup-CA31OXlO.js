import{f as q,D as C,i as k,e as i,v as B,L,M as w,N as I,k as H,O as R,P as _,Q as T,R as U}from"./index-DOdT1orj.js";function A(n){return`<div class="player-modal-backdrop show" id="setupBackdrop" style="position:fixed; inset:0; z-index:2000; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; padding:16px">
    <div class="card player-modal-card show" id="setupCard" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="setupTitle" style="max-width:520px; width:100%; max-height:90vh; overflow:auto; padding:20px">
      ${n}
    </div>
  </div>`}function j(n){return n==="auction"?'<span class="badge" style="background:var(--amber-dim); color:var(--amber)">auction</span>':n==="snake"?'<span class="badge" style="background:var(--sky-dim); color:var(--sky)">snake</span>':'<span class="badge">draft type unknown</span>'}async function z({onDone:n}={}){const d=document.activeElement;let e=document.getElementById("setupModalRoot");e||(e=document.createElement("div"),e.id="setupModalRoot",document.body.appendChild(e));const b=t=>{e.innerHTML="";try{d&&d.focus&&d.focus()}catch{}typeof n=="function"&&n(t)},v=await q().catch(()=>null),f=v&&v.configuredLeagues||[],m=C(),$=f.length?f.map(t=>{const a=String(t.league_id||"");if(!a)return"";const s=a===m?"selected":"",c=`${t.league_name||"League"} (${a.slice(0,6)}…)`;return`<option value="${k(a)}" ${s}>${i(c)}</option>`}).join(""):"";e.innerHTML=A(`
    <h2 id="setupTitle" style="margin:0 0 4px">Fantasy league setup</h2>
    <p class="faint" style="margin:0 0 16px">Two things, then everything else comes from Sleeper automatically.</p>
    ${f.length?`
    <label class="faint" for="setupExisting" style="display:block; margin-bottom:4px">Synced leagues on this machine</label>
    <div class="row" style="gap:8px; margin-bottom:16px">
      <select id="setupExisting" class="team-select-dropdown" style="flex:1">${$}</select>
      <button class="btn btn-ghost btn-sm" id="setupUseExisting">Use</button>
    </div>`:""}
    <label class="faint" for="setupInput" style="display:block; margin-bottom:4px">1 · Sleeper league ID <span class="faint">(or paste your league URL)</span></label>
    <div class="row" style="gap:8px; margin-bottom:12px">
      <input id="setupInput" class="search-top" style="flex:1; border:1px solid var(--border); border-radius:8px; padding:8px 10px" placeholder="e.g. 123456789012345678" inputmode="numeric" value="${k(m)}" />
      <button class="btn btn-primary btn-sm" id="setupValidate">Look up</button>
    </div>
    <div id="setupResult" aria-live="polite"></div>
    <div class="row" style="gap:8px; margin-top:16px; justify-content:flex-end">
      <button class="btn btn-ghost btn-sm" id="setupClose">Close</button>
    </div>
  `);const E=e.querySelector("#setupCard"),D=B(E,d,()=>b(!1)),p=e.querySelector("#setupResult"),r=()=>{try{D()}catch{}},o=b;e.querySelector("#setupClose").addEventListener("click",()=>{r(),o(!1)}),e.querySelector("#setupBackdrop").addEventListener("click",t=>{t.target.id==="setupBackdrop"&&(r(),o(!1))});const h=e.querySelector("#setupUseExisting");h&&h.addEventListener("click",()=>{const t=e.querySelector("#setupExisting").value;L(t)&&(w(t),r(),o(!0))}),e.querySelector("#setupValidate").addEventListener("click",async()=>{const t=e.querySelector("#setupInput").value,a=I(t);if(!L(a)){p.innerHTML=`<div class="alert alert-bad">That doesn't look like a Sleeper league ID — paste the digits from your league URL (sleeper.app/leagues/…).</div>`;return}p.innerHTML=`<div class="faint">Looking up league ${i(a)} on Sleeper…</div>`;const s=await H(a);if(!s||!s.league_id){p.innerHTML=`<div class="alert alert-bad">Couldn't reach Sleeper for that ID. Check the digits and your connection, then try again.</div>`;return}const c=R();p.innerHTML=`
      <div class="card" style="padding:12px; margin-top:4px">
        <div style="font-weight:700">${i(s.league_name||"Unnamed league")}</div>
        <div class="faint mono" style="font-size:11px; margin:4px 0 8px">${i(String(s.total_rosters||"?"))} teams · season ${i(String(s.season||"?"))} ${j(s.draft_type)}</div>
        <label class="faint" for="setupDraftType" style="display:block; margin-bottom:4px">2 · Draft type <span class="faint">(auto-detected — override only if wrong)</span></label>
        <select id="setupDraftType" class="team-select-dropdown" style="width:100%; margin-bottom:12px">
          <option value="auto" ${c==="auto"?"selected":""}>Auto (${i(s.draft_type)})</option>
          <option value="snake" ${c==="snake"?"selected":""}>Snake</option>
          <option value="auction" ${c==="auction"?"selected":""}>Auction</option>
        </select>
        <div class="row" style="gap:8px; justify-content:flex-end">
          <button class="btn btn-primary" id="setupSave">Use this league</button>
        </div>
        <div id="setupDataCheck"></div>
      </div>`,e.querySelector("#setupSave").addEventListener("click",async()=>{const M=e.querySelector("#setupDraftType").value;_(M),w(a);const x=e.querySelector("#setupDataCheck");if(x.innerHTML='<div class="faint" style="margin-top:8px">Checking synced data…</div>',await T().catch(()=>null)){r(),o(!0);return}(l=>{x.innerHTML=`
            <div class="alert alert-info" style="margin-top:12px">
              <div><strong>Sync League Data</strong></div>
              <div class="faint" style="margin-top:4px">This league is set up. Click below to pull settings, rosters, and matchups from Sleeper directly into your local database.</div>
              <div id="syncProgressArea" style="margin-top:10px">${l}</div>
            </div>`})('<button class="btn btn-primary" id="setupSyncBtn">Sync League Data Now</button>');const S=()=>{const l=e.querySelector("#setupSyncBtn");l&&l.addEventListener("click",async()=>{l.disabled=!0,l.textContent="Starting sync…";const u=e.querySelector("#syncProgressArea");try{await U(a),u&&(u.innerHTML='<div class="faint" style="display:flex; align-items:center; gap:8px"><span class="spinner" style="width:14px; height:14px; border:2px solid var(--border); border-top-color:var(--amber); border-radius:50%; animation:spin 0.8s linear infinite"></span> Fetching Sleeper settings, rosters &amp; matchups…</div>');let y=0;const g=setInterval(async()=>{y++,(await T().catch(()=>null)||y>=15)&&(clearInterval(g),r(),o(!0))},2e3)}catch(y){if(u){u.innerHTML=`
                  <div class="alert alert-bad" style="margin-bottom:8px">Model backend unreachable or busy (${i(y.message||"connection failed")}). Make sure backend is running.</div>
                  <button class="btn btn-primary btn-sm" id="setupSyncBtn">Retry Sync</button>
                  <button class="btn btn-ghost btn-sm" id="setupDoneBtn" style="margin-left:8px">Done (sync later)</button>`,S();const g=e.querySelector("#setupDoneBtn");g&&g.addEventListener("click",()=>{r(),o(!0)})}}})};S()})})}export{z as openSetupModal};
