import{t as m,e as s,n as y,w as f,q as j,m as B,p as N,j as x}from"./index-BUQ5dhSf.js";function k(u,v={}){const{showDraftBtn:$=!1,showInterval:h=!0,showTeamLogo:i=!0,draftValue:p=null}=v,a=u,_=(a.position||a.position_group||"UNK").toUpperCase(),n=Number(a.projected_points??a.point_estimate??0),r=Number(a.projection_lower??a.lower_bound??Math.max(0,n-(a.width??5))),d=Number(a.projection_upper??a.upper_bound??n+(a.width??5)),b=Number(a.width??a.projection_width??(d-r)/2),e=a.team||"",o=a.opponent_team||"",g=i&&e?`${m(e,16)} `:"",w=o?`<span class="faint">vs</span> ${i?m(o,16)+" ":""}${s(o)}`:"",c=h?`<div class="pc-interval">${y({point:n,low:r,high:d,width:b,min:0,max:35})}</div>`:"",t=[];a.wind_mph>0&&t.push(f(a.wind_mph)),a.injury_status&&t.push(j(a.injury_status)),a.trending&&t.push('<span class="badge" style="background:var(--sky-dim);color:var(--sky)">&#8599; trending</span>');const l=$?`<button class="btn btn-primary btn-sm draftBtn pc-draft-btn" data-pid="${s(a.player_id)}" data-name="${s(a.player_name)}" data-val="${p??a.auction??1}">Draft $${p??a.auction??1}</button>`:"";return`
    <div class="player-card-v2" data-pid="${s(a.player_id||"")}" style="--team-accent:${B(e)}">
      <div class="pc-header">
        ${N(a,44)}
        <div class="pc-info">
          <div class="pc-name">${s(a.player_name||a.player_id)}</div>
          <div class="pc-meta">${x(_)} ${g}${s(e)} ${w}</div>
        </div>
        <div class="pc-proj mono">${n.toFixed(1)}</div>
      </div>
      ${c||t.length||l?`
        <div class="pc-details">
          ${c}
          ${t.length?`<div class="pc-badges">${t.join(" ")}</div>`:""}
          ${l}
        </div>
      `:""}
    </div>
  `}export{k as p};
