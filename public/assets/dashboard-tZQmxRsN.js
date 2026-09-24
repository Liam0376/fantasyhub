const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-v73tIri3.js","assets/index-CtezTCnU.css"])))=>i.map(i=>d[i]);
import{f as E,a as W,b as z,c as U,d as H,e as T,g as C,h as d,l as O,u as q,p as k,i as P,t as S,j as I,_ as V}from"./index-v73tIri3.js";async function K(a){var M,R;const[e,h,t,u,g,j,N]=await Promise.all([E(),W(),z().catch(()=>null),U().catch(()=>({trending_adds:[]})),H({}).catch(()=>({recommendations:[]})),T({edge:"BUY",limit:400}).catch(()=>({players:[]})),T({edge:"SELL",limit:400}).catch(()=>({players:[]}))]),y=C(e.lastUpdated||e.last_updated||((R=(M=h.entries)==null?void 0:M[0])==null?void 0:R.ran_at)),w=e.leagueName||"Dashboard",p=e.week??(t==null?void 0:t.week)??null,i=[...(t==null?void 0:t.leagueRosters)||[]].sort((s,n)=>(n.wins??0)-(s.wins??0)||(n.fpts??0)-(s.fpts??0)),l=(t==null?void 0:t.playoff_teams)??6,x=((t==null?void 0:t.playoff_week_start)??15)-1,r=Math.max(0,x-(p??1)),v=Y(i,l,r),c=[];for(const[s,n]of Object.entries((t==null?void 0:t.rosters)||{})){const o=n.teamMeta||n.team_info||{},m=o.display_name||o.team_name||`Team ${s}`;for(const f of[...n.starters||[],...n.bench||[]]){const _=f.injury_status;_&&_!=="Healthy"&&_!=="Active"&&c.push({...f,owner:m})}}c.sort((s,n)=>A(n.injury_status)-A(s.injury_status));const $=(u.trending_adds||[]).slice(0,4),L=[...g.recommendations||[]].sort((s,n)=>(n.improvement_over_roster??-99)-(s.improvement_over_roster??-99)).slice(0,5),F=e.scoring_settings||{},b=Number(F.rec??1),B=b===1?"Full PPR":b===.5?"Half PPR":b===0?"Non-PPR":`${b} PPR`;a.innerHTML=`
    <div class="dash-band reveal in">
      <div class="dash-band-main">
        <div class="kicker">${d([e.season?`${e.season} Season`:"",p!=null?`Week ${p}`:"",y.label].filter(Boolean).join(" · "))}</div>
        <h1>${d(w)}</h1>
        <p>${d(O(e))} · ${d(B)}</p>
      </div>
      <div class="dash-band-side">
        <div class="dash-week">${p!=null?`W${p}`:"—"}</div>
        <div class="micro faint">${d(i.length?`${i.length} teams`:"league")}</div>
      </div>
    </div>

    ${G(e)?'<div class="alert alert-warn reveal in" role="status">Demo data — run refresh to load live Sleeper data.</div>':""}

    <div class="dash-grid reveal in reveal-delay-1">
      <div class="card dash-span-4">
        <div class="card-header"><h3>Playoff Race</h3><span class="kicker">sim odds · ${r} left</span></div>
        <div class="card-body" style="padding:6px 12px">
          ${i.length?i.map((s,n)=>{const o=Math.round((v[n]??0)*100),m=o>=70?"var(--emerald)":o>=35?"var(--amber-strong)":"var(--text-faint)",f=s.wins==null&&s.losses==null?"–":`${s.wins??0}–${s.losses??0}${s.ties?`–${s.ties}`:""}`;return`
            ${n===l?'<div class="cut-line"><span>playoff cut</span></div>':""}
            <div class="stand-row" title="Projected ${Number(s.starter_pts??0).toFixed(1)} pts this week">
              <span class="mono faint" style="width:16px">${n+1}</span>
              ${q(s,24)}
              <span class="stand-name">${d(s.team_name||s.display_name||`Team ${s.roster_id}`)}</span>
              <span class="spacer"></span>
              <span class="mono" style="font-weight:700">${f}</span>
              <span class="mono faint" style="font-size:11px">${Number(s.starter_pts??0).toFixed(0)}/wk</span>
              <span class="odds mono" style="color:${m}; width:38px; text-align:right">${o}%</span>
              <span class="odds-bar"><span style="width:${o}%; background:${m}"></span></span>
            </div>`}).join(""):'<div class="empty">No standings yet</div>'}
        </div>
      </div>

      <div class="card dash-span-4">
        <div class="card-header"><h3>Status Report</h3><span class="kicker">rostered · ${c.length}</span></div>
        <div class="card-body" style="padding:6px 12px">
          ${c.length?c.slice(0,6).map(s=>`
            <div class="mini-row" data-pid="${d(s.player_id||"")}" style="cursor:pointer">
              ${k(s,26)}
              <div style="flex:1; min-width:0">
                <div class="mini-name">${d(s.player_name||s.player_id)}</div>
                <div class="micro faint">${P(s.position)} ${S(s.team,12)} · @${d(s.owner)}</div>
              </div>
              ${I(s.injury_status)}
            </div>
          `).join(""):'<div class="empty">No injury tags on rosters</div>'}
          ${$.length?`
            <div class="kicker" style="margin:10px 0 4px">Trending adds</div>
            ${$.map(s=>`
              <div class="mini-row">
                ${s.player_id?k({player_id:s.player_id,player_name:s.player_name||"",position:s.position||"",team:s.team||""},26):""}
                <div style="flex:1; min-width:0"><div class="mini-name">${d(s.player_name||s.player_id)}</div></div>
                ${s.count?`<span class="mono faint" style="font-size:11px">+${(s.count/1e3).toFixed(1)}k</span>`:""}
              </div>
            `).join("")}`:""}
        </div>
      </div>

      <div class="card dash-span-4">
        <div class="card-header"><h3>Waiver Targets</h3><a href="#waiver" class="kicker" style="color:var(--flag)">all →</a></div>
        <div class="card-body" style="padding:6px 12px">
          ${L.length?L.map(s=>`
            <div class="mini-row" data-pid="${d(s.player_id||"")}" style="cursor:pointer">
              ${k(s,26)}
              <div style="flex:1; min-width:0">
                <div class="mini-name">${d(s.player_name||s.player_id)}</div>
                <div class="micro faint">${P(s.position)} ${S(s.team,12)} ${d(s.team||"")}</div>
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
              ${(j.players||[]).slice(0,3).map(s=>D(s)).join("")||'<div class="empty">No clear buys</div>'}
            </div>
            <div>
              <div class="kicker bad" style="margin-bottom:6px">▼ Sell — market over model</div>
              ${(N.players||[]).slice(0,3).map(s=>D(s)).join("")||'<div class="empty">No clear sells</div>'}
            </div>
          </div>
        </div>
      </div>

      <div class="card dash-span-5">
        <div class="card-header"><h3>Sync</h3><span class="row" style="gap:5px"><span class="dot ${y.level==="fresh"?"fresh":y.level==="stale"?"stale":"cold"}"></span><span class="kicker">${d(y.label)}</span></span></div>
        <div class="card-body" style="padding:10px 12px">
          <div class="micro faint">${e.lastUpdated?`Updated ${new Date(e.lastUpdated).toLocaleString()}`:"Local DB Active"}</div>
          ${(h.entries||[]).slice(0,3).map(s=>`
            <div class="sync-row">
              <span class="dot ${s.success?"fresh":"stale"}" style="flex-shrink:0"></span>
              <span class="mono" style="font-size:11px">${d(s.source)}</span>
              <span class="spacer"></span>
              <span class="micro faint">${new Date(s.ran_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `,a.querySelectorAll("[data-pid]").forEach(s=>{s.addEventListener("click",async()=>{const n=s.getAttribute("data-pid"),o=[...g.recommendations||[],...c].find(m=>String(m.player_id)===String(n));if(o){const{openPlayerModal:m}=await V(async()=>{const{openPlayerModal:f}=await import("./index-v73tIri3.js").then(_=>_.W);return{openPlayerModal:f}},__vite__mapDeps([0,1]));m(o,a)}})})}function D(a){return`
    <div class="mini-row">
      ${k(a,26)}
      <div style="flex:1; min-width:0">
        <div class="mini-name">${d(a.player_name||a.player_id)}</div>
        <div class="micro faint">${P(a.position)} ${S(a.team,12)} ${d(a.team||"")}</div>
      </div>
      <div style="text-align:right">
        <div class="mono" style="font-weight:700; font-size:13px">${Number(a.weekly??a.projected_points??0).toFixed(1)}<span class="micro faint">/wk</span></div>
        <div class="micro faint">model $${Number(a.auction??0)}</div>
      </div>
    </div>`}function Y(a,e,h,t=4e3){if(!a.length||e<=0)return a.map(()=>0);const u=a.map(i=>Number(i.starter_pts??0)),g=[...u].sort((i,l)=>i-l),j=g[Math.floor(g.length/2)]??0,N=u.map(i=>Math.min(.95,Math.max(.05,.5+(i-j)*.025))),y=a.map(i=>Number(i.wins??0)+Number(i.ties??0)*.5),w=a.map((i,l)=>Number(i.fpts??0)+h*u[l]),p=new Array(a.length).fill(0);for(let i=0;i<t;i++){const l=y.map((r,v)=>{let c=0;for(let $=0;$<h;$++)Math.random()<N[v]&&c++;return r+c}),x=a.map((r,v)=>v).sort((r,v)=>l[v]-l[r]||w[v]-w[r]);for(let r=0;r<Math.min(e,x.length);r++)p[x[r]]++}return p.map(i=>i/t)}function A(a){const e=String(a||"").toLowerCase();return/out|ir|injured reserve|pup/.test(e)?3:/doubtful/.test(e)?2:/questionable|limited|dnp/.test(e)?1:0}function G(a){const e=(a==null?void 0:a.data_source)??null;return typeof e=="string"&&e.toLowerCase()==="demo"}export{K as renderDashboard};
