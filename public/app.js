let state=null, me={loggedIn:false}, sortKey='ovr', sortDir=-1;
async function api(path,opts={}){const r=await fetch(path,{headers:{'Content-Type':'application/json'},...opts});const j=await r.json();if(!r.ok)throw new Error(j.error||'Pyyntö epäonnistui');return j}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Add new ability codes here. Images live in public/xfactors/.
const XFACTOR_ICONS = {
  e_1t: {name: 'One Tee', tier: 'Elite', image: '/xfactors/e_1t.png'},
  as_1t: {name: 'One Tee', tier: 'All-Star', image: '/xfactors/s_1t.png'},
  s_1t: {name: 'One Tee', tier: 'Specialist', image: '/xfactors/as_1t.png'},
  e_ab: {name: 'Ankle Breaker', tier: 'Elite', image: '/xfactors/e_ab.png'},
  as_ab: {name: 'Ankle Breaker', tier: 'All-Star', image: '/xfactors/as_ab.png'},
  s_ab: {name: 'Ankle Breaker', tier: 'Specialist', image: '/xfactors/s_ab.png'},
  e_bb: {name: 'Beauty Backhand', tier: 'Elite', image: '/xfactors/e_bb.png'},
  as_bb: {name: 'Beauty Backhand', tier: 'All-Star', image: '/xfactors/as_bb.png'},
  s_bb: {name: 'Beauty Backhand', tier: 'Specialist', image: '/xfactors/s_bb.png'},
  e_bl: {name: 'Born Leader', tier: 'Elite', image: '/xfactors/e_bl.png'},
  as_bl: {name: 'Born Leader', tier: 'All-Star', image: '/xfactors/as_bl.png'},
  s_bl: {name: 'Born Leader', tier: 'Specialist', image: '/xfactors/s_bl.png'},
  e_br: {name: 'Big Rig', tier: 'Elite', image: '/xfactors/e_br.png'},
  as_br: {name: 'Big Rig', tier: 'All-Star', image: '/xfactors/as_br.png'},
  s_br: {name: 'Big Rig', tier: 'Specialist', image: '/xfactors/s_br.png'},
  e_bt: {name: 'Big Tipper', tier: 'Elite', image: '/xfactors/e_bt.png'},
  as_bt: {name: 'Big Tipper', tier: 'All-Star', image: '/xfactors/as_bt.png'},
  s_bt: {name: 'Big Tipper', tier: 'Specialist', image: '/xfactors/s_bt.png'},
  e_di: {name: 'Dialed In', tier: 'Elite', image: '/xfactors/e_di.png'},
  as_di: {name: 'Dialed In', tier: 'All-Star', image: '/xfactors/as_di.png'},
  s_di: {name: 'Dialed In', tier: 'Specialist', image: '/xfactors/s_di.png'},
  e_ee: {name: 'Elite Edges', tier: 'Elite', image: '/xfactors/e_ee.png'},
  as_ee: {name: 'Elite Edges', tier: 'All-Star', image: '/xfactors/as_ee.png'},
  s_ee: {name: 'Elite Edges', tier: 'Specialist', image: '/xfactors/s_ee.png'},
  e_h: {name: 'Hipster', tier: 'Elite', image: '/xfactors/e_h.png'},
  as_h: {name: 'Hipster', tier: 'All-Star', image: '/xfactors/as_h.png'},
  s_h: {name: 'Hipster', tier: 'Specialist', image: '/xfactors/s_h.png'},
  e_nc: {name: 'No Contest', tier: 'Elite', image: '/xfactors/e_nc.png'},
  as_nc: {name: 'No Contest', tier: 'All-Star', image: '/xfactors/as_nc.png'},
  s_nc: {name: 'No Contest', tier: 'Specialist', image: '/xfactors/s_nc.png'},
  e_pp: {name: 'Pressure+', tier: 'Elite', image: '/xfactors/e_pp.png'},
  as_pp: {name: 'Pressure+', tier: 'All-Star', image: '/xfactors/as_pp.png'},
  s_pp: {name: 'Pressure+', tier: 'Specialist', image: '/xfactors/s_pp.png'},
  e_ptp: {name: 'Post To Post', tier: 'Elite', image: '/xfactors/e_ptp.png'},
  as_ptp: {name: 'Post To Post', tier: 'All-Star', image: '/xfactors/as_ptp.png'},
  s_ptp: {name: 'Post To Post', tier: 'Specialist', image: '/xfactors/s_ptp.png'},
  e_qd: {name: 'Quick Draw', tier: 'Elite', image: '/xfactors/e_qd.png'},
  as_qd: {name: 'Quick Draw', tier: 'All-Star', image: '/xfactors/as_qd.png'},
  s_qd: {name: 'Quick Draw', tier: 'Specialist', image: '/xfactors/s_qd.png'},
  e_qp: {name: 'Quick Pick', tier: 'Elite', image: '/xfactors/e_qp.png'},
  as_qp: {name: 'Quick Pick', tier: 'All-Star', image: '/xfactors/as_qp.png'},
  s_qp: {name: 'Quick Pick', tier: 'Specialist', image: '/xfactors/s_qp.png'},
  e_qr: {name: 'Quick Release', tier: 'Elite', image: '/xfactors/e_qr.png'},
  as_qr: {name: 'Quick Release', tier: 'All-Star', image: '/xfactors/as_qr.png'},
  s_qr: {name: 'Quick Release', tier: 'Specialist', image: '/xfactors/s_qr.png'},
  e_re: {name: 'Recharge', tier: 'Elite', image: '/xfactors/e_re.png'},
  as_re: {name: 'Recharge', tier: 'All-Star', image: '/xfactors/as_re.png'},
  s_re: {name: 'Recharge', tier: 'Specialist', image: '/xfactors/s_re.png'},
  e_ro: {name: 'Rocket', tier: 'Elite', image: '/xfactors/e_ro.png'},
  as_ro: {name: 'Rocket', tier: 'All-Star', image: '/xfactors/as_ro.png'},
  s_ro: {name: 'Rocket', tier: 'Specialist', image: '/xfactors/s_ro.png'},
  e_s: {name: 'Sponge', tier: 'Elite', image: '/xfactors/e_s.png'},
  as_s: {name: 'Sponge', tier: 'All-Star', image: '/xfactors/as_s.png'},
  s_s: {name: 'Sponge', tier: 'Specialist', image: '/xfactors/s_s.png'},
  e_seu: {name: 'Stick Em Up', tier: 'Elite', image: '/xfactors/e_seu.png'},
  as_seu: {name: 'Stick Em Up', tier: 'All-Star', image: '/xfactors/as_seu.png'},
  s_seu: {name: 'Stick Em Up', tier: 'Specialist', image: '/xfactors/s_seu.png'},
  e_si: {name: 'Send It', tier: 'Elite', image: '/xfactors/e_si.png'},
  as_si: {name: 'Send It', tier: 'All-Star', image: '/xfactors/as_si.png'},
  s_si: {name: 'Send It', tier: 'Specialist', image: '/xfactors/s_si.png'},
  e_sp: {name: 'Spark Plug', tier: 'Elite', image: '/xfactors/e_sp.png'},
  as_sp: {name: 'Spark Plug', tier: 'All-Star', image: '/xfactors/as_sp.png'},
  s_sp: {name: 'Spark Plug', tier: 'Specialist', image: '/xfactors/s_sp.png'},
  e_ss: {name: 'Show Stopper', tier: 'Elite', image: '/xfactors/e_ss.png'},
  as_ss: {name: 'Show Stopper', tier: 'All-Star', image: '/xfactors/as_ss.png'},
  s_ss: {name: 'Show Stopper', tier: 'Specialist', image: '/xfactors/s_ss.png'},
  e_sw: {name: 'Second Wind', tier: 'Elite', image: '/xfactors/e_sw.png'},
  as_sw: {name: 'Second Wind', tier: 'All-Star', image: '/xfactors/as_sw.png'},
  s_sw: {name: 'Second Wind', tier: 'Specialist', image: '/xfactors/s_sw.png'},
  e_t: {name: 'Truculence', tier: 'Elite', image: '/xfactors/e_t.png'},
  as_t: {name: 'Truculence', tier: 'All-Star', image: '/xfactors/as_t.png'},
  s_t: {name: 'Truculence', tier: 'Specialist', image: '/xfactors/s_t.png'},
  e_ttt: {name: 'Tape To Tape', tier: 'Elite', image: '/xfactors/e_ttt.png'},
  as_ttt: {name: 'Tape To Tape', tier: 'All-Star', image: '/xfactors/as_ttt.png'},
  s_ttt: {name: 'Tape To Tape', tier: 'Specialist', image: '/xfactors/s_ttt.png'},
  e_u: {name: 'Unstoppable', tier: 'Elite', image: '/xfactors/e_u.png'},
  as_u: {name: 'Unstoppable', tier: 'All-Star', image: '/xfactors/as_u.png'},
  s_u: {name: 'Unstoppable', tier: 'Specialist', image: '/xfactors/s_u.png'},
  e_wa: {name: 'Warrior', tier: 'Elite', image: '/xfactors/e_wa.png'},
  as_wa: {name: 'Warrior', tier: 'All-Star', image: '/xfactors/as_wa.png'},
  s_wa: {name: 'Warrior', tier: 'Specialist', image: '/xfactors/s_wa.png'},
  e_wh: {name: 'Wheels', tier: 'Elite', image: '/xfactors/e_wh.png'},
  as_wh: {name: 'Wheels', tier: 'All-Star', image: '/xfactors/as_wh.png'},
  s_wh: {name: 'Wheels', tier: 'Specialist', image: '/xfactors/s_wh.png'}
};
function renderXFactors(value){
  const raw=String(value??'').trim();
  if(!raw)return '<span class="muted">—</span>';
  // Colon-wrapped codes can be separated by spaces, commas, or semicolons.
  const codes=[...raw.matchAll(/:([a-z0-9_]+):/gi)].map(m=>m[1].toLowerCase());
  if(!codes.length)return `<span class="xfactor-unknown" title="Tuntematon kyky">${esc(raw)}</span>`;
  const badges=codes.map(code=>{
    const x=XFACTOR_ICONS[code];
    if(!x)return `<span class="xfactor-unknown" title="Kuva puuttuu koodille :${esc(code)}:">:${esc(code)}:</span>`;
    const title=`${x.tier} ${x.name}`;
    // If a custom image is missing, show the readable name instead of a broken image.
    return `<span class="xfactor-item" title="${esc(title)}" aria-label="${esc(title)}"><img class="xfactor-icon" src="${esc(x.image)}" alt="${esc(title)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="xfactor-fallback" hidden>${esc(title)}</span></span>`;
  }).join('');
  const leftover=raw.replace(/:[a-z0-9_]+:/gi,'').replace(/[;,\s]+/g,'').trim();
  return `<span class="xfactor-list">${badges}${leftover?`<span class="xfactor-unknown" title="Tuntematon teksti">${esc(leftover)}</span>`:''}</span>`;
}
const money=n=>new Intl.NumberFormat('fi-FI',{maximumFractionDigits:3}).format((Number(n)||0)/1000000)+' M$';
const payroll=id=>(state?.picks||[]).filter(p=>p.teamId===id).reduce((n,p)=>n+(Number(p.salary)||0),0);
const fmtTime=s=>s==null?'--:--':`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const drafted=()=>new Set((state?.picks||[]).map(p=>p.playerId));
function filteredPlayers(){const q=document.getElementById('search').value.toLowerCase().trim(),pos=document.getElementById('position').value,hand=document.getElementById('hand').value,min=Number(document.getElementById('minOvr').value||-1),max=Number(document.getElementById('maxOvr').value||999),d=drafted();return(state?.players||[]).filter(p=>!d.has(p.id)&&(!q||p.name.toLowerCase().includes(q))&&(!pos||p.position===pos)&&(!hand||p.hand===hand)&&p.ovr>=min&&p.ovr<=max).sort((a,b)=>{let av=a[sortKey]??'',bv=b[sortKey]??'';if(sortKey==='ovr'||sortKey==='salary'||sortKey==='contractDuration'){av=Number(av);bv=Number(bv)}else{av=String(av);bv=String(bv)}return av<bv?-sortDir:av>bv?sortDir:0})}
function canPick(){return me.role==='commissioner'||(me.role==='team'&&me.teamId===state?.currentTeamId)}
function render(){
 if(!state)return;
 const $=id=>document.getElementById(id);
 const labels={setup:'VALMISTELU',live:'KÄYNNISSÄ',paused:'KESKEYTETTY',complete:'VALMIS'};
 $('draftName').textContent=state.draftName;
 $('statusText').textContent=(labels[state.status]||state.status)+(state.mode==='practice'?' · HARJOITUS':'');
 const team=state.teams.find(t=>t.id===state.currentTeamId);
 const order=Array.from({length:state.teamCount},(_,i)=>i+1);if(state.round%2===0)order.reverse();
 const idx=order.indexOf(state.currentTeamId),next=order[(idx+1)%order.length],nextTeam=state.teams.find(t=>t.id===next);
 $('clockTeam').textContent=state.status==='live'?(team?.name||'Joukkue'):'Varaus ei ole käynnissä';
 $('pickInfo').textContent=`Kierros ${state.round} · Varaus ${Math.min(state.picks.length+1,state.rounds*state.teamCount)} / ${state.rounds*state.teamCount}`;
 $('timer').textContent=fmtTime(state.timerRemaining);
 $('currentTeam').textContent=team?.name||'—';$('currentParticipant').textContent=team?.participant||'Ei osallistujaa';
 $('nextTeam').textContent=nextTeam?.name||'—';
 const avail=filteredPlayers();$('availableCount').textContent=`${avail.length} näkyvissä · ${state.players.length-drafted().size} vapaana`;
 $('playerRows').innerHTML=avail.map(p=>{const affordable=payroll(state.currentTeamId)+(Number(p.salary)||0)<=state.salaryCapCeiling;return `<tr><td>${esc(p.name)}</td><td>${esc(p.position)}</td><td>${p.ovr}</td><td>${esc(p.height)}</td><td>${esc(p.weight)}</td><td>${esc(p.hand)}</td><td>${renderXFactors(p.xfactor)}</td><td>${money(p.salary)}</td><td>${p.contractDuration?`${esc(p.contractDuration)} ${p.contractDuration===1?'vuosi':'vuotta'}`:'—'}</td><td><button class="pickbtn" onclick="pick('${esc(p.id)}')" ${state.status!=='live'||!canPick()||!affordable?'disabled':''} title="${affordable?'Varaa pelaaja':'Palkkakatto ylittyisi'}">Varaa</button></td></tr>`}).join('');
 $('recentPicks').innerHTML=state.picks.slice(-8).reverse().map(p=>`<div class="pickrow"><b>#${p.pickNumber}</b> ${esc(p.teamName)} — ${esc(p.playerName)} <span class="muted">${p.ovr} · ${money(p.salary)} · ${p.contractDuration?`${esc(p.contractDuration)} v`: '—'} ${p.automatic?'· AUTOMAATTINEN':''}</span></div>`).join('')||'<div class="muted">Ei varauksia.</div>';
 $('rosters').innerHTML=state.teams.map(t=>{const ps=state.picks.filter(p=>p.teamId===t.id);return`<div class="roster"><h4>${esc(t.name)} <span class="muted">${esc(t.participant)}</span></h4><div class="salary-summary">Palkat: <b>${money(payroll(t.id))}</b> / ${money(state.salaryCapCeiling)}<br>Jäljellä: <b>${money(state.salaryCapCeiling-payroll(t.id))}</b></div><ol>${ps.map(p=>`<li>${esc(p.playerName)} <span class="muted">${p.position} · ${p.ovr} · ${money(p.salary)} · ${p.contractDuration?`${esc(p.contractDuration)} v`:'—'}</span></li>`).join('')||'<li class="muted">Ei varauksia</li>'}</ol></div>`}).join('');
 $('board').innerHTML=state.picks.slice().reverse().slice(0,64).map(p=>`<div class="slot ${p.teamId===state.currentTeamId&&state.status==='live'?'active':''}">#${p.pickNumber} ${esc(p.teamName)}<br><b>${esc(p.playerName)}</b> · ${p.ovr}</div>`).join('');
 $('rosterMode').textContent=state.mode==='practice'?'Harjoitus':`Kierros ${state.round}`;
 $('commissionerBtn').classList.toggle('hidden',me.role!=='commissioner');
 $('whoami').textContent=me.loggedIn?(me.role==='commissioner'?'Komissaari':`Joukkue: ${state.teams.find(t=>t.id===me.teamId)?.name||me.teamId}`):'Ei kirjautunut';
}

async function pick(id){try{await api('/api/draft/pick',{method:'POST',body:JSON.stringify({playerId:id})})}catch(e){alert(e.message)}}
function fillTeams(){document.getElementById('teamInputs').innerHTML=state.teams.map((t,i)=>`<div><label>Joukkueen ${i+1} nimi<input class="team-name" data-i="${i}" value="${esc(t.name)}"></label><label>Osallistuja<input class="team-part" data-i="${i}" value="${esc(t.participant)}"></label><label>Joukkueen koodi<input class="team-code" data-i="${i}" value="${esc(t.code||'')}" placeholder="oma koodi"></label></div>`).join('')}
function fillAdmin(){document.getElementById('draftNameInput').value=state.draftName;document.getElementById('timerSeconds').value=state.timerSeconds;document.getElementById('salaryCapCeiling').value=state.salaryCapCeiling;document.getElementById('autopickEnabled').value=String(state.autopickEnabled);document.getElementById('autopickMode').value=state.autopickMode;document.getElementById('autopickPositions').value=(state.autopickPositions||[]).join(',');document.getElementById('newPassword').value='';fillTeams()}
async function saveSettings(){const teams=state.teams.map((t,i)=>({name:document.querySelector(`.team-name[data-i="${i}"]`).value,participant:document.querySelector(`.team-part[data-i="${i}"]`).value,code:document.querySelector(`.team-code[data-i="${i}"]`).value}));const body={draftName:document.getElementById('draftNameInput').value,timerSeconds:Number(document.getElementById('timerSeconds').value),salaryCapCeiling:Number(document.getElementById('salaryCapCeiling').value),autopickEnabled:document.getElementById('autopickEnabled').value==='true',autopickMode:document.getElementById('autopickMode').value,autopickPositions:document.getElementById('autopickPositions').value.split(',').map(x=>x.trim().toUpperCase()).filter(Boolean),teams};const np=document.getElementById('newPassword').value.trim();if(np)body.commissionerPassword=np;try{await api('/api/settings',{method:'POST',body:JSON.stringify(body)});alert('Asetukset tallennettu.')}catch(e){alert(e.message)}}
function openModal(){fillAdmin();document.getElementById('commissioner').classList.remove('hidden')}function closeModal(){document.getElementById('commissioner').classList.add('hidden')}
async function startReal(){try{await saveSettings();await api('/api/mode/real',{method:'POST'});await api('/api/draft/start',{method:'POST'});closeModal()}catch(e){alert(e.message)}}
async function pauseDraft(){try{await api('/api/draft/pause',{method:'POST'})}catch(e){alert(e.message)}}async function undoPick(){try{await api('/api/draft/undo',{method:'POST'})}catch(e){alert(e.message)}}async function forceAutopick(){try{await api('/api/draft/force-autopick',{method:'POST'})}catch(e){alert(e.message)}}async function resetDraft(){if(confirm('Nollataanko varaus? Kaikki varaukset poistetaan.'))try{await api('/api/draft/reset',{method:'POST'})}catch(e){alert(e.message)}}
async function importPlayers(){const f=document.getElementById('file').files[0];if(!f)return alert('Valitse CSV- tai XLSX-tiedosto.');const reader=new FileReader();reader.onload=async()=>{try{const bytes=new Uint8Array(reader.result);let bin='';for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode(...bytes.subarray(i,i+0x8000));const r=await api('/api/import',{method:'POST',body:JSON.stringify({data:btoa(bin)})});document.getElementById('importStatus').textContent=`Tuotu ${r.count} pelaajaa.`}catch(e){alert(e.message)}};reader.readAsArrayBuffer(f)}
async function startPractice(){try{await api('/api/practice/start',{method:'POST',body:JSON.stringify({teams:Number(document.getElementById('practiceTeams').value),rounds:Number(document.getElementById('practiceRounds').value),timerSeconds:Number(document.getElementById('practiceTimer').value)})});closeModal()}catch(e){alert(e.message)}}async function switchRealMode(){try{await api('/api/mode/real',{method:'POST'});closeModal()}catch(e){alert(e.message)}}
async function loginTeam(){try{const j=await api('/api/login',{method:'POST',body:JSON.stringify({mode:'team',teamId:Number(document.getElementById('loginTeam').value),code:document.getElementById('loginCode').value})});me=j;document.getElementById('login').classList.add('hidden');render()}catch(e){alert(e.message)}}async function loginComm(){try{const j=await api('/api/login',{method:'POST',body:JSON.stringify({mode:'commissioner',password:document.getElementById('commPassword').value})});me=j;document.getElementById('login').classList.add('hidden');render()}catch(e){alert(e.message)}}
function initLogin(){document.getElementById('loginTeam').innerHTML=state.teams.map(t=>`<option value="${t.id}">${esc(t.id)} — ${esc(t.name)}</option>`).join('')}
document.getElementById('teamTab').onclick=()=>{document.getElementById('teamLogin').classList.remove('hidden');document.getElementById('commLogin').classList.add('hidden');document.getElementById('teamTab').classList.add('active');document.getElementById('commTab').classList.remove('active')};document.getElementById('commTab').onclick=()=>{document.getElementById('commLogin').classList.remove('hidden');document.getElementById('teamLogin').classList.add('hidden');document.getElementById('commTab').classList.add('active');document.getElementById('teamTab').classList.remove('active')};document.getElementById('teamLoginBtn').onclick=loginTeam;document.getElementById('commLoginBtn').onclick=loginComm;document.getElementById('loginBtn').onclick=()=>document.getElementById('login').classList.remove('hidden');document.getElementById('commissionerBtn').onclick=openModal;
['search','position','hand','minOvr','maxOvr'].forEach(id=>document.getElementById(id).addEventListener('input',render));document.querySelectorAll('th[data-sort]').forEach(th=>th.onclick=()=>{const k=th.dataset.sort;if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=k==='ovr'?-1:1}render()});
const es=new EventSource('/api/events');es.onmessage=e=>{state=JSON.parse(e.data);initLogin();render()};fetch('/api/state').then(r=>r.json()).then(s=>{state=s;initLogin();return fetch('/api/me')}).then(r=>r.json()).then(x=>{me=x;render()});setInterval(()=>{if(state?.status==='live'&&state.timerRemaining!=null){state.timerRemaining=Math.max(0,state.timerRemaining-1);render()}},1000);
