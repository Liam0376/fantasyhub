import{f as q,H as C,n as k,h as i,y as B,O as L,P as w,Q as H,q as I,R,S as _,T as U,U as T,V as A}from"./index-D0XiqyTN.js";

function j(content){
  return`<div class="player-modal-backdrop show" id="setupBackdrop" style="position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:16px"><div class="card player-modal-card show" id="setupCard" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="setupTitle" style="max-width:520px;width:100%;max-height:90vh;overflow:auto;padding:20px">${content}</div></div>`;
}

function draftBadge(type){
  return type==="auction"?'<span class="badge" style="background:var(--amber-dim);color:var(--amber)">auction</span>':
    type==="snake"?'<span class="badge" style="background:var(--sky-dim);color:var(--sky)">snake</span>':
    '<span class="badge">draft type unknown</span>';
}

async function K({onDone}={}){
  const prevFocus=document.activeElement;
  let root=document.getElementById("setupModalRoot");
  root||(root=document.createElement("div"),root.id="setupModalRoot",document.body.appendChild(root));

  let trap=null;

  const close=ok=>{
    root.innerHTML="";
    try{trap&&trap()}catch{}
    try{prevFocus&&prevFocus.focus&&prevFocus.focus()}catch{}
    typeof onDone==="function"&&onDone(ok);
  };

  const meta=await q().catch(()=>null);
  const currentId=C();
  const season=(meta&&meta.season)?String(meta.season):String(new Date().getFullYear());
  const configured=(meta&&meta.configuredLeagues)||[];

  function bindClose(){
    const closeBtn=root.querySelector("#setupClose");
    closeBtn&&closeBtn.addEventListener("click",()=>close(false));
    const bd=root.querySelector("#setupBackdrop");
    bd&&bd.addEventListener("click",ev=>{ev.target.id==="setupBackdrop"&&close(false)});
  }

  function renderStep1(){
    try{trap&&trap()}catch{}
    const knownHtml=configured.length?`
      <label class="faint" for="setupExisting" style="display:block;margin-bottom:4px">Synced leagues on this machine</label>
      <div class="row" style="gap:8px;margin-bottom:16px">
        <select id="setupExisting" class="team-select-dropdown" style="flex:1">${configured.map(l=>{const lid=String(l.league_id||"");return`<option value="${k(lid)}"${lid===currentId?" selected":""}>${i(l.league_name||"League "+lid.slice(0,6)+"…")}</option>`}).join("")}</select>
        <button class="btn btn-ghost btn-sm" id="setupUseExisting">Use</button>
      </div>`:"";

    root.innerHTML=j(`
      <h2 id="setupTitle" style="margin:0 0 4px">Fantasy league setup</h2>
      <p class="faint" style="margin:0 0 16px">Enter your Sleeper username to find your leagues.</p>
      ${knownHtml}
      <label class="faint" for="setupUsername" style="display:block;margin-bottom:4px">Sleeper username</label>
      <div class="row" style="gap:8px;margin-bottom:12px">
        <input id="setupUsername" class="search-top" style="flex:1;border:1px solid var(--border);border-radius:8px;padding:8px 10px" placeholder="your_username" autocomplete="off" autocapitalize="none" spellcheck="false" />
        <button class="btn btn-primary btn-sm" id="setupLookup">Find leagues</button>
      </div>
      <div id="setupResult" aria-live="polite"></div>
      <div class="row" style="gap:8px;margin-top:16px;justify-content:flex-end">
        <button class="btn btn-ghost btn-sm" id="setupClose">Close</button>
      </div>
    `);

    const card=root.querySelector("#setupCard");
    trap=B(card,prevFocus,()=>close(false));
    bindClose();

    const existing=root.querySelector("#setupUseExisting");
    existing&&existing.addEventListener("click",()=>{
      const lid=root.querySelector("#setupExisting").value;
      if(L(lid)){w(lid);close(true)}
    });

    const result=root.querySelector("#setupResult");

    async function doLookup(){
      const username=(root.querySelector("#setupUsername").value||"").trim();
      if(!username){result.innerHTML='<div class="alert alert-bad">Enter your Sleeper username.</div>';return}
      result.innerHTML=`<div class="faint">Looking up <strong>${i(username)}</strong>…</div>`;
      try{
        const userResp=await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(username)}`);
        if(!userResp.ok){
          result.innerHTML=`<div class="alert alert-bad">User not found — check spelling. Sleeper usernames are case-sensitive.</div>`;
          return;
        }
        const user=await userResp.json();
        if(!user||!user.user_id){result.innerHTML=`<div class="alert alert-bad">Couldn't find that user on Sleeper.</div>`;return}
        result.innerHTML=`<div class="faint">Found <strong>${i(user.display_name||username)}</strong> — loading ${i(season)} leagues…</div>`;
        const leaguesResp=await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(user.user_id)}/leagues/nfl/${season}`);
        const leagues=leaguesResp.ok?await leaguesResp.json():[];
        if(!Array.isArray(leagues)||leagues.length===0){
          result.innerHTML=`<div class="alert alert-bad">No NFL leagues found for <strong>${i(user.display_name||username)}</strong> in ${i(season)}.</div>`;
          return;
        }
        renderLeagueList(leagues,user.display_name||username);
      }catch(err){
        result.innerHTML=`<div class="alert alert-bad">Network error: ${i(err&&err.message||"connection failed")}.</div>`;
      }
    }

    root.querySelector("#setupLookup").addEventListener("click",doLookup);
    root.querySelector("#setupUsername").addEventListener("keydown",ev=>{ev.key==="Enter"&&doLookup()});
  }

  function renderLeagueList(leagues,displayName){
    root.innerHTML=j(`
      <h2 id="setupTitle" style="margin:0 0 4px">Pick your league</h2>
      <p class="faint" style="margin:0 0 12px">${i(displayName)}'s ${i(season)} leagues</p>
      <div style="max-height:380px;overflow-y:auto;display:flex;flex-direction:column;gap:4px">
        ${leagues.map(lg=>{
          const lid=String(lg.league_id||"");
          const name=i(lg.name||"League "+lid.slice(0,6)+"…");
          const teams=String(lg.total_rosters||"?");
          const seas=i(String(lg.season||""));
          const status=lg.status?` · ${i(lg.status)}`:"";
          return`<div role="option" tabindex="0" data-lid="${k(lid)}" class="search-item" style="padding:10px 12px;border-radius:8px;cursor:pointer"><div style="font-weight:700;margin-bottom:2px">${name}</div><div class="faint mono" style="font-size:11px">${teams} teams · ${seas}${status}</div></div>`;
        }).join("")}
      </div>
      <div id="setupResult" aria-live="polite" style="margin-top:8px"></div>
      <div class="row" style="gap:8px;margin-top:16px;justify-content:flex-end">
        <button class="btn btn-ghost btn-sm" id="setupBack">← Back</button>
        <button class="btn btn-ghost btn-sm" id="setupClose">Close</button>
      </div>
    `);

    bindClose();
    root.querySelector("#setupBack").addEventListener("click",()=>renderStep1());

    const result=root.querySelector("#setupResult");
    root.querySelectorAll("[data-lid]").forEach(el=>{
      const activate=async()=>{
        const lid=el.getAttribute("data-lid");
        if(!lid)return;
        result.innerHTML='<div class="faint">Fetching league details…</div>';
        const s=await I(lid);
        if(!s||!s.league_id){result.innerHTML='<div class="alert alert-bad">Couldn\'t fetch details. Try again.</div>';return}
        renderConfirm(lid,s);
      };
      el.addEventListener("click",activate);
      el.addEventListener("keydown",ev=>{(ev.key==="Enter"||ev.key===" ")&&(ev.preventDefault(),activate())});
    });
  }

  function renderConfirm(lid,s){
    const card=root.querySelector("#setupCard");
    if(!card){renderStep1();return}
    card.innerHTML=`
      <h2 id="setupTitle" style="margin:0 0 4px">${i(s.league_name||"Unnamed league")}</h2>
      <p class="faint" style="margin:0 0 12px">${i(String(s.total_rosters||"?"))} teams · season ${i(String(s.season||"?"))} ${draftBadge(s.draft_type)}</p>
      <label class="faint" for="setupDraftType" style="display:block;margin-bottom:4px">Draft type <span class="faint">(auto-detected — override only if wrong)</span></label>
      <select id="setupDraftType" class="team-select-dropdown" style="width:100%;margin-bottom:16px">
        <option value="auto" ${R()==="auto"?"selected":""}>Auto (${i(s.draft_type||"unknown")})</option>
        <option value="snake" ${R()==="snake"?"selected":""}>Snake</option>
        <option value="auction" ${R()==="auction"?"selected":""}>Auction</option>
      </select>
      <div class="row" style="gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost btn-sm" id="confirmBack">← Back</button>
        <button class="btn btn-primary" id="setupSave">Use this league</button>
      </div>
      <div id="setupDataCheck"></div>
    `;

    card.querySelector("#confirmBack").addEventListener("click",()=>renderStep1());
    card.querySelector("#setupSave").addEventListener("click",async()=>{
      _(card.querySelector("#setupDraftType").value);
      w(lid);
      U(lid,s.league_name,s.season);
      const check=card.querySelector("#setupDataCheck");
      check.innerHTML='<div class="faint" style="margin-top:8px">Checking synced data…</div>';
      if(await T().catch(()=>null)){close(true);return}
      check.innerHTML=`
        <div class="alert alert-info" style="margin-top:12px">
          <div><strong>Sync League Data</strong></div>
          <div class="faint" style="margin-top:4px">Pull settings, rosters, and matchups from Sleeper into your local database.</div>
          <div id="syncProgressArea" style="margin-top:10px"><button class="btn btn-primary" id="setupSyncBtn">Sync League Data Now</button></div>
        </div>`;
      attachSync(lid,card);
    });
  }

  function attachSync(lid,card){
    const syncBtn=card.querySelector("#setupSyncBtn");
    if(!syncBtn)return;
    syncBtn.addEventListener("click",async()=>{
      syncBtn.disabled=true;syncBtn.textContent="Starting sync…";
      const prog=card.querySelector("#syncProgressArea");
      try{
        await A(lid);
        if(prog)prog.innerHTML='<div class="faint" style="display:flex;align-items:center;gap:8px"><span class="spinner" style="width:14px;height:14px;border:2px solid var(--border);border-top-color:var(--amber);border-radius:50%;animation:spin 0.8s linear infinite"></span> Fetching Sleeper settings, rosters &amp; matchups…</div>';
        let count=0;
        const poll=setInterval(async()=>{
          count++;
          if(await T().catch(()=>null)||count>=15){clearInterval(poll);close(true)}
        },2000);
      }catch(err){
        if(prog){
          prog.innerHTML=`<div class="alert alert-bad" style="margin-bottom:8px">Backend error: ${i(err&&err.message||"connection failed")}.</div><button class="btn btn-primary btn-sm" id="setupSyncBtn">Retry Sync</button><button class="btn btn-ghost btn-sm" id="setupDoneBtn" style="margin-left:8px">Done (sync later)</button>`;
          attachSync(lid,card);
          const doneBtn=card.querySelector("#setupDoneBtn");
          doneBtn&&doneBtn.addEventListener("click",()=>close(true));
        }
      }
    });
  }

  renderStep1();
}

export{K as openSetupModal};
