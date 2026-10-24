// Bedienung des Simulators: liest die Eingaben, ruft die Rechenlogik aus rechner.js auf und zeichnet Ergebnisse.

let lifetime=50, currentView='rendite', mieteMode='staffel', wertMode='rate', appMode='single';
let ergebnis=null,baseline=null;
let investitionen=[], staffeln=[{ab:3,mietqm:12.6},{ab:6,mietqm:13.2},{ab:9,mietqm:13.8}];
// Beispiel-Maßnahmen; eigene Werte über die Eingaben oder „Szenarien“ → „Aus Datei laden“
let massnahmen=[
  {id:'m1',bez:'Malerarbeiten',brutto:6000,ust:19,leistung:'2026-02-02',zahlung:'2026-02-20',kat:'erhalt',verteil:1,nd:10},
  {id:'m2',bez:'Bodenbeläge',brutto:9000,ust:19,leistung:'2026-02-09',zahlung:'2026-02-27',kat:'erhalt',verteil:1,nd:10},
  {id:'m3',bez:'Einbauküche',brutto:8000,ust:19,leistung:'2026-03-02',zahlung:'2026-03-02',kat:'wg',verteil:1,nd:10},
  {id:'m4',bez:'Puffer (noch offen)',brutto:0,ust:19,leistung:'2026-03-15',zahlung:'2026-03-31',kat:'erhalt',verteil:1,nd:10}
];

// Zustand = alle Eingaben als reines Objekt; paramsAus() macht daraus die Parameter für rechner.js
function zustandErfassen(){
  const felder={};
  document.querySelectorAll('.sidebar input[id],.sidebar select[id]').forEach(el=>{if(!el.readOnly&&!el.id.startsWith('ms-'))felder[el.id]=el.value;});
  return {felder,lifetime,mieteMode,wertMode,staffeln,investitionen,massnahmen};
}
function zustandAnwenden(z){
  Object.entries(z.felder||{}).forEach(([id,v])=>{const el=document.getElementById(id);if(el&&!el.readOnly)el.value=v;});
  // Kopien, damit spätere Änderungen das gespeicherte Szenario nicht mitverändern
  const kopie=x=>JSON.parse(JSON.stringify(x));
  if(Array.isArray(z.staffeln))staffeln=kopie(z.staffeln);
  if(Array.isArray(z.investitionen))investitionen=kopie(z.investitionen);
  if(Array.isArray(z.massnahmen))massnahmen=kopie(z.massnahmen);
  if(z.lifetime)lifetime=z.lifetime;if(z.mieteMode)mieteMode=z.mieteMode;if(z.wertMode)wertMode=z.wertMode;
  SL.forEach(([id,vid,sfx])=>{const el=document.getElementById(id);if(el)document.getElementById(vid).textContent=sfx==='%'?fmtP(parseFloat(el.value)):fmtE(parseFloat(el.value));});
  document.getElementById('geb_display').value=Math.round(100-gv('grundanteil'));
  setWertMode(wertMode);renderInvestitionen();renderMassnahmen();renderStaffeln();setMieteMode(mieteMode);setLifetime(lifetime);
}

// Eingaben auf diesem Gerät speichern; ohne Browser-Speicher läuft alles wie bisher
const SPEICHER='immo-sim-v1';let speichern=false;
function zustandSichern(){
  if(!speichern)return;
  try{localStorage.setItem(SPEICHER,JSON.stringify({...zustandErfassen(),szenario:aktSzenario}));}catch(e){}
}
function zustandLaden(){
  let z=null;try{z=JSON.parse(localStorage.getItem(SPEICHER));}catch(e){}
  if(!z||!z.felder)return false;
  aktSzenario=z.szenario||null;
  zustandAnwenden(z);
  return true;
}
function zuruecksetzen(){try{localStorage.removeItem(SPEICHER);}catch(e){}location.reload();}

function setAppMode(m){
  appMode=m;
  document.getElementById('hdr-single').classList.toggle('active',m==='single');
  document.getElementById('hdr-compare').classList.toggle('active',m==='compare');
  document.getElementById('compare-inputs').classList.toggle('show',m==='compare');
  if(m==='compare'&&zugangscode()&&!szenarien)ladeSzenarien();
  update();
}
// Gespeicherte Szenarien: in dieser Version nur im Browser (ONLINE_SPEICHER=false).
// Mit true und einem Server-Endpunkt /api/szenarien (Zugangscode im Header x-zugang) liegen sie online.
const ONLINE_SPEICHER=false;
const CODE='immo-sim-code',VERGLEICH='immo-sim-vergleich',LOKAL='immo-sim-szenarien';
let szenarien=null,aktSzenario=null,szenStatus={txt:'',fehler:false},vergleichIds=null;
// Szenarien als Datei sichern und laden (funktioniert ohne Online-Speicher)
function alsDateiSpeichern(){
  const name=((document.getElementById('szen-name')||{}).value||(aktSzenario&&aktSzenario.name)||'').trim()||'Szenario '+new Date().toLocaleDateString('de-DE');
  const datei={format:'immobilien-simulator-szenario',version:1,name,gespeichert:new Date().toISOString().slice(0,10),zustand:zustandErfassen()};
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(datei,null,2)],{type:'application/json'}));
  a.download=name.replace(/[^\wäöüÄÖÜß .-]/g,'').trim()+'.json';
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},0);
  setStatus(`„${name}“ als Datei gespeichert.`);
}
function ausDateiLaden(input){
  const f=input.files&&input.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const d=JSON.parse(r.result),z=d.zustand||d;
      if(!z||!z.felder)throw new Error('kein Szenario');
      aktSzenario=d.name?{id:null,name:d.name}:null;
      zustandAnwenden(z);zustandSichern();renderSzenPanel();updateKopf();
      setStatus(`„${d.name||f.name}“ aus Datei geladen.`);
    }catch(e){setStatus('Die Datei ist kein gültiges Szenario.',true);}
    input.value='';
  };
  r.readAsText(f);
}
function zugangscode(){if(!ONLINE_SPEICHER)return 'lokal';try{return localStorage.getItem(CODE)||'';}catch(e){return '';}}
// Szenarien im Browser, mit denselben Aktionen wie der Server-Endpunkt
function lokalApi(methode,body){
  let daten;try{daten=JSON.parse(localStorage.getItem(LOKAL))||{szenarien:[]};}catch(e){daten={szenarien:[]};}
  if(methode==='GET')return daten;
  if(body.aktion==='speichern'){
    const s=body.szenario,name=String(s.name||'').trim().slice(0,80);
    if(!name)throw new Error('Bitte einen Namen angeben.');
    const id=s.id||'s'+Date.now().toString(36);
    const eintrag={id,name,gespeichert:new Date().toISOString(),zustand:JSON.parse(JSON.stringify(s.zustand))};
    const i=daten.szenarien.findIndex(x=>x.id===id);
    if(i>=0)daten.szenarien[i]=eintrag;else daten.szenarien.push(eintrag);
    lokalSichern(daten);return{...daten,id};
  }
  if(body.aktion==='loeschen'){daten.szenarien=daten.szenarien.filter(x=>x.id!==body.id);lokalSichern(daten);return daten;}
  throw new Error('Unbekannte Aktion.');
}
function lokalSichern(daten){try{localStorage.setItem(LOKAL,JSON.stringify(daten));}catch(e){throw new Error('Dieser Browser erlaubt kein Speichern. Nutze „Als Datei speichern“.');}}
async function api(methode,body){
  if(!ONLINE_SPEICHER)return lokalApi(methode,body);
  const r=await fetch('/api/szenarien',{method:methode,headers:{'x-zugang':zugangscode(),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(!(r.headers.get('content-type')||'').includes('json'))throw new Error('Speichern funktioniert nur in der Online-Version.');
  const d=await r.json();
  if(!r.ok)throw new Error(d.fehler||'Speichern hat nicht geklappt.');
  return d;
}
function setStatus(txt,fehler=false){szenStatus={txt,fehler};const el=document.querySelector('.szen-status');if(el){el.textContent=txt;el.className='szen-status'+(fehler?' fehler':'');}}
function updateKopf(){document.getElementById('hdr-sub').textContent=aktSzenario?'Szenario: '+aktSzenario.name:'Vereinfachtes Steuermodell Deutschland';}
async function ladeSzenarien(){
  if(!zugangscode())return;
  try{szenarien=(await api('GET')).szenarien;}catch(e){setStatus(e.message,true);}
  renderSzenPanel();
  if(appMode==='compare')update();
}
async function verbinden(){
  const c=(document.getElementById('szen-code').value||'').trim();
  if(c.length<8){setStatus('Der Zugangscode braucht mindestens 8 Zeichen.',true);return;}
  try{localStorage.setItem(CODE,c);}catch(e){setStatus('Dieser Browser erlaubt kein Speichern des Codes.',true);return;}
  setStatus('Verbinde …');
  szenarien=null;await ladeSzenarien();
  if(szenarien)setStatus(szenarien.length?`Verbunden, ${szenarien.length} Szenario${szenarien.length>1?'s':''} gefunden.`:'Verbunden. Noch keine Szenarien gespeichert.');
}
function trennen(){
  try{localStorage.removeItem(CODE);}catch(e){}
  szenarien=null;aktSzenario=null;setStatus('Zugangscode auf diesem Gerät entfernt.');
  zustandSichern();renderSzenPanel();updateKopf();if(appMode==='compare')update();
}
async function szenarioSpeichern(alsNeu){
  const name=(document.getElementById('szen-name').value||'').trim();
  if(!name){setStatus('Bitte einen Namen eingeben.',true);return;}
  const id=!alsNeu&&aktSzenario?aktSzenario.id:undefined;
  setStatus('Speichere …');
  try{
    const d=await api('POST',{aktion:'speichern',szenario:{id,name,zustand:zustandErfassen()}});
    szenarien=d.szenarien;aktSzenario={id:d.id,name};zustandSichern();
    setStatus(`„${name}“ gespeichert.`);
  }catch(e){setStatus(e.message,true);return;}
  renderSzenPanel();updateKopf();if(appMode==='compare')update();
}
function szenarioLaden(id){
  const s=(szenarien||[]).find(x=>x.id===id);if(!s)return;
  aktSzenario={id:s.id,name:s.name};
  zustandAnwenden(s.zustand);zustandSichern();
  renderSzenPanel();updateKopf();setStatus(`„${s.name}“ geladen.`);
}
async function szenarioLoeschen(id){
  const s=(szenarien||[]).find(x=>x.id===id);if(!s||!confirm(`„${s.name}“ wirklich löschen?`))return;
  try{szenarien=(await api('POST',{aktion:'loeschen',id})).szenarien;}catch(e){setStatus(e.message,true);return;}
  if(aktSzenario&&aktSzenario.id===id){aktSzenario=null;zustandSichern();}
  renderSzenPanel();updateKopf();setStatus(`„${s.name}“ gelöscht.`);if(appMode==='compare')update();
}
function toggleSzen(an){
  const el=document.getElementById('szen-panel');
  if(an===undefined)an=el.hidden;
  el.hidden=!an;
  document.getElementById('hdr-szen').classList.toggle('an',an);
  if(an){renderSzenPanel();if(zugangscode()&&!szenarien)ladeSzenarien();}
}
function zeitText(iso){const d=new Date(iso);return isNaN(d)?'':d.toLocaleDateString('de-DE')+' '+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});}
function renderSzenPanel(){
  const el=document.getElementById('szen-panel');if(el.hidden)return;
  let h='<div class="szen-inner"><h2>Szenarien</h2>';
  if(!zugangscode()){
    h+=`<p>Speichere verschiedene Annahmen unter einem Namen, zum Beispiel „Bad bezahlt 2027“ oder „Wertzuwachs 1 %“, und lade sie später wieder. Die Szenarien liegen online. Mit demselben Zugangscode siehst du sie auf jedem Gerät. Der Code wirkt wie ein Passwort: Wer ihn kennt, sieht deine Szenarien. Wähle deshalb etwas, das nicht leicht zu erraten ist.</p>
      <div class="szen-row"><div class="field"><label>Zugangscode (mind. 8 Zeichen)</label><input type="password" id="szen-code" autocomplete="current-password" onkeydown="if(event.key==='Enter')verbinden()"></div><button type="button" class="szen-btn primaer" onclick="verbinden()">Verbinden</button></div>`;
  }else{
    h+=`<div class="szen-row"><div class="field"><label>Name für den aktuellen Stand</label><input type="text" id="szen-name" value="${esc(aktSzenario?aktSzenario.name:'')}" placeholder="z. B. Bad bezahlt 2027"></div><button type="button" class="szen-btn primaer" onclick="szenarioSpeichern(false)">${aktSzenario?'Aktualisieren':'Speichern'}</button>${aktSzenario?'<button type="button" class="szen-btn" onclick="szenarioSpeichern(true)">Als neues speichern</button>':''}</div>`;
    if(!szenarien)h+=szenStatus.fehler?'':'<p>Lade Szenarien …</p>';
    else if(!szenarien.length)h+='<p>Noch keine Szenarien gespeichert.</p>';
    else h+='<ul class="szen-liste">'+[...szenarien].sort((a,b)=>b.gespeichert.localeCompare(a.gespeichert)).map(s=>{
      const k=kennzahlenGespeichert(s);
      return `<li class="${aktSzenario&&aktSzenario.id===s.id?'aktiv':''}"><div><div class="szen-name">${esc(s.name)}</div><div class="szen-meta">${zeitText(s.gespeichert)}${k?` · ${fmtSigned(k.cf)}/Mon. · IRR ${fmtP(k.irr,1)}`:''}</div></div>
        <div class="szen-aktionen"><button type="button" class="szen-btn" onclick="szenarioLaden('${s.id}')">Laden</button><button type="button" class="szen-btn gefahr" onclick="szenarioLoeschen('${s.id}')" aria-label="${esc(s.name)} löschen">Löschen</button></div></li>`;}).join('')+'</ul>';
    h+=ONLINE_SPEICHER?'<div class="szen-fuss">Mit Zugangscode verbunden · <button type="button" onclick="trennen()">Code auf diesem Gerät entfernen</button></div>':'<div class="szen-fuss">Szenarien werden nur in diesem Browser gespeichert. Für andere Geräte oder als Sicherung: „Als Datei speichern“.</div>';
  }
  h+=`<div class="szen-datei"><div class="szen-fuss">Als Datei sichern oder laden, z. B. als Kopie im eigenen Ordner:</div><div class="szen-row"><button type="button" class="szen-btn" onclick="alsDateiSpeichern()">Als Datei speichern</button><label class="szen-btn">Aus Datei laden<input type="file" accept=".json,application/json" hidden onchange="ausDateiLaden(this)"></label></div></div>`;
  h+=`<div class="szen-status${szenStatus.fehler?' fehler':''}">${esc(szenStatus.txt)}</div></div>`;
  el.innerHTML=h;
}

// Vergleich: aktueller Stand und ausgewählte gespeicherte Szenarien mit den wichtigsten Kennzahlen
function vergleichUmschalten(id,an){
  vergleichIds=an?[...new Set([...vergleichIds,id])]:vergleichIds.filter(x=>x!==id);
  try{localStorage.setItem(VERGLEICH,JSON.stringify(vergleichIds));}catch(e){}
  update();
}
function renderVergleich(aktuell){
  const box=document.getElementById('vergleich-auswahl'),tab=document.getElementById('vergleich-tabelle');
  const hinweis=t=>{box.innerHTML=`<div class="chip">${t}</div>`;tab.innerHTML='';};
  if(!zugangscode())return hinweis('Für den Vergleich zuerst über „Szenarien“ oben rechts einen Zugangscode eingeben und Szenarien speichern.');
  if(!szenarien)return hinweis(szenStatus.fehler?esc(szenStatus.txt):'Lade Szenarien …');
  if(!szenarien.length)return hinweis('Noch keine Szenarien gespeichert. Speichere den aktuellen Stand über „Szenarien“ oben rechts, ändere Werte und speichere ein zweites.');
  if(!vergleichIds){try{vergleichIds=JSON.parse(localStorage.getItem(VERGLEICH));}catch(e){}if(!Array.isArray(vergleichIds))vergleichIds=szenarien.slice(-3).map(s=>s.id);}
  box.innerHTML='<div class="vergleich-auswahl">'+szenarien.map(s=>`<label><input type="checkbox" ${vergleichIds.includes(s.id)?'checked':''} onchange="vergleichUmschalten('${s.id}',this.checked)">${esc(s.name)}</label>`).join('')+'</div>';
  const spalten=[{name:aktSzenario?`Aktuell (${aktSzenario.name})`:'Aktuell',k:aktuell},...szenarien.filter(s=>vergleichIds.includes(s.id)).map(s=>({name:s.name,k:kennzahlenGespeichert(s)})).filter(s=>s.k)];
  // Richtung: 1 = höher ist besser, -1 = niedriger ist besser, 0 = neutral
  const zeilen=[
    ['Monatlich übrig nach Steuer',k=>k.cf,fmtSigned,1],
    ['Gesamtrendite (IRR)',k=>k.irr,v=>fmtP(v,1),1],
    ['Dein Anteil nach 10 J.',k=>k.ek10,fmtE,1],
    ['Eigenkapital',k=>k.ek,fmtE,-1],
    ['Gesamtinvestition',k=>k.invest,fmtE,0],
    ['Steuer-Effekt 10 J.',k=>k.steuer10,fmtE,1],
    ['Werbungskosten Kaufjahr',k=>k.wkKaufjahr,fmtE,0],
    ['15-%-Grenze ausgeschöpft',k=>k.quote*100,v=>fmt(v,0)+' %',0],
    ['Miete bei Einzug / m²',k=>k.miete,v=>fmt(v,2)+' €',0]
  ];
  // Tabelle immer komplett neu aufbauen; ein vorheriger Hinweis hat sie geleert
  tab.innerHTML=`<thead><tr><th>Kennzahl</th>${spalten.map(s=>`<th>${esc(s.name)}</th>`).join('')}</tr></thead><tbody>`+zeilen.map(([l,wert,form,richtung])=>{
    const w=spalten.map(s=>wert(s.k));
    const best=richtung&&spalten.length>1?(richtung>0?Math.max(...w):Math.min(...w)):null;
    return `<tr><td>${l}</td>${w.map(v=>`<td class="${best!==null&&Math.abs(v-best)<0.5&&new Set(w.map(x=>Math.round(x))).size>1?'best':''}">${form(v)}</td>`).join('')}</tr>`;
  }).join('')+'</tbody>';
}

// Anleitung ein-/ausblenden; beim ersten Besuch öffnet sie sich von selbst
const HILFE='immo-sim-hilfe';
function toggleHilfe(an){
  const h=document.getElementById('hilfe');
  if(an===undefined)an=h.hidden;
  h.hidden=!an;
  document.getElementById('hdr-hilfe').classList.toggle('hilfe-an',an);
  if(an)h.scrollIntoView({behavior:'smooth',block:'start'});
  else try{localStorage.setItem(HILFE,'1');}catch(e){}
}
function toggleAcc(h){h.classList.toggle('open');h.nextElementSibling.classList.toggle('open');}
function setLifetime(v){
  lifetime=v;
  ['lt25','lt37','lt50'].forEach(id=>document.getElementById(id).classList.remove('active'));
  document.getElementById(v===25?'lt25':v===50?'lt50':'lt37').classList.add('active');
  update();
}
function setView(v,e){
  currentView=v;
  document.querySelectorAll('.tab-btn').forEach(t=>t.classList.remove('active'));
  e.target.classList.add('active');
  document.getElementById('rendite-panel').style.display=v==='rendite'?'block':'none';
  document.getElementById('san-panel').style.display=v==='san'?'block':'none';
  document.getElementById('tbl-wrap').style.display=v==='rendite'?'none':'block';
  update();
}
function setMieteMode(m){
  mieteMode=m;
  ['fix','index','staffel'].forEach(k=>{
    document.getElementById('mb-'+k).classList.toggle('active',k===m);
    document.getElementById('panel-'+k).classList.toggle('show',k===m);
  });
  update();
}
function setWertMode(m){
  wertMode=m;
  ['rate','qm'].forEach(k=>document.getElementById('wert-mb-'+k).classList.toggle('active',k===m));
  document.getElementById('wert-panel-qm').style.display=m==='qm'?'block':'none';
  update();
}
function addStaffel(){
  const last=staffeln[staffeln.length-1];
  staffeln.push({ab:last?last.ab+3:3,mietqm:last?+(last.mietqm+0.5).toFixed(1):13});
  renderStaffeln();
}
function removeStaffel(i){staffeln.splice(i,1);renderStaffeln();}
function updStaffel(i,f,v){staffeln[i][f]=+v;update();}
function renderStaffeln(){
  const c=document.getElementById('staffel-rows');c.innerHTML='';
  staffeln.forEach((s,i)=>{
    const d=document.createElement('div');d.className='staffel-item';
    d.innerHTML=`<div class="field" style="margin-bottom:0"><label>Nach Jahren</label><input type="number" min="1" max="30" value="${s.ab}" oninput="updStaffel(${i},'ab',this.value)"></div><div class="field" style="margin-bottom:0"><label>Miete / m² (€)</label><input type="number" min="1" max="100" value="${s.mietqm}" step="0.1" oninput="updStaffel(${i},'mietqm',this.value)"></div><button class="btn-del" onclick="removeStaffel(${i})">×</button>`;
    c.appendChild(d);
  });
  update();
}
function addInvestition(bez='',yr=2,bet=5000,nd=10){
  investitionen.push({id:'i'+Date.now(),bez,yr,bet,nd});renderInvestitionen();
}
function removeInvestition(id){investitionen=investitionen.filter(i=>i.id!==id);renderInvestitionen();}
function updInv(id,f,v){const i=investitionen.find(x=>x.id===id);if(i)i[f]=f==='bez'?v:+v;sumInv();update();}
function sumInv(){document.getElementById('sum-inv').textContent=fmtE(investitionen.reduce((s,i)=>s+i.bet,0));}
function renderInvestitionen(){
  const c=document.getElementById('inv-rows');c.innerHTML='';
  investitionen.forEach(inv=>{
    const d=document.createElement('div');d.className='inv-item';
    d.innerHTML=`<div class="inv-item-head"><div class="field" style="margin-bottom:0;flex:1"><label>Bezeichnung</label><input type="text" value="${esc(inv.bez)}" placeholder="z.B. Fensteraustausch" oninput="updInv('${inv.id}','bez',this.value)"></div><button class="btn-del" onclick="removeInvestition('${inv.id}')">×</button></div><div class="inv-grid"><div class="field" style="margin-bottom:0"><label>Ab Jahr</label><input type="number" min="1" max="20" value="${inv.yr}" oninput="updInv('${inv.id}','yr',this.value)"></div><div class="field" style="margin-bottom:0"><label>Betrag (€)</label><input type="number" min="0" value="${inv.bet}" step="100" oninput="updInv('${inv.id}','bet',this.value)"></div><div class="field" style="margin-bottom:0"><label>Nutzungsdauer (J.)</label><input type="number" min="1" max="50" value="${inv.nd}" oninput="updInv('${inv.id}','nd',this.value)"></div></div>`;
    c.appendChild(d);
  });
  sumInv();update();
}

// Sanierungsmaßnahmen: Karte je Maßnahme, das steuerliche Ergebnis schreibt update() in ms-res-…
function addMassnahme(){
  massnahmen.push({id:'m'+Date.now(),bez:'',brutto:0,ust:19,leistung:gs('kaufdatum')||'2026-01-15',zahlung:gs('kaufdatum')||'2026-01-15',kat:'erhalt',verteil:1,nd:10});
  renderMassnahmen();
}
function removeMs(id){massnahmen=massnahmen.filter(m=>m.id!==id);renderMassnahmen();}
function updMs(id,f,v){const m=massnahmen.find(x=>x.id===id);if(!m)return;m[f]=['bez','leistung','zahlung','kat'].includes(f)?v:+v;update();}
function stepMs(id,d){const m=massnahmen.find(x=>x.id===id);if(!m)return;m.brutto=Math.max(0,Math.round(((+m.brutto||0)+d)*100)/100);document.getElementById('ms-b-'+id).value=m.brutto;update();}
function renderMassnahmen(){
  const c=document.getElementById('ms-rows');c.innerHTML='';
  massnahmen.forEach(m=>{
    const d=document.createElement('div');d.className='inv-item';
    const opt=(wert,txt,akt)=>`<option value="${wert}"${String(akt)===String(wert)?' selected':''}>${txt}</option>`;
    d.innerHTML=`<div class="inv-item-head"><div class="field"><label>Maßnahme</label><input type="text" value="${esc(m.bez)}" placeholder="z.B. Malerarbeiten" oninput="updMs('${m.id}','bez',this.value)"></div><button class="btn-del" onclick="removeMs('${m.id}')" aria-label="Maßnahme löschen">×</button></div>
      <div class="field2 ms-betrag"><div class="field"><label>Brutto (€)</label><div class="num-ctrl"><button type="button" class="step" onclick="stepMs('${m.id}',-500)" aria-label="Verringern">−</button><input type="number" inputmode="decimal" id="ms-b-${m.id}" value="${m.brutto}" min="0" step="0.01" oninput="updMs('${m.id}','brutto',this.value)"><button type="button" class="step" onclick="stepMs('${m.id}',500)" aria-label="Erhöhen">+</button></div></div>
        <div class="field"><label>USt (%)</label><input type="number" inputmode="decimal" value="${m.ust}" min="0" max="19" step="1" oninput="updMs('${m.id}','ust',this.value)"></div></div>
      <div class="field2"><div class="field"><label>Ausgeführt am${info('Für die 15-%-Grenze zählt, wann die Arbeit ausgeführt wurde, nicht das Rechnungs- oder Zahlungsdatum.')}</label><input type="date" value="${m.leistung}" onchange="updMs('${m.id}','leistung',this.value)"></div>
        <div class="field"><label>Bezahlt am${info('Erhaltungsaufwand wird im Jahr der Zahlung abgezogen (§ 11 EStG).')}</label><input type="date" value="${m.zahlung}" onchange="updMs('${m.id}','zahlung',this.value)"></div></div>
      <div class="field"><label>Einordnung</label><select onchange="updMs('${m.id}','kat',this.value);renderMassnahmen()">${Object.entries(KATEGORIEN).map(([k,t])=>opt(k,t,m.kat)).join('')}</select></div>
      ${m.kat==='erhalt'?`<div class="field"><label>Abzug${info('Größerer Erhaltungsaufwand darf nach § 82b EStDV gleichmäßig auf 2 bis 5 Jahre verteilt werden. Lohnt sich vor allem, wenn ein einzelnes Jahr sonst einen sehr hohen Verlust hätte.')}</label><select onchange="updMs('${m.id}','verteil',this.value)">${opt(1,'Sofort im Zahlungsjahr',m.verteil)}${[2,3,4,5].map(n=>opt(n,'Verteilt auf '+n+' Jahre (§ 82b)',m.verteil)).join('')}</select></div>`:''}
      ${m.kat==='wg'?`<div class="field"><label>Nutzungsdauer (Jahre)</label><input type="number" inputmode="decimal" value="${m.nd}" min="1" max="50" oninput="updMs('${m.id}','nd',this.value)"></div>`:''}
      <div class="ms-res" id="ms-res-${m.id}">—</div>`;
    c.appendChild(d);
  });
  update();
}

// Ergebnistext je Maßnahme und 15-%-Ampel
function behandlungText(x,lifetime){
  const zeit=x.vor?'vor Übergang':'nach Übergang'+(x.imTopf?', zählt zur 15-%-Grenze':'');
  if(x.beh==='wk'){const j=Math.max(jahrAus(x.zahlung),jahrAus(gs('kaufdatum')));return{cls:'wk',txt:`${zeit} → Werbungskosten ${x.verteil>1?`${j}–${j+x.verteil-1}, je ${fmtE(x.brutto/x.verteil)}`:`${j}: ${fmtE(x.brutto)}`}`};}
  if(x.beh==='wg')return{cls:'wg',txt:`${zeit} → eigenes Wirtschaftsgut, AfA ${x.nd} J.: ${fmtE(x.brutto/x.nd)}/Jahr`};
  const art={ak:'Anschaffungskosten',hk:'Herstellungskosten',ank:'Anschaffungsnahe Herstellungskosten'}[x.beh];
  return{cls:'akt',txt:`${zeit} → ${art}, Gebäude-AfA +${fmtE(x.brutto/lifetime)}/Jahr`};
}
function ampelHtml(st){
  const q=st.quote,stufe=q>1?'rot':q>=0.8?'gelb':'gruen';
  const frist=st.fristEnde.split('-').reverse().join('.');
  const status={
    gruen:'Deutlich unter der Grenze: Erhaltungsaufwand nach dem Übergang bleibt sofort abziehbar.',
    gelb:`Nahe an der Grenze: weitere Arbeiten bis ${frist} können sie überschreiten.`,
    rot:'Grenze überschritten: Der gesamte Erhaltungsaufwand, der zur Grenze zählt, wird zu anschaffungsnahen Herstellungskosten (Gebäude-AfA).'
  }[stufe];
  return{stufe,html:`<div class="ampel-head">15-%-Grenze (anschaffungsnahe HK)${info('Erhaltungsaufwand, der in den ersten 3 Jahren nach dem Übergang ausgeführt wird, darf netto höchstens 15 % der Gebäude-Anschaffungskosten (Gebäudeanteil Kaufpreis + anteilige Kaufnebenkosten) betragen. Sonst wird er insgesamt aktiviert und abgeschrieben. Arbeiten vor dem Übergang und eigene Wirtschaftsgüter wie die Küche zählen nicht mit.')}</div>
    <div class="ampel-bar"><div style="width:${Math.min(100,q*100)}%"></div></div>
    <div class="ampel-txt">${fmtE(st.topf)} netto von ${fmtE(st.grenze15)} (${fmt(q*100,0)} %)${q<=1?` · noch ${fmtE(st.grenze15-st.topf)} Luft bis ${frist}`:''}<br><span class="ampel-st">${status}</span></div>`};
}

// Sliders
const SL=[['makler','v-makler','%'],['heizung','v-heizung','€'],['wasser','v-wasser','€'],['muell','v-muell','€'],['versich_uml','v-versich_uml','€'],['hausmeister','v-hausmeister','€'],['nk_sonst_uml','v-nk_sonst_uml','€'],['verwaltung','v-verwaltung','€'],['instand','v-instand','€'],['versich_nu','v-versich_nu','€'],['nk_sonst_nu','v-nk_sonst_nu','€'],['wertzuwachs','v-wertzuwachs','%']];
SL.forEach(([id,vid,sfx])=>{const el=document.getElementById(id);if(!el)return;document.getElementById(vid).textContent=sfx==='%'?fmtP(parseFloat(el.value)):fmtE(parseFloat(el.value));el.addEventListener('input',()=>{document.getElementById(vid).textContent=sfx==='%'?fmtP(parseFloat(el.value)):fmtE(parseFloat(el.value));update();});});
['kaufpreis','grundanteil','darlehen','zins','tilgung','mietqm','qm','notar_kauf','notar_gs','gutachten','sonst_plus','sonst_alle','gst_satz','gst_anteil','steuersatz','sonstige_einnahmen','kaufdatum','einzugdatum','index_rate','marktpreis_qm','vor_anschaffung'].forEach(id=>{const el=document.getElementById(id);if(el){el.addEventListener('change',update);el.addEventListener('input',update);}});
document.getElementById('grundanteil').addEventListener('input',()=>{document.getElementById('geb_display').value=Math.round(100-parseFloat(document.getElementById('grundanteil').value)||30);});

function fmt(v,d=0){if(isNaN(v)||!isFinite(v))return'—';return new Intl.NumberFormat('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}).format(v);}
function fmtE(v,d=0){return fmt(v,d)+' €'}
function fmtP(v,d=2){return fmt(v,d)+' %'}
function fmtSigned(v){return (v>0?'+':'')+fmtE(v);}
function fmtD(s){return s?s.split('-').reverse().join('.'):'—';}
function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
// Veränderung gegenüber den Standardwerten; beim Eigenkapital ist mehr schlechter
function deltaHtml(d,mehrIstSchlecht){if(Math.abs(d)<1)return'';const gut=mehrIstSchlecht?d<0:d>0;return `<span class="delta ${gut?'pos':'neg'}">${d>0?'+':'−'}${fmt(Math.abs(d))} €</span>`;}
// ⓘ-Erklärung: Antippen zeigt den Text, Tippen daneben schließt ihn
function info(t){return `<button type="button" class="info" data-tip="${t}" aria-label="Erklärung">i</button>`;}
function gv(id){return parseFloat(document.getElementById(id)?.value)||0;}
function gs(id){return document.getElementById(id)?.value||'';}

function renderRenditeCards(r,containerId,color){
  const cards=[
    {l:'Brutto-Mietrendite',v:fmtP(r.bruttoR,2),d:'Jahreskaltmiete / Kaufpreis',i:'Schneller Vergleichswert ohne Kosten und Finanzierung.'},
    {l:'Netto-Mietrendite',v:fmtP(r.nettoR,2),d:'(Miete − nicht-uml. NK) / Gesamtinvestition',i:'Miete abzüglich der Kosten, die du selbst trägst, im Verhältnis zu allem, was die Wohnung insgesamt gekostet hat.'},
    {l:'Mietmultiplikator',v:fmt(r.mult,1)+'x',d:'Kaufpreis / Jahreskaltmiete · Ziel: unter 25x',i:'Wie viele Jahreskaltmieten der Kaufpreis entspricht. Je niedriger, desto günstiger gekauft.'},
    {l:'Überschuss auf EK p.a.',v:fmtP(r.coc,2),d:'Ø Überschuss nach Steuer / Eigenkapital',i:'Was jährlich nach Steuer übrig bleibt, im Verhältnis zu deinem eingesetzten Eigenkapital. Ohne Wertsteigerung.'},
    {l:'Vermögenszuwachs auf EK p.a.',v:fmtP(r.ekR10,2),d:'Wert − Restschuld + Überschüsse, auf EK',i:'Wie stark dein Eigenkapital pro Jahr wächst, wenn man Überschüsse, Tilgung und Wertsteigerung zusammennimmt.'},
    {l:'Gesamtrendite (IRR)',v:fmtP(r.irr,2),d:'Jährliche Verzinsung deines Eigenkapitals',i:'Interner Zinsfuß: die jährliche Verzinsung deines Eigenkapitals über alle Zahlungen, einschließlich Wohnungswert am Ende. Vergleichbar mit einem Sparzins.'},
  ];
  document.getElementById(containerId).innerHTML=cards.map(c=>`<div class="rendite-card"><div class="r-label">${c.l}${info(c.i)}</div><div class="r-val" style="color:var(--${color})">${c.v}</div><div class="r-desc">${c.d}</div></div>`).join('');
}

const UML_IDS=['heizung','wasser','muell','versich_uml','hausmeister','nk_sonst_uml'];
const NU_IDS=['verwaltung','instand','versich_nu','nk_sonst_nu'];
function paramsAus(z){
  const f=z.felder||{},roh=id=>f[id]??document.getElementById(id)?.defaultValue,num=id=>parseFloat(roh(id))||0,txt=id=>roh(id)||'';
  const kaufpreis=num('kaufpreis')||300000,baseMietqm=num('mietqm');
  const kaufStr=txt('kaufdatum')||'2026-01-15';
  let kaufDate=new Date(kaufStr),einzugDate=new Date(txt('einzugdatum')||'2026-04-01');
  if(isNaN(kaufDate.getTime()))kaufDate=new Date('2026-01-15');if(isNaN(einzugDate.getTime()))einzugDate=new Date('2026-04-01');
  return {kaufpreis,grundanteil:num('grundanteil')||30,lifetime:z.lifetime||25,
    maklerPct:num('makler')/100,notarKaufPct:num('notar_kauf')/100,notarGsPct:num('notar_gs')/100,gutachten:num('gutachten'),sonstPlus:num('sonst_plus'),sonstAlle:num('sonst_alle')||3,gstPct:num('gst_satz')*num('gst_anteil')/10000,
    nkUmlJahr:UML_IDS.reduce((s,id)=>s+num(id),0),nkNuJahr:NU_IDS.reduce((s,id)=>s+num(id),0),nkInstJahr:num('instand'),
    darlehen:num('darlehen'),zinsPct:num('zins')/100,tilgPct:num('tilgung')/100,
    qm:num('qm')||75,baseMietqm,steuersatz:num('steuersatz')/100,sonstEin:num('sonstige_einnahmen'),
    kaufDate,einzugDate,wertzuwachsPct:num('wertzuwachs')/100,marktpreisQm:num('marktpreis_qm'),
    wertMode:z.wertMode||'qm',miete:{modus:z.mieteMode||'staffel',indexRate:num('index_rate'),staffeln:z.staffeln||[],basis:baseMietqm},
    investitionen:z.investitionen||[],massnahmen:z.massnahmen||[],kaufStr,vorAnschaffung:txt('vor_anschaffung')||'position'};
}
// Wichtigste Kennzahlen eines gerechneten Szenarios (Ergebnis-Karte, Vergleich, Szenarienliste)
function kennzahlenAus(r,rd,p){
  const yd=r.yd,l=yd[yd.length-1];
  return {cf:yd.reduce((s,d)=>s+d.cfN,0)/r.monKum,ek:r.ek,ek10:l.ekAkt,irr:rd.irr,wert10:l.immo,invest:r.investSum,
    steuer10:yd.reduce((s,d)=>s+d.netSt,0),wkKaufjahr:r.steuer.wkKaufjahr,quote:r.steuer.quote,miete:getMietqm(0,p.baseMietqm,p.miete)};
}
const kennzahlCache={};
function kennzahlenGespeichert(s){
  const key=s.id+s.gespeichert;
  if(!kennzahlCache[key]){try{const p=paramsAus(s.zustand),r=computeScenario(p);kennzahlCache[key]=kennzahlenAus(r,computeRendite(r,p),p);}catch(e){kennzahlCache[key]=null;}}
  return kennzahlCache[key];
}

function update(){
  const pA=paramsAus(zustandErfassen());
  const {kaufpreis,gstPct,maklerPct,notarKaufPct,notarGsPct,nkUmlJahr:nkUml,nkNuJahr:nkNu}=pA;
  document.getElementById('gst-chip').textContent='Effektiv '+fmtP(gstPct*100)+' = '+fmtE(kaufpreis*gstPct);
  document.getElementById('notar-chip').textContent=`Kauf ${fmtE(kaufpreis*notarKaufPct)} (Anschaffungskosten) · Grundschuld ${fmtE(kaufpreis*notarGsPct)} (sofort abziehbar)`;
  const nebenkosten=kaufpreis*(maklerPct+notarKaufPct+notarGsPct+gstPct);

  document.getElementById('v-makler').textContent=fmtP(gv('makler'));
  document.getElementById('sum-kauf').textContent=fmtE(kaufpreis);
  document.getElementById('sum-neben').textContent=fmtE(nebenkosten);
  document.getElementById('sum-uml').textContent=fmtE(nkUml)+' / Jahr';
  document.getElementById('sum-nu').textContent=fmtE(nkNu)+' / Jahr';
  document.getElementById('sum-nk-total').textContent=fmtE(nkUml+nkNu)+' / Jahr';

  const {darlehen,zinsPct,tilgPct,qm,baseMietqm,steuersatz,sonstEin,kaufDate,einzugDate,miete}=pA;
  const annM=darlehen*(zinsPct+tilgPct)/12;
  document.getElementById('sum-rate').textContent=fmtE(annM);
  document.getElementById('sum-zins').textContent=fmtE(darlehen*zinsPct/12);
  document.getElementById('sum-tilg').textContent=fmtE(darlehen*tilgPct/12);

  const rA=computeScenario(pA);
  const yd=rA.yd,st=rA.steuer;

  document.getElementById('sum-san').textContent=fmtE(rA.sanTotal);
  document.getElementById('sum-ek').innerHTML=fmtE(rA.ek)+'<small>'+fmt(rA.investSum>0?rA.ek/rA.investSum*100:0,1)+' %</small>';
  document.getElementById('ek-chip').className=rA.ek<0?'chip warn':'chip';
  const amp=ampelHtml(st);
  ['ampel-side','ampel-main'].forEach(id=>{const el=document.getElementById(id);el.className='ampel '+amp.stufe;el.innerHTML=amp.html;});
  st.pos.forEach(x=>{const el=document.getElementById('ms-res-'+x.id);if(!el)return;const b=behandlungText(x,lifetime);el.className='ms-res '+b.cls;el.textContent=b.txt;});

  const wert10=yd[yd.length-1].immo,ek10=yd[yd.length-1].ekAkt;
  const totCF=yd.reduce((s,d)=>s+d.cfN,0),totZ=yd.reduce((s,d)=>s+d.zJ,0),totSt=yd.reduce((s,d)=>s+d.netSt,0);
  document.getElementById('sum-wert10').textContent=fmtE(wert10);

  const rendA=computeRendite(rA,pA);
  ergebnis={cf:totCF/rA.monKum,ek:rA.ek};
  const dCf=baseline?ergebnis.cf-baseline.cf:0,dEk=baseline?ergebnis.ek-baseline.ek:0;
  const hero=document.getElementById('hero');
  hero.className='hero'+(ergebnis.cf<0?' neg':'');
  hero.innerHTML=`<div class="hero-label">Monatlich übrig nach Steuer${info('Durchschnitt über die ersten 10 Jahre: Miete minus Rate, Kosten, die du selbst trägst, und Rücklage, plus Steuerersparnis. Die Tilgung ist schon abgezogen, obwohl sie dein Vermögen aufbaut.')}</div>
    <div class="hero-val">${fmtSigned(ergebnis.cf)}${deltaHtml(dCf)}</div>
    <div class="hero-txt">${ergebnis.cf>=0?'Die Miete trägt Rate und Kosten, im Schnitt bleibt monatlich etwas übrig.':'Die Miete deckt Rate und Kosten nicht ganz, im Schnitt legst du monatlich drauf.'}</div>`;
  document.getElementById('lb-cf').innerHTML=fmtSigned(ergebnis.cf)+deltaHtml(dCf);
  document.getElementById('lb-cf').style.color=ergebnis.cf<0?'var(--red)':'var(--green)';
  document.getElementById('lb-ek').innerHTML=fmtE(ergebnis.ek)+deltaHtml(dEk,true);

  document.getElementById('metric-grid').innerHTML=`
    <div class="metric-card"><div class="m-label">Monatsrate (fix)</div><div class="m-val">${fmtE(annM)}</div></div>
    <div class="metric-card"><div class="m-label">Eigenkapital${info('Was die Wohnung inkl. Nebenkosten und Sanierung insgesamt kostet, minus Darlehen. Diesen Betrag bringst du selbst auf.')}</div><div class="m-val blue">${fmtE(rA.ek)}</div></div>
    <div class="metric-card"><div class="m-label">Dein Anteil nach 10 J.${info('Wohnungswert nach 10 Jahren minus Restschuld bei der Bank.')}</div><div class="m-val ${ek10>=0?'pos':'neg'}">${fmtE(ek10)}</div></div>
    <div class="metric-card"><div class="m-label">Gesamtrendite (IRR)${info('Jährliche Verzinsung deines Eigenkapitals über alle Zahlungen, einschließlich Wohnungswert am Ende.')}</div><div class="m-val ${rendA.irr>=0?'pos':'neg'}">${fmtP(rendA.irr,1)}</div></div>
  `;
  document.getElementById('metric-more').innerHTML=`
    <div class="metric-card"><div class="m-label">Gesamtinvestition</div><div class="m-val">${fmtE(rA.investSum)}</div></div>
    <div class="metric-card"><div class="m-label">Miete bei Einzug / m²</div><div class="m-val pos">${fmt(getMietqm(0,baseMietqm,miete),2)} €</div></div>
    <div class="metric-card"><div class="m-label">Miete Ende J.10 / m²</div><div class="m-val pos">${fmt(yd[yd.length-1].mqY,2)} €</div></div>
    <div class="metric-card"><div class="m-label">Wohnungswert J.10</div><div class="m-val blue">${fmtE(wert10)}</div></div>
    <div class="metric-card"><div class="m-label">Zinsen 10 J. gesamt</div><div class="m-val neg">${fmtE(totZ)}</div></div>
    <div class="metric-card"><div class="m-label">Steuer-Effekt 10 J.</div><div class="m-val ${totSt>=0?'pos':'neg'}">${fmtE(totSt)}</div></div>
  `;

  renderRenditeCards(rendA,'rendite-a','blue');
  if(appMode==='compare')renderVergleich(kennzahlenAus(rA,rendA,pA));

  if(currentView==='san')renderSanPanel(rA,yd,steuersatz);

  const thead=document.querySelector('#main-table thead'),tbody=document.querySelector('#main-table tbody');
  if(currentView==='jahr'){
    thead.innerHTML=`<tr><th>Jahr</th><th>Miete/m²</th><th>Mieteinnahmen</th><th>− Zinsen</th><th>− Tilgung</th><th>− Nebenkosten (du)</th><th>− Jahresinv.</th><th>Sanierung (finanziert)</th><th>Überschuss vor St.</th><th>Steuereffekt</th><th>Überschuss nach St.</th></tr>`;
    const zeile=d=>`<tr><td>${d.year}</td><td class="pos">${fmt(d.mqY,2)} €</td><td class="pos">${fmtE(d.mietEin)}</td><td class="neg">${fmtE(d.zJ)}</td><td class="muted">${fmtE(d.tJ)}</td><td class="neg">${fmtE(d.nkNuY+d.nkLeerY)}</td><td class="${d.invK>0?'neg':'muted'}">${d.invK>0?fmtE(d.invK):'—'}</td><td class="muted">${d.sanKJ>0?fmtE(d.sanKJ):'—'}</td><td class="${d.cfV>=0?'pos':'neg'}">${fmtE(d.cfV)}</td><td class="${d.netSt>=0?'pos':'neg'}">${fmtE(d.netSt)}</td><td class="${d.cfN>=0?'pos':'neg'}">${fmtE(d.cfN)}</td></tr>`;
    tbody.innerHTML=yd.map(zeile).join('');
  } else if(currentView==='monat'){
    thead.innerHTML=`<tr><th>Monat</th><th>Miete/m²</th><th>Kaltmiete</th><th>Zinsen</th><th>Tilgung</th><th>Nebenkosten (du)/Mo</th><th>− Jahresinv.</th><th>Überschuss vor St.</th><th>Steuer-Effekt/Mo</th><th>Überschuss nach St.</th></tr>`;
    let rows='',rD=rA.darlehen;
    for(let m=0;m<36;m++){
      const d=new Date(kaufDate.getFullYear(),kaufDate.getMonth()+m,1);
      // Kalenderjahr-Index, passend zu den Jahreswerten in yd
      const yI=Math.min(d.getFullYear()-kaufDate.getFullYear(),9),yr=yd[yI];
      // Vergleich über Jahr/Monat, sonst verschiebt die Zeitzone den Einzugsmonat
      const isV=d.getFullYear()*12+d.getMonth()>=einzugDate.getFullYear()*12+einzugDate.getMonth();
      const mSince=d.getFullYear()*12+d.getMonth()-(einzugDate.getFullYear()*12+einzugDate.getMonth());
      const mq=getMietqm(Math.max(0,mSince),baseMietqm,miete),einM=isV?(qm*mq+sonstEinnahme(mSince,pA)):0;
      const zm=rD*zinsPct/12,tm=annM-zm;rD=Math.max(0,rD-tm);
      const nkNuMo=nkNu/12+(isV?0:nkUml/12);
      // Jahresinvestitionen im ersten Monat ihres Jahres (Sanierung ist über EK + Darlehen finanziert)
      const ersterMonat=m===0||d.getMonth()===0;
      const ausgabe=ersterMonat?yr.invK:0;
      const cfV=einM-annM-nkNuMo-ausgabe;
      const stM=yr.netSt/yr.monate,cfN=cfV+stM;
      rows+=`<tr><td>${d.toLocaleDateString('de-DE',{month:'short',year:'numeric'})}</td><td class="pos">${fmt(mq,2)} €</td><td class="${isV?'pos':'muted'}">${fmtE(einM)}</td><td class="neg">${fmtE(zm)}</td><td class="muted">${fmtE(tm)}</td><td class="neg">${fmtE(nkNuMo)}</td><td class="${ausgabe>0?'neg':'muted'}">${ausgabe>0?fmtE(ausgabe):'—'}</td><td class="${cfV>=0?'pos':'neg'}">${fmtE(cfV)}</td><td class="${stM>=0?'pos':'neg'}">${fmtE(stM)}</td><td class="${cfN>=0?'pos':'neg'}">${fmtE(cfN)}</td></tr>`;
    }
    tbody.innerHTML=rows;
  } else if(currentView==='inv'){
    thead.innerHTML=`<tr><th>Jahr</th><th>Investition(en)</th><th>Liquiditätsabfluss</th><th>AfA Gebäude</th><th>AfA Küche/WG</th><th>AfA Jahresinv.</th><th>AfA gesamt</th><th>Steuerl. AfA-Effekt</th></tr>`;
    tbody.innerHTML=yd.map(d=>{const n=d.invDJ.map(i=>(i.bez||'Inv.')+' ('+fmtE(i.bet)+', '+i.nd+'J.)').join('; ')||'—';const ag=d.afaAkt+d.afaWG+d.invAfaJ;return`<tr><td>${d.year}</td><td style="font-size:11px;white-space:normal;max-width:200px">${esc(n)}</td><td class="${d.invK>0?'neg':'muted'}">${d.invK>0?fmtE(d.invK):'—'}</td><td class="muted">${fmtE(d.afaAkt)}</td><td class="${d.afaWG>0?'pos':'muted'}">${d.afaWG>0?fmtE(d.afaWG):'—'}</td><td class="${d.invAfaJ>0?'pos':'muted'}">${d.invAfaJ>0?fmtE(d.invAfaJ):'—'}</td><td>${fmtE(ag)}</td><td class="pos">${fmtE(ag*steuersatz)}</td></tr>`;}).join('');
  } else if(currentView==='san'){
    thead.innerHTML=`<tr><th>Maßnahme</th><th>Brutto</th><th>Netto</th><th>Ausgeführt</th><th>Bezahlt</th><th>Einordnung</th><th>Steuerliche Wirkung</th></tr>`;
    const art={wk:'Erhaltungsaufwand',ank:'Anschaffungsnahe HK',ak:'Anschaffungskosten',hk:'Herstellungskosten',wg:'Eigenes Wirtschaftsgut'};
    tbody.innerHTML=st.pos.map(x=>{const b=behandlungText(x,lifetime);return`<tr><td style="white-space:normal;max-width:180px">${esc(x.bez)||'—'}</td><td>${fmtE(x.brutto)}</td><td class="muted">${fmtE(x.netto)}</td><td>${fmtD(x.leistung)}</td><td class="muted">${fmtD(x.zahlung)}</td><td class="${b.cls==='wk'?'pos':b.cls==='wg'?'purple':'blue'}">${art[x.beh]}</td><td style="white-space:normal;max-width:260px;font-size:11px">${esc(b.txt)}</td></tr>`;}).join('');
  } else if(currentView==='nk'){
    thead.innerHTML=`<tr><th>Jahr</th><th>Umlagefähig (Mieter)</th><th>Nicht-umlagefähig (du)</th><th>Gesamt NK</th><th>NK/m²/Mo</th><th>Umlage/m²/Mo</th><th>Dein Anteil/Mo</th></tr>`;
    tbody.innerHTML=yd.map(d=>`<tr><td>${d.year}</td><td class="pos">${fmtE(d.nkUmlY)}</td><td class="neg">${fmtE(d.nkNuY)}</td><td>${fmtE(d.nkUmlY+d.nkNuY)}</td><td class="muted">${fmt((d.nkUmlY+d.nkNuY)/qm/12,2)} €</td><td class="pos">${fmt(d.nkUmlY/qm/Math.max(d.mietmonate,1),2)} €</td><td class="neg">${fmtE(d.nkNuY/12)}</td></tr>`).join('');
  } else if(currentView==='steuer'){
    thead.innerHTML=`<tr><th>Jahr</th><th>Mieteinnahmen</th><th>AfA Gebäude</th><th>AfA Küche/WG</th><th>AfA Jahresinv.</th><th>Zinsen (WK)</th><th>Abziehb. NK</th><th>Erhaltungsaufwand</th><th>Grundschuld/Gutachten</th><th>Steuerl. Einkünfte</th><th>Steuerersparnis</th><th>Mehrsteuer</th></tr>`;
    tbody.innerHTML=yd.map(d=>`<tr><td>${d.year}</td><td class="pos">${fmtE(d.mietEin)}</td><td class="muted">${fmtE(d.wkA)}</td><td class="${d.afaWG>0?'pos':'muted'}">${d.afaWG>0?fmtE(d.afaWG):'—'}</td><td class="${d.wkAi>0?'pos':'muted'}">${d.wkAi>0?fmtE(d.wkAi):'—'}</td><td class="neg">${fmtE(d.wkZ)}</td><td class="neg">${fmtE(d.wkN)}</td><td class="${d.wkEr>0?'neg':'muted'}">${d.wkEr>0?fmtE(d.wkEr):'—'}</td><td class="${d.wkEin>0?'neg':'muted'}">${d.wkEin>0?fmtE(d.wkEin):'—'}</td><td class="${d.stE>=0?'neg':'pos'}">${fmtE(d.stE)}</td><td class="pos">${d.steuerErs>0?fmtE(d.steuerErs):'—'}</td><td class="neg">${d.mehrSt>0?fmtE(d.mehrSt):'—'}</td></tr>`).join('');
  } else if(currentView==='wert'){
    thead.innerHTML=`<tr><th>Jahr</th><th>Immobilienwert</th><th>Wertzuwachs</th><th>Restdarlehen</th><th>Eigenkapital (Immo)</th><th>EK-Quote</th><th>Kum. Überschuss</th><th>Gesamtvermögen</th></tr>`;
    let cumCF=0;tbody.innerHTML=yd.map((d,i)=>{const wz=d.immo-(i===0?rA.wertBasis:yd[i-1].immo);cumCF+=d.cfN;const ekQ=d.ekAkt/d.immo*100;return`<tr><td>${d.year}</td><td class="blue">${fmtE(d.immo)}</td><td class="pos">${fmtE(wz)}</td><td class="neg">${fmtE(d.restD)}</td><td class="${d.ekAkt>=0?'pos':'neg'}">${fmtE(d.ekAkt)}</td><td class="muted">${fmt(ekQ,1)} %</td><td class="${cumCF>=0?'pos':'neg'}">${fmtE(cumCF)}</td><td class="blue">${fmtE(d.ekAkt+cumCF)}</td></tr>`;}).join('');
  }

  drawCFChart(yd,null);
  drawWertChart(yd,kaufpreis,null);
  zustandSichern();
}

// Reiter „Sanierung steuerlich“: Summen nach Behandlung und Hinweise zu den unsicheren Punkten
function renderSanPanel(rA,yd,steuersatz){
  const st=rA.steuer,kY=yd[0].year;
  const karte=(l,v,cls='',i='')=>`<div class="metric-card"><div class="m-label">${l}${i?info(i):''}</div><div class="m-val ${cls}">${fmtE(v)}</div></div>`;
  document.getElementById('san-metrics').innerHTML=
    karte('Investitionen gesamt',st.gesamt)+
    karte('Werbungskosten '+kY,st.wkKaufjahr,'pos','Erhaltungsaufwand, der im Kaufjahr abgezogen wird (Zahlungsjahr, ohne den nach § 82b verteilten Teil späterer Jahre).')+
    karte('davon § 82b verteilt',st.verteilt,'','Gesamtbetrag der Maßnahmen, die auf 2 bis 5 Jahre verteilt werden.')+
    karte('Anschaffungskosten',st.ak,'blue','Kosten, um die nicht betriebsbereite Wohnung nutzbar zu machen. Erhöhen die Gebäude-AfA-Basis.')+
    karte('Herstellungskosten',st.hk,'blue','Erweiterung oder deutliche Standardhebung (mind. 3 von 4: Heizung, Sanitär, Elektro, Fenster). Erhöhen die Gebäude-AfA-Basis.')+
    karte('Anschaffungsnahe HK',st.ank,'blue','Erhaltungsaufwand in den ersten 3 Jahren, wenn die 15-%-Grenze überschritten ist.')+
    karte('Eigene Wirtschaftsgüter',st.wg,'purple','Z. B. Einbauküche: eigene AfA über ihre Nutzungsdauer, zählt nicht zur 15-%-Grenze.')+
    karte('AfA Gebäude / Jahr',st.afaGebJahr,'','Volle Jahres-AfA ab '+(kY+1)+' inkl. aktivierter Sanierungskosten.')+
    karte('AfA Küche/WG / Jahr',st.afaWGJahr)+
    karte('Grundschuld/Gutachten '+kY,rA.wkEinmalig,'pos','Grundschuldkosten (Notar und Grundbuch) und Gutachten wie die Restnutzungsdauer: sofort im Kaufjahr abziehbar.');
  const hinweise=[];
  if(yd[0].stE<-20000)hinweise.push(`<div class="chip warn">${kY} entsteht ein steuerlicher Verlust aus Vermietung von ${fmtE(-yd[0].stE)}. Der Rechner setzt dafür deinen vollen Steuersatz von ${fmtP(steuersatz*100,1)} an. Durch die Progression ist die tatsächliche Ersparnis meist kleiner. Dann kann es sich lohnen, große Posten nach § 82b auf 2 bis 5 Jahre zu verteilen. Das lässt sich pro Maßnahme einstellen.</div>`);
  hinweise.push(`<div class="chip">Unsicher ist vor allem die Einordnung der Arbeiten vor dem Übergang: Erhaltungsaufwand, wenn die Wohnung technisch funktionsfähig war, sonst Anschaffungskosten. Mit „Maßnahmen vor dem Übergang“ in der Sanierung kannst du beide Szenarien vergleichen.</div>`);
  hinweise.push(`<div class="chip">Keine Steuerberatung: Die Einordnung zeigt Szenarien. Betriebsbereitschaft, Standardhebung und den genauen Anschaffungstag bitte mit einer Steuerberatung klären.</div>`);
  document.getElementById('san-hinweise').innerHTML=hinweise.join('');
}

// === Canvas utils ===
// Bei wenig Platz pro Jahr (Handy) zweistellige Jahreszahl, damit sich die Achsenbeschriftung nicht überlappt
function jahrLbl(y,abstand){return abstand<42?"'"+String(y).slice(2):String(y);}
function setupCanvas(id,H){
  const cv=document.getElementById(id),ctx=cv.getContext('2d'),dpr=window.devicePixelRatio||1;
  const W=cv.parentElement.getBoundingClientRect().width||700;
  cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';ctx.scale(dpr,dpr);
  return{ctx,W,H};
}
function drawGrid(ctx,W,H,P,yMin,yMax,ticks=5){
  const cH=H-P.top-P.bottom,yR=yMax-yMin;
  ctx.font='10px "Courier New",monospace';ctx.textAlign='right';ctx.fillStyle='#6b6b66';
  for(let t=0;t<=ticks;t++){
    const v=yMin+yR*t/ticks,y=P.top+cH*(1-(v-yMin)/yR);
    ctx.strokeStyle='rgba(0,0,0,.07)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(P.left,y);ctx.lineTo(W-P.right,y);ctx.stroke();
    ctx.fillText(fmtE(Math.round(v/1000)*1000),P.left-6,y+3);
  }
  if(yMin<0&&yMax>0){const y0=P.top+cH*(1-(0-yMin)/yR);ctx.strokeStyle='rgba(0,0,0,.2)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(P.left,y0);ctx.lineTo(W-P.right,y0);ctx.stroke();}
}
function polyline(ctx,pts,color,lw=2.5,dash=[]){
  ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.lineJoin='round';ctx.setLineDash(dash);ctx.beginPath();pts.forEach((p,i)=>i===0?ctx.moveTo(p[0],p[1]):ctx.lineTo(p[0],p[1]));ctx.stroke();ctx.setLineDash([]);
}
function dots(ctx,pts,color){pts.forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],4,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();});}

function drawCFChart(ydA,ydB){
  const{ctx,W,H}=setupCanvas('cfChart',280);
  const P={top:20,right:20,bottom:40,left:90},cW=W-P.left-P.right,cH=H-P.top-P.bottom;
  ctx.clearRect(0,0,W,H);const n=ydA.length;
  const stacks=[{d:ydA.map(d=>Math.round(d.mietEin)),c:'rgba(26,122,85,.3)',b:'#1a7a55',s:1},{d:ydA.map(d=>Math.round(d.zJ)),c:'rgba(192,57,43,.3)',b:'#c0392b',s:-1},{d:ydA.map(d=>Math.round(d.nkNuY)),c:'rgba(179,106,0,.3)',b:'#b36a00',s:-1},{d:ydA.map(d=>Math.round(d.invK)),c:'rgba(91,69,199,.25)',b:'#5b45c7',s:-1},{d:ydA.map(d=>Math.round(d.tJ)),c:'rgba(0,0,0,.1)',b:'#aaa',s:-1}];
  const lA=ydA.map(d=>Math.round(d.cfN)),lB=ydB?ydB.map(d=>Math.round(d.cfN)):null;
  let yMin=0,yMax=0;
  for(let i=0;i<n;i++){let pos=0,neg=0;stacks.forEach(s=>{const v=s.d[i]*s.s;v>0?pos+=v:neg+=v;});yMax=Math.max(yMax,pos,lA[i]);yMin=Math.min(yMin,neg,lA[i]);if(lB){yMax=Math.max(yMax,lB[i]);yMin=Math.min(yMin,lB[i]);}}
  const yp=(yMax-yMin)*.1||1000;yMin-=yp;yMax+=yp;const yR=yMax-yMin;
  const yPx=v=>P.top+cH*(1-(v-yMin)/yR);
  const bGW=cW/n,bPad=bGW*.18,bW=bGW-bPad;
  const xC=i=>P.left+i*bGW+bPad/2+bW/2,xL=i=>P.left+i*bGW+bPad/2;
  drawGrid(ctx,W,H,P,yMin,yMax);
  for(let i=0;i<n;i++){let cp=0,cn=0;stacks.forEach(s=>{const v=s.d[i]*s.s;if(v===0)return;let y1,y2;if(v>0){y1=yPx(cp+v);y2=yPx(cp);cp+=v;}else{y1=yPx(cn+v);y2=yPx(cn);cn+=v;}const bH=Math.abs(y2-y1);if(bH<.5)return;ctx.fillStyle=s.c;ctx.fillRect(xL(i),Math.min(y1,y2),bW,bH);ctx.strokeStyle=s.b;ctx.lineWidth=1;ctx.strokeRect(xL(i),Math.min(y1,y2),bW,bH);});}
  polyline(ctx,lA.map((v,i)=>[xC(i),yPx(v)]),'#1a5fa8');dots(ctx,lA.map((v,i)=>[xC(i),yPx(v)]),'#1a5fa8');
  if(lB){polyline(ctx,lB.map((v,i)=>[xC(i),yPx(v)]),'#5b45c7',2.5,[6,3]);dots(ctx,lB.map((v,i)=>[xC(i),yPx(v)]),'#5b45c7');}
  ctx.fillStyle='#6b6b66';ctx.font='11px "Courier New",monospace';ctx.textAlign='center';ydA.forEach((d,i)=>ctx.fillText(jahrLbl(d.year,cW/n),xC(i),H-P.bottom+16));
  const leg=[['#1a7a55','Mieteinnahmen'],['#c0392b','Zinsen'],['#b36a00','Nicht-uml. NK'],['#5b45c7','Jahresinv.'],['#aaa','Tilgung'],['#1a5fa8','Überschuss n. St. (A)']];
  if(lB)leg.push(['#5b45c7','Überschuss n. St. (B)']);
  document.getElementById('cf-legend').innerHTML=leg.map(([c,l])=>`<div class="legend-item"><div class="legend-dot" style="background:${c}"></div>${l}</div>`).join('');
}

function drawWertChart(ydA,kaufpreis,ydB){
  const{ctx,W,H}=setupCanvas('wertChart',280);
  const P={top:20,right:20,bottom:40,left:90},cW=W-P.left-P.right,cH=H-P.top-P.bottom;
  ctx.clearRect(0,0,W,H);const n=ydA.length;
  let cumA=0;const sA=ydA.map(d=>{cumA+=d.cfN;return{year:d.year,immo:d.immo,rest:d.restD,ek:d.ekAkt,g:d.ekAkt+cumA};});
  let sB=null;if(ydB){let cumB=0;sB=ydB.map(d=>{cumB+=d.cfN;return{immo:d.immo,ek:d.ekAkt,g:d.ekAkt+cumB};});}
  const all=sA.flatMap(s=>[s.immo,s.rest,s.ek,s.g]);if(sB)sB.forEach(s=>all.push(s.immo,s.g));
  let yMin=Math.min(0,...all),yMax=Math.max(...all);const yp=(yMax-yMin)*.1||10000;yMin-=yp;yMax+=yp;const yR=yMax-yMin;
  const yPx=v=>P.top+cH*(1-(v-yMin)/yR),xPx=i=>P.left+(i/(n-1))*cW;
  drawGrid(ctx,W,H,P,yMin,yMax);
  if(yMin<0&&yMax>0){const y0=yPx(0);ctx.strokeStyle='rgba(0,0,0,.15)';ctx.lineWidth=1;ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(P.left,y0);ctx.lineTo(P.left+cW,y0);ctx.stroke();ctx.setLineDash([]);}
  ctx.beginPath();sA.forEach((s,i)=>{const x=xPx(i),y=yPx(s.immo);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});ctx.lineTo(xPx(n-1),yPx(Math.max(yMin,0)));ctx.lineTo(xPx(0),yPx(Math.max(yMin,0)));ctx.closePath();ctx.fillStyle='rgba(26,95,168,.06)';ctx.fill();
  polyline(ctx,sA.map((s,i)=>[xPx(i),yPx(s.immo)]),'#1a5fa8');
  polyline(ctx,sA.map((s,i)=>[xPx(i),yPx(s.ek)]),'#1a7a55');
  polyline(ctx,sA.map((s,i)=>[xPx(i),yPx(s.rest)]),'#c0392b',2,[5,3]);
  polyline(ctx,sA.map((s,i)=>[xPx(i),yPx(s.g)]),'#5b45c7');
  dots(ctx,sA.map((s,i)=>[xPx(i),yPx(s.immo)]),'#1a5fa8');dots(ctx,sA.map((s,i)=>[xPx(i),yPx(s.g)]),'#5b45c7');
  if(sB){polyline(ctx,sB.map((s,i)=>[xPx(i),yPx(s.immo)]),'#1a5fa8',2,[4,4]);polyline(ctx,sB.map((s,i)=>[xPx(i),yPx(s.g)]),'#9b45c7',2,[4,4]);}
  const ykp=yPx(kaufpreis);ctx.strokeStyle='rgba(0,0,0,.18)';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(P.left,ykp);ctx.lineTo(P.left+cW,ykp);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#9b9b94';ctx.font='10px "Courier New",monospace';ctx.textAlign='left';ctx.fillText('Kaufpreis',P.left+4,ykp-4);
  ctx.fillStyle='#6b6b66';ctx.textAlign='center';ctx.font='11px "Courier New",monospace';sA.forEach((s,i)=>ctx.fillText(jahrLbl(s.year,cW/(n-1)),xPx(i),H-P.bottom+16));
  document.getElementById('wert-legend').innerHTML=[['#1a5fa8','Immobilienwert (A)'],['#1a7a55','Eigenkapital (A)'],['#c0392b','Restdarlehen (A, gestrichelt)'],['#5b45c7','Gesamtvermögen (A)'],...(sB?[['#9b45c7','Gesamtvermögen (B, gestrichelt)']]:[])] .map(([c,l])=>`<div class="legend-item"><div class="legend-dot" style="background:${c}"></div>${l}</div>`).join('');
}

// Auf dem Handy Eingabebereiche eingeklappt starten, damit die Ergebnisse ohne langes Scrollen sichtbar sind
if(window.innerWidth<900)document.querySelectorAll('.acc-head.open').forEach(h=>toggleAcc(h));

document.addEventListener('click',e=>{
  const b=e.target.closest('.info');
  document.querySelectorAll('.tip').forEach(t=>t.remove());
  if(!b)return;
  e.preventDefault();e.stopPropagation();
  const t=document.createElement('div');t.className='tip';t.textContent=b.dataset.tip;document.body.appendChild(t);
  const r=b.getBoundingClientRect(),w=t.offsetWidth;
  t.style.left=Math.max(8,Math.min(r.left+scrollX-w/2+8,document.documentElement.clientWidth-w-8))+'px';
  t.style.top=(r.bottom+scrollY+6)+'px';
},true);

// Plus/Minus neben den Reglern für feine Schritte, v. a. auf dem Handy
document.querySelectorAll('.sl-row input[type=range]').forEach(el=>{
  const sfx=(SL.find(x=>x[0]===el.id)||[])[2];
  const d=sfx==='%'?0.1:(+el.max>=20000?500:+el.max>=3000?50:25);
  const wrap=document.createElement('div');wrap.className='sl-ctrl';
  el.parentNode.insertBefore(wrap,el);
  const knopf=(txt,f)=>{const b=document.createElement('button');b.type='button';b.className='step';b.textContent=txt;b.setAttribute('aria-label',f>0?'Erhöhen':'Verringern');
    b.onclick=()=>{el.value=Math.round(Math.min(+el.max,Math.max(+el.min,+el.value+f*d))*100)/100;el.dispatchEvent(new Event('input'));};return b;};
  wrap.append(knopf('−',-1),el,knopf('+',1));
});
document.querySelectorAll('input[type=number]').forEach(i=>i.inputMode='decimal');

// Erst mit Standardwerten rechnen (Vergleichsbasis für die Veränderungen), dann gespeicherte Eingaben laden
renderStaffeln();
renderMassnahmen();
setMieteMode(mieteMode);
update();
baseline={...ergebnis};
zustandLaden();
speichern=true;
updateKopf();
update();
let hilfeGesehen=true;try{hilfeGesehen=localStorage.getItem(HILFE)==='1';}catch(e){}
if(!hilfeGesehen){document.getElementById('hilfe').hidden=false;document.getElementById('hdr-hilfe').classList.add('hilfe-an');}
window.addEventListener('resize',update);

// Ergebnisleiste auf dem Handy, sobald die Ergebnis-Karte nicht im Bild ist
if('IntersectionObserver' in window){
  new IntersectionObserver(([e])=>{document.getElementById('livebar').classList.toggle('show',!e.isIntersecting&&window.innerWidth<900);}).observe(document.getElementById('hero'));
}
