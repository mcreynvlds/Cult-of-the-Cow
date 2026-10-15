'use strict';
// Crusades: room-by-room top-down combat against heretics and the Butcher Bishops.

const FERVOR_COST = 50;
const WALL = 20;
const TOP_WALL = 96;

const Crusade = {
  name: 'crusade',
  controls: 'crusade',
  t: 0,

  enter({ realm }) {
    this.realmIdx = realm;
    this.realm = realm === 4 ? FINAL_REALM : REALMS[realm];
    this.diff = Math.min(realm, 3);
    const bossAlive = realm === 4 ? !S.finalDefeated : !S.bosses[realm];
    this.repeat = !bossAlive;
    if (realm === 4) this.rooms = ['boss'];
    else this.rooms = bossAlive ? ['fight', 'fight', 'rescue', 'fight', 'boss'] : ['fight', 'fight', 'rescue', 'fight', 'fight'];
    this.roomIdx = 0;
    this.loot = { grass: 0, hay: 0, followers: [] };
    this.t = 0;
    const mh = maxHearts();
    this.player = {
      x: 0, y: 0, r: 10, hp: mh, maxHp: mh, face: { x: 0, y: -1 }, fx: 1, vx: 0, vy: 0,
      atkT: 0, atkDur: 0.24, combo: 0, comboT: 0, dodgeT: 0, dodgeCD: 0, dodgeDir: { x: 0, y: -1 },
      invuln: 0, fervor: 0, hits: new Set(), moving: false, dead: false,
    };
    this.over = false;
    S.runs++;
    this.layout();
    this.buildRoom();
  },

  exit() {
    UI.setBoss(null);
    UI.setAction(null);
  },

  layout() {
    this.W = Game.W; this.H = Game.H;
    this.L = WALL; this.R = this.W - WALL; this.T = TOP_WALL; this.B = this.H - WALL;
    this.door = { x: this.W / 2, y: this.T, w: 48 };
  },

  onResize() {
    const oW = this.W, oH = this.H;
    this.layout();
    const sx = (x) => this.L + ((x - WALL) / (oW - 2 * WALL)) * (this.R - this.L);
    const sy = (y) => this.T + ((y - TOP_WALL) / (oH - WALL - TOP_WALL)) * (this.B - this.T);
    const move = (o) => { o.x = sx(o.x); o.y = sy(o.y); };
    [this.player, ...this.enemies, ...this.proj, ...this.pickups, ...this.obstacles].forEach(move);
    if (this.boss) { move(this.boss); if (this.boss.tx != null) { this.boss.tx = sx(this.boss.tx); this.boss.ty = sy(this.boss.ty); } }
    if (this.captive) move(this.captive);
    this.floorKey = '';
  },

  // ------------------------------------------------------------ room setup
  buildRoom() {
    const type = this.rooms[this.roomIdx];
    this.type = type;
    this.enemies = []; this.proj = []; this.pickups = []; this.parts = []; this.fx = []; this.texts = [];
    this.obstacles = []; this.waves = []; this.captive = null; this.boss = null;
    this.doorOpen = false; this.cleared = false; this.roomT = 0; this.hitstop = 0; this.slow = 1;
    this.transitioning = false; this.waveDelay = 0;
    this.floorKey = '';
    const p = this.player;
    p.x = this.W / 2; p.y = this.B - 30; p.vx = p.vy = 0; p.face = { x: 0, y: -1 };
    p.atkT = 0; p.dodgeT = 0; p.invuln = 0.6;
    this.banner = { title: this.roomIdx === 0 ? this.realm.name : (type === 'boss' ? '⚠ Bishop\'s Chamber' : ''), sub: this.roomIdx === 0 ? this.realm.sub : '', t: 0 };

    if (type !== 'boss') {
      const n = randi(2, 5);
      for (let i = 0; i < n * 6 && this.obstacles.length < n; i++) {
        const o = { x: rand(this.L + 40, this.R - 40), y: rand(this.T + 60, this.B - 70), r: rand(13, 19) };
        if (Math.abs(o.x - this.W / 2) < 60 && (o.y > this.B - 110 || o.y < this.T + 130)) continue;
        if (type === 'rescue' && Math.hypot(o.x - this.W / 2, o.y - (this.T + this.B) / 2) < 70) continue;
        if (this.obstacles.some((q) => Math.hypot(q.x - o.x, q.y - o.y) < q.r + o.r + 30)) continue;
        this.obstacles.push(o);
      }
    }

    if (type === 'fight') {
      const total = 3 + this.roomIdx + this.diff + (this.repeat && this.roomIdx === 4 ? 2 : 0);
      const nWaves = this.roomIdx >= 2 || this.diff >= 2 ? 2 : 1;
      let left = total;
      for (let w = 0; w < nWaves; w++) {
        const cnt = w === nWaves - 1 ? left : Math.ceil(total / nWaves);
        left -= cnt;
        this.waves.push(Array.from({ length: cnt }, () => weighted(this.realm.enemies)));
      }
      this.spawnWave();
    } else if (type === 'rescue') {
      const f = randomFollower();
      this.captive = { x: this.W / 2, y: (this.T + this.B) / 2, r: 12, f, freed: false };
      this.waves.push(Array.from({ length: 2 + this.diff }, () => weighted(this.realm.enemies)));
      this.spawnWave();
    } else if (type === 'boss') {
      this.spawnBoss();
    }
  },

  spawnWave() {
    const wave = this.waves.shift();
    if (!wave) return;
    for (const type of wave) {
      let x, y, tries = 0;
      do {
        x = rand(this.L + 30, this.R - 30); y = rand(this.T + 30, this.B - 40); tries++;
      } while (tries < 30 && (Math.hypot(x - this.player.x, y - this.player.y) < 130 || this.obstacles.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + 20)));
      this.enemies.push(this.mkEnemy(type, x, y));
    }
  },

  mkEnemy(type, x, y, spawnT = 0.8) {
    const d = ENEMIES[type];
    const hpMul = 1 + 0.3 * this.diff + (this.repeat ? 0.15 : 0);
    return {
      type, x, y, r: d.r, hp: d.hp * hpMul, maxHp: d.hp * hpMul, speed: d.speed * (1 + 0.06 * this.diff), ai: d.ai,
      shots: d.shots || 1, state: 'move', st: 0, cd: rand(0.8, 2.2), face: 1, flash: 0, kbx: 0, kby: 0,
      spawnT, moving: false, seed: rand(0, 10), dir: { x: 0, y: 0 }, wob: rand(0, TAU), strafe: chance(0.5) ? 1 : -1,
    };
  },

  spawnBoss() {
    const key = this.realm.boss;
    const def = BOSSES[key];
    const hpMul = 1 + (S.upgrades.damage * 0.15);
    this.boss = {
      key, def, x: this.W / 2, y: this.T + 110, r: def.r, hp: def.hp * hpMul, maxHp: def.hp * hpMul, speed: def.speed,
      face: 1, flash: 0, state: 'intro', st: 0, last: null, phase2: false, z: 0, angle: 0, n: 0, dir: { x: 0, y: 1 },
      tx: null, ty: null, dying: 0, seed: 0, moving: false,
      proj: { sirloin: 'sausage', brisket: 'brine', rump: 'smoke', chuck: 'sausage', grills: 'fire' }[key],
    };
    UI.setBoss(def.name, 1);
    setTimeout(() => {
      if (Game.scene !== this || !this.boss) return;
      const go = () => { Sfx.roar(); Game.shake = 10; this.boss.state = 'idle'; this.boss.st = 1.0; };
      if (def.intro.length) UI.dialog(def.intro, go); else go();
    }, 900);
  },

  // ------------------------------------------------------------ main update
  update(dt) {
    this.t += dt;
    this.roomT += dt;
    if (this.banner) this.banner.t += dt;
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    dt *= this.slow;
    const p = this.player;

    this.updatePlayer(dt);
    for (const e of this.enemies) this.updateEnemy(e, dt);
    if (this.boss) this.updateBoss(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    for (const pt of this.parts) { pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 1 - dt * 3; pt.vy = pt.vy * (1 - dt * 3) + (pt.grav || 0) * dt; }
    this.parts = this.parts.filter((pt) => pt.life > 0);
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter((f) => f.t < f.dur);
    for (const tx of this.texts) { tx.t += dt; tx.y -= 30 * dt; }
    this.texts = this.texts.filter((tx) => tx.t < 1);

    // room flow
    if (!this.doorOpen && !p.dead && this.type !== 'boss' && this.enemies.length === 0) {
      if (this.waves.length) {
        this.waveDelay += dt;
        if (this.waveDelay > 0.7) { this.waveDelay = 0; this.spawnWave(); }
      } else this.clearRoom();
    }
    if (this.doorOpen && !this.transitioning && p.y < this.T + p.r + 6 && Math.abs(p.x - this.door.x) < this.door.w / 2) {
      this.nextRoom();
    }

    // interaction
    let label = null;
    if (this.captive && !this.captive.freed && dist(p, this.captive) < 42) {
      label = this.enemies.length ? null : '🙏 Indoctrinate';
      if (label && Input.take('interact')) this.indoctrinate();
    }
    UI.setAction(label);
    UI.setFervor(p.fervor, p.fervor >= FERVOR_COST);
    if (this.boss) UI.setBoss(this.boss.def.name, this.boss.hp / this.boss.maxHp);
  },

  updatePlayer(dt) {
    const p = this.player;
    p.invuln -= dt; p.dodgeCD -= dt; p.comboT -= dt;
    if (p.dead) return;
    const m = Input.move;
    p.moving = m.mag > 0;
    if (p.dodgeT > 0) {
      p.dodgeT -= dt;
      p.x += p.dodgeDir.x * 360 * dt; p.y += p.dodgeDir.y * 360 * dt;
      if (chance(0.6)) this.parts.push({ x: p.x, y: p.y - 10, vx: 0, vy: 0, life: 0.25, max: 0.25, col: 'rgba(246,240,230,.5)', r: 9, ghost: true, fx: p.fx });
    } else {
      const sp = 140 * (p.atkT > 0 ? 0.35 : 1);
      p.x += m.x * sp * dt; p.y += m.y * sp * dt;
      if (m.mag > 0 && p.atkT <= 0) {
        p.face = norm(m.x, m.y);
        if (Math.abs(m.x) > 0.15) p.fx = m.x > 0 ? 1 : -1;
      }
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= Math.max(0, 1 - dt * 12); p.vy *= Math.max(0, 1 - dt * 12);
    for (const o of this.obstacles) pushOut(p, o, o.r);
    if (this.captive && !this.captive.freed) pushOut(p, this.captive, 10);
    const inDoor = this.doorOpen && Math.abs(p.x - this.door.x) < this.door.w / 2 - 4;
    p.x = clamp(p.x, this.L + p.r, this.R - p.r);
    p.y = clamp(p.y, inDoor ? this.T - 10 : this.T + p.r, this.B - p.r);

    // actions
    if (Input.take('dodge') && p.dodgeCD <= 0) {
      p.dodgeDir = m.mag > 0 ? norm(m.x, m.y) : { x: p.face.x, y: p.face.y };
      p.dodgeT = 0.22; p.dodgeCD = 0.48; p.invuln = Math.max(p.invuln, 0.3); p.atkT = 0;
      Sfx.dodge();
    }
    if (p.atkT > 0) p.atkT -= dt;
    if (p.dodgeT <= 0 && p.atkT <= 0.05 && Input.take('attack')) this.startAttack(m);
    if (Input.take('special')) {
      if (p.fervor >= FERVOR_COST) this.holyMoo();
      else { Sfx.deny(); this.texts.push({ x: p.x, y: p.y - 40, text: 'Not enough fervor!', t: 0, col: '#ccc', small: true }); }
    }

    // active swing frames
    if (p.atkT > 0 && p.atkDur - p.atkT < 0.13) this.swingHits();
  },

  startAttack(m) {
    const p = this.player;
    p.combo = p.comboT > 0 ? (p.combo + 1) % 3 : 0;
    // aim assist toward the nearest threat
    let best = null, bd = 160;
    const targets = this.enemies.filter((e) => e.spawnT <= 0);
    if (this.boss && this.boss.state !== 'intro' && this.boss.z < 20) targets.push(this.boss);
    for (const e of targets) {
      const d = dist(p, e) - e.r;
      if (d < bd) {
        if (m.mag > 0 && Math.abs(angDiff(Math.atan2(m.y, m.x), angTo(p, e))) > 1.0) continue;
        bd = d; best = e;
      }
    }
    if (best) { const a = angTo(p, best); p.face = { x: Math.cos(a), y: Math.sin(a) }; }
    else if (m.mag > 0) p.face = norm(m.x, m.y);
    if (Math.abs(p.face.x) > 0.15) p.fx = p.face.x > 0 ? 1 : -1;
    const big = p.combo === 2;
    p.atkDur = big ? 0.34 : 0.24;
    p.atkT = p.atkDur;
    p.comboT = p.atkDur + 0.35;
    p.hits = new Set();
    const lunge = big ? 230 : 120;
    p.vx = p.face.x * lunge; p.vy = p.face.y * lunge;
    Sfx.swing();
    this.fx.push({ kind: 'slash', t: 0, dur: 0.2, ang: Math.atan2(p.face.y, p.face.x), big, flip: p.combo === 1 });
  },

  swingHits() {
    const p = this.player;
    const big = p.combo === 2;
    const range = big ? 54 : 46;
    const arc = big ? 1.5 : 1.15;
    const fa = Math.atan2(p.face.y, p.face.x);
    const dmg = bellDamage() * (big ? 1.6 : 1);
    const inArc = (o, extra) => {
      const d = dist(p, o);
      return d < range + extra && (d < extra + p.r + 4 || Math.abs(angDiff(fa, angTo(p, o))) < arc);
    };
    for (const e of this.enemies) {
      if (e.spawnT > 0 || p.hits.has(e)) continue;
      if (inArc(e, e.r)) { p.hits.add(e); this.damageEnemy(e, dmg, angTo(p, e), big ? 300 : 190); }
    }
    const b = this.boss;
    if (b && !p.hits.has(b) && b.state !== 'intro' && !b.dying && b.z < 20 && inArc(b, b.r)) {
      p.hits.add(b); this.damageBoss(dmg);
    }
    for (const pr of this.proj) {
      if (!pr.enemy || pr.dead) continue;
      if (inArc(pr, pr.r)) {
        pr.dead = true;
        p.fervor = Math.min(100, p.fervor + 3);
        this.burst(pr.x, pr.y, '#fff2b0', 6, 120);
        Sfx.bell(0.1);
      }
    }
  },

  holyMoo() {
    const p = this.player;
    p.fervor -= FERVOR_COST;
    const R = 135;
    const dmg = 3 + 1.5 * S.upgrades.fervor + S.upgrades.damage * 0.5;
    Sfx.holyMoo();
    Game.shake = 12;
    this.hitstop = 0.06;
    this.fx.push({ kind: 'ring', x: p.x, y: p.y - 10, t: 0, dur: 0.5, R });
    this.texts.push({ x: p.x, y: p.y - 46, text: 'MOOOO!', t: 0, col: '#f0c35a', big: true });
    for (const e of [...this.enemies]) {
      if (e.spawnT > 0) continue;
      if (dist(p, e) < R + e.r) this.damageEnemy(e, dmg, angTo(p, e), 380, true);
    }
    if (this.boss && !this.boss.dying && this.boss.state !== 'intro' && dist(p, this.boss) < R + this.boss.r) this.damageBoss(dmg, true);
    for (const pr of this.proj) if (pr.enemy && dist(p, pr) < R) { pr.dead = true; this.burst(pr.x, pr.y, '#fff2b0', 4, 100); }
    p.invuln = Math.max(p.invuln, 0.4);
  },

  damageEnemy(e, dmg, ang, kb, noFervor) {
    e.hp -= dmg;
    e.flash = 0.12;
    if (e.state === 'windup' && e.ai !== 'charger') { e.state = 'recover'; e.st = 0.3; }
    e.kbx = Math.cos(ang) * kb; e.kby = Math.sin(ang) * kb;
    if (!noFervor) this.player.fervor = Math.min(100, this.player.fervor + 7 + 3 * S.upgrades.fervor);
    this.burst(e.x, e.y - 12, '#c8283a', 6, 150);
    Sfx.hit();
    this.hitstop = Math.max(this.hitstop, 0.035);
    Game.shake = Math.max(Game.shake, 3);
    if (e.hp <= 0) this.killEnemy(e);
  },

  killEnemy(e) {
    this.enemies = this.enemies.filter((x) => x !== e);
    S.stats.kills++;
    Sfx.enemyDie();
    this.burst(e.x, e.y - 12, '#7a1424', 12, 220);
    this.burst(e.x, e.y - 12, '#e8c4a0', 5, 160);
    const d = ENEMIES[e.type];
    const g = Math.round(randi(d.grass[0], d.grass[1]) * (1 + 0.4 * S.upgrades.greed));
    this.dropGrass(e.x, e.y, g);
    if (chance(0.12)) this.drop(e.x, e.y, 'hay', randi(1, 2));
    if (chance(0.06) && this.player.hp < this.player.maxHp) this.drop(e.x, e.y, 'heart', 1);
  },

  dropGrass(x, y, amount) {
    const pieces = Math.min(6, amount);
    const per = Math.floor(amount / pieces);
    let rem = amount - per * pieces;
    for (let i = 0; i < pieces; i++) { this.drop(x, y, 'grass', per + (rem > 0 ? 1 : 0)); rem--; }
  },

  drop(x, y, kind, value) {
    const a = rand(0, TAU), sp = rand(60, 140);
    this.pickups.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, kind, value, t: 0, seed: rand(0, 10), r: 6 });
  },

  hurtPlayer(src) {
    const p = this.player;
    if (p.invuln > 0 || p.dodgeT > 0 || p.dead || this.over) return;
    p.hp--;
    p.invuln = 1.1;
    Game.shake = 9;
    this.hitstop = 0.08;
    Sfx.hurt();
    this.burst(p.x, p.y - 14, '#f6f0e6', 10, 180);
    if (src) { const a = angTo(src, p); p.vx = Math.cos(a) * 260; p.vy = Math.sin(a) * 260; }
    if (p.hp <= 0) this.die();
  },

  // ------------------------------------------------------------ enemies
  updateEnemy(e, dt) {
    const p = this.player;
    if (e.spawnT > 0) { e.spawnT -= dt; return; }
    e.flash -= dt; e.cd -= dt;
    e.x += e.kbx * dt; e.y += e.kby * dt;
    e.kbx *= Math.max(0, 1 - dt * 9); e.kby *= Math.max(0, 1 - dt * 9);
    const d = dist(e, p), a = angTo(e, p);
    e.moving = false;
    const step = (ang, sp) => { e.x += Math.cos(ang) * sp * dt; e.y += Math.sin(ang) * sp * dt; e.moving = true; };
    if (e.state !== 'charge') e.face = p.x > e.x ? 1 : -1;
    if (p.dead) { e.state = 'move'; return; }

    switch (e.ai) {
      case 'melee':
        if (e.state === 'move') {
          if (d > e.r + p.r + 16) step(a, e.speed);
          if (d < e.r + p.r + 26 && e.cd <= 0) { e.state = 'windup'; e.st = 0.45; e.dir = { x: Math.cos(a), y: Math.sin(a) }; }
        } else if (e.state === 'windup') {
          e.st -= dt;
          if (e.st <= 0) { e.state = 'strike'; e.st = 0.16; }
        } else if (e.state === 'strike') {
          e.st -= dt;
          e.x += e.dir.x * 230 * dt; e.y += e.dir.y * 230 * dt;
          if (d < e.r + p.r + 8) this.hurtPlayer(e);
          if (e.st <= 0) { e.state = 'recover'; e.st = 0.55; e.cd = 0.9; }
        } else if (e.state === 'recover') {
          e.st -= dt; if (e.st <= 0) e.state = 'move';
        }
        break;
      case 'charger':
        if (e.state === 'move') {
          step(a, e.speed);
          if (d < 240 && e.cd <= 0) { e.state = 'windup'; e.st = 0.75; }
        } else if (e.state === 'windup') {
          e.st -= dt;
          if (e.st > 0.3) e.dir = { x: Math.cos(a), y: Math.sin(a) };
          if (e.st <= 0) { e.state = 'charge'; e.st = 0.6; e.face = e.dir.x > 0 ? 1 : -1; }
        } else if (e.state === 'charge') {
          e.st -= dt;
          e.x += e.dir.x * 330 * dt; e.y += e.dir.y * 330 * dt; e.moving = true;
          if (chance(0.5)) this.parts.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.3, max: 0.3, col: 'rgba(140,110,80,.5)', r: 4 });
          if (d < e.r + p.r) this.hurtPlayer(e);
          const hitWall = e.x < this.L + e.r + 1 || e.x > this.R - e.r - 1 || e.y < this.T + e.r + 1 || e.y > this.B - e.r - 1;
          if (e.st <= 0 || hitWall) {
            e.state = 'recover'; e.st = hitWall ? 1.3 : 0.8; e.cd = rand(1.4, 2.4);
            if (hitWall) { Game.shake = Math.max(Game.shake, 4); this.burst(e.x, e.y - 10, '#ccc', 6, 120); }
          }
        } else if (e.state === 'recover') {
          e.st -= dt; if (e.st <= 0) e.state = 'move';
        }
        break;
      case 'ranged':
        if (e.state === 'move') {
          if (d < 120) step(a + Math.PI, e.speed);
          else if (d > 220) step(a, e.speed);
          else step(a + (Math.PI / 2) * e.strafe, e.speed * 0.6);
          if (chance(dt * 0.4)) e.strafe *= -1;
          if (e.cd <= 0 && d < 340) { e.state = 'windup'; e.st = 0.45; }
        } else if (e.state === 'windup') {
          e.st -= dt;
          if (e.st <= 0) {
            const n = e.shots, spread = 0.28;
            for (let i = 0; i < n; i++) {
              const aa = a + (i - (n - 1) / 2) * spread;
              this.shoot(e.x, e.y - 16, aa, 150 + 12 * this.diff, e.type === 'smoker' ? 'smoke' : 'sausage');
            }
            Sfx.shoot();
            e.state = 'move'; e.cd = rand(1.8, 2.8);
          }
        }
        break;
      case 'fly': {
        e.wob += dt * 5;
        const perp = a + Math.PI / 2;
        e.x += (Math.cos(a) * e.speed + Math.cos(perp) * Math.sin(e.wob) * 70) * dt;
        e.y += (Math.sin(a) * e.speed + Math.sin(perp) * Math.sin(e.wob) * 70) * dt;
        e.moving = true;
        if (d < e.r + p.r + 2) { this.hurtPlayer(e); e.kbx = -Math.cos(a) * 220; e.kby = -Math.sin(a) * 220; }
        break;
      }
      default: break;
    }
    // separation
    for (const o of this.enemies) {
      if (o === e || o.spawnT > 0) continue;
      const dx = e.x - o.x, dy = e.y - o.y, dd = Math.hypot(dx, dy), min = e.r + o.r;
      if (dd > 0 && dd < min) { e.x += (dx / dd) * (min - dd) * 0.5; e.y += (dy / dd) * (min - dd) * 0.5; }
    }
    if (e.ai !== 'fly') for (const o of this.obstacles) pushOut(e, o, o.r);
    if (this.captive && !this.captive.freed && e.ai !== 'fly') pushOut(e, this.captive, 10);
    e.x = clamp(e.x, this.L + e.r, this.R - e.r);
    e.y = clamp(e.y, this.T + e.r, this.B - e.r);
  },

  shoot(x, y, ang, speed, kind, r = 6) {
    this.proj.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r, kind, life: 5, enemy: true, seed: rand(0, 10) });
  },

  updateProjectiles(dt) {
    const p = this.player;
    for (const pr of this.proj) {
      pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
      if (pr.life <= 0 || pr.x < this.L - 10 || pr.x > this.R + 10 || pr.y < this.T - 30 || pr.y > this.B + 10) pr.dead = true;
      for (const o of this.obstacles) if (Math.hypot(pr.x - o.x, pr.y - o.y) < o.r) { pr.dead = true; this.burst(pr.x, pr.y, '#888', 3, 60); }
      if (!pr.dead && pr.enemy && Math.hypot(pr.x - p.x, pr.y - (p.y - 10)) < pr.r + p.r - 1 && p.invuln <= 0 && p.dodgeT <= 0) {
        pr.dead = true; this.hurtPlayer(pr);
      }
    }
    this.proj = this.proj.filter((pr) => !pr.dead);
  },

  updatePickups(dt) {
    const p = this.player;
    for (const k of this.pickups) {
      k.t += dt;
      k.x += k.vx * dt; k.y += k.vy * dt;
      k.vx *= Math.max(0, 1 - dt * 5); k.vy *= Math.max(0, 1 - dt * 5);
      k.x = clamp(k.x, this.L + 6, this.R - 6); k.y = clamp(k.y, this.T + 6, this.B - 6);
      if (k.t < 0.35 || p.dead) continue;
      const d = dist(k, p);
      const magnet = this.enemies.length === 0 && !this.boss ? 2000 : 80;
      if (d < magnet) {
        const a = angTo(k, p), sp = Math.max(160, 600 - d);
        k.x += Math.cos(a) * sp * dt; k.y += Math.sin(a) * sp * dt;
      }
      if (d < p.r + 8) {
        k.dead = true;
        if (k.kind === 'grass') { this.loot.grass += k.value; Sfx.coin(); }
        else if (k.kind === 'hay') { this.loot.hay += k.value; Sfx.pickup(); this.texts.push({ x: p.x, y: p.y - 40, text: `+${k.value} hay`, t: 0, col: '#e8c05a', small: true }); }
        else if (k.kind === 'heart') { p.hp = Math.min(p.maxHp, p.hp + 1); Sfx.chime(); this.texts.push({ x: p.x, y: p.y - 40, text: '+1 ❤️', t: 0, col: '#ff6a6a', small: true }); }
      }
    }
    this.pickups = this.pickups.filter((k) => !k.dead);
  },

  burst(x, y, col, n, sp) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(sp * 0.3, sp);
      const life = rand(0.25, 0.6);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life, max: life, col, r: rand(1.5, 3.5), grav: 300 });
    }
  },

  // ------------------------------------------------------------ boss
  updateBoss(dt) {
    const b = this.boss, p = this.player;
    b.flash -= dt;
    if (b.dying > 0) {
      b.dying -= dt / this.slow;
      if (chance(0.5)) this.burst(b.x + rand(-20, 20), b.y - rand(10, 50), pick(['#c8283a', '#f0c35a', '#fff']), 3, 200);
      if (b.dying <= 0) this.bossDefeated();
      return;
    }
    if (b.state === 'intro' || p.dead) return;
    const enraged = b.hp < b.maxHp * 0.5;
    if (enraged && !b.phase2) {
      b.phase2 = true;
      Sfx.roar(); Game.shake = 10;
      this.texts.push({ x: b.x, y: b.y - 80, text: 'ENRAGED!', t: 0, col: '#ff5a3a', big: true });
    }
    const spd = enraged ? 1.3 : 1;
    const d = dist(b, p), a = angTo(b, p);
    b.moving = false;
    b.st -= dt * (b.state === 'idle' ? spd : 1);
    if (b.state !== 'charge') b.face = p.x > b.x ? 1 : -1;

    switch (b.state) {
      case 'idle': {
        const want = d > 140 ? a : d < 90 ? a + Math.PI : a + Math.PI / 2;
        b.x += Math.cos(want) * b.speed * spd * dt; b.y += Math.sin(want) * b.speed * spd * dt; b.moving = true;
        if (b.st <= 0) this.bossNext(b);
        break;
      }
      case 'charge':
        if (b.sub === 'wind') {
          if (b.st > 0.3) b.dir = { x: Math.cos(a), y: Math.sin(a) };
          if (b.st <= 0) { b.sub = 'dash'; b.st = 0.7; b.face = b.dir.x > 0 ? 1 : -1; Sfx.roar(); }
        } else if (b.sub === 'dash') {
          b.x += b.dir.x * 400 * dt; b.y += b.dir.y * 400 * dt; b.moving = true;
          if (chance(0.7)) this.parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.4, max: 0.4, col: 'rgba(140,110,80,.5)', r: 7 });
          const hitWall = b.x <= this.L + b.r + 1 || b.x >= this.R - b.r - 1 || b.y <= this.T + b.r + 1 || b.y >= this.B - b.r - 1;
          if (b.st <= 0 || hitWall) {
            if (hitWall) { Sfx.slam(); Game.shake = 10; this.ring(b, 8 + (enraged ? 4 : 0), 110); }
            b.n--;
            if (b.n > 0) { b.sub = 'wind'; b.st = 0.55; } else { b.sub = 'stun'; b.st = 0.9; }
          }
        } else if (b.st <= 0) this.bossIdle(b);
        break;
      case 'ring':
        if (b.st <= 0) {
          Sfx.slam(); Game.shake = 7;
          this.ring(b, enraged ? 20 : 14, 125, b.n * 0.13);
          this.fx.push({ kind: 'ring', x: b.x, y: b.y - 5, t: 0, dur: 0.4, R: 60, col: 'rgba(255,90,60,.8)' });
          b.n--;
          if (b.n > 0) b.st = 0.45; else this.bossIdle(b);
        }
        break;
      case 'spread':
        if (b.st <= 0) {
          const n = enraged ? 7 : 5;
          for (let i = 0; i < n; i++) this.shoot(b.x, b.y - 30, a + (i - (n - 1) / 2) * 0.22, 170, b.proj, 7);
          Sfx.shoot();
          b.n--;
          if (b.n > 0) b.st = 0.42; else this.bossIdle(b);
        }
        break;
      case 'spiral':
        b.angle += dt * (enraged ? 2.6 : 2);
        b.acc = (b.acc || 0) + dt;
        while (b.acc > 0.11) {
          b.acc -= 0.11;
          const arms = enraged ? 4 : 3;
          for (let i = 0; i < arms; i++) this.shoot(b.x, b.y - 30, b.angle + (i * TAU) / arms, 120, b.proj, 6);
        }
        if (b.st <= 0) this.bossIdle(b);
        break;
      case 'summon':
        if (b.st <= 0) {
          const n = enraged ? 3 : 2;
          for (let i = 0; i < n; i++) {
            const aa = rand(0, TAU);
            const ex = clamp(b.x + Math.cos(aa) * 60, this.L + 20, this.R - 20), ey = clamp(b.y + Math.sin(aa) * 50, this.T + 20, this.B - 20);
            this.enemies.push(this.mkEnemy(b.def.minion, ex, ey, 0.6));
          }
          this.bossIdle(b);
        }
        break;
      case 'hop':
        if (b.sub === 'crouch') {
          if (b.st <= 0) { b.sub = 'air'; b.st = 0.75; b.sx = b.x; b.sy = b.y; Sfx.dodge(); }
        } else if (b.sub === 'air') {
          const k = 1 - b.st / 0.75;
          if (k < 0.6) { b.tx = p.x; b.ty = p.y; }
          b.tx = clamp(b.tx, this.L + b.r, this.R - b.r); b.ty = clamp(b.ty, this.T + b.r, this.B - b.r);
          b.x = lerp(b.sx, b.tx, k); b.y = lerp(b.sy, b.ty, k);
          b.z = Math.sin(k * Math.PI) * 120;
          if (b.st <= 0) {
            b.z = 0; b.x = b.tx; b.y = b.ty;
            Sfx.slam(); Game.shake = 12;
            this.fx.push({ kind: 'ring', x: b.x, y: b.y - 5, t: 0, dur: 0.45, R: 70, col: 'rgba(255,200,120,.85)' });
            if (dist(b, p) < 70) this.hurtPlayer(b);
            this.ring(b, enraged ? 14 : 10, 115);
            b.n--;
            if (b.n > 0) { b.sub = 'crouch'; b.st = 0.35; } else { b.sub = 'land'; b.st = 0.7; }
          }
        } else if (b.st <= 0) { b.tx = null; this.bossIdle(b); }
        break;
      default: break;
    }
    b.x = clamp(b.x, this.L + b.r, this.R - b.r);
    b.y = clamp(b.y, this.T + b.r, this.B - b.r);
    if (b.z < 10 && d < b.r + p.r - 2) this.hurtPlayer(b);
  },

  ring(b, n, speed, off = 0) {
    for (let i = 0; i < n; i++) this.shoot(b.x, b.y - 20, (i / n) * TAU + off, speed, b.proj, 6);
  },

  bossIdle(b) { b.state = 'idle'; b.st = rand(0.9, 1.6); b.sub = null; b.z = 0; },

  bossNext(b) {
    let opts = b.def.patterns.filter((x) => x !== b.last);
    if (this.enemies.length >= 4) opts = opts.filter((x) => x !== 'summon');
    const pat = pick(opts.length ? opts : b.def.patterns);
    b.last = pat; b.state = pat;
    const en = b.phase2;
    switch (pat) {
      case 'charge': b.sub = 'wind'; b.st = 0.8; b.n = en ? 3 : 2; break;
      case 'ring': b.st = 0.65; b.n = en ? 3 : 2; break;
      case 'spread': b.st = 0.5; b.n = en ? 4 : 3; break;
      case 'spiral': b.st = en ? 3.2 : 2.6; b.acc = 0; break;
      case 'summon': b.st = 0.7; break;
      case 'hop': b.sub = 'crouch'; b.st = 0.4; b.n = en ? 3 : 2; break;
      default: this.bossIdle(b);
    }
  },

  damageBoss(dmg, noFervor) {
    const b = this.boss;
    b.hp -= dmg; b.flash = 0.12;
    if (!noFervor) this.player.fervor = Math.min(100, this.player.fervor + 7 + 3 * S.upgrades.fervor);
    this.burst(b.x, b.y - 30, '#c8283a', 7, 170);
    Sfx.hit();
    this.hitstop = Math.max(this.hitstop, 0.04);
    if (b.hp <= 0) {
      b.hp = 0; b.dying = 1.6; b.state = 'dead'; b.z = 0;
      this.slow = 0.35;
      this.enemies.forEach((e) => this.burst(e.x, e.y - 10, '#7a1424', 8, 150));
      this.enemies = []; this.proj = [];
      Sfx.roar(); Game.shake = 16;
    }
  },

  bossDefeated() {
    const b = this.boss;
    this.slow = 1;
    this.boss = null;
    UI.setBoss(null);
    this.burst(b.x, b.y - 30, '#f0c35a', 30, 300);
    this.dropGrass(b.x, b.y, 40 + 10 * this.diff);
    this.drop(b.x, b.y, 'hay', 3);
    this.drop(b.x, b.y, 'heart', 1);
    const first = this.realmIdx < 4 ? !S.bosses[this.realmIdx] : !S.finalDefeated;
    const lines = b.def.outro.slice();
    if (this.realmIdx < 4 && first) {
      S.bosses[this.realmIdx] = true;
      S.devotion += 50;
      lines.push(['', `${b.def.name} has been defeated! +50 ✨ devotion.`]);
      if (b.def.unlock) {
        const r = RITUALS.find((x) => x.id === b.def.unlock);
        lines.push(['', `New ritual learned: ${r.icon} ${r.name}. Perform it at the Temple.`]);
      }
    }
    if (this.realmIdx === 4) S.finalDefeated = true;
    saveGame();
    UI.dialog(lines, () => { this.clearRoom(true); });
  },

  // ------------------------------------------------------------ flow
  clearRoom(silentHeal) {
    if (this.doorOpen) return;
    this.doorOpen = true;
    this.cleared = true;
    Sfx.door();
    if (S.upgrades.udder && this.player.hp < this.player.maxHp) {
      this.player.hp++;
      this.texts.push({ x: this.player.x, y: this.player.y - 40, text: '🥛 Holy Udder +1 ❤️', t: 0, col: '#fff', small: true });
    }
    if (!silentHeal && this.type === 'fight') this.dropGrass(this.W / 2, (this.T + this.B) / 2, randi(3, 6));
  },

  indoctrinate() {
    const c = this.captive;
    c.freed = true;
    const f = c.f;
    const sayings = [
      'You... you\'re a COW. With a CROWN. ...Yeah, okay. I\'m in.',
      'They were going to make me into a sandwich. A SANDWICH. I\'ll follow you anywhere.',
      'Is this a cult? Do you have snacks? Say no more.',
      'I had a dream about a cow with a bell. I thought it was a nightmare. I was WRONG.',
      'Free me and I swear to worship you. Moderately. Okay, intensely.',
    ];
    const line = f.species === 'lamb' ? 'Oh no. Not another one of these. ...Fine. Do you at least have a nice shrine?' : pick(sayings);
    UI.dialog([[f.name, line], ['', `${f.name} the ${SPECIES[f.species].label} has joined your cult! They head for the pasture.`]], () => {
      S.followers.push(f);
      S.stats.rescued++;
      this.loot.followers.push(f.name);
      Sfx.levelUp();
      this.burst(c.x, c.y - 20, '#f0c35a', 20, 200);
      saveGame();
    });
  },

  nextRoom() {
    this.transitioning = true;
    Sfx.select();
    this.roomIdx++;
    if (this.roomIdx >= this.rooms.length) { this.finishRun(true); return; }
    UI.fade(() => this.buildRoom());
  },

  die() {
    const p = this.player;
    p.dead = true;
    this.over = true;
    this.slow = 0.4;
    S.stats.deaths++;
    Sfx.sad();
    setTimeout(() => {
      if (Game.scene !== this) return;
      this.slow = 1;
      UI.dialog([
        ['The One Who Grills', pick([
          'Tsk. Not yet, little calf. You are far too... undercooked to die.',
          'Rise. I did not wait all these centuries for you to perish to a man with a PITCHFORK.',
          'Death? No no no. You don\'t get off the menu that easily.',
        ])],
        ['', 'You awaken back at your cult, lighter in the pockets.'],
      ], () => this.finishRun(false));
    }, 1500);
  },

  finishRun(won) {
    this.over = true;
    const g = won ? this.loot.grass : Math.floor(this.loot.grass / 2);
    S.grass += g;
    S.hay += this.loot.hay;
    const firstBoss = won && this.type === 'boss';
    const realmIdx = this.realmIdx;
    saveGame();
    const summary = () => {
      const fl = this.loot.followers.length ? this.loot.followers.map(esc).join(', ') : 'none';
      UI.menu({
        title: won ? '⚔️ Crusade Complete' : '💀 Crusade Failed',
        html: `<div class="statgrid"><span>🌿 Grass</span><b>+${g}${won ? '' : ` (lost ${this.loot.grass - g})`}</b><span>🌾 Hay</span><b>+${this.loot.hay}</b><span>🐾 Rescued</span><b>${fl}</b></div>`,
        options: [{ icon: '🏠', label: 'Return to the pasture', cls: 'primary', action: () => UI.closeMenu() }],
      });
    };
    UI.fade(() => {
      if (firstBoss && realmIdx === 4) Game.setScene(VoidScene, { mode: 'ending' });
      else if (firstBoss) Game.setScene(VoidScene, { mode: 'chain', realm: realmIdx, after: summary });
      else Game.setScene(Base, { after: summary });
    });
  },

  // ------------------------------------------------------------ rendering
  buildFloor() {
    const key = `${this.realmIdx}:${this.roomIdx}:${this.W}x${this.H}@${Game.px}:${S.runs}`;
    if (this.floorKey === key) return;
    this.floorKey = key;
    const R = this.realm;
    this.floor = Game.makeLayer(this.W, this.H, (c) => {
      const W = this.W, H = this.H, rng = seeded(S.runs * 31 + this.roomIdx * 7 + this.realmIdx);
      c.fillStyle = R.wall; c.fillRect(0, 0, W, H);
      c.fillStyle = R.floor; c.fillRect(this.L, this.T, this.R - this.L, this.B - this.T);
      const ts = 40;
      for (let y = this.T; y < this.B; y += ts) {
        for (let x = this.L; x < this.R; x += ts) {
          if (((x / ts + y / ts) | 0) % 2) { c.fillStyle = R.floor2; c.fillRect(x, y, Math.min(ts, this.R - x), Math.min(ts, this.B - y)); }
        }
      }
      for (let i = 0; i < 30; i++) {
        const x = this.L + rng() * (this.R - this.L), y = this.T + rng() * (this.B - this.T);
        if (R.decor === 'mud') ell(c, x, y, 10 + rng() * 26, 5 + rng() * 12, 'rgba(40,25,10,.35)');
        else if (R.decor === 'puddle') ell(c, x, y, 8 + rng() * 22, 4 + rng() * 10, 'rgba(60,110,70,.3)');
        else if (R.decor === 'soot') ell(c, x, y, 8 + rng() * 22, 4 + rng() * 10, 'rgba(0,0,0,.28)');
        else { ell(c, x, y, 6 + rng() * 14, 3 + rng() * 6, 'rgba(0,0,0,.25)'); if (rng() < 0.4) circ(c, x, y, 1.5, 'rgba(255,120,40,.6)'); }
      }
      for (let i = 0; i < 60; i++) {
        const x = this.L + rng() * (this.R - this.L), y = this.T + rng() * (this.B - this.T);
        line(c, x, y, x + rng() * 4 - 2, y - 3 - rng() * 4, 'rgba(0,0,0,.18)', 1.3);
      }
      // a few ominous stains
      for (let i = 0; i < 4; i++) ell(c, this.L + rng() * (this.R - this.L), this.T + rng() * (this.B - this.T), 6 + rng() * 10, 3 + rng() * 5, 'rgba(120,20,30,.25)');
      // walls: brick top band
      c.fillStyle = R.wallTop; c.fillRect(0, this.T - 46, W, 46);
      for (let y = this.T - 46; y < this.T; y += 11) {
        const off = ((y / 11) | 0) % 2 ? 0 : 14;
        for (let x = -off; x < W; x += 28) rrect(c, x + 1, y + 1, 26, 9, 2, null, 'rgba(0,0,0,.35)', 1);
      }
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(this.L, this.T, this.R - this.L, 8);
      // edge shading
      const sh = 'rgba(0,0,0,.4)';
      c.fillStyle = sh; c.fillRect(this.L, this.T, 6, this.B - this.T); c.fillRect(this.R - 6, this.T, 6, this.B - this.T);
      // torches on top wall
      for (const tx of [W * 0.2, W * 0.8]) { rrect(c, tx - 3, this.T - 30, 6, 14, 1, '#4a3020', INK, 1); }
      // banners with the Butcher sigil
      for (const bx of [W * 0.35, W * 0.65]) {
        rrect(c, bx - 9, this.T - 44, 18, 34, 1, '#5a1424', INK, 1.2);
        poly(c, [bx - 9, this.T - 10, bx, this.T - 4, bx + 9, this.T - 10], '#5a1424');
        // crossed cleavers
        line(c, bx - 5, this.T - 36, bx + 5, this.T - 22, '#c4cad2', 2); line(c, bx + 5, this.T - 36, bx - 5, this.T - 22, '#c4cad2', 2);
      }
    });
  },

  draw(c) {
    const t = this.t;
    this.buildFloor();
    c.drawImage(this.floor, 0, 0, this.W, this.H);
    // torches
    for (const tx of [this.W * 0.2, this.W * 0.8]) {
      const f = Math.sin(t * 14 + tx) * 1.2;
      glow(c, tx, this.T - 34, 40, 'rgba(255,150,60,.35)');
      ell(c, tx + f * 0.4, this.T - 36, 3.5, 6 + f, '#ffb02e'); ell(c, tx, this.T - 34, 1.8, 3, '#fff2b0');
    }
    this.drawDoor(c, t);

    // telegraphs (under actors)
    for (const e of this.enemies) {
      if (e.spawnT > 0) {
        const k = 1 - e.spawnT / 0.8;
        c.save(); c.globalAlpha = 0.7;
        drawSigil(c, e.x, e.y, 14 + k * 8, '#c8283a', 2);
        c.restore();
      }
      if (e.ai === 'charger' && e.state === 'windup') {
        c.save(); c.globalAlpha = 0.25 + 0.25 * Math.sin(t * 30);
        c.strokeStyle = '#ff3040'; c.lineWidth = e.r * 2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + e.dir.x * 200, e.y + e.dir.y * 200); c.stroke();
        c.restore();
      }
    }
    const b = this.boss;
    if (b) {
      if (b.state === 'charge' && b.sub === 'wind') {
        c.save(); c.globalAlpha = 0.25 + 0.2 * Math.sin(t * 30);
        c.strokeStyle = '#ff3040'; c.lineWidth = b.r * 2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x + b.dir.x * 500, b.y + b.dir.y * 500); c.stroke();
        c.restore();
      }
      if (b.state === 'hop' && b.sub === 'air' && b.tx != null) {
        c.save(); c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 25);
        ell(c, b.tx, b.ty, 70, 36, 'rgba(255,48,64,.18)', '#ff3040', 2);
        c.restore();
      }
      if ((b.state === 'ring' || b.state === 'summon') && b.st < 0.6) {
        c.save(); c.globalAlpha = 0.6;
        drawSigil(c, b.x, b.y, 40 + Math.sin(t * 20) * 4, '#ff3040', 2);
        c.restore();
      }
    }

    for (const k of this.pickups) drawPickup(c, k, t);

    // y-sorted actors
    const items = [];
    for (const o of this.obstacles) items.push({ y: o.y, d: () => drawObstacle(c, this.realm.obstacle, o.x, o.y, o.r, t) });
    for (const e of this.enemies) items.push({ y: e.y, d: () => drawEnemy(c, e, t) });
    if (this.captive && !this.captive.freed) {
      const cp = this.captive;
      items.push({ y: cp.y, d: () => { drawPost(c, cp.x - 6, cp.y - 2, t); drawFollower(c, cp.f.species, cp.x + 4, cp.y + 2, -1, t, { praying: true }); } });
    }
    if (b) {
      items.push({
        y: b.y, d: () => {
          if (b.z > 0) shadow(c, b.x, b.y, 22 * (1 - b.z / 240), 7);
          c.save();
          if (b.dying > 0) { c.globalAlpha = Math.max(0.15, b.dying / 1.6); c.translate(rand(-2, 2), 0); }
          drawBoss(c, b.key, b.x, b.y - b.z, b.face, t, { flash: b.flash > 0, moving: b.moving, windup: (b.state === 'charge' && b.sub === 'wind') || ((b.state === 'ring' || b.state === 'summon') && b.st < 0.6), noShadow: b.z > 0 });
          c.restore();
        },
      });
    }
    const p = this.player;
    items.push({ y: p.y, d: () => this.drawPlayer(c, t) });
    items.sort((a, z) => a.y - z.y);
    for (const it of items) it.d();

    for (const pr of this.proj) drawProjectile(c, pr, t);

    for (const pt of this.parts) {
      const a = pt.life / pt.max;
      if (pt.ghost) { drawCow(c, pt.x, pt.y + 10, pt.fx, t, { alpha: a * 0.4, noShadow: true }); continue; }
      c.save(); c.globalAlpha = a; circ(c, pt.x, pt.y, pt.r, pt.col); c.restore();
    }
    for (const f of this.fx) this.drawFx(c, f);

    for (const tx of this.texts) {
      c.save(); c.globalAlpha = 1 - tx.t;
      c.font = `bold ${tx.big ? 22 : tx.small ? 12 : 16}px "Trebuchet MS", sans-serif`; c.textAlign = 'center';
      c.lineWidth = 3; c.strokeStyle = INK; c.strokeText(tx.text, tx.x, tx.y);
      c.fillStyle = tx.col; c.fillText(tx.text, tx.x, tx.y);
      c.restore();
    }

    // low HP vignette
    if (p.hp === 1 && !p.dead) {
      const g = c.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * 0.35, this.W / 2, this.H / 2, Math.max(this.W, this.H) * 0.7);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(160,10,30,${0.35 + 0.15 * Math.sin(t * 5)})`);
      c.fillStyle = g; c.fillRect(0, 0, this.W, this.H);
    }

    // banner
    if (this.banner && this.banner.title && this.banner.t < 3) {
      const bt = this.banner.t;
      const a = bt < 0.4 ? bt / 0.4 : bt > 2.4 ? (3 - bt) / 0.6 : 1;
      c.save(); c.globalAlpha = clamp(a, 0, 1); c.textAlign = 'center';
      const y = this.H * 0.4;
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(0, y - 34, this.W, this.banner.sub ? 62 : 46);
      c.font = 'bold 28px Georgia, serif'; c.fillStyle = '#f6ead7';
      c.lineWidth = 4; c.strokeStyle = INK; c.strokeText(this.banner.title.toUpperCase(), this.W / 2, y);
      c.fillText(this.banner.title.toUpperCase(), this.W / 2, y);
      if (this.banner.sub) { c.font = 'italic 14px Georgia, serif'; c.fillStyle = '#f0c35a'; c.fillText(this.banner.sub, this.W / 2, y + 20); }
      c.restore();
    }
    // room pips
    c.save(); c.textAlign = 'center';
    const n = this.rooms.length;
    for (let i = 0; i < n; i++) {
      const x = this.W / 2 + (i - (n - 1) / 2) * 16, y = this.T + 14;
      const isBoss = this.rooms[i] === 'boss', isRescue = this.rooms[i] === 'rescue';
      circ(c, x, y, 5, i < this.roomIdx ? '#f0c35a' : i === this.roomIdx ? '#fff' : 'rgba(255,255,255,.2)', INK, 1.4);
      if (isBoss) { c.font = '9px sans-serif'; c.fillText('💀', x, y + 16); }
      if (isRescue) { c.font = '9px sans-serif'; c.fillText('🐾', x, y + 16); }
    }
    c.restore();
  },

  drawPlayer(c, t) {
    const p = this.player;
    if (p.dead) {
      drawCow(c, p.x, p.y, p.fx, t, { dead: true, kneel: true });
      return;
    }
    drawCow(c, p.x, p.y, p.fx, t, { moving: p.moving || p.dodgeT > 0, flash: p.invuln > 0 && p.dodgeT <= 0 });
    // swinging bell
    if (p.atkT > 0) {
      const k = 1 - p.atkT / p.atkDur;
      const fa = Math.atan2(p.face.y, p.face.x);
      const sweep = p.combo === 1 ? -1 : 1;
      const ang = fa + sweep * lerp(-1.2, 1.2, Math.min(1, k * 1.8));
      const rr = p.combo === 2 ? 40 : 32;
      const bx = p.x + Math.cos(ang) * rr, by = p.y - 12 + Math.sin(ang) * rr;
      line(c, p.x, p.y - 14, bx, by, '#7a5130', 3);
      c.save(); c.translate(bx, by); c.rotate(ang + Math.PI / 2);
      poly(c, [-6, -5, 6, -5, 8, 8, -8, 8], '#f0c35a', INK, 1.6);
      circ(c, 0, 9, 2.2, '#a8741e');
      c.restore();
    }
  },

  drawFx(c, f) {
    const p = this.player;
    const k = f.t / f.dur;
    if (f.kind === 'slash') {
      const R = f.big ? 54 : 44;
      c.save(); c.globalAlpha = 1 - k;
      c.translate(p.x, p.y - 12);
      const sweep = f.flip ? -1 : 1;
      const arc = f.big ? 1.5 : 1.15;
      c.beginPath();
      c.arc(0, 0, R, f.ang - arc * sweep, f.ang - arc * sweep + sweep * 2 * arc * Math.min(1, k * 2.2), sweep < 0);
      c.strokeStyle = f.big ? '#f0c35a' : '#fff'; c.lineWidth = f.big ? 8 : 5; c.lineCap = 'round'; c.stroke();
      c.restore();
    } else if (f.kind === 'ring') {
      c.save(); c.globalAlpha = 1 - k;
      c.beginPath(); c.ellipse(f.x, f.y, f.R * (0.2 + k), f.R * (0.2 + k) * 0.6, 0, 0, TAU);
      c.strokeStyle = f.col || '#f6ead7'; c.lineWidth = 6 * (1 - k) + 1; c.stroke();
      c.restore();
    }
  },

  drawDoor(c, t) {
    const d = this.door;
    const x = d.x, y = this.T, w = d.w;
    c.save();
    c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x - w / 2, y - 30); c.arc(x, y - 30, w / 2, Math.PI, 0); c.lineTo(x + w / 2, y); c.closePath();
    if (this.doorOpen) {
      const g = c.createLinearGradient(0, y - 54, 0, y);
      g.addColorStop(0, '#000'); g.addColorStop(1, '#3a0a14');
      c.fillStyle = g; c.fill();
      c.strokeStyle = '#f0c35a'; c.lineWidth = 3; c.stroke();
      glow(c, x, y - 10, 40, 'rgba(240,195,90,.35)', 0.6 + 0.3 * Math.sin(t * 4));
      c.font = '14px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#f0c35a';
      c.fillText(this.roomIdx >= this.rooms.length - 1 ? '🏠' : '▲', x, y - 22 + Math.sin(t * 5) * 3);
    } else {
      c.fillStyle = '#120608'; c.fill();
      c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
      for (let i = -2; i <= 2; i++) line(c, x + i * 9, y - 2, x + i * 9, y - 50 + Math.abs(i) * 4, '#5a1424', 3);
    }
    c.restore();
  },
};
