import * as THREE from 'three';
import './style.css';
import { serverIndexForGame, serviceSideForPoint, isLegalServeBounce } from './match-rules.js';
import { partnerTakesBall, opponentAimX } from './ai-tactics.js';

const mount = document.querySelector('#game-canvas');
const ui = {
  overlay: document.querySelector('#overlay'), title: document.querySelector('#overlay-title'),
  copy: document.querySelector('#overlay-copy'), start: document.querySelector('#start-button'),
  status: document.querySelector('#status-text'), rally: document.querySelector('#rally-label'),
  toast: document.querySelector('#toast'), homePoints: document.querySelector('#home-points'),
  rivalPoints: document.querySelector('#rivals-points'), homeGames: document.querySelector('#home-games'),
  rivalGames: document.querySelector('#rivals-games'), charge: document.querySelector('#charge-fill'),
  chargeValue: document.querySelector('#charge-value'), sound: document.querySelector('#sound-button'),
  heightValue: document.querySelector('#height-value'), heightFill: document.querySelector('#height-fill'),
  bounceValue: document.querySelector('#bounce-value')
};

const scene = new THREE.Scene();
scene.background = new THREE.Color('#26434a');
const camera = new THREE.OrthographicCamera(-12, 12, 16, -16, .1, 100);
camera.position.set(0, 12.2, 29.6);
camera.lookAt(0, 0, -.8);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
mount.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xeaf7d8, 0x36676b, 2.35));
const sun = new THREE.DirectionalLight(0xffedc7, 2.7);
sun.position.set(-7, 18, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -17; sun.shadow.camera.right = 17;
sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
sun.shadow.bias = -.001;
scene.add(sun);

const mat = (color, extras = {}) => new THREE.MeshLambertMaterial({ color, ...extras });
const M = {
  ground: mat('#315b5c'), courtRim: mat('#264f55'), court: mat('#347f80'), lane: mat('#5ca99f'),
  boxLight: mat('#68b4a8'), boxDark: mat('#55a49d'), line: mat('#f7e9b9'),
  wall: new THREE.MeshPhongMaterial({color:'#a5d7ca',transparent:true,opacity:.16,shininess:70,side:THREE.DoubleSide,depthWrite:false}),
  rail: mat('#c6d5be'), net: new THREE.MeshBasicMaterial({color:'#e3ebc3',transparent:true,opacity:.46,side:THREE.DoubleSide}),
  netBand: mat('#f4e5b2'), shadow: new THREE.MeshBasicMaterial({color:'#15393e',transparent:true,opacity:.54,depthWrite:false}),
  ball: new THREE.MeshStandardMaterial({color:'#f6de77',emissive:'#6a5315',emissiveIntensity:.25,roughness:.42}),
  accent: mat('#f0a679')
};
function box(w,h,d,m,x,y,z,cast=false){
  const o = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
  o.position.set(x,y,z); o.castShadow=cast; o.receiveShadow=true; scene.add(o); return o;
}
function line(x,z,w,d){ box(w,.03,d,M.line,x,.053,z); }

box(200,.06,200,M.ground,0,-.16,0);
box(11,.13,21,M.courtRim,0,-.12,0);
box(10.5,.16,20.5,M.court,0,-.06,0);
box(9.9,.018,9.9,M.lane,0,.03,-5);
box(9.9,.018,9.9,M.boxDark,0,.03,5);
for(const z of [-3.475,3.475]) for(const x of [-2.48,2.48]) {
  box(4.85,.012,6.84,(x<0)===(z<0)?M.boxLight:M.boxDark,x,.045,z);
}
line(-5,0,.09,20); line(5,0,.09,20);
line(0,-10,10,.09); line(0,10,10,.09);
line(0,-6.95,10,.08); line(0,6.95,10,.08);
line(0,-3.475,.07,6.95); line(0,3.475,.07,6.95);
for (let z=-9.5; z<10; z+=1.3) {
  box(.23,.018,.65,mat(z<0?'#4f978f':'#4b938b'),-4.48,.045,z);
  box(.23,.018,.65,mat(z<0?'#4f978f':'#4b938b'),4.48,.045,z);
}
// Transparent back and side panels make rebounds readable without obscuring play.
for (const z of [-10.25,10.25]) {
  box(10.5,2.65,.045,M.wall,0,1.33,z);
  for (let x=-5.25;x<=5.26;x+=2.625) box(.07,2.8,.08,M.rail,x,1.4,z);
  box(10.6,.07,.09,M.rail,0,2.77,z);
}
for (const x of [-5.25,5.25]) {
  box(.045,2.65,20.5,M.wall,x,1.33,0);
  for (let z=-10.25;z<=10.3;z+=2.56) box(.08,2.8,.08,M.rail,x,1.4,z);
  box(.09,.07,20.6,M.rail,x,2.77,0);
}
for(const x of [-5.2,5.2]) box(.17,1.2,.17,M.netBand,x,.6,0,true);
box(10.3,.07,.1,M.netBand,0,.92,0);
box(10.3,.05,.08,M.rail,0,.08,0);
const net = new THREE.Mesh(new THREE.PlaneGeometry(10.3,.81),M.net);
net.position.set(0,.49,0); scene.add(net);
for(let x=-4.9;x<5;x+=.37) box(.012,.74,.012,M.netBand,x,.51,0);
for(let y=.21;y<.85;y+=.19) box(10,.012,.012,M.netBand,0,y,0);
// A few chunky tiles and court-side objects keep the scene from feeling empty.
const decorMats=[mat('#355a58'),mat('#396263'),mat('#3b6968')];
for(let x=-17;x<18;x+=2.4) for(let z=-20;z<21;z+=2.4){
  if(Math.abs(x)<6.5 && Math.abs(z)<12) continue;
  if((Math.round(x+z)*7)%3===0) box(1.05,.012,1.05,decorMats[Math.abs(Math.round(x*z))%3],x,-.115,z);
}
for(const x of [-8.1,8.1]) for(const z of [-8,8]) {
  box(.95,.6,.95,mat('#cfb587'),x,.2,z);
  box(.35,1.45,.35,mat('#326d5c'),x,1.12,z,true);
  box(.9,.75,.42,mat('#397d65'),x,1.9,z,true);
}

function makePlayer(name,side,x,z,shirt,skin,hair,shorts){
  const group=new THREE.Group(); scene.add(group);
  const shirtM=mat(shirt), skinM=mat(skin), hairM=mat(hair), shortsM=mat(shorts), shoeM=mat('#183e43');
  const part=(w,h,d,m,px,py,pz,parent=group)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(px,py,pz);o.castShadow=true;parent.add(o);return o};
  const floorShadow=new THREE.Mesh(new THREE.CircleGeometry(.48,12),new THREE.MeshBasicMaterial({color:'#164447',transparent:true,opacity:.32,depthWrite:false}));
  floorShadow.rotation.x=-Math.PI/2;floorShadow.position.y=.065;group.add(floorShadow);
  part(.56,.18,.4,shortsM,0,.56,0);
  const leftLeg=part(.18,.5,.2,skinM,-.17,.25,0),rightLeg=part(.18,.5,.2,skinM,.17,.25,0);
  part(.2,.13,.22,mat('#f8e8bc'),-.17,.21,0);part(.2,.13,.22,mat('#f8e8bc'),.17,.21,0);
  part(.22,.13,.34,shoeM,-.17,.07,.08);part(.22,.13,.34,shoeM,.17,.07,.08);
  part(.66,.72,.4,shirtM,0,1.12,0);
  part(.68,.11,.42,mat('#f3e7b8'),0,1.39,0);
  part(.09,.55,.41,mat('#f3e7b8'),-.24,1.09,0);
  const leftArm=part(.2,.55,.22,skinM,-.44,1.05,0);
  const armPivot=new THREE.Group(); armPivot.position.set(.43,1.33,0);group.add(armPivot);
  part(.2,.54,.22,skinM,0,-.27,0,armPivot);
  part(.13,.12,.2,mat('#f3e7b8'),0,-.48,0,armPivot);
  const handle=part(.08,.43,.09,mat('#27464a'),.08,-.24,.03,armPivot);
  handle.rotation.z=-.06;
  const racket=new THREE.Mesh(new THREE.TorusGeometry(.27,.055,4,8),mat('#f0e0a9'));
  racket.position.set(.08,.25,.03);armPivot.add(racket);
  part(.04,.46,.035,mat('#d8d0a2'),.08,.25,.03,armPivot);
  part(.43,.04,.035,mat('#d8d0a2'),.08,.25,.03,armPivot);
  part(.45,.43,.39,skinM,0,1.75,0);
  part(.51,.16,.42,hairM,0,2.0,-.015);
  part(.16,.13,.42,hairM,-.2,1.88,0);
  part(.48,.07,.43,shirtM,0,1.9,0);
  if(name==='Juno'||name==='Rio')part(.19,.34,.25,hairM,.2,1.89,.13);
  if(name==='Ace')part(.38,.07,.25,mat('#dceac2'),0,1.98,-.27);
  const faceZ=side===1?-.205:.205;
  part(.06,.06,.035,mat('#274044'),-.11,1.77,faceZ);
  part(.06,.06,.035,mat('#274044'),.11,1.77,faceZ);
  part(.08,.05,.04,mat('#9a655b'),0,1.67,faceZ);
  const marker=new THREE.Mesh(new THREE.ConeGeometry(.23,.26,4),mat('#ffec9b'));
  marker.position.set(0,2.55,0);marker.rotation.z=Math.PI;marker.visible=name==='Juno';group.add(marker);
  group.position.set(x,0,z);
  return {name,side,x,z,homeX:x,homeZ:z,group,armPivot,leftLeg,rightLeg,leftArm,marker,swing:0,step:0,cooldown:0,speed:name==='Juno'?7:4.65};
}
const players=[
  makePlayer('Juno',1,-2.2,5.4,'#ef9f77','#e4ae87','#384b40','#315b64'),
  makePlayer('Mika',1,2.2,4.5,'#eadf9d','#b77c62','#293f42','#466969'),
  makePlayer('Ace',-1,-2.1,-4.8,'#6595c4','#e0ac82','#303744','#2b5367'),
  makePlayer('Rio',-1,2.2,-5.2,'#b58ba9','#a66d58','#263e40','#634f68')
];
const human=players[0];
const ballMesh=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),M.ball);
ballMesh.castShadow=true;scene.add(ballMesh);
const ballOutline=new THREE.Mesh(new THREE.SphereGeometry(.255,8,6),new THREE.MeshBasicMaterial({color:'#23434a',side:THREE.BackSide}));
ballMesh.add(ballOutline);
const seam=new THREE.Mesh(new THREE.TorusGeometry(.177,.018,3,12),mat('#fff4ba'));
seam.rotation.x=.7;ballMesh.add(seam);
const ballShadow=new THREE.Mesh(new THREE.CircleGeometry(.3,12),M.shadow);
ballShadow.rotation.x=-Math.PI/2;ballShadow.position.y=.052;scene.add(ballShadow);
const shadowRing=new THREE.Mesh(new THREE.RingGeometry(.35,.4,16),new THREE.MeshBasicMaterial({color:'#e9eab2',transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));
shadowRing.rotation.x=-Math.PI/2;shadowRing.position.y=.057;scene.add(shadowRing);
const heightPips=Array.from({length:13},()=>{
  const pip=new THREE.Mesh(new THREE.BoxGeometry(.11,.11,.11),new THREE.MeshBasicMaterial({color:'#ffdf99',transparent:true,opacity:.88,depthWrite:false,depthTest:false}));
  pip.visible=false;scene.add(pip);return pip;
});
const targetRing=new THREE.Mesh(new THREE.RingGeometry(.37,.49,16),new THREE.MeshBasicMaterial({color:'#ffb67a',transparent:true,opacity:.78,side:THREE.DoubleSide,depthWrite:false}));
targetRing.rotation.x=-Math.PI/2;targetRing.position.y=.055;scene.add(targetRing);
const sparkMaterial=new THREE.MeshBasicMaterial({color:'#fff0b0',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
const hitSparks=new THREE.Group();
for(let i=0;i<8;i++){
  const angle=i*Math.PI/4,ray=new THREE.Mesh(new THREE.BoxGeometry(.22,.055,.04),sparkMaterial);
  ray.position.set(Math.cos(angle)*.42,Math.sin(angle)*.42,0);
  ray.rotation.z=angle;hitSparks.add(ray);
}
hitSparks.visible=false;scene.add(hitSparks);
const bouncePulse=new THREE.Mesh(new THREE.RingGeometry(.22,.3,16),new THREE.MeshBasicMaterial({color:'#ffe8a3',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
bouncePulse.rotation.x=-Math.PI/2;bouncePulse.position.y=.06;bouncePulse.visible=false;scene.add(bouncePulse);

const keys=new Set();
const game={phase:'menu',games:[0,0],points:[0,0],completedGames:0,serverIndex:0,serveSide:1,serveFaults:0,serveTimer:0,
  ball:{x:-2.2,y:.3,z:5.4,vx:0,vy:0,vz:0,bounces:0,last:1,isServe:false,serveHasBounced:false},
  chargeStart:0,charge:0,pointTimer:0,toastTimer:0,rallyHits:0,sound:true,clock:0,hitFx:0,bounceFx:0};
let audioContext;
function beep(freq=440,duration=.07,type='square',volume=.045){
  if(!game.sound)return;
  try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type=type;osc.frequency.value=freq;gain.gain.setValueAtTime(volume,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);osc.connect(gain).connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+duration)}catch{}
}
function toast(message,duration=1.2){ui.toast.textContent=message;ui.toast.classList.add('show');game.toastTimer=duration}
function currentServer(){return players[game.serverIndex]}
function serveLabel(){return `${currentServer().name.toUpperCase()} SERVES · ${game.serveSide===1?'RIGHT':'LEFT'}`}
function resetPositions(){
  game.serveSide=serviceSideForPoint(game.points[0],game.points[1]);
  game.serverIndex=serverIndexForGame(game.completedGames);
  for(const p of players){p.x=p.homeX;p.z=p.homeZ;p.coverX=p.homeX;p.coverZ=p.homeZ;p.cooldown=0;p.swing=0}
  const server=currentServer();
  server.x=server.side*game.serveSide*2.55;
  server.z=server.side*7.65;
  server.coverX=server.x*.85;server.coverZ=server.side*5.25;
  for(const p of players)if(p!==server&&p.side===server.side){p.x=-server.x*.88;p.z=server.side*3.8;p.coverX=p.x;p.coverZ=p.z}
  for(const p of players)p.group.position.set(p.x,0,p.z);
  Object.assign(game.ball,{x:server.x,y:.58,z:server.z-server.side*.35,vx:0,vy:0,vz:0,bounces:0,last:server.side,isServe:false,serveHasBounced:false,powered:false});
  updateBallVisual();
}
function setPhase(phase){
  game.phase=phase;
  if(phase==='serve'){
    const server=currentServer();
    game.serveTimer=server===human?Infinity:1.35;
    ui.rally.textContent=serveLabel();
    ui.status.textContent=game.serveFaults?'SECOND SERVE':server===human?'MOVE BEHIND LINE · SPACE TO SERVE':`GET READY · ${server.name.toUpperCase()} SERVES`;
  }else{
    ui.rally.textContent=phase==='rally'?'RALLY IN PLAY':phase==='point'?'POINT OVER':'READY TO PLAY';
    ui.status.textContent=phase==='rally'?'READ THE BOUNCE · PLAY THE WALL':phase==='point'?'NEXT POINT SOON':'WAITING FOR PLAYERS';
  }
}
function displayPoint(n,other){if(n>=4&&n>other)return'AD';return ['00','15','30','40'][Math.min(n,3)]}
function updateScore(){ui.homePoints.textContent=displayPoint(game.points[0],game.points[1]);ui.rivalPoints.textContent=displayPoint(game.points[1],game.points[0]);ui.homeGames.textContent=game.games[0];ui.rivalGames.textContent=game.games[1]}
function startMatch(){
  game.games=[0,0];game.points=[0,0];game.completedGames=0;game.serveFaults=0;game.rallyHits=0;
  updateScore();resetPositions();ui.overlay.classList.add('hidden');setPhase('serve');toast(serveLabel(),1.7);beep(650,.09);
}
function serve(){
  if(game.phase!=='serve')return;
  const server=currentServer(),b=game.ball;
  const targetX=-server.side*game.serveSide*2.65+(Math.random()-.5)*.35;
  const targetZ=-server.side*3.8;
  b.x=server.x;b.y=.63;b.z=server.z-server.side*.35;
  b.vy=5.8;
  const flight=(b.vy+Math.sqrt(b.vy*b.vy+30*(b.y-.22)))/15;
  b.vx=(targetX-b.x)/flight;b.vz=(targetZ-b.z)/flight;
  b.bounces=0;b.last=server.side;b.isServe=true;b.serveHasBounced=false;b.powered=false;
  game.rallyHits=1;setPhase('rally');ui.toast.classList.remove('show');game.toastTimer=0;
  showHitEffect(b,false);
  server.swing=.34;beep(510,.08);
}
function serveFault(){
  if(game.serveFaults===0){
    game.serveFaults=1;resetPositions();setPhase('serve');toast('FAULT · SECOND SERVE',1.3);beep(210,.12);
  }else point(-currentServer().side,'double fault');
}
function point(winner,reason){
  if(game.phase!=='rally')return;
  setPhase('point');game.charge=0;game.chargeStart=0;keys.delete('Space');
  game.points[winner===1?0:1]++;
  const index=winner===1?0:1,other=1-index;
  if(game.points[index]>=4&&game.points[index]-game.points[other]>=2){
    game.games[index]++;game.completedGames++;game.points=[0,0];
    toast(winner===1?'GAME, YOUR TEAM!':'GAME, THE RIVALS!',2.1);
    if(game.games[index]>=3){game.phase='match';ui.title.innerHTML=winner===1?'YOU <em>WIN!</em>':'MATCH <em>OVER</em>';ui.copy.textContent=winner===1?'Juno and Mika take the Pixel Cup.':'Ace and Rio take the Pixel Cup. Fancy a rematch?';ui.start.innerHTML='PLAY AGAIN <span>→</span>';ui.overlay.classList.remove('hidden');ui.status.textContent=winner===1?'PIXEL CUP CHAMPIONS':'MATCH COMPLETE';ui.rally.textContent='FULL TIME';beep(winner===1?880:220,.28);updateScore();return}
  }else toast(winner===1?'YOUR POINT!':'RIVALS SCORE!',1.35);
  game.serveFaults=0;updateScore();game.pointTimer=2.1;beep(winner===1?750:240,.14);
}
function showHitEffect(ball,powered){
  hitSparks.position.set(ball.x,ball.y,ball.z);
  hitSparks.scale.setScalar(1);hitSparks.visible=true;
  sparkMaterial.color.set(powered?'#ffab70':'#fff0b0');game.hitFx=.24;
}
function shoot(player,power=0){
  const b=game.ball;if(game.phase!=='rally'||player.cooldown>0)return false;
  if(b.last===player.side||(b.isServe&&!b.serveHasBounced)||Math.hypot(b.x-player.x,b.z-player.z)>1.5||b.y>2.55||b.y<.12||Math.sign(b.z)!==player.side)return false;
  const powered=power>.65;
  const lob=!powered&&(player===human?keys.has('ArrowDown'):Math.random()<.18||(b.bounces>0&&Math.abs(player.z)>7.2));
  const aim=player===human?((keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0)):0;
  const receivingTeam=players.filter(p=>p.side!==player.side);
  const leftGap=Math.min(...receivingTeam.map(p=>Math.abs(p.x+3.45)));
  const rightGap=Math.min(...receivingTeam.map(p=>Math.abs(p.x-3.45)));
  const openSide=leftGap>rightGap?-3.45:3.45;
  const opponentTarget=player.side===-1?opponentAimX(openSide,human.x,Math.random()):openSide;
  const targetX=player===human
    ?THREE.MathUtils.clamp((aim?aim*3.15:openSide*.7)+(Math.random()-.5)*.7,-4.1,4.1)
    :THREE.MathUtils.clamp((Math.random()<.78?opponentTarget:(Math.random()-.5)*6.4)+(Math.random()-.5)*.55,-4.1,4.1);
  const targetZ=-player.side*(lob?8.5:powered?8.2:6.7+Math.random()*1.3);
  const vy=lob?10.1:powered?6.25:7.35;
  const flight=(vy+Math.sqrt(vy*vy+2*15*Math.max(.1,b.y-.19)))/15;
  b.vx=(targetX-b.x)/flight;
  b.vz=(targetZ-b.z)/flight;
  b.vy=vy;b.bounces=0;b.last=player.side;b.isServe=false;b.serveHasBounced=false;b.powered=powered;
  player.swing=.34;player.cooldown=.38;game.rallyHits++;
  showHitEffect(b,powered);
  if(powered&&player===human){toast('POWER SHOT!',.8);beep(730,.15,'sawtooth',.065)}
  else if(lob&&player===human){toast('LOB!',.6);beep(590,.11,'triangle',.04)}
  else beep(450+Math.random()*90,.07);
  return true;
}
function attemptHumanShot(power){
  if(shoot(human,power))return;
  if(game.phase!=='rally')return;
  human.swing=.25;human.cooldown=Math.max(human.cooldown,.18);beep(170,.045,'triangle',.02);
  const b=game.ball;
  if(b.last===human.side||Math.sign(b.z)!==human.side)return;
  const close=Math.hypot(b.x-human.x,b.z-human.z)<1.75;
  if(close&&b.isServe&&!b.serveHasBounced)toast('LET IT BOUNCE!',.7);
  else if(close&&b.y>2.55)toast('TOO HIGH · WAIT!',.7);
}
function moveToward(player,tx,tz,dt){
  const dx=tx-player.x,dz=tz-player.z,d=Math.hypot(dx,dz);
  if(d>.05){const step=Math.min(d,player.speed*dt);player.x+=dx/d*step;player.z+=dz/d*step;player.step+=step*8}
  player.x=THREE.MathUtils.clamp(player.x,-4.55,4.55);
  player.z=player.side===1?THREE.MathUtils.clamp(player.z,.9,9.45):THREE.MathUtils.clamp(player.z,-9.45,-.9);
}
function reflect(value,limit){
  while(value>limit||value<-limit){if(value>limit)value=2*limit-value;else value=-2*limit-value}
  return value;
}
function predictFloor(){
  const b=game.ball;
  const t=Math.max(0,(b.vy+Math.sqrt(Math.max(0,b.vy*b.vy+30*(b.y-.22))))/15);
  const x=b.x+b.vx*t,z=b.z+b.vz*t;
  return {x:b.bounces?reflect(x,4.91):x,z:b.bounces?reflect(z,9.93):z,t};
}
function updateAI(dt){
  const b=game.ball,active=game.phase==='rally';
  for(const side of [1,-1]){
    const team=side===1?[players[1]]:[players[2],players[3]];
    if(side===1&&Math.abs(human.x)>.65)team[0].coverX=-Math.sign(human.x)*2.25;
    const incoming=active&&b.last!==side&&(Math.sign(b.z)===side||b.vz*side>0);
    let chaser=null;
    let px=0,pz=side*4.5;
    if(incoming){
      const landing=predictFloor();
      px=THREE.MathUtils.clamp(landing.x,-4.35,4.35);
      pz=THREE.MathUtils.clamp(landing.z,side===1?.95:-9.3,side===1?9.3:-.95);
      if(side===1){
        const partner=team[0];
        if(partnerTakesBall(px,human.x,partner.coverX,Math.hypot(px-partner.x,pz-partner.z),Math.hypot(px-human.x,pz-human.z)))chaser=partner;
      }
      else chaser=team.reduce((a,p)=>Math.hypot(px-p.x,pz-p.z)<Math.hypot(px-a.x,pz-a.z)?p:a);
    }
    for(const p of team){
      const tx=p===chaser?px:p.coverX;
      const tz=p===chaser?pz:p.coverZ;
      moveToward(p,tx,tz,dt);
      if(p===chaser&&Math.hypot(b.x-p.x,b.z-p.z)<1.28&&b.y<2.15&&b.y>.2)shoot(p,0);
    }
  }
}
function updateBall(dt){
  const b=game.ball;if(game.phase==='serve'){
    const server=currentServer();b.x=server.x;b.z=server.z-server.side*.35;b.y=.48+Math.abs(Math.sin(game.clock*4.7))*.25;return;
  }
  if(game.phase!=='rally')return;
  const oldZ=b.z;
  b.x+=b.vx*dt;b.z+=b.vz*dt;b.y+=b.vy*dt;b.vy-=15*dt;
  if(oldZ*b.z<=0&&b.y<.9){if(b.isServe&&!b.serveHasBounced)serveFault();else point(-b.last,'net');return}
  if(Math.abs(b.x)>4.91){
    if(b.bounces===0&&(b.isServe||Math.sign(b.z)!==b.last)){if(b.isServe)serveFault();else point(-b.last,'wall');return}
    b.x=Math.sign(b.x)*4.91;b.vx*=-.84;beep(190,.04,'triangle',.025);
  }
  if(Math.abs(b.z)>9.93){
    if(b.bounces===0&&(b.isServe||Math.sign(b.z)!==b.last)){if(b.isServe)serveFault();else point(-b.last,'wall');return}
    b.z=Math.sign(b.z)*9.93;b.vz*=-.82;beep(190,.04,'triangle',.025);
  }
  if(b.y<=.19&&b.vy<0){
    b.y=.19;
    const landingSide=b.z>=0?1:-1;
    if(b.isServe&&!b.serveHasBounced){
      if(!isLegalServeBounce(b.x,b.z,currentServer().side,game.serveSide)){serveFault();return}
      b.serveHasBounced=true;
    }else if(landingSide===b.last){point(-b.last,'wrong side');return}
    b.bounces++;
    if(b.bounces>=2){point(b.last,'double bounce');return}
    bouncePulse.position.x=b.x;bouncePulse.position.z=b.z;bouncePulse.scale.setScalar(1);bouncePulse.visible=true;game.bounceFx=.32;
    b.vy=5.3;b.vx*=.88;b.vz*=.86;beep(300,.055,'triangle',.033);
  }
}
function updateBallVisual(){
  const b=game.ball;ballMesh.position.set(b.x,b.y,b.z);
  ballMesh.rotation.x+=.035;ballMesh.rotation.z+=.04;
  ballShadow.position.x=b.x;ballShadow.position.z=b.z;
  const shadowScale=1+Math.min(b.y,4)*.11;
  ballShadow.scale.setScalar(shadowScale);shadowRing.scale.setScalar(shadowScale);
  shadowRing.position.x=b.x;shadowRing.position.z=b.z;
  M.shadow.opacity=.56-Math.min(b.y,4)*.05;
  shadowRing.material.opacity=.66-Math.min(b.y,4)*.045;
  M.ball.color.set(b.powered?'#ffae66':'#f6de77');
  for(let i=0;i<heightPips.length;i++){
    const y=.35+i*.3,pip=heightPips[i];
    pip.visible=game.phase==='rally'&&b.y>y+.23;
    if(pip.visible)pip.position.set(b.x,y,b.z);
  }
  const landing=predictFloor();
  targetRing.visible=game.phase==='rally'&&landing.t>.08&&Math.abs(landing.x)<4.9&&Math.abs(landing.z)<9.9;
  if(targetRing.visible){
    targetRing.position.x=landing.x;targetRing.position.z=landing.z;
    targetRing.material.opacity=.38+.22*Math.sin(game.clock*9);
    targetRing.scale.setScalar(1+.11*Math.sin(game.clock*9));
  }
  const height=game.phase==='rally'?Math.max(0,b.y):0;
  ui.heightValue.textContent=game.phase==='rally'?(height<.85?'LOW':height<2.05?'MID':'HIGH'):'—';
  ui.heightFill.style.width=`${Math.min(100,Math.round(height/4.2*100))}%`;
  ui.bounceValue.textContent=game.phase==='rally'?(b.bounces?'AFTER BOUNCE':'IN FLIGHT'):'READY';
  if(game.phase==='rally'){
    const partner=players[1],incoming=b.last===-1&&landing.z>.2;
    const partnerBall=incoming&&partnerTakesBall(landing.x,human.x,partner.coverX,Math.hypot(landing.x-partner.x,landing.z-partner.z),Math.hypot(landing.x-human.x,landing.z-human.z));
    ui.status.textContent=incoming&&!partnerBall?'YOUR BALL · MOVE AND HIT':'READ THE BOUNCE · PLAY THE WALL';
  }
}
function updatePlayerVisuals(dt){
  for(const p of players){p.cooldown=Math.max(0,p.cooldown-dt);p.swing=Math.max(0,p.swing-dt);p.group.position.x=p.x;p.group.position.z=p.z;
    const walking=keys.size>0&&p===human||p.step>0;
    const stride=walking?Math.sin(p.step)*.12:0;
    p.leftLeg.rotation.x=stride;p.rightLeg.rotation.x=-stride;p.leftArm.rotation.x=-stride*.6;
    p.armPivot.rotation.z=p.swing>0?-.7-Math.sin((.34-p.swing)/.34*Math.PI)*1.3:-.15;
    p.marker.position.y=2.48+Math.sin(game.clock*5)*.11;
    p.step*=.96;
  }
}
function updateEffects(dt){
  game.hitFx=Math.max(0,game.hitFx-dt);hitSparks.visible=game.hitFx>0;
  if(hitSparks.visible){const progress=1-game.hitFx/.24;hitSparks.scale.setScalar(1+progress*1.1);sparkMaterial.opacity=(1-progress)*.95}
  game.bounceFx=Math.max(0,game.bounceFx-dt);bouncePulse.visible=game.bounceFx>0;
  if(bouncePulse.visible){const progress=1-game.bounceFx/.32;bouncePulse.scale.setScalar(1+progress*1.5);bouncePulse.material.opacity=(1-progress)*.7}
}
function updateCharge(){
  game.charge=game.chargeStart&&game.phase==='rally'?Math.min(1,(performance.now()-game.chargeStart)/950):0;
  ui.charge.style.width=`${Math.round(game.charge*100)}%`;
  ui.chargeValue.textContent=`${Math.round(game.charge*100)}%`;
}
function resize(){
  const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h,false);
  const aspect=w/h,viewH=Math.max(12.65,14.2/aspect);
  camera.left=-viewH*aspect/2;camera.right=viewH*aspect/2;camera.top=viewH/2;camera.bottom=-viewH/2;camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(mount);resize();
ui.start.addEventListener('click',startMatch);
ui.sound.addEventListener('click',()=>{game.sound=!game.sound;ui.sound.textContent=game.sound?'♪ SOUND ON':'♪ SOUND OFF'});
window.addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
  if(e.code==='Space'){
    if(e.repeat)return;
    if(game.phase==='menu'||game.phase==='match'){startMatch();return}
    if(game.phase==='serve'){serve();return}
    if(game.phase==='rally'&&!game.chargeStart)game.chargeStart=performance.now();
  }
  keys.add(e.code);
});
window.addEventListener('keyup',e=>{
  if(e.code==='Space'&&game.chargeStart){const power=Math.min(1,(performance.now()-game.chargeStart)/950);attemptHumanShot(power);game.chargeStart=0;game.charge=0}
  keys.delete(e.code);
});
window.addEventListener('blur',()=>{keys.clear();game.chargeStart=0});

let last=performance.now();
function tick(now){
  const dt=Math.min((now-last)/1000,.035);last=now;game.clock+=dt;
  if(game.phase==='serve'||game.phase==='rally'){
    let dx=(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0);
    let dz=(keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0);
    const len=Math.hypot(dx,dz);if(len){
      dx/=len;dz/=len;
      const serving=game.phase==='serve'&&currentServer()===human;
      const minX=serving&&game.serveSide===1?.45:-4.48;
      const maxX=serving&&game.serveSide===-1?-.45:4.48;
      human.x=THREE.MathUtils.clamp(human.x+dx*human.speed*dt,minX,maxX);
      human.z=THREE.MathUtils.clamp(human.z+dz*human.speed*dt,serving?7.05:.85,9.45);
      human.step+=dt*human.speed*8;
    }
    updateBall(dt);
    if(game.phase==='serve'&&currentServer()!==human){game.serveTimer-=dt;if(game.serveTimer<=0)serve()}
    if(game.phase==='rally')updateAI(dt);
  }
  if(game.phase==='point'){game.pointTimer-=dt;if(game.pointTimer<=0){resetPositions();setPhase('serve');toast(serveLabel(),1.5)}}
  if(game.toastTimer>0){game.toastTimer-=dt;if(game.toastTimer<=0)ui.toast.classList.remove('show')}
  updateCharge();updateBallVisual();updatePlayerVisuals(dt);updateEffects(dt);renderer.render(scene,camera);requestAnimationFrame(tick);
}
resetPositions();updateScore();requestAnimationFrame(tick);
