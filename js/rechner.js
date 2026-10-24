// Rechenlogik des Simulators: reine Funktionen ohne Zugriff auf die Seite.
// Alle Eingaben kommen über das Parameterobjekt p, das ui.js aus den Feldern baut.

// Datumstexte 'JJJJ-MM-TT' ohne Zeitzonen-Effekte auswerten
function ymAus(s){const [j,m]=String(s||'').split('-').map(Number);return (j||0)*12+((m||1)-1);}
function jahrAus(s){return Number(String(s||'').slice(0,4))||0;}
function plusJahre(s,n){return (jahrAus(s)+n)+String(s).slice(4);}

// Miete/m² im Monat mSince nach Einzug (0 = Einzugsmonat); Staffeln und Index laufen ab Mietbeginn
function getMietqm(mSince,base,miete){
  if(miete.modus==='index')return base*Math.pow(1+miete.indexRate/100,Math.floor(mSince/12));
  // Staffeln skalieren mit der Basismiete, damit Szenario B mit abweichender Miete wirkt
  if(miete.modus==='staffel'){const s=[...miete.staffeln].sort((a,b)=>b.ab-a.ab).find(s=>mSince>=s.ab*12);const f=miete.basis>0?base/miete.basis:1;return s?s.mietqm*f:base;}
  return base;
}

// Garage/sonstige Einnahmen im Monat mSince nach Einzug: Grundbetrag plus Erhöhung alle n Jahre
function sonstEinnahme(mSince,p){
  const alle=Math.max(1,p.sonstAlle||3);
  return p.sonstEin+Math.floor(Math.max(0,mSince)/(12*alle))*(p.sonstPlus||0);
}

const KATEGORIEN={
  erhalt:'Erhaltungsaufwand',
  ak:'Anschaffungskosten (Betriebsbereitschaft)',
  hk:'Herstellungskosten (Standardhebung/Erweiterung)',
  wg:'Eigenes Wirtschaftsgut (z. B. Einbauküche)'
};

// Steuerliche Einordnung der Sanierungsmaßnahmen
// - § 6 Abs. 1 Nr. 1a EStG: nur Erhaltungsaufwand, der ab dem Anschaffungstag und innerhalb von 3 Jahren
//   ausgeführt wird, zählt zur 15-%-Grenze, und zwar netto. Arbeiten vor dem Übergang zählen nicht mit.
// - Abzug und AfA immer brutto, da private Vermieter keine Vorsteuer ziehen
// - beh: 'wk' Werbungskosten (§ 11 EStG im Zahlungsjahr, ggf. § 82b EStDV verteilt), 'ank' anschaffungsnahe HK,
//   'ak'/'hk' Anschaffungs-/Herstellungskosten (alle drei → Gebäude-AfA), 'wg' eigenes Wirtschaftsgut (eigene AfA)
function steuerEinordnung(p){
  const {massnahmen,kaufStr,vorAnschaffung,gebAK}=p;
  const grenze15=gebAK*0.15,fristEnde=plusJahre(kaufStr,3);
  const pos=massnahmen.map(m=>{
    const brutto=+m.brutto||0,netto=brutto/(1+(+m.ust||0)/100);
    const vor=m.leistung<kaufStr;
    let kat=m.kat;
    // Pauschale Annahme zur Betriebsbereitschaft für alle Arbeiten vor dem Übergang; HK und Wirtschaftsgüter bleiben
    if(vor&&vorAnschaffung==='erhalt'&&kat==='ak')kat='erhalt';
    if(vor&&vorAnschaffung==='ak'&&kat==='erhalt')kat='ak';
    // Szenario B: Das Finanzamt folgt der FG-Linie nicht und rechnet auch Arbeiten vor dem Übergang zur 15-%-Grenze
    const imTopf=kat==='erhalt'&&(!vor||vorAnschaffung==='topf')&&m.leistung<fristEnde;
    return {...m,brutto,netto,vor,kat,imTopf,nd:Math.max(1,+m.nd||10),verteil:Math.min(5,Math.max(1,+m.verteil||1))};
  });
  const topf=pos.filter(x=>x.imTopf).reduce((s,x)=>s+x.netto,0);
  const ueber=topf>grenze15;
  pos.forEach(x=>{
    if(x.kat==='wg')x.beh='wg';
    else if(x.kat==='ak'||x.kat==='hk')x.beh=x.kat;
    else x.beh=x.imTopf&&ueber?'ank':'wk';
  });
  return {pos,grenze15,topf,ueber,quote:grenze15>0?topf/grenze15:0,fristEnde};
}

// AfA eines eigenen Wirtschaftsguts im Kalenderjahr J: monatsgenau ab Lieferung, frühestens ab Anschaffung
function wgAfa(x,J,aYM){
  const s=Math.max(ymAus(x.leistung),aYM),e=s+x.nd*12-1;
  const a=Math.max(s,J*12),b=Math.min(e,J*12+11);
  return b>=a?x.brutto/(x.nd*12)*(b-a+1):0;
}

function computeScenario(p){
  const {kaufpreis,grundanteil,lifetime,maklerPct,notarKaufPct,notarGsPct,gutachten,sonstPlus,sonstAlle,gstPct,nkUmlJahr,nkNuJahr,nkInstJahr,darlehen,zinsPct,tilgPct,qm,baseMietqm,steuersatz,sonstEin,kaufDate,einzugDate,wertzuwachsPct,marktpreisQm,wertMode,miete,investitionen}=p;
  const nebenkosten=kaufpreis*(maklerPct+notarKaufPct+notarGsPct+gstPct);
  // Anschaffungskosten Gebäude: Kaufpreis-Anteil + anteilige Kaufnebenkosten ohne Grundschuld (Grund und Boden zählt nicht)
  const nkAnschaffung=kaufpreis*(maklerPct+notarKaufPct+gstPct);
  const gebwert=(kaufpreis+nkAnschaffung)*(1-grundanteil/100);
  // Grundschuldkosten (Finanzierung) und Gutachten sind im Kaufjahr sofort abziehbar
  const wkEinmalig=kaufpreis*notarGsPct+gutachten;
  const st=steuerEinordnung({...p,gebAK:gebwert});
  const sanTotal=st.pos.reduce((s,x)=>s+x.brutto,0);
  const investSum=kaufpreis+nebenkosten+sanTotal+gutachten;
  // Darlehen ist vertraglich fix; Eigenkapital = Rest der Gesamtinvestition
  const ek=investSum-darlehen;
  const annM=darlehen*(zinsPct+tilgPct)/12;
  const years=10;
  const yd=[];
  let restD=darlehen,monKum=0;
  const wertBasis=wertMode==='qm'?marktpreisQm*qm:kaufpreis;
  const kY=kaufDate.getFullYear(),kM=kaufDate.getMonth(),aYM=kY*12+kM;
  // Aktivierte Beträge erhöhen die Gebäude-AfA: im Kaufjahr zeitanteilig ab Anschaffung,
  // in späteren Jahren voll ab dem Jahr der Ausführung (R 7.4 Abs. 9 EStR)
  const aktiv=st.pos.filter(x=>x.beh==='ak'||x.beh==='hk'||x.beh==='ank').map(x=>({betrag:x.brutto,jahr:Math.max(kY,jahrAus(x.leistung))}));
  const basisKauf=gebwert+aktiv.filter(a=>a.jahr===kY).reduce((s,a)=>s+a.betrag,0);
  for(let y=0;y<years;y++){
    const J=kY+y;
    const monate=y===0?(12-kM):12;
    const fakt=monate/12;
    monKum+=monate;
    const startYM=y===0?aYM:J*12,endYM=J*12+11;
    const eYM=einzugDate.getFullYear()*12+einzugDate.getMonth();
    const mietmonate=Math.max(0,endYM-Math.max(startYM,eYM)+1);
    const mqY=getMietqm(Math.max(0,endYM-eYM),baseMietqm,miete);
    let mietEin=0;
    for(let ym=Math.max(startYM,eYM);ym<=endYM;ym++)mietEin+=qm*getMietqm(ym-eYM,baseMietqm,miete)+sonstEinnahme(ym-eYM,p);
    let zJ=0,tJ=0,rD=restD;
    for(let m=0;m<monate;m++){const zm=rD*zinsPct/12;const tm=annM-zm;zJ+=zm;tJ+=tm;rD=Math.max(0,rD-tm);}
    restD=rD;
    const spaeter=aktiv.filter(a=>a.jahr>kY&&a.jahr<=J).reduce((s,a)=>s+a.betrag,0);
    const afaAkt=y===0?basisKauf/lifetime*fakt:(basisKauf+spaeter)/lifetime;
    const afaWG=st.pos.filter(x=>x.beh==='wg').reduce((s,x)=>s+wgAfa(x,J,aYM),0);
    // Erhaltungsaufwand im Zahlungsjahr (§ 11 EStG), bei § 82b gleichmäßig auf 2–5 Jahre verteilt
    const wkEr=st.pos.filter(x=>x.beh==='wk').reduce((s,x)=>{const j0=Math.max(kY,jahrAus(x.zahlung)||kY);return J>=j0&&J<j0+x.verteil?s+x.brutto/x.verteil:s;},0);
    const sanKJ=y===0?sanTotal:0;
    const annJ=annM*monate;
    const invDJ=investitionen.filter(i=>i.yr===(y+1));
    const invK=invDJ.reduce((s,i)=>s+i.bet,0);
    let invAfaJ=0;investitionen.forEach(inv=>{if((y+1)>=inv.yr&&(y+1)<inv.yr+inv.nd)invAfaJ+=inv.bet/inv.nd;});
    const nkNuY=nkNuJahr*fakt;const nkUmlY=nkUmlJahr*(mietmonate/12);
    // Leerstand: umlagefähige NK trägt der Eigentümer selbst
    const nkLeerY=nkUmlJahr*(monate-mietmonate)/12;
    // Instandhaltungsrücklage ist erst bei Verwendung abziehbar → nicht als WK
    const wkZ=zJ,wkA=afaAkt,wkAi=invAfaJ,wkN=(nkNuJahr-nkInstJahr)*fakt+nkLeerY;
    const wkEin=y===0?wkEinmalig:0;
    const wkG=wkZ+wkA+afaWG+wkAi+wkEr+wkN+wkEin;
    const stE=mietEin-wkG;
    const steuerErs=stE<0?(-stE*steuersatz):0;
    const mehrSt=stE>0?stE*steuersatz:0;
    const netSt=steuerErs-mehrSt;
    // Sanierung ist Teil der Gesamtinvestition (über EK + Darlehen bezahlt) → nicht nochmals im CF
    const cfV=mietEin-annJ-nkNuY-nkLeerY-invK;
    const cfN=cfV+netSt;
    const immo=wertBasis*Math.pow(1+wertzuwachsPct,monKum/12);
    const ekAkt=immo-restD;
    yd.push({year:J,mietEin,mqY,zJ,tJ,afaAkt,afaWG,wkEr,wkEin,wkZ,wkA,wkAi,wkN,wkG,stE,steuerErs,mehrSt,netSt,cfV,cfN,restD,mietmonate,annJ,sanKJ,monate,nkUmlY,nkNuY,nkLeerY,invK,invAfaJ,invDJ,immo,ekAkt,annM});
  }
  const summe=beh=>st.pos.filter(x=>x.beh===beh).reduce((s,x)=>s+x.brutto,0);
  const steuer={...st,
    gesamt:sanTotal,ak:summe('ak'),hk:summe('hk'),ank:summe('ank'),wg:summe('wg'),
    wkKaufjahr:yd[0].wkEr,
    verteilt:st.pos.filter(x=>x.beh==='wk'&&x.verteil>1).reduce((s,x)=>s+x.brutto,0),
    afaGebJahr:yd[1].afaAkt,
    afaWGJahr:st.pos.filter(x=>x.beh==='wg').reduce((s,x)=>s+x.brutto/x.nd,0)
  };
  return{yd,investSum,ek,darlehen,annM,nebenkosten,nkAnschaffung,wkEinmalig,gebwert,sanTotal,nkUmlJahr,nkNuJahr,wertBasis,monKum,steuer};
}

function calcIRR(cfs){
  let r=0.1;
  for(let i=0;i<300;i++){let n=0,dn=0;cfs.forEach((c,t)=>{n+=c/Math.pow(1+r,t);dn+=-t*c/Math.pow(1+r,t+1);});if(Math.abs(n)<0.01)break;if(Math.abs(dn)<1e-12)break;r-=n/dn;if(r<-0.999)r=-0.999;}
  return r;
}

function computeRendite(res,p){
  const{yd,investSum,ek,monKum}=res;
  const{kaufpreis,qm,baseMietqm,nkNuJahr,miete}=p;
  const jahre=monKum/12;
  const mJ1=getMietqm(0,baseMietqm,miete)*qm*12;
  const mJ1n=mJ1-nkNuJahr;
  const bruttoR=kaufpreis>0?mJ1/kaufpreis*100:0;
  const nettoR=investSum>0?mJ1n/investSum*100:0;
  const mult=mJ1>0?kaufpreis/mJ1:0;
  const totCF=yd.reduce((s,d)=>s+d.cfN,0);
  // Gewinn = Eigenkapital in der Immobilie am Ende (Wert − Restschuld) + kumulierter CF − eingesetztes EK
  const gewinn=yd[yd.length-1].ekAkt+totCF-ek;
  const ekR10=ek>0?(Math.pow(Math.max(0,1+gewinn/ek),1/jahre)-1)*100:0;
  const avgCF=totCF/jahre;
  const coc=ek>0?avgCF/ek*100:0;
  const avgMn=yd.reduce((s,d)=>s+(d.mietEin-d.nkNuY),0)/jahre;
  const mRn=investSum>0?avgMn/investSum*100:0;
  const cfs=[-ek];
  yd.forEach((d,i)=>cfs.push(i===yd.length-1?d.cfN+d.ekAkt:d.cfN));
  const irr=calcIRR(cfs)*100;
  return{bruttoR,nettoR,mult,coc,ekR10,irr,mRn};
}
