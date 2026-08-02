'use strict';

(() => {
  const mobile = navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches;
  const laneByStage = [
    { top:558, bottom:678 },
    { top:552, bottom:678 },
    { top:520, bottom:670 }
  ];

  function resizeForPerformance() {
    const cssWidth = Math.max(1, window.innerWidth);
    const cssHeight = Math.max(1, window.innerHeight);
    const maxWidth = mobile ? 960 : 1280;
    const maxHeight = mobile ? 540 : 720;
    const scale = Math.min(1, maxWidth / cssWidth, maxHeight / cssHeight);
    const width = Math.max(480, Math.round(cssWidth * scale));
    const height = Math.max(270, Math.round(cssHeight * scale));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    DPR = 1;
    ctx.setTransform(width / W, 0, 0, height / H, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  addEventListener('resize', () => requestAnimationFrame(resizeForPerformance), { passive:true });
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', () => requestAnimationFrame(resizeForPerformance), { passive:true });
  }
  resizeForPerformance();
  setTimeout(resizeForPerformance, 80);

  const backgrounds = window.NEON_BACKGROUNDS;
  if (backgrounds?.length) {
    drawBackground = function optimizedBackground(stageIndex, time) {
      const index = Math.max(0, Math.min(backgrounds.length - 1, stageIndex | 0));
      const image = backgrounds[index];
      const lane = laneByStage[index];

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, W, H);

      if (index === 1) {
        ctx.strokeStyle = 'rgba(166,225,255,.15)';
        ctx.lineWidth = 2;
        const offset = (time * 430) % 90;
        for (let n = 0; n < 26; n++) {
          const x = (n * 53 + offset * .6) % (W + 80) - 40;
          const y = (n * 97 + offset) % H;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 8, y + 20);
          ctx.stroke();
        }
      }

      ctx.fillStyle = 'rgba(2,7,15,.10)';
      ctx.fillRect(0, lane.top - 18, W, H - lane.top + 18);
      ctx.strokeStyle = index === 2 ? 'rgba(255,192,92,.22)' : 'rgba(135,215,235,.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, lane.top - 6);
      ctx.lineTo(W, lane.top - 6);
      ctx.stroke();
      ctx.restore();
    };
  }

  const art = window.NEON_SPRITE_ART;
  if (art) {
    const originalCount = art.frameCount.bind(art);
    const originalGetSprite = art.getSprite.bind(art);
    const reducedCounts = {
      idle:2, walk:4, jump:2, hurt:1, dead:3,
      punch1:2, punch2:2, hook:3, heavyPunch:3,
      kick1:3, roundKick:3, axeKick:3, dragonKick:3,
      spinningBackfist:3, twistKick:4, cyclone:4,
      uppercut:3, flyingKick:3, special:4
    };

    art.frameCount = state => reducedCounts[state] || Math.min(3, originalCount(state));
    art.getSprite = (type, state, frame) => {
      const sourceCount = originalCount(state);
      const targetCount = art.frameCount(state);
      const mapped = targetCount <= 1
        ? 0
        : Math.round((Math.max(0, Math.min(targetCount - 1, frame)) / (targetCount - 1)) * (sourceCount - 1));
      return originalGetSprite(type, state, mapped);
    };

    const warm = [
      ['player','idle',0],['player','idle',1],
      ['player','walk',0],['player','walk',1],['player','walk',2],['player','walk',3],
      ['player','punch1',0],['player','punch1',1],['player','kick1',0],['player','kick1',1],
      ['brawler','idle',0],['brawler','walk',0],['brawler','punch1',0]
    ];
    let warmIndex = 0;
    const prewarm = deadline => {
      while (warmIndex < warm.length && (!deadline || deadline.timeRemaining() > 2)) {
        art.getSprite(...warm[warmIndex++]);
      }
      if (warmIndex < warm.length) {
        if ('requestIdleCallback' in window) requestIdleCallback(prewarm, { timeout:400 });
        else setTimeout(() => prewarm(null), 32);
      }
    };
    if ('requestIdleCallback' in window) requestIdleCallback(prewarm, { timeout:500 });
    else setTimeout(() => prewarm(null), 80);
  }

  burst = function optimizedBurst(x, y, count, color) {
    const amount = Math.min(7, count);
    for (let index = 0; index < amount; index++) {
      game.particles.push({
        x, y, vx:rand(-220,220), vy:rand(-220,30), life:rand(.16,.38), max:.38,
        size:rand(2,5), color, gravity:480, type:'spark'
      });
    }
  };

  radialBurst = function optimizedRadialBurst(x, y, color) {
    for (let index = 0; index < 12; index++) {
      const angle = index / 12 * Math.PI * 2;
      const speed = rand(140,330);
      game.particles.push({
        x, y, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed,
        life:rand(.22,.42), max:.42, size:rand(2,4), color, gravity:0, type:'line'
      });
    }
  };

  dustBurst = function optimizedDustBurst(x, y, count=8) {
    const amount = Math.min(4, count);
    for (let index = 0; index < amount; index++) {
      game.particles.push({
        x:x+rand(-18,18), y:y+rand(-2,4), vx:rand(-42,42), vy:rand(-60,-15),
        life:rand(.2,.36), max:.36, size:rand(4,9), color:'#b7c3d2', gravity:110, type:'dust'
      });
    }
  };

  impactBurst = function optimizedImpactBurst(x, y, kind='punch1', strong=false, color='#fff', direction=1, weapon=null) {
    const kick = /kick|axe|dragon|twist/i.test(kind);
    const finisher = strong || /heavy|uppercut|special|cyclone|ko/i.test(kind);
    const impactColor = weapon ? '#eaf6ff' : kick ? '#ffd15a' : '#ff557d';
    const amount = finisher ? 9 : 5;

    for (let index = 0; index < amount; index++) {
      const angle = rand(-1.05,1.05) + (direction > 0 ? 0 : Math.PI);
      const speed = rand(finisher ? 190 : 130, finisher ? 410 : 290);
      game.particles.push({
        x, y, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed,
        life:rand(.16,.32), max:.32, size:rand(2,finisher?6:4),
        color:index%3===0?'#fff':impactColor, gravity:70, type:'shard'
      });
    }
    game.particles.push({x,y,vx:0,vy:0,life:finisher?.24:.18,max:finisher?.24:.18,size:finisher?54:37,color:impactColor,gravity:0,type:'star',spikes:finisher?9:7});
    if (finisher) {
      const words = kind==='ko' ? ['K.O.!'] : kind==='uppercut' ? ['RISING!'] : kind==='twistKick' ? ['TWIST!'] : kind==='cyclone' ? ['CYCLONE!'] : ['POW!','BAM!'];
      game.texts.push({x:x+direction*18,y:y-18,text:words[Math.floor(Math.random()*words.length)],color:impactColor,life:.52,max:.52,size:kind==='ko'?40:30,impact:true,rotation:rand(-.12,.12)});
    }
    if (game.particles.length > 56) game.particles.splice(0, game.particles.length - 56);
    if (game.texts.length > 7) game.texts.splice(0, game.texts.length - 7);
  };

  const originalUpdate = update;
  update = function optimizedUpdate(dt) {
    originalUpdate(dt);
    if (game.particles.length > 56) game.particles.splice(0, game.particles.length - 56);
    if (game.texts.length > 7) game.texts.splice(0, game.texts.length - 7);
  };

  window.NEON_PERFORMANCE = {
    mobile,
    targetFrameMs: mobile ? 22 : 16.7,
    maxParticles: mobile ? 56 : 90,
    resize: resizeForPerformance
  };
})();