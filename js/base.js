'use strict';
// The Cult: wander the pasture, tend followers, preach, perform rituals.

const TIPS = [
  'Followers worship at the Shrine all on their own. Walk up to it to collect the Devotion they make.',
  'Spend Devotion at the Shrine on Blessings. A cow with a Heavier Bell is a cow with fewer problems.',
  'Hungry followers eat from the Trough. Fill it with hay before you go crusading, or come back to grumbling.',
  'The hay field regrows every day. Harvest it. Hay doesn\'t grow on... well, it does grow on fields. That\'s the point.',
  'Preach once a day at the Temple. Nothing says "spiritual leader" like a really long moo.',
  'Clean up the, uh, "offerings" your followers leave around. Faith drops when the pasture stinks.',
  'Each Bishop you slay unlocks a new Ritual at the Temple. Rituals cost grass but they are SO worth it.',
  'You need a certain number of followers before the deeper realms will open for you. Every crusade finds you a new lost soul.',
  'In a crusade, tap the bell to swing. Your swing can smack enemy projectiles right out of the air!',
  'Hit heretics to fill your Holy Moo. When it glows, unleash it. Butchers HATE this one weird trick.',
  'If a follower\'s faith hits zero they start doubting. Inspire them before they wander off to a petting zoo.',
];

const Base = {
  name: 'base',
  controls: 'base',
  t: 0,
  ents: new Map(),
  player: { x: 200, y: 600, r: 10, face: 1, moving: false },
  near: null,
  bg: null,
  bgKey: '',
  trees: [],
  bubbles: [],
  sparkles: [],

  enter(params = {}) {
    this.layout();
    this.player.x = this.P.gate.x;
    this.player.y = Math.min(this.H - 10, this.P.gate.y + 18);
    this.player.face = 1;
    this.ents.clear();
    this.syncEnts();
    this.sparkles = [];
    this.bubbles = [];
    if (params.after) setTimeout(params.after, 450);
  },

  exit() { UI.setAction(null); },

  onResize() {
    const oldW = this.W, oldH = this.H;
    this.layout();
    if (oldW) {
      const sx = this.W / oldW, sy = this.H / oldH;
      this.player.x *= sx; this.player.y *= sy;
      for (const e of this.ents.values()) { e.x *= sx; e.y *= sy; e.tx *= sx; e.ty *= sy; }
    }
  },

  layout() {
    const W = Game.W, H = Game.H;
    this.W = W; this.H = H;
    this.top = 92;
    if (W > H * 1.15) {
      this.P = {
        temple: { x: W * 0.17, y: H * 0.50 },
        stall: { x: W * 0.84, y: H * 0.44 },
        shrine: { x: W * 0.5, y: H * 0.47 },
        field: { x: W * 0.3, y: H * 0.80 },
        trough: { x: W * 0.68, y: H * 0.80 },
        gate: { x: W * 0.5, y: H * 0.97 },
      };
    } else {
      this.P = {
        temple: { x: W * 0.25, y: this.top + H * 0.15 },
        stall: { x: W * 0.78, y: this.top + H * 0.12 },
        shrine: { x: W * 0.5, y: H * 0.45 },
        field: { x: W * 0.26, y: H * 0.64 },
        trough: { x: W * 0.76, y: H * 0.62 },
        gate: { x: W * 0.5, y: H * 0.85 },
      };
    }
    this.fieldW = 112; this.fieldH = 62;
    this.colliders = [
      { x: this.P.temple.x, y: this.P.temple.y - 14, r: 38 },
      { x: this.P.shrine.x, y: this.P.shrine.y - 8, r: 24 },
      { x: this.P.stall.x, y: this.P.stall.y - 8, r: 27 },
      { x: this.P.trough.x, y: this.P.trough.y - 10, r: 20 },
      { x: this.P.gate.x - 25, y: this.P.gate.y - 4, r: 7 },
      { x: this.P.gate.x + 25, y: this.P.gate.y - 4, r: 7 },
    ];
    // decorative trees around the border
    const rng = seeded(1337 + Math.round(W) * 7 + Math.round(H));
    this.trees = [];
    const tryTree = (x, y) => {
      for (const k in this.P) if (Math.hypot(this.P[k].x - x, this.P[k].y - y) < 70) return;
      for (const t of this.trees) if (Math.hypot(t.x - x, t.y - y) < 34) return;
      this.trees.push({ x, y, s: 0.8 + rng() * 0.5, col: pick(['#2e4a2e', '#3a4a2a', '#2a3e34', '#41522e']) });
    };
    for (let i = 0; i < 80; i++) {
      const side = Math.floor(rng() * 4);
      let x, y;
      if (side === 0) { x = rng() * W; y = this.top - 10 + rng() * 30; }
      else if (side === 1) { x = rng() * W; y = H - rng() * 18; }
      else if (side === 2) { x = rng() * 26; y = this.top + rng() * (H - this.top); }
      else { x = W - rng() * 26; y = this.top + rng() * (H - this.top); }
      tryTree(x, y);
    }
    for (const t of this.trees) this.colliders.push({ x: t.x, y: t.y - 4, r: 11 * t.s });
    this.bgKey = '';
  },

  syncEnts() {
    const ids = new Set(S.followers.map((f) => f.id));
    for (const id of [...this.ents.keys()]) if (!ids.has(id)) this.ents.delete(id);
    for (const f of S.followers) {
      if (!this.ents.has(f.id)) {
        const a = rand(0, TAU), d = rand(50, 110);
        const e = {
          id: f.id, r: 8,
          x: clamp(this.P.shrine.x + Math.cos(a) * d, 30, this.W - 30),
          y: clamp(this.P.shrine.y + 20 + Math.sin(a) * d * 0.6, this.top + 20, this.H - 30),
          tx: 0, ty: 0, state: 'idle', goal: null, timer: rand(0.5, 2.5), face: chance(0.5) ? 1 : -1, moving: false, seed: rand(0, 10),
        };
        e.tx = e.x; e.ty = e.y;
        this.ents.set(f.id, e);
      }
    }
  },

  // ------------------------------------------------------------ simulation (runs during crusades too)
  simulate(dt) {
    S.time += dt;
    if (S.time >= DAY_LEN) {
      S.time -= DAY_LEN;
      S.day++;
      UI.toast(`☀️ Day ${S.day} dawns on the cult.`, 'good');
      saveGame();
    }
    S.fieldGrowth = Math.min(1, S.fieldGrowth + dt / (DAY_LEN * 0.7));
    const cap = 40 + 20 * S.followers.length;
    const leaving = [];
    for (const f of S.followers) {
      f.hunger = Math.max(0, f.hunger - dt * 100 / (DAY_LEN * 1.15));
      const decay = 0.03 + (f.hunger < 20 ? 0.18 : 0) + S.pies.length * 0.008;
      f.faith = clamp(f.faith - decay * dt, 0, 100);
      if (f.faith >= 15) S.shrineDevotion = Math.min(cap, S.shrineDevotion + (0.035 + 0.02 * f.level) * (0.5 + f.faith / 100) * dt);
      f.poopT -= dt;
      if (f.poopT <= 0) {
        f.poopT = rand(70, 150);
        if (S.pies.length < 14) {
          const e = this.ents.get(f.id);
          const px = e && Game.scene === Base ? e.x / this.W : rand(0.12, 0.88);
          const py = e && Game.scene === Base ? e.y / this.H : rand(0.25, 0.8);
          S.pies.push({ x: px, y: py, id: Math.random() });
        }
      }
      if (f.faith <= 0) { f.dissent += dt; if (f.dissent > 100) leaving.push([f, 'faith']); }
      else if (f.faith > 15) f.dissent = 0;
      if (f.hunger <= 0) { f.starve += dt; if (f.starve > DAY_LEN * 0.6) leaving.push([f, 'food']); }
      else f.starve = 0;
    }
    for (const [f, why] of leaving) {
      S.followers = S.followers.filter((x) => x !== f);
      S.stats.departed++;
      Sfx.sad();
      UI.toast(why === 'faith'
        ? `💔 ${f.name} lost faith and left to join a petting zoo.`
        : `💔 ${f.name} wandered off to a cult that had snacks.`, 'bad', 4000);
      if (Game.scene === Base) this.syncEnts();
    }
  },

  // ------------------------------------------------------------ frame update
  tutorial() {
    UI.dialog([
      ['Ratcliff', 'Oi! A cow! With a CROWN! ...You\'re one of HIS, aren\'t you. Figures.'],
      ['Ratcliff', 'Name\'s Ratcliff. I sell hay. Welcome to your new cult. It\'s a fixer-upper.'],
      ['Ratcliff', 'Quick rundown: followers pray at the Shrine and make Devotion. Walk over and soak it up, then spend it on Blessings.'],
      ['Ratcliff', 'Preach at the Temple once a day. Keep the Trough full of hay. And for the love of cheese, clean up after your flock.'],
      ['Ratcliff', 'When you\'re ready, step through the Red Gate down south to go crusading. Bonk heretics, find lost souls, bring \'em home.'],
      ['Clucksworth', 'Hi! I\'m Clucksworth! I was told there would be free grain. Is this the free grain place? I\'m in. I\'m SO in.'],
    ]);
    S.tutorialDone = true;
  },

  update(dt, passive) {
    this.t += dt;
    const p = this.player;
    const m = passive ? { x: 0, y: 0, mag: 0 } : Input.move;
    const sp = 125;
    p.moving = m.mag > 0;
    if (p.moving) {
      p.x += m.x * sp * dt; p.y += m.y * sp * dt;
      if (Math.abs(m.x) > 0.1) p.face = m.x > 0 ? 1 : -1;
    }
    for (const c of this.colliders) pushOut(p, c, c.r);
    p.x = clamp(p.x, 16, this.W - 16);
    p.y = clamp(p.y, this.top - 4, this.H - 8);

    this.syncEnts();
    for (const f of S.followers) this.updateFollower(f, this.ents.get(f.id), dt);

    // collect devotion just by walking near the shrine
    if (S.shrineDevotion >= 1 && dist(p, this.P.shrine) < 58) this.collectDevotion();

    for (const s of this.sparkles) { s.t += dt; s.x = lerp(s.x, p.x, dt * 4); s.y = lerp(s.y, p.y - 20, dt * 4); }
    this.sparkles = this.sparkles.filter((s) => s.t < 0.7);
    for (const b of this.bubbles) b.t += dt;
    this.bubbles = this.bubbles.filter((b) => b.t < b.life);

    if (passive) { UI.setAction(null); return; }
    this.near = this.findNear();
    UI.setAction(this.near ? this.near.label : null);
    if (this.near && (Input.take('interact') || Input.take('attack'))) {
      Sfx.select();
      this.near.act();
    }
  },

  updateFollower(f, e, dt) {
    if (!e) return;
    e.timer -= dt;
    if (e.state === 'walk') {
      const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy);
      const sp = e.goal === 'sermon' ? 70 : 34;
      if (d < 3) {
        e.state = 'idle'; e.moving = false; e.timer = rand(2, 5);
        if (e.goal === 'pray' || e.goal === 'sermon') { e.state = 'pray'; e.timer = e.goal === 'sermon' ? 999 : rand(4, 8); e.face = this.P.shrine.x > e.x ? 1 : -1; if (e.goal === 'sermon') e.face = this.P.temple.x > e.x ? 1 : -1; }
        if (e.goal === 'eat') {
          if (S.troughFood > 0 && f.hunger < 70) {
            S.troughFood--; f.hunger = 100; f.faith = Math.min(100, f.faith + 4);
            this.say(e, '*munch munch*');
          } else this.say(e, 'Empty trough...');
        }
      } else {
        e.x += (dx / d) * sp * dt; e.y += (dy / d) * sp * dt;
        e.moving = true;
        if (Math.abs(dx) > 1) e.face = dx > 0 ? 1 : -1;
        if (e.timer < -12) { e.state = 'idle'; e.timer = 1; e.moving = false; } // stuck safety
      }
    } else if (e.timer <= 0 && e.goal !== 'sermon') {
      this.decide(f, e);
    }
    // gentle separation from other followers and the player
    for (const o of this.ents.values()) {
      if (o === e) continue;
      const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < 14) { e.x += (dx / d) * (14 - d) * 0.5; e.y += (dy / d) * (14 - d) * 0.5; }
    }
    for (const c of this.colliders) pushOut(e, c, c.r);
    e.x = clamp(e.x, 24, this.W - 24);
    e.y = clamp(e.y, this.top + 8, this.H - 12);
    if (chance(dt * 0.012) && e.state !== 'walk') this.say(e, this.thought(f));
  },

  decide(f, e) {
    let tx, ty;
    if (f.hunger < 50 && S.troughFood > 0) {
      e.goal = 'eat'; tx = this.P.trough.x + rand(-18, 18); ty = this.P.trough.y + rand(8, 16);
    } else if (chance(0.4)) {
      e.goal = 'pray';
      const a = rand(0.15, Math.PI - 0.15);
      tx = this.P.shrine.x + Math.cos(a) * rand(46, 70); ty = this.P.shrine.y + Math.sin(a) * rand(22, 44);
    } else {
      e.goal = 'wander';
      tx = rand(40, this.W - 40); ty = rand(this.top + 30, this.H - 40);
    }
    e.tx = clamp(tx, 24, this.W - 24); e.ty = clamp(ty, this.top + 8, this.H - 12);
    e.state = 'walk'; e.timer = 0;
  },

  say(e, text, life = 3.2) {
    this.bubbles = this.bubbles.filter((b) => b.e !== e);
    this.bubbles.push({ e, text, t: 0, life });
  },

  thought(f) {
    if (f.species === 'lamb' && chance(0.6)) return pick(THOUGHTS.lamb);
    if (f.hunger < 30) return pick(THOUGHTS.hungry);
    if (f.faith < 30) return pick(THOUGHTS.doubt);
    if (S.pies.length > 4 && chance(0.5)) return pick(THOUGHTS.poop);
    return pick(THOUGHTS.happy);
  },

  collectDevotion() {
    const n = Math.floor(S.shrineDevotion);
    if (n < 1) return;
    S.devotion += n;
    S.shrineDevotion -= n;
    Sfx.chime();
    UI.toast(`✨ +${n} Devotion collected`, 'good', 1600);
    for (let i = 0; i < Math.min(14, n + 3); i++) {
      this.sparkles.push({ x: this.P.shrine.x + rand(-14, 14), y: this.P.shrine.y - 56 + rand(-10, 10), t: rand(-0.3, 0) });
    }
  },

  findNear() {
    const p = this.player;
    const list = [];
    const add = (x, y, range, label, act, prio = 0) => {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < range) list.push({ x, y, d: d - prio, label, act });
    };
    for (const pie of S.pies) {
      add(pie.x * this.W, pie.y * this.H, 26, '🧹 Clean', () => this.cleanPie(pie), 6);
    }
    for (const f of S.followers) {
      const e = this.ents.get(f.id);
      if (e) add(e.x, e.y, 30, `💬 ${f.name}`, () => this.openFollower(f), 4);
    }
    add(this.P.shrine.x, this.P.shrine.y, 54, '⛩️ Shrine', () => this.openShrine());
    add(this.P.temple.x, this.P.temple.y + 6, 56, '⛪ Temple', () => this.openTemple());
    add(this.P.trough.x, this.P.trough.y, 44, '🌾 Trough', () => this.openTrough());
    add(this.P.field.x, this.P.field.y, 62, S.fieldGrowth >= 1 ? '🌾 Harvest' : '🌱 Field', () => this.harvest());
    add(this.P.stall.x, this.P.stall.y + 6, 50, '🐀 Trade', () => this.openStall());
    add(this.P.gate.x, this.P.gate.y - 16, 46, '⚔️ Crusade', () => this.openCrusade());
    list.sort((a, b) => a.d - b.d);
    return list[0] || null;
  },

  // ------------------------------------------------------------ interactions
  cleanPie(pie) {
    S.pies = S.pies.filter((x) => x !== pie);
    Sfx.pickup();
    const lines = ['Cleaned. The pasture is holy once more.', 'You cleaned up a holy offering. Gross.', 'A leader leads by example. And by scooping.'];
    UI.toast(`🧹 ${pick(lines)}`, '', 1700);
  },

  harvest() {
    if (S.fieldGrowth >= 1) {
      const n = 2 + Math.ceil(S.followers.length * 0.6);
      S.hay += n;
      S.fieldGrowth = 0;
      Sfx.pickup();
      UI.toast(`🌾 Harvested ${n} hay!`, 'good');
    } else {
      UI.toast(`🌱 The hay is ${Math.floor(S.fieldGrowth * 100)}% grown. Patience, prophet.`, '', 1800);
    }
  },

  openFollower(f) {
    const e = this.ents.get(f.id);
    const th = this.thought(f);
    if (e) this.say(e, th, 4);
    const bar = (v, col) => `<div class="bar"><i style="width:${v.toFixed(0)}%;background:${col}"></i></div>`;
    const lvlCost = 15 * f.level;
    const status = f.faith <= 0 ? '<p style="color:#ff6a6a">⚠️ Dissenting! Inspire them before they leave.</p>'
      : f.hunger <= 0 ? '<p style="color:#ff6a6a">⚠️ Starving! Feed them before they leave.</p>' : '';
    UI.menu({
      title: f.name,
      html: `<p>${SPECIES[f.species].label} · Level ${f.level} devotee · joined day ${f.joinedDay}</p>
        <div class="statgrid"><span>🙏 Faith</span>${bar(f.faith, 'linear-gradient(90deg,#c8283a,#f0c35a)')}
        <span>🍽️ Fullness</span>${bar(f.hunger, '#6cc24a')}</div>
        ${status}<p class="quote">"${esc(th)}"</p>`,
      options: [
        {
          icon: '🐮', label: 'Inspire', sub: f.inspiredDay === S.day ? 'Already inspired today.' : '+15 faith, +3 devotion. Once per day.',
          disabled: f.inspiredDay === S.day,
          action: () => {
            f.inspiredDay = S.day; f.faith = Math.min(100, f.faith + 15); f.dissent = 0; S.devotion += 3;
            Sfx.moo(1.05); UI.closeMenu();
            if (e) this.say(e, pick(['Praise the Udder!', 'I feel SO inspired!', 'Moo-tivated!', 'Yes! YES! Moo!']));
            UI.toast(`✨ ${f.name} feels inspired. +3 devotion`, 'good');
          },
        },
        {
          icon: '🌾', label: 'Hand-feed', sub: S.hay < 1 ? 'You have no hay.' : 'Give 1 hay. Fills them right up.',
          disabled: S.hay < 1 || f.hunger > 95,
          action: () => {
            S.hay--; f.hunger = 100; f.starve = 0; f.faith = Math.min(100, f.faith + 3);
            Sfx.pickup(); UI.closeMenu(); if (e) this.say(e, '*grateful munching*');
          },
        },
        {
          icon: '🥛', label: 'Milk Baptism', sub: f.level >= 5 ? 'Maximum holiness achieved.' : `Level up. Higher levels generate more devotion.`,
          cost: f.level >= 5 ? 'MAX' : `${lvlCost} ✨`,
          disabled: f.level >= 5 || S.devotion < lvlCost,
          action: () => {
            S.devotion -= lvlCost; f.level++; f.faith = Math.min(100, f.faith + 20);
            Sfx.levelUp(); UI.closeMenu();
            if (e) this.say(e, 'I have been... pasteurized!');
            UI.toast(`🥛 ${f.name} is now level ${f.level}!`, 'good');
          },
        },
      ],
    });
  },

  openShrine() {
    this.collectDevotion();
    const opts = BLESSINGS.map((b) => {
      const lvl = S.upgrades[b.id];
      const max = lvl >= b.costs.length;
      const cost = max ? 0 : b.costs[lvl];
      return {
        icon: b.icon,
        label: `${b.name} ${b.costs.length > 1 ? `(${lvl}/${b.costs.length})` : lvl ? '(owned)' : ''}`,
        sub: b.desc,
        cost: max ? 'MAX' : `${cost} ✨`,
        disabled: max || S.devotion < cost,
        action: () => {
          S.devotion -= cost; S.upgrades[b.id]++;
          Sfx.levelUp(); UI.toast(`${b.icon} Blessing granted: ${b.name}`, 'good');
          saveGame(); this.openShrine();
        },
      };
    });
    UI.menu({
      title: '⛩️ Shrine of the Holy Cow',
      html: `<p>You have <b>${Math.floor(S.devotion)} ✨ Devotion</b>. Your followers worship here, filling the shrine with devotion (${Math.floor(S.shrineDevotion)}/${40 + 20 * S.followers.length} stored).</p><p>Spend devotion on Blessings that empower you on crusades.</p>`,
      options: opts,
    });
  },

  openTemple() {
    const preached = S.sermonDay === S.day;
    const opts = [{
      icon: '📜', label: 'Preach a Sermon', cls: preached ? '' : 'primary',
      sub: !S.followers.length ? 'There is nobody to preach to. Just you. Mooing alone.' : preached ? 'You already preached today. Your throat is hoarse. Moo-arse.' : `+20 faith for everyone and +${3 * S.followers.length} devotion. Once per day.`,
      disabled: preached || !S.followers.length,
      action: () => { UI.closeMenu(); this.sermon(); },
    }];
    for (const r of RITUALS) {
      const unlocked = ritualUnlocked(r.id);
      const done = S.ritualDay[r.id] === S.day;
      const lockedBy = Object.values(BOSSES).find((b) => b.unlock === r.id);
      let sub = r.desc;
      if (!unlocked) sub = `🔒 Slay ${lockedBy ? lockedBy.name : 'a Bishop'} to learn this ritual.`;
      else if (done) sub = 'Already performed today.';
      opts.push({
        icon: unlocked ? r.icon : '🔒', label: r.name, sub,
        cost: unlocked && r.grass ? `${r.grass} 🌿` : '',
        disabled: !unlocked || done || S.grass < r.grass || (r.id !== 'golden' && !S.followers.length),
        action: () => this.ritual(r),
      });
    }
    UI.menu({ title: '⛪ Temple of the Udder', html: '<p>Lead your flock. Sermons are free once per day; rituals cost grass.</p>', options: opts });
  },

  gatherForSermon() {
    let i = 0;
    const n = S.followers.length;
    for (const f of S.followers) {
      const e = this.ents.get(f.id);
      if (!e) continue;
      const a = Math.PI * (0.15 + 0.7 * (i / Math.max(1, n - 1)));
      e.tx = this.P.temple.x + Math.cos(a) * 60; e.ty = this.P.temple.y + 18 + Math.sin(a) * 34;
      e.goal = 'sermon'; e.state = 'walk'; e.timer = 0; i++;
    }
    this.player.x = this.P.temple.x; this.player.y = this.P.temple.y + 22;
  },

  releaseSermon() {
    for (const e of this.ents.values()) if (e.goal === 'sermon') { e.goal = null; e.state = 'idle'; e.timer = rand(0.5, 2); }
  },

  sermon() {
    S.sermonDay = S.day;
    this.gatherForSermon();
    const devo = 3 * S.followers.length;
    UI.dialog([
      ['You', 'Moo.'],
      ['You', 'Moooooo.'],
      ['You', 'MOOOOOOOOOOOOOOOOOOOO.', () => Sfx.holyMoo()],
      [pick(S.followers).name, pick(['Praise the Udder!', 'So profound. So... bovine.', 'I\'ve never heard it put so well!', 'He\'s right, you know. Or she. Or... the cow is right.'])],
    ], () => {
      for (const f of S.followers) { f.faith = Math.min(100, f.faith + 20); f.dissent = 0; }
      S.devotion += devo;
      Sfx.chime();
      UI.toast(`📜 The flock is moved. +20 faith, +${devo} devotion`, 'good');
      this.releaseSermon();
      saveGame();
    });
  },

  ritual(r) {
    if (r.id === 'ascend') { this.pickAscension(); return; }
    UI.closeMenu();
    S.grass -= r.grass;
    S.ritualDay[r.id] = S.day;
    this.gatherForSermon();
    const finish = (msg) => { Sfx.chime(); UI.toast(msg, 'good', 3200); this.releaseSermon(); saveGame(); };
    if (r.id === 'feast') {
      UI.dialog([['', 'Your followers gather around a heaping, holy salad. There are croutons. Someone brought ranch.']], () => {
        for (const f of S.followers) { f.hunger = 100; f.starve = 0; f.faith = Math.min(100, f.faith + 10); }
        finish('🥗 Feast of Clover! Everyone is stuffed. +10 faith');
      });
    } else if (r.id === 'holymoo') {
      UI.dialog([['', 'You draw a mighty breath...'], ['You', 'M O O O O O O O O O O O O O O O O O O O O', () => { Sfx.holyMoo(); Game.shake = 12; }], ['', 'Somewhere, distantly, a butcher drops their cleaver and doesn\'t know why.']], () => {
        for (const f of S.followers) { f.faith = Math.min(100, f.faith + 35); f.dissent = 0; }
        finish('📣 The Holy Moo-ment! +35 faith for all');
      });
    } else if (r.id === 'golden') {
      UI.dialog([['', 'You melt a great pile of grass into a gleaming golden calf. Nobody asks how grass melts. That\'s faith.']], () => {
        S.devotion += 40;
        finish('🐂 The Golden Calf gleams. +40 devotion');
      });
    }
  },

  pickAscension() {
    UI.menu({
      title: '☁️ Choose who Ascends',
      html: '<p>The chosen follower departs for the Big Pasture in the Sky, leaving behind a great wave of devotion. Higher level followers give more.</p>',
      options: S.followers.map((f) => ({
        icon: '🐾', label: f.name, sub: `${SPECIES[f.species].label}, level ${f.level}`, cost: `+${40 + 15 * f.level} ✨`,
        action: () => {
          UI.closeMenu();
          S.ritualDay.ascend = S.day;
          this.gatherForSermon();
          UI.dialog([
            [f.name, pick(['I\'m going to the Big Pasture in the Sky! Tell the others I said moo!', 'Is it nice up there? Is there hay? ...There\'s hay, right?', 'Finally! A promotion!'])],
            ['', `${f.name} rises gently into the heavens, mooing faintly the whole way up.`, () => Sfx.chime()],
          ], () => {
            S.followers = S.followers.filter((x) => x !== f);
            S.devotion += 40 + 15 * f.level;
            S.stats.ascended++;
            for (const o of S.followers) o.faith = Math.max(0, o.faith - 6);
            this.syncEnts(); this.releaseSermon();
            UI.toast(`☁️ ${f.name} has ascended. +${40 + 15 * f.level} devotion`, 'good', 3200);
            saveGame();
          });
        },
      })),
    });
  },

  openTrough() {
    const hungry = S.followers.filter((f) => f.hunger < 50).length;
    UI.menu({
      title: '🌾 The Holy Trough',
      html: `<p>The trough holds <b>${S.troughFood}</b> portion${S.troughFood === 1 ? '' : 's'}. You have <b>${S.hay} hay</b>.</p><p>Hungry followers come here to eat. ${hungry ? `<b>${hungry}</b> of your followers are getting peckish.` : 'Everyone is fed for now.'}</p><p>Tip: fill it before a crusade. Time keeps passing at home while you are away.</p>`,
      options: [
        { icon: '🌾', label: 'Add 1 hay', disabled: S.hay < 1, action: () => { S.hay--; S.troughFood++; Sfx.pickup(); this.openTrough(); } },
        { icon: '🌾', label: `Add ${Math.min(S.hay, Math.max(1, S.followers.length))} hay`, sub: 'One portion per follower.', disabled: S.hay < 1, action: () => { const n = Math.min(S.hay, Math.max(1, S.followers.length)); S.hay -= n; S.troughFood += n; Sfx.pickup(); this.openTrough(); } },
        { icon: '↩️', label: 'Take 1 hay back', disabled: S.troughFood < 1, action: () => { S.hay++; S.troughFood--; Sfx.select(); this.openTrough(); } },
      ],
    });
  },

  openStall() {
    UI.menu({
      title: '🐀 Ratcliff the Hay Rat',
      html: '<p class="quote">"Hay for grass, grass for hay. Nothing\'s free in this world, cow. Except advice. Advice is free. Mine is also usually wrong."</p>',
      options: [
        { icon: '🌾', label: 'Buy 3 hay', cost: '12 🌿', disabled: S.grass < 12, action: () => { S.grass -= 12; S.hay += 3; Sfx.coin(); this.openStall(); } },
        { icon: '🌾', label: 'Buy 10 hay', cost: '35 🌿', disabled: S.grass < 35, action: () => { S.grass -= 35; S.hay += 10; Sfx.coin(); this.openStall(); } },
        { icon: '🌿', label: 'Sell 5 hay', cost: '+10 🌿', disabled: S.hay < 5, action: () => { S.hay -= 5; S.grass += 10; Sfx.coin(); this.openStall(); } },
        { icon: '💡', label: 'Ask for advice', action: () => { UI.closeMenu(); UI.dialog([['Ratcliff', pick(TIPS)]]); } },
      ],
    });
  },

  openCrusade() {
    const opts = [];
    const n = S.followers.length;
    const allBishops = S.bosses.every(Boolean);
    REALMS.forEach((r, i) => {
      const prevOk = i === 0 || S.bosses[i - 1];
      const enough = n >= r.req;
      const slain = S.bosses[i];
      const boss = BOSSES[r.boss];
      let sub = `${r.sub}. Bishop: ${boss.name}.`;
      if (!prevOk) sub = `🔒 Slay ${BOSSES[REALMS[i - 1].boss].name} first.`;
      else if (!enough) sub = `🔒 Requires ${r.req} followers (you have ${n}).`;
      else if (slain) sub = `✔ ${boss.name} is slain. Crusade for loot and lost souls.`;
      opts.push({
        icon: !prevOk || !enough ? '🔒' : slain ? '✔️' : '⚔️', label: r.name, sub,
        cls: prevOk && enough && !slain ? 'primary' : '',
        disabled: !prevOk || !enough,
        action: () => { UI.closeMenu(); this.departCrusade(i); },
      });
    });
    if (allBishops) {
      const enough = n >= FINAL_REALM.req;
      opts.push({
        icon: S.finalDefeated ? '✔️' : '🔥', label: FINAL_REALM.name,
        sub: S.finalDefeated ? 'The grill is cold. You won. Want to do it again?' : enough ? 'He waits. He has always been waiting.' : `🔒 Requires ${FINAL_REALM.req} followers (you have ${n}).`,
        cls: enough && !S.finalDefeated ? 'primary' : '', disabled: !enough,
        action: () => { UI.closeMenu(); this.departCrusade(4); },
      });
    }
    const warn = (S.troughFood < S.followers.filter((f) => f.hunger < 60).length) ? '<p style="color:#ffb0a0">⚠️ Your trough is low. Followers will get hungry while you are away.</p>' : '';
    UI.menu({ title: '⚔️ The Red Gate', html: `<p>Choose a realm to crusade into. Slay heretics, gather grass, and rescue lost souls to join your flock.</p>${warn}`, options: opts });
  },

  departCrusade(i) {
    saveGame();
    Sfx.door();
    if (i === 4 && !S.finalDefeated) {
      UI.fade(() => Game.setScene(VoidScene, { mode: 'final' }));
    } else {
      UI.fade(() => Game.setScene(Crusade, { realm: i }));
    }
  },

  // ------------------------------------------------------------ rendering
  buildBg() {
    const key = `${this.W}x${this.H}@${Game.px}`;
    if (this.bgKey === key) return;
    this.bgKey = key;
    this.bg = Game.makeLayer(this.W, this.H, (c) => {
      const W = this.W, H = this.H, rng = seeded(42);
      c.fillStyle = '#3f5b34'; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 70; i++) ell(c, rng() * W, rng() * H, 20 + rng() * 50, 10 + rng() * 26, rng() < 0.5 ? '#45633a' : '#39532f');
      // dirt paths
      c.strokeStyle = '#6a5236'; c.lineCap = 'round'; c.lineWidth = 22;
      const g = this.P.gate, sh = this.P.shrine;
      c.beginPath(); c.moveTo(g.x, g.y); c.quadraticCurveTo(g.x + 20, (g.y + sh.y) / 2, sh.x, sh.y + 20); c.stroke();
      c.beginPath(); c.moveTo(sh.x, sh.y + 10); c.quadraticCurveTo((sh.x + this.P.temple.x) / 2, sh.y, this.P.temple.x, this.P.temple.y + 8); c.stroke();
      c.beginPath(); c.moveTo(sh.x, sh.y + 10); c.quadraticCurveTo((sh.x + this.P.stall.x) / 2, sh.y - 10, this.P.stall.x, this.P.stall.y + 8); c.stroke();
      c.beginPath(); c.moveTo(sh.x, sh.y + 10); c.quadraticCurveTo((sh.x + this.P.trough.x) / 2, this.P.trough.y, this.P.trough.x, this.P.trough.y + 10); c.stroke();
      c.lineWidth = 14; c.strokeStyle = '#7a6040';
      c.beginPath(); c.moveTo(g.x, g.y); c.quadraticCurveTo(g.x + 20, (g.y + sh.y) / 2, sh.x, sh.y + 20); c.stroke();
      // tufts & flowers
      for (let i = 0; i < 260; i++) {
        const x = rng() * W, y = rng() * H;
        const col = rng() < 0.5 ? '#5a7a44' : '#2f4a2a';
        line(c, x, y, x - 2, y - 5, col, 1.5); line(c, x + 2, y, x + 3, y - 6, col, 1.5);
      }
      for (let i = 0; i < 40; i++) {
        const x = rng() * W, y = rng() * H;
        circ(c, x, y, 2, pick(['#f0c35a', '#e8e2ff', '#e0485a', '#c08ae0']));
      }
      // stone ring around the shrine
      ell(c, sh.x, sh.y + 2, 70, 38, 'rgba(90,85,96,.45)');
      ell(c, sh.x, sh.y + 2, 62, 33, '#5d6a4a');
      drawSigil(c, sh.x, sh.y + 2, 58, 'rgba(200,40,58,.35)', 2);
      // darker vignette band at top where the forest is
      const grd = c.createLinearGradient(0, 0, 0, this.top + 20);
      grd.addColorStop(0, '#1a2418'); grd.addColorStop(1, 'rgba(26,36,24,0)');
      c.fillStyle = grd; c.fillRect(0, 0, W, this.top + 20);
    });
  },

  draw(c) {
    const t = this.t;
    this.buildBg();
    c.drawImage(this.bg, 0, 0, this.W, this.H);
    drawField(c, this.P.field.x, this.P.field.y, this.fieldW, this.fieldH, S.fieldGrowth, t);
    for (const pie of S.pies) drawPie(c, pie.x * this.W, pie.y * this.H, t);

    const items = [];
    for (const tr of this.trees) items.push({ y: tr.y, d: () => drawTree(c, tr.x, tr.y, tr.s, tr.col, t) });
    items.push({ y: this.P.temple.y, d: () => drawTemple(c, this.P.temple.x, this.P.temple.y, t) });
    items.push({ y: this.P.shrine.y, d: () => drawShrine(c, this.P.shrine.x, this.P.shrine.y, t, { ready: S.shrineDevotion >= 1 }) });
    items.push({ y: this.P.stall.y, d: () => drawStall(c, this.P.stall.x, this.P.stall.y, t) });
    items.push({ y: this.P.trough.y, d: () => drawTrough(c, this.P.trough.x, this.P.trough.y, S.troughFood, t) });
    items.push({ y: this.P.gate.y, d: () => drawGate(c, this.P.gate.x, this.P.gate.y, t) });
    for (const f of S.followers) {
      const e = this.ents.get(f.id);
      if (!e) continue;
      items.push({ y: e.y, d: () => drawFollower(c, f.species, e.x, e.y, e.face, t + e.seed, { moving: e.moving, praying: e.state === 'pray', level: f.level, dissent: f.faith <= 0 }) });
    }
    const p = this.player;
    items.push({ y: p.y, d: () => drawCow(c, p.x, p.y, p.face, t, { moving: p.moving }) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.d();

    // status icons over followers
    c.font = '11px sans-serif'; c.textAlign = 'center';
    for (const f of S.followers) {
      const e = this.ents.get(f.id);
      if (!e) continue;
      let icon = '';
      if (f.hunger < 25) icon = '🍽️';
      else if (e.state === 'pray') icon = Math.sin(t * 3 + e.seed) > 0 ? '✨' : '';
      if (icon) c.fillText(icon, e.x, e.y - 40);
    }

    // sparkles flying to the cow
    for (const s of this.sparkles) if (s.t > 0) { glow(c, s.x, s.y, 8, 'rgba(255,220,120,.9)'); circ(c, s.x, s.y, 1.8, '#fff'); }

    // night
    const ph = S.time / DAY_LEN;
    let dark = 0;
    if (ph > 0.7) dark = ph < 0.8 ? (ph - 0.7) / 0.1 : 1;
    if (ph < 0.06) dark = 1 - ph / 0.06;
    dark *= 0.55;
    if (dark > 0.01) {
      c.fillStyle = `rgba(14,6,40,${dark})`; c.fillRect(0, 0, this.W, this.H);
      c.save(); c.globalCompositeOperation = 'lighter';
      glow(c, this.P.shrine.x, this.P.shrine.y - 20, 90, 'rgba(255,170,80,.35)', dark * 1.6);
      glow(c, this.P.gate.x, this.P.gate.y - 26, 70, 'rgba(255,60,60,.35)', dark * 1.6);
      glow(c, this.P.temple.x, this.P.temple.y - 12, 50, 'rgba(255,120,60,.3)', dark * 1.6);
      for (let i = 0; i < 18; i++) {
        const fx = (Math.sin(i * 12.9 + t * 0.3) * 0.5 + 0.5) * this.W, fy = this.top + (Math.cos(i * 7.3 + t * 0.25) * 0.5 + 0.5) * (this.H - this.top);
        glow(c, fx, fy, 6, 'rgba(220,255,120,.8)', dark * (0.5 + 0.5 * Math.sin(t * 3 + i)));
      }
      c.restore();
    }

    // speech bubbles
    for (const b of this.bubbles) this.drawBubble(c, b.e.x, b.e.y - 46, b.text, Math.min(1, (b.life - b.t) * 3, b.t * 6));

    // interact marker
    if (this.near) {
      const n = this.near;
      const yy = n.y - 58 + Math.sin(t * 6) * 3;
      c.save(); c.globalAlpha = 0.9;
      poly(c, [n.x - 6, yy, n.x + 6, yy, n.x, yy + 8], '#f0c35a', INK, 1.5);
      c.restore();
    }
  },

  drawBubble(c, x, y, text, a) {
    c.save();
    c.globalAlpha = clamp(a, 0, 1);
    c.font = '11px "Trebuchet MS", sans-serif';
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (c.measureText(test).width > 130 && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    const w = Math.max(...lines.map((l) => c.measureText(l).width)) + 12;
    const h = lines.length * 13 + 8;
    const bx = clamp(x - w / 2, 4, this.W - w - 4), by = y - h;
    rrect(c, bx, by, w, h, 6, 'rgba(246,234,215,.95)', INK, 1.5);
    poly(c, [x - 4, by + h - 1, x + 4, by + h - 1, x, by + h + 6], 'rgba(246,234,215,.95)');
    c.fillStyle = INK; c.textAlign = 'left'; c.textBaseline = 'top';
    lines.forEach((l, i) => c.fillText(l, bx + 6, by + 5 + i * 13));
    c.restore();
  },
};
