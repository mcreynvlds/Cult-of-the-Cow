'use strict';
// Boot, scene manager, main loop, title screen and pause menu.

const HOW_TO_PLAY = `
  <p><b>You are the Last Cow</b>, resurrected by The One Who Grills to start a cult and slay the four Butcher Bishops.</p>
  <p><b>🕹️ Move:</b> drag anywhere on the screen (floating joystick) or use WASD / arrows.</p>
  <p><b>🏠 At your cult:</b> walk up to things and tap the gold <b>action button</b> (or E). Collect devotion at the Shrine, preach at the Temple, fill the Trough, harvest the field, clean up "offerings", and talk to followers.</p>
  <p><b>⚔️ On crusade:</b> 🔔 swing your holy cowbell (Space/J) — chain three swings for a big finisher. 💨 dodge-roll through attacks (Shift/K). 🐮 unleash a Holy Moo shockwave when its meter fills (L).</p>
  <p>Your swing smacks enemy projectiles out of the air. Red <b>!</b> means an attack is coming.</p>
  <p><b>Keep the faith:</b> hungry or doubting followers eventually leave. Time keeps passing at home while you crusade.</p>`;

const TitleScene = {
  name: 'title',
  controls: 'none',
  alwaysUpdate: true,
  t: 0,

  enter() {
    this.t = 0;
    document.getElementById('title').classList.remove('hidden');
    document.getElementById('t-continue').classList.toggle('hidden', !hasSave());
    document.getElementById('t-sound').textContent = `Sound: ${Sfx.muted ? 'Off' : 'On'}`;
  },

  exit() { document.getElementById('title').classList.add('hidden'); },

  update(dt) { this.t += dt; },

  draw(c) {
    const W = Game.W, H = Game.H, t = this.t;
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a0812'); g.addColorStop(0.6, '#140408'); g.addColorStop(1, '#0a0205');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const portrait = H > W;
    const cx = portrait ? W / 2 : W * 0.27, cy = portrait ? H * 0.34 : H * 0.72;
    // blood moon
    glow(c, cx, cy - 110, 120, 'rgba(200,40,58,.35)');
    circ(c, cx, cy - 110, 46, '#7a1424');
    circ(c, cx - 12, cy - 120, 9, 'rgba(0,0,0,.18)'); circ(c, cx + 16, cy - 98, 6, 'rgba(0,0,0,.15)');
    c.save(); c.globalAlpha = 0.25; c.translate(cx, cy + 10); c.rotate(t * 0.1);
    drawSigil(c, 0, 0, 130, '#c8283a', 3);
    c.restore();
    // hill
    ell(c, cx, cy + 30, 150, 40, '#1a0a10');
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.05 + 0.9 * (i / 6));
      drawCandle(c, cx + Math.cos(a) * 120, cy + 24 + Math.sin(a) * 18, t, 10 + (i % 3) * 3);
    }
    const sp = ['pig', 'chicken', 'sheep', 'goat', 'duck', 'rabbit'];
    sp.forEach((s, i) => {
      const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
      drawFollower(c, s, cx + side * (62 + k * 26), cy + 34 + k * 8, -side, t + i, { praying: true, level: 1 + (i % 5) });
    });
    drawCow(c, cx, cy + 22, 1, t, { scale: 3 });
  },
};

const Game = {
  W: 400,
  H: 700,
  px: 1,
  scale: 1,
  scene: null,
  shake: 0,
  last: 0,
  saveT: 0,

  init() {
    Sfx.init();
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    Input.init();
    UI.init();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    document.addEventListener('visibilitychange', () => { if (document.hidden && S && S.started) saveGame(); });
    this.bindTitle();
    document.getElementById('btn-pause').addEventListener('click', () => { Sfx.ensure(); Sfx.select(); this.pauseMenu(); });
    S = loadGame() || newState();
    this.setScene(TitleScene);
    requestAnimationFrame((ts) => { this.last = ts; this.loop(ts); });
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  },

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const BASE = 400;
    if (h >= w) { this.W = BASE; this.H = BASE * h / w; }
    else { this.H = BASE; this.W = BASE * w / h; }
    this.scale = w / this.W;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.px = this.scale * dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    if (this.scene && this.scene.onResize) this.scene.onResize();
  },

  makeLayer(w, h, fn) {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w * this.px);
    cv.height = Math.ceil(h * this.px);
    const c = cv.getContext('2d');
    c.scale(this.px, this.px);
    fn(c);
    return cv;
  },

  setScene(s, params = {}) {
    if (this.scene && this.scene.exit) this.scene.exit();
    this.scene = s;
    document.body.className = 'mode-' + (s.controls || 'none');
    Input.reset();
    UI.setAction(null);
    s.enter(params);
  },

  loop(ts) {
    const dt = Math.min(0.05, Math.max(0, (ts - this.last) / 1000));
    this.last = ts;
    Input.update(dt);
    UI.tick(dt);
    const sc = this.scene;
    if (!UI.blocking()) {
      if (S && S.started && (sc === Base || sc === Crusade)) Base.simulate(dt);
      sc.update(dt);
    } else if (sc.alwaysUpdate) {
      sc.update(dt);
    } else if (sc === Base && UI.dialogOpen) {
      sc.update(dt, true);
    }

    this.shake = Math.max(0, this.shake - dt * 35);
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#0a0306';
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(this.px, 0, 0, this.px, sx * this.px, sy * this.px);
    sc.draw(c);

    if (sc === Crusade) UI.updateHud(Crusade.player.hp, Crusade.player.maxHp, Crusade.over ? null : Crusade.loot);
    else if (sc === Base) UI.updateHud();

    if (S && S.started && sc === Base) {
      this.saveT += dt;
      if (this.saveT > 15) { this.saveT = 0; saveGame(); }
    }
    requestAnimationFrame((t) => this.loop(t));
  },

  bindTitle() {
    const start = () => {
      wipeSave();
      S = newState();
      UI.fade(() => Game.setScene(VoidScene, { mode: 'intro' }));
    };
    document.getElementById('t-new').addEventListener('click', () => {
      Sfx.ensure(); Sfx.select();
      if (hasSave()) {
        UI.menu({
          title: 'Start a new cult?',
          html: '<p>Your existing cult will be abandoned. They will be fine. Probably. They have each other.</p>',
          options: [
            { icon: '🔥', label: 'Yes, start over', cls: 'danger', action: () => { UI.closeMenu(); start(); } },
            { icon: '↩️', label: 'Never mind', action: () => UI.closeMenu() },
          ],
        });
      } else start();
    });
    document.getElementById('t-continue').addEventListener('click', () => {
      Sfx.ensure(); Sfx.select();
      S = loadGame();
      if (!S) return;
      Sfx.moo();
      UI.fade(() => Game.setScene(Base, {}));
    });
    document.getElementById('t-help').addEventListener('click', () => {
      Sfx.ensure(); Sfx.select();
      UI.menu({ title: 'How to Play', html: HOW_TO_PLAY, options: [{ icon: '👍', label: 'Got it', action: () => UI.closeMenu() }] });
    });
    document.getElementById('t-sound').addEventListener('click', (e) => {
      Sfx.ensure();
      Sfx.setMuted(!Sfx.muted);
      e.target.textContent = `Sound: ${Sfx.muted ? 'Off' : 'On'}`;
      if (!Sfx.muted) Sfx.moo();
    });
  },

  pauseMenu() {
    if (UI.dialogOpen) return;
    const sc = this.scene;
    const opts = [
      { icon: '▶️', label: 'Resume', cls: 'primary', action: () => UI.closeMenu() },
      { icon: '🐾', label: 'Cult Roster', sub: `${S.followers.length} followers`, action: () => this.roster() },
      { icon: Sfx.muted ? '🔇' : '🔊', label: `Sound: ${Sfx.muted ? 'Off' : 'On'}`, action: () => { Sfx.setMuted(!Sfx.muted); this.pauseMenu(); } },
      { icon: '❓', label: 'How to Play', action: () => UI.menu({ title: 'How to Play', html: HOW_TO_PLAY, options: [{ icon: '↩️', label: 'Back', action: () => this.pauseMenu() }] }) },
    ];
    if (sc === Crusade && !Crusade.over) {
      opts.push({
        icon: '🏳️', label: 'Abandon Crusade', sub: 'Flee home. You keep only half the grass you found.', cls: 'danger',
        action: () => { UI.closeMenu(); Crusade.finishRun(false); },
      });
    }
    opts.push({
      icon: '🚪', label: 'Save & Quit to Title',
      action: () => {
        UI.closeMenu();
        if (sc === Crusade && !Crusade.over) { Crusade.over = true; S.grass += Math.floor(Crusade.loot.grass / 2); S.hay += Crusade.loot.hay; }
        saveGame();
        UI.fade(() => Game.setScene(TitleScene));
      },
    });
    const bosses = S.bosses.map((b, i) => `${b ? '✔' : '✖'} ${BOSSES[REALMS[i].boss].name}`).join('<br>');
    UI.menu({ title: '☰ Paused', html: `<p style="font-size:13px;opacity:.8">Day ${S.day} · ${S.runs} crusades · ${S.stats.kills} heretics bonked</p><p style="font-size:13px">${bosses}</p>`, options: opts });
  },

  roster() {
    const rows = S.followers.map((f) => `<div class="frow"><b>${esc(f.name)}</b> · ${SPECIES[f.species].label} · Lv ${f.level}<br>🙏 ${Math.round(f.faith)}% &nbsp; 🍽️ ${Math.round(f.hunger)}%${f.faith <= 0 ? ' &nbsp; <span style="color:#ff6a6a">dissenting!</span>' : ''}${f.hunger <= 0 ? ' &nbsp; <span style="color:#ff6a6a">starving!</span>' : ''}</div>`).join('');
    UI.menu({
      title: '🐾 Cult Roster',
      html: `<div class="flist">${rows || '<p>Your cult is just you. A cow alone in a field. Very relatable.</p>'}</div>`,
      options: [{ icon: '↩️', label: 'Back', action: () => this.pauseMenu() }],
    });
  },
};

window.addEventListener('load', () => Game.init());
