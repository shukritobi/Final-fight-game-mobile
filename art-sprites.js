'use strict';
(()=>{
  const FRAME_W=64,FRAME_H=96;
  function makeCanvas(width,height){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');context.imageSmoothingEnabled=false;return [canvas,context];}
  const styles = {
    player:{skin:'#d88e55',shadow:'#9b4d35',hair:'#17121a',top:'#eee9d8',topShade:'#a9afb8',pants:'#294d7d',pantsShade:'#152a48',accent:'#d83229',shoe:'#11131a',headband:true,gi:true,armbands:true},
    brawler:{skin:'#c97c4e',shadow:'#8e4433',hair:'#1a1513',top:'#b62b3d',topShade:'#671925',pants:'#26364e',pantsShade:'#151c29',accent:'#f4c654',shoe:'#101217',bald:true},
    kicker:{skin:'#d3925d',shadow:'#9c5138',hair:'#17131d',top:'#6d43b7',topShade:'#362263',pants:'#23364e',pantsShade:'#121e2d',accent:'#4be7ca',shoe:'#0e1218',jacket:true},
    knife:{skin:'#c17b50',shadow:'#88442e',hair:'#152018',top:'#23866d',topShade:'#0d4b40',pants:'#28323b',pantsShade:'#141b21',accent:'#e8e05a',shoe:'#101417',hood:true,weapon:'knife'},
    heavy:{skin:'#b96f47',shadow:'#7d3827',hair:'#17120f',top:'#cc5c29',topShade:'#753217',pants:'#4b3a2c',pantsShade:'#251d17',accent:'#58dbe9',shoe:'#111315',bald:true,large:true},
    tiger:{skin:'#d08756',shadow:'#92432e',hair:'#1b1013',top:'#d22d47',topShade:'#741625',pants:'#2b3043',pantsShade:'#151821',accent:'#f2ca55',shoe:'#111318',headband:true,armor:true,large:true},
    rainmaker:{skin:'#b77f5e',shadow:'#7d4535',hair:'#24262d',top:'#326db2',topShade:'#19395f',pants:'#182c3e',pantsShade:'#0d1822',accent:'#87eee6',shoe:'#0a1017',coat:true,large:true,weapon:'staff'},
    vex:{skin:'#c18e6c',shadow:'#80503c',hair:'#ded9cd',top:'#23232f',topShade:'#0e0f16',pants:'#242535',pantsShade:'#101118',accent:'#f3bd4d',shoe:'#090a0e',coat:true,large:true,weapon:'pipe'}
  };

  const counts = {
    idle:4, walk:6, jump:2, punch1:4, punch2:4, hook:5, heavyPunch:6,
    kick1:5, roundKick:6, axeKick:6, dragonKick:6, spinningBackfist:5,
    twistKick:8, cyclone:8, uppercut:6, flyingKick:6, special:8, hurt:2, dead:4
  };

  function point(x, y) {
    return [Math.round(x), Math.round(y)];
  }

  function pose(state, frame, count) {
    const t = frame / Math.max(1, count - 1);
    const idleBob = state === 'idle' && frame % 2 ? 1 : 0;
    const result = {
      torso:point(32, 54 + idleBob), head:point(32, 26 + idleBob),
      shoulderL:point(25,42), elbowL:point(18,52), handL:point(27,55),
      shoulderR:point(39,42), elbowR:point(46,51), handR:point(37,54),
      hipL:point(28,61), kneeL:point(24,75), footL:point(19,89),
      hipR:point(36,61), kneeR:point(41,75), footR:point(47,89), tilt:0
    };

    if (state === 'walk') {
      const phase = Math.sin(t * Math.PI * 2);
      result.kneeL = point(24 + phase * 4, 75);
      result.footL = point(19 + phase * 8, 89);
      result.kneeR = point(41 - phase * 4, 75);
      result.footR = point(47 - phase * 8, 89);
      result.elbowL = point(18 - phase * 3, 52);
      result.elbowR = point(46 + phase * 3, 51);
    } else if (['punch1','punch2','heavyPunch'].includes(state)) {
      const reach = Math.sin(t * Math.PI);
      if (state === 'punch2') {
        result.elbowL = point(18,48);
        result.handL = point(11,43);
      }
      if (state === 'heavyPunch') result.tilt = Math.round(-3 * reach);
      result.elbowR = point(46 + 10 * reach,44);
      result.handR = point(38 + 25 * reach,43);
    } else if (state === 'hook') {
      const arc = Math.sin(t * Math.PI);
      result.elbowR = point(45 + 7 * arc,42 + 9 * arc);
      result.handR = point(39 + 18 * arc,52 - 5 * arc);
      result.tilt = Math.round(-4 * arc);
    } else if (['kick1','roundKick','dragonKick','flyingKick'].includes(state)) {
      const arc = Math.sin(t * Math.PI);
      const reach = {kick1:21,roundKick:27,dragonKick:31,flyingKick:35}[state];
      result.kneeR = point(42 + 8 * arc,71 - 10 * arc);
      result.footR = point(47 + reach * arc,87 - 28 * arc);
      if (state === 'flyingKick') {
        result.footL = point(16,76);
        result.kneeL = point(23,68);
        result.tilt = Math.round(-8 * arc);
      }
    } else if (state === 'axeKick') {
      const arc = Math.sin(t * Math.PI);
      result.kneeR = point(40,68 - 15 * arc);
      result.footR = point(43,87 - 46 * arc);
      if (t > .55) {
        const drop = (t - .55) / .45;
        result.footR = point(43 + 6 * drop,41 + 44 * drop);
      }
    } else if (['twistKick','cyclone','special'].includes(state)) {
      const rotations = state === 'special' ? 2 : 1;
      const angle = t * Math.PI * 2 * rotations;
      const sine = Math.sin(angle);
      const cosine = Math.cos(angle);
      result.kneeR = point(40 + 6 * cosine,70 - 8 * Math.abs(sine));
      result.footR = point(45 + 28 * cosine,79 - 20 * Math.abs(sine));
      result.elbowR = point(43 + 8 * cosine,46 + 5 * sine);
      result.handR = point(39 + 16 * cosine,48 + 10 * sine);
      result.elbowL = point(21 - 7 * cosine,46 - 4 * sine);
      result.handL = point(24 - 14 * cosine,48 - 8 * sine);
      result.tilt = Math.round(4 * sine);
    } else if (state === 'spinningBackfist') {
      const arc = Math.sin(t * Math.PI);
      result.elbowL = point(18 - 10 * arc,44);
      result.handL = point(27 - 28 * arc,42);
      result.tilt = Math.round(6 * arc);
    } else if (state === 'uppercut') {
      const arc = Math.sin(t * Math.PI);
      result.elbowR = point(42,41 - 15 * arc);
      result.handR = point(38,52 - 38 * arc);
      result.kneeR = point(40,72 - 7 * arc);
      result.footR = point(45,88 - 13 * arc);
    } else if (state === 'jump') {
      result.kneeL = point(24,67);
      result.footL = point(16,75);
      result.kneeR = point(41,67);
      result.footR = point(49,75);
    } else if (state === 'hurt') {
      result.tilt = -6;
      result.head = point(29,28);
      result.handR = point(45,45);
      result.handL = point(18,46);
    } else if (state === 'dead') {
      result.tilt = Math.round(-65 * t);
      result.torso = point(32,58 + 18 * t);
      result.head = point(32,31 + 34 * t);
      result.shoulderL = point(25,47 + 18 * t);
      result.shoulderR = point(39,47 + 18 * t);
      result.elbowL = point(18,58 + 17 * t);
      result.elbowR = point(46,58 + 17 * t);
      result.handL = point(12,66 + 16 * t);
      result.handR = point(52,66 + 16 * t);
      result.hipL = point(28,65 + 18 * t);
      result.hipR = point(36,65 + 18 * t);
      result.kneeL = point(20,78 + 10 * t);
      result.kneeR = point(45,78 + 10 * t);
      result.footL = point(12,89);
      result.footR = point(54,89);
    }
    return result;
  }

  function segment(context, start, end, width, color) {
    context.lineCap = 'round';
    context.strokeStyle = '#0b0c11';
    context.lineWidth = width + 4;
    context.beginPath();
    context.moveTo(start[0], start[1]);
    context.lineTo(end[0], end[1]);
    context.stroke();
    context.strokeStyle = color;
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(start[0], start[1]);
    context.lineTo(end[0], end[1]);
    context.stroke();
  }

  function joint(context, position, radius, color) {
    context.fillStyle = '#0b0c11';
    context.beginPath();
    context.arc(position[0], position[1], radius + 2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = color;
    context.beginPath();
    context.arc(position[0], position[1], radius, 0, Math.PI * 2);
    context.fill();
  }

  function drawSprite(type, state, frame) {
    const style = styles[type] || styles.brawler;
    const count = counts[state] || counts.idle;
    const current = pose(state, frame, count);
    const [canvas, context] = makeCanvas(FRAME_W, FRAME_H);

    if (state !== 'dead') {
      context.fillStyle = 'rgba(0,0,0,.35)';
      context.fillRect(16, 89, 36, 4);
    }

    segment(context, current.hipL, current.kneeL, 10, style.pantsShade);
    segment(context, current.kneeL, current.footL, 9, style.pants);
    segment(context, current.hipR, current.kneeR, 10, style.pants);
    segment(context, current.kneeR, current.footR, 9, style.pants);

    [current.footL, current.footR].forEach(foot => {
      context.fillStyle = '#090a0e';
      context.fillRect(foot[0] - 6, foot[1] - 3, 14, 6);
      context.fillStyle = style.shoe;
      context.fillRect(foot[0] - 4, foot[1] - 2, 11, 3);
    });

    segment(context, current.shoulderL, current.elbowL, 8, style.topShade);
    segment(context, current.elbowL, current.handL, 7, style.skin);

    const centerX = current.torso[0];
    const centerY = current.torso[1];
    const tilt = current.tilt;
    const torso = [
      [centerX - 14 + tilt, centerY - 15],
      [centerX - 10 + tilt, centerY - 29],
      [centerX + 9 + tilt, centerY - 29],
      [centerX + 14 + tilt, centerY - 14],
      [centerX + 9, centerY + 8],
      [centerX - 10, centerY + 8]
    ];

    context.fillStyle = '#0b0c11';
    context.beginPath();
    torso.forEach((point, index) => index ? context.lineTo(point[0], point[1]) : context.moveTo(point[0], point[1]));
    context.closePath();
    context.fill();

    context.fillStyle = style.top;
    context.beginPath();
    torso.map(([x,y]) => [x + (x < centerX ? 1 : -1), y + 1]).forEach((point, index) => index ? context.lineTo(point[0], point[1]) : context.moveTo(point[0], point[1]));
    context.closePath();
    context.fill();

    context.fillStyle = style.topShade;
    context.beginPath();
    context.moveTo(centerX - 10 + tilt, centerY - 12);
    context.lineTo(centerX - 5 + tilt, centerY - 27);
    context.lineTo(centerX + 1 + tilt, centerY - 27);
    context.lineTo(centerX - 2, centerY + 6);
    context.lineTo(centerX - 9, centerY + 6);
    context.closePath();
    context.fill();

    if (style.gi) {
      context.strokeStyle = '#777d87';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(centerX - 6 + tilt, centerY - 26);
      context.lineTo(centerX + 3, centerY + 4);
      context.stroke();
      context.strokeStyle = '#ffffff';
      context.beginPath();
      context.moveTo(centerX + 7 + tilt, centerY - 26);
      context.lineTo(centerX - 2, centerY + 4);
      context.stroke();
      context.fillStyle = style.accent;
      context.fillRect(centerX - 12, centerY + 3, 23, 4);
    }
    if (style.jacket) {
      context.fillStyle = style.accent;
      context.fillRect(centerX - 1 + tilt, centerY - 28, 3, 34);
    }
    if (style.armor) {
      context.fillStyle = style.accent;
      context.fillRect(centerX - 12 + tilt, centerY - 20, 25, 6);
    }
    if (style.coat) {
      context.fillStyle = style.topShade;
      context.beginPath();
      context.moveTo(centerX - 13, centerY + 3);
      context.lineTo(centerX - 20, centerY + 18);
      context.lineTo(centerX - 3, centerY + 11);
      context.closePath();
      context.fill();
      context.beginPath();
      context.moveTo(centerX + 12, centerY + 3);
      context.lineTo(centerX + 20, centerY + 18);
      context.lineTo(centerX + 3, centerY + 11);
      context.closePath();
      context.fill();
    }

    segment(context, current.shoulderR, current.elbowR, 8, style.top);
    segment(context, current.elbowR, current.handR, 7, style.skin);

    if (style.armbands) {
      [[current.elbowL,current.handL],[current.elbowR,current.handR]].forEach(([elbow, hand]) => {
        joint(context, point((elbow[0] + hand[0]) * .5, (elbow[1] + hand[1]) * .5), 3, style.accent);
      });
    }
    joint(context, current.handL, 4, style.accent);
    joint(context, current.handR, 4, style.accent);

    const headX = current.head[0];
    const headY = current.head[1];
    context.fillStyle = '#090a0e';
    context.fillRect(headX - 9, headY - 10, 18, 20);
    context.fillStyle = style.skin;
    context.fillRect(headX - 7, headY - 7, 14, 15);
    context.fillStyle = style.shadow;
    context.fillRect(headX - 6, headY + 3, 12, 4);

    if (style.bald) {
      context.fillStyle = style.shadow;
      context.fillRect(headX - 7, headY - 8, 14, 3);
    } else if (style.hood) {
      context.fillStyle = style.topShade;
      context.beginPath();
      context.moveTo(headX - 10, headY - 6);
      context.lineTo(headX, headY - 13);
      context.lineTo(headX + 10, headY - 6);
      context.lineTo(headX + 7, headY + 4);
      context.lineTo(headX - 7, headY + 4);
      context.closePath();
      context.fill();
    } else {
      context.fillStyle = style.hair;
      context.beginPath();
      context.moveTo(headX - 9, headY - 7);
      context.lineTo(headX - 5, headY - 12);
      context.lineTo(headX - 1, headY - 9);
      context.lineTo(headX + 3, headY - 13);
      context.lineTo(headX + 8, headY - 8);
      context.lineTo(headX + 9, headY - 3);
      context.lineTo(headX - 8, headY - 3);
      context.closePath();
      context.fill();
    }

    context.fillStyle = '#171018';
    context.fillRect(headX + 2, headY - 2, 3, 2);
    context.fillStyle = style.shadow;
    context.fillRect(headX + 5, headY + 2, 3, 2);

    if (style.headband) {
      context.fillStyle = style.accent;
      context.fillRect(headX - 9, headY - 5, 18, 3);
      const tail = 3 + frame % 3;
      context.beginPath();
      context.moveTo(headX - 8, headY - 4);
      context.lineTo(headX - 15 - tail, headY - 7);
      context.lineTo(headX - 12, headY - 2);
      context.closePath();
      context.fill();
      context.beginPath();
      context.moveTo(headX - 8, headY - 2);
      context.lineTo(headX - 17 - tail, headY + 1);
      context.lineTo(headX - 11, headY + 2);
      context.closePath();
      context.fill();
    }

    if (!['dead','hurt'].includes(state)) {
      if (style.weapon === 'knife') {
        const [x,y] = current.handR;
        context.fillStyle = '#d9edf1';
        context.beginPath();
        context.moveTo(x + 2, y - 1);
        context.lineTo(x + 14, y - 4);
        context.lineTo(x + 5, y + 2);
        context.closePath();
        context.fill();
      } else if (style.weapon === 'staff') {
        const [x,y] = current.handR;
        context.strokeStyle = '#d2ae68';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(x - 18, y + 10);
        context.lineTo(x + 26, y - 14);
        context.stroke();
      } else if (style.weapon === 'pipe') {
        const [x,y] = current.handR;
        context.strokeStyle = '#a8bac4';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(x - 12, y + 9);
        context.lineTo(x + 18, y - 12);
        context.stroke();
      }
    }

    return canvas;
  }

  const spriteCache = new Map();
  function getSprite(type, state, frame) {
    const safeType = styles[type] ? type : 'brawler';
    const safeState = counts[state] ? state : 'idle';
    const count = counts[safeState];
    const safeFrame = ((frame % count) + count) % count;
    const key = `${safeType}:${safeState}:${safeFrame}`;
    if (!spriteCache.has(key)) spriteCache.set(key, drawSprite(safeType, safeState, safeFrame));
    return spriteCache.get(key);
  }

  window.NEON_SPRITE_ART={frameWidth:FRAME_W,frameHeight:FRAME_H,frameCount:state=>counts[state]||counts.idle,getSprite};
})();
