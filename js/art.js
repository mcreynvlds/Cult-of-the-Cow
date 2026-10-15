'use strict';
// Procedural cartoon art. Everything is drawn with canvas primitives; origins are at the feet.

const INK = '#1b0f16';

function ell(c, x, y, rx, ry, fill, stroke, lw, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.lineWidth = lw || 2; c.strokeStyle = stroke; c.stroke(); }
}
function circ(c, x, y, r, fill, stroke, lw) { ell(c, x, y, r, r, fill, stroke, lw); }
function rrect(c, x, y, w, h, r, fill, stroke, lw) {
  c.beginPath();
  r = Math.min(r, w / 2, h / 2);
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.lineWidth = lw || 2; c.strokeStyle = stroke; c.stroke(); }
}
function poly(c, pts, fill, stroke, lw) {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.lineWidth = lw || 2; c.strokeStyle = stroke; c.stroke(); }
}
function line(c, x1, y1, x2, y2, col, lw) {
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
  c.strokeStyle = col; c.lineWidth = lw || 2; c.lineCap = 'round'; c.stroke();
}
function shadow(c, x, y, rx, ry) { ell(c, x, y, rx, ry || rx * 0.35, 'rgba(0,0,0,0.32)'); }
function eye(c, x, y, col, s = 1) { ell(c, x, y, 1.6 * s, 2.1 * s, col || INK); circ(c, x + 0.5 * s, y - 0.8 * s, 0.6 * s, '#fff'); }
function glow(c, x, y, r, col, a = 1) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.save(); c.globalAlpha = a; c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore();
}

function crown(c, x, y, s = 1, col = '#d8283a') {
  poly(c, [x - 6 * s, y, x - 7 * s, y - 7 * s, x - 3 * s, y - 3.5 * s, x, y - 8 * s, x + 3 * s, y - 3.5 * s, x + 7 * s, y - 7 * s, x + 6 * s, y], col, INK, 1.4);
  circ(c, x, y - 8.5 * s, 1.3 * s, '#f0c35a');
}

// ---------------------------------------------------------------- The Cow
function drawCow(c, x, y, face, t, o = {}) {
  const s = o.scale || 1;
  const mv = o.moving;
  const bob = mv ? Math.abs(Math.sin(t * 14)) * 2.2 : Math.sin(t * 2.5) * 0.7;
  c.save();
  c.translate(x, y);
  if (!o.noShadow) shadow(c, 0, 1, 16 * s, 5 * s);
  c.scale(face < 0 ? -s : s, s);
  if (o.flash) c.globalAlpha = Math.floor(t * 20) % 2 ? 0.35 : 1;
  if (o.alpha != null) c.globalAlpha *= o.alpha;
  if (o.kneel) c.translate(0, 4);
  c.translate(0, -bob);
  const lp = mv ? Math.sin(t * 14) * 3 : 0;
  // legs
  const legs = [[-10, 1], [-5, -1], [5, -1], [10, 1]];
  for (const [lx, ph] of legs) {
    rrect(c, lx - 2.3 + lp * ph * 0.6, -8, 4.6, o.kneel ? 5 : 9, 2, '#efe7da', INK, 1.4);
    rrect(c, lx - 2.3 + lp * ph * 0.6, (o.kneel ? -4 : -1.5), 4.6, 2.5, 1, '#3a2a2e');
  }
  // tail
  c.beginPath(); c.moveTo(-13, -15); c.quadraticCurveTo(-20, -14 + Math.sin(t * 4) * 2, -19, -6);
  c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
  ell(c, -19, -5, 2, 3, '#3a2a2e');
  // body
  ell(c, 0, -14, 15, 10, '#f6f0e6', INK, 2);
  c.save(); c.beginPath(); c.ellipse(0, -14, 14, 9, 0, 0, TAU); c.clip();
  ell(c, -6, -17, 6, 4.5, '#2a2027'); ell(c, 4, -9, 4.5, 3, '#2a2027'); ell(c, -12, -9, 3.5, 3, '#2a2027'); ell(c, 8, -19, 3, 2.2, '#2a2027');
  c.restore();
  // udder hint
  ell(c, 2, -5, 3.5, 2, '#f2a7b5', INK, 1);
  // cult robe sash
  c.beginPath(); c.moveTo(4, -23); c.quadraticCurveTo(0, -12, 6, -5);
  c.strokeStyle = '#c8283a'; c.lineWidth = 3; c.stroke();
  // head
  const hx = 13, hy = -23;
  ell(c, hx - 5, hy - 5, 3.5, 2, '#2a2027', INK, 1, -0.5); // ear
  // horns
  c.beginPath(); c.moveTo(hx - 3, hy - 6); c.quadraticCurveTo(hx - 7, hy - 13, hx - 2, hy - 15);
  c.strokeStyle = '#efe0b8'; c.lineWidth = 3; c.stroke();
  c.beginPath(); c.moveTo(hx + 3, hy - 6); c.quadraticCurveTo(hx + 6, hy - 13, hx + 2, hy - 15); c.stroke();
  ell(c, hx, hy, 9, 8.5, '#f6f0e6', INK, 2);
  ell(c, hx - 3, hy - 3, 3.5, 3, '#2a2027');
  ell(c, hx + 5, hy + 4, 6, 4.5, '#f2a7b5', INK, 1.5);
  circ(c, hx + 3.5, hy + 4, 0.9, INK); circ(c, hx + 7, hy + 4, 0.9, INK);
  if (o.dead) {
    line(c, hx + 1, hy - 4, hx + 5, hy, INK, 1.4); line(c, hx + 5, hy - 4, hx + 1, hy, INK, 1.4);
  } else if (o.blink || (Math.sin(t * 0.9) > 0.985)) {
    line(c, hx + 1.5, hy - 2, hx + 5.5, hy - 2, INK, 1.5);
  } else eye(c, hx + 3.5, hy - 2.5, INK, 1.25);
  // crown
  crown(c, hx - 1, hy - 7, 1);
  // cowbell
  poly(c, [hx - 6, hy + 8, hx - 2, hy + 8, hx - 1, hy + 14, hx - 7, hy + 14], '#f0c35a', INK, 1.3);
  circ(c, hx - 4, hy + 14.5, 1.2, '#a8741e');
  c.restore();
}

// ---------------------------------------------------------------- Followers
const HEADS = {
  chicken(c) {
    circ(c, -1, -8, 2.6, '#d8333a'); circ(c, 2.2, -8.4, 2.6, '#d8333a'); circ(c, -3.8, -6.5, 2.1, '#d8333a');
    circ(c, 0, 0, 7.5, '#f6f1e7', INK, 1.6);
    poly(c, [6, -1.5, 11.5, 0.5, 6, 2.5], '#f2b233', INK, 1.2);
    ell(c, 7, 4.8, 1.8, 2.5, '#d8333a');
    eye(c, 3, -2);
  },
  pig(c) {
    poly(c, [-6, -4, -4, -11, 0, -6], '#eb9aac', INK, 1.4);
    circ(c, 0, 0, 8, '#f3aebd', INK, 1.6);
    ell(c, 7, 1.5, 3, 3.6, '#e88a9c', INK, 1.2);
    circ(c, 7.3, 0.3, 0.7, INK); circ(c, 7.3, 2.7, 0.7, INK);
    eye(c, 2, -2.5);
  },
  sheep(c) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      circ(c, Math.cos(a) * 6 - 1, Math.sin(a) * 5.5 - 1, 4, '#f4f1ea', INK, 1.1);
    }
    circ(c, -1, -1, 6, '#f4f1ea');
    ell(c, 4.5, 1.5, 4.5, 5.5, '#3b3236', INK, 1.2);
    eye(c, 5.5, 0, '#fff');
  },
  goat(c) {
    c.beginPath(); c.moveTo(-1, -6); c.quadraticCurveTo(-8, -14, -11, -5);
    c.strokeStyle = '#d9cfb3'; c.lineWidth = 3; c.stroke();
    ell(c, -6, -1, 4, 2, '#bba788', INK, 1, 0.4);
    circ(c, 0, 0, 7.5, '#cdbb9b', INK, 1.6);
    ell(c, 6, 2.5, 3.8, 3.2, '#bba788', INK, 1.2);
    poly(c, [3, 6, 7, 6, 5, 12], '#efe8d8', INK, 1);
    eye(c, 2.5, -2.5);
  },
  duck(c) {
    circ(c, 0, 0, 7.5, '#f6d44c', INK, 1.6);
    ell(c, 8.5, 1.5, 5, 2.3, '#f08c2a', INK, 1.2);
    eye(c, 2.5, -2);
    poly(c, [-2, -7, 0, -10, 1, -7], '#f6d44c', INK, 1);
  },
  horse(c) {
    for (let i = 0; i < 4; i++) ell(c, -5 + i * 2, -6 + i * 0.5, 2, 4, '#3a2418', null, 0, -0.3);
    poly(c, [-2, -6, 0, -12, 2, -6], '#9a6a3c', INK, 1.2);
    ell(c, 0, -1, 7, 7, '#9a6a3c', INK, 1.6);
    ell(c, 7, 2.5, 5, 4, '#b5875a', INK, 1.2);
    circ(c, 9.5, 2, 0.8, INK);
    eye(c, 2, -2.5);
  },
  rabbit(c) {
    ell(c, -3, -11, 2.6, 7, '#cfc6cf', INK, 1.3, -0.15); ell(c, -3, -11, 1.1, 5, '#f0b0c0', null, 0, -0.15);
    ell(c, 2, -12, 2.6, 7.5, '#cfc6cf', INK, 1.3, 0.15); ell(c, 2, -12, 1.1, 5.3, '#f0b0c0', null, 0, 0.15);
    circ(c, 0, 0, 7, '#d6ced6', INK, 1.6);
    circ(c, 6.6, 0.8, 1.5, '#e98aa0');
    eye(c, 2.5, -2);
  },
  donkey(c) {
    ell(c, -4, -10, 2.8, 8, '#8f8a94', INK, 1.3, -0.35); ell(c, 1, -11, 2.8, 8, '#8f8a94', INK, 1.3, 0.25);
    ell(c, -4, -10, 1.2, 5.5, '#4a4650', null, 0, -0.35);
    circ(c, 0, 0, 7.5, '#8f8a94', INK, 1.6);
    ell(c, 6.5, 2.5, 4.6, 3.8, '#d6d0d6', INK, 1.2);
    circ(c, 9, 2, 0.8, INK);
    eye(c, 2, -2.5);
  },
  lamb(c) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      circ(c, Math.cos(a) * 6 - 1, Math.sin(a) * 5.5 - 1, 4, '#f4f1ea', INK, 1.1);
    }
    circ(c, -1, -1, 6, '#f4f1ea');
    ell(c, 4.5, 1.5, 4.5, 5.5, '#141014', INK, 1.2);
    eye(c, 5.5, 0, '#e8e2ff');
    crown(c, 0, -8, 0.9, '#c8283a');
  },
};

function drawFollower(c, sp, x, y, face, t, o = {}) {
  const s = o.scale || 1;
  const mv = o.moving;
  const bob = mv ? Math.abs(Math.sin(t * 12)) * 1.8 : 0;
  c.save();
  c.translate(x, y);
  if (!o.noShadow) shadow(c, 0, 1, 10 * s, 3.5 * s);
  c.scale(face < 0 ? -s : s, s);
  if (o.alpha != null) c.globalAlpha = o.alpha;
  c.translate(0, -bob);
  const lp = mv ? Math.sin(t * 12) * 2.5 : 0;
  rrect(c, -5 + lp, -3, 4, 3.5, 1.5, '#2a2027');
  rrect(c, 1 - lp, -3, 4, 3.5, 1.5, '#2a2027');
  const robe = ROBE_COLORS[clamp((o.level || 1) - 1, 0, 4)];
  const pray = o.praying ? Math.sin(t * 5) * 0.12 : 0;
  c.rotate(pray);
  poly(c, [-9, -1, -6, -17, 6, -17, 9, -1], robe, INK, 1.6);
  line(c, 0, -16, 0, -2, 'rgba(0,0,0,.25)', 1.2);
  if (o.praying) {
    poly(c, [4, -12, 9, -22, 11, -21, 7, -11], robe, INK, 1.2);
  } else {
    poly(c, [4, -15, 9, -8, 7, -6, 3, -11], robe, INK, 1.2);
  }
  c.translate(1, -22);
  (HEADS[sp] || HEADS.chicken)(c, t);
  if (o.sick) { circ(c, -4, 4, 2, '#7ac74f'); }
  c.restore();
  if (o.dissent) {
    c.save(); c.translate(x, y - 40 * s);
    c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ff6a6a';
    c.fillText('!?', 0, Math.sin(t * 4) * 2);
    c.restore();
  }
}

// ---------------------------------------------------------------- Humans (heretics & bishops)
function drawHat(c, hat, t) {
  switch (hat) {
    case 'straw':
      ell(c, 0, -36, 13, 3.4, '#d9b85c', INK, 1.4);
      ell(c, 0, -39, 6.5, 4.5, '#d9b85c', INK, 1.4);
      line(c, -6, -37.5, 6, -37.5, '#a03030', 2);
      break;
    case 'chef':
      rrect(c, -6, -43, 12, 8, 2, '#f4f1ea', INK, 1.4);
      circ(c, -5, -45, 4.5, '#f4f1ea', INK, 1.3); circ(c, 0, -47, 5, '#f4f1ea', INK, 1.3); circ(c, 5, -45, 4.5, '#f4f1ea', INK, 1.3);
      rrect(c, -6, -40, 12, 4, 1, '#f4f1ea');
      break;
    case 'hood':
      poly(c, [-9, -26, -8, -38, 0, -44, 8, -38, 9, -26], '#3a2840', INK, 1.4);
      break;
    case 'bandana':
      poly(c, [-8, -34, 8, -34, 7, -38, -7, -38], '#7a1424', INK, 1.2);
      poly(c, [-8, -36, -13, -33, -11, -31], '#7a1424', INK, 1);
      break;
    case 'helm':
      rrect(c, -9, -42, 18, 14, 6, '#8d939c', INK, 1.6);
      line(c, 0, -42, 0, -30, '#5a6068', 1.5);
      rrect(c, 1, -36, 8, 2.5, 1, '#20161a');
      c.beginPath(); c.moveTo(0, -42); c.quadraticCurveTo(-8, -52 + Math.sin(t * 6), -14, -44);
      c.strokeStyle = '#c8283a'; c.lineWidth = 4; c.stroke();
      break;
    case 'witch':
      ell(c, 0, -35, 13, 3, '#2c3a28', INK, 1.4);
      poly(c, [-7, -36, 7, -36, 2, -48, -6, -58], '#2c3a28', INK, 1.4);
      line(c, -6, -38, 6, -38, '#8a5ad0', 2);
      break;
    case 'tophat':
      ell(c, 0, -36, 10, 2.5, '#1a1214', INK, 1.4);
      rrect(c, -6.5, -52, 13, 16, 1, '#1a1214', INK, 1.4);
      rrect(c, -6.5, -40, 13, 3, 0, '#7a1424');
      break;
    case 'grill': {
      rrect(c, -10, -46, 20, 10, 2, '#2a2a2e', INK, 1.4);
      for (let i = -7; i <= 7; i += 3.5) line(c, i, -46, i, -36, '#555', 1.2);
      for (let i = 0; i < 3; i++) {
        const fx = -6 + i * 6, fl = 7 + Math.sin(t * 10 + i * 2) * 2;
        poly(c, [fx - 3, -46, fx, -46 - fl, fx + 3, -46], i % 2 ? '#ffb02e' : '#ff5a1f');
      }
      break;
    }
    default: break;
  }
}

function drawWeapon(c, w, t, raise) {
  c.save();
  c.translate(8, -18);
  c.rotate(raise ? -1.1 : 0.15);
  switch (w) {
    case 'pitchfork':
      line(c, 0, 6, 0, -22, '#7a5130', 2.2);
      line(c, -4, -22, 4, -22, '#9aa0a8', 1.8);
      for (const dx of [-4, 0, 4]) line(c, dx, -22, dx, -29, '#9aa0a8', 1.6);
      break;
    case 'cleaver':
      line(c, 0, 4, 0, -6, '#5a3a20', 2.5);
      rrect(c, -2, -20, 11, 14, 2, '#c4cad2', INK, 1.4);
      break;
    case 'bigcleaver':
      line(c, 0, 6, 0, -8, '#5a3a20', 3);
      rrect(c, -3, -30, 17, 22, 3, '#c4cad2', INK, 1.6);
      circ(c, 9, -25, 2, '#20161a');
      line(c, 0, -14, 12, -18, 'rgba(200,40,58,.7)', 2);
      break;
    case 'sling':
      ell(c, 3, -6, 6, 2.8, '#8a4a2a', INK, 1.2, -0.5);
      break;
    case 'censer':
      line(c, 0, 0, 2, -10, '#7a6a5a', 1.2);
      circ(c, 2, -13, 4, '#6a5a4a', INK, 1.2);
      glow(c, 2, -18, 8, 'rgba(160,160,170,.5)');
      break;
    case 'ladle':
      line(c, 0, 6, 0, -22, '#7a6a5a', 2.2);
      ell(c, 0, -26, 6, 4.5, '#9aa0a8', INK, 1.4);
      break;
    case 'cane':
      line(c, 0, 8, 0, -16, '#20161a', 2.2);
      circ(c, 0, -17, 2.5, '#f0c35a', INK, 1);
      break;
    case 'tongs':
      line(c, -1, 4, -3, -16, '#9aa0a8', 2.2);
      line(c, 1, 4, 4, -16, '#9aa0a8', 2.2);
      ell(c, -3, -17, 2, 3, '#9aa0a8'); ell(c, 4, -17, 2, 3, '#9aa0a8');
      break;
    default: break;
  }
  c.restore();
}

function drawHuman(c, x, y, face, t, o = {}) {
  const s = o.scale || 1;
  const mv = o.moving;
  const bob = mv ? Math.abs(Math.sin(t * 11)) * 1.5 : 0;
  c.save();
  c.translate(x, y);
  if (!o.noShadow) shadow(c, 0, 1, 11 * s, 4 * s);
  c.scale(face < 0 ? -s : s, s);
  if (o.flash) c.globalAlpha = 0.55;
  if (o.alpha != null) c.globalAlpha *= o.alpha;
  c.translate(0, -bob);
  const lp = mv ? Math.sin(t * 11) * 3 : 0;
  rrect(c, -6 + lp, -11, 5, 11, 2, o.pants || '#3a3440', INK, 1.3);
  rrect(c, 1 - lp, -11, 5, 11, 2, o.pants || '#3a3440', INK, 1.3);
  const bw = o.belly ? 21 : 17;
  rrect(c, -bw / 2, -27, bw, 18, 5, o.shirt || '#6a4a3a', INK, 1.6);
  if (o.apron) {
    rrect(c, -bw / 2 + 3, -24, bw - 6, 15, 3, o.apron, INK, 1.2);
    circ(c, -1, -16, 1.8, '#a32030'); circ(c, 3, -20, 1.2, '#a32030'); circ(c, 1, -13, 1, '#a32030');
  }
  if (o.extraArms) {
    for (let i = 0; i < 2; i++) {
      c.save(); c.translate(0, -22 + i * 6); c.rotate(-0.8 + i * 0.6 + Math.sin(t * 6 + i) * 0.25);
      line(c, 0, 0, 16, 0, o.shirt || '#2b2233', 4);
      rrect(c, 15, -6, 3, 8, 1, '#c4cad2', INK, 1);
      c.restore();
      c.save(); c.translate(-2, -22 + i * 6); c.rotate(Math.PI + 0.8 - i * 0.6 - Math.sin(t * 6 + i) * 0.25);
      line(c, 0, 0, 16, 0, o.shirt || '#2b2233', 4);
      rrect(c, 15, -2, 3, 8, 1, '#c4cad2', INK, 1);
      c.restore();
    }
  }
  // head
  circ(c, 0, -31, 8, o.skin || '#e2b28f', INK, 1.6);
  if (o.hat === 'hood') drawHat(c, 'hood', t);
  // eyes: always that heretic glow
  const ec = o.eyeCol || '#ff3040';
  if (o.manyEyes) {
    for (const [ex, ey] of [[2, -34], [5.5, -34], [3.5, -30.5], [6.5, -30.5], [1, -30.5]]) circ(c, ex, ey, 1.2, ec);
  } else {
    circ(c, 2.5, -32, 1.4, ec); circ(c, 6, -32, 1.4, ec);
  }
  if (o.mustache) poly(c, [1, -28, 7, -28, 9, -25, 4, -27, -1, -25], '#3a2418');
  if (o.monocle) { circ(c, 6, -32, 2.6, null, '#f0c35a', 1); line(c, 6, -29.5, 4, -24, '#f0c35a', 0.8); }
  if (o.cigar) {
    rrect(c, 6, -28.5, 7, 2.2, 1, '#6a3a20');
    circ(c, 13, -27.5, 1.2, '#ff8a2a');
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.6 + i / 3) % 1;
      circ(c, 14 + p * 6, -30 - p * 16, 2 + p * 4, `rgba(180,180,190,${0.5 * (1 - p)})`);
    }
  }
  if (o.hat && o.hat !== 'hood') drawHat(c, o.hat, t);
  drawWeapon(c, o.weapon, t, o.windup);
  c.restore();
  if (o.windup) {
    c.save(); c.translate(x, y - 50 * s);
    c.font = `bold ${14 + 4 * s}px sans-serif`; c.textAlign = 'center';
    c.fillStyle = '#ff3040'; c.strokeStyle = INK; c.lineWidth = 3;
    c.strokeText('!', 0, 0); c.fillText('!', 0, 0);
    c.restore();
  }
}

const ENEMY_LOOKS = {
  farmhand: { skin: '#e2b28f', shirt: '#6e7a3a', pants: '#3a4a6a', hat: 'straw', weapon: 'pitchfork' },
  butcher: { skin: '#d9a07a', shirt: '#7a2a2a', apron: '#ece6dc', hat: 'chef', weapon: 'cleaver', belly: true },
  slinger: { skin: '#cfa07e', shirt: '#4a3a5a', hat: 'hood', weapon: 'sling' },
  smoker: { skin: '#b89070', shirt: '#3a3a3a', hat: 'bandana', weapon: 'censer', mustache: true },
};

const BOSS_LOOKS = {
  sirloin: { skin: '#e2b28f', shirt: '#7d8590', pants: '#4a4f58', hat: 'helm', weapon: 'bigcleaver', mustache: true },
  brisket: { skin: '#9fb36b', shirt: '#3f5a3a', apron: '#d8cfa8', hat: 'witch', weapon: 'ladle', eyeCol: '#d0ff5a' },
  rump: { skin: '#e7a98a', shirt: '#5a2b2b', hat: 'tophat', weapon: 'cane', monocle: true, cigar: true, belly: true, mustache: true },
  chuck: { skin: '#c9c2b5', shirt: '#2b2233', pants: '#1a1420', hat: 'hood', weapon: 'cleaver', extraArms: true, manyEyes: true },
  grills: { skin: '#3a1a1e', shirt: '#1a0d10', pants: '#0e0708', apron: '#3a1a1a', hat: 'grill', weapon: 'tongs', eyeCol: '#ffb02e', belly: true },
};

function drawFly(c, x, y, t, o = {}) {
  c.save(); c.translate(x, y);
  shadow(c, 0, 10, 6, 2);
  const hover = Math.sin(t * 8) * 2;
  c.translate(0, -8 + hover);
  if (o.flash) c.globalAlpha = 0.55;
  const w = Math.sin(t * 60) * 0.5;
  ell(c, -4, -5, 5, 3, 'rgba(220,230,255,.55)', INK, 0.8, -0.6 + w);
  ell(c, 4, -5, 5, 3, 'rgba(220,230,255,.55)', INK, 0.8, 0.6 - w);
  ell(c, 0, 0, 6, 5, '#2a3a2a', INK, 1.4);
  circ(c, -2.5, -1, 1.8, '#ff3040'); circ(c, 2.5, -1, 1.8, '#ff3040');
  c.restore();
}

function drawEnemy(c, e, t) {
  const o = { flash: e.flash > 0, moving: e.moving, windup: e.state === 'windup', alpha: e.spawnT > 0 ? 0.35 : 1 };
  if (e.type === 'fly') { drawFly(c, e.x, e.y, t + e.seed, o); return; }
  drawHuman(c, e.x, e.y, e.face, t + e.seed, Object.assign({}, ENEMY_LOOKS[e.type], o));
}

function drawBoss(c, key, x, y, face, t, o = {}) {
  const look = Object.assign({}, BOSS_LOOKS[key], o, { scale: o.scale || 2 });
  if (key === 'grills') {
    glow(c, x, y - 40 * look.scale / 2, 60 * look.scale / 2, 'rgba(255,90,30,.35)');
  }
  if (key === 'brisket' && !o.noShadow) {
    // her brine cauldron trails along
    c.save(); c.translate(x - 26 * face, y);
    ell(c, 0, -8, 13, 9, '#2a2a2e', INK, 1.6);
    ell(c, 0, -15, 12, 3.5, '#6aa84f');
    for (let i = 0; i < 2; i++) { const p = (t + i * 0.5) % 1; circ(c, -4 + i * 7, -17 - p * 10, 2 + p * 2, `rgba(140,220,110,${1 - p})`); }
    c.restore();
  }
  drawHuman(c, x, y, face, t, look);
}

// ---------------------------------------------------------------- Projectiles & pickups
function drawProjectile(c, p, t) {
  switch (p.kind) {
    case 'sausage': {
      c.save(); c.translate(p.x, p.y); c.rotate(t * 10 + p.seed);
      rrect(c, -7, -3.5, 14, 7, 3.5, '#9a4a2a', INK, 1.4);
      line(c, -3, -1, 3, -1, 'rgba(255,255,255,.35)', 1);
      c.restore(); break;
    }
    case 'smoke':
      glow(c, p.x, p.y, p.r * 2.2, 'rgba(150,110,170,.45)');
      circ(c, p.x, p.y, p.r, '#6a5070', INK, 1.4);
      circ(c, p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.35, 'rgba(255,255,255,.35)');
      break;
    case 'fire':
      glow(c, p.x, p.y, p.r * 2.5, 'rgba(255,120,30,.55)');
      circ(c, p.x, p.y, p.r, '#ffb02e', '#a83a10', 1.4);
      circ(c, p.x, p.y, p.r * 0.45, '#fff2b0');
      break;
    case 'brine':
      glow(c, p.x, p.y, p.r * 2.2, 'rgba(120,220,90,.4)');
      circ(c, p.x, p.y, p.r, '#7ac74f', '#2a5a1a', 1.4);
      circ(c, p.x - 2, p.y - 2, p.r * 0.35, 'rgba(255,255,255,.5)');
      break;
    default:
      circ(c, p.x, p.y, p.r, '#ff3040', INK, 1.4);
  }
}

function drawPickup(c, p, t) {
  const b = Math.sin(t * 5 + p.seed) * 2;
  shadow(c, p.x, p.y + 4, 5, 2);
  c.save(); c.translate(p.x, p.y - 4 + b);
  if (p.kind === 'grass') {
    for (const [dx, h, a] of [[-3, 8, -0.3], [0, 10, 0], [3, 8, 0.3]]) {
      c.save(); c.rotate(a); poly(c, [dx - 1.6, 3, dx, -h, dx + 1.6, 3], '#6cc24a', INK, 1); c.restore();
    }
  } else if (p.kind === 'hay') {
    rrect(c, -7, -5, 14, 9, 3, '#e8c05a', INK, 1.3);
    line(c, -2, -5, -2, 4, '#a8741e', 1.5); line(c, 3, -5, 3, 4, '#a8741e', 1.5);
  } else if (p.kind === 'heart') {
    c.font = '16px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('❤️', 0, 0);
  }
  c.restore();
}

// ---------------------------------------------------------------- Props
function drawSigil(c, x, y, r, col, lw = 2) {
  c.save(); c.translate(x, y); c.strokeStyle = col; c.lineWidth = lw;
  c.beginPath(); c.ellipse(0, 0, r, r * 0.55, 0, 0, TAU); c.stroke();
  c.beginPath(); c.ellipse(0, 0, r * 0.75, r * 0.4, 0, 0, TAU); c.stroke();
  // horns
  c.beginPath(); c.moveTo(-r * 0.25, -r * 0.05); c.quadraticCurveTo(-r * 0.6, -r * 0.1, -r * 0.55, -r * 0.35); c.stroke();
  c.beginPath(); c.moveTo(r * 0.25, -r * 0.05); c.quadraticCurveTo(r * 0.6, -r * 0.1, r * 0.55, -r * 0.35); c.stroke();
  c.beginPath(); c.ellipse(0, 0.05 * r, r * 0.22, r * 0.18, 0, 0, TAU); c.stroke();
  c.restore();
}

function drawCandle(c, x, y, t, h = 10) {
  rrect(c, x - 2.5, y - h, 5, h, 1, '#efe6d0', INK, 1);
  const f = Math.sin(t * 12 + x) * 0.8;
  glow(c, x, y - h - 4, 14, 'rgba(255,190,90,.45)');
  ell(c, x + f * 0.4, y - h - 4, 2, 4 + f * 0.6, '#ffb02e');
  ell(c, x + f * 0.4, y - h - 3, 1, 2, '#fff2b0');
}

function drawShrine(c, x, y, t, o = {}) {
  c.save(); c.translate(x, y);
  if (o.ready) glow(c, 0, -40, 60, 'rgba(240,195,90,.35)', 0.6 + Math.sin(t * 3) * 0.3);
  shadow(c, 0, 0, 30, 9);
  drawSigil(c, 0, 2, 44, 'rgba(200,40,58,.55)', 2);
  rrect(c, -24, -14, 48, 14, 3, '#5a5560', INK, 2);
  rrect(c, -11, -44, 22, 32, 3, '#6a6570', INK, 2);
  line(c, -6, -38, -6, -18, 'rgba(0,0,0,.2)', 2);
  // golden cow head idol
  c.translate(0, -56);
  c.beginPath(); c.moveTo(-6, -4); c.quadraticCurveTo(-16, -10, -13, -20);
  c.strokeStyle = '#f6e7b0'; c.lineWidth = 3.5; c.stroke();
  c.beginPath(); c.moveTo(6, -4); c.quadraticCurveTo(16, -10, 13, -20); c.stroke();
  ell(c, 0, 0, 12, 11, '#e0b03a', INK, 2);
  ell(c, 0, 6, 8, 5, '#c8962a', INK, 1.4);
  circ(c, -3, 6, 1, INK); circ(c, 3, 6, 1, INK);
  circ(c, -5, -2, 2, '#ff3040'); circ(c, 5, -2, 2, '#ff3040');
  crown(c, 0, -9, 1, '#c8283a');
  c.restore();
  drawCandle(c, x - 30, y - 2, t, 12);
  drawCandle(c, x + 30, y - 2, t, 10);
  drawCandle(c, x - 20, y + 10, t, 7);
  drawCandle(c, x + 21, y + 9, t, 8);
}

function drawTemple(c, x, y, t) {
  c.save(); c.translate(x, y);
  shadow(c, 0, 0, 44, 10);
  rrect(c, -36, -44, 72, 44, 3, '#6b4a35', INK, 2);
  for (let i = -30; i < 36; i += 10) line(c, i, -42, i, -2, 'rgba(0,0,0,.18)', 1.5);
  poly(c, [-44, -42, 0, -80, 44, -42], '#5a1a24', INK, 2);
  poly(c, [-36, -44, 0, -74, 36, -44], '#7a2430');
  // steeple sigil
  line(c, 0, -80, 0, -92, INK, 2);
  ell(c, 0, -96, 6, 5, '#f0c35a', INK, 1.5);
  c.beginPath(); c.moveTo(-3, -98); c.quadraticCurveTo(-9, -101, -8, -106);
  c.strokeStyle = '#f0c35a'; c.lineWidth = 2; c.stroke();
  c.beginPath(); c.moveTo(3, -98); c.quadraticCurveTo(9, -101, 8, -106); c.stroke();
  // door
  c.beginPath(); c.moveTo(-10, 0); c.lineTo(-10, -22); c.arc(0, -22, 10, Math.PI, 0); c.lineTo(10, 0); c.closePath();
  c.fillStyle = '#1a0d10'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
  glow(c, 0, -12, 16, 'rgba(255,120,60,.35)', 0.7 + Math.sin(t * 2) * 0.2);
  // banners
  for (const bx of [-26, 18]) {
    rrect(c, bx, -38, 8, 22, 1, '#c8283a', INK, 1.2);
    poly(c, [bx, -16, bx + 4, -12, bx + 8, -16], '#c8283a');
    circ(c, bx + 4, -30, 2, '#f0c35a');
  }
  c.restore();
}

function drawTrough(c, x, y, food, t) {
  c.save(); c.translate(x, y);
  shadow(c, 0, 0, 24, 6);
  line(c, -16, 0, -16, -8, '#5a3820', 3); line(c, 16, 0, 16, -8, '#5a3820', 3);
  poly(c, [-22, -18, 22, -18, 18, -6, -18, -6], '#8a5a34', INK, 2);
  if (food > 0) {
    const h = Math.min(6, 2 + food);
    ell(c, 0, -18, 19, 3 + h * 0.3, '#e8c05a', INK, 1);
    for (let i = 0; i < 7; i++) line(c, -14 + i * 4.5, -18, -12 + i * 4.5 + Math.sin(i) * 2, -19 - h, '#c89a3a', 1.2);
  } else {
    ell(c, 0, -18, 19, 3, '#3a2414', INK, 1);
  }
  line(c, -20, -12, 20, -12, 'rgba(0,0,0,.25)', 1.5);
  c.restore();
}

function drawField(c, x, y, w, h, growth, t) {
  c.save(); c.translate(x, y);
  rrect(c, -w / 2, -h / 2, w, h, 6, '#4a3020', INK, 2);
  const rows = 3, cols = 6;
  const ready = growth >= 1;
  for (let r = 0; r < rows; r++) {
    const ry = -h / 2 + (r + 0.75) * (h / rows);
    line(c, -w / 2 + 6, ry + 2, w / 2 - 6, ry + 2, '#3a2416', 2);
    for (let i = 0; i < cols; i++) {
      const sx = -w / 2 + (i + 0.5) * (w / cols);
      const sh = 3 + growth * 14;
      const sway = Math.sin(t * 2 + i + r) * 1.5 * growth;
      const col = ready ? '#e8c05a' : growth > 0.5 ? '#9ab84a' : '#6aa04a';
      line(c, sx - 2, ry, sx - 3 + sway, ry - sh, col, 2);
      line(c, sx + 1, ry, sx + 2 + sway, ry - sh * 0.85, col, 2);
      if (ready) ell(c, sx - 3 + sway, ry - sh, 2, 3.5, '#f6d57a');
    }
  }
  // fence
  line(c, -w / 2 - 4, h / 2 + 3, w / 2 + 4, h / 2 + 3, '#7a5130', 3);
  for (let i = 0; i <= 4; i++) { const fx = -w / 2 - 4 + i * ((w + 8) / 4); line(c, fx, h / 2 + 6, fx, h / 2 - 6, '#7a5130', 3); }
  c.restore();
}

function drawGate(c, x, y, t) {
  c.save(); c.translate(x, y);
  shadow(c, 0, 2, 36, 8);
  const g = c.createRadialGradient(0, -26, 2, 0, -26, 28);
  g.addColorStop(0, '#ffb0a0'); g.addColorStop(0.3, '#e0283a'); g.addColorStop(1, '#2a0510');
  c.beginPath(); c.ellipse(0, -26, 19, 25, 0, 0, TAU); c.fillStyle = g; c.fill();
  c.save(); c.beginPath(); c.ellipse(0, -26, 19, 25, 0, 0, TAU); c.clip();
  for (let i = 0; i < 3; i++) {
    c.beginPath(); c.arc(0, -26, 6 + i * 6, t * (2 + i) + i, t * (2 + i) + i + 2.5);
    c.strokeStyle = 'rgba(255,220,200,.45)'; c.lineWidth = 2; c.stroke();
  }
  c.restore();
  rrect(c, -30, -58, 10, 58, 2, '#4a4450', INK, 2);
  rrect(c, 20, -58, 10, 58, 2, '#4a4450', INK, 2);
  poly(c, [-34, -56, 0, -72, 34, -56, 34, -50, -34, -50], '#3a3440', INK, 2);
  ell(c, 0, -62, 6, 5, '#c8283a', INK, 1.4);
  glow(c, 0, -26, 50, 'rgba(224,40,58,.3)', 0.6 + Math.sin(t * 2.5) * 0.3);
  c.restore();
}

function drawPie(c, x, y, t) {
  shadow(c, x, y + 1, 7, 2.5);
  ell(c, x, y - 2, 7, 3.5, '#5a3a1e', INK, 1.2);
  ell(c, x, y - 5, 5, 2.8, '#6a4424', INK, 1.1);
  ell(c, x, y - 7.5, 2.8, 2, '#7a5030', INK, 1);
  for (let i = 0; i < 2; i++) {
    const p = (t * 0.7 + i * 0.5) % 1;
    c.save(); c.globalAlpha = 1 - p;
    c.beginPath(); c.moveTo(x - 3 + i * 6, y - 10 - p * 12);
    c.quadraticCurveTo(x + 2 + i * 6, y - 14 - p * 12, x - 3 + i * 6, y - 18 - p * 12);
    c.strokeStyle = '#8ac04a'; c.lineWidth = 1.4; c.stroke(); c.restore();
  }
}

function drawRat(c, x, y, face, t) {
  c.save(); c.translate(x, y); c.scale(face < 0 ? -1 : 1, 1);
  shadow(c, 0, 0, 10, 3);
  c.beginPath(); c.moveTo(-8, -4); c.quadraticCurveTo(-18, -2, -16, -12 + Math.sin(t * 3) * 2);
  c.strokeStyle = '#d88a9a'; c.lineWidth = 2; c.stroke();
  poly(c, [-8, 0, -6, -16, 6, -16, 8, 0], '#5a2a3a', INK, 1.5);
  circ(c, 0, -22, 7, '#9a929e', INK, 1.5);
  circ(c, -4, -29, 3.5, '#9a929e', INK, 1.3); circ(c, -4, -29, 1.8, '#e8a0b0');
  ell(c, 6, -21, 4, 2.5, '#9a929e', INK, 1.2);
  circ(c, 9.5, -21, 1.3, '#e8a0b0');
  eye(c, 2.5, -24);
  ell(c, 0, -29, 9, 2.2, '#c9a24a', INK, 1.2);
  ell(c, 0, -31, 5, 3, '#c9a24a', INK, 1.2);
  c.restore();
}

function drawStall(c, x, y, t) {
  c.save(); c.translate(x, y);
  shadow(c, 0, 0, 30, 7);
  line(c, -24, 0, -24, -42, '#5a3820', 3); line(c, 24, 0, 24, -42, '#5a3820', 3);
  c.restore();
  drawRat(c, x, y - 4, -1, t);
  c.save(); c.translate(x, y);
  rrect(c, -26, -14, 52, 14, 2, '#7a5130', INK, 2);
  rrect(c, -18, -20, 10, 7, 2, '#e8c05a', INK, 1); rrect(c, 6, -21, 12, 8, 2, '#e8c05a', INK, 1);
  for (let i = 0; i < 6; i++) {
    poly(c, [-28 + i * 9.33, -42, -28 + (i + 1) * 9.33, -42, -28 + (i + 1) * 9.33, -36, -28 + (i + 0.5) * 9.33, -33, -28 + i * 9.33, -36], i % 2 ? '#f4efe6' : '#c8283a', INK, 1);
  }
  c.restore();
}

function drawTree(c, x, y, s, col, t) {
  c.save(); c.translate(x, y); c.scale(s, s);
  shadow(c, 0, 0, 16, 5);
  rrect(c, -4, -18, 8, 18, 2, '#3a2418', INK, 1.5);
  const sw = Math.sin(t * 0.8 + x) * 1.2;
  circ(c, -9 + sw, -24, 11, col, INK, 1.6);
  circ(c, 9 + sw, -24, 11, col, INK, 1.6);
  circ(c, sw, -36, 13, col, INK, 1.6);
  circ(c, sw - 3, -39, 4, 'rgba(255,255,255,.1)');
  c.restore();
}

function drawObstacle(c, kind, x, y, r, t) {
  shadow(c, x, y + r * 0.35, r * 1.05, r * 0.4);
  c.save(); c.translate(x, y);
  switch (kind) {
    case 'hay':
      rrect(c, -r, -r * 1.2, r * 2, r * 1.5, r * 0.4, '#d9ae4a', INK, 2);
      line(c, -r * 0.4, -r * 1.2, -r * 0.4, r * 0.3, '#a8741e', 2);
      line(c, r * 0.4, -r * 1.2, r * 0.4, r * 0.3, '#a8741e', 2);
      break;
    case 'reeds':
      ell(c, 0, 0, r, r * 0.45, '#2a4a3a', INK, 1.5);
      for (let i = 0; i < 6; i++) {
        const rx = -r * 0.7 + i * r * 0.28, h = r * (1.2 + (i % 3) * 0.35);
        line(c, rx, 0, rx + Math.sin(t + i) * 2, -h, '#5a8a3a', 2.4);
        ell(c, rx + Math.sin(t + i) * 2, -h, 1.8, 4, '#6a3a20');
      }
      break;
    case 'barrel':
      rrect(c, -r * 0.85, -r * 1.6, r * 1.7, r * 1.75, r * 0.3, '#7a4a28', INK, 2);
      line(c, -r * 0.85, -r * 1.2, r * 0.85, -r * 1.2, '#3a3440', 2.5);
      line(c, -r * 0.85, -r * 0.3, r * 0.85, -r * 0.3, '#3a3440', 2.5);
      ell(c, 0, -r * 1.6, r * 0.85, r * 0.3, '#8a5a34', INK, 1.5);
      break;
    case 'bones':
      ell(c, 0, -r * 0.2, r, r * 0.6, '#3a2a30', INK, 1.5);
      for (let i = 0; i < 4; i++) {
        c.save(); c.rotate(i * 0.8 - 1.2);
        rrect(c, -r * 0.7, -r * 0.5 - 2, r * 1.4, 4, 2, '#e8dcc0', INK, 1);
        circ(c, -r * 0.7, -r * 0.5 - 2, 2.5, '#e8dcc0'); circ(c, r * 0.7, -r * 0.5 + 2, 2.5, '#e8dcc0');
        c.restore();
      }
      circ(c, 0, -r * 0.6, r * 0.38, '#e8dcc0', INK, 1.2);
      circ(c, -r * 0.13, -r * 0.65, 1.6, INK); circ(c, r * 0.13, -r * 0.65, 1.6, INK);
      break;
    default:
      ell(c, 0, -r * 0.4, r, r * 0.8, '#5a5560', INK, 2);
  }
  c.restore();
}

function drawPost(c, x, y, t) {
  shadow(c, x, y, 10, 3);
  rrect(c, x - 3, y - 38, 6, 38, 1, '#5a3820', INK, 1.5);
  line(c, x - 9, y - 26, x + 9, y - 22, '#c9a24a', 2);
  line(c, x - 9, y - 18, x + 9, y - 14, '#c9a24a', 2);
}
