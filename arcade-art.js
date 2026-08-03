'use strict';

(() => {
  const coarse = navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches;
  const FRAME_W = 96;
  const FRAME_H = 112;
  const SHEET_W = 384;
  const SHEET_H = 560;
  const STAGE_W = 640;
  const STAGE_H = 360;

  const atlas = new Image();
  const marketArt = new Image();
  atlas.decoding = 'async';
  marketArt.decoding = 'async';

  const sheets = {
    player:    { x: 0, y: 0, scale: 1.70 },
    brawler:   { x: SHEET_W, y: 0, scale: 1.56 },
    kicker:    { x: SHEET_W * 2, y: 0, scale: 1.58 },
    knife:     { x: SHEET_W * 3, y: 0, scale: 1.54 },
    heavy:     { x: 0, y: SHEET_H, scale: 1.78 },
    tiger:     { x: SHEET_W, y: SHEET_H, scale: 1.88 },
    rainmaker: { x: SHEET_W * 2, y: SHEET_H, scale: 1.90 },
    vex:       { x: SHEET_W * 3, y: SHEET_H, scale: 1.86 }
  };

  const playerAnimations = {
    idle: [[0,0],[1,0],[2,0],[3,0]],
    walk: [[0,0],[2,0],[1,0],[3,0]],
    jump: [[1,3]],
    punch1: [[0,1],[1,1]],
    punch2: [[1,1],[3,1]],
    hook: [[2,1],[3,1]],
    heavyPunch: [[1,1],[3,1]],
    kick1: [[0,2]],
    roundKick: [[1,2]],
    axeKick: [[2,2]],
    dragonKick: [[0,2],[3,2]],
    spinningBackfist: [[1,2],[2,2]],
    twistKick: [[1,2],[0,2],[3,2]],
    cyclone: [[0,2],[1,2],[3,2],[1,2]],
    uppercut: [[0,1],[2,2]],
    flyingKick: [[1,3],[3,2]],
    special: [[0,1],[1,2],[2,2],[3,2]],
    hurt: [[2,3]],
    dead: [[3,3]]
  };

  const enemyAnimations = {
    brawler: {
      idle:[[0,0],[1,0]], walk:[[1,0],[2,0],[3,0],[2,0]],
      attack:[[0,1],[1,1],[2,1]], kick:[[3,1]], hurt:[[1,2]], dead:[[3,2]]
    },
    kicker: {
      idle:[[0,0],[1,0]], walk:[[1,0],[2,0],[3,0],[2,0]],
      attack:[[0,1],[1,1],[2,1]], kick:[[1,1],[2,1]], hurt:[[1,2]], dead:[[3,3]]
    },
    knife: {
      idle:[[0,0],[1,0]], walk:[[2,0],[3,0],[2,0]],
      attack:[[1,1],[2,1],[3,1]], kick:[[2,1],[3,1]], hurt:[[0,2]], dead:[[2,3]]
    },
    heavy: {
      idle:[[0,0],[1,0],[2,0]], walk:[[0,1],[1,1],[2,1]],
      attack:[[1,1],[2,1],[3,1]], kick:[[3,2]], hurt:[[1,3]], dead:[[3,3]]
    },
    tiger: {
      idle:[[0,0],[1,0],[2,0]], walk:[[1,0],[2,0],[3,0]],
      attack:[[1,1],[2,1],[3,1]], kick:[[1,2],[2,2]], hurt:[[2,3]], dead:[[3,3]]
    },
    rainmaker: {
      idle:[[0,0],[1,0]], walk:[[1,0],[2,0],[3,0]],
      attack:[[0,1],[1,1],[2,1],[3,1]], kick:[[2,1],[3,1]], hurt:[[2,3]], dead:[[3,3]],
      special:[[0,2],[1,2],[2,2]]
    },
    vex: {
      idle:[[0,0],[1,0],[2,0]], walk:[[1,0],[2,0],[3,0]],
      attack:[[0,1],[1,1],[2,1],[3,1]], kick:[[0,2],[1,2]], hurt:[[0,3]], dead:[[3,3]],
      special:[[1,1],[2,1],[3,1]]
    }
  };

  const stagePlates = [];
  let artReady = false;
  let backgroundReady = false;
  let restoreStartLabel = 'New game';

  function makeCanvas(width, height) {
    const surface = document.createElement('canvas');
    surface.width = width;
    surface.height = height;
    const context = surface.getContext('2d', { alpha:true, desynchronized:true });
    context.imageSmoothingEnabled = true;
    return [surface, context];
  }

  function resizeArcadeCanvas() {
    const width = coarse ? 800 : 960;
    const height = coarse ? 450 : 540;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    DPR = 1;
    ctx.setTransform(width / W, 0, 0, height / H, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function drawMarketArchitecture(context, stage) {
    context.fillStyle = stage === 2 ? '#120d25' : '#071427';
    context.fillRect(0, 0, STAGE_W, STAGE_H);

    if (marketArt.complete && marketArt.naturalWidth) {
      const sourceHeight = Math.min(235, marketArt.naturalHeight);
      const sourceY = Math.min(145, Math.max(0, marketArt.naturalHeight - sourceHeight));
      context.save();
      if (stage === 1) context.filter = 'brightness(.66) saturate(.88) hue-rotate(14deg)';
      if (stage === 2) context.filter = 'brightness(.48) saturate(.94) hue-rotate(292deg)';
      context.drawImage(
        marketArt,
        0, sourceY, marketArt.naturalWidth, sourceHeight,
        -8, -3, STAGE_W + 16, 228
      );
      context.restore();
    } else {
      const sky = context.createLinearGradient(0,0,0,220);
      sky.addColorStop(0, stage === 2 ? '#100d31' : '#07182c');
      sky.addColorStop(1, stage === 1 ? '#143b4c' : '#26324e');
      context.fillStyle = sky;
      context.fillRect(0,0,STAGE_W,220);
      for (let x=0;x<STAGE_W;x+=72) {
        const h=70+(x*7)%95;
        context.fillStyle = x%144 ? '#162a3a' : '#24394b';
        context.fillRect(x,220-h,66,h);
        context.fillStyle='#ffc95c';
        for(let wy=220-h+18;wy<204;wy+=22) for(let wx=x+12;wx<x+57;wx+=20) {
          if((wx+wy+x)%3) context.fillRect(wx,wy,5,7);
        }
      }
    }
  }

  function paintRoad(context, stage) {
    const top = 211;
    const road = context.createLinearGradient(0,top,0,STAGE_H);
    if(stage===0){ road.addColorStop(0,'#1c2d3c'); road.addColorStop(1,'#07111d'); }
    else if(stage===1){ road.addColorStop(0,'#173344'); road.addColorStop(1,'#06131d'); }
    else { road.addColorStop(0,'#262039'); road.addColorStop(1,'#0b0915'); }
    context.fillStyle=road;
    context.fillRect(0,top,STAGE_W,STAGE_H-top);

    context.fillStyle = stage===2 ? '#4e3a50' : '#435766';
    context.fillRect(0,top,STAGE_W,5);
    context.fillStyle = stage===2 ? '#c08762' : '#78909c';
    context.fillRect(0,top+5,STAGE_W,2);
    context.fillStyle='rgba(0,0,0,.24)';
    context.fillRect(0,top+7,STAGE_W,6);

    const reflections = stage===2
      ? ['rgba(255,70,130,.20)','rgba(255,190,90,.15)','rgba(101,84,208,.14)']
      : ['rgba(65,217,240,.18)','rgba(255,75,128,.14)','rgba(255,190,75,.12)'];
    for(let i=0;i<34;i++){
      const x=(i*97+stage*31)%STAGE_W;
      const y=top+18+(i*43+stage*17)%123;
      const w=16+(i*19)%58;
      context.fillStyle=reflections[i%reflections.length];
      context.fillRect(x,y,w,i%5===0?3:1);
    }
    context.fillStyle='rgba(255,255,255,.045)';
    for(let y=top+16;y<STAGE_H;y+=19) context.fillRect(0,y,STAGE_W,1);
    context.fillStyle='rgba(0,0,0,.15)';
    for(let x=0;x<STAGE_W;x+=52) context.fillRect(x,top,1,STAGE_H-top);

    context.strokeStyle = stage===2 ? 'rgba(255,211,120,.24)' : 'rgba(198,232,240,.18)';
    context.lineWidth=2;
    for(let x=-30;x<STAGE_W+40;x+=118){
      context.beginPath(); context.moveTo(x,337); context.lineTo(x+47,337); context.stroke();
    }
  }

  function buildRooftop(context) {
    const sky=context.createLinearGradient(0,0,0,222);
    sky.addColorStop(0,'#08071b'); sky.addColorStop(.55,'#25123a'); sky.addColorStop(1,'#633047');
    context.fillStyle=sky; context.fillRect(0,0,STAGE_W,222);

    context.fillStyle='rgba(244,222,180,.92)';
    context.beginPath(); context.arc(525,62,28,0,Math.PI*2); context.fill();
    context.fillStyle='rgba(34,20,49,.18)';
    context.beginPath(); context.arc(515,55,5,0,Math.PI*2); context.fill();
    context.beginPath(); context.arc(536,70,8,0,Math.PI*2); context.fill();

    for(let layer=0;layer<3;layer++){
      const base=198+layer*12;
      const color=['#17162b','#111323','#0a0d18'][layer];
      context.fillStyle=color;
      for(let i=0;i<17;i++){
        const x=i*45-layer*18;
        const h=38+((i*37+layer*29)%92);
        const w=35+((i*19)%22);
        context.fillRect(x,base-h,w,h);
        context.fillStyle=layer===0?'rgba(255,179,94,.45)':'rgba(90,184,217,.22)';
        for(let wy=base-h+12;wy<base-8;wy+=16) for(let wx=x+8;wx<x+w-5;wx+=13){
          if((wx+wy+i+layer)%4) context.fillRect(wx,wy,3,5);
        }
        context.fillStyle=color;
      }
    }

    context.fillStyle='#171526'; context.fillRect(0,183,STAGE_W,29);
    context.fillStyle='#3c3346'; context.fillRect(0,183,STAGE_W,5);
    context.strokeStyle='rgba(241,174,92,.48)'; context.lineWidth=1;
    for(let x=0;x<STAGE_W;x+=28){
      context.beginPath(); context.moveTo(x,183); context.lineTo(x+13,169); context.lineTo(x+27,183); context.stroke();
    }

    context.fillStyle='#211d30'; context.fillRect(70,153,75,48);
    context.fillStyle='#463b4a'; context.fillRect(75,160,65,7);
    context.fillStyle='#10121a'; context.fillRect(82,170,20,27); context.fillRect(111,170,21,27);
    context.fillStyle='#342d3b'; context.fillRect(475,150,90,52);
    context.fillStyle='#10121a'; context.fillRect(484,160,71,33);
    for(let x=490;x<552;x+=12){ context.fillStyle='rgba(255,195,93,.28)'; context.fillRect(x,166,4,12); }

    context.strokeStyle='#837189'; context.lineWidth=3;
    context.beginPath(); context.moveTo(190,183); context.lineTo(190,102); context.lineTo(205,83); context.stroke();
    context.beginPath(); context.moveTo(604,183); context.lineTo(604,75); context.stroke();
    context.fillStyle='#ff595f'; context.fillRect(601,72,6,6);
  }

  function buildStagePlate(stage) {
    const [surface, context]=makeCanvas(STAGE_W,STAGE_H);
    if(stage===2) buildRooftop(context); else drawMarketArchitecture(context,stage);
    paintRoad(context,stage);
    return surface;
  }

  function rebuildStages(){
    stagePlates.length=0;
    for(let stage=0;stage<3;stage++) stagePlates.push(buildStagePlate(stage));
    backgroundReady=true;
  }

  function actorAnimation(actor) {
    if(actor.dead) return 'dead';
    if(actor.hurt>0 && actor.attackTimer<=0) return 'hurt';
    if(actor.attackTimer>0) return actor.state;
    if(actor.state==='walk') return 'walk';
    if(actor.state==='jump' || actor.z>8) return 'jump';
    return 'idle';
  }

  function sheetKey(actor){
    if(actor.team==='player') return 'player';
    return sheets[actor.type] ? actor.type : 'brawler';
  }

  function animationFrames(actor, key, animation){
    if(key==='player') return playerAnimations[animation] || playerAnimations.idle;
    const set=enemyAnimations[key] || enemyAnimations.brawler;
    if(animation==='dead') return set.dead || set.hurt;
    if(animation==='hurt') return set.hurt || set.idle;
    if(animation==='walk') return set.walk || set.idle;
    if(animation==='special') return set.special || set.attack || set.idle;
    if(actor.attackTimer>0){
      if(/kick|axe|dragon|twist|flying/i.test(animation)) return set.kick || set.attack;
      return set.attack || set.idle;
    }
    return set.idle;
  }

  function frameIndex(actor, animation, frames){
    if(frames.length<=1) return 0;
    if(actor.attackTimer>0){
      const progress=clamp(1-actor.attackTimer/Math.max(.001,actor.attackDuration),0,.999);
      return Math.min(frames.length-1,Math.floor(progress*frames.length));
    }
    const rate=animation==='walk'?.72:.28;
    return Math.floor(actor.anim*rate)%frames.length;
  }

  function drawActor(actor){
    if(!artReady) return;
    const key=sheetKey(actor);
    const sheet=sheets[key];
    const animation=actorAnimation(actor);
    const frames=animationFrames(actor,key,animation);
    const cell=frames[frameIndex(actor,animation,frames)] || frames[0];
    const sx=sheet.x+cell[0]*FRAME_W;
    const sy=sheet.y+cell[1]*FRAME_H;
    const depth=clamp(.90+(actor.y-510)/950,.88,1.08);
    const scale=sheet.scale*depth*(actor.boss?1.08:1);
    const drawW=FRAME_W*scale;
    const drawH=FRAME_H*scale;
    const bob=animation==='walk'?Math.sin(actor.anim*1.7)*2.2:animation==='idle'?Math.sin(actor.anim*.8)*.8:0;

    ctx.save();
    ctx.translate(Math.round(actor.x),Math.round(actor.y-actor.z+bob));
    if(actor.dir<0) ctx.scale(-1,1);
    ctx.imageSmoothingEnabled=false;
    ctx.globalAlpha=actor.dead?.80:1;
    ctx.drawImage(atlas,sx,sy,FRAME_W,FRAME_H,-drawW*.5,-drawH+8,drawW,drawH);
    if(actor.flash>0){
      ctx.globalCompositeOperation='screen';
      ctx.globalAlpha=clamp(actor.flash*4,0,.52);
      ctx.drawImage(atlas,sx,sy,FRAME_W,FRAME_H,-drawW*.5,-drawH+8,drawW,drawH);
    }
    ctx.restore();
  }

  function drawSteam(time, x, baseY, strength=1){
    ctx.save();
    ctx.globalAlpha=.12*strength;
    ctx.fillStyle='#d9f4ff';
    for(let i=0;i<3;i++){
      const phase=time*.42+i*1.9;
      const y=baseY-(phase%1)*70;
      const drift=Math.sin(phase*2.1)*14;
      ctx.beginPath(); ctx.ellipse(x+drift,y,15+i*3,6+i*2,.15,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  function drawStageAnimation(stage,time){
    if(stage===0){
      const pulse=.45+.35*Math.sin(time*2.6);
      ctx.fillStyle=`rgba(255,55,96,${.025+pulse*.035})`; ctx.fillRect(920,178,165,92);
      ctx.fillStyle=`rgba(55,222,245,${.025+(1-pulse)*.035})`; ctx.fillRect(190,190,170,65);
      ctx.fillStyle='rgba(255,196,90,.12)';
      for(let x=80;x<W;x+=250) ctx.fillRect(x+Math.sin(time+x)*13,645,95,3);
      drawSteam(time,350,585,.8); drawSteam(time+1.2,1005,598,.55);
    } else if(stage===1){
      ctx.strokeStyle='rgba(170,228,255,.19)'; ctx.lineWidth=2;
      const offset=(time*430)%88;
      for(let i=0;i<22;i++){
        const x=(i*73+offset*.55)%(W+100)-50;
        const y=(i*109+offset)%H;
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-12,y+31); ctx.stroke();
      }
      const lightning=Math.max(0,1-Math.abs((time%12.5)-.28)*8);
      if(lightning>0){ ctx.fillStyle=`rgba(210,238,255,${lightning*.17})`; ctx.fillRect(0,0,W,H); }
      drawSteam(time,220,600,1.15); drawSteam(time+.7,900,610,1);
      ctx.fillStyle='rgba(75,213,245,.14)';
      for(let x=20;x<W;x+=180) ctx.fillRect(x+Math.sin(time*.9+x)*25,628,120,4);
    } else {
      const cloudShift=(time*7)%W;
      ctx.fillStyle='rgba(116,91,145,.10)';
      for(let i=0;i<5;i++){
        const x=(i*310+cloudShift)%(W+250)-130;
        ctx.beginPath(); ctx.ellipse(x,100+i*16,125,22,0,0,Math.PI*2); ctx.fill();
      }
      const blink=Math.sin(time*3.2)>.25;
      ctx.fillStyle=blink?'#ff5a64':'#6a2634'; ctx.fillRect(1205,146,7,7);
      ctx.fillStyle='rgba(255,170,80,.12)';
      for(let x=95;x<W;x+=260) ctx.fillRect(x+Math.sin(time*.7+x)*12,634,90,3);
      drawSteam(time,505,595,.72);
    }
  }

  window.drawBackground=function drawArcadeBackground(stageIndex,time){
    const stage=clamp(stageIndex|0,0,2);
    const plate=stagePlates[stage];
    if(plate){
      const parallax=clamp((player?.x||640)-640,-640,640)*.008;
      ctx.imageSmoothingEnabled=true;
      ctx.drawImage(plate,0,0,plate.width,plate.height,-8-parallax,-4,W+16,H+8);
    } else {
      ctx.fillStyle='#08101d'; ctx.fillRect(0,0,W,H);
    }
    drawStageAnimation(stage,time);
  };

  window.spriteRenderer={draw:drawActor};
  window.ArcadeArt={
    get ready(){return artReady&&backgroundReady;}, atlas, sheets,
    frameWidth:FRAME_W, frameHeight:FRAME_H, sheetFor:sheetKey
  };
  window.NEON_PERFORMANCE={
    mobile:coarse,
    targetFrameMs:coarse?20:16.7,
    maxParticles:coarse?34:60,
    resize:resizeArcadeCanvas
  };

  resizeArcadeCanvas();
  addEventListener('resize',()=>requestAnimationFrame(resizeArcadeCanvas),{passive:true});
  window.visualViewport?.addEventListener('resize',()=>requestAnimationFrame(resizeArcadeCanvas),{passive:true});

  if(ui.start){
    restoreStartLabel=ui.start.textContent||'New game';
    ui.start.disabled=true;
    ui.start.textContent='Loading fighters…';
  }
  if(ui.continue) ui.continue.disabled=true;

  marketArt.addEventListener('load',rebuildStages,{once:true});
  marketArt.addEventListener('error',rebuildStages,{once:true});
  marketArt.src='./assets/stage-reference.png';

  atlas.addEventListener('load',()=>{
    artReady=true;
    window.NEON_ATLAS_CHUNKS=null;
    document.body.classList.add('arcade-art-ready');
    if(ui.start){ ui.start.disabled=false; ui.start.textContent=restoreStartLabel; }
    if(ui.continue) ui.continue.disabled=false;
    if(typeof updateContinueButton==='function') updateContinueButton();
  },{once:true});
  atlas.addEventListener('error',()=>{
    if(ui.start){ ui.start.disabled=true; ui.start.textContent='Art failed to load'; }
  },{once:true});
  const encoded=(window.NEON_ATLAS_CHUNKS||[]).join('');
  atlas.src=`data:image/webp;base64,${encoded}`;
})();
