'use strict';
function drawBackground(stageIndex,time){
  const s=stages[stageIndex]; const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,s.sky[0]); g.addColorStop(.48,s.sky[1]); g.addColorStop(1,s.sky[2]); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.save();
  ctx.globalAlpha=.34; const glow=ctx.createRadialGradient(980,130,4,980,130,170); glow.addColorStop(0,'#fff7d1'); glow.addColorStop(.25,s.accent); glow.addColorStop(1,'transparent'); ctx.fillStyle=glow; ctx.fillRect(780,-50,400,400); ctx.globalAlpha=1;
  drawSkyline(time,s,stageIndex);
  if(stageIndex===0) drawMarket(time,s); else if(stageIndex===1) drawAlley(time,s); else drawRooftop(time,s);
  ctx.restore();
}

function drawSkyline(time,s,variant){
  const layers=[{y:210,alpha:.2,scale:.45},{y:280,alpha:.38,scale:.7},{y:340,alpha:.62,scale:1}];
  layers.forEach((l,li)=>{
    ctx.save(); ctx.globalAlpha=l.alpha; const offset=(game.cameraX*l.scale)%220;
    for(let i=-2;i<9;i++){
      const x=i*190-offset, seed=(i*37+li*19+variant*11); const h=80+((seed*17)%150); const w=100+((seed*13)%80);
      ctx.fillStyle=li===2?'#10152a':'#182044'; ctx.fillRect(x,l.y-h,w,h);
      if(li>0){ ctx.fillStyle=s.accent; ctx.globalAlpha=l.alpha*.48; for(let wx=x+14;wx<x+w-10;wx+=22) for(let wy=l.y-h+18;wy<l.y-12;wy+=25) if(((wx+wy+seed)|0)%3) ctx.fillRect(wx,wy,5,8); ctx.globalAlpha=l.alpha; }
      if((seed%3)===0){ ctx.fillStyle='#ff4f9f'; ctx.fillRect(x+w*.45,l.y-h-28,5,28); }
    }
    ctx.restore();
  });
}

function drawMarket(time,s){
  ctx.fillStyle='#161a2b'; ctx.fillRect(0,320,W,250);
  for(let i=0;i<7;i++){
    const x=i*210-40; ctx.fillStyle=i%2?'#e84865':'#1bc1c9'; ctx.beginPath(); ctx.moveTo(x,325);ctx.lineTo(x+190,325);ctx.lineTo(x+166,385);ctx.lineTo(x+15,385);ctx.closePath();ctx.fill();
    ctx.fillStyle='#20263b'; ctx.fillRect(x+10,385,166,150); ctx.fillStyle='#ffd56d'; ctx.globalAlpha=.18; ctx.fillRect(x+18,398,150,98); ctx.globalAlpha=1;
    ctx.fillStyle='#fff0b0'; for(let l=0;l<4;l++){ ctx.beginPath(); ctx.arc(x+34+l*42,361,5,0,Math.PI*2); ctx.fill(); }
  }
  ctx.fillStyle=s.ground; ctx.beginPath();ctx.moveTo(0,510);ctx.lineTo(W,510);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
  const road=ctx.createLinearGradient(0,510,0,H);road.addColorStop(0,'#25354a');road.addColorStop(1,'#101624');ctx.fillStyle=road;ctx.fillRect(0,510,W,210);
  ctx.globalAlpha=.2; ctx.fillStyle='#70f7ff'; for(let i=0;i<6;i++)ctx.fillRect(i*250+40,590,110,3); ctx.globalAlpha=1;
  drawForegroundProps('market',time);
}

function drawAlley(time,s){
  ctx.fillStyle='#0d1d2b';ctx.fillRect(0,300,W,250);
  for(let i=0;i<9;i++){const x=i*160;ctx.fillStyle=i%2?'#173148':'#102637';ctx.fillRect(x,280,150,260);ctx.fillStyle='#7ff5ff';ctx.globalAlpha=.22;ctx.fillRect(x+25,330,40,75);ctx.fillRect(x+85,330,40,75);ctx.globalAlpha=1;}
  ctx.fillStyle='#ff4f93';ctx.fillRect(530,300,120,10);ctx.fillStyle='#fff';ctx.font='900 18px sans-serif';ctx.fillText('24 JAM',548,294);
  const road=ctx.createLinearGradient(0,490,0,H);road.addColorStop(0,'#243d4b');road.addColorStop(1,'#101f2a');ctx.fillStyle=road;ctx.fillRect(0,490,W,230);
  ctx.globalAlpha=.22;ctx.fillStyle='#a8fbff';for(let i=0;i<15;i++){const x=(i*97+(time*35)%100)%W;ctx.fillRect(x,490,2,230);}ctx.globalAlpha=1;
  for(let i=0;i<65;i++){const x=(i*79+time*290)%W,y=(i*47+time*520)%H;ctx.strokeStyle='rgba(180,240,255,.28)';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-12,y+32);ctx.stroke();}
  drawForegroundProps('alley',time);
}

function drawRooftop(time,s){
  ctx.fillStyle='#16142a';ctx.fillRect(0,320,W,220);
  ctx.fillStyle='#26213b';ctx.fillRect(0,480,W,240);
  ctx.strokeStyle='rgba(255,205,87,.28)';ctx.lineWidth=4;for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(i*190,480);ctx.lineTo(i*190+100,720);ctx.stroke();}
  ctx.fillStyle='#0f1020';ctx.fillRect(0,448,W,32);ctx.strokeStyle='#ffbe57';ctx.lineWidth=2;for(let i=0;i<W;i+=55){ctx.beginPath();ctx.moveTo(i,448);ctx.lineTo(i+22,420);ctx.lineTo(i+48,448);ctx.stroke();}
  const beam=ctx.createLinearGradient(0,0,W,0);beam.addColorStop(0,'transparent');beam.addColorStop(.5,'rgba(255,91,140,.14)');beam.addColorStop(1,'transparent');ctx.fillStyle=beam;ctx.fillRect(0,390,W,90);
  drawForegroundProps('roof',time);
}

function drawForegroundProps(kind,time){
  ctx.save();
  if(kind==='market'){
    for(let i=0;i<5;i++){const x=120+i*265;ctx.fillStyle='#465166';roundRect(x,630,72,50,6,true);ctx.fillStyle='#68758b';ctx.fillRect(x+8,638,56,6);}
    ctx.fillStyle='#172235';ctx.fillRect(970,430,190,80);ctx.fillStyle='#55f4ff';ctx.font='900 26px sans-serif';ctx.fillText('NEON MART',986,478);
  } else if(kind==='alley'){
    ctx.fillStyle='#1b2f3b';roundRect(80,600,100,74,8,true);roundRect(1080,585,110,90,8,true);ctx.fillStyle='#5b7a87';ctx.fillRect(92,610,76,8);
    ctx.globalAlpha=.18;ctx.fillStyle='#8bfaff';ctx.beginPath();ctx.ellipse(620,664,260,18,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  } else {
    ctx.fillStyle='#33283d';roundRect(85,590,130,88,10,true);roundRect(1050,570,150,108,10,true);ctx.fillStyle='#ffbf57';ctx.fillRect(110,610,78,6);ctx.fillRect(1080,595,90,6);
    ctx.strokeStyle='rgba(255,255,255,.12)';for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(0,520+i*28);ctx.lineTo(W,520+i*28);ctx.stroke();}
  }
  ctx.restore();
}
