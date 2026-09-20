import{f as u,a as $,b as k,c as w,e as x,l as L,u as _}from"./index-ByNsgN5U.js";async function S(m){var v,p,h;const[e,r,s]=await Promise.all([u(),$(),k().catch(()=>({allTeams:[]}))]),d=w(e.lastUpdated||e.last_updated||((p=(v=r.entries)==null?void 0:v[0])==null?void 0:p.ran_at)),l=((h=r.entries)==null?void 0:h.slice(0,4))||[],t=(s==null?void 0:s.allTeams)||(s==null?void 0:s.leagueRosters)||[],y=e.scoring_settings||{},i=e.roster_positions||[],c=(e==null?void 0:e.data_source)??null,o=(e==null?void 0:e.weather_status)??null,f=typeof c=="string"&&c.toLowerCase()==="demo",b=typeof o=="string"&&o.toLowerCase()==="placeholder"||(e==null?void 0:e.weather_placeholder)===!0,n=d.level==="fresh"?"emerald":d.level==="stale"?"amber":"primary";d.level,m.innerHTML=`
    <div class="hero reveal in">
      <h1>Dashboard</h1>
      <p>${x(L(e))}</p>
    </div>

    ${f?'<div class="alert alert-warn reveal in" role="status">Demo data — run refresh to load live Sleeper data.</div>':""}
    ${b?'<div class="reveal in"><span class="badge badge-faint">Weather: placeholder</span></div>':""}

    <div class="kpi-row reveal in reveal-delay-1">
      <div class="kpi-card" style="--kpi-accent:var(--primary)">
        <div class="kpi-label">Season</div>
        <div class="kpi-value mono">${e.season??"2026"}</div>
      </div>
      <div class="kpi-card" style="--kpi-accent:var(--amber)">
        <div class="kpi-label">Week</div>
        <div class="kpi-value mono">${e.week??"1"}</div>
      </div>
      <div class="kpi-card" style="--kpi-accent:var(--emerald)">
        <div class="kpi-label">PPR</div>
        <div class="kpi-value mono">${y.rec??1}</div>
      </div>
      <div class="kpi-card" style="--kpi-accent:var(--sky)">
        <div class="kpi-label">FLEX Slots</div>
        <div class="kpi-value mono">${i.filter(a=>a==="FLEX").length||2}</div>
      </div>
    </div>

    <div class="grid grid-2 reveal in reveal-delay-2">
      <div class="card card-accent-${n}">
        <div class="card-header">
          <h3>League Config</h3>
          <span class="badge badge-${n}" style="font-size:10px">${d.label}</span>
        </div>
        <div class="card-body">
          <div class="row" style="gap:4px; flex-wrap:wrap; margin-bottom:8px">
            ${(i.length?i:["QB","RB","RB","WR","WR","TE","FLEX","FLEX","K","DEF","BN","BN","BN","BN","IR","IR"]).map(a=>({QB:"pos-qb",RB:"pos-rb",WR:"pos-wr",TE:"pos-te",K:"pos-k",DEF:"pos-def"})[a]?`<span class="badge badge-pos" data-pos="${a}" style="font-size:9px">${a}</span>`:`<span class="badge badge-faint" style="font-size:9px">${a}</span>`).join("")}
          </div>
          <div class="micro faint" style="display:flex; align-items:center; gap:5px">
            <span class="dot ${d.level==="fresh"?"fresh":d.level==="stale"?"stale":"cold"}"></span>
            ${e.lastUpdated?`Updated ${new Date(e.lastUpdated).toLocaleString()}`:"Local DB Active"}
          </div>
        </div>
      </div>

      <div class="card card-accent-sky">
        <div class="card-header"><h3>Data Pipeline</h3><span class="kicker">${l.length?"SQLite WAL":"Scheduled snapshots"}</span></div>
        <div class="card-body" style="padding:0">
          ${l.length?`<table><thead><tr><th>Source</th><th>At</th><th>Status</th></tr></thead><tbody>
            ${l.map(a=>`<tr>
              <td class="mono" style="font-size:11px">${a.source}</td>
              <td class="micro faint">${new Date(a.ran_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</td>
              <td>${a.success?'<span class="badge badge-emerald">ok</span>':'<span class="badge badge-crimson">fail</span>'}</td>
            </tr>`).join("")}
          </tbody></table>`:'<div class="empty">No refresh history yet — data updates on schedule</div>'}
        </div>
      </div>
    </div>

    ${t.length?`
    <div class="card card-accent-primary reveal in reveal-delay-3">
      <div class="card-header">
        <h3>League Directory</h3>
        <span class="badge badge-sky">${t.length} teams</span>
      </div>
      <div class="card-body" style="padding:10px">
        <div class="grid grid-3" style="gap:6px">
          ${t.slice(0,12).map((a,g)=>`
            <a href="#roster" class="team-dir-card" style="text-decoration:none">
              ${_(a,34)}
              <div style="flex:1; overflow:hidden">
                <div style="font-weight:600; font-size:12px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
                  ${a.team_name||`Team ${a.roster_id}`}
                </div>
                <div class="micro faint">@${a.owner_name||a.display_name||`Owner ${a.roster_id}`}</div>
              </div>
              <span class="badge badge-faint" style="font-size:9px">#${g+1}</span>
            </a>
          `).join("")}
        </div>
      </div>
    </div>
    `:""}
  `}export{S as renderDashboard};
