const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-D0XiqyTN.js","assets/index-CtezTCnU.css"])))=>i.map(i=>d[i]);
import{f as K,a as V,b as Y,c as G,d as J,e as B,g as Q,h as r,l as X,u as Z,p as S,i as M,t as P,j as ss,_ as es}from"./index-D0XiqyTN.js";async function ns(e){var D,F,A,E;const[i,g,t,h,$,j,N]=await Promise.all([K(),V(),Y().catch(()=>null),G().catch(()=>({trending_adds:[]})),J({}).catch(()=>({recommendations:[]})),B({edge:"BUY",limit:400}).catch(()=>({players:[]})),B({edge:"SELL",limit:400}).catch(()=>({players:[]}))]),y=Q(i.lastUpdated||i.last_updated||((F=(D=g.entries)==null?void 0:D[0])==null?void 0:F.ran_at)),x=i.leagueName||"Dashboard",v=i.week??(t==null?void 0:t.week)??null,n=[...(t==null?void 0:t.leagueRosters)||[]].sort((s,a)=>(a.wins??0)-(s.wins??0)||(a.fpts??0)-(s.fpts??0)),c=(t==null?void 0:t.playoff_teams)??6,b=((t==null?void 0:t.playoff_week_start)??15)-1,l=Math.max(0,b-(v??1)),m=as(n,c,l),p=[];for(const[s,a]of Object.entries((t==null?void 0:t.rosters)||{})){const d=a.teamMeta||a.team_info||{},o=d.display_name||d.team_name||`Team ${s}`;for(const u of[...a.starters||[],...a.bench||[]]){const w=u.injury_status;w&&w!=="Healthy"&&w!=="Active"&&p.push({...u,owner:o})}}p.sort((s,a)=>U(a.injury_status)-U(s.injury_status));const _=(h.trending_adds||[]).slice(0,4),L=[...$.recommendations||[]].sort((s,a)=>(a.improvement_over_roster??-99)-(s.improvement_over_roster??-99)).slice(0,5),W=i.scoring_settings||{},k=Number(W.rec??1),z=k===1?"Full PPR":k===.5?"Half PPR":k===0?"Non-PPR":`${k} PPR`,R=(t==null?void 0:t.rosters)||{},C=Object.keys(R).length>0,f=new Map;for(const[s,a]of Object.entries(R)){const d=((A=a.teamMeta)==null?void 0:A.team_name)||((E=a.teamMeta)==null?void 0:E.display_name)||`Team ${s}`;for(const o of[...a.starters||[],...a.bench||[]])o.player_id!=null&&f.set(String(o.player_id),d),o.sleeper_id!=null&&f.set(String(o.sleeper_id),d)}const H=s=>{const a=(s.position||"").toUpperCase();return a==="K"||a==="DEF"?!1:C?f.has(String(s.player_id))||s.sleeper_id!=null&&f.has(String(s.sleeper_id)):!0},T=s=>[...s].filter(H).sort((a,d)=>Number(d.auction??0)-Number(a.auction??0)).slice(0,3),q=T(j.players||[]),I=T(N.players||[]);e.innerHTML=`
    <div class="dash-band reveal in">
      <div class="dash-band-main">
        <div class="kicker">${r([i.season?`${i.season} Season`:"",v!=null?`Week ${v}`:"",y.label].filter(Boolean).join(" · "))}</div>
        <h1>${r(x)}</h1>
        <p>${r(X(i))} · ${r(z)}</p>
      </div>
      <div class="dash-band-side">
        <div class="dash-week">${v!=null?`W${v}`:"—"}</div>
        <div class="micro faint">${r(n.length?`${n.length} teams`:"league")}</div>
      </div>
    </div>

    ${is(i)?'<div class="alert alert-warn reveal in" role="status">Demo data — run refresh to load live Sleeper data.</div>':""}

    <div class="dash-grid reveal in reveal-delay-1">
      <div class="card dash-span-4">
        <div class="card-header"><h3>Playoff Race</h3><span class="kicker">sim odds · ${l} left</span></div>
        <div class="card-body" style="padding:6px 12px">
          ${n.length?n.map((s,a)=>{const d=Math.round((m[a]??0)*100),o=d>=70?"var(--emerald)":d>=35?"var(--amber-strong)":"var(--text-faint)",u=s.wins==null&&s.losses==null?"–":`${s.wins??0}–${s.losses??0}${s.ties?`–${s.ties}`:""}`;return`
            ${a===c?'<div class="cut-line"><span>playoff cut</span></div>':""}
            <div class="stand-row" title="Projected ${Number(s.starter_pts??0).toFixed(1)} pts this week">
              <span class="mono faint" style="width:16px">${a+1}</span>
              ${Z(s,24)}
              <span class="stand-name">${r(s.team_name||s.display_name||`Team ${s.roster_id}`)}</span>
              <span class="spacer"></span>
              <span class="mono" style="font-weight:700">${u}</span>
              <span class="mono faint" style="font-size:11px">${Number(s.starter_pts??0).toFixed(0)}/wk</span>
              <span class="odds mono" style="color:${o}; width:38px; text-align:right">${d}%</span>
              <span class="odds-bar"><span style="width:${d}%; background:${o}"></span></span>
            </div>`}).join(""):'<div class="empty">No standings yet</div>'}
        </div>
      </div>

      <div class="card dash-span-4">
        <div class="card-header"><h3>Status Report</h3><span class="kicker">rostered · ${p.length}</span></div>
        <div class="card-body" style="padding:6px 12px">
          ${p.length?p.slice(0,6).map(s=>`
            <div class="mini-row" data-pid="${r(s.player_id||"")}" style="cursor:pointer">
              ${S(s,26)}
              <div style="flex:1; min-width:0">
                <div class="mini-name">${r(s.player_name||s.player_id)}</div>
                <div class="micro faint">${M(s.position)} ${P(s.team,12)} · @${r(s.owner)}</div>
              </div>
              ${ss(s.injury_status)}
            </div>
          `).join(""):'<div class="empty">No injury tags on rosters</div>'}
          ${_.length?`
            <div class="kicker" style="margin:10px 0 4px">Trending adds</div>
            ${_.map(s=>`
              <div class="mini-row">
                ${s.player_id?S({player_id:s.player_id,player_name:s.player_name||"",position:s.position||"",team:s.team||""},26):""}
                <div style="flex:1; min-width:0"><div class="mini-name">${r(s.player_name||s.player_id)}</div></div>
                ${s.count?`<span class="mono faint" style="font-size:11px">+${(s.count/1e3).toFixed(1)}k</span>`:""}
              </div>
            `).join("")}`:""}
        </div>
      </div>

      <div class="card dash-span-4">
        <div class="card-header"><h3>Waiver Targets</h3><a href="#waiver" class="kicker" style="color:var(--flag)">all →</a></div>
        <div class="card-body" style="padding:6px 12px">
          ${L.length?L.map(s=>`
            <div class="mini-row" data-pid="${r(s.player_id||"")}" style="cursor:pointer">
              ${S(s,26)}
              <div style="flex:1; min-width:0">
                <div class="mini-name">${r(s.player_name||s.player_id)}</div>
                <div class="micro faint">${M(s.position)} ${P(s.team,12)} ${r(s.team||"")}</div>
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
              ${q.map(s=>O(s,f.get(String(s.player_id))||(s.sleeper_id!=null?f.get(String(s.sleeper_id)):""))).join("")||'<div class="empty">No clear buys on rosters</div>'}
            </div>
            <div>
              <div class="kicker bad" style="margin-bottom:6px">▼ Sell — market over model</div>
              ${I.map(s=>O(s,f.get(String(s.player_id))||(s.sleeper_id!=null?f.get(String(s.sleeper_id)):""))).join("")||'<div class="empty">No clear sells on rosters</div>'}
            </div>
          </div>
        </div>
      </div>

      <div class="card dash-span-5">
        <div class="card-header"><h3>Sync</h3><span class="row" style="gap:5px"><span class="dot ${y.level==="fresh"?"fresh":y.level==="stale"?"stale":"cold"}"></span><span class="kicker">${r(y.label)}</span></span></div>
        <div class="card-body" style="padding:10px 12px">
          <div class="micro faint">${i.lastUpdated?`Updated ${new Date(i.lastUpdated).toLocaleString()}`:"Local DB Active"}</div>
          ${(g.entries||[]).slice(0,3).map(s=>`
            <div class="sync-row">
              <span class="dot ${s.success?"fresh":"stale"}" style="flex-shrink:0"></span>
              <span class="mono" style="font-size:11px">${r(s.source)}</span>
              <span class="spacer"></span>
              <span class="micro faint">${new Date(s.ran_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `,e.querySelectorAll("[data-pid]").forEach(s=>{s.addEventListener("click",async()=>{const a=s.getAttribute("data-pid"),d=[...$.recommendations||[],...p].find(o=>String(o.player_id)===String(a));if(d){const{openPlayerModal:o}=await es(async()=>{const{openPlayerModal:u}=await import("./index-D0XiqyTN.js").then(w=>w.W);return{openPlayerModal:u}},__vite__mapDeps([0,1]));o(d,e)}})})}function O(e,i){return`
    <div class="mini-row">
      ${S(e,26)}
      <div style="flex:1; min-width:0">
        <div class="mini-name">${r(e.player_name||e.player_id)}</div>
        <div class="micro faint">${M(e.position)} ${P(e.team,12)} ${r(e.team||"")}${i?` · @${r(i)}`:""}</div>
      </div>
      <div style="text-align:right">
        <div class="mono" style="font-weight:700; font-size:13px">${Number(e.weekly??e.projected_points??0).toFixed(1)}<span class="micro faint">/wk</span></div>
        <div class="micro faint">model $${Number(e.auction??0)}</div>
      </div>
    </div>`}function as(e,i,g,t=4e3){if(!e.length||i<=0)return e.map(()=>0);const h=e.map(n=>Number(n.starter_pts??0)),$=[...h].sort((n,c)=>n-c),j=$[Math.floor($.length/2)]??0,N=h.map(n=>Math.min(.95,Math.max(.05,.5+(n-j)*.025))),y=e.map(n=>Number(n.wins??0)+Number(n.ties??0)*.5),x=e.map((n,c)=>Number(n.fpts??0)+g*h[c]),v=new Array(e.length).fill(0);for(let n=0;n<t;n++){const c=y.map((l,m)=>{let p=0;for(let _=0;_<g;_++)Math.random()<N[m]&&p++;return l+p}),b=e.map((l,m)=>m).sort((l,m)=>c[m]-c[l]||x[m]-x[l]);for(let l=0;l<Math.min(i,b.length);l++)v[b[l]]++}return v.map(n=>n/t)}function U(e){const i=String(e||"").toLowerCase();return/out|ir|injured reserve|pup/.test(i)?3:/doubtful/.test(i)?2:/questionable|limited|dnp/.test(i)?1:0}function is(e){const i=(e==null?void 0:e.data_source)??null;return typeof i=="string"&&i.toLowerCase()==="demo"}export{ns as renderDashboard};
