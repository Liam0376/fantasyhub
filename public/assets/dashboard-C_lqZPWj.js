import{f as $,a as u,b as k,c as w,e as x,l as L,u as _}from"./index-CIIdx54w.js";async function B(m){var v,p,h;const[a,t,s]=await Promise.all([$(),u(),k().catch(()=>({allTeams:[]}))]),l=w(a.lastUpdated||a.last_updated||((p=(v=t.entries)==null?void 0:v[0])==null?void 0:p.ran_at)),r=((h=t.entries)==null?void 0:h.slice(0,4))||[],i=(s==null?void 0:s.allTeams)||(s==null?void 0:s.leagueRosters)||[],f=a.scoring_settings||{},d=a.roster_positions||[],c=(a==null?void 0:a.data_source)??null,o=(a==null?void 0:a.weather_status)??null,y=typeof c=="string"&&c.toLowerCase()==="demo",b=typeof o=="string"&&o.toLowerCase()==="placeholder"||(a==null?void 0:a.weather_placeholder)===!0,n=l.level==="fresh"?"emerald":l.level==="stale"?"amber":"primary";l.level,m.innerHTML=`
    <div class="hero reveal in">
      <h1>Dashboard</h1>
      <p>${x(L(a))}</p>
    </div>

    ${y?'<div class="alert alert-warn reveal in" role="status">Demo data — run refresh to load live Sleeper data.</div>':""}
    ${b?'<div class="reveal in"><span class="badge badge-faint">Weather: placeholder</span></div>':""}

    <div class="kpi-row reveal in reveal-delay-1">
      <div class="kpi-card" style="--kpi-accent:var(--primary)">
        <div class="kpi-label">Season</div>
        <div class="kpi-value mono">${a.season??"2026"}</div>
      </div>
      <div class="kpi-card" style="--kpi-accent:var(--amber)">
        <div class="kpi-label">Week</div>
        <div class="kpi-value mono">${a.week??"1"}</div>
      </div>
      <div class="kpi-card" style="--kpi-accent:var(--emerald)">
        <div class="kpi-label">PPR</div>
        <div class="kpi-value mono">${f.rec??1}</div>
      </div>
      <div class="kpi-card" style="--kpi-accent:var(--sky)">
        <div class="kpi-label">FLEX Slots</div>
        <div class="kpi-value mono">${d.filter(e=>e==="FLEX").length||2}</div>
      </div>
    </div>

    <div class="grid grid-2 reveal in reveal-delay-2">
      <div class="card card-accent-${n}">
        <div class="card-header">
          <h3>League Config</h3>
          <span class="badge badge-${n}" style="font-size:10px">${l.label}</span>
        </div>
        <div class="card-body">
          <div class="row" style="gap:4px; flex-wrap:wrap; margin-bottom:8px">
            ${(d.length?d:["QB","RB","RB","WR","WR","TE","FLEX","FLEX","K","DEF","BN","BN","BN","BN","IR","IR"]).map(e=>({QB:"pos-qb",RB:"pos-rb",WR:"pos-wr",TE:"pos-te",K:"pos-k",DEF:"pos-def"})[e]?`<span class="badge badge-pos" data-pos="${e}" style="font-size:9px">${e}</span>`:`<span class="badge badge-faint" style="font-size:9px">${e}</span>`).join("")}
          </div>
          <div class="micro faint" style="display:flex; align-items:center; gap:5px">
            <span class="dot ${l.level==="fresh"?"fresh":l.level==="stale"?"stale":"cold"}"></span>
            ${a.lastUpdated?`Updated ${new Date(a.lastUpdated).toLocaleString()}`:"Local DB Active"}
          </div>
        </div>
      </div>

      <div class="card card-accent-sky">
        <div class="card-header"><h3>Data Pipeline</h3><span class="kicker">SQLite WAL</span></div>
        <div class="card-body" style="padding:0">
          ${r.length?`<table><thead><tr><th>Source</th><th>At</th><th>Status</th></tr></thead><tbody>
            ${r.map(e=>`<tr>
              <td class="mono" style="font-size:11px">${e.source}</td>
              <td class="micro faint">${new Date(e.ran_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</td>
              <td>${e.success?'<span class="badge badge-emerald">ok</span>':'<span class="badge badge-crimson">fail</span>'}</td>
            </tr>`).join("")}
          </tbody></table>`:'<div class="empty">Local DB active</div>'}
        </div>
      </div>
    </div>

    ${i.length?`
    <div class="card card-accent-primary reveal in reveal-delay-3">
      <div class="card-header">
        <h3>League Directory</h3>
        <span class="badge badge-sky">${i.length} teams</span>
      </div>
      <div class="card-body" style="padding:10px">
        <div class="grid grid-3" style="gap:6px">
          ${i.slice(0,12).map((e,g)=>`
            <a href="#roster" class="team-dir-card" style="text-decoration:none">
              ${_(e,34)}
              <div style="flex:1; overflow:hidden">
                <div style="font-weight:600; font-size:12px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
                  ${e.team_name||`Team ${e.roster_id}`}
                </div>
                <div class="micro faint">@${e.owner_name||e.display_name||`Owner ${e.roster_id}`}</div>
              </div>
              <span class="badge badge-faint" style="font-size:9px">#${g+1}</span>
            </a>
          `).join("")}
        </div>
      </div>
    </div>
    `:""}
  `}export{B as renderDashboard};
