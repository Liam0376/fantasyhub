import{t as j,e,n as N,w as P,q as S,m as A,p as G,j as F}from"./index-DjgPke4c.js";function C(w,x={}){const{showDraftBtn:b=!1,showInterval:R=!0,showTeamLogo:u=!0,draftValue:m=null,statWeek:g=null}=x,t=w,s=(t.position||t.position_group||"UNK").toUpperCase(),p=Number(t.projected_points??t.point_estimate??0),h=Number(t.projection_lower??t.lower_bound??Math.max(0,p-(t.width??5))),_=Number(t.projection_upper??t.upper_bound??p+(t.width??5)),k=Number(t.width??t.projection_width??(_-h)/2),c=t.team||"",d=t.opponent_team||"",T=u&&c?`${j(c,16)} `:"",B=d?`<span class="faint">vs</span> ${u?j(d,16)+" ":""}${e(d)}`:"",f=R?`<div class="pc-interval">${N({point:p,low:h,high:_,width:k,min:0,max:35})}</div>`:"",n=[];t.wind_mph>0&&n.push(P(t.wind_mph)),t.injury_status&&n.push(S(t.injury_status)),t.trending&&n.push('<span class="badge" style="background:var(--sky-dim);color:var(--sky)">&#8599; trending</span>');const v=b?`<button class="btn btn-primary btn-sm draftBtn pc-draft-btn" data-pid="${e(t.player_id)}" data-name="${e(t.player_name)}" data-val="${m??t.auction??1}">Draft $${m??t.auction??1}</button>`:"",D={PaYd:350,PaTD:5,RuYd:150,RuTD:3,Rec:12,RecYd:150,RecTD:3,FGm:5,XP:6},Y=(r,o)=>{if(o==null)return"";const i=D[r]||100,M=Math.max(0,Math.min(100,Number(o)/i*100)),y=`${r} ${o} of ${i} scale`;return`<span class="pc-gauge" role="img" aria-label="${y}" title="${y}" style="display:inline-flex;flex-direction:column;align-items:center;width:52px"><svg viewBox="0 0 44 26" width="44" height="26" aria-hidden="true" focusable="false"><path d="M4 22 A18 18 0 0 1 40 22" fill="none" stroke="var(--border)" stroke-width="5" stroke-linecap="round"/><path d="M4 22 A18 18 0 0 1 40 22" fill="none" stroke="var(--amber)" stroke-width="5" stroke-linecap="round" pathLength="100" stroke-dasharray="${M.toFixed(1)} 100"/></svg><span class="pc-gauge-val mono" style="font-size:11px;font-weight:700">${o}</span><span class="pc-gauge-label" style="font-size:9px;color:var(--text-faint)">${r}</span></span>`},l=[],a=(r,o)=>{const i=Y(r,o);i&&l.push(i)};s==="QB"?(a("PaYd",t.proj_pass_yd),a("PaTD",t.proj_pass_td),a("RuYd",t.proj_rush_yd),a("RuTD",t.proj_rush_td)):s==="RB"?(a("RuYd",t.proj_rush_yd),a("RuTD",t.proj_rush_td),a("Rec",t.proj_rec),a("RecYd",t.proj_rec_yd)):s==="WR"||s==="TE"?(a("Rec",t.proj_rec),a("RecYd",t.proj_rec_yd),a("RecTD",t.proj_rec_td)):s==="K"&&(a("FGm",t.proj_fgm),a("XP",t.proj_xpm));const $=l.length?`<div class="pc-gauges" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;align-items:flex-start">${g!=null?`<span class="mono" style="font-size:11px;color:var(--text-faint);align-self:center">Wk${e(String(g))}</span>`:""}${l.join("")}</div>`:"";return`
    <div class="player-card-v2" data-pid="${e(t.player_id||"")}" style="--team-accent:${A(c)}">
      <div class="pc-header">
        ${G(t,44)}
        <div class="pc-info">
          <div class="pc-name">${e(t.player_name||t.player_id)}</div>
          <div class="pc-meta">${F(s)} ${T}${e(c)} ${B}</div>
        </div>
        <div class="pc-proj mono">${p.toFixed(1)}</div>
      </div>
      ${f||n.length||v||$?`
        <div class="pc-details">
          ${f}
          ${$}
          ${n.length?`<div class="pc-badges">${n.join(" ")}</div>`:""}
          ${v}
        </div>
      `:""}
    </div>
  `}export{C as p};
