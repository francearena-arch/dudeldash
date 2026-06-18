// ═══════════════════════════════════════════════
// IN-APP BROWSER DETECTION
// ═══════════════════════════════════════════════
(function(){
  const ua=navigator.userAgent;
  const inApp=/FBAN|FBAV|Instagram|Twitter|Line|Snapchat|MicroMessenger/i.test(ua);
  if(inApp) document.getElementById('openBtn').style.display='block';
})();

// ═══════════════════════════════════════════════
// SOUND SYSTEM — synthesized via Web Audio API
// (no audio files needed, everything procedural)
// ═══════════════════════════════════════════════
const SFX = (function(){
  let actx = null;
  let muted = false;
  try{ muted = localStorage.getItem('dd_muted')==='1'; }catch(e){}

  function ctxReady(){
    if(!actx){
      try{ actx = new (window.AudioContext||window.webkitAudioContext)(); }
      catch(e){ return null; }
    }
    if(actx.state==='suspended') actx.resume();
    return actx;
  }

  // Unlock audio context on first user interaction (required by browsers)
  function unlock(){
    const c = ctxReady();
    if(c && c.state==='suspended') c.resume();
  }
  document.addEventListener('touchend', unlock, {once:true, passive:true});
  document.addEventListener('click', unlock, {once:true});

  function tone(freq, dur, type, vol, glideTo){
    if(muted) return;
    const c = ctxReady();
    if(!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if(glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, c.currentTime + dur);
    gain.gain.setValueAtTime(vol||0.15, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + dur);
  }

  function noiseBurst(dur, vol){
    if(muted) return;
    const c = ctxReady();
    if(!c) return;
    const bufferSize = c.sampleRate * dur;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1) * (1 - i/bufferSize);
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol||0.2, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 1800;
    noise.connect(filter); filter.connect(gain); gain.connect(c.destination);
    noise.start();
  }

  return {
    jump(){ tone(420, 0.13, 'triangle', 0.16, 620); },
    doubleJump(){ tone(520, 0.14, 'triangle', 0.17, 760); },
    land(){ tone(160, 0.07, 'sine', 0.10, 90); },
    hit(){
      // comic "bonk" — low thud + noise crack
      tone(110, 0.22, 'sawtooth', 0.22, 55);
      noiseBurst(0.18, 0.18);
    },
    score(){ tone(880, 0.07, 'sine', 0.05, 880); },
    tap(){ tone(300, 0.05, 'sine', 0.06); },
    toggleMute(){
      muted = !muted;
      try{ localStorage.setItem('dd_muted', muted?'1':'0'); }catch(e){}
      return muted;
    },
    isMuted(){ return muted; }
  };
})();

// ═══════════════════════════════════════════════
// CANVAS & RESPONSIVE SETUP
// ═══════════════════════════════════════════════
const gc=document.getElementById('gc');
const ctx=gc.getContext('2d');

// Fixed logical game coordinate system (design resolution).
// We always draw using these numbers; the canvas is then
// scaled via devicePixelRatio + CSS to fill the real screen.
const GAME_W=480, GAME_H=854;   // 9:16 portrait design canvas
let GY = GAME_H - 110;          // ground line (recalculated on resize for safe-area)
const GRAVITY=0.62;
const JUMP_POWER=-15;

function resize(){
  const dpr = window.devicePixelRatio || 1;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  // CSS size: fill the screen
  gc.style.width  = screenW + 'px';
  gc.style.height = screenH + 'px';

  // Backing store size: scaled for device pixel ratio
  gc.width  = Math.round(screenW * dpr);
  gc.height = Math.round(screenH * dpr);

  // Compute uniform scale so our GAME_W x GAME_H logical canvas
  // covers the screen with a "cover" behavior (fill, crop overflow)
  const scaleX = screenW / GAME_W;
  const scaleY = screenH / GAME_H;
  const scale = Math.max(scaleX, scaleY); // cover (fill screen, crop excess)

  // center the logical canvas within the real screen
  const offsetX = (screenW - GAME_W*scale) / 2;
  const offsetY = (screenH - GAME_H*scale) / 2;

  // Apply transform: device pixels -> CSS pixels -> game logical pixels
  ctx.setTransform(dpr*scale, 0, 0, dpr*scale, dpr*offsetX, dpr*offsetY);

  GY = GAME_H - Math.max(90, 70 + safeBottom());
}

function safeBottom(){
  // crude safe-area read (iOS notch devices) via CSS env var fallback
  const probe=document.createElement('div');
  probe.style.cssText='position:fixed;bottom:0;padding-bottom:env(safe-area-inset-bottom);';
  document.body.appendChild(probe);
  const v=parseInt(getComputedStyle(probe).paddingBottom)||0;
  document.body.removeChild(probe);
  return v;
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

// ═══════════════════════════════════════════════
// OBSTACLE DEFINITIONS — pixel-art office hazards
// ═══════════════════════════════════════════════
// type: 'boss' (chef), 'karen' (coffee colleague), 'hr' (HR person),
//       'computer', 'printer', 'chair', 'phone', 'folder', 'meeting',
//       'form', 'presentation'
const OBS_DATA=[
  {type:'boss', w:46, h:88, msgs:[
    'Chef zwingt dich zu 3h Überstunden.\nUnbezahlt, natürlich. 😩',
    'Der Chef will ein "kurzes Gespräch".\n47 Minuten später bist du noch dort. ⏱️',
    'Chef erklärt dir, du seist wie "Teil der Familie".\nDann streicht er dein Weihnachtsgeld. 🎄',
    'Chef: "Das ist kein Job, das ist eine Berufung!"\nDu: "Berufungen werden aber besser bezahlt." 💸',
    'Chef fragt ob du "mal kurz 5 Minuten" Zeit hast.\nEs ist jetzt 19:00 Uhr. 🌙',
  ]},
  {type:'computer', w:62, h:54, msgs:[
    '700 ungelesene E-Mails warten auf dich.\nAllen wurde du in CC gesetzt. 📧💀',
    'Windows Update startet mitten in deiner Präsentation.\nNeustart in 3... 2... 1... 🔄',
    'Dein PC friert ein. IT antwortet in 3-5 Werktagen. ❄️',
    'Du öffnest Excel. Excel öffnet 12 "Wiederhergestellte Dateien". 📊😱',
    'Zoom-Call. Kamera an. Du warst noch im Pyjama. 📸',
  ]},
  {type:'printer', w:58, h:50, msgs:[
    'Papierstau. Du musst 400 Seiten manuell einscannen. 🗃️',
    'Drucker offline. Immer. Überall. Für immer. 🖨️❌',
    'Tinte leer. Neue Patrone bestellt: Lieferzeit 6 Wochen. 🖋️',
    'Du musst 80 Formulare drucken, unterschreiben\nund erneut einscannen. Per Fax senden. 📠',
    'Drucker druckt alles doppelt. Ausser wenn du es brauchst. 🙃',
  ]},
  {type:'karen', w:42, h:84, msgs:[
    'Kollege Hansi erzählt dir 25 Minuten lang\nvon seinem Urlaub in Rimini. ☕😐',
    'Du wolltest Kaffee holen.\nJetzt hörst du Melanies Baupläne für ihr Haus. 🏠',
    'Kaffeepause dauert jetzt 40 Minuten,\nweil jemand "einfach kurz" reden wollte. 💬',
    'Kaffeeküche: Wo Produktivität stirbt\nund Tratsch entsteht. RIP. ⚰️',
    'Jemand hat deine Lieblingstasse benutzt.\nUnd nicht gespült. 😤',
  ]},
  {type:'presentation', w:60, h:56, msgs:[
    'Notfall-Präsentation bis 17:00 Uhr.\nVorbereitung: 0 Minuten. 📊😱',
    'Q4-Review: 83 Slides, 12 Stakeholder,\n1 funktionierender Beamer. Keiner. 📽️',
    'Daten stimmen nicht. Chef will "trotzdem präsentieren".\n"Wir improvisieren einfach!" 🤡',
    'Pivottabelle korrumpiert.\nDie Zahlen ergeben keinen Sinn mehr.\nSie haben es vorher auch nicht. 🔢',
    'Auftrag: "Mach das mal schnell schön." Deadline: gestern. 🎨',
  ]},
  {type:'folder', w:50, h:58, msgs:[
    'Du musst das Archiv von 2009 digitalisieren.\nAlleine. Diese Woche. 🗂️😭',
    '17 Ordner mit "WICHTIG_FINAL_v3_NEU_2.pdf".\nDu weißt nicht welcher der richtige ist. 📂',
    'Neues Ablagesystem eingeführt.\nNiemand wurde informiert.\nDu findest nichts mehr. 🔍',
    'Formular A-27b: Dreifach ausgefüllt,\nunterschrieben, gestempelt und per Post. 2026. 📮',
    'Du sollst "mal eben" 5 Jahre Buchhaltung prüfen. Bis Freitag. 📚',
  ]},
  {type:'hr', w:42, h:86, msgs:[
    'HR lädt zum "kurzen Gespräch" ein.\n3 Stunden und 1 Teambuilding-Übung später... 🧑‍💼😬',
    'Neues Kompetenzframework wird eingeführt.\nDu wirst in "Kategorie Sonstige" eingeordnet. 📋',
    'Performance Review:\n"Gut, aber du könntest dich mehr engagieren."\nDu arbeitest 10h täglich. 😶',
    'HR schickt die falsche Gehaltsabrechnung.\nKlärung dauert "ein paar Wochen". 💶',
    'Pflichtschulung: Compliance. 6 Stunden.\nKein Ton. Nur PowerPoint. 😴',
  ]},
  {type:'phone', w:44, h:50, msgs:[
    'Telefonkonferenz mit 40 Leuten.\nNiemand ist vorbereitet. Du auch nicht. 📞🤦',
    'Call startet 20 Minuten zu spät\nweil jemand "technische Probleme" hat. 🔇',
    'Du wirst zum Protokollführen eingeteilt.\nNiemand wusste das. Du auch nicht. 📝',
    'Jemand ist die ganze Zeit auf Mute\nund merkt es nicht. Das bist du. 🎙️',
    '"Können wir das kurz vertagen?" – nach 90 Minuten. 📅',
  ]},
  {type:'chair', w:54, h:60, msgs:[
    'Dein ergonomischer Stuhl wurde\n"umgezogen". Du sitzt auf Kisten. 🪑😤',
    'Neues Open-Space-Konzept eingeführt.\nDein Schreibtisch existiert nicht mehr. 🏢',
    'Homeoffice-Tag gestrichen wegen\n"Teamspirit". Dein Weg: 90 Minuten. 🚇',
    'Sitznachbar telefoniert\nstundenlang auf Lautsprecher.\n"Tut mir leid, kurzes Gespräch." 🔊',
    'Neues Grossraumbüro. Kein Fenster.\nKlimaanlage auf 16°C. 🥶',
  ]},
  {type:'form', w:48, h:58, msgs:[
    'Neues Ticketsystem eingeführt.\nFür jede Kaffeepause brauchst du ein Ticket. 🎫',
    'Dein Urlaubsantrag braucht\n4 Unterschriften, 2 Manager und einen Notar. ✍️',
    'Compliance-Schulung: 6 Stunden.\nPflichtveranstaltung. Kein Ton. Powerpoint. 😴',
    'Zeiterfassung auf 15-Minuten-Intervalle umgestellt.\nDu erfasst jetzt deine Toilettenpausen. 🚽',
    'Neues Passwort-Richtlinie: 32 Zeichen,\nSonderzeichen, täglich ändern. 🔐',
  ]},
  {type:'meeting', w:56, h:52, msgs:[
    'Meeting über das Meeting, das das\nMeeting geplant hat. Startet 20min zu spät. 🗓️',
    'Dein gesamter Freitagnachmittag:\n1 Meeting. Hätte eine E-Mail sein können. 📨',
    'Recurring Meeting seit 2019.\nNiemand weiß mehr wofür es ist.\nAlle kommen trotzdem. 👻',
    'Agenda: "Diverses"\nDauer: 2 Stunden\nErgebnis: Nächstes Meeting geplant. 🔁',
    '"Kurzes Alignment-Call" um 17:45 Uhr. Jeden Freitag. 😭',
  ]},
];

function randMsg(obs){ return obs.msgs[Math.floor(Math.random()*obs.msgs.length)]; }

// ═══════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════
let STATE='start'; // start | playing | dying | dead
let dodel,obstacles,parts,score,best=0,frame,spd,raf=null;
let spawnTimer=0,hitMsg='',jumpCount=0;
let shakeAmount=0;

function applyShake(){
  if(shakeAmount>0.5){
    const sx=(Math.random()-0.5)*shakeAmount;
    const sy=(Math.random()-0.5)*shakeAmount;
    ctx.translate(sx,sy);
    shakeAmount*=0.82; // decay
  } else {
    shakeAmount=0;
  }
}

try{ best=parseInt(localStorage.getItem('dd_best')||'0'); }catch(e){}

function nextGap(){
  const base = 130 - Math.floor(frame/300)*7;
  const minGap = Math.max(52, 70 - Math.floor(frame/600)*5);
  const r = Math.random();
  let gap;
  if(r < 0.25)      gap = minGap + Math.random()*25;
  else if(r < 0.65) gap = minGap + 30 + Math.random()*50;
  else              gap = minGap + 90 + Math.random()*80;
  return Math.min(gap, base);
}
let nextSpawn=100;

function resetAll(){
  dodel={x:GAME_W*0.18,y:GY-80,vy:0,w:40,h:80,onGround:false,jumpsLeft:2,f:0,squish:1,squishV:0};
  obstacles=[];parts=[];
  score=0;frame=0;spd=4;
  spawnTimer=0;jumpCount=0;
  nextSpawn=nextGap();
  updateJumpDots();
}

function updateJumpDots(){
  document.getElementById('j0').className='jdot'+(dodel&&dodel.jumpsLeft>=1?' active':'');
  document.getElementById('j1').className='jdot'+(dodel&&dodel.jumpsLeft>=2?' active':'');
}

// ═══════════════════════════════════════════════
// DUDEL — pixel-art office worker (player)
// ═══════════════════════════════════════════════
function drawDudel(c,x,y,f,dead,spd,sq){
  const bob=dead?0:Math.sin(f*.22)*1.8*(dodel&&dodel.onGround?1:0);
  const by=y+bob;
  const sy=sq||1;
  const sx=dead?1:(2-sy);

  function applySquish(cx,cy){ c.translate(cx,cy);c.scale(sx,sy);c.translate(-cx,-cy); }

  const cx=x+20;
  c.save();

  if(!dead){
    c.fillStyle='rgba(0,0,0,0.25)';
    c.beginPath();c.ellipse(cx,GY+3,18*sx,5,0,0,Math.PI*2);c.fill();
  }

  if(!dead){
    const ls=Math.sin(f*.4)*8;
    c.fillStyle='#1E1C35';
    c.save();applySquish(x+14,by+56);
    c.beginPath();c.roundRect(x+10,by+52,12,22,[3,3,5,5]);c.fill();
    c.restore();
    c.save();applySquish(x+28,by+56+ls);
    c.fillStyle='#28263E';
    c.beginPath();c.roundRect(x+22,by+52+ls*.4,12,22-ls*.3,[3,3,5,5]);c.fill();
    c.restore();
    c.fillStyle='#0E0C1A';
    c.beginPath();c.ellipse(x+16,by+74,10,5,-.08,0,Math.PI*2);c.fill();
    c.beginPath();c.ellipse(x+16,by+74,7,3.5,-.08,0,Math.PI,true);c.fillStyle='#1A1828';c.fill();
    c.fillStyle='#0E0C1A';
    c.beginPath();c.ellipse(x+29,by+74+ls*.3,10,5,-.08,0,Math.PI*2);c.fill();
  }

  c.save();applySquish(cx,by+38);
  c.fillStyle='#EAF0FA';
  c.beginPath();c.roundRect(x+7,by+26,26,28,[3,3,4,4]);c.fill();
  c.restore();

  c.save();applySquish(cx,by+38);
  c.fillStyle='#3832A8';
  c.beginPath();c.moveTo(x+7,by+26);c.lineTo(x+17,by+26);c.lineTo(x+14,by+54);c.lineTo(x+7,by+54);c.closePath();c.fill();
  c.beginPath();c.moveTo(x+33,by+26);c.lineTo(x+23,by+26);c.lineTo(x+26,by+54);c.lineTo(x+33,by+54);c.closePath();c.fill();
  c.fillStyle='#3D36A0';
  c.beginPath();c.moveTo(x+11,by+26);c.lineTo(x+20,by+36);c.lineTo(x+20,by+26);c.closePath();c.fill();
  c.beginPath();c.moveTo(x+29,by+26);c.lineTo(x+20,by+36);c.lineTo(x+20,by+26);c.closePath();c.fill();
  c.restore();

  c.fillStyle='#B0BEDD';
  for(let i=0;i<3;i++){c.beginPath();c.arc(cx,by+32+i*7,1.5,0,Math.PI*2);c.fill();}

  c.save();applySquish(cx,by+42);
  c.fillStyle='#C42030';
  c.beginPath();c.moveTo(x+18,by+28);c.lineTo(x+22,by+28);c.lineTo(x+21,by+46);c.lineTo(x+20,by+51);c.lineTo(x+19,by+46);c.closePath();c.fill();
  c.fillStyle='#8B1520';c.beginPath();c.roundRect(x+17,by+26,6,5,2);c.fill();
  c.restore();

  const as=Math.sin(f*.4)*6;
  c.save();applySquish(cx,by+36);
  c.fillStyle='#3832A8';
  c.beginPath();c.roundRect(x-3,by+27+as,11,24,[4,4,3,3]);c.fill();
  c.fillStyle='#D0D8F0';c.beginPath();c.roundRect(x-3,by+46+as,11,6,[2,2,4,4]);c.fill();
  c.fillStyle='#4A2808';c.beginPath();c.roundRect(x-14,by+47+as,17,13,3);c.fill();
  c.fillStyle='#6A3A10';c.beginPath();c.roundRect(x-11,by+44+as,11,5,2);c.fill();
  c.strokeStyle='#2A1404';c.lineWidth=1.5;
  c.beginPath();c.moveTo(x-9,by+52+as);c.lineTo(x+1,by+52+as);c.stroke();
  c.fillStyle='#3832A8';
  c.beginPath();c.roundRect(x+32,by+27-as,11,22,[4,4,3,3]);c.fill();
  c.fillStyle='#D0D8F0';c.beginPath();c.roundRect(x+32,by+44-as,11,5,[2,2,4,4]);c.fill();
  c.restore();

  c.fillStyle='#E8B060';
  c.beginPath();c.roundRect(x+16,by+20,8,8,2);c.fill();

  c.save();applySquish(cx,by+12);
  c.fillStyle='#F0B868';
  c.beginPath();
  c.moveTo(x+8,by+4);
  c.bezierCurveTo(x+8,by,x+32,by,x+32,by+4);
  c.lineTo(x+33,by+18);
  c.bezierCurveTo(x+33,by+28,x+7,by+28,x+7,by+18);
  c.closePath();c.fill();
  c.restore();

  c.fillStyle='#E0A050';
  c.beginPath();c.ellipse(x+7,by+14,3.5,5,-.1,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(x+33,by+14,3.5,5,.1,0,Math.PI*2);c.fill();

  c.fillStyle='#1A1420';
  c.beginPath();
  c.moveTo(x+7,by+5);
  c.bezierCurveTo(x+7,by-.5,x+33,by-.5,x+33,by+5);
  c.lineTo(x+32,by+9);
  c.bezierCurveTo(x+22,by+6,x+18,by+6,x+8,by+9);
  c.closePath();c.fill();
  c.fillStyle='rgba(255,255,255,0.06)';
  c.beginPath();c.roundRect(x+10,by+1,8,5,[3,3,1,1]);c.fill();

  if(dead){
    c.strokeStyle='#8B4010';c.lineWidth=2.5;c.lineCap='round';
    c.beginPath();c.moveTo(x+12,by+11);c.lineTo(x+17,by+16);c.moveTo(x+17,by+11);c.lineTo(x+12,by+16);c.stroke();
    c.beginPath();c.moveTo(x+24,by+11);c.lineTo(x+29,by+16);c.moveTo(x+29,by+11);c.lineTo(x+24,by+16);c.stroke();
    c.strokeStyle='#8B4010';c.lineWidth=1.8;
    c.beginPath();c.moveTo(x+12,by+23);c.quadraticCurveTo(x+17,by+27,x+20,by+24);c.quadraticCurveTo(x+23,by+21,x+28,by+25);c.stroke();
    c.fillStyle='#EF9F27';
    const stars=[[x+6,by+6],[x+33,by+4],[x+5,by+24]];
    stars.forEach(([sx,sy])=>{
      c.font='10px sans-serif';c.textAlign='center';c.textBaseline='middle';
      c.fillText('★',sx,sy);
    });
  } else {
    c.fillStyle='#fff';
    c.beginPath();c.ellipse(x+14.5,by+14,4.5,3.5,0,0,Math.PI*2);c.fill();
    c.beginPath();c.ellipse(x+26.5,by+14,4.5,3.5,0,0,Math.PI*2);c.fill();
    c.fillStyle='#1A0E06';
    c.beginPath();c.ellipse(x+15.5,by+14.5,2.5,3,0,0,Math.PI*2);c.fill();
    c.beginPath();c.ellipse(x+27.5,by+14.5,2.5,3,0,0,Math.PI*2);c.fill();
    c.fillStyle='#F0B868';
    c.beginPath();c.roundRect(x+10,by+10,10,4.5,[2,2,0,0]);c.fill();
    c.beginPath();c.roundRect(x+22,by+10,10,4.5,[2,2,0,0]);c.fill();
    c.fillStyle='rgba(0,0,0,0.1)';
    c.beginPath();c.ellipse(x+14.5,by+17,4,2,0,0,Math.PI*2);c.fill();
    c.beginPath();c.ellipse(x+26.5,by+17,4,2,0,0,Math.PI*2);c.fill();
    c.strokeStyle='#A06828';c.lineWidth=1.5;c.lineCap='round';
    if(spd>7.5){
      c.fillStyle='#7A3010';
      c.beginPath();c.ellipse(x+20,by+23,4,3,0,0,Math.PI*2);c.fill();
    } else {
      c.beginPath();c.moveTo(x+13,by+22);c.quadraticCurveTo(x+20,by+26,x+27,by+22);c.stroke();
    }
    if(!dodel.onGround||spd>6){
      c.fillStyle='rgba(100,170,230,0.8)';
      c.beginPath();c.moveTo(x+34,by+8);c.quadraticCurveTo(x+38,by+14,x+34,by+19);c.quadraticCurveTo(x+30,by+14,x+34,by+8);c.fill();
    }
  }
  c.restore();
}

// ═══════════════════════════════════════════════
// PIXEL-ART OBSTACLES — detailed, Dudel-style illustrations
// Each draws within a bounding box (o.x, o.y, o.w, o.h), origin top-left.
// ═══════════════════════════════════════════════

function drawBoss(c,o){
  // The Chef — broader build, darker suit, stern face, grey hair
  const x=o.x, y=o.y, w=o.w, h=o.h;
  const bodyTop=y+h*0.34;

  // shadow
  c.fillStyle='rgba(0,0,0,0.22)';
  c.beginPath();c.ellipse(x+w/2,y+h+4,w*0.42,6,0,0,Math.PI*2);c.fill();

  // legs
  c.fillStyle='#15131F';
  c.beginPath();c.roundRect(x+w*0.28,y+h*0.74,w*0.18,h*0.26,3);c.fill();
  c.beginPath();c.roundRect(x+w*0.54,y+h*0.74,w*0.18,h*0.26,3);c.fill();
  c.fillStyle='#0A0810';
  c.beginPath();c.ellipse(x+w*0.37,y+h*0.98,w*0.16,h*0.045,0,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(x+w*0.63,y+h*0.98,w*0.16,h*0.045,0,0,Math.PI*2);c.fill();

  // torso - dark navy suit, broader than Dudel
  c.fillStyle='#E8EEFA';
  c.beginPath();c.roundRect(x+w*0.18,bodyTop,w*0.64,h*0.42,[4,4,5,5]);c.fill();
  c.fillStyle='#1A1830';
  c.beginPath();c.moveTo(x+w*0.18,bodyTop);c.lineTo(x+w*0.36,bodyTop);c.lineTo(x+w*0.30,y+h*0.72);c.lineTo(x+w*0.16,y+h*0.72);c.closePath();c.fill();
  c.beginPath();c.moveTo(x+w*0.82,bodyTop);c.lineTo(x+w*0.64,bodyTop);c.lineTo(x+w*0.70,y+h*0.72);c.lineTo(x+w*0.84,y+h*0.72);c.closePath();c.fill();
  // lapels
  c.fillStyle='#26233F';
  c.beginPath();c.moveTo(x+w*0.30,bodyTop);c.lineTo(x+w*0.46,bodyTop+h*0.18);c.lineTo(x+w*0.46,bodyTop);c.closePath();c.fill();
  c.beginPath();c.moveTo(x+w*0.70,bodyTop);c.lineTo(x+w*0.54,bodyTop+h*0.18);c.lineTo(x+w*0.54,bodyTop);c.closePath();c.fill();
  // gold tie
  c.fillStyle='#D4A017';
  c.beginPath();
  c.moveTo(x+w*0.46,bodyTop+h*0.04);c.lineTo(x+w*0.54,bodyTop+h*0.04);
  c.lineTo(x+w*0.52,bodyTop+h*0.32);c.lineTo(x+w*0.50,bodyTop+h*0.38);c.lineTo(x+w*0.48,bodyTop+h*0.32);
  c.closePath();c.fill();

  // arms crossed/authoritative - simple at sides
  c.fillStyle='#1A1830';
  c.beginPath();c.roundRect(x+w*0.06,bodyTop+h*0.04,w*0.14,h*0.32,4);c.fill();
  c.beginPath();c.roundRect(x+w*0.80,bodyTop+h*0.04,w*0.14,h*0.32,4);c.fill();
  c.fillStyle='#D8D0C0';
  c.beginPath();c.roundRect(x+w*0.06,bodyTop+h*0.30,w*0.14,h*0.07,2);c.fill();
  c.beginPath();c.roundRect(x+w*0.80,bodyTop+h*0.30,w*0.14,h*0.07,2);c.fill();

  // neck
  c.fillStyle='#E0A868';
  c.beginPath();c.roundRect(x+w*0.40,bodyTop-h*0.07,w*0.20,h*0.09,2);c.fill();

  // head - rounder, older looking
  c.fillStyle='#E8AC6C';
  c.beginPath();c.ellipse(x+w*0.5,y+h*0.18,w*0.30,h*0.155,0,0,Math.PI*2);c.fill();

  // grey hair on sides (balding on top)
  c.fillStyle='#8A8A92';
  c.beginPath();c.ellipse(x+w*0.27,y+h*0.155,w*0.085,h*0.10,0.3,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(x+w*0.73,y+h*0.155,w*0.085,h*0.10,-0.3,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(x+w*0.5,y+h*0.05,w*0.20,h*0.05,0,0,Math.PI*2);c.fill();

  // eyebrows - stern, angled down (angry)
  c.strokeStyle='#5A5A60';c.lineWidth=2.2;c.lineCap='round';
  c.beginPath();c.moveTo(x+w*0.36,y+h*0.135);c.lineTo(x+w*0.45,y+h*0.16);c.stroke();
  c.beginPath();c.moveTo(x+w*0.64,y+h*0.135);c.lineTo(x+w*0.55,y+h*0.16);c.stroke();

  // eyes - narrow, stern
  c.fillStyle='#2A1810';
  c.beginPath();c.ellipse(x+w*0.40,y+h*0.185,w*0.025,h*0.018,0,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(x+w*0.60,y+h*0.185,w*0.025,h*0.018,0,0,Math.PI*2);c.fill();

  // mustache
  c.fillStyle='#787880';
  c.beginPath();c.ellipse(x+w*0.5,y+h*0.225,w*0.10,h*0.022,0,0,Math.PI*2);c.fill();

  // frown
  c.strokeStyle='#7A4010';c.lineWidth=1.8;c.lineCap='round';
  c.beginPath();c.moveTo(x+w*0.40,y+h*0.265);c.quadraticCurveTo(x+w*0.5,y+h*0.245,x+w*0.60,y+h*0.265);c.stroke();

  // pointing finger gesture (extends right arm forward slightly via small hand)
  c.fillStyle='#E0A868';
  c.beginPath();c.ellipse(x+w*0.87,y+h*0.40,w*0.045,h*0.03,0,0,Math.PI*2);c.fill();
}

function drawKaren(c,o){
  // Coffee colleague — blonde bun, mug in hand, talkative pose
  const x=o.x, y=o.y, w=o.w, h=o.h;
  const bodyTop=y+h*0.32;

  c.fillStyle='rgba(0,0,0,0.22)';
  c.beginPath();c.ellipse(x+w/2,y+h+4,w*0.40,6,0,0,Math.PI*2);c.fill();

  // legs - skirt/trousers
  c.fillStyle='#5A4A6A';
  c.beginPath();c.roundRect(x+w*0.30,y+h*0.72,w*0.16,h*0.26,3);c.fill();
  c.beginPath();c.roundRect(x+w*0.54,y+h*0.72,w*0.16,h*0.26,3);c.fill();
  c.fillStyle='#3A1A50';
  c.beginPath();c.ellipse(x+w*0.38,y+h*0.97,w*0.14,h*0.04,0,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(x+w*0.62,y+h*0.97,w*0.14,h*0.04,0,0,Math.PI*2);c.fill();

  // torso - pastel blouse
  c.fillStyle='#F5C9D8';
  c.beginPath();c.roundRect(x+w*0.20,bodyTop,w*0.60,h*0.40,[4,4,4,4]);c.fill();
  // cardigan sides
  c.fillStyle='#C99AB0';
  c.beginPath();c.moveTo(x+w*0.20,bodyTop);c.lineTo(x+w*0.34,bodyTop);c.lineTo(x+w*0.28,y+h*0.70);c.lineTo(x+w*0.18,y+h*0.70);c.closePath();c.fill();
  c.beginPath();c.moveTo(x+w*0.80,bodyTop);c.lineTo(x+w*0.66,bodyTop);c.lineTo(x+w*0.72,y+h*0.70);c.lineTo(x+w*0.82,y+h*0.70);c.closePath();c.fill();

  // necklace
  c.strokeStyle='#D4A017';c.lineWidth=1.5;
  c.beginPath();c.arc(x+w*0.5,bodyTop+h*0.06,w*0.10,0.15*Math.PI,0.85*Math.PI);c.stroke();

  // left arm bent holding mug up near face (talking pose)
  c.fillStyle='#C99AB0';
  c.beginPath();c.roundRect(x+w*0.06,bodyTop+h*0.02,w*0.13,h*0.20,4);c.fill();
  // forearm angled up
  c.save();
  c.translate(x+w*0.10,bodyTop+h*0.20);
  c.rotate(-0.9);
  c.fillStyle='#E8AC6C';
  c.beginPath();c.roundRect(-w*0.05,0,w*0.10,h*0.18,3);c.fill();
  c.restore();

  // coffee mug near face
  c.fillStyle='#FFFFFF';
  c.beginPath();c.roundRect(x+w*0.02,y+h*0.14,w*0.16,h*0.12,3);c.fill();
  c.fillStyle='#6A3A10';
  c.beginPath();c.roundRect(x+w*0.04,y+h*0.16,w*0.12,h*0.06,2);c.fill();
  c.strokeStyle='#D0D0D0';c.lineWidth=2;
  c.beginPath();c.ellipse(x-w*0.01,y+h*0.20,w*0.03,h*0.035,0,0,Math.PI*2);c.stroke();
  // steam
  c.strokeStyle='rgba(255,255,255,0.5)';c.lineWidth=1.5;c.lineCap='round';
  c.beginPath();c.moveTo(x+w*0.08,y+h*0.13);c.quadraticCurveTo(x+w*0.10,y+h*0.08,x+w*0.07,y+h*0.04);c.stroke();

  // right arm - gesturing while talking
  c.fillStyle='#C99AB0';
  c.beginPath();c.roundRect(x+w*0.81,bodyTop+h*0.02,w*0.13,h*0.18,4);c.fill();
  c.fillStyle='#E8AC6C';
  c.beginPath();c.ellipse(x+w*0.92,bodyTop+h*0.24,w*0.045,h*0.03,0.4,0,Math.PI*2);c.fill();

  // neck
  c.fillStyle='#E8AC6C';
  c.beginPath();c.roundRect(x+w*0.42,bodyTop-h*0.06,w*0.16,h*0.08,2);c.fill();

  // head
  c.fillStyle='#F0B878';
  c.beginPath();c.ellipse(x+w*0.5,y+h*0.16,w*0.27,h*0.145,0,0,Math.PI*2);c.fill();

  // blonde hair with bun
  c.fillStyle='#E8C158';
  c.beginPath();c.ellipse(x+w*0.5,y+h*0.10,w*0.30,h*0.13,0,Math.PI,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(x+w*0.5,y-h*0.02,w*0.10,h*0.06,0,0,Math.PI*2);c.fill(); // bun on top
  c.fillStyle='#D4AC48';
  c.beginPath();c.ellipse(x+w*0.22,y+h*0.14,w*0.05,h*0.08,0.2,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(x+w*0.78,y+h*0.14,w*0.05,h*0.08,-0.2,0,Math.PI*2);c.fill();

  // eyes - wide, mid-sentence expression
  c.fillStyle='#fff';
  c.beginPath();c.ellipse(x+w*0.41,y+h*0.165,w*0.035,h*0.022,0,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(x+w*0.59,y+h*0.165,w*0.035,h*0.022,0,0,Math.PI*2);c.fill();
  c.fillStyle='#3A2410';
  c.beginPath();c.ellipse(x+w*0.41,y+h*0.165,w*0.018,h*0.018,0,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(x+w*0.59,y+h*0.165,w*0.018,h*0.018,0,0,Math.PI*2);c.fill();

  // eyelashes/brows
  c.strokeStyle='#A87838';c.lineWidth=1.5;
  c.beginPath();c.moveTo(x+w*0.36,y+h*0.135);c.lineTo(x+w*0.46,y+h*0.135);c.stroke();
  c.beginPath();c.moveTo(x+w*0.54,y+h*0.135);c.lineTo(x+w*0.64,y+h*0.135);c.stroke();

  // open mouth (mid-talk)
  c.fillStyle='#A04030';
  c.beginPath();c.ellipse(x+w*0.5,y+h*0.225,w*0.05,h*0.025,0,0,Math.PI*2);c.fill();

  // blush
  c.fillStyle='rgba(240,150,150,0.35)';
  c.beginPath();c.ellipse(x+w*0.32,y+h*0.20,w*0.035,h*0.018,0,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(x+w*0.68,y+h*0.20,w*0.035,h*0.018,0,0,Math.PI*2);c.fill();
}

function drawHR(c,o){
  // HR person — clipboard, glasses, neutral professional look
  const x=o.x, y=o.y, w=o.w, h=o.h;
  const bodyTop=y+h*0.32;

  c.fillStyle='rgba(0,0,0,0.22)';
  c.beginPath();c.ellipse(x+w/2,y+h+4,w*0.40,6,0,0,Math.PI*2);c.fill();

  c.fillStyle='#2A2438';
  c.beginPath();c.roundRect(x+w*0.30,y+h*0.72,w*0.16,h*0.26,3);c.fill();
  c.beginPath();c.roundRect(x+w*0.54,y+h*0.72,w*0.16,h*0.26,3);c.fill();
  c.fillStyle='#15131F';
  c.beginPath();c.ellipse(x+w*0.38,y+h*0.97,w*0.14,h*0.04,0,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(x+w*0.62,y+h*0.97,w*0.14,h*0.04,0,0,Math.PI*2);c.fill();

  // teal blazer
  c.fillStyle='#E8EEFA';
  c.beginPath();c.roundRect(x+w*0.20,bodyTop,w*0.60,h*0.40,[4,4,4,4]);c.fill();
  c.fillStyle='#1A7068';
  c.beginPath();c.moveTo(x+w*0.20,bodyTop);c.lineTo(x+w*0.34,bodyTop);c.lineTo(x+w*0.28,y+h*0.70);c.lineTo(x+w*0.18,y+h*0.70);c.closePath();c.fill();
  c.beginPath();c.moveTo(x+w*0.80,bodyTop);c.lineTo(x+w*0.66,bodyTop);c.lineTo(x+w*0.72,y+h*0.70);c.lineTo(x+w*0.82,y+h*0.70);c.closePath();c.fill();
  c.fillStyle='#228077';
  c.beginPath();c.moveTo(x+w*0.32,bodyTop);c.lineTo(x+w*0.46,bodyTop+h*0.16);c.lineTo(x+w*0.46,bodyTop);c.closePath();c.fill();
  c.beginPath();c.moveTo(x+w*0.68,bodyTop);c.lineTo(x+w*0.54,bodyTop+h*0.16);c.lineTo(x+w*0.54,bodyTop);c.closePath();c.fill();

  // left arm holding clipboard
  c.fillStyle='#1A7068';
  c.beginPath();c.roundRect(x+w*0.07,bodyTop+h*0.05,w*0.13,h*0.22,4);c.fill();
  // clipboard
  c.fillStyle='#C9A468';
  c.beginPath();c.roundRect(x-w*0.02,bodyTop+h*0.18,w*0.20,h*0.26,3);c.fill();
  c.fillStyle='#FFFFFF';
  c.beginPath();c.roundRect(x,bodyTop+h*0.21,w*0.16,h*0.20,2);c.fill();
  c.strokeStyle='#B8B0A0';c.lineWidth=1;
  for(let i=0;i<3;i++){
    c.beginPath();c.moveTo(x+w*0.02,bodyTop+h*(0.25+i*0.05));c.lineTo(x+w*0.14,bodyTop+h*(0.25+i*0.05));c.stroke();
  }
  c.fillStyle='#888078';
  c.beginPath();c.roundRect(x+w*0.05,bodyTop+h*0.155,w*0.06,h*0.04,2);c.fill();

  // right arm at side
  c.fillStyle='#1A7068';
  c.beginPath();c.roundRect(x+w*0.80,bodyTop+h*0.05,w*0.13,h*0.22,4);c.fill();
  c.fillStyle='#E8AC6C';
  c.beginPath();c.ellipse(x+w*0.87,bodyTop+h*0.30,w*0.045,h*0.03,0,0,Math.PI*2);c.fill();

  c.fillStyle='#E8AC6C';
  c.beginPath();c.roundRect(x+w*0.42,bodyTop-h*0.06,w*0.16,h*0.08,2);c.fill();

  // head
  c.fillStyle='#F0B878';
  c.beginPath();c.ellipse(x+w*0.5,y+h*0.17,w*0.27,h*0.145,0,0,Math.PI*2);c.fill();

  // dark short hair, neat
  c.fillStyle='#241C14';
  c.beginPath();c.ellipse(x+w*0.5,y+h*0.10,w*0.29,h*0.115,0,Math.PI,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(x+w*0.5,y+h*0.045,w*0.27,h*0.05,0,0,Math.PI*2);c.fill();

  // glasses
  c.strokeStyle='#3A3A3A';c.lineWidth=2;
  c.beginPath();c.ellipse(x+w*0.40,y+h*0.175,w*0.07,h*0.045,0,0,Math.PI*2);c.stroke();
  c.beginPath();c.ellipse(x+w*0.60,y+h*0.175,w*0.07,h*0.045,0,0,Math.PI*2);c.stroke();
  c.beginPath();c.moveTo(x+w*0.47,y+h*0.175);c.lineTo(x+w*0.53,y+h*0.175);c.stroke();

  // eyes
  c.fillStyle='#2A1810';
  c.beginPath();c.ellipse(x+w*0.40,y+h*0.175,w*0.02,h*0.016,0,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(x+w*0.60,y+h*0.175,w*0.02,h*0.016,0,0,Math.PI*2);c.fill();

  // closed-lip neutral/judging smile
  c.strokeStyle='#A06828';c.lineWidth=1.6;c.lineCap='round';
  c.beginPath();c.moveTo(x+w*0.42,y+h*0.225);c.lineTo(x+w*0.58,y+h*0.225);c.stroke();
}

function drawComputer(c,o){
  const x=o.x, y=o.y, w=o.w, h=o.h;
  c.fillStyle='rgba(0,0,0,0.2)';
  c.beginPath();c.ellipse(x+w/2,y+h+3,w*0.42,5,0,0,Math.PI*2);c.fill();

  // desk surface
  c.fillStyle='#A0856A';
  c.beginPath();c.roundRect(x,y+h*0.72,w,h*0.18,[2,2,0,0]);c.fill();
  c.fillStyle='#8A7058';c.fillRect(x,y+h*0.86,w,h*0.05);
  // legs
  c.fillStyle='#7A6050';
  c.fillRect(x+w*0.08,y+h*0.90,w*0.08,h*0.10);
  c.fillRect(x+w*0.84,y+h*0.90,w*0.08,h*0.10);

  // monitor body
  c.fillStyle='#2A2A35';
  c.beginPath();c.roundRect(x+w*0.10,y,w*0.80,h*0.62,5);c.fill();
  // screen
  const sg=c.createLinearGradient(x+w*0.14,y+h*0.05,x+w*0.14,y+h*0.55);
  sg.addColorStop(0,'#1a3a6a');sg.addColorStop(1,'#0a1a3a');
  c.fillStyle=sg;
  c.beginPath();c.roundRect(x+w*0.14,y+h*0.05,w*0.72,h*0.50,3);c.fill();
  // spreadsheet lines glowing blue
  c.strokeStyle='rgba(110,190,255,0.45)';c.lineWidth=1.3;
  for(let r=0;r<4;r++){
    c.beginPath();c.moveTo(x+w*0.18,y+h*(0.14+r*0.10));c.lineTo(x+w*0.82,y+h*(0.14+r*0.10));c.stroke();
  }
  // little red error icon top-right of screen
  c.fillStyle='#E24B4A';
  c.beginPath();c.arc(x+w*0.78,y+h*0.12,w*0.045,0,Math.PI*2);c.fill();
  c.fillStyle='#fff';c.font=`bold ${Math.round(w*0.06)}px sans-serif`;c.textAlign='center';c.textBaseline='middle';
  c.fillText('!',x+w*0.78,y+h*0.125);

  // stand
  c.fillStyle='#2A2A35';
  c.beginPath();c.roundRect(x+w*0.42,y+h*0.62,w*0.16,h*0.08,2);c.fill();
  c.fillRect(x+w*0.34,y+h*0.69,w*0.32,h*0.035);

  // keyboard
  c.fillStyle='#C8C0B0';
  c.beginPath();c.roundRect(x+w*0.12,y+h*0.74,w*0.5,h*0.10,2);c.fill();
  c.strokeStyle='rgba(0,0,0,0.1)';c.lineWidth=0.5;
  for(let kx=0;kx<6;kx++) for(let ky=0;ky<2;ky++){
    c.strokeRect(x+w*(0.14+kx*0.075),y+h*(0.755+ky*0.045),w*0.06,h*0.035);
  }
  // mouse
  c.fillStyle='#C8C0B0';
  c.beginPath();c.roundRect(x+w*0.68,y+h*0.75,w*0.14,h*0.09,4);c.fill();
}

function drawPrinter(c,o){
  const x=o.x, y=o.y, w=o.w, h=o.h;
  c.fillStyle='rgba(0,0,0,0.2)';
  c.beginPath();c.ellipse(x+w/2,y+h+3,w*0.42,5,0,0,Math.PI*2);c.fill();

  // main body
  c.fillStyle='#D8D4CC';
  c.beginPath();c.roundRect(x,y+h*0.25,w,h*0.65,6);c.fill();
  c.fillStyle='#B8B4AC';
  c.beginPath();c.roundRect(x,y+h*0.78,w,h*0.12,[0,0,6,6]);c.fill();

  // top scanner lid
  c.fillStyle='#C0BCB4';
  c.beginPath();c.roundRect(x+w*0.04,y,w*0.92,h*0.28,4);c.fill();
  c.fillStyle='#8A8680';
  c.beginPath();c.roundRect(x+w*0.10,y+h*0.05,w*0.80,h*0.16,2);c.fill();

  // control panel
  c.fillStyle='#3A3835';
  c.beginPath();c.roundRect(x+w*0.55,y+h*0.32,w*0.35,h*0.16,2);c.fill();
  c.fillStyle='#5BA8E8';
  c.beginPath();c.roundRect(x+w*0.58,y+h*0.345,w*0.29,h*0.08,2);c.fill();
  // buttons
  c.fillStyle='#888078';
  c.beginPath();c.arc(x+w*0.60,y+h*0.46,w*0.025,0,Math.PI*2);c.fill();
  c.beginPath();c.arc(x+w*0.68,y+h*0.46,w*0.025,0,Math.PI*2);c.fill();

  // paper jam — crumpled paper sticking out
  c.fillStyle='#F5F3ED';
  c.save();
  c.translate(x+w*0.15,y+h*0.55);
  c.rotate(-0.25);
  c.beginPath();c.roundRect(-w*0.10,-h*0.02,w*0.22,h*0.30,2);c.fill();
  c.restore();
  c.strokeStyle='#D0CCC0';c.lineWidth=1;
  c.save();c.translate(x+w*0.15,y+h*0.55);c.rotate(-0.25);
  c.beginPath();c.moveTo(-w*0.06,h*0.05);c.lineTo(w*0.08,h*0.05);c.stroke();
  c.beginPath();c.moveTo(-w*0.06,h*0.12);c.lineTo(w*0.08,h*0.12);c.stroke();
  c.restore();

  // paper output tray
  c.fillStyle='#A8A49C';
  c.beginPath();c.roundRect(x+w*0.04,y+h*0.90,w*0.45,h*0.06,2);c.fill();

  // red warning light
  c.fillStyle='#E24B4A';
  c.beginPath();c.arc(x+w*0.88,y+h*0.40,w*0.035,0,Math.PI*2);c.fill();
}

function drawChair(c,o){
  const x=o.x, y=o.y, w=o.w, h=o.h;
  c.fillStyle='rgba(0,0,0,0.2)';
  c.beginPath();c.ellipse(x+w/2,y+h+3,w*0.40,5,0,0,Math.PI*2);c.fill();

  // wheels
  c.fillStyle='#2A2A2A';
  [0.20,0.40,0.60,0.80].forEach(fx=>{
    c.beginPath();c.arc(x+w*fx,y+h*0.96,w*0.035,0,Math.PI*2);c.fill();
  });
  // central pole
  c.fillStyle='#888078';
  c.beginPath();c.roundRect(x+w*0.46,y+h*0.74,w*0.08,h*0.20,2);c.fill();
  // star base
  c.strokeStyle='#5A5650';c.lineWidth=3;c.lineCap='round';
  [0,1,2,3,4].forEach(i=>{
    const a=i*Math.PI*2/5 - Math.PI/2;
    c.beginPath();c.moveTo(x+w*0.5,y+h*0.86);c.lineTo(x+w*0.5+Math.cos(a)*w*0.32,y+h*0.86+Math.sin(a)*h*0.10);c.stroke();
  });

  // seat
  c.fillStyle='#3C3289';
  c.beginPath();c.roundRect(x+w*0.18,y+h*0.58,w*0.64,h*0.16,5);c.fill();
  c.fillStyle='#4E46AA';
  c.beginPath();c.roundRect(x+w*0.18,y+h*0.58,w*0.64,h*0.04,[5,5,0,0]);c.fill();

  // backrest
  c.fillStyle='#3C3289';
  c.beginPath();c.roundRect(x+w*0.22,y,w*0.56,h*0.58,[8,8,3,3]);c.fill();
  c.fillStyle='#4E46AA';
  c.beginPath();c.roundRect(x+w*0.28,y+h*0.06,w*0.44,h*0.40,6);c.fill();
  // backrest mesh lines
  c.strokeStyle='rgba(0,0,0,0.12)';c.lineWidth=1;
  for(let i=0;i<4;i++){
    c.beginPath();c.moveTo(x+w*0.28,y+h*(0.12+i*0.09));c.lineTo(x+w*0.72,y+h*(0.12+i*0.09));c.stroke();
  }

  // armrests
  c.fillStyle='#2A2470';
  c.beginPath();c.roundRect(x+w*0.04,y+h*0.46,w*0.16,h*0.06,3);c.fill();
  c.beginPath();c.roundRect(x+w*0.80,y+h*0.46,w*0.16,h*0.06,3);c.fill();
  c.fillStyle='#888078';
  c.beginPath();c.roundRect(x+w*0.08,y+h*0.40,w*0.06,h*0.08,2);c.fill();
  c.beginPath();c.roundRect(x+w*0.86,y+h*0.40,w*0.06,h*0.08,2);c.fill();
}

function drawPhone(c,o){
  const x=o.x, y=o.y, w=o.w, h=o.h;
  c.fillStyle='rgba(0,0,0,0.2)';
  c.beginPath();c.ellipse(x+w/2,y+h+3,w*0.40,5,0,0,Math.PI*2);c.fill();

  // desk phone base
  c.fillStyle='#3A3835';
  c.beginPath();c.roundRect(x+w*0.05,y+h*0.55,w*0.90,h*0.40,6);c.fill();
  c.fillStyle='#4A4845';
  c.beginPath();c.roundRect(x+w*0.10,y+h*0.60,w*0.80,h*0.10,2);c.fill();

  // buttons grid
  c.fillStyle='#2A2826';
  for(let r=0;r<3;r++) for(let col=0;col<4;col++){
    c.beginPath();c.roundRect(x+w*(0.12+col*0.19),y+h*(0.74+r*0.07),w*0.14,h*0.05,1);c.fill();
  }

  // handset (off the hook, lifted - the "death pose")
  c.save();
  c.translate(x+w*0.5,y+h*0.30);
  c.rotate(-0.35);
  c.fillStyle='#2A2826';
  c.beginPath();c.roundRect(-w*0.32,-h*0.10,w*0.64,h*0.20,h*0.10);c.fill();
  c.fillStyle='#3A3835';
  c.beginPath();c.arc(-w*0.26,0,w*0.10,0,Math.PI*2);c.fill();
  c.beginPath();c.arc(w*0.26,0,w*0.10,0,Math.PI*2);c.fill();
  c.restore();

  // cord squiggle
  c.strokeStyle='#2A2826';c.lineWidth=2;c.lineCap='round';
  c.beginPath();
  c.moveTo(x+w*0.5,y+h*0.40);
  c.quadraticCurveTo(x+w*0.35,y+h*0.48,x+w*0.45,y+h*0.55);
  c.stroke();

  // ringing waves
  c.strokeStyle='rgba(220,180,40,0.7)';c.lineWidth=2;c.lineCap='round';
  c.beginPath();c.arc(x+w*0.85,y+h*0.18,w*0.10,-0.6,0.6);c.stroke();
  c.beginPath();c.arc(x+w*0.85,y+h*0.18,w*0.16,-0.5,0.5);c.stroke();
}

function drawFolder(c,o){
  const x=o.x, y=o.y, w=o.w, h=o.h;
  c.fillStyle='rgba(0,0,0,0.2)';
  c.beginPath();c.ellipse(x+w/2,y+h+3,w*0.42,5,0,0,Math.PI*2);c.fill();

  // stack of folders, slightly offset for depth
  const cols=['#8B5A2A','#A06830','#B8804A'];
  [0,1,2].forEach(i=>{
    const ox = i*w*0.07;
    const oy = -i*h*0.05;
    c.fillStyle=cols[i];
    c.save();
    c.translate(ox,oy);
    c.beginPath();
    c.moveTo(x+w*0.05,y+h*0.30);
    c.lineTo(x+w*0.30,y+h*0.30);
    c.lineTo(x+w*0.36,y+h*0.20);
    c.lineTo(x+w*0.65,y+h*0.20);
    c.lineTo(x+w*0.95,y+h*0.30);
    c.lineTo(x+w*0.95,y+h*0.95);
    c.lineTo(x+w*0.05,y+h*0.95);
    c.closePath();
    c.fill();
    c.restore();
  });

  // front folder details - papers sticking out
  c.fillStyle='#F5F0E5';
  c.beginPath();c.roundRect(x+w*0.18,y+h*0.05,w*0.5,h*0.30,1);c.fill();
  c.strokeStyle='#D8D0C0';c.lineWidth=1;
  c.beginPath();c.moveTo(x+w*0.22,y+h*0.12);c.lineTo(x+w*0.60,y+h*0.12);c.stroke();
  c.beginPath();c.moveTo(x+w*0.22,y+h*0.18);c.lineTo(x+w*0.60,y+h*0.18);c.stroke();
  c.beginPath();c.moveTo(x+w*0.22,y+h*0.24);c.lineTo(x+w*0.50,y+h*0.24);c.stroke();

  // "WICHTIG" label sticker
  c.fillStyle='#E24B4A';
  c.beginPath();c.roundRect(x+w*0.40,y+h*0.40,w*0.40,h*0.13,2);c.fill();
  c.fillStyle='#fff';c.font=`bold ${Math.round(w*0.09)}px sans-serif`;c.textAlign='center';c.textBaseline='middle';
  c.fillText('!',x+w*0.60,y+h*0.465);
}

function drawPresentation(c,o){
  const x=o.x, y=o.y, w=o.w, h=o.h;
  c.fillStyle='rgba(0,0,0,0.2)';
  c.beginPath();c.ellipse(x+w/2,y+h+3,w*0.42,5,0,0,Math.PI*2);c.fill();

  // tripod legs
  c.strokeStyle='#5A5650';c.lineWidth=3;c.lineCap='round';
  c.beginPath();c.moveTo(x+w*0.5,y+h*0.55);c.lineTo(x+w*0.18,y+h*0.98);c.stroke();
  c.beginPath();c.moveTo(x+w*0.5,y+h*0.55);c.lineTo(x+w*0.82,y+h*0.98);c.stroke();
  c.beginPath();c.moveTo(x+w*0.5,y+h*0.55);c.lineTo(x+w*0.5,y+h*0.98);c.stroke();

  // screen/easel board
  c.fillStyle='#FFFFFF';
  c.beginPath();c.roundRect(x+w*0.06,y,w*0.88,h*0.58,4);c.fill();
  c.strokeStyle='#D8D4CC';c.lineWidth=2;
  c.beginPath();c.roundRect(x+w*0.06,y,w*0.88,h*0.58,4);c.stroke();

  // chart on screen - declining bars (the joke: numbers going down)
  const barColors=['#5BA8E8','#5BA8E8','#E24B4A'];
  const barH=[0.30,0.22,0.12];
  barH.forEach((bh,i)=>{
    c.fillStyle=barColors[i];
    c.beginPath();c.roundRect(x+w*(0.16+i*0.22),y+h*(0.50-bh),w*0.16,h*bh,1);c.fill();
  });
  // declining trend line
  c.strokeStyle='#E24B4A';c.lineWidth=2;c.lineCap='round';
  c.beginPath();
  c.moveTo(x+w*0.20,y+h*0.10);
  c.lineTo(x+w*0.45,y+h*0.18);
  c.lineTo(x+w*0.70,y+h*0.38);
  c.stroke();
  // arrow head
  c.beginPath();
  c.moveTo(x+w*0.70,y+h*0.38);
  c.lineTo(x+w*0.64,y+h*0.34);
  c.moveTo(x+w*0.70,y+h*0.38);
  c.lineTo(x+w*0.68,y+h*0.30);
  c.stroke();
}

function drawForm(c,o){
  const x=o.x, y=o.y, w=o.w, h=o.h;
  c.fillStyle='rgba(0,0,0,0.2)';
  c.beginPath();c.ellipse(x+w/2,y+h+3,w*0.42,5,0,0,Math.PI*2);c.fill();

  // clipboard
  c.fillStyle='#A0856A';
  c.beginPath();c.roundRect(x+w*0.08,y+h*0.05,w*0.84,h*0.90,5);c.fill();
  c.fillStyle='#888078';
  c.beginPath();c.roundRect(x+w*0.34,y,w*0.32,h*0.10,3);c.fill();

  // paper
  c.fillStyle='#FFFFFF';
  c.beginPath();c.roundRect(x+w*0.14,y+h*0.12,w*0.72,h*0.78,2);c.fill();

  // form lines
  c.strokeStyle='#C8C0B0';c.lineWidth=1.3;
  for(let i=0;i<6;i++){
    c.beginPath();c.moveTo(x+w*0.20,y+h*(0.22+i*0.10));c.lineTo(x+w*0.80,y+h*(0.22+i*0.10));c.stroke();
  }
  // checkbox stamps - red "DENIED" style stamp
  c.save();
  c.translate(x+w*0.5,y+h*0.55);
  c.rotate(-0.3);
  c.strokeStyle='#E24B4A';c.lineWidth=2.5;
  c.beginPath();c.roundRect(-w*0.28,-h*0.08,w*0.56,h*0.16,4);c.stroke();
  c.fillStyle='#E24B4A';c.font=`bold ${Math.round(w*0.10)}px sans-serif`;c.textAlign='center';c.textBaseline='middle';
  c.fillText('NEIN',0,1);
  c.restore();

  // pen clipped to side
  c.fillStyle='#2A2A2A';
  c.beginPath();c.roundRect(x+w*0.84,y+h*0.20,w*0.05,h*0.45,2);c.fill();
  c.fillStyle='#D4A017';
  c.beginPath();c.roundRect(x+w*0.84,y+h*0.20,w*0.05,h*0.08,1);c.fill();
}

function drawMeeting(c,o){
  // a small conference table with two laptop silhouettes - "infinite meeting" symbol
  const x=o.x, y=o.y, w=o.w, h=o.h;
  c.fillStyle='rgba(0,0,0,0.2)';
  c.beginPath();c.ellipse(x+w/2,y+h+3,w*0.45,5,0,0,Math.PI*2);c.fill();

  // table top (oval)
  c.fillStyle='#A0856A';
  c.beginPath();c.ellipse(x+w*0.5,y+h*0.62,w*0.48,h*0.16,0,0,Math.PI*2);c.fill();
  c.fillStyle='#8A7058';
  c.beginPath();c.ellipse(x+w*0.5,y+h*0.66,w*0.48,h*0.14,0,0,Math.PI*2);c.fill();
  // legs
  c.fillStyle='#7A6050';
  c.fillRect(x+w*0.12,y+h*0.70,w*0.06,h*0.28);
  c.fillRect(x+w*0.82,y+h*0.70,w*0.06,h*0.28);

  // laptop 1
  c.fillStyle='#3A3835';
  c.beginPath();c.roundRect(x+w*0.10,y+h*0.40,w*0.30,h*0.22,2);c.fill();
  c.fillStyle='#5BA8E8';
  c.beginPath();c.roundRect(x+w*0.12,y+h*0.42,w*0.26,h*0.16,1);c.fill();
  c.fillStyle='#2A2826';
  c.beginPath();c.roundRect(x+w*0.10,y+h*0.60,w*0.30,h*0.05,1);c.fill();

  // laptop 2
  c.fillStyle='#3A3835';
  c.beginPath();c.roundRect(x+w*0.60,y+h*0.40,w*0.30,h*0.22,2);c.fill();
  c.fillStyle='#5BA8E8';
  c.beginPath();c.roundRect(x+w*0.62,y+h*0.42,w*0.26,h*0.16,1);c.fill();
  c.fillStyle='#2A2826';
  c.beginPath();c.roundRect(x+w*0.60,y+h*0.60,w*0.30,h*0.05,1);c.fill();

  // looping "infinity" arrows above table (recurring meeting symbol)
  c.strokeStyle='#888078';c.lineWidth=2.5;c.lineCap='round';
  c.beginPath();
  c.arc(x+w*0.38,y+h*0.20,w*0.14,0.3,Math.PI*1.6);
  c.stroke();
  c.beginPath();
  c.arc(x+w*0.62,y+h*0.20,w*0.14,Math.PI*1.3,Math.PI*2.6);
  c.stroke();
  // arrow heads
  c.fillStyle='#888078';
  c.beginPath();c.moveTo(x+w*0.50,y+h*0.07);c.lineTo(x+w*0.46,y+h*0.12);c.lineTo(x+w*0.54,y+h*0.12);c.closePath();c.fill();
}

const OBS_DRAWERS={
  boss: drawBoss,
  karen: drawKaren,
  hr: drawHR,
  computer: drawComputer,
  printer: drawPrinter,
  chair: drawChair,
  phone: drawPhone,
  folder: drawFolder,
  presentation: drawPresentation,
  form: drawForm,
  meeting: drawMeeting,
};

function drawObstacleSprite(c,o){
  const drawer = OBS_DRAWERS[o.objType];
  if(drawer) drawer(c,o);
}

// ═══════════════════════════════════════════════
// BACKGROUND
// ═══════════════════════════════════════════════
let bgObjs=[];
function initBg(){
  bgObjs=[
    {type:'desk',x:GAME_W*0.06,y:0,w:120,h:20,spd:.18},
    {type:'desk',x:GAME_W*0.66,y:0,w:100,h:20,spd:.18},
    {type:'plant',x:GAME_W*0.42,y:0,spd:.18},
    {type:'cabinet',x:GAME_W*0.86,y:0,w:55,h:45,spd:.15},
    {type:'window',x:GAME_W*0.12,y:0,w:90,h:110,spd:.08},
    {type:'window',x:GAME_W*0.58,y:0,w:90,h:110,spd:.08},
    {type:'clock',x:GAME_W*0.90,y:0,spd:.08},
  ];
}
initBg();

function drawBg(){
  ctx.fillStyle='#C8C4B8';ctx.fillRect(0,0,GAME_W,GY);

  ctx.strokeStyle='rgba(0,0,0,0.04)';ctx.lineWidth=1;
  for(let y=0;y<GY;y+=18){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(GAME_W,y);ctx.stroke();}

  ctx.fillStyle='#E8E4D8';ctx.fillRect(0,0,GAME_W,16);
  [[0.10,0.22],[0.40,0.22],[0.72,0.18]].forEach(([fx,fw])=>{
    const lx=GAME_W*fx, lw=GAME_W*fw;
    ctx.fillStyle='#FFFFF0';ctx.fillRect(lx,0,lw,11);
    const g=ctx.createLinearGradient(0,11,0,90);
    g.addColorStop(0,'rgba(255,255,220,0.18)');g.addColorStop(1,'rgba(255,255,220,0)');
    ctx.fillStyle=g;ctx.fillRect(lx-24,11,lw+48,80);
  });

  bgObjs.forEach(o=>{
    o.x-=o.spd*(spd||4)/4;
    if(o.x+200<0) o.x=GAME_W+60+Math.random()*120;

    const oy = o.type==='window' ? GY*0.10 :
               o.type==='clock'  ? GY*0.07 :
               o.type==='cabinet'? GY-130 :
               o.type==='desk'   ? GY-95 :
               o.type==='plant'  ? GY-80 : 0;

    if(o.type==='window'){
      ctx.fillStyle='#9A9588';ctx.beginPath();ctx.roundRect(o.x-4,oy-4,o.w+8,o.h+8,4);ctx.fill();
      const skyG=ctx.createLinearGradient(o.x,oy,o.x,oy+o.h);
      skyG.addColorStop(0,'#87CEEB');skyG.addColorStop(1,'#C8E8F8');
      ctx.fillStyle=skyG;ctx.beginPath();ctx.roundRect(o.x,oy,o.w,o.h,2);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.8)';
      ctx.beginPath();ctx.ellipse(o.x+20,oy+25,16,8,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(o.x+55,oy+35,12,6,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(150,140,120,0.6)';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(o.x+o.w/2,oy);ctx.lineTo(o.x+o.w/2,oy+o.h);ctx.stroke();
      ctx.beginPath();ctx.moveTo(o.x,oy+o.h/2);ctx.lineTo(o.x+o.w,oy+o.h/2);ctx.stroke();
      ctx.fillStyle='#B0A898';ctx.fillRect(o.x-6,oy+o.h,o.w+12,8);

    } else if(o.type==='desk'){
      ctx.fillStyle='#A0856A';ctx.beginPath();ctx.roundRect(o.x,oy,o.w,o.h,[3,3,0,0]);ctx.fill();
      ctx.fillStyle='#8A7058';ctx.fillRect(o.x,oy+o.h-4,o.w,4);
      ctx.fillStyle='#7A6050';ctx.fillRect(o.x+8,oy+o.h,8,12);ctx.fillRect(o.x+o.w-16,oy+o.h,8,12);
      ctx.fillStyle='#2A2A35';ctx.beginPath();ctx.roundRect(o.x+18,oy-48,54,42,4);ctx.fill();
      const sg=ctx.createLinearGradient(o.x+21,oy-45,o.x+21,oy-10);
      sg.addColorStop(0,'#1a3a6a');sg.addColorStop(1,'#0a1a3a');
      ctx.fillStyle=sg;ctx.beginPath();ctx.roundRect(o.x+21,oy-45,48,36,2);ctx.fill();
      ctx.strokeStyle='rgba(100,180,255,0.3)';ctx.lineWidth=1;
      for(let r=0;r<4;r++){ctx.beginPath();ctx.moveTo(o.x+22,oy-40+r*8);ctx.lineTo(o.x+68,oy-40+r*8);ctx.stroke();}
      ctx.fillStyle='#2A2A35';ctx.beginPath();ctx.roundRect(o.x+40,oy-6,14,10,1);ctx.fill();
      ctx.fillRect(o.x+36,oy+3,22,4);
      ctx.fillStyle='#C8C0B0';ctx.beginPath();ctx.roundRect(o.x+10,oy+4,50,12,2);ctx.fill();
      ctx.fillStyle='#E8E0D0';ctx.beginPath();ctx.roundRect(o.x+o.w-18,oy+2,12,14,2);ctx.fill();
      ctx.fillStyle='#4A2808';ctx.fillRect(o.x+o.w-16,oy+4,8,6);

    } else if(o.type==='plant'){
      ctx.fillStyle='#B85A30';ctx.beginPath();ctx.roundRect(o.x+2,oy+46,18,20,[2,2,4,4]);ctx.fill();
      ctx.fillStyle='#8A3A18';ctx.fillRect(o.x,oy+44,22,4);
      ctx.fillStyle='#3A2010';ctx.fillRect(o.x+3,oy+44,18,5);
      const leafC=['#2A6820','#358028','#1E5018'];
      [[o.x+11,oy+42,0],[o.x+2,oy+30,-0.3],[o.x+20,oy+28,0.4],[o.x+11,oy+18,0.1],[o.x-2,oy+18,-0.5],[o.x+24,oy+20,0.6]].forEach(([px,py,ang],i)=>{
        ctx.fillStyle=leafC[i%3];
        ctx.save();ctx.translate(px,py);ctx.rotate(ang);
        ctx.beginPath();ctx.ellipse(0,0,7+i,12+i*1.5,0,0,Math.PI*2);ctx.fill();
        ctx.restore();
      });

    } else if(o.type==='cabinet'){
      ctx.fillStyle='#B8B0A0';ctx.beginPath();ctx.roundRect(o.x,oy,o.w,o.h,2);ctx.fill();
      ctx.fillStyle='#A8A090';
      ctx.fillRect(o.x+2,oy+2,o.w-4,o.h/2-3);
      ctx.fillRect(o.x+2,oy+o.h/2+1,o.w-4,o.h/2-3);
      ctx.strokeStyle='rgba(0,0,0,0.15)';ctx.lineWidth=1;
      ctx.strokeRect(o.x+2,oy+2,o.w-4,o.h/2-3);
      ctx.strokeRect(o.x+2,oy+o.h/2+1,o.w-4,o.h/2-3);
      ctx.fillStyle='#888078';
      ctx.beginPath();ctx.roundRect(o.x+o.w/2-8,oy+o.h/4-3,16,6,3);ctx.fill();
      ctx.beginPath();ctx.roundRect(o.x+o.w/2-8,oy+3*o.h/4-3,16,6,3);ctx.fill();

    } else if(o.type==='clock'){
      ctx.fillStyle='#E8E0D0';ctx.beginPath();ctx.arc(o.x,oy,20,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#8A8070';ctx.lineWidth=2;ctx.beginPath();ctx.arc(o.x,oy,20,0,Math.PI*2);ctx.stroke();
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6;
        ctx.strokeStyle='#4A4038';ctx.lineWidth=i%3===0?2:1;
        ctx.beginPath();ctx.moveTo(o.x+Math.cos(a)*15,oy+Math.sin(a)*15);
        ctx.lineTo(o.x+Math.cos(a)*18,oy+Math.sin(a)*18);ctx.stroke();
      }
      const t=Date.now()/1000;
      ctx.strokeStyle='#2A2018';ctx.lineWidth=2;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(o.x,oy);ctx.lineTo(o.x+Math.cos(t*.1-Math.PI/2)*11,oy+Math.sin(t*.1-Math.PI/2)*11);ctx.stroke();
      ctx.strokeStyle='#E24B4A';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(o.x,oy);ctx.lineTo(o.x+Math.cos(t-Math.PI/2)*15,oy+Math.sin(t-Math.PI/2)*15);ctx.stroke();
      ctx.fillStyle='#2A2018';ctx.beginPath();ctx.arc(o.x,oy,2,0,Math.PI*2);ctx.fill();
    }
  });

  ctx.fillStyle='#A8A098';ctx.fillRect(0,GY-14,GAME_W,14);
  ctx.fillStyle='#B8B0A8';ctx.fillRect(0,GY-14,GAME_W,3);

  const floorG=ctx.createLinearGradient(0,GY,0,GAME_H);
  floorG.addColorStop(0,'#7A7468');floorG.addColorStop(1,'#6A6458');
  ctx.fillStyle=floorG;ctx.fillRect(0,GY,GAME_W,GAME_H-GY);

  ctx.strokeStyle='rgba(0,0,0,0.12)';ctx.lineWidth=1;
  const tileOff=(frame*(spd||4)*.5)%56;
  for(let x=-56+tileOff%56;x<GAME_W;x+=56){ctx.beginPath();ctx.moveTo(x,GY);ctx.lineTo(x,GAME_H);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(0,GY+28);ctx.lineTo(GAME_W,GY+28);ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,GY+56);ctx.lineTo(GAME_W,GY+56);ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.06)';ctx.fillRect(0,GY,GAME_W,3);
}

// ═══════════════════════════════════════════════
// OBSTACLE SPAWNING & RENDERING
// ═══════════════════════════════════════════════
function spawnObs(){
  const t=OBS_DATA[Math.floor(Math.random()*OBS_DATA.length)];
  const gap=nextGap();
  nextSpawn=gap;spawnTimer=0;
  const combo=Math.random()<.15&&score>10;
  const msg=randMsg(t);
  obstacles.push({x:GAME_W+20,y:GY-t.h,w:t.w,h:t.h,objType:t.type,msg,wobble:0});
  if(combo){
    const t2=OBS_DATA[Math.floor(Math.random()*OBS_DATA.length)];
    obstacles.push({x:GAME_W+20,y:GY-t.h-t2.h-8,w:t2.w,h:t2.h,objType:t2.type,msg:randMsg(t2),wobble:0});
  }
}

function drawObs(){
  obstacles.forEach(o=>{
    o.wobble=Math.sin(frame*.2)*1.5;
    ctx.save();
    ctx.translate(o.x, o.y+o.wobble);
    drawObstacleSprite(ctx, {x:0,y:0,w:o.w,h:o.h,objType:o.objType});
    ctx.restore();

    // danger glow when close to dudel
    const dist=o.x-(GAME_W*0.18+42);
    if(dist<110&&dist>0){
      const alpha=0.55*(1-dist/110);
      ctx.strokeStyle=`rgba(220,50,50,${alpha})`;
      ctx.lineWidth=3;
      ctx.beginPath();ctx.roundRect(o.x-4,o.y+o.wobble-4,o.w+8,o.h+8,10);ctx.stroke();
    }
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
  const isDouble = dodel.jumpsLeft<2;
  const power = dodel.jumpsLeft===2 ? JUMP_POWER : JUMP_POWER*.82;
  dodel.vy=power;
  dodel.jumpsLeft--;
  dodel.onGround=false;
  dodel.squish=1.3; dodel.squishV=-.06;
  if(isDouble) SFX.doubleJump(); else SFX.jump();
  for(let i=0;i<8;i++) parts.push({
    x:dodel.x+20, y:dodel.y+dodel.h,
    vx:(Math.random()-.5)*5, vy:-Math.random()*3-1,
    life:1, r:Math.random()*3+2,
    col:['#CECBF6','#B4B2A9','#8880CC'][Math.floor(Math.random()*3)]
  });
  updateJumpDots();
}

let lastTap=0;

function handleTap(e){
  // Ignore taps that originate on buttons or other interactive UI controls
  // (mute button, CTAs, share button, etc.) — those have their own handlers.
  if(e && e.target && e.target.closest && e.target.closest('button')) return;
  // Only jumping happens via the generic tap; starting/restarting is
  // handled exclusively by explicit CTA buttons (see below).
  if(STATE!=='playing') return;

  if(e&&e.cancelable) e.preventDefault();
  const now=Date.now();
  if(now-lastTap<80) return;
  lastTap=now;
  doJump();
}

document.addEventListener('touchend', handleTap, {passive:false});
document.addEventListener('click', handleTap);
document.addEventListener('keydown',e=>{
  if(e.code==='Space'&&!e.repeat){ e.preventDefault(); handleTap(e); }
});

document.getElementById('muteBtn').addEventListener('click',e=>{
  e.stopPropagation();
  e.preventDefault();
  lastTap=Date.now();
  const isMuted = SFX.toggleMute();
  e.currentTarget.textContent = isMuted ? '🔇' : '🔊';
});

document.getElementById('shareBtn').addEventListener('click',async e=>{
  e.stopPropagation();
  e.preventDefault();
  lastTap=Date.now();
  const s=document.getElementById('fs').textContent;

  // Catchy, varied CTA hooks so shares don't all read identically.
  // The punchline/Spruch is NOT repeated here — it's already visible
  // on the shared image itself, so the text stays short and punchy.
  const hooks=[
    `Nur ${s} Sekunden im Büroalltag überlebt 💀 Schaffst du mehr?`,
    `${s}s im Office-Wahnsinn überlebt. Mehr Glück als ich? 😅`,
    `Der Büroalltag hat mich nach ${s}s erledigt. Dein Versuch?`,
    `${s} Sekunden Corporate Survival. Knackst du meinen Score?`,
  ];
  const hook = hooks[Math.floor(Math.random()*hooks.length)];
  const text = `${hook}\n\n🏃 Jetzt selbst spielen → Dudel Dash\n#DudelDash`;

  const brandedName = `dudeldash-${s}s.png`;

  if(lastDeathCardBlob && navigator.canShare && navigator.canShare({files:[new File([lastDeathCardBlob],brandedName,{type:'image/png'})]})){
    try{
      const file = new File([lastDeathCardBlob], brandedName, {type:'image/png'});
      await navigator.share({files:[file], text});
      return;
    }catch(err){ /* user cancelled or failed, fall through */ }
  }
  if(navigator.share){
    try{ await navigator.share({text}); return; }catch(err){}
  }
  try{navigator.clipboard.writeText(text);}catch(e){}
  if(lastDeathCardBlob){
    const url = URL.createObjectURL(lastDeathCardBlob);
    const a = document.createElement('a');
    a.href = url; a.download = brandedName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
  alert('Text kopiert! Bild wird zusätzlich heruntergeladen.');
});

document.getElementById('menuBtn').addEventListener('click',e=>{
  e.stopPropagation(); e.preventDefault(); lastTap=Date.now();
  showStartScreen();
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
// ═══════════════════════════════════════════════
// SHAREABLE DEATH CARD — rendered to an offscreen canvas
// Story-format (540x960, 9:16) for easy sharing/download
// ═══════════════════════════════════════════════
// Wraps text to fit maxWidth by measuring actual rendered width,
// splitting on word boundaries — avoids Canvas's fillText() squashing
// text horizontally when given a maxWidth it doesn't fit in.
function wrapText(ctx, text, maxWidth){
  // Normalize: treat any existing \n as a forced break, but still
  // word-wrap each resulting segment independently.
  const paragraphs = text.split('\n');
  const allLines = [];
  paragraphs.forEach(para=>{
    const words = para.split(' ');
    let current = '';
    words.forEach(word=>{
      const test = current ? current + ' ' + word : word;
      if(ctx.measureText(test).width > maxWidth && current){
        allLines.push(current);
        current = word;
      } else {
        current = test;
      }
    });
    if(current) allLines.push(current);
  });
  return allLines;
}

function generateDeathCard(finalScore, msg, isHighscore){
  const CW=540, CH=960;
  const cardCanvas = document.createElement('canvas');
  cardCanvas.width = CW; cardCanvas.height = CH;
  const cc = cardCanvas.getContext('2d');

  const bg = cc.createLinearGradient(0,0,0,CH);
  bg.addColorStop(0,'#1A1640');
  bg.addColorStop(0.5,'#241F52');
  bg.addColorStop(1,'#15112E');
  cc.fillStyle=bg; cc.fillRect(0,0,CW,CH);

  cc.fillStyle='rgba(255,255,255,0.04)';
  for(let x=20;x<CW;x+=36) for(let y=20;y<CH;y+=36){
    cc.beginPath();cc.arc(x,y,1.4,0,Math.PI*2);cc.fill();
  }

  const glow = cc.createRadialGradient(CW/2,CH*0.34,10,CW/2,CH*0.34,240);
  glow.addColorStop(0,'rgba(168,158,245,0.35)');
  glow.addColorStop(1,'rgba(168,158,245,0)');
  cc.fillStyle=glow; cc.fillRect(0,0,CW,CH);

  // Dudel — compact, near the top
  cc.save();
  cc.translate(CW/2 - 48, 56);
  cc.scale(1.8, 1.8);
  drawDudel(cc, 0, 0, 0, true, 0, 1);
  cc.restore();

  // Title — bigger, pushed further down, the clear brand anchor
  cc.fillStyle='#FFFFFF';
  cc.font='800 40px system-ui, sans-serif';
  cc.textAlign='center';
  cc.letterSpacing = '2px';
  cc.fillText('DUDEL DASH', CW/2, 270);
  cc.letterSpacing = '0px';

  cc.fillStyle='rgba(255,255,255,0.55)';
  cc.font='500 26px system-ui, sans-serif';
  cc.fillText('Du hast', CW/2, CH*0.40);

  cc.fillStyle='#FFFFFF';
  cc.font='800 130px system-ui, sans-serif';
  cc.fillText(finalScore, CW/2, CH*0.40 + 122);

  cc.fillStyle='rgba(255,255,255,0.45)';
  cc.font='500 22px system-ui, sans-serif';
  cc.fillText('Sekunden im Büroalltag überlebt', CW/2, CH*0.40 + 162);

  if(isHighscore){
    cc.fillStyle='rgba(239,159,39,0.15)';
    cc.beginPath();cc.roundRect(CW/2-110, CH*0.40+187, 220, 42, 21);cc.fill();
    cc.strokeStyle='rgba(239,159,39,0.5)';cc.lineWidth=1.5;
    cc.beginPath();cc.roundRect(CW/2-110, CH*0.40+187, 220, 42, 21);cc.stroke();
    cc.fillStyle='#EF9F27';
    cc.font='700 16px system-ui, sans-serif';
    cc.fillText('🏆 NEUER HIGHSCORE', CW/2, CH*0.40+214);
  }

  cc.fillStyle='#C4BCF8';
  cc.font='500 22px system-ui, sans-serif';
  cc.textAlign='center';
  const maxTextWidth = CW-120;
  const lines = wrapText(cc, msg, maxTextWidth);
  const lineHeight=30;
  const boxY = CH*0.40 + (isHighscore?247:197);
  const boxW = CW-80;
  const boxH = Math.max(110, lines.length*lineHeight + 50);

  cc.fillStyle='rgba(168,158,245,0.12)';
  cc.beginPath();cc.roundRect(40, boxY, boxW, boxH, 16);cc.fill();
  cc.strokeStyle='rgba(168,158,245,0.2)';cc.lineWidth=1.5;
  cc.beginPath();cc.roundRect(40, boxY, boxW, boxH, 16);cc.stroke();

  cc.fillStyle='#C4BCF8';
  cc.font='500 22px system-ui, sans-serif';
  cc.textAlign='center';
  const startY = boxY + boxH/2 - (lines.length-1)*lineHeight/2 + 8;
  lines.forEach((line,i)=>{
    cc.fillText(line, CW/2, startY + i*lineHeight);
  });

  cc.fillStyle='rgba(255,255,255,0.3)';
  cc.font='500 18px system-ui, sans-serif';
  cc.fillText('🏃 Spiel jetzt selbst — Dudel Dash', CW/2, CH-56);

  return cardCanvas;
}

let lastDeathCardBlob = null;

async function buildAndShowDeathCard(finalScore, msg, isHighscore){
  try{
    const cardCanvas = generateDeathCard(finalScore, msg, isHighscore);
    const blob = await new Promise(res => cardCanvas.toBlob(res, 'image/png'));
    lastDeathCardBlob = blob;
    const url = URL.createObjectURL(blob);
    const imgEl = document.getElementById('deathCardImg');
    const wrapEl = document.getElementById('polaroidWrap');
    if(imgEl && wrapEl){
      imgEl.src = url;
      wrapEl.style.display='flex';
    }
  }catch(e){
    console.warn('Death card generation failed', e);
  }
}

let deathRaf=null;
function stopAll(){
  if(raf){cancelAnimationFrame(raf);raf=null;}
  if(deathRaf){cancelAnimationFrame(deathRaf);deathRaf=null;}
}

function die(msg){
  if(STATE==='dying'||STATE==='dead')return;
  STATE='dying';
  stopAll();
  SFX.hit();
  hitMsg=msg||'Montag hat gesiegt. Wieder mal. 😮‍💨';
  best=Math.max(best,score);
  try{localStorage.setItem('dd_best',best);}catch(e){}
  addBurst(dodel.x+20,dodel.y+40);
  shakeAmount = 14; // trigger screen shake

  // Hit-pause: freeze on the death pose for a few frames before particles fly
  let pause=0;
  const PAUSE_FRAMES=7;
  function freeze(){
    pause++;
    ctx.save();
    applyShake();
    ctx.clearRect(-9999,-9999,99999,99999);drawBg();drawObs();drawParts();
    drawDudel(ctx,dodel.x,dodel.y,dodel.f,true,spd,1);
    ctx.restore();
    if(pause<PAUSE_FRAMES){ deathRaf=requestAnimationFrame(freeze); }
    else { runDeathAnim(); }
  }

  function runDeathAnim(){
    let t=0;
    function da(){
      t++;
      parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.38;p.life-=.035;});
      parts=parts.filter(p=>p.life>0);
      ctx.save();
      applyShake();
      ctx.clearRect(-9999,-9999,99999,99999);drawBg();drawObs();drawParts();
      drawDudel(ctx,dodel.x,dodel.y,dodel.f,true,spd,1);
      ctx.restore();
      if(t<45){deathRaf=requestAnimationFrame(da);}
      else{
        STATE='dead';
        const isHS = score>=best && score>0;
        document.getElementById('fs').textContent=score;
        document.getElementById('bc').textContent=`Best: ${best}`;
        document.getElementById('deathS').style.display='flex';
        buildAndShowDeathCard(score, hitMsg, isHS);
      }
    }
    deathRaf=requestAnimationFrame(da);
  }

  deathRaf=requestAnimationFrame(freeze);
}

function startGame(){
  stopAll();
  if(window.__dudelFloatBg) window.__dudelFloatBg.stop();
  document.getElementById('deathS').style.display='none';
  document.getElementById('startS').style.display='none';
  document.getElementById('highscoreS').style.display='none';
  resetAll();
  STATE='playing';
  loop();
}

function showHighscores(){
  let b=0;try{b=parseInt(localStorage.getItem('dd_best')||'0');}catch(e){}
  document.getElementById('hsLocalBest').textContent=b;
  if(window.__dudelFloatBg) window.__dudelFloatBg.stop();
  document.getElementById('startS').style.display='none';
  document.getElementById('highscoreS').style.display='flex';
}

function showStartScreen(){
  document.getElementById('highscoreS').style.display='none';
  document.getElementById('deathS').style.display='none';
  document.getElementById('startS').style.display='flex';
  STATE='start';
  if(window.__dudelFloatBg) window.__dudelFloatBg.start();
}

document.getElementById('playBtn').addEventListener('click',e=>{
  e.stopPropagation(); e.preventDefault(); lastTap=Date.now();
  startGame();
});
document.getElementById('highscoreBtn').addEventListener('click',e=>{
  e.stopPropagation(); e.preventDefault(); lastTap=Date.now();
  showHighscores();
});
document.getElementById('hsBackBtn').addEventListener('click',e=>{
  e.stopPropagation(); e.preventDefault(); lastTap=Date.now();
  showStartScreen();
});
document.getElementById('restartBtn').addEventListener('click',e=>{
  e.stopPropagation(); e.preventDefault(); lastTap=Date.now();
  startGame();
});

// ═══════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════
function loop(){
  if(STATE!=='playing'){raf=null;return;}
  frame++;

  dodel.vy+=GRAVITY;
  dodel.y+=dodel.vy;
  if(dodel.y>=GY-dodel.h){
    dodel.y=GY-dodel.h;
    if(!dodel.onGround){dodel.squish=1.25;dodel.squishV=-.05;SFX.land();}
    dodel.vy=0;dodel.onGround=true;dodel.jumpsLeft=2;
  } else { dodel.onGround=false; }

  dodel.squishV+=(1-dodel.squish)*.3;
  dodel.squishV*=.7;
  dodel.squish+=dodel.squishV;
  dodel.squish=Math.max(.8,Math.min(1.4,dodel.squish));

  dodel.f++;
  updateJumpDots();

  spd=4+Math.floor(frame/240)*.45;

  spawnTimer++;
  if(spawnTimer>=nextSpawn) spawnObs();

  obstacles.forEach(o=>o.x-=spd);
  obstacles=obstacles.filter(o=>o.x+o.w>-40);
  parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.18;p.life-=.04;});
  parts=parts.filter(p=>p.life>0);

  if(frame%60===0){ score++; SFX.score(); }

  for(const o of obstacles){
    if(hits(dodel,{x:o.x,y:o.y,w:o.w,h:o.h})){die(o.msg);return;}
  }

  ctx.clearRect(-9999,-9999,99999,99999);
  ctx.save();
  applyShake();
  drawBg();drawParts();
  drawDudel(ctx,dodel.x,dodel.y,dodel.f,false,spd,dodel.squish);
  drawObs();
  ctx.restore();

  document.getElementById('sc').textContent=score;
  let b=best;try{b=Math.max(parseInt(localStorage.getItem('dd_best')||'0'),score);}catch(e){}
  document.getElementById('bc').textContent=`Best: ${b}`;

  raf=requestAnimationFrame(loop);
}

// ═══════════════════════════════════════════════
// START SCREEN — floating office objects background
// Subtle, slow-drifting emoji icons for branding/atmosphere
// ═══════════════════════════════════════════════
(function(){
  const fc = document.getElementById('floatCanvas');
  if(!fc) return;
  const fctx = fc.getContext('2d');
  const ICONS = ['☕','📁','📎','📧','📊','🖇️','📌','🗂️','📝','☎️'];
  let floatObjs = [];
  let floatRaf = null;
  let floatRunning = false;

  function sizeFloatCanvas(){
    const dpr = window.devicePixelRatio || 1;
    const w = fc.clientWidth, h = fc.clientHeight;
    fc.width = Math.round(w*dpr);
    fc.height = Math.round(h*dpr);
    fctx.setTransform(dpr,0,0,dpr,0,0);
    return {w,h};
  }

  function initFloatObjs(){
    const {w,h} = sizeFloatCanvas();
    floatObjs = [];
    const count = 9;
    for(let i=0;i<count;i++){
      floatObjs.push({
        icon: ICONS[Math.floor(Math.random()*ICONS.length)],
        x: Math.random()*w,
        y: Math.random()*h,
        size: 22 + Math.random()*20,
        speedY: -(0.12 + Math.random()*0.22),
        drift: (Math.random()-0.5)*0.4,
        sway: Math.random()*Math.PI*2,
        swaySpeed: 0.004 + Math.random()*0.006,
        opacity: 0.10 + Math.random()*0.14,
        rot: (Math.random()-0.5)*0.3,
      });
    }
  }

  function floatLoop(){
    if(!floatRunning) return;
    const w = fc.clientWidth, h = fc.clientHeight;
    fctx.clearRect(0,0,w,h);
    floatObjs.forEach(o=>{
      o.y += o.speedY;
      o.sway += o.swaySpeed;
      o.x += o.drift + Math.sin(o.sway)*0.15;
      if(o.y < -40){ o.y = h+40; o.x = Math.random()*w; }
      if(o.x < -40) o.x = w+40;
      if(o.x > w+40) o.x = -40;
      fctx.save();
      fctx.globalAlpha = o.opacity;
      fctx.translate(o.x, o.y);
      fctx.rotate(o.rot + Math.sin(o.sway)*0.08);
      fctx.font = `${o.size}px sans-serif`;
      fctx.textAlign='center';
      fctx.textBaseline='middle';
      fctx.fillText(o.icon, 0, 0);
      fctx.restore();
    });
    floatRaf = requestAnimationFrame(floatLoop);
  }

  function startFloat(){
    if(floatRunning) return;
    floatRunning = true;
    initFloatObjs();
    floatLoop();
  }
  function stopFloat(){
    floatRunning = false;
    if(floatRaf) cancelAnimationFrame(floatRaf);
  }

  window.addEventListener('resize', ()=>{ if(floatRunning) initFloatObjs(); });

  // Expose minimal controls so the rest of the game can show/hide this
  // background only while the start screen is actually visible.
  window.__dudelFloatBg = { start: startFloat, stop: stopFloat };
})();

// ═══════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════
resize();
document.getElementById('muteBtn').textContent = SFX.isMuted() ? '🔇' : '🔊';
document.getElementById('bc').textContent=`Best: ${best}`;
resetAll();
ctx.clearRect(-9999,-9999,99999,99999);drawBg();

const pc=document.getElementById('preview').getContext('2d');
pc.clearRect(0,0,100,140);
const savedGY = GY;
GY = 120; // local shadow reference for the small preview canvas
pc.save();
pc.translate(10,18);
pc.scale(1.5,1.5);
drawDudel(pc,0,0,0,false,0,1);
pc.restore();
GY = savedGY;

if(window.__dudelFloatBg) window.__dudelFloatBg.start();
