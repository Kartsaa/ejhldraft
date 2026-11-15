const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const DATA_DIR = process.env.STATE_DIR || path.join(ROOT, 'data');
const SEED_FILE = path.join(ROOT, 'data', 'state.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const PUBLIC_DIR = path.join(ROOT, 'public');
fs.mkdirSync(DATA_DIR, { recursive: true });

const DEFAULT_COMMISSIONER_PASSWORD = process.env.COMMISSIONER_PASSWORD || 'nhl27admin';
const DEFAULT_TEAM_CODE = process.env.TEAM_CODE || 'nhl27';

function makeTeams(n=32) {
  return Array.from({length:n}, (_,i)=>({id:i+1,name:`Team ${i+1}`,participant:'',code:DEFAULT_TEAM_CODE}));
}
function defaultState() {
  return {
    draftName:'NHL 27 Fantasy Draft', mode:'real', rounds:32, teamCount:32,
    salaryCapCeiling:95500000, timerSeconds:120, autopickEnabled:true, autopickMode:'highest_ovr',
    autopickPositions:['KH','VL','OL','VP','OP','MV'], status:'setup', round:1, pickInRound:1,
    currentTeamId:1, turnStartedAt:null, pausedRemaining:null, players:[], picks:[],
    teams:makeTeams(32), commissionerPassword:DEFAULT_COMMISSIONER_PASSWORD,
    practiceDefaults:{rounds:3,teams:4,timerSeconds:30}
  };
}
function validState(x){return x && typeof x==='object' && Array.isArray(x.teams) && Array.isArray(x.players) && Array.isArray(x.picks) && Number.isInteger(x.teamCount) && x.teamCount>=2 && x.teams.length>=x.teamCount && Number.isInteger(x.rounds) && x.rounds>0 && ['setup','live','paused','complete'].includes(x.status);}
function loadState(file){const x=JSON.parse(fs.readFileSync(file,'utf8'));if(!validState(x))throw new Error('Virheellinen state.json: '+file);return x;}
// First boot on a new persistent disk: seed from the verified repository snapshot.
// Never silently start an empty draft when the persistent file is missing after initialization.
const MARKER=path.join(DATA_DIR,'.nhl27-initialized');
let state;
if(fs.existsSync(STATE_FILE)) state=loadState(STATE_FILE);
else if(fs.existsSync(MARKER)) throw new Error('Persistent state.json missing! Refusing to reset draft.');
else if(fs.existsSync(SEED_FILE)) {state=loadState(SEED_FILE);fs.writeFileSync(STATE_FILE,JSON.stringify(state,null,2),{flag:'wx'});fs.writeFileSync(MARKER,new Date().toISOString());}
else if(process.env.STATE_DIR) throw new Error('No seed state.json available; refusing to create empty draft.');
else state=defaultState();
if(state.status==='live') {state.status='paused';state.pausedRemaining=state.timerSeconds;state.turnStartedAt=null;} // Avoid a silent autopick during restarts.

if (!state.teams || !state.teams.length) state.teams=makeTeams(32);
if (!Number.isFinite(state.salaryCapCeiling)) state.salaryCapCeiling=95500000;
state.players=(state.players||[]).map(p=>({...p,salary:Number(p.salary)||0}));
if (!state.commissionerPassword) state.commissionerPassword=DEFAULT_COMMISSIONER_PASSWORD;
const sessions = new Map();
const sseClients = new Set();

function writeAtomic(file,contents){const tmp=file+'.'+process.pid+'.tmp';try{fs.writeFileSync(tmp,contents,{mode:0o600});fs.renameSync(tmp,file);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}}
function backupSnapshot(label='auto'){
 fs.mkdirSync(BACKUP_DIR,{recursive:true});
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 const file=path.join(BACKUP_DIR,stamp+'-'+crypto.randomBytes(3).toString('hex')+'-'+label+'.json');
 fs.writeFileSync(file,JSON.stringify(state,null,2),{flag:'wx',mode:0o600});
 const files=fs.readdirSync(BACKUP_DIR).filter(x=>x.endsWith('.json')).sort().reverse();
 for(const old of files.slice(100))fs.unlinkSync(path.join(BACKUP_DIR,old));
}
function save(){writeAtomic(STATE_FILE,JSON.stringify(state,null,2));backupSnapshot();}
const DISCORD_URL=process.env.DISCORD_WEBHOOK_URL||'';
let ROLE_IDS={};try{ROLE_IDS=JSON.parse(process.env.DISCORD_ROLE_IDS||'{}')}catch(e){console.error('Invalid DISCORD_ROLE_IDS JSON:',e.message)}
function discord(message,teamId){if(!DISCORD_URL)return;const role=teamId&&String(ROLE_IDS[teamId]||'');const mention=/^\d{15,22}$/.test(role)?`<@&${role}> `:'';const allowed_mentions=mention?{parse:[],roles:[role]}:{parse:[]};fetch(DISCORD_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:(mention+message).slice(0,1900),allowed_mentions})}).then(r=>{if(!r.ok)console.error('Discord webhook HTTP',r.status)}).catch(e=>console.error('Discord webhook error:',e.message));}
function announcePick(){const p=state.picks.at(-1);if(!p||state.mode==='practice')return;discord(`${p.automatic?'🤖 Automaattinen varaus':'🏒 Uusi varaus'} #${p.pickNumber}: ${p.teamName} — ${p.playerName} (${p.position}, KOK ${p.ovr})`);if(state.status==='complete')discord('🏁 Draft on päättynyt!');else if(state.status==='live'){const t=currentTeam();if(t)discord(`⏰ Varausvuoro alkaa: ${t.name} — kierros ${state.round}`,t.id);}}

function publicState(){
  let remaining=null;
  if(state.status==='live' && state.turnStartedAt) remaining=Math.max(0,state.timerSeconds-Math.floor((Date.now()-state.turnStartedAt)/1000));
  if(state.status==='paused' && Number.isFinite(state.pausedRemaining)) remaining=state.pausedRemaining;
  return {...state, commissionerPassword:undefined, realDraftBackup:undefined, teams:state.teams.map(t=>({...t,code:undefined})),timerRemaining:remaining};
}
function broadcast(){const msg=`data: ${JSON.stringify(publicState())}\n\n`; for(const res of sseClients){try{res.write(msg)}catch{}}}
function json(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(obj));}
function body(req){return new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>10_000_000)req.destroy()});req.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}});req.on('error',reject)})}
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(x=>{const [k,...v]=x.trim().split('=');return [k,decodeURIComponent(v.join('='))]}));}
function session(req){const id=cookies(req).nhl27sid; return id?sessions.get(id):null;}
function requireAuth(req,res,role){const s=session(req);if(!s|| (role && s.role!==role && s.role!=='commissioner')){json(res,403,{error:'Not authorized.'});return null}return s;}
function createSession(role,teamId=null){const id=crypto.randomBytes(24).toString('hex');sessions.set(id,{role,teamId,created:Date.now()});return id;}
function setSession(res,id){res.setHeader('Set-Cookie',`nhl27sid=${id}; HttpOnly; SameSite=Lax; Path=/`)}
// Palkka is an annual cap hit in whole dollars. Accept 5222222, 5 222 222, 5.222M and 5,222M.
function parseSalary(value){
  if(value===null||value===undefined||String(value).trim()==='')return 0;
  let s=String(value).trim().replace(/[€$]/g,'').replace(/\s/g,'').replace(/\u00a0/g,'');
  const millions=/m$/i.test(s);if(millions)s=s.slice(0,-1).replace(',','.');
  else s=s.replace(/[.,](?=\d{3}(?:[.,]|$))/g,'').replace(',','.');
  const n=Number(s);if(!Number.isFinite(n)||n<0)throw new Error('Virheellinen palkka: '+value);
  return Math.round(n*(millions?1000000:1));
}
function normalizePlayer(p,i){
  const position=String(p.Pelipaikka??p.Position??p.position??p.Pos??'').trim().toUpperCase();
  const rawSalary=p.Palkka??p.Salary??p['Cap Hit']??p.CapHit??p.salary??'';
  return {id:String(p.ID??p.Id??p.id??`p-${i+1}`),name:String(p.Nimi??p.Name??p.name??p.Player??p.player??'').trim(),position,ovr:Number(p.KOK??p.OVR??p.Ovr??p.ovr??0),height:String(p.Pituus??p.Height??p.height??'').trim(),weight:String(p.Paino??p.Weight??p.weight??'').trim(),hand:String(p['Kätisyys']??p.Katisyys??p.Hand??p.Handedness??p.handedness??p.hand??'').trim().toUpperCase(),xfactor:String(p.Kyvyt??p.XFactor??p['X-Factor']??p.xfactor??p.Ability??p['X Factor']??'').trim(),salary:parseSalary(rawSalary),contractDuration:Number(p['Sopimuksen kesto']??p['Sopimuksen Kesto']??p.contractDuration??p.contractYears??p.contractLength??0)||0};
}
function teamPayroll(teamId){return state.picks.filter(p=>p.teamId===teamId).reduce((sum,p)=>sum+(Number(p.salary)||0),0);}
function fitsCap(player,teamId){return teamPayroll(teamId)+(Number(player.salary)||0)<=state.salaryCapCeiling;}
function importRows(rows){const players=rows.map(normalizePlayer).filter(p=>p.name);if(!players.length)throw new Error('Tiedostosta ei löytynyt pelaajia (Nimi / Name).');if(players.some(p=>!Number.isFinite(p.ovr)))throw new Error('Tarkista KOK-sarake.');state.players=players;state.picks=[];state.status='setup';state.mode='real';state.round=1;state.pickInRound=1;state.currentTeamId=1;state.turnStartedAt=null;state.pausedRemaining=null;save();broadcast();return players.length;}
function draftedIds(){return new Set(state.picks.map(p=>p.playerId));}
function orderForRound(round,teamCount=state.teamCount){const a=Array.from({length:teamCount},(_,i)=>i+1);return round%2===1?a:a.reverse();}
function currentTeam(){return state.teams.find(t=>t.id===state.currentTeamId);}
function chooseAutopick(){let available=state.players.filter(p=>!draftedIds().has(p.id));if(!available.length)return null;available=available.filter(p=>fitsCap(p,state.currentTeamId));if(!available.length)return null;if(state.autopickMode==='positions'){const allowed=new Set(state.autopickPositions);const preferred=available.filter(p=>allowed.has(p.position));if(preferred.length)available=preferred;}return available.sort((a,b)=>(b.ovr-a.ovr)||a.name.localeCompare(b.name))[0];}
function advance(){const total=state.rounds*state.teamCount;const pickNumber=state.picks.length;if(pickNumber>=total){state.status='complete';state.turnStartedAt=null;state.pausedRemaining=null;return;}state.pickInRound++;if(state.pickInRound>state.teamCount){state.round++;state.pickInRound=1;}state.currentTeamId=orderForRound(state.round)[state.pickInRound-1];state.turnStartedAt=Date.now();state.pausedRemaining=null;}
function recordPick(player,automatic=false){if(!player)throw new Error('No available player.');if(draftedIds().has(player.id))throw new Error('Pelaaja on jo varattu.');if(!fitsCap(player,state.currentTeamId))throw new Error('Palkkakatto ylittyisi tällä varauksella.');const team=currentTeam();if(!team)throw new Error('Current team not found.');state.picks.push({pickNumber:state.picks.length+1,round:state.round,pickInRound:state.pickInRound,teamId:team.id,teamName:team.name,participant:team.participant,playerId:player.id,playerName:player.name,position:player.position,ovr:player.ovr,height:player.height,weight:player.weight,hand:player.hand,xfactor:player.xfactor,salary:player.salary||0,contractDuration:Number(player.contractDuration??player.contractYears??0)||0,automatic,timestamp:new Date().toISOString()});advance();}
function maybeAutopick(){if(state.status!=='live'||!state.autopickEnabled||!state.turnStartedAt)return;if(Date.now()-state.turnStartedAt<state.timerSeconds*1000)return;const p=chooseAutopick();if(p){recordPick(p,true);save();broadcast();announcePick();}else{state.status='paused';state.pausedRemaining=0;state.turnStartedAt=null;save();broadcast();}}
setInterval(maybeAutopick,250);
function csvEscape(v){const s=String(v??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
function exportCSV(){const h=['Pick','Round','Pick In Round','Team','Participant','Player','Position','OVR','Height','Weight','Hand','Kyvyt','Palkka','Automaattinen varaus','Timestamp'];return [h,...state.picks.map(p=>[p.pickNumber,p.round,p.pickInRound,p.teamName,p.participant,p.playerName,p.position,p.ovr,p.height,p.weight,p.hand,p.xfactor,p.salary||0,p.automatic?'Yes':'No',p.timestamp])].map(r=>r.map(csvEscape).join(',')).join('\r\n');}
function exportRosters(){const h=['Team','Participant','Pick','Player','Position','OVR','Height','Weight','Hand','Kyvyt','Palkka','Automaattinen varaus'];const rows=[];for(const t of state.teams)for(const p of state.picks.filter(x=>x.teamId===t.id))rows.push([t.name,t.participant,p.pickNumber,p.playerName,p.position,p.ovr,p.height,p.weight,p.hand,p.xfactor,p.salary||0,p.automatic?'Yes':'No']);return [h,...rows].map(r=>r.map(csvEscape).join(',')).join('\r\n');}
function resetToReal(){
  // Restore the real-draft configuration saved before practice mode.
  if(state.mode==='practice' && state.realDraftBackup){
    const b=state.realDraftBackup;
    state.teams=b.teams;
    state.teamCount=b.teamCount;
    state.rounds=b.rounds;
    state.timerSeconds=b.timerSeconds;
    state.picks=b.picks||[];
  }
  state.realDraftBackup=null;
  state.mode='real';state.status='setup';state.round=1;state.pickInRound=1;state.currentTeamId=1;
  state.picks=[];state.turnStartedAt=null;state.pausedRemaining=null;save();broadcast();
}
async function route(req,res){
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  if(req.method==='GET'&&url.pathname==='/api/backup/download'){
    if(!requireAuth(req,res,'commissioner'))return;
    res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="nhl27-varmuuskopio.json"','Cache-Control':'no-store'});
    return res.end(JSON.stringify(state,null,2));
  }
  if(req.method==='POST'&&url.pathname==='/api/backup/restore'){
    if(!requireAuth(req,res,'commissioner'))return;
    try{
      const b=await body(req);
      if(b.confirm!=='PALAUTA')return json(res,400,{error:'Palautus vaatii vahvistuksen PALAUTA.'});
      if(!validState(b.state))return json(res,400,{error:'Varmuuskopion rakenne ei kelpaa.'});
      if(state.status==='live')return json(res,409,{error:'Keskeytä draft ennen palautusta.'});
      backupSnapshot('before-restore');
      state=b.state;
      if(state.status==='live'){state.status='paused';state.pausedRemaining=state.timerSeconds;state.turnStartedAt=null;}
      save();broadcast();return json(res,200,{ok:true,teams:state.teamCount,picks:state.picks.length});
    }catch(e){return json(res,400,{error:e.message});}
  }
  if(req.method==='GET'&&url.pathname==='/api/state')return json(res,200,publicState());
  if(req.method==='GET'&&url.pathname==='/api/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','Access-Control-Allow-Origin':'*'});res.write(`data: ${JSON.stringify(publicState())}\n\n`);sseClients.add(res);req.on('close',()=>sseClients.delete(res));return;}
  if(req.method==='GET'&&url.pathname==='/api/export.csv'){res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="nhl27-draft-results.csv"'});return res.end(exportCSV());}
  if(req.method==='GET'&&url.pathname==='/api/export-rosters.csv'){res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="nhl27-team-rosters.csv"'});return res.end(exportRosters());}
  if(req.method==='POST'&&url.pathname==='/api/login'){
    const b=await body(req);const mode=String(b.mode||'').toLowerCase();
    if(mode==='commissioner'){if(String(b.password||'')!==String(state.commissionerPassword))return json(res,403,{error:'Incorrect commissioner password.'});const sid=createSession('commissioner');setSession(res,sid);return json(res,200,{ok:true,role:'commissioner'});}
    const teamId=Number(b.teamId);const t=state.teams.find(x=>x.id===teamId);if(!t||String(b.code||'')!==String(t.code||DEFAULT_TEAM_CODE))return json(res,403,{error:'Invalid team or team code.'});const sid=createSession('team',teamId);setSession(res,sid);return json(res,200,{ok:true,role:'team',teamId});
  }
  if(req.method==='POST'&&url.pathname==='/api/logout'){const s=session(req);if(s)sessions.delete(cookies(req).nhl27sid);res.setHeader('Set-Cookie','nhl27sid=; Max-Age=0; Path=/');return json(res,200,{ok:true});}
  if(req.method==='GET'&&url.pathname==='/api/me'){const s=session(req);return json(res,200,s?{loggedIn:true,...s}:{loggedIn:false});}
  if(req.method==='GET'&&url.pathname==='/contracts-tool'){
    if(!requireAuth(req,res,'commissioner'))return;
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    return res.end(`<!doctype html><html lang="fi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sopimusten päivitys</title><body style="font:16px system-ui;max-width:650px;margin:40px auto;padding:16px"><h1>Sopimuksen kestojen päivitys</h1><p>Päivittää vain nykyisten pelaajien sopimusten kestot. Joukkueet ja varaukset säilyvät.</p><input id="file" type="file" accept=".xlsx,.xls"><p><button id="preview">Tarkista osumat</button> <button id="apply" disabled>Päivitä sopimukset</button></p><pre id="out" style="white-space:pre-wrap"></pre><script>
let data=null;const out=document.getElementById('out');const apply=document.getElementById('apply');
document.getElementById('file').onchange=()=>{data=null;apply.disabled=true;out.textContent='';};
async function request(preview){const f=document.getElementById('file').files[0];if(!f)throw Error('Valitse Excel-tiedosto.');if(!data){const bytes=new Uint8Array(await f.arrayBuffer());let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));data=btoa(str);}const r=await fetch('/api/contracts/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data,preview})});const x=await r.json();if(!r.ok)throw Error(x.error||'Päivitys epäonnistui');return x;}
document.getElementById('preview').onclick=async()=>{try{const x=await request(true);out.textContent='Excelissä: '+x.excelPlayers+'\nNykyisiä pelaajia: '+x.currentPlayers+'\nOsumia: '+x.matched+'\nIlman osumaa: '+x.missing;apply.disabled=false;}catch(e){out.textContent=e.message;apply.disabled=true;}};
apply.onclick=async()=>{if(!confirm('Päivitetäänkö sopimusten kestot? Varmuuskopio tehdään ensin.'))return;try{const x=await request(false);out.textContent='Valmis! Päivitetty '+x.updated+' pelaajaa. Päivitä draft-sivu.';apply.disabled=true;}catch(e){out.textContent=e.message;}};
</script></body></html>`);
  }
  // Update only contract lengths from uploaded Excel, preserving teams, picks and player IDs.
  if(req.method==='POST'&&url.pathname==='/api/contracts/update'){
    if(!requireAuth(req,res,'commissioner'))return;
    try{
      const b=await body(req);
      const wb=XLSX.read(Buffer.from(b.data,'base64'),{type:'buffer'});
      const sheet=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(sheet,{defval:''});
      const key=(name,pos)=>String(name).trim().toLocaleLowerCase('fi')+'|'+String(pos).trim().toUpperCase();
      const lookup=new Map();
      for(const row of rows){
        const name=row.Nimi??row.Name??row.name;
        const pos=row.Pelipaikka??row.Position??row.position;
        const raw=row['Sopimuksen kesto']??row['Sopimuksen Kesto'];
        if(!name||!pos||raw===''||raw===null||raw===undefined)continue;
        const years=Number(raw);
        if(!Number.isInteger(years)||years<0||years>30)throw new Error('Virheellinen sopimuksen kesto: '+name);
        const k=key(name,pos);
        if(lookup.has(k))throw new Error('Excelissä on sama nimi ja pelipaikka kahdesti: '+name);
        lookup.set(k,years);
      }
      if(!lookup.size)throw new Error('Sopimuksen kesto -saraketta ei löytynyt tai se on tyhjä.');
      const matched=state.players.filter(p=>lookup.has(key(p.name,p.position))).length;
      if(!matched)throw new Error('Yhtään nykyistä pelaajaa ei löytynyt Excelistä.');
      const missing=state.players.length-matched;
      if(b.preview===true)return json(res,200,{ok:true,preview:true,matched,missing,excelPlayers:lookup.size,currentPlayers:state.players.length});
      backupSnapshot('before-contract-update');
      state.players=state.players.map(p=>lookup.has(key(p.name,p.position))?{...p,contractDuration:lookup.get(key(p.name,p.position))}:p);
      const yearsById=new Map(state.players.map(p=>[p.id,Number(p.contractDuration??p.contractYears??0)||0]));
      state.picks=state.picks.map(p=>yearsById.has(p.playerId)?{...p,contractDuration:yearsById.get(p.playerId)}:p);
      save();broadcast();
      return json(res,200,{ok:true,updated:matched,missing,excelPlayers:lookup.size,currentPlayers:state.players.length});
    }catch(e){return json(res,400,{error:e.message});}
  }
  if(req.method==='POST'&&url.pathname==='/api/import'){
    if(!requireAuth(req,res,'commissioner'))return;try{const b=await body(req);const wb=XLSX.read(Buffer.from(b.data,'base64'),{type:'buffer'});const sheet=wb.Sheets[wb.SheetNames[0]];return json(res,200,{ok:true,count:importRows(XLSX.utils.sheet_to_json(sheet,{defval:''}))})}catch(e){return json(res,400,{error:e.message})}
  }
  if(req.method==='POST'&&url.pathname==='/api/settings'){
    if(!requireAuth(req,res,'commissioner'))return;try{const b=await body(req);if(b.draftName!==undefined)state.draftName=String(b.draftName);if(b.salaryCapCeiling!==undefined){const cap=Number(b.salaryCapCeiling);if(!Number.isSafeInteger(cap)||cap<0)throw new Error('Virheellinen palkkakatto.');if(state.picks.some(p=>teamPayroll(p.teamId)>cap))throw new Error('Nykyinen joukkue ylittää uuden palkkakaton.');state.salaryCapCeiling=cap;}if(b.timerSeconds!==undefined)state.timerSeconds=Math.max(5,Number(b.timerSeconds));if(b.autopickEnabled!==undefined)state.autopickEnabled=!!b.autopickEnabled;if(b.autopickMode!==undefined)state.autopickMode=b.autopickMode;if(Array.isArray(b.autopickPositions))state.autopickPositions=b.autopickPositions;if(b.commissionerPassword)state.commissionerPassword=String(b.commissionerPassword);if(Array.isArray(b.teams)){b.teams.slice(0,32).forEach((t,i)=>{if(t.name!==undefined)state.teams[i].name=String(t.name);if(t.participant!==undefined)state.teams[i].participant=String(t.participant);if(t.code!==undefined&&String(t.code).trim())state.teams[i].code=String(t.code);});}save();broadcast();return json(res,200,{ok:true})}catch(e){return json(res,400,{error:e.message})}
  }
  if(req.method==='POST'&&url.pathname==='/api/draft/start'){
    if(!requireAuth(req,res,'commissioner'))return;if(!state.players.length)return json(res,400,{error:'Import players first.'});if(state.mode==='practice')resetToReal();if(!Number.isInteger(state.teamCount)||state.teamCount<2||state.teamCount>32||state.teams.length<state.teamCount)return json(res,400,{error:'Tarkista joukkuemäärä ja joukkueiden tiedot.'});state.status='live';state.mode='real';state.round=1;state.pickInRound=1;state.currentTeamId=1;state.picks=[];state.turnStartedAt=Date.now();state.pausedRemaining=null;save();broadcast();discord('🚀 Draft alkaa!');discord(`⏰ Varausvuoro alkaa: ${currentTeam()?.name||'Joukkue 1'}`,state.currentTeamId);return json(res,200,{ok:true});
  }
  if(req.method==='POST'&&url.pathname==='/api/draft/pick'){
    const s=requireAuth(req,res,'team');if(!s)return;try{if(state.status!=='live')throw new Error('Draft is not live.');if(s.role==='team'&&s.teamId!==state.currentTeamId)throw new Error('It is not your team\'s turn.');const b=await body(req);const p=state.players.find(x=>x.id===String(b.playerId));if(!p)throw new Error('Player not found.');recordPick(p,false);save();broadcast();announcePick();return json(res,200,{ok:true})}catch(e){return json(res,400,{error:e.message})}
  }
  if(req.method==='POST'&&url.pathname==='/api/draft/pause'){
    if(!requireAuth(req,res,'commissioner'))return;if(state.status==='live'){state.pausedRemaining=state.turnStartedAt?Math.max(0,state.timerSeconds-Math.floor((Date.now()-state.turnStartedAt)/1000)):state.timerSeconds;state.status='paused';state.turnStartedAt=null;}else if(state.status==='paused'){state.status='live';state.turnStartedAt=Date.now()-(state.timerSeconds-state.pausedRemaining)*1000;state.pausedRemaining=null;}save();broadcast();if(state.mode==='real')discord(state.status==='paused'?'⏸️ Draft keskeytetty.':'▶️ Draft jatkuu.');return json(res,200,{ok:true});
  }
  if(req.method==='POST'&&url.pathname==='/api/draft/reset'){if(!requireAuth(req,res,'commissioner'))return;state.status='setup';state.mode='real';state.round=1;state.pickInRound=1;state.currentTeamId=1;state.picks=[];state.turnStartedAt=null;state.pausedRemaining=null;save();broadcast();return json(res,200,{ok:true});}
  if(req.method==='POST'&&url.pathname==='/api/draft/undo'){
    if(!requireAuth(req,res,'commissioner'))return;if(!state.picks.length)return json(res,400,{error:'Nothing to undo.'});state.picks.pop();const last=state.picks[state.picks.length-1];if(!last){state.round=1;state.pickInRound=1;state.currentTeamId=1;}else{state.round=last.round;state.pickInRound=last.pickInRound;state.currentTeamId=last.teamId;advance();}state.status='live';state.turnStartedAt=Date.now();state.pausedRemaining=null;save();broadcast();return json(res,200,{ok:true});
  }
  if(req.method==='POST'&&url.pathname==='/api/draft/force-autopick'){if(!requireAuth(req,res,'commissioner'))return;if(state.status!=='live')return json(res,400,{error:'Draft is not live.'});const p=chooseAutopick();if(!p)return json(res,400,{error:'Ei palkkakattoon mahtuvia vapaita pelaajia.'});recordPick(p,true);save();broadcast();announcePick();return json(res,200,{ok:true});}
  if(req.method==='POST'&&url.pathname==='/api/practice/start'){
    if(!requireAuth(req,res,'commissioner'))return;const b=await body(req);const teams=Math.max(2,Math.min(32,Number(b.teams||4)));const rounds=Math.max(1,Math.min(32,Number(b.rounds||3)));if(state.mode!=='practice'){state.realDraftBackup={teams:JSON.parse(JSON.stringify(state.teams)),teamCount:state.teamCount,rounds:state.rounds,timerSeconds:state.timerSeconds,picks:JSON.parse(JSON.stringify(state.picks))};}state.mode='practice';state.rounds=rounds;state.teamCount=teams;state.teams=state.realDraftBackup.teams.slice(0,teams).map(t=>({...t}));state.timerSeconds=Math.max(5,Number(b.timerSeconds||30));state.status='live';state.round=1;state.pickInRound=1;state.currentTeamId=1;state.picks=[];state.turnStartedAt=Date.now();state.pausedRemaining=null;save();broadcast();return json(res,200,{ok:true});
  }
  if(req.method==='POST'&&url.pathname==='/api/mode/real'){if(!requireAuth(req,res,'commissioner'))return;resetToReal();return json(res,200,{ok:true});}
  let file=url.pathname==='/'?'index.html':url.pathname.slice(1);const filePath=path.normalize(path.join(PUBLIC_DIR,file));if(!filePath.startsWith(PUBLIC_DIR))return json(res,404,{error:'Not found'});if(fs.existsSync(filePath)&&fs.statSync(filePath).isFile()){const ext=path.extname(filePath);const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});return fs.createReadStream(filePath).pipe(res);}return json(res,404,{error:'Not found'});
}
http.createServer((req,res)=>route(req,res).catch(e=>json(res,500,{error:e.message}))).listen(PORT,HOST,()=>console.log(`NHL 27 Draft V1 running at http://localhost:${PORT}`));
