'use strict';

(() => {
  const laneBounds=[
    {top:548,bottom:676},
    {top:548,bottom:676},
    {top:526,bottom:670}
  ];

  function pushShape(actor){
    const type=actor.team==='player'?'player':actor.type;
    const shape={
      player:{rx:35,ry:16}, brawler:{rx:34,ry:16}, kicker:{rx:33,ry:15},
      knife:{rx:31,ry:15}, heavy:{rx:47,ry:20}, tiger:{rx:51,ry:21},
      rainmaker:{rx:50,ry:21}, vex:{rx:48,ry:20}
    }[type]||{rx:34,ry:16};
    const bossBoost=actor.boss?1.08:1;
    return {rx:shape.rx*bossBoost,ry:shape.ry*bossBoost};
  }

  function movable(actor){
    return actor && !actor.remove && !actor.dead && actor.z<72;
  }

  function separate(a,b){
    if(!movable(a)||!movable(b)) return;
    const sa=pushShape(a), sb=pushShape(b);
    const dx=b.x-a.x;
    const dy=b.y-a.y;
    const targetX=sa.rx+sb.rx;
    const targetY=sa.ry+sb.ry;
    const nx=Math.abs(dx)/targetX;
    const ny=Math.abs(dy)/targetY;
    if(nx>=1||ny>=1) return;

    const invA=1/Math.max(.55,a.mass||1);
    const invB=1/Math.max(.55,b.mass||1);
    const total=invA+invB;
    const shareA=invA/total;
    const shareB=invB/total;

    if((1-nx)<(1-ny)){
      const sign=dx===0?(a.team==='player'?-1:1):Math.sign(dx);
      const overlap=targetX-Math.abs(dx)+.7;
      a.x-=sign*overlap*shareA;
      b.x+=sign*overlap*shareB;
    }else{
      const sign=dy===0?((a.x+b.x)%2>.5?-1:1):Math.sign(dy);
      const overlap=targetY-Math.abs(dy)+.7;
      a.y-=sign*overlap*shareA;
      b.y+=sign*overlap*shareB;
    }
  }

  function clampActor(actor){
    const lane=laneBounds[clamp(game.stage|0,0,laneBounds.length-1)];
    actor.x=clamp(actor.x,55,1225);
    actor.y=clamp(actor.y,lane.top,lane.bottom);
  }

  function resolveCrowd(){
    const actors=[player,...game.enemies].filter(movable);
    for(let pass=0;pass<2;pass++){
      for(let i=0;i<actors.length;i++){
        for(let j=i+1;j<actors.length;j++) separate(actors[i],actors[j]);
      }
      actors.forEach(clampActor);
    }
  }

  const originalUpdate=update;
  update=function arcadeUpdate(dt){
    originalUpdate(dt);
    if(game.state==='playing') resolveCrowd();
  };

  window.ArcadePhysics={resolve:resolveCrowd,pushShape};
})();
