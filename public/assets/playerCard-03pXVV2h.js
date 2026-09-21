import{t as j,e as s,n as S,w as T,q as D,m as k,p as N,j as Y}from"./index-DmRnCA0Z.js";function P(y,f={}){const{showDraftBtn:g=!1,showInterval:b=!0,showTeamLogo:d=!0,draftValue:c=null,statWeek:l=null}=f,t=y,e=(t.position||t.position_group||"UNK").toUpperCase(),n=Number(t.projected_points??t.point_estimate??0),u=Number(t.projection_lower??t.lower_bound??Math.max(0,n-(t.width??5))),_=Number(t.projection_upper??t.upper_bound??n+(t.width??5)),w=Number(t.width??t.projection_width??(_-u)/2),r=t.team||"",p=t.opponent_team||"",R=d&&r?`${j(r,16)} `:"",x=p?`<span class="faint">vs</span> ${d?j(p,16)+" ":""}${s(p)}`:"",m=b?`<div class="pc-interval">${S({point:n,low:u,high:_,width:w,min:0,max:35})}</div>`:"",o=[];t.wind_mph>0&&o.push(T(t.wind_mph)),t.injury_status&&o.push(D(t.injury_status)),t.trending&&o.push('<span class="badge" style="background:var(--sky-dim);color:var(--sky)">&#8599; trending</span>');const v=g?`<button class="btn btn-primary btn-sm draftBtn pc-draft-btn" data-pid="${s(t.player_id)}" data-name="${s(t.player_name)}" data-val="${c??t.auction??1}">Draft $${c??t.auction??1}</button>`:"",i=[],a=(B,h)=>{h!=null&&i.push(`${h} ${B}`)};e==="QB"?(a("PaYd",t.proj_pass_yd),a("PaTD",t.proj_pass_td),a("RuYd",t.proj_rush_yd),a("RuTD",t.proj_rush_td)):e==="RB"?(a("RuYd",t.proj_rush_yd),a("RuTD",t.proj_rush_td),a("Rec",t.proj_rec),a("RecYd",t.proj_rec_yd)):e==="WR"||e==="TE"?(a("Rec",t.proj_rec),a("RecYd",t.proj_rec_yd),a("RecTD",t.proj_rec_td)):e==="K"&&(a("FGm",t.proj_fgm),a("XP",t.proj_xpm));const $=i.length?`<div class="pc-stats mono" style="font-size:11px; color:var(--text-muted); margin-top:6px">${l!=null?`<span style="color:var(--text-faint)">Wk${s(String(l))} · </span>`:""}${i.join(" · ")}</div>`:"";return`
    <div class="player-card-v2" data-pid="${s(t.player_id||"")}" style="--team-accent:${k(r)}">
      <div class="pc-header">
        ${N(t,44)}
        <div class="pc-info">
          <div class="pc-name">${s(t.player_name||t.player_id)}</div>
          <div class="pc-meta">${Y(e)} ${R}${s(r)} ${x}</div>
        </div>
        <div class="pc-proj mono">${n.toFixed(1)}</div>
      </div>
      ${m||o.length||v||$?`
        <div class="pc-details">
          ${m}
          ${$}
          ${o.length?`<div class="pc-badges">${o.join(" ")}</div>`:""}
          ${v}
        </div>
      `:""}
    </div>
  `}export{P as p};
