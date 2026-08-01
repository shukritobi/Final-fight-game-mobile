'use strict';

function drawImpactStar(particle,progress){
  const outer=particle.size*(.72+progress*.78), inner=outer*.34, spikes=particle.spikes||8;
  ctx.save(); ctx.translate(particle.x,particle.y); ctx.rotate(progress*.45);
  ctx.beginPath();
  for(let i=0;i<spikes*2;i++){
    const radius=i%2===0?outer:inner, angle=i/(spikes*2)*Math.PI*2;
    const x=Math.cos(angle)*radius, y=Math.sin(angle)*radius;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.closePath(); ctx.fillStyle=particle.color; ctx.shadowColor=particle.color; ctx.shadowBlur=18; ctx.fill();
  ctx.strokeStyle='#ffffff'; ctx.lineWidth=2.5; ctx.stroke(); ctx.restore();
}

function drawParticle(particle){
  const progress=1-particle.life/particle.max;
  const alpha=clamp(particle.life/particle.max,0,1);
  ctx.save(); ctx.globalAlpha=alpha;
  if(particle.type==='line'||particle.type==='shard'){
    ctx.strokeStyle=particle.color; ctx.lineWidth=particle.size; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(particle.x,particle.y);
    const factor=particle.type==='shard'?.05:.035;
    ctx.lineTo(particle.x-particle.vx*factor,particle.y-particle.vy*factor); ctx.stroke();
  } else if(particle.type==='star'){
    drawImpactStar(particle,progress);
  } else if(particle.type==='ring'){
    ctx.strokeStyle=particle.color; ctx.lineWidth=Math.max(1,5*(1-progress));
    ctx.beginPath(); ctx.arc(particle.x,particle.y,particle.size*(.25+progress),0,Math.PI*2); ctx.stroke();
  } else if(particle.type==='dust'){
    ctx.fillStyle=particle.color; ctx.globalAlpha=alpha*.32;
    ctx.beginPath(); ctx.ellipse(particle.x,particle.y,particle.size*(1+progress),particle.size*.48,0,0,Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle=particle.color; ctx.beginPath(); ctx.arc(particle.x,particle.y,particle.size,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawFloatingText(label){
  ctx.save();
  ctx.globalAlpha=clamp(label.life/label.max,0,1);
  ctx.translate(label.x,label.y);
  ctx.rotate(label.rotation||0);
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font=`1000 ${label.size||22}px ui-sans-serif,system-ui,sans-serif`;
  ctx.lineJoin='round'; ctx.lineWidth=label.impact?8:5; ctx.strokeStyle='#111326';
  ctx.shadowColor='#000'; ctx.shadowBlur=label.impact?10:6;
  ctx.strokeText(label.text,0,0);
  ctx.fillStyle=label.color; ctx.fillText(label.text,0,0);
  if(label.impact){
    ctx.globalAlpha*=.55; ctx.fillStyle='#ffffff'; ctx.fillText(label.text,0,-2);
  }
  ctx.restore();
}

function draw(){
  ctx.save();
  ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  ctx.imageSmoothingEnabled=false;
  const shakeX=game.shake?rand(-game.shake,game.shake):0;
  const shakeY=game.shake?rand(-game.shake*.5,game.shake*.5):0;
  ctx.translate(shakeX,shakeY);
  drawBackground(Math.min(game.stage,stages.length-1),game.elapsed);

  const actors=[...game.enemies,player].sort((a,b)=>a.y-b.y);
  for(const actor of actors){
    const airborneScale=clamp(1-actor.z/520,.5,1);
    ctx.save();
    ctx.globalAlpha=actor.dead?.28:.34;
    ctx.fillStyle='#02040a';
    ctx.beginPath();
    ctx.ellipse(actor.x,actor.y+2,(actor.boss?52:35)*airborneScale,(actor.boss?15:11)*airborneScale,0,0,Math.PI*2);
    ctx.fill(); ctx.restore();
  }

  game.pickups.forEach(item=>item.draw());
  actors.forEach(actor=>spriteRenderer.draw(actor));
  game.particles.forEach(drawParticle);
  game.texts.forEach(drawFloatingText);

  if(game.transition>0){
    game.transition=Math.max(0,game.transition-1/60);
    const height=55*clamp(game.transition,0,1);
    ctx.fillStyle='#03040a'; ctx.fillRect(0,0,W,height); ctx.fillRect(0,H-height,W,height);
  }
  ctx.restore();
}

function loop(now){
  const dt=Math.min(.033,(now-game.last)/1000||0);
  game.last=now; update(dt); draw(); requestAnimationFrame(loop);
}

const gameShell=document.getElementById('game-shell');
['gesturestart','gesturechange','gestureend'].forEach(type=>document.addEventListener(type,event=>event.preventDefault(),{passive:false}));
document.addEventListener('touchmove',event=>{ if(gameShell.contains(event.target)) event.preventDefault(); },{passive:false});
let lastTouchEnd=0;
document.addEventListener('touchend',event=>{
  const now=Date.now(); if(now-lastTouchEnd<=350) event.preventDefault(); lastTouchEnd=now;
},{passive:false});
document.addEventListener('dblclick',event=>event.preventDefault(),{passive:false});
addEventListener('contextmenu',event=>event.preventDefault());

requestAnimationFrame(loop);
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
