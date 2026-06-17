// ═══════════════════════════════════════════════
// IN-APP BROWSER DETECTION
// ═══════════════════════════════════════════════
(function(){
  const ua=navigator.userAgent;
  const inApp=/FBAN|FBAV|Instagram|Twitter|Line|Snapchat|MicroMessenger/i.test(ua);
  if(inApp) document.getElementById('openBtn').style.display='block';
})();

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════
const gc=document.getElementById('gc');
const ctx=gc.getContext('2d');
const W=480,H=520,GY=H-68;
const GRAVITY=0.62;
const JUMP_POWER=-15;

// Obstacles with multiple death messages each
const OBS_DATA=[
  {e:'👔',c:'#3C3289',w:38,h:62,
   msgs:['Chef zwingt dich zu 3h Überstunden.\nUnbezahlt, natürlich. 😩','Der Chef will ein "kurzes Gespräch".\n47 Minuten später bist du noch dort. ⏱️','Chef erklärt dir, du seist wie "Teil der Familie".\nDann streicht er dein Weihnachtsgeld. 🎄','Chef: "Das ist kein Job, das ist eine Berufung!"\nDu: "Berufungen werden aber besser bezahlt." 💸']},
  {e:'💻',c:'#185FA5',w:50,h:38,
   msgs:['700 ungelesene E-Mails warten auf dich.\nAllen wurde du in CC gesetzt. 📧💀','Windows Update startet mitten in deiner Präsentation.\nNeustart in 3... 2... 1... 🔄','Dein PC friert ein. IT antwortet in 3-5 Werktagen. ❄️','Du öffnest Excel. Excel öffnet 12 "Wiederhergestellte Dateien". 📊😱']},
  {e:'🖨️',c:'#444458',w:46,h:46,
   msgs:['Papierstau. Du musst 400 Seiten manuell einscannen. 🗃️','Drucker offline. Immer. Überall. Für immer. 🖨️❌','Tinte leer. Neue Patrone bestellt: Lieferzeit 6 Wochen. 🖋️','Du musst 80 Formulare drucken, unterschreiben\nund erneut einscannen. Per Fax senden. 📠']},
  {e:'☕',c:'#6B3A10',w:34,h:50,
   msgs:['Kollege Hansi erzählt dir 25 Minuten lang\nvon seinem Urlaub in Rimini. ☕😐','Du wolltest Kaffee holen.\nJetzt hörst du Melanies Baupläne für ihr Haus. 🏠','Kaffeepause dauert jetzt 40 Minuten,\nweil jemand "einfach kurz" reden wollte. 💬','Kaffeeküche: Wo Produktivität stirbt\nund Tratsch entsteht. RIP. ⚰️']},
  {e:'📊',c:'#2A6B2A',w:42,h:52,
   msgs:['Notfall-Präsentation bis 17:00 Uhr.\nVorbereitung: 0 Minuten. 📊😱','Q4-Review: 83 Slides, 12 Stakeholder,\n1 funktionierender Beamer. Keiner. 📽️','Daten stimmen nicht. Chef will "trotzdem präsentieren".\n"Wir improvisieren einfach!" 🤡','Pivottabelle korrumpiert.\nDie Zahlen ergeben keinen Sinn mehr.\nSie haben es vorher auch nicht. 🔢']},
  {e:'📁',c:'#8B3A1A',w:38,h:52,
   msgs:['Du musst das Archiv von 2009 digitalisieren.\nAlleine. Diese Woche. 🗂️😭','17 Ordner mit "WICHTIG_FINAL_v3_NEU_2.pdf".\nDu weißt nicht welcher der richtige ist. 📂','Neues Ablagesystem eingeführt.\nNiemand wurde informiert.\nDu findest nichts mehr. 🔍','Formular A-27b: Dreifach ausgefüllt,\nunterschrieben, gestempelt und per Post. 2023. 📮']},
  {e:'🧑‍💼',c:'#534AB7',w:38,h:64,
   msgs:['HR lädt zum "kurzen Gespräch" ein.\n3 Stunden und 1 Teambuilding-Übung später... 🧑‍💼😬','Neues Kompetenzframework wird eingeführt.\nDu wirst in "Kategorie Sonstige" eingeordnet. 📋','Performance Review:\n"Gut, aber du könntest dich mehr engagieren."\nDu arbeitest 10h täglich. 😶','HR schickt die falsche Gehaltsabrechnung.\nKlärung dauert "ein paar Wochen". 💶']},
  {e:'📞',c:'#0A5E4A',w:36,h:42,
   msgs:['Telefonkonferenz mit 40 Leuten.\nNiemand ist vorbereitet. Du auch nicht. 📞🤦','Call startet 20 Minuten zu spät\nweil jemand "technische Probleme" hat. 🔇','Du wirst zum Protokollführen eingeteilt.\nNiemand wusste das. Du auch nicht. 📝','Jemand ist die ganze Zeit auf Mute\nund merkt es nicht. Das bist du. 🎙️']},
  {e:'🪑',c:'#5A3210',w:42,h:52,
   msgs:['Dein ergonomischer Stuhl wurde\n"umgezogen". Du sitzt auf Kisten. 🪑😤','Neues Open-Space-Konzept eingeführt.\nDein Schreibtisch existiert nicht mehr. 🏢','Homeoffice-Tag gestrichen wegen\n"Teamspirit". Dein Weg: 90 Minuten. 🚇','Sitznachbar telefoniert\nstundenlang auf Lautsprecher.\n"Tut mir leid, kurzes Gespräch." 🔊']},
  {e:'📋',c:'#7A2B1A',w:40,h:50,
   msgs:['Neues Ticketsystem eingeführt.\nFür jede Kaffeepause brauchst du ein Ticket. 🎫','Dein Urlaubsantrag braucht\n4 Unterschriften, 2 Manager und einen Notar. ✍️','Compliance-Schulung: 6 Stunden.\nPflichtveranstaltung. Kein Ton. Powerpoint. 😴','Zeiterfassung auf 15-Minuten-Intervalle umgestellt.\nDu erfasst jetzt deine Toilettenpausen. 🚽']},
  {e:'📅',c:'#6B1A1A',w:40,h:44,
   msgs:['Meeting über das Meeting, das das\nMeeting geplant hat. Startet 20min zu spät. 🗓️','Dein gesamter Freitagnachmittag:\n1 Meeting. Hätte eine E-Mail sein können. 📨','Recurring Meeting seit 2019.\nNiemand weiß mehr wofür es ist.\nAlle kommen trotzdem. 👻','Agenda: "Diverses"\nDauer: 2 Stunden\nErgebnis: Nächstes Meeting geplant. 🔁']},
];

function randMsg(obs){ return obs.msgs[Math.floor(Math.random()*obs.msgs.length)]; }

// ═══════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════
let STATE='start'; // start | playing | dying | dead
let dodel,obstacles,coins,parts,score,best=0,frame,spd,raf=null;
let spawnTimer=0,coinTimer=0,hitMsg='',jumpCount=0;
let pressStart=0,pressing=false;

try{ best=parseInt(localStorage.getItem('dd_best')||'0'); }catch(e){}

// Variable spawn gaps
function nextGap(){
  // Much more variable gaps: short bursts then breathing room
  const base = 130 - Math.floor(frame/300)*7;
  const minGap = Math.max(52, 70 - Math.floor(frame/600)*5);
  // weighted random: 30% very short, 40% medium, 30% long gap
  const r = Math.random();
  let gap;
  if(r < 0.25)      gap = minGap + Math.random()*25;          // very short
  else if(r < 0.65) gap = minGap + 30 + Math.random()*50;     // medium
  else              gap = minGap + 90 + Math.random()*80;      // long breather
  return Math.min(gap, base);
}
let nextSpawn=100;

function resetAll(){
  dodel={x:78,y:GY-80,vy:0,w:40,h:80,onGround:false,jumpsLeft:2,f:0,squish:1,squishV:0};
  obstacles=[];coins=[];parts=[];
  score=0;frame=0;spd=4;
  spawnTimer=0;coinTimer=0;jumpCount=0;
  nextSpawn=nextGap();
  shieldCoins=0;
  shieldActive=false;
  shieldTimer=0;
  updateJumpDots();
}

function updateJumpDots(){
  document.getElementById('j0').className='jdot'+(dodel&&dodel.jumpsLeft>=1?' active':'');
  document.getElementById('j1').className='jdot'+(dodel&&dodel.jumpsLeft>=2?' active':'');
}

// ═══════════════════════════════════════════════
// DUDEL DRAWING — proper office worker body
// ═══════════════════════════════════════════════
function drawDudel(c,x,y,f,dead,spd,sq){
  const bob=dead?0:Math.sin(f*.22)*1.8*(dodel&&dodel.onGround?1:0);
  const by=y+bob;
  const sy=sq||1; // squish y
  const sx=dead?1:(2-sy); // squish x inverse

  function applySquish(cx,cy){ c.translate(cx,cy);c.scale(sx,sy);c.translate(-cx,-cy); }

  const cx=x+20; // center x
  c.save();

  // shadow
  if(!dead){
    c.fillStyle='rgba(0,0,0,0.25)';
    c.beginPath();c.ellipse(cx,GY+3,18*sx,5,0,0,Math.PI*2);c.fill();
  }

  // ── LEGS ──
  if(!dead){
    const ls=Math.sin(f*.4)*8;
    // trousers
    c.fillStyle='#1E1C35';
    // left leg
    c.save();applySquish(x+14,by+56);
    c.beginPath();c.roundRect(x+10,by+52,12,22,[3,3,5,5]);c.fill();
    c.restore();
    // right leg
    c.save();applySquish(x+28,by+56+ls);
    c.fillStyle='#28263E';
    c.beginPath();c.roundRect(x+22,by+52+ls*.4,12,22-ls*.3,[3,3,5,5]);c.fill();
    c.restore();
    // shoes
    c.fillStyle='#0E0C1A';
    c.beginPath();c.ellipse(x+16,by+74,10,5,-.08,0,Math.PI*2);c.fill();
    c.beginPath();c.ellipse(x+16,by+74,7,3.5,-.08,0,Math.PI,true);c.fillStyle='#1A1828';c.fill();
    c.fillStyle='#0E0C1A';
    c.beginPath();c.ellipse(x+29,by+74+ls*.3,10,5,-.08,0,Math.PI*2);c.fill();
  }

  // ── TORSO: shirt ──
  c.save();applySquish(cx,by+38);
  c.fillStyle='#EAF0FA';
  c.beginPath();c.roundRect(x+7,by+26,26,28,[3,3,4,4]);c.fill();
  c.restore();

  // ── JACKET ──
  c.save();applySquish(cx,by+38);
  c.fillStyle='#2E2878';
  // left panel
  c.beginPath();c.moveTo(x+7,by+26);c.lineTo(x+17,by+26);c.lineTo(x+14,by+54);c.lineTo(x+7,by+54);c.closePath();c.fill();
  // right panel
  c.beginPath();c.moveTo(x+33,by+26);c.lineTo(x+23,by+26);c.lineTo(x+26,by+54);c.lineTo(x+33,by+54);c.closePath();c.fill();
  // lapels
  c.fillStyle='#3D36A0';
  c.beginPath();c.moveTo(x+11,by+26);c.lineTo(x+20,by+36);c.lineTo(x+20,by+26);c.closePath();c.fill();
  c.beginPath();c.moveTo(x+29,by+26);c.lineTo(x+20,by+36);c.lineTo(x+20,by+26);c.closePath();c.fill();
  c.restore();

  // ── SHIRT BUTTONS ──
  c.fillStyle='#B0BEDD';
  for(let i=0;i<3;i++){c.beginPath();c.arc(cx,by+32+i*7,1.5,0,Math.PI*2);c.fill();}

  // ── TIE ──
  c.save();applySquish(cx,by+42);
  c.fillStyle='#C42030';
  c.beginPath();c.moveTo(x+18,by+28);c.lineTo(x+22,by+28);c.lineTo(x+21,by+46);c.lineTo(x+20,by+51);c.lineTo(x+19,by+46);c.closePath();c.fill();
  c.fillStyle='#8B1520';c.beginPath();c.roundRect(x+17,by+26,6,5,2);c.fill();
  c.restore();

  // ── ARMS ──
  const as=Math.sin(f*.4)*6;
  c.save();applySquish(cx,by+36);
  // left arm + sleeve
  c.fillStyle='#2E2878';
  c.beginPath();c.roundRect(x-3,by+27+as,11,24,[4,4,3,3]);c.fill();
  // cuff
  c.fillStyle='#D0D8F0';c.beginPath();c.roundRect(x-3,by+46+as,11,6,[2,2,4,4]);c.fill();
  // briefcase hand
  c.fillStyle='#4A2808';c.beginPath();c.roundRect(x-14,by+47+as,17,13,3);c.fill();
  c.fillStyle='#6A3A10';c.beginPath();c.roundRect(x-11,by+44+as,11,5,2);c.fill();
  c.strokeStyle='#2A1404';c.lineWidth=1.5;
  c.beginPath();c.moveTo(x-9,by+52+as);c.lineTo(x+1,by+52+as);c.stroke();
  // right arm
  c.fillStyle='#2E2878';
  c.beginPath();c.roundRect(x+32,by+27-as,11,22,[4,4,3,3]);c.fill();
  c.fillStyle='#D0D8F0';c.beginPath();c.roundRect(x+32,by+44-as,11,5,[2,2,4,4]);c.fill();
  c.restore();

  // ── NECK ──
  c.fillStyle='#E8B060';
  c.beginPath();c.roundRect(x+16,by+20,8,8,2);c.fill();

  // ── HEAD ──
  c.save();applySquish(cx,by+12);
  // head shape — slightly rectangular but rounded, more human
  c.fillStyle='#F0B868';
  c.beginPath();
  c.moveTo(x+8,by+4);
  c.bezierCurveTo(x+8,by,x+32,by,x+32,by+4);
  c.lineTo(x+33,by+18);
  c.bezierCurveTo(x+33,by+28,x+7,by+28,x+7,by+18);
  c.closePath();c.fill();
  c.restore();

  // ── EAR ──
  c.fillStyle='#E0A050';
  c.beginPath();c.ellipse(x+7,by+14,3.5,5,-.1,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(x+33,by+14,3.5,5,.1,0,Math.PI*2);c.fill();

  // ── HAIR ──
  c.fillStyle='#1A1420';
  c.beginPath();
  c.moveTo(x+7,by+5);
  c.bezierCurveTo(x+7,by-.5,x+33,by-.5,x+33,by+5);
  c.lineTo(x+32,by+9);
  c.bezierCurveTo(x+22,by+6,x+18,by+6,x+8,by+9);
  c.closePath();c.fill();
  // hair side part
  c.fillStyle='rgba(255,255,255,0.06)';
  c.beginPath();c.roundRect(x+10,by+1,8,5,[3,3,1,1]);c.fill();

  // ── FACE ──
  if(dead){
    // X eyes
    c.strokeStyle='#8B4010';c.lineWidth=2.5;c.lineCap='round';
    c.beginPath();c.moveTo(x+12,by+11);c.lineTo(x+17,by+16);c.moveTo(x+17,by+11);c.lineTo(x+12,by+16);c.stroke();
    c.beginPath();c.moveTo(x+24,by+11);c.lineTo(x+29,by+16);c.moveTo(x+29,by+11);c.lineTo(x+24,by+16);c.stroke();
    // wavy sad mouth
    c.strokeStyle='#8B4010';c.lineWidth=1.8;
    c.beginPath();c.moveTo(x+12,by+23);c.quadraticCurveTo(x+17,by+27,x+20,by+24);c.quadraticCurveTo(x+23,by+21,x+28,by+25);c.stroke();
    // stars/dizzy
    c.fillStyle='#EF9F27';
    const stars=[[x+6,by+6],[x+33,by+4],[x+5,by+24]];
    stars.forEach(([sx,sy])=>{
      ctx.font='10px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('★',sx,sy);
    });
  } else {
    // whites
    c.fillStyle='#fff';
    c.beginPath();c.ellipse(x+14.5,by+14,4.5,3.5,0,0,Math.PI*2);c.fill();
    c.beginPath();c.ellipse(x+26.5,by+14,4.5,3.5,0,0,Math.PI*2);c.fill();
    // pupils (look slightly forward)
    c.fillStyle='#1A0E06';
    c.beginPath();c.ellipse(x+15.5,by+14.5,2.5,3,0,0,Math.PI*2);c.fill();
    c.beginPath();c.ellipse(x+27.5,by+14.5,2.5,3,0,0,Math.PI*2);c.fill();
    // tired eyelid droop
    c.fillStyle='#F0B868';
    c.beginPath();c.roundRect(x+10,by+10,10,4.5,[2,2,0,0]);c.fill();
    c.beginPath();c.roundRect(x+22,by+10,10,4.5,[2,2,0,0]);c.fill();
    // eyebags
    c.fillStyle='rgba(0,0,0,0.1)';
    c.beginPath();c.ellipse(x+14.5,by+17,4,2,0,0,Math.PI*2);c.fill();
    c.beginPath();c.ellipse(x+26.5,by+17,4,2,0,0,Math.PI*2);c.fill();
    // mouth
    c.strokeStyle='#A06828';c.lineWidth=1.5;c.lineCap='round';
    if(spd>7.5){
      // open scared mouth
      c.fillStyle='#7A3010';
      c.beginPath();c.ellipse(x+20,by+23,4,3,0,0,Math.PI*2);c.fill();
    } else {
      c.beginPath();c.moveTo(x+13,by+22);c.quadraticCurveTo(x+20,by+26,x+27,by+22);c.stroke();
    }
    // sweat
    if(!dodel.onGround||spd>6){
      c.fillStyle='rgba(100,170,230,0.8)';
      c.beginPath();c.moveTo(x+34,by+8);c.quadraticCurveTo(x+38,by+14,x+34,by+19);c.quadraticCurveTo(x+30,by+14,x+34,by+8);c.fill();
    }
  }
}

// ═══════════════════════════════════════════════
// BACKGROUND
// ═══════════════════════════════════════════════
let bgObjs=[];
function initBg(){
  bgObjs=[
    {type:'desk',x:30,y:GY-85,w:120,h:20,spd:.18},
    {type:'desk',x:320,y:GY-85,w:100,h:20,spd:.18},
    {type:'plant',x:200,y:GY-70,spd:.18},
    {type:'cabinet',x:410,y:GY-110,w:55,h:45,spd:.15},
    {type:'window',x:60,y:40,w:80,h:90,spd:.08},
    {type:'window',x:280,y:40,w:80,h:90,spd:.08},
    {type:'clock',x:430,y:30,spd:.08},
  ];
}
initBg();

function drawBg(){
  // ── WALL: warm office grey-beige ──
  ctx.fillStyle='#C8C4B8';ctx.fillRect(0,0,W,GY);

  // subtle wall texture (horizontal lines like plaster)
  ctx.strokeStyle='rgba(0,0,0,0.04)';ctx.lineWidth=1;
  for(let y=0;y<GY;y+=18){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

  // ── CEILING STRIP: fluorescent lights ──
  ctx.fillStyle='#E8E4D8';ctx.fillRect(0,0,W,14);
  // light panels
  [[60,120],[200,120],[360,100]].forEach(([lx,lw])=>{
    ctx.fillStyle='#FFFFF0';ctx.fillRect(lx,0,lw,10);
    // light glow on wall below
    const g=ctx.createLinearGradient(0,10,0,80);
    g.addColorStop(0,'rgba(255,255,220,0.18)');g.addColorStop(1,'rgba(255,255,220,0)');
    ctx.fillStyle=g;ctx.fillRect(lx-20,10,lw+40,70);
  });

  // ── BACKGROUND OBJECTS (parallax) ──
  bgObjs.forEach(o=>{
    o.x-=o.spd*(spd||4)/4;
    if(o.x+200<0) o.x=W+50+Math.random()*100;

    if(o.type==='window'){
      // window frame
      ctx.fillStyle='#9A9588';ctx.beginPath();ctx.roundRect(o.x-4,o.y-4,o.w+8,o.h+8,4);ctx.fill();
      // sky outside
      const skyG=ctx.createLinearGradient(o.x,o.y,o.x,o.y+o.h);
      skyG.addColorStop(0,'#87CEEB');skyG.addColorStop(1,'#C8E8F8');
      ctx.fillStyle=skyG;ctx.beginPath();ctx.roundRect(o.x,o.y,o.w,o.h,2);ctx.fill();
      // clouds outside
      ctx.fillStyle='rgba(255,255,255,0.8)';
      ctx.beginPath();ctx.ellipse(o.x+20,o.y+25,16,8,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(o.x+55,o.y+35,12,6,0,0,Math.PI*2);ctx.fill();
      // window panes
      ctx.strokeStyle='rgba(150,140,120,0.6)';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(o.x+o.w/2,o.y);ctx.lineTo(o.x+o.w/2,o.y+o.h);ctx.stroke();
      ctx.beginPath();ctx.moveTo(o.x,o.y+o.h/2);ctx.lineTo(o.x+o.w,o.y+o.h/2);ctx.stroke();
      // window sill
      ctx.fillStyle='#B0A898';ctx.fillRect(o.x-6,o.y+o.h,o.w+12,8);

    } else if(o.type==='desk'){
      // desk surface
      ctx.fillStyle='#A0856A';ctx.beginPath();ctx.roundRect(o.x,o.y,o.w,o.h,[3,3,0,0]);ctx.fill();
      ctx.fillStyle='#8A7058';ctx.fillRect(o.x,o.y+o.h-4,o.w,4);
      // desk legs
      ctx.fillStyle='#7A6050';ctx.fillRect(o.x+8,o.y+o.h,8,12);ctx.fillRect(o.x+o.w-16,o.y+o.h,8,12);
      // monitor
      ctx.fillStyle='#2A2A35';ctx.beginPath();ctx.roundRect(o.x+18,o.y-48,54,42,4);ctx.fill();
      // screen glow (blue office screen)
      const sg=ctx.createLinearGradient(o.x+21,o.y-45,o.x+21,o.y-10);
      sg.addColorStop(0,'#1a3a6a');sg.addColorStop(1,'#0a1a3a');
      ctx.fillStyle=sg;ctx.beginPath();ctx.roundRect(o.x+21,o.y-45,48,36,2);ctx.fill();
      // fake spreadsheet lines on screen
      ctx.strokeStyle='rgba(100,180,255,0.3)';ctx.lineWidth=1;
      for(let r=0;r<4;r++){ctx.beginPath();ctx.moveTo(o.x+22,o.y-40+r*8);ctx.lineTo(o.x+68,o.y-40+r*8);ctx.stroke();}
      // monitor stand
      ctx.fillStyle='#2A2A35';ctx.beginPath();ctx.roundRect(o.x+40,o.y-6,14,10,1);ctx.fill();
      ctx.fillRect(o.x+36,o.y+3,22,4);
      // keyboard
      ctx.fillStyle='#C8C0B0';ctx.beginPath();ctx.roundRect(o.x+10,o.y+4,50,12,2);ctx.fill();
      // coffee cup on desk
      ctx.fillStyle='#E8E0D0';ctx.beginPath();ctx.roundRect(o.x+o.w-18,o.y+2,12,14,2);ctx.fill();
      ctx.fillStyle='#4A2808';ctx.fillRect(o.x+o.w-16,o.y+4,8,6);

    } else if(o.type==='plant'){
      // pot
      ctx.fillStyle='#B85A30';ctx.beginPath();ctx.roundRect(o.x+2,o.y+46,18,20,[2,2,4,4]);ctx.fill();
      ctx.fillStyle='#8A3A18';ctx.fillRect(o.x,o.y+44,22,4);
      // soil
      ctx.fillStyle='#3A2010';ctx.fillRect(o.x+3,o.y+44,18,5);
      // leaves
      const leafC=['#2A6820','#358028','#1E5018'];
      [[o.x+11,o.y+42,0],[o.x+2,o.y+30,-0.3],[o.x+20,o.y+28,0.4],[o.x+11,o.y+18,0.1],[o.x-2,o.y+18,-0.5],[o.x+24,o.y+20,0.6]].forEach(([px,py,ang],i)=>{
        ctx.fillStyle=leafC[i%3];
        ctx.save();ctx.translate(px,py);ctx.rotate(ang);
        ctx.beginPath();ctx.ellipse(0,0,7+i,12+i*1.5,0,0,Math.PI*2);ctx.fill();
        ctx.restore();
      });

    } else if(o.type==='cabinet'){
      ctx.fillStyle='#B8B0A0';ctx.beginPath();ctx.roundRect(o.x,o.y,o.w,o.h,2);ctx.fill();
      ctx.fillStyle='#A8A090';
      ctx.fillRect(o.x+2,o.y+2,o.w-4,o.h/2-3);
      ctx.fillRect(o.x+2,o.y+o.h/2+1,o.w-4,o.h/2-3);
      ctx.strokeStyle='rgba(0,0,0,0.15)';ctx.lineWidth=1;
      ctx.strokeRect(o.x+2,o.y+2,o.w-4,o.h/2-3);
      ctx.strokeRect(o.x+2,o.y+o.h/2+1,o.w-4,o.h/2-3);
      // handles
      ctx.fillStyle='#888078';
      ctx.beginPath();ctx.roundRect(o.x+o.w/2-8,o.y+o.h/4-3,16,6,3);ctx.fill();
      ctx.beginPath();ctx.roundRect(o.x+o.w/2-8,o.y+3*o.h/4-3,16,6,3);ctx.fill();

    } else if(o.type==='clock'){
      ctx.fillStyle='#E8E0D0';ctx.beginPath();ctx.arc(o.x,o.y,20,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#8A8070';ctx.lineWidth=2;ctx.beginPath();ctx.arc(o.x,o.y,20,0,Math.PI*2);ctx.stroke();
      // tick marks
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6;
        ctx.strokeStyle='#4A4038';ctx.lineWidth=i%3===0?2:1;
        ctx.beginPath();ctx.moveTo(o.x+Math.cos(a)*15,o.y+Math.sin(a)*15);
        ctx.lineTo(o.x+Math.cos(a)*18,o.y+Math.sin(a)*18);ctx.stroke();
      }
      const t=Date.now()/1000;
      ctx.strokeStyle='#2A2018';ctx.lineWidth=2;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.x+Math.cos(t*.1-Math.PI/2)*11,o.y+Math.sin(t*.1-Math.PI/2)*11);ctx.stroke();
      ctx.strokeStyle='#E24B4A';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.x+Math.cos(t-Math.PI/2)*15,o.y+Math.sin(t-Math.PI/2)*15);ctx.stroke();
      ctx.fillStyle='#2A2018';ctx.beginPath();ctx.arc(o.x,o.y,2,0,Math.PI*2);ctx.fill();
    }
  });

  // ── BASEBOARD ──
  ctx.fillStyle='#A8A098';ctx.fillRect(0,GY-14,W,14);
  ctx.fillStyle='#B8B0A8';ctx.fillRect(0,GY-14,W,3);

  // ── FLOOR: office carpet/lino ──
  const floorG=ctx.createLinearGradient(0,GY,0,H);
  floorG.addColorStop(0,'#7A7468');floorG.addColorStop(1,'#6A6458');
  ctx.fillStyle=floorG;ctx.fillRect(0,GY,W,H-GY);

  // floor tile grid
  ctx.strokeStyle='rgba(0,0,0,0.12)';ctx.lineWidth=1;
  const tileOff=(frame*(spd||4)*.5)%56;
  for(let x=-56+tileOff%56;x<W;x+=56){ctx.beginPath();ctx.moveTo(x,GY);ctx.lineTo(x,H);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(0,GY+28);ctx.lineTo(W,GY+28);ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,GY+56);ctx.lineTo(W,GY+56);ctx.stroke();
  // floor highlight strip
  ctx.fillStyle='rgba(255,255,255,0.06)';ctx.fillRect(0,GY,W,3);
}

// ═══════════════════════════════════════════════
// OBSTACLES & COINS
// ═══════════════════════════════════════════════
function spawnObs(){
  const t=OBS_DATA[Math.floor(Math.random()*OBS_DATA.length)];
  const gap=nextGap();
  nextSpawn=gap;spawnTimer=0;
  // occasionally spawn low obstacle + high obstacle combo
  const combo=Math.random()<.15&&score>10;
  const msg=randMsg(t);
  obstacles.push({x:W+20,y:GY-t.h,w:t.w,h:t.h,e:t.e,col:t.col,msg,wobble:0});
  if(combo){
    const t2=OBS_DATA[Math.floor(Math.random()*OBS_DATA.length)];
    obstacles.push({x:W+20,y:GY-t.h-t2.h-8,w:t2.w,h:t2.h,e:t2.e,col:t2.col,msg:randMsg(t2),wobble:0});
  }
}

function drawObs(){
  obstacles.forEach(o=>{
    o.wobble=Math.sin(frame*.2)*2;
    const oy=o.y+o.wobble;
    const cx=o.x+o.w/2;
    const cy=oy+o.h/2;

    // drop shadow
    ctx.fillStyle='rgba(0,0,0,0.18)';
    ctx.beginPath();ctx.ellipse(cx,GY+6,o.w*.45,7,0,0,Math.PI*2);ctx.fill();

    // outer white card (thick border for contrast)
    ctx.fillStyle='#FFFFFF';
    ctx.beginPath();ctx.roundRect(o.x-4,oy-4,o.w+8,o.h+8,12);ctx.fill();

    // colored accent bar at bottom
    ctx.fillStyle=o.col;
    ctx.beginPath();ctx.roundRect(o.x-4,oy+o.h-4,o.w+8,14,[0,0,12,12]);ctx.fill();

    // inner white card
    ctx.fillStyle='#F8F7FF';
    ctx.beginPath();ctx.roundRect(o.x,oy,o.w,o.h,8);ctx.fill();

    // subtle inner shadow at top
    ctx.fillStyle='rgba(0,0,0,0.04)';
    ctx.beginPath();ctx.roundRect(o.x,oy,o.w,16,[8,8,0,0]);ctx.fill();

    // EMOJI — large and perfectly centered
    // Use fixed large size relative to box, not min(w,h)
    const emojiSize = Math.round(Math.min(o.w, o.h) * 0.72);
    ctx.font=`${emojiSize}px sans-serif`;
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    // slight upward offset so emoji sits above the color bar
    ctx.fillText(o.e, cx, cy - 4);

    // danger glow when close
    const dist=o.x-(78+42);
    if(dist<100&&dist>0){
      const alpha=0.7*(1-dist/100);
      ctx.strokeStyle=`rgba(220,50,50,${alpha})`;
      ctx.lineWidth=3.5;
      ctx.beginPath();ctx.roundRect(o.x-4,oy-4,o.w+8,o.h+8,12);ctx.stroke();
    }
  });
}

function drawCoins(){
  coins.forEach(c=>{
    if(c.done)return;
    c.a=(c.a||0)+.07;
    const pulse=1+Math.sin(c.a)*.15;
    const r=c.r*pulse;
    // outer glow
    ctx.fillStyle='rgba(56,196,240,0.18)';
    ctx.beginPath();ctx.arc(c.x,c.y,r+8,0,Math.PI*2);ctx.fill();
    // body
    ctx.fillStyle='#38C4F0';
    ctx.beginPath();ctx.arc(c.x,c.y,r,0,Math.PI*2);ctx.fill();
    // shine
    ctx.fillStyle='rgba(255,255,255,0.5)';
    ctx.beginPath();ctx.arc(c.x-r*.25,c.y-r*.25,r*.35,0,Math.PI*2);ctx.fill();
    // shield emoji
    ctx.font=`${Math.round(r*1.3)}px sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('🛡️',c.x,c.y+1);
  });
}

function drawParts(){
  parts.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});
  ctx.globalAlpha=1;
}

function addBurst(x,y){
  const cols=['#534AB7','#E24B4A','#EF9F27','#1D9E75','#CECBF6','#F7C1C1','#85B7EB'];
  for(let i=0;i<28;i++) parts.push({x,y,vx:(Math.random()-.5)*12,vy:(Math.random()-.5)*12,life:1,r:Math.random()*6+2,col:cols[Math.floor(Math.random()*cols.length)]});
}

// ═══════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════
function doJump(){
  if(dodel.jumpsLeft<=0) return;
  const power = dodel.jumpsLeft===2 ? JUMP_POWER : JUMP_POWER*.82;
  dodel.vy=power;
  dodel.jumpsLeft--;
  dodel.onGround=false;
  dodel.squish=1.3; dodel.squishV=-.06;
  for(let i=0;i<8;i++) parts.push({
    x:dodel.x+20, y:dodel.y+dodel.h,
    vx:(Math.random()-.5)*5, vy:-Math.random()*3-1,
    life:1, r:Math.random()*3+2,
    col:['#CECBF6','#B4B2A9','#8880CC'][Math.floor(Math.random()*3)]
  });
  updateJumpDots();
}

// ── INPUT: works everywhere (preview, Safari, Chrome, desktop) ──
let lastTap=0;

function handleTap(e){
  if(e&&e.cancelable) e.preventDefault();
  const now=Date.now();
  // debounce: ignore if fired twice within 80ms (ghost click guard)
  if(now-lastTap<80) return;
  lastTap=now;
  if(STATE==='playing') doJump();
  else if(STATE==='start') startGame();
  else if(STATE==='dead') startGame();
}

// touchend: most reliable on iOS Safari & WebViews
document.addEventListener('touchend', handleTap, {passive:false});

// click: desktop mice + fallback for environments that only fire click
document.addEventListener('click', handleTap);

// Spacebar
document.addEventListener('keydown',e=>{
  if(e.code==='Space'&&!e.repeat){ e.preventDefault(); handleTap(e); }
});

document.getElementById('shareBtn').addEventListener('click',e=>{
  e.stopPropagation();
  e.preventDefault();
  lastTap=Date.now(); // prevent tap-through to game
  const s=document.getElementById('fs').textContent;
  const msg=(document.getElementById('dm').textContent||'').replace(/\n/g,' ');
  const text=`${s}s Büroalltag überlebt!\n"${msg}"\n🏃 #DudelDash`;
  if(navigator.share)navigator.share({text}).catch(()=>{});
  else{try{navigator.clipboard.writeText(text);}catch(e){}alert('Kopiert!\n\n'+text);}
});

// ═══════════════════════════════════════════════
// COLLISION
// ═══════════════════════════════════════════════
function hits(a,b){
  const p=9;
  return a.x+p<b.x+b.w&&a.x+a.w-p>b.x&&a.y+p<b.y+b.h&&a.y+a.h-p>b.y;
}

// ═══════════════════════════════════════════════
// DEATH & RESTART
// ═══════════════════════════════════════════════
let deathRaf=null;
function stopAll(){
  if(raf){cancelAnimationFrame(raf);raf=null;}
  if(deathRaf){cancelAnimationFrame(deathRaf);deathRaf=null;}
}

function die(msg){
  if(STATE==='dying'||STATE==='dead')return;
  STATE='dying';
  stopAll();
  hitMsg=msg||'Montag hat gesiegt. Wieder mal. 😮‍💨';
  best=Math.max(best,score);
  try{localStorage.setItem('dd_best',best);}catch(e){}
  addBurst(dodel.x+20,dodel.y+40);
  let t=0;
  function da(){
    t++;
    parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.38;p.life-=.035;});
    parts=parts.filter(p=>p.life>0);
    ctx.clearRect(0,0,W,H);drawBg();drawObs();drawCoins();drawParts();
    drawDudel(ctx,dodel.x,dodel.y,dodel.f,true,spd,1);
    if(t<45){deathRaf=requestAnimationFrame(da);}
    else{
      STATE='dead';
      document.getElementById('fs').textContent=score;
      document.getElementById('dm').textContent=hitMsg;
      document.getElementById('bc').textContent=`Best: ${best}`;
      document.getElementById('deathS').style.display='flex';
    }
  }
  deathRaf=requestAnimationFrame(da);
}

function startGame(){
  stopAll();
  document.getElementById('deathS').style.display='none';
  document.getElementById('startS').style.display='none';
  resetAll();
  STATE='playing';
  loop();
}

// ═══════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════
function loop(){
  if(STATE!=='playing'){raf=null;return;}
  frame++;

  // physics
  dodel.vy+=GRAVITY;
  dodel.y+=dodel.vy;
  if(dodel.y>=GY-dodel.h){
    dodel.y=GY-dodel.h;
    if(!dodel.onGround){dodel.squish=1.25;dodel.squishV=-.05;}
    dodel.vy=0;dodel.onGround=true;dodel.jumpsLeft=2;
  } else { dodel.onGround=false; }

  // squish spring
  dodel.squishV+=(1-dodel.squish)*.3;
  dodel.squishV*=.7;
  dodel.squish+=dodel.squishV;
  dodel.squish=Math.max(.8,Math.min(1.4,dodel.squish));

  dodel.f++;
  updateJumpDots();

  // speed ramp
  spd=4+Math.floor(frame/240)*.45;

  // spawn with variable gaps
  spawnTimer++;
  if(spawnTimer>=nextSpawn) spawnObs();

  coinTimer++;
  if(coinTimer>Math.floor(80+Math.random()*60)){
    coins.push({x:W+20,y:GY-100-Math.random()*100,r:10,done:false,a:0});
    coinTimer=0;
  }

  // move everything
  obstacles.forEach(o=>o.x-=spd);
  obstacles=obstacles.filter(o=>o.x+o.w>-30);
  coins.forEach(c=>c.x-=spd);
  coins=coins.filter(c=>c.x>-30&&!c.done);
  parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.18;p.life-=.04;});
  parts=parts.filter(p=>p.life>0);

  // score tick
  if(frame%60===0) score++;

  // collision check
  for(const o of obstacles){
    if(hits(dodel,{x:o.x,y:o.y,w:o.w,h:o.h})){die(o.msg);return;}
  }
  for(const c of coins){
    const dx=c.x-(dodel.x+20),dy=c.y-(dodel.y+40);
    if(Math.sqrt(dx*dx+dy*dy)<c.r+20){
      c.done=true;
      shieldCoins++;
      for(let i=0;i<7;i++) parts.push({x:c.x,y:c.y,vx:(Math.random()-.5)*6,vy:-Math.random()*4-1,life:1,r:Math.random()*4+2,col:'#38C4F0'});
      if(shieldCoins>=5){
        shieldCoins=0; shieldActive=true; shieldTimer=0;
        for(let i=0;i<16;i++) parts.push({x:dodel.x+20,y:dodel.y+40,vx:(Math.random()-.5)*9,vy:(Math.random()-.5)*9,life:1,r:Math.random()*6+3,col:'#38C4F0'});
      }
    }
  }
  if(shieldActive){ shieldTimer++; if(shieldTimer>360) shieldActive=false; }

  // draw
  ctx.clearRect(0,0,W,H);
  drawBg();drawCoins();drawParts();
  drawDudel(ctx,dodel.x,dodel.y,dodel.f,false,spd,dodel.squish);
  drawObs();

  // shield HUD
  const sdots=document.getElementById('jind');
  // coin counter
  ctx.save();
  ctx.fillStyle=shieldActive?'rgba(56,196,240,0.25)':'rgba(0,0,0,0.12)';
  ctx.beginPath();ctx.roundRect(10,H-52,90,34,17);ctx.fill();
  ctx.font='13px sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillStyle=shieldActive?'#38C4F0':'rgba(0,0,0,0.5)';
  // draw 5 mini dots
  for(let i=0;i<5;i++){
    ctx.fillStyle=i<shieldCoins?'#38C4F0':'rgba(0,0,0,0.2)';
    ctx.beginPath();ctx.arc(22+i*15,H-35,5,0,Math.PI*2);ctx.fill();
  }
  ctx.fillStyle=shieldActive?'#38C4F0':'rgba(0,0,0,0.4)';
  ctx.font='10px sans-serif';ctx.textAlign='center';
  ctx.fillText(shieldActive?'🛡️ AKTIV':'🛡️ '+shieldCoins+'/5',55,H-52+34+10);
  // shield glow on dudel when active
  if(shieldActive){
    ctx.fillStyle='rgba(56,196,240,0.12)';
    ctx.beginPath();ctx.ellipse(dodel.x+20,dodel.y+40,34,44,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=`rgba(56,196,240,${0.4+Math.sin(frame*.15)*.3})`;
    ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(dodel.x+20,dodel.y+40,34,44,0,0,Math.PI*2);ctx.stroke();
  }
  ctx.restore();
  // Shield HUD (bottom left)
  ctx.save();
  ctx.fillStyle=shieldActive?'rgba(56,196,240,0.22)':'rgba(0,0,0,0.1)';
  ctx.beginPath();ctx.roundRect(10,H-54,104,36,18);ctx.fill();
  for(let i=0;i<5;i++){
    ctx.fillStyle=i<shieldCoins?'#38C4F0':'rgba(0,0,0,0.18)';
    ctx.beginPath();ctx.arc(24+i*16,H-36,6,0,Math.PI*2);ctx.fill();
  }
  ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillStyle=shieldActive?'#38C4F0':'rgba(0,0,0,0.35)';
  ctx.fillText(shieldActive?'🛡️ AKTIV!':'Schilde: '+shieldCoins+'/5',62,H-20);
  // dudel shield glow
  if(shieldActive){
    ctx.strokeStyle=`rgba(56,196,240,${0.35+Math.sin(frame*.18)*.25})`;
    ctx.lineWidth=4;
    ctx.beginPath();ctx.ellipse(dodel.x+20,dodel.y+38,36,46,0,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(56,196,240,0.08)';
    ctx.beginPath();ctx.ellipse(dodel.x+20,dodel.y+38,36,46,0,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  document.getElementById('sc').textContent=score;
  let b=best;try{b=Math.max(parseInt(localStorage.getItem('dd_best')||'0'),score);}catch(e){}
  document.getElementById('bc').textContent=`Best: ${b}`;

  raf=requestAnimationFrame(loop);
}

// ═══════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════
document.getElementById('bc').textContent=`Best: ${best}`;
resetAll();
// static first frame
ctx.clearRect(0,0,W,H);drawBg();
// preview dudel
const pc=document.getElementById('preview').getContext('2d');
pc.clearRect(0,0,56,80);
drawDudel(pc,-2,4,0,false,0,1);
