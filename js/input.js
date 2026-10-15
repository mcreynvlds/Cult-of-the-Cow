'use strict';
// Unified input: floating virtual joystick + on-screen buttons for touch,
// WASD/arrows + J/K/L/E for keyboard.

const Input = {
  keys: {},
  joy: { id: null, ox: 0, oy: 0, dx: 0, dy: 0 },
  buf: { attack: 0, dodge: 0, special: 0, interact: 0 },
  JOY_R: 50,

  init() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (UI.dialogOpen || UI.menuOpen) return; // UI owns keys while open
      this.keys[k] = true;
      if (k === ' ' || k === 'j') this.press('attack');
      if (k === 'shift' || k === 'k') this.press('dodge');
      if (k === 'l' || k === 'q') this.press('special');
      if (k === 'e' || k === 'enter') this.press('interact');
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
    window.addEventListener('blur', () => this.reset());

    const zone = document.getElementById('joyzone');
    const joy = document.getElementById('joy');
    const knob = document.getElementById('joyknob');
    zone.addEventListener('pointerdown', (e) => {
      Sfx.ensure();
      if (this.joy.id !== null) return;
      this.joy.id = e.pointerId;
      try { zone.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      this.joy.ox = e.clientX; this.joy.oy = e.clientY;
      this.joy.dx = 0; this.joy.dy = 0;
      joy.style.left = e.clientX + 'px'; joy.style.top = e.clientY + 'px';
      knob.style.transform = 'translate(0px,0px)';
      joy.classList.add('on');
      e.preventDefault();
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joy.id) return;
      let dx = e.clientX - this.joy.ox, dy = e.clientY - this.joy.oy;
      const l = Math.hypot(dx, dy);
      if (l > this.JOY_R) {
        // drag the joystick base along so it never feels "stuck"
        const over = l - this.JOY_R;
        this.joy.ox += (dx / l) * over; this.joy.oy += (dy / l) * over;
        joy.style.left = this.joy.ox + 'px'; joy.style.top = this.joy.oy + 'px';
        dx = (dx / l) * this.JOY_R; dy = (dy / l) * this.JOY_R;
      }
      this.joy.dx = dx / this.JOY_R; this.joy.dy = dy / this.JOY_R;
      knob.style.transform = `translate(${dx}px,${dy}px)`;
    });
    const end = (e) => {
      if (e.pointerId !== this.joy.id) return;
      this.joy.id = null; this.joy.dx = 0; this.joy.dy = 0;
      joy.classList.remove('on');
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    const bind = (id, action) => {
      const b = document.getElementById(id);
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        Sfx.ensure();
        this.press(action);
        b.classList.add('down');
      });
      const up = () => b.classList.remove('down');
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('pointerleave', up);
    };
    bind('btn-attack', 'attack');
    bind('btn-dodge', 'dodge');
    bind('btn-special', 'special');
    bind('btn-action', 'interact');

    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('gesturestart', (e) => e.preventDefault());
  },

  press(a) { this.buf[a] = 0.2; },

  take(a) {
    if (this.buf[a] > 0) { this.buf[a] = 0; return true; }
    return false;
  },

  update(dt) {
    for (const k in this.buf) if (this.buf[k] > 0) this.buf[k] -= dt;
  },

  clear() { for (const k in this.buf) this.buf[k] = 0; },

  reset() {
    this.keys = {};
    this.clear();
    this.joy.id = null; this.joy.dx = 0; this.joy.dy = 0;
    const j = document.getElementById('joy');
    if (j) j.classList.remove('on');
  },

  get move() {
    const k = this.keys;
    let x = 0, y = 0;
    if (k.a || k.arrowleft) x -= 1;
    if (k.d || k.arrowright) x += 1;
    if (k.w || k.arrowup) y -= 1;
    if (k.s || k.arrowdown) y += 1;
    x += this.joy.dx; y += this.joy.dy;
    const l = Math.hypot(x, y);
    if (l < 0.18) return { x: 0, y: 0, mag: 0 };
    if (l > 1) { x /= l; y /= l; }
    return { x, y, mag: Math.min(1, l) };
  },
};
