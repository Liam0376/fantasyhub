import{e as m,K as u,E as g}from"./index-D8DGI4aR.js";function o(e){return u(g())}function f(e){try{return localStorage.getItem(o(e))||null}catch{return null}}function S(e,a){try{localStorage.setItem(o(a),String(e))}catch{}}function b(e=[],a=null){var r;const t=Array.isArray(e)&&e.length?e:[];if(!t.length)return'<div class="faint" style="font-size:12px">No teams synced — <a href="#dashboard">open Dashboard</a> to set up your league.</div>';const n=t.length&&((r=t[0])==null?void 0:r.roster_id)!=null?String(t[0].roster_id):null,c=a||f()||n;return`
    <div class="team-selector-wrap">
      <label for="globalTeamSelect" class="sr-only">Select Team</label>
      <select id="globalTeamSelect" class="team-select-dropdown" aria-label="Select Sleeper Team">
        ${t.map(l=>{const s=String(l.roster_id),i=s===String(c),d=l.team_name&&l.team_name!==l.display_name?`${l.team_name} (${l.display_name})`:l.display_name;return`<option value="${s}" ${i?"selected":""}>${m(d)}</option>`}).join("")}
      </select>
    </div>
  `}function _(e){const a=document.getElementById("globalTeamSelect");a&&a.addEventListener("change",t=>{const n=t.target.value;S(n),typeof e=="function"&&e(n)})}export{_ as b,f as g,b as r,S as s};
