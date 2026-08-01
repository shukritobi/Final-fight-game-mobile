'use strict';

class Pickup {
  constructor(kind,x,y){ this.kind=kind; this.x=x; this.y=y; this.t=0; this.taken=false; }
  update(dt){ this.t+=dt; }
  draw(){
    if(this.taken) return;
    const bob=Math.sin(this.t*4)*5;
    ctx.save(); ctx.translate(this.x,this.y-18+bob); ctx.shadowBlur=18;
    ctx.shadowColor=this.kind==='health'?'#ff546d':'#ffe36a';
    if(this.kind==='health'){
      ctx.fillStyle='#f7f8ff'; roundRect(-18,-16,36,28,7,true);
      ctx.fillStyle='#ff486a'; ctx.fillRect(-5,-11,10,18); ctx.fillRect(-10,-6,20,8);
    } else {
      ctx.rotate(-.45);
      ctx.fillStyle=this.kind==='staff'?'#d5b77b':this.kind==='pipe'?'#b6cad2':'#8d5b35';
      roundRect(-34,-5,68,10,5,true); ctx.fillStyle='#fff3'; ctx.fillRect(-24,-3,42,2);
    }
    ctx.restore();
  }
}

function dropPickup(x,y){
  const kinds=['health','bat','pipe','staff'];
  game.pickups.push(new Pickup(kinds[Math.floor(Math.random()*kinds.length)],x,y));
}
function roundRect(x,y,w,h,r,fill=false,stroke=false){
  ctx.beginPath(); ctx.roundRect(x,y,w,h,r); if(fill)ctx.fill(); if(stroke)ctx.stroke();
}
function burst(x,y,n,color){
  for(let i=0;i<n;i++) game.particles.push({
    x,y,vx:rand(-260,260),vy:rand(-260,40),life:rand(.18,.55),max:.55,size:rand(2,7),color,gravity:520,type:'spark'
  });
}
function radialBurst(x,y,color){
  for(let i=0;i<28;i++){
    const angle=i/28*Math.PI*2, speed=rand(120,420);
    game.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:rand(.25,.65),max:.65,size:rand(2,6),color,gravity:0,type:'line'});
  }
}
function dustBurst(x,y,count=8){
  for(let i=0;i<count;i++) game.particles.push({
    x:x+rand(-22,22),y:y+rand(-3,5),vx:rand(-55,55),vy:rand(-75,-18),life:rand(.25,.5),max:.5,size:rand(5,12),color:'#b7c3d2',gravity:120,type:'dust'
  });
}
function impactBurst(x,y,kind='punch1',strong=false,color='#fff',direction=1,weapon=null){
  const kick=/kick|axe|dragon|twist/i.test(kind);
  const finisher=strong||/heavy|uppercut|special|cyclone|ko/i.test(kind);
  const impactColor=weapon?'#eaf6ff':kick?'#ffd15a':'#ff557d';
  const count=finisher?20:11;
  for(let i=0;i<count;i++){
    const angle=rand(-1.1,1.1)+(direction>0?0:Math.PI);
    const speed=rand(finisher?190:120,finisher?520:330);
    game.particles.push({
      x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:rand(.18,.42),max:.42,
      size:rand(finisher?3:2,finisher?8:5),color:i%3===0?'#ffffff':impactColor,gravity:80,type:'shard'
    });
  }
  game.particles.push({x,y,vx:0,vy:0,life:finisher?.34:.23,max:finisher?.34:.23,size:finisher?64:42,color:impactColor,gravity:0,type:'star',spikes:finisher?11:8});
  game.particles.push({x,y,vx:0,vy:0,life:finisher?.4:.28,max:finisher?.4:.28,size:finisher?82:55,color:'#ffffff',gravity:0,type:'ring'});
  if(finisher){
    const words=kind==='ko'?['K.O.!']:kind==='uppercut'?['RISING!']:kind==='twistKick'?['TWIST!']:kind==='cyclone'?['CYCLONE!']:['POW!','BAM!','WHAM!'];
    const word=words[Math.floor(Math.random()*words.length)];
    game.texts.push({x:x+direction*20,y:y-18,text:word,color:impactColor,life:.65,max:.65,size:kind==='ko'?44:34,impact:true,rotation:rand(-.16,.16)});
  }
}
function floatingText(x,y,text,color='#fff'){ game.texts.push({x,y,text,color,life:1,max:1,size:22}); }
function toast(text){
  ui.toast.textContent=text; ui.toast.style.opacity=1; clearTimeout(toast.t);
  toast.t=setTimeout(()=>ui.toast.style.opacity=0,1200);
}

const SAVE_KEY='neonBrawlSaveV2';
const SAVE_COOKIE='neonBrawlHasSave';
function setSaveCookie(enabled){
  document.cookie=`${SAVE_COOKIE}=${enabled?'1':'0'}; Max-Age=${enabled?31536000:0}; Path=/; SameSite=Lax`;
}
function hasSaveCookie(){ return document.cookie.split(';').some(part=>part.trim()===`${SAVE_COOKIE}=1`); }
function readSave(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    const data=JSON.parse(raw);
    if(data.version!==2 || !Number.isInteger(data.stage) || data.stage<0 || data.stage>=stages.length) return null;
    return data;
  }catch(error){ return null; }
}
function saveGame(reason='auto'){
  if(!['playing','paused'].includes(game.state) || game.stage>=stages.length) return;
  const data={
    version:2, savedAt:Date.now(), reason,
    stage:game.stage, wave:game.wave, score:game.score,
    lives:Math.max(0,player.lives), health:clamp(player.health,1,player.maxHealth),
    energy:clamp(player.energy,0,100), weapon:player.weapon||null,
    x:clamp(player.x,60,1220), y:clamp(player.y,385,642)
  };
  try{
    localStorage.setItem(SAVE_KEY,JSON.stringify(data)); setSaveCookie(true); game.saveDirty=false;
    if(reason!=='auto'&&reason!=='pagehide') audio.save();
    updateContinueButton();
  }catch(error){}
}
function clearSave(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(error){}
  setSaveCookie(false); updateContinueButton();
}
function updateContinueButton(){
  const save=readSave();
  const available=!!save || hasSaveCookie();
  if(ui.continue){
    ui.continue.hidden=!available;
    if(save){
      const stage=stages[save.stage];
      ui.continue.textContent=`Continue · Stage ${save.stage+1} Wave ${save.wave+1}`;
      ui.continue.title=`Resume ${stage.name}`;
    }
  }
}
function applySave(save){
  game.stage=clamp(save.stage,0,stages.length-1);
  game.wave=clamp(save.wave,0,stages[game.stage].waves.length);
  game.score=Math.max(0,save.score||0);
  player.lives=Math.max(0,save.lives??3);
  player.health=clamp(save.health||player.maxHealth,1,player.maxHealth);
  player.energy=clamp(save.energy??100,0,100);
  player.weapon=save.weapon||null;
  player.resetPosition(true);
  player.x=clamp(save.x||210,60,1220);
  player.y=clamp(save.y||560,385,642);
}

function startGame(mode='new'){
  audio.init();
  if(mode==='continue'){
    const save=readSave();
    if(save){
      game.state='playing'; game.resumed=true; ui.overlay.style.display='none'; applySave(save); beginStage({resume:true});
      toast('Progress restored'); return;
    }
  }
  clearSave();
  game.state='playing'; game.resumed=false; ui.overlay.style.display='none';
  game.stage=0; game.wave=0; game.score=0; player.lives=3; player.resetPosition(); beginStage();
}
ui.start.onclick=()=>startGame('new');
if(ui.continue) ui.continue.onclick=()=>startGame('continue');
ui.pause.addEventListener('click',togglePause);

function togglePause(){
  if(game.state==='playing'){
    game.state='paused'; saveGame('pause'); showOverlay('Paused','Progress saved. The street will wait.','Resume',true);
  } else if(game.state==='paused'){
    game.state='playing'; ui.overlay.style.display='none'; game.last=performance.now();
  }
}
function showOverlay(title,body,button='Continue',resumeOnly=false){
  ui.overlay.style.display='grid';
  ui.overlay.querySelector('.eyebrow').textContent='Neon Brawl';
  ui.overlay.querySelector('h1').innerHTML=`${title}<span>Streets of KL</span>`;
  ui.overlay.querySelector('p').textContent=body;
  ui.start.textContent=button;
  ui.start.onclick=()=>{
    if(game.state==='paused'){ game.state='playing'; ui.overlay.style.display='none'; game.last=performance.now(); }
    else startGame('new');
  };
  if(ui.continue) ui.continue.hidden=resumeOnly||!readSave();
}

function beginStage({resume=false}={}){
  const stage=stages[game.stage];
  game.enemies=[]; game.pickups=[]; game.particles=[];
  if(!resume) game.wave=0;
  player.x=resume?player.x:160; player.y=resume?player.y:560;
  if(!resume){ player.health=clamp(player.health+35,0,player.maxHealth); player.energy=100; }
  ui.stageLabel.querySelector('small').textContent=`Stage ${game.stage+1}`;
  ui.stageLabel.querySelector('strong').textContent=stage.name;
  ui.stageLabel.style.opacity=1;
  ui.objective.textContent=resume?`RESUMED · ${stage.name}`:stage.subtitle;
  ui.objective.style.opacity=1;
  setTimeout(()=>ui.stageLabel.style.opacity=0,1800);
  setTimeout(()=>ui.objective.style.opacity=0,2500);
  game.transition=1.9;
  saveGame(resume?'resume':'stage');
  setTimeout(spawnWave,1500);
}
function spawnWave(){
  if(game.state!=='playing') return;
  const stage=stages[game.stage], list=stage.waves[game.wave];
  if(!list){ spawnBoss(); return; }
  ui.objective.textContent=`Wave ${game.wave+1} · ${list.length} enemies`;
  ui.objective.style.opacity=1;
  setTimeout(()=>ui.objective.style.opacity=0,1200);
  list.forEach((type,index)=>{
    setTimeout(()=>{
      if(game.state!=='playing') return;
      const side=index%2?1:-1;
      const x=side>0?rand(1080,1200):rand(60,130), y=rand(410,625);
      game.enemies.push(new Enemy(type,x,y)); floatingText(x,y-110,'FIGHT!','#ffdf64');
    },index*350);
  });
  saveGame('wave');
}
function spawnBoss(){
  const stage=stages[game.stage];
  const boss=new Enemy(stage.bossType,1120,510,true);
  game.enemies.push(boss); ui.bossName.textContent=stage.boss; ui.bossCard.style.display='block';
  ui.objective.textContent=`BOSS · ${stage.boss}`; ui.objective.style.opacity=1;
  setTimeout(()=>ui.objective.style.opacity=0,1800); radialBurst(1120,450,stage.accent); saveGame('boss');
}
function waveCleared(){
  if(game.enemies.length===0 || game.enemies.some(enemy=>!enemy.dead)) return false;
  const boss=game.enemies.find(enemy=>enemy.boss);
  if(boss){
    ui.bossCard.style.display='none'; game.stage++;
    if(game.stage>=stages.length){
      clearSave(); game.state='victory';
      showOverlay('City Saved',`Final score ${String(game.score).padStart(6,'0')}. Rafi owns the night.`,'Play again',true);
    } else {
      game.wave=0; saveGame('stage-clear'); setTimeout(()=>beginStage(),1200);
    }
  } else {
    game.wave++; saveGame('wave-clear'); setTimeout(spawnWave,900);
  }
  game.enemies=[];
  return true;
}
function respawnPlayer(){
  player.lives--;
  if(player.lives<0){
    clearSave(); game.state='gameover';
    showOverlay('Game Over',`Score ${String(game.score).padStart(6,'0')}. The streets are still waiting.`,'Retry',true);
  } else {
    player.resetPosition(); radialBurst(player.x,player.y-50,'#6ef5ff'); saveGame('respawn');
  }
}

function update(dt){
  if(game.state!=='playing') return;
  if(game.slow>0){ game.slow-=dt; dt*=.18; }
  game.elapsed+=dt;
  player.update(dt);
  game.enemies.forEach(enemy=>enemy.update(dt));
  game.enemies=game.enemies.filter(enemy=>!enemy.remove);
  game.pickups.forEach(pickup=>pickup.update(dt));
  game.pickups=game.pickups.filter(pickup=>!pickup.taken);
  game.particles.forEach(particle=>{
    particle.life-=dt; particle.x+=particle.vx*dt; particle.y+=particle.vy*dt; particle.vy+=particle.gravity*dt;
  });
  game.particles=game.particles.filter(particle=>particle.life>0);
  game.texts.forEach(text=>{ text.life-=dt; text.y-=text.impact?24*dt:40*dt; });
  game.texts=game.texts.filter(text=>text.life>0);
  game.shake=Math.max(0,game.shake-35*dt);
  const boss=game.enemies.find(enemy=>enemy.boss&&!enemy.dead);
  if(boss) ui.bossFill.style.transform=`scaleX(${boss.health/boss.maxHealth})`;
  waveCleared(); updateUI();

  game.saveAccumulator+=dt;
  if(game.saveAccumulator>=2.5){
    game.saveAccumulator=0;
    if(game.saveDirty!==false) saveGame('auto');
  }
}
function updateUI(){
  ui.health.style.transform=`scaleX(${clamp(player.health/player.maxHealth,0,1)})`;
  ui.energy.style.transform=`scaleX(${player.energy/100})`;
  ui.score.textContent=`SCORE ${String(game.score).padStart(6,'0')}`;
  ui.lives.textContent=`× ${Math.max(0,player.lives)}`;
  if(player.comboTimer<=0) ui.combo.style.opacity=0;
}

addEventListener('pagehide',()=>saveGame('pagehide'));
addEventListener('beforeunload',()=>saveGame('pagehide'));
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') saveGame('pagehide'); });
updateContinueButton();
