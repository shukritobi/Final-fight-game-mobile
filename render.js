'use strict';
function drawFighter(f){
    const x=f.x, y=f.y-f.z; ctx.save(); ctx.translate(x,y); if(f.dir<0)ctx.scale(-1,1);
    const hurt=f.hurt>0, dead=f.dead; if(dead)ctx.rotate(-1.15*clamp(f.z/100,0,1)-.55);
    // shadow is handled separately
    const t=f.anim, walk=f.state==='walk', punch=f.state==='punch', kick=f.state==='kick', special=f.state==='special';
    const bob=walk?Math.sin(t)*3:Math.sin(t*.5)*1.5; const step=walk?Math.sin(t)*12:0;
    const punchP=punch?easeOut(1-f.attackTimer/f.attackDuration):0; const kickP=kick?Math.sin(Math.min(1,(1-f.attackTimer/f.attackDuration)*1.25)*Math.PI):0; const spin=special?Math.sin((1-f.attackTimer/f.attackDuration)*Math.PI*2):0;
    ctx.translate(0,bob); if(hurt)ctx.rotate(-.08);
    // aura for bosses and specials
    if(f.boss||special){ctx.save();ctx.globalAlpha=f.boss ? .16 : .26;const a=ctx.createRadialGradient(0,-55,10,0,-55,f.boss?95:115);a.addColorStop(0,f.accent);a.addColorStop(1,'transparent');ctx.fillStyle=a;ctx.fillRect(-120,-180,240,220);ctx.restore();}
    // back leg
    limb(-10+step*.35,-42,-18-step,-2,19,'#18233c'); shoe(-18-step,-1,f.accent);
    // torso gradient
    const body=ctx.createLinearGradient(-28,-110,28,-45); body.addColorStop(0,f.color); body.addColorStop(1,'#11172b');
    ctx.fillStyle=body; ctx.beginPath();ctx.moveTo(-27,-106);ctx.quadraticCurveTo(0,-122,28,-105);ctx.lineTo(23,-48);ctx.quadraticCurveTo(0,-35,-25,-49);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-15,-103);ctx.lineTo(-8,-53);ctx.stroke();
    // belt
    ctx.fillStyle=f.accent;ctx.fillRect(-25,-55,49,7);ctx.fillStyle='#fff8';ctx.fillRect(-2,-55,8,7);
    // front leg and kick
    if(kick||special){ const ex=45+kickP*58+Math.abs(spin)*45, ey=-36-kickP*24; limb(12,-45,ex,ey,20,'#22304a'); shoe(ex,ey,f.accent,1.2); }
    else { limb(12-step*.2,-44,18+step,-1,20,'#22304a'); shoe(18+step,-1,f.accent); }
    // arms
    const armColor=f.color;
    if(punch){ limb(17,-93,42+punchP*56,-86-punchP*5,16,armColor); fist(44+punchP*58,-86-punchP*5,f.accent); limb(-18,-93,-30,-61,15,armColor); fist(-31,-58,f.accent); }
    else if(special){ limb(18,-94,55+spin*45,-70,16,armColor);fist(58+spin*45,-68,f.accent);limb(-18,-94,-50-spin*45,-72,16,armColor);fist(-52-spin*45,-70,f.accent); }
    else { limb(17,-94,29,-64+Math.sin(t*.7)*4,16,armColor);fist(30,-61,f.accent);limb(-18,-94,-30,-67-Math.sin(t*.7)*4,15,armColor);fist(-30,-63,f.accent); }
    // weapon
    if(f.weapon){ctx.save();ctx.translate(30,-62);ctx.rotate(punch?-.55:-.2);ctx.fillStyle=f.weapon==='staff'?'#cda96b':f.weapon==='knife'?'#d7f2ff':f.weapon==='pipe'?'#a6bac4':'#8c5a35';roundRect(0,-4,f.weapon==='knife'?42:68,8,4,true);if(f.weapon==='knife'){ctx.fillStyle='#405060';ctx.fillRect(-10,-6,14,12);}ctx.restore();}
    // head and hair
    ctx.fillStyle='#b97754';ctx.beginPath();ctx.arc(0,-126,f.boss?22:19,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=f.type==='vex'?'#eee8d9':'#10111b';ctx.beginPath();ctx.arc(0,-132,f.boss?23:20,Math.PI,Math.PI*2);ctx.lineTo(18,-126);ctx.quadraticCurveTo(2,-136,-18,-126);ctx.closePath();ctx.fill();
    // face
    ctx.fillStyle='#111';ctx.fillRect(7,-128,7,3);ctx.fillStyle=f.accent;ctx.fillRect(9,-128,3,2);
    if(f.boss){ctx.fillStyle=f.accent;ctx.fillRect(-27,-112,54,5);ctx.globalAlpha=.6;ctx.fillRect(-13,-153,26,4);ctx.globalAlpha=1;}
    // flash overlay
    if(f.flash>0){ctx.globalCompositeOperation='source-atop';ctx.fillStyle='#fff';ctx.globalAlpha=.8;ctx.fillRect(-100,-180,220,210);}
    ctx.restore();
  }
  function limb(x1,y1,x2,y2,width,color){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=Math.max(2,width*.18);ctx.beginPath();ctx.moveTo(x1-2,y1-2);ctx.lineTo(x2-2,y2-2);ctx.stroke();}
  function fist(x,y,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill();}
  function shoe(x,y,color,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle=color;roundRect(-9,-3,25,10,5,true);ctx.fillStyle='#fff6';ctx.fillRect(4,-1,8,2);ctx.restore();}

  function draw(){
    ctx.save(); ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    const sx=game.shake?rand(-game.shake,game.shake):0, sy=game.shake?rand(-game.shake*.5,game.shake*.5):0; ctx.translate(sx,sy);
    drawBackground(game.stage>=stages.length?stages.length-1:game.stage,game.elapsed);
    // shadows and depth sorted entities
    const entities=[...game.enemies,player].sort((a,b)=>a.y-b.y);
    for(const e of entities){ ctx.save();ctx.globalAlpha=e.dead ? .45 : .35;ctx.fillStyle='#02040a';ctx.beginPath();ctx.ellipse(e.x,e.y+2,e.boss?52:35,e.boss?15:11,0,0,Math.PI*2);ctx.fill();ctx.defaultColor;ctx.restore(); }
    game.pickups.forEach(p=>p.draw()); entities.forEach(drawFighter);
    // particles
    for(const p of game.particles){ctx.save();ctx.globalAlpha=clamp(p.life/.45,0,1);ctx.fillStyle=p.color;ctx.strokeStyle=p.color;if(p.type==='line'){ctx.lineWidth=p.size;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.035,p.y-p.vy*.035);ctx.stroke();}else{ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}ctx.restore();}
    for(const t of game.texts){ctx.save();ctx.globalAlpha=t.life/t.max;ctx.fillStyle=t.color;ctx.font='1000 22px sans-serif';ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=8;ctx.fillText(t.text,t.x,t.y);ctx.restore();}
    // cinematic letterbox during transition
    if(game.transition>0){game.transition=Math.max(0,game.transition-1/60);const h=55*clamp(game.transition,0,1);ctx.fillStyle='#03040a';ctx.fillRect(0,0,W,h);ctx.fillRect(0,H-h,W,h);}
    ctx.restore();
  }

  function loop(now){
    const raw=Math.min().033,(now-game.last)/1000||0); game.last=now; update(raw); draw(); requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Prevent context menu and accidental scrolling.
  addEventListener('contextmenu',e=>e.preventDefault());
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
