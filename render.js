'use strict';

function segment(x1,y1,x2,y2,width,color){
  ctx.lineCap='round';
  ctx.strokeStyle=color;
  ctx.lineWidth=width;
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.12)';
  ctx.lineWidth=Math.max(2,width*.16);
  ctx.beginPath();
  ctx.moveTo(x1-2,y1-2);
  ctx.lineTo(x2-2,y2-2);
  ctx.stroke();
}

function jointedArm(shoulderX,shoulderY,elbowX,elbowY,handX,handY,width,color,glove){
  segment(shoulderX,shoulderY,elbowX,elbowY,width,color);
  segment(elbowX,elbowY,handX,handY,width*.88,color);
  hand(handX,handY,glove);
}

function hand(x,y,color){
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.arc(x,y,9,0,Math.PI*2);
  ctx.fill();
}

function foot(x,y,color,size=1,rotation=0){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(rotation);
  ctx.scale(size,size);
  ctx.fillStyle=color;
  roundRect(-9,-3,25,10,5,true);
  ctx.fillStyle='rgba(255,255,255,.38)';
  ctx.fillRect(4,-1,8,2);
  ctx.restore();
}

function drawActor(actor){
  const px=actor.x;
  const py=actor.y-actor.z;
  const walking=actor.state==='walk';
  const striking=actor.state==='punch';
  const kicking=actor.state==='kick';
  const powered=actor.state==='special';
  const uppercut=actor.state==='uppercut';
  const flyingKick=actor.state==='flyingKick';
  const jumping=actor.state==='jump'||actor.z>0;
  const cycle=actor.anim;
  const bob=walking?Math.sin(cycle)*3:jumping?0:Math.sin(cycle*.5)*1.5;
  const stride=walking?Math.sin(cycle)*12:0;
  const action=actor.attackDuration?clamp(1-actor.attackTimer/actor.attackDuration,0,1):0;
  const punchReach=striking?Math.sin(action*Math.PI):0;
  const kickArc=kicking?Math.sin(clamp(action*1.25,0,1)*Math.PI):0;
  const upperReach=uppercut?Math.sin(clamp(action*1.18,0,1)*Math.PI):0;
  const flyingReach=flyingKick?Math.sin(clamp(action*1.15,0,1)*Math.PI):0;
  const spin=powered?Math.sin(action*Math.PI*2):0;
  const guardSway=walking?Math.sin(cycle*.75)*2.5:Math.sin(cycle*.45)*1.2;

  ctx.save();
  ctx.translate(px,py);
  if(actor.dir<0) ctx.scale(-1,1);
  if(actor.dead) ctx.rotate(-.55-1.15*clamp(actor.z/100,0,1));
  else if(flyingKick) ctx.rotate(-.17*flyingReach);
  else if(uppercut) ctx.rotate(-.07*upperReach);
  ctx.translate(0,bob);
  if(actor.hurt>0) ctx.rotate(-.08);

  if(actor.boss||powered||uppercut||flyingKick){
    const aura=ctx.createRadialGradient(0,-58,8,0,-58,actor.boss?96:powered?116:82);
    aura.addColorStop(0,actor.accent);
    aura.addColorStop(1,'transparent');
    ctx.globalAlpha=actor.boss?.17:powered?.27:.11;
    ctx.fillStyle=aura;
    ctx.fillRect(-120,-190,240,235);
    ctx.globalAlpha=1;
  }

  if(flyingKick){
    segment(-10,-42,-30,-24,19,'#18233c');
    foot(-30,-24,actor.accent,.95,-.45);
  } else if(uppercut||jumping){
    segment(-10,-42,-30,-20,19,'#18233c');
    foot(-30,-20,actor.accent,.92,-.45);
  } else {
    segment(-10+stride*.35,-42,-18-stride,-2,19,'#18233c');
    foot(-18-stride,-1,actor.accent);
  }

  const body=ctx.createLinearGradient(-28,-112,30,-44);
  body.addColorStop(0,actor.color);
  body.addColorStop(1,'#11172b');
  ctx.fillStyle=body;
  ctx.beginPath();
  ctx.moveTo(-27,-106);
  ctx.quadraticCurveTo(0,-122,28,-105);
  ctx.lineTo(23,-48);
  ctx.quadraticCurveTo(0,-35,-25,-49);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.16)';
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo(-15,-103);
  ctx.lineTo(-8,-53);
  ctx.stroke();

  ctx.fillStyle=actor.accent;
  ctx.fillRect(-25,-55,49,7);
  ctx.fillStyle='rgba(255,255,255,.48)';
  ctx.fillRect(-2,-55,8,7);

  if(flyingKick){
    const legX=lerp(48,112,flyingReach);
    const legY=lerp(-38,-66,flyingReach);
    segment(12,-45,legX,legY,20,'#22304a');
    foot(legX,legY,actor.accent,1.25,-.08);
  } else if(kicking||powered){
    const endX=45+kickArc*58+Math.abs(spin)*45;
    const endY=-36-kickArc*24;
    segment(12,-45,endX,endY,20,'#22304a');
    foot(endX,endY,actor.accent,1.2);
  } else if(uppercut||jumping){
    segment(12,-45,34,-22,20,'#22304a');
    foot(34,-22,actor.accent,.95,.35);
  } else {
    segment(12-stride*.2,-44,18+stride,-1,20,'#22304a');
    foot(18+stride,-1,actor.accent);
  }

  const frontShoulder={x:17,y:-94};
  const rearShoulder={x:-18,y:-94};
  const frontGuardElbow={x:31,y:-79+guardSway};
  const frontGuardHand={x:13,y:-70+guardSway};
  const rearGuardElbow={x:-31,y:-83-guardSway};
  const rearGuardHand={x:-8,y:-75-guardSway};

  if(uppercut){
    const elbowX=lerp(frontGuardElbow.x,31,upperReach);
    const elbowY=lerp(frontGuardElbow.y,-126,upperReach);
    const handX=lerp(frontGuardHand.x,20,upperReach);
    const handY=lerp(frontGuardHand.y,-171,upperReach);
    jointedArm(frontShoulder.x,frontShoulder.y,elbowX,elbowY,handX,handY,16,actor.color,actor.accent);
    jointedArm(rearShoulder.x,rearShoulder.y,rearGuardElbow.x,rearGuardElbow.y,rearGuardHand.x,rearGuardHand.y,15,actor.color,actor.accent);
  } else if(flyingKick){
    jointedArm(frontShoulder.x,frontShoulder.y,33,-91,18,-73,16,actor.color,actor.accent);
    jointedArm(rearShoulder.x,rearShoulder.y,-39,-97,-62,-82,15,actor.color,actor.accent);
  } else if(striking){
    const windup=clamp(action/.22,0,1);
    const extendedHandX=104;
    const extendedHandY=-92;
    const frontElbowX=lerp(frontGuardElbow.x-5*windup,60,punchReach);
    const frontElbowY=lerp(frontGuardElbow.y+3*windup,-92,punchReach);
    const frontHandX=lerp(frontGuardHand.x-9*windup,extendedHandX,punchReach);
    const frontHandY=lerp(frontGuardHand.y+4*windup,extendedHandY,punchReach);
    jointedArm(frontShoulder.x,frontShoulder.y,frontElbowX,frontElbowY,frontHandX,frontHandY,16,actor.color,actor.accent);
    jointedArm(rearShoulder.x,rearShoulder.y,rearGuardElbow.x,rearGuardElbow.y,rearGuardHand.x,rearGuardHand.y,15,actor.color,actor.accent);
  } else if(powered){
    const rightHandX=48+spin*45;
    const leftHandX=-45-spin*45;
    jointedArm(18,-94,35+spin*18,-88,rightHandX,-70,16,actor.color,actor.accent);
    jointedArm(-18,-94,-34-spin*18,-88,leftHandX,-72,15,actor.color,actor.accent);
  } else {
    jointedArm(frontShoulder.x,frontShoulder.y,frontGuardElbow.x,frontGuardElbow.y,frontGuardHand.x,frontGuardHand.y,16,actor.color,actor.accent);
    jointedArm(rearShoulder.x,rearShoulder.y,rearGuardElbow.x,rearGuardElbow.y,rearGuardHand.x,rearGuardHand.y,15,actor.color,actor.accent);
  }

  if(actor.weapon){
    let weaponHandX=frontGuardHand.x;
    let weaponHandY=frontGuardHand.y;
    if(striking){
      weaponHandX=lerp(frontGuardHand.x,104,punchReach);
      weaponHandY=lerp(frontGuardHand.y,-92,punchReach);
    } else if(uppercut){
      weaponHandX=lerp(frontGuardHand.x,20,upperReach);
      weaponHandY=lerp(frontGuardHand.y,-171,upperReach);
    }
    ctx.save();
    ctx.translate(weaponHandX,weaponHandY);
    ctx.rotate(striking?-.15:uppercut?.15:-.55);
    ctx.fillStyle=actor.weapon==='staff'?'#cda96b':actor.weapon==='knife'?'#d7f2ff':actor.weapon==='pipe'?'#a6bac4':'#8c5a35';
    roundRect(0,-4,actor.weapon==='knife'?42:68,8,4,true);
    if(actor.weapon==='knife'){
      ctx.fillStyle='#405060';
      ctx.fillRect(-10,-6,14,12);
    }
    ctx.restore();
  }

  ctx.fillStyle='#b97754';
  ctx.beginPath();
  ctx.arc(0,-126,actor.boss?22:19,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle=actor.type==='vex'?'#eee8d9':'#10111b';
  ctx.beginPath();
  ctx.arc(0,-132,actor.boss?23:20,Math.PI,Math.PI*2);
  ctx.lineTo(18,-126);
  ctx.quadraticCurveTo(2,-136,-18,-126);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle='#111';
  ctx.fillRect(7,-128,7,3);
  ctx.fillStyle=actor.accent;
  ctx.fillRect(9,-128,3,2);

  if(actor.boss){
    ctx.fillStyle=actor.accent;
    ctx.fillRect(-27,-112,54,5);
    ctx.globalAlpha=.6;
    ctx.fillRect(-13,-153,26,4);
    ctx.globalAlpha=1;
  }

  if(actor.flash>0){
    ctx.save();
    ctx.globalCompositeOperation='screen';
    ctx.globalAlpha=clamp(actor.flash/.12,0,1)*.42;
    ctx.strokeStyle='#ffffff';
    ctx.lineWidth=4;
    ctx.shadowColor=actor.accent;
    ctx.shadowBlur=18;
    ctx.beginPath();
    ctx.ellipse(0,-80,38,70,0,0,Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawImpactStar(particle,progress){
  const outer=particle.size*(.75+progress*.8);
  const inner=outer*.34;
  const spikes=particle.spikes||8;
  ctx.save();
  ctx.translate(particle.x,particle.y);
  ctx.rotate((particle.rotation||0)+progress*.45);
  ctx.beginPath();
  for(let i=0;i<spikes*2;i++){
    const radius=i%2===0?outer:inner;
    const angle=-Math.PI/2+i*Math.PI/spikes;
    const x=Math.cos(angle)*radius;
    const y=Math.sin(angle)*radius;
    if(i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  }
  ctx.closePath();
  ctx.fillStyle=particle.color;
  ctx.shadowColor=particle.color;
  ctx.shadowBlur=18;
  ctx.fill();
  ctx.globalAlpha*=.9;
  ctx.fillStyle='#fff';
  ctx.beginPath();
  ctx.arc(0,0,Math.max(3,outer*.16),0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawParticle(particle){
  const alpha=clamp(particle.life/particle.max,0,1);
  const progress=1-alpha;
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.fillStyle=particle.color;
  ctx.strokeStyle=particle.color;

  if(particle.type==='line'){
    ctx.lineCap='round';
    ctx.lineWidth=particle.size;
    ctx.shadowColor=particle.color;
    ctx.shadowBlur=8;
    ctx.beginPath();
    ctx.moveTo(particle.x,particle.y);
    ctx.lineTo(particle.x-(particle.vx||0)*.035,particle.y-(particle.vy||0)*.035);
    ctx.stroke();
  } else if(particle.type==='ring'){
    const radius=particle.size+(particle.growth||100)*progress;
    ctx.lineWidth=Math.max(1,5*(1-progress));
    ctx.shadowColor=particle.color;
    ctx.shadowBlur=14;
    ctx.beginPath();
    ctx.arc(particle.x,particle.y,radius,0,Math.PI*2);
    ctx.stroke();
  } else if(particle.type==='star'){
    drawImpactStar(particle,progress);
  } else if(particle.type==='dust'){
    ctx.beginPath();
    ctx.ellipse(particle.x,particle.y,particle.size*1.6,particle.size*.55,0,0,Math.PI*2);
    ctx.fill();
  } else {
    ctx.shadowColor=particle.color;
    ctx.shadowBlur=5;
    ctx.beginPath();
    ctx.arc(particle.x,particle.y,particle.size,0,Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

function draw(){
  ctx.save();
  ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  const shakeX=game.shake?rand(-game.shake,game.shake):0;
  const shakeY=game.shake?rand(-game.shake*.5,game.shake*.5):0;
  ctx.translate(shakeX,shakeY);
  drawBackground(Math.min(game.stage,stages.length-1),game.elapsed);

  const actors=[...game.enemies,player].sort((a,b)=>a.y-b.y);
  for(const actor of actors){
    ctx.save();
    ctx.globalAlpha=actor.dead?.45:.35;
    ctx.fillStyle='#02040a';
    ctx.beginPath();
    const shadowScale=clamp(1-actor.z/420,.45,1);
    ctx.ellipse(actor.x,actor.y+2,(actor.boss?52:35)*shadowScale,(actor.boss?15:11)*shadowScale,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  game.pickups.forEach(item=>item.draw());
  actors.forEach(drawActor);
  game.particles.forEach(drawParticle);

  for(const label of game.texts){
    ctx.save();
    const alpha=clamp(label.life/label.max,0,1);
    const pop=1+Math.sin((1-alpha)*Math.PI)*.22;
    ctx.globalAlpha=alpha;
    ctx.translate(label.x,label.y);
    ctx.rotate(label.rotation||0);
    ctx.scale(pop,pop);
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.font=`1000 ${label.size||22}px Impact, Haettenschweiler, Arial Black, sans-serif`;
    ctx.lineJoin='round';
    ctx.strokeStyle='rgba(6,8,20,.88)';
    ctx.lineWidth=Math.max(4,(label.size||22)*.18);
    ctx.strokeText(label.text,0,0);
    ctx.fillStyle=label.color;
    ctx.shadowColor=label.color;
    ctx.shadowBlur=12;
    ctx.fillText(label.text,0,0);
    ctx.restore();
  }

  if(game.transition>0){
    game.transition=Math.max(0,game.transition-1/60);
    const barHeight=55*clamp(game.transition,0,1);
    ctx.fillStyle='#03040a';
    ctx.fillRect(0,0,W,barHeight);
    ctx.fillRect(0,H-barHeight,W,barHeight);
  }
  ctx.restore();
}

function loop(now){
  const dt=Math.min(.033,(now-game.last)/1000||0);
  game.last=now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

const gameShell=document.getElementById('game-shell');
['gesturestart','gesturechange','gestureend'].forEach(type=>{
  document.addEventListener(type,event=>event.preventDefault(),{passive:false});
});
document.addEventListener('touchmove',event=>{
  if(gameShell.contains(event.target)) event.preventDefault();
},{passive:false});
let lastTouchEnd=0;
document.addEventListener('touchend',event=>{
  const now=Date.now();
  if(now-lastTouchEnd<=350) event.preventDefault();
  lastTouchEnd=now;
},{passive:false});
document.addEventListener('dblclick',event=>event.preventDefault(),{passive:false});

requestAnimationFrame(loop);
addEventListener('contextmenu',event=>event.preventDefault());
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').then(registration=>registration.update()).catch(()=>{});
}
