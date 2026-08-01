'use strict';
class Fighter {
  constructor(x,y,opts={}) {
    this.x=x; this.y=y; this.z=0; this.vx=0; this.vy=0; this.vz=0; this.dir=opts.dir || 1;
    this.w=opts.w || 46; this.h=opts.h || 112; this.maxHealth=opts.health || 100; this.health=this.maxHealth;
    this.speed=opts.speed || 230; this.team=opts.team || 'enemy'; this.type=opts.type || 'brawler';
    this.name=opts.name || 'Thug'; this.color=opts.color || '#d83f64'; this.accent=opts.accent || '#ffd15c';
    this.state='idle'; this.anim=0; this.attackTimer=0; this.attackDuration=0; this.attackHit=false;
    this.hurt=0; this.invuln=0; this.dead=false; this.remove=false; this.flash=0; this.stun=0;
    this.combo=0; this.comboTimer=0; this.weapon=opts.weapon || null; this.aiTimer=rand(.2,.8);
    this.mass=opts.mass || 1; this.boss=!!opts.boss; this.specialCooldown=0; this.block=0;
  }
  updateBase(dt) {
    this.anim += dt * (this.state === 'walk' ? 9 : 4.5);
    this.invuln=Math.max(0,this.invuln-dt); this.hurt=Math.max(0,this.hurt-dt); this.flash=Math.max(0,this.flash-dt);
    this.stun=Math.max(0,this.stun-dt); this.comboTimer=Math.max(0,this.comboTimer-dt); this.specialCooldown=Math.max(0,this.specialCooldown-dt);
    if(this.comboTimer<=0) this.combo=0;
    this.z += this.vz*dt; this.vz -= 1180*dt;
    if(this.z<=0){ this.z=0; if(this.vz<0) this.vz=0; }
    this.x += this.vx*dt; this.y += this.vy*dt;
    this.vx *= Math.pow(.0008,dt); this.vy *= Math.pow(.0008,dt);
    this.x=clamp(this.x,40,1240); this.y=clamp(this.y,360,650);
    if(this.attackTimer>0){ this.attackTimer-=dt; if(this.attackTimer<=0){ this.state='idle'; this.attackHit=false; } }
  }
  attack(kind='punch') {
    if(this.dead || this.stun>0 || this.attackTimer>0 || this.z>8) return false;
    const weaponBonus=this.weapon ? .05 : 0;
    const stats = {
      punch:{duration:.36,active:[.12,.23],range:68,damage:10,knock:130},
      kick:{duration:.54,active:[.20,.34],range:88,damage:16,knock:210},
      special:{duration:.78,active:[.23,.55],range:112,damage:30,knock:340}
    }[kind];
    this.state=kind; this.attackTimer=stats.duration+weaponBonus; this.attackDuration=this.attackTimer; this.attackHit=false; this.attackStats=stats;
    audio.whoosh(); return true;
  }
  tryHit(targets) {
    if(!this.attackStats || this.attackTimer<=0 || this.attackHit) return;
    const progress=1-this.attackTimer/this.attackDuration, [a,b]=this.attackStats.active;
    if(progress<a || progress>b) return;
    const weaponRange = this.weapon==='staff' ? 44 : this.weapon==='pipe' ? 28 : this.weapon==='bat' ? 20 : 0;
    const range=this.attackStats.range+weaponRange;
    for(const t of targets){
      if(t.dead || t.invuln>0 || t.team===this.team) continue;
      const dx=t.x-this.x, dy=Math.abs(t.y-this.y);
      if(Math.sign(dx||this.dir)===this.dir && Math.abs(dx)<range && dy<48 && t.z<45){
        let dmg=this.attackStats.damage + (this.weapon ? 7 : 0);
        if(this.weapon==='staff') dmg+=3; if(this.weapon==='pipe') dmg+=5;
        t.takeDamage(dmg,this.dir*this.attackStats.knock,this.state==='special');
        this.attackHit=true; this.onHit(t,dmg); if(this.state!=='special') break;
      }
    }
  }
  onHit(target,dmg) {
    if(this.team==='player') {
      this.combo++; this.comboTimer=1.35; game.score+=Math.round(dmg*13*this.combo);
      ui.combo.querySelector('strong').textContent=this.combo; ui.combo.style.opacity=this.combo>1?1:0;
    }
  }
  takeDamage(amount, knock=0, strong=false) {
    if(this.invuln>0 || this.dead) return;
    if(this.block>0){ amount*=.35; knock*=.25; }
    this.health-=amount; this.hurt=strong?.42:.25; this.stun=strong?.5:.22; this.invuln=.18; this.flash=.1;
    this.vx += knock/this.mass; if(strong) this.vz=260/this.mass;
    burst(this.x,this.y-this.z-62,strong?18:10,this.color); audio.hit(strong); game.shake=Math.max(game.shake,strong?12:6); game.slow=strong?.055:.025;
    if(this.health<=0) this.die(knock);
  }
  die(knock=0) { this.health=0; this.dead=true; this.state='dead'; this.vx+=knock*.8; this.vz=360/this.mass; this.removeAt=2; audio.ko(); burst(this.x,this.y-60,24,'#ffd45c'); }
}

class Player extends Fighter {
  constructor(){ super(210,560,{team:'player',health:130,speed:310,color:'#28c2ff',accent:'#ffd34d',name:'Rafi'}); this.energy=100; this.lives=3; this.attackLatch={}; }
  resetPosition(){ this.x=210; this.y=560; this.z=0; this.health=this.maxHealth; this.energy=100; this.dead=false; this.state='idle'; this.weapon=null; this.invuln=1.5; }
  update(dt){
    this.updateBase(dt); if(this.dead){ this.removeAt-=dt; if(this.removeAt<=0) respawnPlayer(); return; }
    if(this.stun>0) return;
    const kx=(keys.has('a')||keys.has('arrowleft')?-1:0)+(keys.has('d')||keys.has('arrowright')?1:0);
    const ky=(keys.has('w')||keys.has('arrowup')?-1:0)+(keys.has('s')||keys.has('arrowdown')?1:0);
    const mx=clamp(input.x+kx,-1,1), my=clamp(input.y+ky,-1,1);
    if(this.attackTimer<=0){
      const len=Math.hypot(mx,my) || 1; this.vx=mx/Math.max(1,len)*this.speed; this.vy=my/Math.max(1,len)*this.speed*.58;
      if(Math.abs(mx)+Math.abs(my)>.12){ this.state='walk'; if(Math.abs(mx)>.12) this.dir=Math.sign(mx); } else this.state='idle';
    }
    this.x=clamp(this.x,60,1220); this.y=clamp(this.y,385,642);
    const triggers={punch:input.punch||keys.has('j'),kick:input.kick||keys.has('k'),jump:input.jump||keys.has('l'),special:input.special||keys.has('i')};
    if(triggers.punch&&!this.attackLatch.punch) this.attack('punch');
    if(triggers.kick&&!this.attackLatch.kick) this.attack('kick');
    if(triggers.jump&&!this.attackLatch.jump&&this.z===0&&this.attackTimer<=0){ this.vz=510; this.state='jump'; audio.tone(210,.07,'triangle',.025,90); }
    if(triggers.special&&!this.attackLatch.special&&this.energy>=34&&this.attack('special')){ this.energy-=34; this.invuln=.7; radialBurst(this.x,this.y-55,'#7cf7ff'); }
    this.attackLatch=triggers;
    this.energy=clamp(this.energy+dt*9,0,100); this.tryHit(game.enemies);
    for(const p of game.pickups){ if(!p.taken && Math.hypot(this.x-p.x,(this.y-p.y)*1.4)<52){ p.taken=true; if(p.kind==='health') this.health=clamp(this.health+42,0,this.maxHealth); else this.weapon=p.kind; audio.pickup(); toast(p.kind==='health'?'Health restored':`${p.kind.toUpperCase()} acquired`); } }
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
    super(x,y,{...cfg,team:'enemy',type,boss,health:cfg.health*(boss?1:1)});
    this.boss=boss; this.phase=1; this.aiTimer=rand(.3,.9); this.attackDelay=rand(.25,.75);
  }
  update(dt){
    this.updateBase(dt); if(this.dead){ this.removeAt-=dt; if(this.removeAt<=0) this.remove=true; return; }
    if(this.stun>0) return;
    const p=player, dx=p.x-this.x, dy=p.y-this.y, d=dist(this,p); this.dir=Math.sign(dx||1);
    this.aiTimer-=dt; this.block=Math.max(0,this.block-dt);
    if(this.attackTimer>0){ this.tryHit([p]); return; }
    if(this.boss){
      const hp=this.health/this.maxHealth; this.phase=hp<.35?3:hp<.7?2:1;
      if(this.specialCooldown<=0 && d<190 && Math.random()<dt*(.5+this.phase*.2)){
        this.specialCooldown=3.2-this.phase*.35; this.attack('special'); if(this.phase>=2) this.attackStats.range+=25; return;
      }
      if(this.phase===3 && Math.random()<dt*.7){ this.vx+=this.dir*430; this.vy+=rand(-100,100); }
    }
    if(d>72 || Math.abs(dy)>34){
      const pace=this.speed*(this.boss?1.05:1); this.vx=clamp(dx,-1,1)*pace; this.vy=clamp(dy,-1,1)*pace*.58; this.state='walk';
    } else {
      this.vx*=.2; this.vy*=.2; this.state='idle';
      if(this.aiTimer<=0){
        this.aiTimer=rand(.55,1.15); const r=Math.random();
        if(r<.18 && this.type!=='knife') this.block=.45;
        else this.attack(r<.58?'punch':'kick');
      }
    }
    if(!this.boss && d<190 && Math.random()<dt*.15){ this.vy+=rand(-150,150); }
  }
  onHit(target,dmg){ if(this.boss && this.phase===3 && Math.random()<.25) this.vx-=this.dir*130; }
  die(knock){ super.die(knock); game.score += this.boss?5000:500; if(!this.boss && Math.random()<.23) dropPickup(this.x,this.y); }
}

const player=new Player();
