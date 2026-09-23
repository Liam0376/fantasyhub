const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-BKp382fN.js","assets/index-BOFMxHHo.css"])))=>i.map(i=>d[i]);
import{f as A,a as B,b as z,c as E,d as M,e as j,g as U,h as i,l as W,u as H,p as h,i as f,t as u,j as C,_ as q}from"./index-BKp382fN.js";async function V(a){var k,b;const[e,g,d,S,$,N,R]=await Promise.all([A(),B(),z().catch(()=>null),E().catch(()=>({trending_adds:[]})),M({}).catch(()=>({recommendations:[]})),j({edge:"BUY",limit:3}).catch(()=>({players:[]})),j({edge:"SELL",limit:3}).catch(()=>({players:[]}))]),c=U(e.lastUpdated||e.last_updated||((b=(k=g.entries)==null?void 0:k[0])==null?void 0:b.ran_at)),T=e.leagueName||"Dashboard",v=e.week??(d==null?void 0:d.week)??null,p=[...(d==null?void 0:d.leagueRosters)||[]].sort((s,t)=>(t.wins??0)-(s.wins??0)||(t.fpts??0)-(s.fpts??0)),_=(d==null?void 0:d.playoff_teams)??6,n=[];for(const[s,t]of Object.entries((d==null?void 0:d.rosters)||{})){const r=t.teamMeta||t.team_info||{},l=r.display_name||r.team_name||`Team ${s}`;for(const y of[...t.starters||[],...t.bench||[]]){const o=y.injury_status;o&&o!=="Healthy"&&o!=="Active"&&n.push({...y,owner:l})}}n.sort((s,t)=>L(t.injury_status)-L(s.injury_status));const w=(S.trending_adds||[]).slice(0,4),x=[...$.recommendations||[]].sort((s,t)=>(t.improvement_over_roster??-99)-(s.improvement_over_roster??-99)).slice(0,5),D=e.scoring_settings||{},m=Number(D.rec??1),F=m===1?"Full PPR":m===.5?"Half PPR":m===0?"Non-PPR":`${m} PPR`;a.innerHTML=`
    <div class="dash-band reveal in">
      <div class="dash-band-main">
        <div class="kicker">${i([e.season?`${e.season} Season`:"",v!=null?`Week ${v}`:"",c.label].filter(Boolean).join(" · "))}</div>
        <h1>${i(T)}</h1>
        <p>${i(W(e))} · ${i(F)}</p>
      </div>
      <div class="dash-band-side">
        <div class="dash-week">${v!=null?`W${v}`:"—"}</div>
        <div class="micro faint">${i(p.length?`${p.length} teams`:"league")}</div>
      </div>
    </div>

    ${O(e)?'<div class="alert alert-warn reveal in" role="status">Demo data — run refresh to load live Sleeper data.</div>':""}

    <div class="dash-grid reveal in reveal-delay-1">
      <div class="card dash-span-4">
        <div class="card-header"><h3>Playoff Race</h3><span class="kicker">top ${_} · tiebreak PF</span></div>
        <div class="card-body" style="padding:6px 12px">
          ${p.length?p.map((s,t)=>`
            ${t===_?'<div class="cut-line"><span>playoff cut</span></div>':""}
            <div class="stand-row">
              <span class="mono faint" style="width:18px">${t+1}</span>
              ${H(s,24)}
              <span class="stand-name">${i(s.team_name||s.display_name||`Team ${s.roster_id}`)}</span>
              <span class="spacer"></span>
              <span class="mono" style="font-weight:700">${s.wins??0}–${s.losses??0}${s.ties?`–${s.ties}`:""}</span>
              <span class="mono faint" style="font-size:11px; width:52px; text-align:right">${Number(s.starter_pts??0).toFixed(1)}/wk</span>
            </div>
          `).join(""):'<div class="empty">No standings yet</div>'}
        </div>
      </div>

      <div class="card dash-span-4">
        <div class="card-header"><h3>Status Report</h3><span class="kicker">rostered · ${n.length}</span></div>
        <div class="card-body" style="padding:6px 12px">
          ${n.length?n.slice(0,6).map(s=>`
            <div class="mini-row" data-pid="${i(s.player_id||"")}" style="cursor:pointer">
              ${h(s,26)}
              <div style="flex:1; min-width:0">
                <div class="mini-name">${i(s.player_name||s.player_id)}</div>
                <div class="micro faint">${f(s.position)} ${u(s.team,12)} · @${i(s.owner)}</div>
              </div>
              ${C(s.injury_status)}
            </div>
          `).join(""):'<div class="empty">No injury tags on rosters</div>'}
          ${w.length?`
            <div class="kicker" style="margin:10px 0 4px">Trending adds</div>
            ${w.map(s=>`
              <div class="mini-row">
                ${s.player_id?h({player_id:s.player_id,player_name:s.player_name||"",position:s.position||"",team:s.team||""},26):""}
                <div style="flex:1; min-width:0"><div class="mini-name">${i(s.player_name||s.player_id)}</div></div>
                ${s.count?`<span class="mono faint" style="font-size:11px">+${(s.count/1e3).toFixed(1)}k</span>`:""}
              </div>
            `).join("")}`:""}
        </div>
      </div>

      <div class="card dash-span-4">
        <div class="card-header"><h3>Waiver Targets</h3><a href="#waiver" class="kicker" style="color:var(--flag)">all →</a></div>
        <div class="card-body" style="padding:6px 12px">
          ${x.length?x.map(s=>`
            <div class="mini-row" data-pid="${i(s.player_id||"")}" style="cursor:pointer">
              ${h(s,26)}
              <div style="flex:1; min-width:0">
                <div class="mini-name">${i(s.player_name||s.player_id)}</div>
                <div class="micro faint">${f(s.position)} ${u(s.team,12)} ${i(s.team||"")}</div>
              </div>
              <div style="text-align:right">
                <div class="mono" style="font-weight:700; color:var(--emerald); font-size:12px">+${Number(s.improvement_over_roster??0).toFixed(1)}</div>
                <div class="micro faint">${Number(s.projected_points??0).toFixed(1)} proj</div>
              </div>
            </div>
          `).join(""):'<div class="empty">No waiver candidates</div>'}
        </div>
      </div>

      <div class="card dash-span-7">
        <div class="card-header"><h3>Trade Signals</h3><a href="#auction" class="kicker" style="color:var(--flag)">values →</a></div>
        <div class="card-body">
          <div class="signal-cols">
            <div>
              <div class="kicker good" style="margin-bottom:6px">▲ Buy — model over market</div>
              ${(N.players||[]).map(s=>P(s)).join("")||'<div class="empty">—</div>'}
            </div>
            <div>
              <div class="kicker bad" style="margin-bottom:6px">▼ Sell — market over model</div>
              ${(R.players||[]).map(s=>P(s)).join("")||'<div class="empty">—</div>'}
            </div>
          </div>
        </div>
      </div>

      <div class="card dash-span-5">
        <div class="card-header"><h3>Sync</h3><span class="row" style="gap:5px"><span class="dot ${c.level==="fresh"?"fresh":c.level==="stale"?"stale":"cold"}"></span><span class="kicker">${i(c.label)}</span></span></div>
        <div class="card-body" style="padding:10px 12px">
          <div class="micro faint">${e.lastUpdated?`Updated ${new Date(e.lastUpdated).toLocaleString()}`:"Local DB Active"}</div>
          ${(g.entries||[]).slice(0,3).map(s=>`
            <div class="sync-row">
              <span class="dot ${s.success?"fresh":"stale"}" style="flex-shrink:0"></span>
              <span class="mono" style="font-size:11px">${i(s.source)}</span>
              <span class="spacer"></span>
              <span class="micro faint">${new Date(s.ran_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `,a.querySelectorAll("[data-pid]").forEach(s=>{s.addEventListener("click",async()=>{const t=s.getAttribute("data-pid"),r=[...$.recommendations||[],...n].find(l=>String(l.player_id)===String(t));if(r){const{openPlayerModal:l}=await q(async()=>{const{openPlayerModal:y}=await import("./index-BKp382fN.js").then(o=>o.W);return{openPlayerModal:y}},__vite__mapDeps([0,1]));l(r,a)}})})}function P(a){return`
    <div class="mini-row">
      ${h(a,26)}
      <div style="flex:1; min-width:0">
        <div class="mini-name">${i(a.player_name||a.player_id)}</div>
        <div class="micro faint">${f(a.position)} ${u(a.team,12)} ${i(a.team||"")}</div>
      </div>
      <div style="text-align:right">
        <div class="mono" style="font-weight:700; font-size:12px">$${Number(a.auction??0)}</div>
        <div class="micro faint">${Number(a.weekly??a.projected_points??0).toFixed(1)}/wk</div>
      </div>
    </div>`}function L(a){const e=String(a||"").toLowerCase();return/out|ir|injured reserve|pup/.test(e)?3:/doubtful/.test(e)?2:/questionable|limited|dnp/.test(e)?1:0}function O(a){const e=(a==null?void 0:a.data_source)??null;return typeof e=="string"&&e.toLowerCase()==="demo"}export{V as renderDashboard};
