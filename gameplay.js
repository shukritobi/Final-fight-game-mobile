'use strict';
class Pickup {
  constructor(kind,x,y){ this.kind=kind; this.x=x; this.y=y; this.t=0; this.taken=false; }
  update(dt){ this.t+=dt; }
  draw(){
    if(this.taken) return;
    const bob=Math.sin(this.t*4)*5;
    ctx.save();
    ctx.translate(this.x,this.y-18+bob);
    ctx.shadowBlur=18;
    ctx.shadowColor=this.kind==='health'?'#ff546d':'#ffe36a';
    if(this.kind==='health'){
      ctx.fillStyle='#f7f8ff';
      roundRect(-18,-16,36,28,7,true);
      ctx.fillStyle='#ff486a';
      ctx.fillRect(-5,-11,10,18);
      ctx.fillRect(-10,-6,20,8);
    } else {
      ctx.rotate(-.45);
      ctx.fillStyle=this.kind==='staff'?'#d5b77b':this.kind==='pipe'?'#b6cad2':'#8d5b35';
      roundRect(-34,-5,68,10,5,true);
      ctx.fillStyle='#fff3';
      ctx.fillRect(-24,-3,42,2);
    }
    ctx.restore();
  }
}

function dropPickup(x,y){
  const kinds=['health','bat','pipe','staff'];
  game.pickups.push(new Pickup(kinds[Math.floor(Math.random()*kinds.length)],x,y));
}
function roundRect(x,y,w,h,r,fill=false,stroke=false){
  ctx.beginPath();
  ctx.roundRect(x,y,w,h,r);
  if(fill) ctx.fill();
  if(stroke) ctx.stroke();
}
function burst(x,y,count,color){
  for(let i=0;i<count;i++){
    const life=rand(.18,.55);
    game.particles.push({
      x,y,vx:rand(-260,260),vy:rand(-260,40),life,max:life,
      size:rand(2,7),color,gravity:520,type:'spark'
    });
  }
}
function dustBurst(x,y,count=7){
  for(let i=0;i<count;i++){
    const life=rand(.22,.48);
    game.particles.push({
      x:x+rand(-20,20),y:y+rand(-3,4),vx:rand(-80,80),vy:rand(-65,-20),life,max:life,
      size:rand(5,12),color:'rgba(210,226,240,.48)',gravity:90,type:'dust'
    });
  }
}
function radialBurst(x,y,color){
  for(let i=0;i<28;i++){
    const angle=i/28*Math.PI*2;
    const speed=rand(120,420);
    const life=rand(.25,.65);
    game.particles.push({
      x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life,max:life,
      size:rand(2,6),color,gravity:0,type:'line'
    });
  }
}
function impactBurst(x,y,kind='punch',strong=false,color='#fff',direction=1,weapon=null){
  const palette={
    punch:'#fff0a8', kick:'#ffc857', uppercut:'#76f4ff', flyingKick:'#ff84dc',
    special:'#8cfbff', block:'#b9d8ff', ko:'#ffe56e'
  };
  const impactColor=weapon?'#eaf9ff':(palette[kind]||color||'#fff');
  const life=strong?.34:.24;
  game.particles.push({x,y,vx:0,vy:0,life,max:life,size:strong?38:27,color:impactColor,gravity:0,type:'star',rotation:rand(-.4,.4),spikes:strong?9:7});
  game.particles.push({x,y,vx:0,vy:0,life,max:life,size:strong?20:14,color:impactColor,gravity:0,type:'ring',growth:strong?150:105});

  const shardCount=strong?18:10;
  for(let i=0;i<shardCount;i++){
    const angle=rand(-1.2,1.2)+(direction>0?0:Math.PI);
    const speed=rand(strong?180:120,strong?520:340);
    const shardLife=rand(.16,strong?.48:.34);
    game.particles.push({
      x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
      life:shardLife,max:shardLife,size:rand(2,strong?7:5),color:impactColor,
      gravity:strong?180:260,type:'line'
    });
  }
  burst(x,y,strong?12:6,color||impactColor);

  if(kind==='block'){
    floatingText(x,y-42,'CLANG!','#cce8ff',strong?26:22);
  } else if(strong){
    const words=kind==='uppercut'?['RISING!','UPPERCUT!']:kind==='flyingKick'?['FLYING KICK!','WHAM!']:kind==='ko'?['K.O.!','CRASH!']:['POW!','BAM!','WHAM!'];
    floatingText(x,y-46,words[Math.floor(Math.random()*words.length)],impactColor,kind==='ko'?36:30);
  } else if(Math.random()<.32){
    const words=kind==='kick'?['THUD!','KRAK!']:['POW!','BAP!'];
    floatingText(x,y-38,words[Math.floor(Math.random()*words.length)],impactColor,22);
  }
}
function floatingText(x,y,text,color='#fff',size=22){
  game.texts.push({x,y,text,color,life:1,max:1,size,rotation:rand(-.1,.1)});
}
function toast(text){
  ui.toast.textContent=text;
  ui.toast.style.opacity=1;
  clearTimeout(toast.t);
  toast.t=setTimeout(()=>ui.toast.style.opacity=0,1100);
}

function startGame(){
  audio.init();
  game.state='playing';
  ui.overlay.style.display='none';
  game.stage=0;
  game.wave=0;
  game.score=0;
  player.lives=3;
  player.resetPosition();
  beginStage();
}
ui.start.onclick=startGame;
ui.pause.addEventListener('click',togglePause);
function togglePause(){
  if(game.state==='playing'){
    game.state='paused';
    showOverlay('Paused','Take a breath. The street will wait.','Resume');
  } else if(game.state==='paused'){
    game.state='playing';
    ui.overlay.style.display='none';
    game.last=performance.now();
  }
}
function showOverlay(title,body,button='Continue'){
  ui.overlay.style.display='grid';
  ui.overlay.querySelector('.eyebrow').textContent='Neon Brawl';
  ui.overlay.querySelector('h1').innerHTML=`${title}<span>Streets of KL</span>`;
  ui.overlay.querySelector('p').textContent=body;
  ui.start.textContent=button;
  ui.start.onclick=()=>{
    if(game.state==='paused'){
      game.state='playing';
      ui.overlay.style.display='none';
      game.last=performance.now();
    } else startGame();
  };
}

function beginStage(){
  const stage=stages[game.stage];
  game.enemies=[];
  game.pickups=[];
  game.particles=[];
  game.wave=0;
  player.x=160;
  player.y=560;
  player.health=clamp(player.health+35,0,player.maxHealth);
  player.energy=100;
  ui.stageLabel.querySelector('small').textContent=`Stage ${game.stage+1}`;
  ui.stageLabel.querySelector('strong').textContent=stage.name;
  ui.stageLabel.style.opacity=1;
  ui.objective.textContent=stage.subtitle;
  ui.objective.style.opacity=1;
  setTimeout(()=>ui.stageLabel.style.opacity=0,1800);
  setTimeout(()=>ui.objective.style.opacity=0,2500);
  game.transition=1.9;
  setTimeout(spawnWave,1500);
}
function spawnWave(){
  const stage=stages[game.stage];
  const list=stage.waves[game.wave];
  if(!list){
    spawnBoss();
    return;
  }
  ui.objective.textContent=`Wave ${game.wave+1} · ${list.length} enemies`;
  ui.objective.style.opacity=1;
  setTimeout(()=>ui.objective.style.opacity=0,1200);
  list.forEach((type,index)=>{
    setTimeout(()=>{
      const side=index%2?1:-1;
      const x=side>0?rand(1080,1200):rand(60,130);
      const y=rand(410,625);
      game.enemies.push(new Enemy(type,x,y));
      floatingText(x,y-110,'FIGHT!','#ffdf64',24);
    },index*350);
  });
}
function spawnBoss(){
  const stage=stages[game.stage];
  const boss=new Enemy(stage.bossType,1120,510,true);
  game.enemies.push(boss);
  ui.bossName.textContent=stage.boss;
  ui.bossCard.style.display='block';
  ui.objective.textContent=`BOSS · ${stage.boss}`;
  ui.objective.style.opacity=1;
  setTimeout(()=>ui.objective.style.opacity=0,1800);
  radialBurst(1120,450,stage.accent);
}
function waveCleared(){
  if(game.enemies.some(enemy=>!enemy.dead)) return false;
  if(game.enemies.length===0) return false;
  const boss=game.enemies.find(enemy=>enemy.boss);
  if(boss){
    ui.bossCard.style.display='none';
    game.stage++;
    if(game.stage>=stages.length){
      game.state='victory';
      showOverlay('City Saved',`Final score ${String(game.score).padStart(6,'0')}. Rafi owns the night.`,'Play again');
    } else setTimeout(beginStage,1200);
  } else {
    game.wave++;
    setTimeout(spawnWave,900);
  }
  game.enemies=[];
  return true;
}
function respawnPlayer(){
  player.lives--;
  if(player.lives<0){
    game.state='gameover';
    showOverlay('Game Over',`Score ${String(game.score).padStart(6,'0')}. The streets are still waiting.`,'Retry');
  } else {
    player.resetPosition();
    radialBurst(player.x,player.y-50,'#6ef5ff');
  }
}

function update(dt){
  if(game.state!=='playing') return;
  if(game.slow>0){
    game.slow-=dt;
    dt*=.18;
  }
  game.elapsed+=dt;
  player.update(dt);
  game.enemies.forEach(enemy=>enemy.update(dt));
  game.enemies=game.enemies.filter(enemy=>!enemy.remove);
  game.pickups.forEach(pickup=>pickup.update(dt));
  game.pickups=game.pickups.filter(pickup=>!pickup.taken);

  game.particles.forEach(particle=>{
    particle.life-=dt;
    particle.x+=(particle.vx||0)*dt;
    particle.y+=(particle.vy||0)*dt;
    particle.vy=(particle.vy||0)+(particle.gravity||0)*dt;
    if(particle.type==='dust') particle.size+=18*dt;
  });
  game.particles=game.particles.filter(particle=>particle.life>0);

  game.texts.forEach(label=>{
    label.life-=dt;
    label.y-=42*dt;
  });
  game.texts=game.texts.filter(label=>label.life>0);
  game.shake=Math.max(0,game.shake-35*dt);

  const boss=game.enemies.find(enemy=>enemy.boss&&!enemy.dead);
  if(boss) ui.bossFill.style.transform=`scaleX(${boss.health/boss.maxHealth})`;
  waveCleared();
  updateUI();
}

function updateUI(){
  ui.health.style.transform=`scaleX(${clamp(player.health/player.maxHealth,0,1)})`;
  ui.energy.style.transform=`scaleX(${player.energy/100})`;
  ui.score.textContent=`SCORE ${String(game.score).padStart(6,'0')}`;
  ui.lives.textContent=`× ${Math.max(0,player.lives)}`;
  if(player.comboTimer<=0) ui.combo.style.opacity=0;
}
