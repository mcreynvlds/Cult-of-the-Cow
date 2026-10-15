'use strict';
// DOM overlay UI: dialog boxes, menus, toasts, HUD, fades.

const UI = {
  dialogOpen: false,
  menuOpen: false,
  _lines: [],
  _done: null,
  _typing: false,
  _full: '',
  _shown: 0,
  _hud: {},
  _menuOnClose: null,

  init() {
    this.el = {
      dialog: document.getElementById('dialog'),
      who: document.querySelector('#dialog .who'),
      text: document.querySelector('#dialog .text'),
      menu: document.getElementById('menu'),
      mTitle: document.querySelector('#menu h2'),
      mBody: document.querySelector('#menu .body'),
      mOpts: document.querySelector('#menu .opts'),
      mClose: document.querySelector('#menu .close'),
      toasts: document.getElementById('toasts'),
      fade: document.getElementById('fade'),
      hearts: document.getElementById('hearts'),
      day: document.getElementById('day'),
      sun: document.getElementById('sun'),
      grass: document.getElementById('r-grass'),
      hay: document.getElementById('r-hay'),
      dev: document.getElementById('r-dev'),
      faithfill: document.getElementById('faithfill'),
      fcount: document.getElementById('followercount'),
      action: document.getElementById('btn-action'),
      actionLbl: document.querySelector('#btn-action .lbl'),
      special: document.getElementById('btn-special'),
      bossbar: document.getElementById('bossbar'),
      bossname: document.querySelector('#bossbar .bname'),
      bossfill: document.querySelector('#bossbar .bfill'),
    };
    this.el.dialog.addEventListener('pointerdown', (e) => { e.preventDefault(); Sfx.ensure(); this.advance(); });
    this.el.mClose.addEventListener('click', () => { Sfx.select(); this.closeMenu(); });
    this.el.menu.addEventListener('pointerdown', (e) => { if (e.target === this.el.menu) { this.closeMenu(); } });
    window.addEventListener('keydown', (e) => {
      if (this.dialogOpen && [' ', 'enter', 'e', 'j'].includes(e.key.toLowerCase())) { e.preventDefault(); this.advance(); }
      else if (this.menuOpen && e.key === 'Escape') this.closeMenu();
    });
  },

  blocking() { return this.dialogOpen || this.menuOpen; },

  // lines: [[who, text, opts?], ...] or [{who,text,fn}]
  dialog(lines, done) {
    this._lines = lines.map((l) => (Array.isArray(l) ? { who: l[0], text: l[1], fn: l[2] } : l));
    this._done = done || null;
    this.dialogOpen = true;
    Input.reset();
    this.el.dialog.classList.remove('hidden');
    this._next();
  },

  _next() {
    const l = this._lines.shift();
    if (!l) {
      this.dialogOpen = false;
      this.el.dialog.classList.add('hidden');
      Input.reset();
      const d = this._done; this._done = null;
      if (d) d();
      return;
    }
    if (l.fn) l.fn();
    this.el.who.textContent = l.who || '';
    this._full = l.text;
    this._shown = 0;
    this._typing = true;
    this.el.text.textContent = '';
    if (l.who === 'You') Sfx.moo(1 + Math.random() * 0.15, 0.7);
  },

  advance() {
    if (!this.dialogOpen) return;
    if (this._typing) {
      this._typing = false;
      this.el.text.textContent = this._full;
    } else {
      Sfx.select();
      this._next();
    }
  },

  tick(dt) {
    if (this.dialogOpen && this._typing) {
      const prev = Math.floor(this._shown);
      this._shown += dt * 55;
      const n = Math.floor(this._shown);
      if (n !== prev) {
        this.el.text.textContent = this._full.slice(0, n);
        if (n % 3 === 0) Sfx.blip();
      }
      if (n >= this._full.length) { this._typing = false; this.el.text.textContent = this._full; }
    }
  },

  // opts: {title, html, options:[{icon,label,sub,cost,disabled,action,cls}], onClose, closable}
  menu(opts) {
    this.menuOpen = true;
    Input.reset();
    this._menuOnClose = opts.onClose || null;
    this.el.mTitle.textContent = opts.title || '';
    this.el.mBody.innerHTML = opts.html || '';
    this.el.mClose.classList.toggle('hidden', opts.closable === false);
    this.el.mOpts.innerHTML = '';
    for (const o of opts.options || []) {
      const b = document.createElement('button');
      b.className = 'opt' + (o.cls ? ' ' + o.cls : '');
      if (o.disabled) b.disabled = true;
      b.innerHTML = `${o.icon ? `<span class="oi">${o.icon}</span>` : ''}<span class="ot"><div class="ol">${esc(o.label)}</div>${o.sub ? `<div class="os">${o.sub}</div>` : ''}</span>${o.cost ? `<span class="oc">${o.cost}</span>` : ''}`;
      b.addEventListener('click', () => {
        if (o.disabled) return;
        Sfx.select();
        o.action && o.action();
      });
      this.el.mOpts.appendChild(b);
    }
    this.el.menu.classList.remove('hidden');
    this.el.menu.querySelector('.panel').scrollTop = 0;
  },

  closeMenu(silent) {
    if (!this.menuOpen) return;
    this.menuOpen = false;
    this.el.menu.classList.add('hidden');
    Input.reset();
    const cb = this._menuOnClose; this._menuOnClose = null;
    if (cb && !silent) cb();
  },

  toast(msg, cls = '', ms = 2600) {
    const d = document.createElement('div');
    d.className = 'toast ' + cls;
    d.textContent = msg;
    this.el.toasts.appendChild(d);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
    setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 450); }, ms);
  },

  fade(fn, hold = 120) {
    this.el.fade.classList.add('on');
    setTimeout(() => {
      fn();
      setTimeout(() => this.el.fade.classList.remove('on'), hold);
    }, 320);
  },

  setAction(label) {
    const key = label || '';
    if (this._hud.action === key) return;
    this._hud.action = key;
    this.el.action.classList.toggle('off', !label);
    this.el.actionLbl.textContent = label || '';
  },

  setFervor(f, ready) {
    const v = (f / 100).toFixed(2);
    if (this._hud.fervor !== v) { this._hud.fervor = v; this.el.special.style.setProperty('--fill', v); }
    if (this._hud.ready !== ready) { this._hud.ready = ready; this.el.special.classList.toggle('ready', ready); }
  },

  setBoss(name, frac) {
    if (name == null) { this.el.bossbar.classList.add('hidden'); this._hud.boss = null; return; }
    if (this._hud.boss !== name) { this._hud.boss = name; this.el.bossname.textContent = name; this.el.bossbar.classList.remove('hidden'); }
    this.el.bossfill.style.width = Math.max(0, frac * 100).toFixed(1) + '%';
  },

  _set(key, el, val, prop = 'textContent') {
    if (this._hud[key] !== val) { this._hud[key] = val; el[prop] = val; }
  },

  updateHud(hp, maxHp, loot) {
    if (!S) return;
    this._set('grass', this.el.grass, String(Math.floor(S.grass + (loot ? loot.grass : 0))));
    this._set('hay', this.el.hay, String(Math.floor(S.hay + (loot ? loot.hay : 0))));
    this._set('dev', this.el.dev, String(Math.floor(S.devotion)));
    this._set('day', this.el.day, `Day ${S.day}`);
    const p = S.time / DAY_LEN;
    this._set('sun', this.el.sun, p < 0.72 ? '☀️' : p < 0.8 ? '🌇' : '🌙');
    this._set('fcount', this.el.fcount, String(S.followers.length));
    const fw = cultFaith().toFixed(0) + '%';
    if (this._hud.faith !== fw) { this._hud.faith = fw; this.el.faithfill.style.width = fw; }
    if (hp != null) {
      let h = '';
      for (let i = 0; i < maxHp; i++) h += i < hp ? '❤️' : '🖤';
      this._set('hearts', this.el.hearts, h);
    }
  },
};
