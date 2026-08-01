'use strict';

class SpriteRenderer {
  constructor(){
    this.cache=new Map();
    this.frameWidth=84;
    this.frameHeight=124;
  }

  styleFor(actor){
    const styles={
      player:{skin:'#d9925f',hair:'#17131b',top:'#f1eee2',topShade:'#b9bdc4',pants:'#2f4e79',pantsShade:'#182840',accent:'#e63b2e',shoe:'#14151c',headband:true,armbands:true,gi:true},
      brawler:{skin:'#c98052',hair:'#1b1514',top:'#b52d3e',topShade:'#651b29',pants:'#28344c',pantsShade:'#151b28',accent:'#ffd05c',shoe:'#10131a',bald:true},
      kicker:{skin:'#d89a69',hair:'#16131f',top:'#6846b9',topShade:'#342668',pants:'#1e293d',pantsShade:'#111722',accent:'#54f3cc',shoe:'#10131b',jacket:true},
      knife:{skin:'#c78658',hair:'#142019',top:'#1f8c70',topShade:'#0c4d42',pants:'#27313a',pantsShade:'#131a20',accent:'#efe75d',shoe:'#0f1417',hood:true},
      heavy:{skin:'#bb744b',hair:'#1a1512',top:'#d05c28',topShade:'#783218',pants:'#4d3b2d',pantsShade:'#251e18',accent:'#5edff2',shoe:'#121315',bald:true,large:true},
      tiger:{skin:'#d18b5c',hair:'#1a1014',top:'#d72e49',topShade:'#771727',pants:'#2d3042',pantsShade:'#151720',accent:'#ffd25b',shoe:'#111318',headband:true,armor:true,large:true},
      rainmaker:{skin:'#b98262',hair:'#20242b',top:'#316eb5',topShade:'#17385e',pants:'#162a3c',pantsShade:'#0d1721',accent:'#8cf6ed',shoe:'#0b1118',coat:true,large:true},
      vex:{skin:'#c59473',hair:'#e4e0d5',top:'#20212d',topShade:'#0d0e15',pants:'#242434',pantsShade:'#101017',accent:'#ffc653',shoe:'#090a0e',coat:true,large:true}
    };
    return styles[actor.team==='player'?'player':actor.type]||styles.brawler;
  }

  canonicalPose(state){
    const map={
      idle:'idle',walk:'walk',jump:'jump',punch:'punch1',kick:'kick1',
      punch1:'punch1',punch2:'punch2',hook:'hook',heavyPunch:'heavyPunch',
      kick1:'kick1',roundKick:'roundKick',axeKick:'axeKick',dragonKick:'dragonKick',
      spinningBackfist:'backfist',twistKick:'twistKick',cyclone:'cyclone',
      uppercut:'uppercut',flyingKick:'flyingKick',special:'special',hurt:'hurt',dead:'dead'
    };
    return map[state]||'idle';
  }

  frameCount(pose){
    return ({idle:4,walk:6,jump:2,punch1:4,punch2:4,hook:5,heavyPunch:6,kick1:5,roundKick:6,axeKick:6,dragonKick:6,backfist:5,twistKick:8,cyclone:8,uppercut:6,flyingKick:6,special:8,hurt:2,dead:4})[pose]||4;
  }

  frameFor(actor,pose){
    const count=this.frameCount(pose);
    if(['idle','walk'].includes(pose)) return Math.floor(actor.anim*(pose==='walk'?1.05:.55))%count;
    if(pose==='jump') return actor.vz>0?0:1;
    if(pose==='dead') return Math.min(count-1,Math.floor(clamp((2-(actor.removeAt||2))/2,0,1)*count));
    const progress=actor.attackDuration?clamp(1-actor.attackTimer/actor.attackDuration,0,1):0;
    return Math.min(count-1,Math.floor(progress*count));
  }

  draw(actor){
    const pose=actor.dead?'dead':actor.hurt>0&&actor.attackTimer<=0?'hurt':this.canonicalPose(actor.state);
    const frame=this.frameFor(actor,pose);
    const styleKey=actor.team==='player'?'player':actor.type;
    const key=`${styleKey}:${pose}:${frame}:${actor.weapon||'none'}`;
    let sprite=this.cache.get(key);
    if(!sprite){
      sprite=this.renderFrame(this.styleFor(actor),pose,frame,actor.weapon,actor.boss);
      this.cache.set(key,sprite);
    }

    const baseScale=actor.boss?1.52:actor.mass>1.45?1.33:1.18;
    const drawW=this.frameWidth*baseScale;
    const drawH=this.frameHeight*baseScale;
    ctx.save();
    ctx.translate(Math.round(actor.x),Math.round(actor.y-actor.z));
    if(actor.dir<0) ctx.scale(-1,1);
    ctx.imageSmoothingEnabled=false;
    if(actor.flash>0){
      ctx.shadowColor='#ffffff';
      ctx.shadowBlur=18;
      ctx.globalAlpha=.78+Math.sin(actor.flash*80)*.12;
    }
    ctx.drawImage(sprite,-drawW/2,-drawH,drawW,drawH);
    ctx.restore();
  }

  renderFrame(style,pose,frame,weapon,boss){
    const c=document.createElement('canvas');
    c.width=this.frameWidth; c.height=this.frameHeight;
    const g=c.getContext('2d');
    g.imageSmoothingEnabled=false;
    const p=this.poseData(pose,frame,this.frameCount(pose));
    const scale=style.large?1.08:1;
    g.save();
    g.translate(42,116);
    g.scale(scale,scale);

    const outline='#101018';
    const skin=style.skin;
    const drawSegment=(x1,y1,x2,y2,w,color)=>{
      g.lineCap='round';
      g.strokeStyle=outline; g.lineWidth=w+4; g.beginPath(); g.moveTo(x1,y1); g.lineTo(x2,y2); g.stroke();
      g.strokeStyle=color; g.lineWidth=w; g.beginPath(); g.moveTo(x1,y1); g.lineTo(x2,y2); g.stroke();
    };
    const drawJoint=(x,y,r,color)=>{
      g.fillStyle=outline; g.beginPath(); g.arc(x,y,r+2,0,Math.PI*2); g.fill();
      g.fillStyle=color; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill();
    };
    const poly=(points,color)=>{
      g.fillStyle=outline; g.beginPath(); points.forEach((pt,i)=>(i?g.lineTo(pt[0],pt[1]):g.moveTo(pt[0],pt[1]))); g.closePath(); g.fill();
      g.save(); g.translate(0,-1); g.scale(.94,.94); g.fillStyle=color; g.beginPath(); points.forEach((pt,i)=>(i?g.lineTo(pt[0],pt[1]):g.moveTo(pt[0],pt[1]))); g.closePath(); g.fill(); g.restore();
    };

    drawSegment(p.hipBack[0],p.hipBack[1],p.kneeBack[0],p.kneeBack[1],14,style.pantsShade);
    drawSegment(p.kneeBack[0],p.kneeBack[1],p.footBack[0],p.footBack[1],13,style.pants);
    this.drawShoe(g,p.footBack[0],p.footBack[1],style.shoe,p.footBack[2]||0,outline);

    drawSegment(p.shoulderBack[0],p.shoulderBack[1],p.elbowBack[0],p.elbowBack[1],10,style.topShade);
    drawSegment(p.elbowBack[0],p.elbowBack[1],p.handBack[0],p.handBack[1],9,skin);
    if(style.armbands) this.drawBand(g,p.elbowBack,p.handBack,style.accent,outline);
    drawJoint(p.handBack[0],p.handBack[1],5,style.accent);

    const torso=[[-18,-69],[-15,-95],[0,-103],[17,-94],[20,-58],[13,-39],[-14,-40]];
    poly(torso,style.top);
    g.fillStyle=style.topShade;
    g.fillRect(-16,-63,33,6);
    if(style.gi){
      g.fillStyle=outline; g.beginPath(); g.moveTo(-11,-91); g.lineTo(2,-71); g.lineTo(14,-94); g.lineTo(5,-98); g.lineTo(-1,-83); g.lineTo(-7,-98); g.closePath(); g.fill();
      g.fillStyle='#fcfaf1'; g.beginPath(); g.moveTo(-9,-91); g.lineTo(2,-73); g.lineTo(12,-93); g.lineTo(6,-96); g.lineTo(0,-81); g.lineTo(-6,-96); g.closePath(); g.fill();
    }
    if(style.jacket){ g.fillStyle=style.accent; g.fillRect(-2,-96,4,52); }
    if(style.armor){ g.fillStyle=style.accent; g.fillRect(-17,-87,34,7); }
    if(style.coat){
      g.fillStyle=style.topShade;
      g.beginPath(); g.moveTo(-15,-51); g.lineTo(-25,-4); g.lineTo(-4,-20); g.lineTo(0,-43); g.fill();
      g.beginPath(); g.moveTo(15,-51); g.lineTo(24,-3); g.lineTo(5,-20); g.lineTo(0,-43); g.fill();
    }
    g.fillStyle=outline; g.fillRect(-17,-47,35,8);
    g.fillStyle=style.accent; g.fillRect(-15,-45,31,4);

    drawSegment(p.hipFront[0],p.hipFront[1],p.kneeFront[0],p.kneeFront[1],15,style.pantsShade);
    drawSegment(p.kneeFront[0],p.kneeFront[1],p.footFront[0],p.footFront[1],14,style.pants);
    this.drawShoe(g,p.footFront[0],p.footFront[1],style.shoe,p.footFront[2]||0,outline);

    drawSegment(p.shoulderFront[0],p.shoulderFront[1],p.elbowFront[0],p.elbowFront[1],11,style.top);
    drawSegment(p.elbowFront[0],p.elbowFront[1],p.handFront[0],p.handFront[1],10,skin);
    if(style.armbands) this.drawBand(g,p.elbowFront,p.handFront,style.accent,outline);
    drawJoint(p.handFront[0],p.handFront[1],5.5,style.accent);

    drawSegment(0,-96,0,-103,9,skin);
    g.fillStyle=outline; g.beginPath(); g.arc(0,-112,boss?14:12,0,Math.PI*2); g.fill();
    g.fillStyle=skin; g.beginPath(); g.arc(0,-112,boss?12:10,0,Math.PI*2); g.fill();
    if(style.hood){
      g.fillStyle=style.topShade; g.beginPath(); g.arc(0,-115,14,Math.PI,Math.PI*2); g.lineTo(12,-106); g.lineTo(-12,-106); g.closePath(); g.fill();
    } else if(style.bald){
      g.fillStyle='rgba(255,255,255,.22)'; g.fillRect(-5,-120,7,2);
    } else {
      g.fillStyle=style.hair;
      g.beginPath(); g.moveTo(-11,-115); g.lineTo(-8,-125); g.lineTo(-3,-121); g.lineTo(1,-128); g.lineTo(5,-122); g.lineTo(10,-125); g.lineTo(11,-113); g.closePath(); g.fill();
    }
    g.fillStyle=outline; g.fillRect(4,-114,5,2); g.fillRect(8,-108,3,2);
    if(style.headband){
      g.fillStyle=outline; g.fillRect(-13,-119,27,6); g.fillStyle=style.accent; g.fillRect(-12,-118,25,4);
      const sway=(frame%3)-1;
      g.fillStyle=style.accent; g.fillRect(-22,-118+sway,12,3); g.fillRect(-28,-114-sway,18,3);
    }

    if(weapon){
      g.save(); g.translate(p.handFront[0],p.handFront[1]); g.rotate(p.weaponAngle||-.35);
      g.fillStyle=outline; g.fillRect(-2,-3,weapon==='knife'?30:46,7);
      g.fillStyle=weapon==='staff'?'#d1ad70':weapon==='pipe'?'#a9c0c9':weapon==='knife'?'#e7f7ff':'#8b5731';
      g.fillRect(0,-2,weapon==='knife'?28:44,4);
      g.restore();
    }

    g.restore();
    return c;
  }

  drawBand(g,elbow,hand,color,outline){
    const x=lerp(elbow[0],hand[0],.58), y=lerp(elbow[1],hand[1],.58);
    g.fillStyle=outline; g.beginPath(); g.arc(x,y,6,0,Math.PI*2); g.fill();
    g.fillStyle=color; g.beginPath(); g.arc(x,y,4.3,0,Math.PI*2); g.fill();
  }

  drawShoe(g,x,y,color,angle,outline){
    g.save(); g.translate(x,y); g.rotate(angle);
    g.fillStyle=outline; g.fillRect(-7,-4,18,9);
    g.fillStyle=color; g.fillRect(-5,-2,15,5);
    g.fillStyle='#e8e8e8'; g.fillRect(3,2,8,2);
    g.restore();
  }

  poseData(pose,frame,count){
    const t=count<=1?0:frame/(count-1);
    const wave=Math.sin(t*Math.PI);
    const base={
      shoulderBack:[-12,-88],elbowBack:[-24,-74],handBack:[-8,-67],
      shoulderFront:[13,-88],elbowFront:[26,-73],handFront:[8,-65],
      hipBack:[-8,-42],kneeBack:[-13,-22],footBack:[-18,0,0],
      hipFront:[9,-42],kneeFront:[15,-20],footFront:[19,0,0],weaponAngle:-.35
    };
    const p=JSON.parse(JSON.stringify(base));
    if(pose==='idle'){
      const sway=(frame%4-1.5)*1.2;
      p.handFront[1]+=sway; p.handBack[1]-=sway; p.kneeFront[0]+=sway*.5;
    } else if(pose==='walk'){
      const step=Math.sin(frame/count*Math.PI*2)*12;
      p.kneeFront=[12+step*.35,-22]; p.footFront=[18+step,0,step*.025];
      p.kneeBack=[-12-step*.35,-20]; p.footBack=[-17-step,0,-step*.025];
      p.elbowFront[0]-=step*.3; p.elbowBack[0]+=step*.3;
    } else if(pose==='punch1'||pose==='punch2'){
      const reach=wave;
      p.elbowFront=[lerp(25,44,reach),lerp(-73,-87,reach)];
      p.handFront=[lerp(8,68,reach),lerp(-65,-88,reach)];
      if(pose==='punch2'){ p.handBack=[lerp(-8,-55,reach),lerp(-67,-82,reach)]; p.elbowBack=[lerp(-24,-40,reach),-80]; }
    } else if(pose==='hook'||pose==='backfist'){
      const swing=Math.sin(t*Math.PI);
      p.elbowFront=[32,-91]; p.handFront=[lerp(8,50,swing),lerp(-66,-73,swing)];
      p.shoulderFront=[14,-90]; p.hipFront[0]-=swing*4; p.weaponAngle=.2;
    } else if(pose==='heavyPunch'){
      const reach=wave;
      p.elbowFront=[lerp(18,48,reach),lerp(-68,-91,reach)]; p.handFront=[lerp(3,72,reach),lerp(-62,-92,reach)];
      p.elbowBack=[-34,-91]; p.handBack=[-45,-75]; p.kneeFront[0]+=reach*5;
    } else if(pose==='kick1'){
      p.kneeFront=[lerp(15,33,wave),lerp(-20,-36,wave)]; p.footFront=[lerp(19,62,wave),lerp(0,-38,wave),-.1];
    } else if(pose==='roundKick'||pose==='dragonKick'){
      const reach=wave;
      p.kneeFront=[lerp(15,38,reach),lerp(-20,-47,reach)]; p.footFront=[lerp(19,72,reach),lerp(0,-51,reach),-.15];
      p.elbowBack=[-36,-92]; p.handBack=[-47,-77];
      if(pose==='dragonKick'){ p.footBack=[-28,-13,-.5]; p.kneeBack=[-20,-31]; }
    } else if(pose==='axeKick'){
      const rise=t<.55?t/.55:(1-t)/.45;
      p.kneeFront=[24,-44-rise*22]; p.footFront=[33,-57-rise*42,.9];
      p.elbowFront=[30,-93]; p.handFront=[19,-105];
    } else if(pose==='twistKick'||pose==='cyclone'||pose==='special'){
      const angle=t*Math.PI*2;
      const side=Math.cos(angle), lift=Math.sin(angle);
      p.kneeFront=[18+side*18,-31-lift*13]; p.footFront=[30+side*48,-35-lift*25,angle*.12];
      p.elbowFront=[29+side*9,-82]; p.handFront=[12+side*28,-70-lift*6];
      p.elbowBack=[-29-side*9,-84]; p.handBack=[-12-side*28,-72+lift*6];
    } else if(pose==='uppercut'){
      p.elbowFront=[18,-105-wave*18]; p.handFront=[13,-107-wave*45];
      p.kneeFront=[22,-29]; p.footFront=[31,-14,.35]; p.footBack=[-29,-12,-.4];
    } else if(pose==='flyingKick'){
      p.kneeFront=[32,-43]; p.footFront=[lerp(40,74,wave),lerp(-38,-58,wave),-.1];
      p.kneeBack=[-22,-29]; p.footBack=[-35,-22,-.55]; p.handBack=[-43,-81];
    } else if(pose==='jump'){
      p.kneeFront=[24,-30]; p.footFront=[34,-18,.35]; p.kneeBack=[-22,-29]; p.footBack=[-34,-18,-.45];
    } else if(pose==='hurt'){
      p.shoulderFront=[18,-85]; p.elbowFront=[33,-70]; p.handFront=[43,-60];
      p.shoulderBack=[-15,-91]; p.elbowBack=[-31,-100]; p.handBack=[-43,-94]; p.footFront=[25,0,.2];
    } else if(pose==='dead'){
      const fall=t*Math.PI*.48;
      const rotatePoint=(point)=>{
        const x=point[0],y=point[1]+45,c=Math.cos(fall),s=Math.sin(fall);
        point[0]=x*c-y*s; point[1]=x*s+y*c-45;
      };
      Object.values(p).filter(v=>Array.isArray(v)).forEach(rotatePoint);
    }
    return p;
  }
}

const spriteRenderer=new SpriteRenderer();
