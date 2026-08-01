'use strict';

class Fighter {
  constructor(x,y,opts={}) {
    this.x=x; this.y=y; this.z=0; this.vx=0; this.vy=0; this.vz=0; this.dir=opts.dir || 1;
    this.w=opts.w || 46; this.h=opts.h || 112; this.maxHealth=opts.health || 100; this.health=this.maxHealth;
    this.speed=opts.speed || 230; this.team=opts.team || 'enemy'; this.type=opts.type || 'brawler';
    this.name=opts.name || 'Thug'; this.color=opts.color || '#d83f64'; this.accent=opts.accent || '#ffd15c';
    this.state='idle'; this.anim=0; this.attackTimer=0; this.attackDuration=0; this.attackHit=false;
    this.attackStats=null; this.queuedAttack=null; this.hurt=0; this.invuln=0; this.dead=false; this.remove=false;
    this.flash=0; this.stun=0; this.combo=0; this.comboTimer=0; this.weapon=opts.weapon || null;
    this.aiTimer=rand(.2,.8); this.mass=opts.mass || 1; this.boss=!!opts.boss; this.specialCooldown=0;
    this.block=0; this.wasAirborne=false;
  }

  updateBase(dt) {
    this.anim += dt * (this.state === 'walk' ? 9 : 4.5);
    this.invuln=Math.max(0,this.invuln-dt); this.hurt=Math.max(0,this.hurt-dt); this.flash=Math.max(0,this.flash-dt);
    this.stun=Math.max(0,this.stun-dt); this.comboTimer=Math.max(0,this.comboTimer-dt); this.specialCooldown=Math.max(0,this.specialCooldown-dt);
    if(this.comboTimer<=0) this.combo=0;

    const fallingSpeed=this.vz;
    this.z += this.vz*dt;
    this.vz -= 1180*dt;
    if(this.z<=0){
      if(this.wasAirborne && fallingSpeed < -80){
        audio.land(this.mass>1.45);
        if(typeof dustBurst==='function') dustBurst(this.x,this.y+2,this.mass>1.45?12:7);
        game.shake=Math.max(game.shake,this.mass>1.45?4:2);
      }
      this.z=0;
      if(this.vz<0) this.vz=0;
      if(['jump','uppercut','flyingKick'].includes(this.state) && this.attackTimer<=0) this.state='idle';
    }
    this.wasAirborne=this.z>0;

    this.x += this.vx*dt;
    this.y += this.vy*dt;
    this.vx *= Math.pow(.0008,dt);
    this.vy *= Math.pow(.0008,dt);
    this.x=clamp(this.x,40,1240);
    this.y=clamp(this.y,360,650);

    if(this.attackTimer>0){
      this.attackTimer-=dt;
      if(this.attackTimer<=0){
        this.attackTimer=0;
        const next=this.queuedAttack;
        this.queuedAttack=null;
        this.attackHit=false;
        this.attackStats=null;
        if(next && !this.dead && this.stun<=0) this.attack(next);
        else this.state=this.z>0?'jump':'idle';
      }
    }
  }

  getAttackStats(kind) {
    return {
      punch1:{duration:.28,active:[.10,.22],range:66,damage:8,knock:95},
      punch2:{duration:.31,active:[.11,.24],range:72,damage:10,knock:125},
      hook:{duration:.41,active:[.17,.31],range:77,damage:14,knock:185},
      heavyPunch:{duration:.56,active:[.22,.40],range:84,damage:22,knock:310,strong:true,launch:120},
      kick1:{duration:.42,active:[.16,.30],range:86,damage:12,knock:155},
      roundKick:{duration:.54,active:[.20,.39],range:101,damage:18,knock:245,strong:true},
      axeKick:{duration:.64,active:[.25,.46],range:92,damage:24,knock:220,strong:true,launch:285},
      dragonKick:{duration:.66,active:[.21,.48],range:112,damage:26,knock:345,strong:true,launch:155},
      spinningBackfist:{duration:.51,active:[.18,.38],range:94,damage:20,knock:275,strong:true},
      twistKick:{duration:.79,active:[.16,.61],range:122,damage:29,knock:370,strong:true,launch:185,pierce:true},
      cyclone:{duration:.86,active:[.18,.68],range:120,damage:27,knock:320,strong:true,launch:150,pierce:true},
      uppercut:{duration:.58,active:[.11,.34],range:82,damage:19,knock:170,strong:true,launch:365},
      flyingKick:{duration:.68,active:[.16,.52],range:108,damage:23,knock:335,strong:true,launch:150},
      special:{duration:.78,active:[.23,.55],range:112,damage:30,knock:340,strong:true,launch:245,pierce:true}
    }[kind] || null;
  }

  attack(kind='punch1') {
    const aerial=kind==='uppercut'||kind==='flyingKick';
    if(this.dead || this.stun>0 || this.attackTimer>0) return false;
    if(aerial && this.z<=0 && this.vz<=0) return false;
    if(!aerial && this.z>8) return false;

    const stats=this.getAttackStats(kind);
    if(!stats) return false;
    this.state=kind;
    this.attackDuration=stats.duration+(this.weapon?.05:0);
    this.attackTimer=this.attackDuration;
    this.attackHit=false;
    this.attackStats={...stats};

    if(kind==='uppercut'){
      this.vz=Math.max(this.vz,585); this.vx+=this.dir*135;
    } else if(kind==='flyingKick'){
      this.vx=this.dir*Math.max(455,Math.abs(this.vx)); this.vz=Math.max(this.vz,285);
    } else if(kind==='twistKick'){
      this.vx=this.dir*235; this.invuln=.42;
    } else if(kind==='dragonKick'){
      this.vx=this.dir*315;
    } else if(kind==='cyclone'){
      this.invuln=.62; this.vx=this.dir*120;
    }
    audio.attack(kind);
    return true;
  }

  requestAttack(kind) {
    if(this.attackTimer<=0) return this.attack(kind);
    const progress=1-this.attackTimer/Math.max(.001,this.attackDuration);
    if(progress>.08 || this.attackHit){
      this.queuedAttack=kind;
      return true;
    }
    return false;
  }

  tryHit(targets) {
    if(!this.attackStats || this.attackTimer<=0 || this.attackHit) return;
    const progress=1-this.attackTimer/this.attackDuration;
    const [activeStart,activeEnd]=this.attackStats.active;
    if(progress<activeStart || progress>activeEnd) return;

    const aerial=this.state==='uppercut'||this.state==='flyingKick';
    const weaponRange=this.weapon==='staff'?44:this.weapon==='pipe'?28:this.weapon==='bat'?20:0;
    const range=this.attackStats.range+weaponRange;
    let connected=false;

    for(const target of targets){
      if(target.dead || target.invuln>0 || target.team===this.team) continue;
      const dx=target.x-this.x;
      const dy=Math.abs(target.y-this.y);
      const facing=this.attackStats.pierce || Math.sign(dx||this.dir)===this.dir;
      const heightOkay=aerial ? this.z>10&&this.z<225&&target.z<95 : target.z<55;
      if(facing && Math.abs(dx)<range && dy<(aerial?58:52) && heightOkay){
        let damage=this.attackStats.damage+(this.weapon?7:0);
        if(this.weapon==='staff') damage+=3;
        if(this.weapon==='pipe') damage+=5;
        const strong=!!this.attackStats.strong;
        target.takeDamage(damage,(Math.sign(dx)||this.dir)*this.attackStats.knock,strong,{
          kind:this.state, weapon:this.weapon, direction:Math.sign(dx)||this.dir, source:this
        });
        if(this.attackStats.launch) target.vz=Math.max(target.vz,this.attackStats.launch/target.mass);
        connected=true;
        this.onHit(target,damage);
        if(!this.attackStats.pierce) break;
      }
    }
    if(connected) this.attackHit=true;
  }

  onHit(target,dmg) {
    if(this.team==='player') {
      this.combo++;
      this.comboTimer=1.6;
      game.score+=Math.round(dmg*13*this.combo);
      ui.combo.querySelector('strong').textContent=this.combo;
      ui.combo.style.opacity=this.combo>1?1:0;
      if(this.combo>1) audio.combo(Math.min(6,this.combo));
    }
  }

  takeDamage(amount,knock=0,strong=false,meta={}) {
    if(this.invuln>0 || this.dead) return;
    const blocked=this.block>0;
    if(blocked){ amount*=.35; knock*=.25; audio.block(); }
    this.health-=amount;
    this.hurt=strong?.42:.25; this.stun=strong?.5:.22; this.invuln=.18; this.flash=.12;
    this.vx+=knock/this.mass;
    if(strong && !blocked) this.vz=Math.max(this.vz,230/this.mass);

    const kind=blocked?'block':(meta.kind||'punch1');
    const direction=meta.direction||Math.sign(knock)||1;
    impactBurst(this.x-direction*10,this.y-this.z-66,kind,strong&&!blocked,this.color,direction,meta.weapon);
    if(!blocked){ audio.impact(kind,strong,meta.weapon); audio.hurt(this.team==='player'); }
    game.shake=Math.max(game.shake,blocked?3:strong?13:6);
    game.slow=blocked?.012:strong?.06:.028;
    game.saveDirty=true;
    if(this.health<=0) this.die(knock);
  }

  die(knock=0) {
    this.health=0; this.dead=true; this.state='dead'; this.vx+=knock*.8; this.vz=360/this.mass; this.removeAt=2;
    audio.ko(); impactBurst(this.x,this.y-62,'ko',true,'#ffd45c',Math.sign(knock)||1,this.weapon);
  }
}

class Player extends Fighter {
  constructor(){
    super(210,560,{team:'player',health:130,speed:310,color:'#f3f0e5',accent:'#e43b2f',name:'Rafi',type:'player'});
    this.energy=100; this.lives=3; this.attackLatch={}; this.sequence=[]; this.directionHistory=[];
    this.lastMoveDir=0; this.pressTimes={punch:-9,kick:-9};
  }
  resetPosition(preserveProgress=false){
    this.x=210; this.y=560; this.z=0; this.vx=0; this.vy=0; this.vz=0;
    if(!preserveProgress){ this.health=this.maxHealth; this.energy=100; this.weapon=null; }
    this.dead=false; this.state='idle'; this.invuln=1.5; this.attackTimer=0; this.attackStats=null;
    this.queuedAttack=null; this.wasAirborne=false; this.sequence=[]; this.directionHistory=[];
  }
  registerDirection(sign){
    if(!sign || sign===this.lastMoveDir) return;
    this.lastMoveDir=sign;
    this.directionHistory.push({dir:sign,time:game.elapsed});
    this.directionHistory=this.directionHistory.filter(item=>game.elapsed-item.time<.62).slice(-4);
  }
  hasRapidReverse(){
    const history=this.directionHistory;
    if(history.length<2) return false;
    const a=history[history.length-2], b=history[history.length-1];
    return a.dir===-b.dir && b.time-a.time<.46 && game.elapsed-b.time<.34;
  }
  appendSequence(token){
    this.sequence.push({token,time:game.elapsed});
    this.sequence=this.sequence.filter(item=>game.elapsed-item.time<.9).slice(-5);
  }
  sequenceString(){ return this.sequence.map(item=>item.token).join(''); }
  resolveGroundMove(token){
    if(token==='K' && this.hasRapidReverse()){
      this.directionHistory=[]; this.sequence=[]; return 'twistKick';
    }
    this.appendSequence(token);
    const seq=this.sequenceString();
    if(seq.endsWith('PPK')){ this.sequence=[]; return 'dragonKick'; }
    if(seq.endsWith('KKP')){ this.sequence=[]; return 'spinningBackfist'; }
    if(token==='P'){
      const tail=(seq.match(/P+$/)||[''])[0].length;
      if(tail>=4){ this.sequence=[]; return 'heavyPunch'; }
      return ['punch1','punch2','hook'][Math.min(2,tail-1)];
    }
    const tail=(seq.match(/K+$/)||[''])[0].length;
    if(tail>=3){ this.sequence=[]; return 'axeKick'; }
    return tail===2?'roundKick':'kick1';
  }
  update(dt){
    this.updateBase(dt);
    if(this.dead){ this.removeAt-=dt; if(this.removeAt<=0) respawnPlayer(); return; }
    if(this.stun>0) return;

    const kx=(keys.has('a')||keys.has('arrowleft')?-1:0)+(keys.has('d')||keys.has('arrowright')?1:0);
    const ky=(keys.has('w')||keys.has('arrowup')?-1:0)+(keys.has('s')||keys.has('arrowdown')?1:0);
    const mx=clamp(input.x+kx,-1,1), my=clamp(input.y+ky,-1,1);
    const moveSign=Math.abs(mx)>.5?Math.sign(mx):0;
    if(moveSign) this.registerDirection(moveSign);
    if(Math.abs(mx)<.18) this.lastMoveDir=0;

    if(this.attackTimer<=0){
      const length=Math.hypot(mx,my)||1;
      const airScale=this.z>0?.72:1;
      this.vx=mx/Math.max(1,length)*this.speed*airScale;
      this.vy=my/Math.max(1,length)*this.speed*.58*airScale;
      if(Math.abs(mx)>.12) this.dir=Math.sign(mx);
      if(this.z>0) this.state='jump';
      else if(Math.abs(mx)+Math.abs(my)>.12) this.state='walk';
      else this.state='idle';
    }

    this.x=clamp(this.x,60,1220); this.y=clamp(this.y,385,642);
    const triggers={
      punch:input.punch||keys.has('j'), kick:input.kick||keys.has('k'),
      jump:input.jump||keys.has('l'), special:input.special||keys.has('i')
    };
    const pressed={
      punch:triggers.punch&&!this.attackLatch.punch, kick:triggers.kick&&!this.attackLatch.kick,
      jump:triggers.jump&&!this.attackLatch.jump, special:triggers.special&&!this.attackLatch.special
    };
    if(pressed.punch) this.pressTimes.punch=game.elapsed;
    if(pressed.kick) this.pressTimes.kick=game.elapsed;

    if(pressed.jump && this.z===0 && this.attackTimer<=0){
      this.vz=520; this.state='jump'; audio.jump(); dustBurst(this.x,this.y+2,6);
    }

    const airborne=this.z>4||this.vz>0;
    const simultaneous=(pressed.punch||pressed.kick)&&Math.abs(this.pressTimes.punch-this.pressTimes.kick)<.13;
    if(simultaneous && !airborne){
      this.sequence=[]; this.requestAttack('cyclone');
    } else {
      if(pressed.punch){
        const move=airborne?'uppercut':this.resolveGroundMove('P');
        this.requestAttack(move);
      }
      if(pressed.kick){
        const move=airborne?'flyingKick':this.resolveGroundMove('K');
        this.requestAttack(move);
      }
    }

    if(pressed.special && this.energy>=34 && this.requestAttack('special')){
      this.energy-=34; this.invuln=.7; radialBurst(this.x,this.y-55,'#7cf7ff');
    }

    this.attackLatch=triggers;
    this.energy=clamp(this.energy+dt*9,0,100);
    this.tryHit(game.enemies);

    for(const pickup of game.pickups){
      if(!pickup.taken && Math.hypot(this.x-pickup.x,(this.y-pickup.y)*1.4)<52){
        pickup.taken=true;
        if(pickup.kind==='health') this.health=clamp(this.health+42,0,this.maxHealth);
        else this.weapon=pickup.kind;
        audio.pickup(); toast(pickup.kind==='health'?'Health restored':`${pickup.kind.toUpperCase()} acquired`);
        game.saveDirty=true;
      }
    }
  }
}

class Enemy extends Fighter {
  constructor(type,x,y,boss=false){
    const cfg={
      brawler:{health:48,speed:135,color:'#df395e',accent:'#ffd05c',name:'Street Bruiser',mass:1},
      kicker:{health:42,speed:170,color:'#8a5cff',accent:'#5bffd2',name:'Flash Kicker',mass:.9},
      knife:{health:36,speed:185,color:'#24b88f',accent:'#f6ef62',name:'Blade Punk',mass:.85,weapon:'knife'},
      heavy:{health:90,speed:96,color:'#d66e2f',accent:'#66e7ff',name:'Iron Heavy',mass:1.7},
      tiger:{health:360,speed:155,color:'#f04466',accent:'#ffd35c',name:'Chrome Tiger',mass:1.6},
      rainmaker:{health:420,speed:145,color:'#3d78d8',accent:'#8dfff2',name:'The Rainmaker',mass:1.9,weapon:'staff'},
      vex:{health:500,speed:165,color:'#7b2fb8',accent:'#ffcb55',name:'Dato Vex',mass:2.1,weapon:'pipe'}
    }[type];
    super(x,y,{...cfg,team:'enemy',type,boss,health:cfg.health});
    this.boss=boss; this.phase=1; this.aiTimer=rand(.3,.9); this.attackDelay=rand(.25,.75);
  }
  update(dt){
    this.updateBase(dt);
    if(this.dead){ this.removeAt-=dt; if(this.removeAt<=0) this.remove=true; return; }
    if(this.stun>0) return;
    const target=player, dx=target.x-this.x, dy=target.y-this.y, distance=dist(this,target);
    this.dir=Math.sign(dx||1); this.aiTimer-=dt; this.block=Math.max(0,this.block-dt);
    if(this.attackTimer>0){ this.tryHit([target]); return; }

    if(this.boss){
      const healthRatio=this.health/this.maxHealth;
      this.phase=healthRatio<.35?3:healthRatio<.7?2:1;
      if(this.specialCooldown<=0 && distance<190 && Math.random()<dt*(.5+this.phase*.2)){
        this.specialCooldown=3.2-this.phase*.35; this.attack(this.phase===3&&Math.random()<.45?'twistKick':'special');
        if(this.phase>=2 && this.attackStats) this.attackStats.range+=25;
        return;
      }
      if(this.phase===3 && Math.random()<dt*.7){ this.vx+=this.dir*430; this.vy+=rand(-100,100); }
    }

    if(distance>72 || Math.abs(dy)>34){
      const pace=this.speed*(this.boss?1.05:1);
      this.vx=clamp(dx,-1,1)*pace; this.vy=clamp(dy,-1,1)*pace*.58; this.state='walk';
    } else {
      this.vx*=.2; this.vy*=.2; this.state='idle';
      if(this.aiTimer<=0){
        this.aiTimer=rand(.55,1.15); const roll=Math.random();
        if(roll<.18 && this.type!=='knife') this.block=.45;
        else this.attack(roll<.58?'punch1':'kick1');
      }
    }
    if(!this.boss && distance<190 && Math.random()<dt*.15) this.vy+=rand(-150,150);
  }
  onHit(target,dmg){ if(this.boss && this.phase===3 && Math.random()<.25) this.vx-=this.dir*130; }
  die(knock){ super.die(knock); game.score+=this.boss?5000:500; if(!this.boss&&Math.random()<.23) dropPickup(this.x,this.y); game.saveDirty=true; }
}

const player=new Player();
