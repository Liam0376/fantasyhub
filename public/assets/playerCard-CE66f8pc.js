import{t as v,e as s,n as j,w as B,q as N,G as S,m as k,p as x,j as C}from"./index-Ov8KQWn6.js";function G($,h={}){const{showDraftBtn:_=!1,showInterval:g=!0,showTeamLogo:i=!0,draftValue:p=null,statWeek:w=null}=h,t=$,r=(t.position||t.position_group||"UNK").toUpperCase(),n=Number(t.projected_points??t.point_estimate??0),d=Number(t.projection_lower??t.lower_bound??Math.max(0,n-(t.width??5))),c=Number(t.projection_upper??t.upper_bound??n+(t.width??5)),b=Number(t.width??t.projection_width??(c-d)/2),e=t.team||"",o=t.opponent_team||"",y=i&&e?`${v(e,16)} `:"",f=o?`<span class="faint">vs</span> ${i?v(o,16)+" ":""}${s(o)}`:"",l=g?`<div class="pc-interval">${j({point:n,low:d,high:c,width:b,min:0,max:35})}</div>`:"",a=[];t.wind_mph>0&&a.push(B(t.wind_mph)),t.injury_status&&a.push(N(t.injury_status)),t.trending&&a.push('<span class="badge" style="background:var(--sky-dim);color:var(--sky)">&#8599; trending</span>');const m=_?`<button class="btn btn-primary btn-sm draftBtn pc-draft-btn" data-pid="${s(t.player_id)}" data-name="${s(t.player_name)}" data-val="${p??t.auction??1}">Draft $${p??t.auction??1}</button>`:"",u=S(r,t,w);return`
    <div class="player-card-v2" data-pid="${s(t.player_id||"")}" style="--team-accent:${k(e)}">
      <div class="pc-header">
        ${x(t,44)}
        <div class="pc-info">
          <div class="pc-name">${s(t.player_name||t.player_id)}</div>
          <div class="pc-meta">${C(r)} ${y}${s(e)} ${f}</div>
        </div>
        <div class="pc-proj mono">${n.toFixed(1)}</div>
      </div>
      ${l||a.length||m||u?`
        <div class="pc-details">
          ${l}
          ${u}
          ${a.length?`<div class="pc-badges">${a.join(" ")}</div>`:""}
          ${m}
        </div>
      `:""}
    </div>
  `}export{G as p};
