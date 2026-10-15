'use strict';
// The Void: cutscenes with The One Who Grills (intro, chain breaks, the final betrayal, the ending).

const VoidScene = {
  name: 'void',
  controls: 'none',
  alwaysUpdate: true,
  t: 0,

  enter(params) {
    this.mode = params.mode;
    this.params = params;
    this.t = 0;
    this.flash = 0;
    this.black = params.mode === 'intro' ? 1 : 0;
    this.blackTarget = this.black;
    this.grillsA = params.mode === 'intro' ? 0 : 1;
    this.grillsTarget = this.grillsA;
    this.chains = S.bosses.filter(Boolean).length;
    this.kneel = true;
    this.motes = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), s: rand(0.5, 2), v: rand(0.02, 0.08) }));
    setTimeout(() => this.run(), 600);
  },

  exit() {},

  run() {
    const G = 'The One Who Grills';
    if (this.mode === 'intro') {
      UI.dialog([
        ['', 'In a land where every beast was raised for the table...'],
        ['', '...a prophecy foretold of the Last Cow: a cow who would never, ever be eaten.'],
        ['', 'The four Butcher Bishops could not allow this.'],
        ['', '*THWACK*', () => { Sfx.chop(); this.flash = 1; Game.shake = 14; }],
        ['', '...', () => { this.blackTarget = 0; this.grillsTarget = 1; }],
        ['???', 'Ah. You\'ve arrived. Fresh... so very, very fresh.'],
        [G, 'I am The One Who Grills. Bound in these chains by the Butcher Bishops, I have waited. And waited. For one such as you.'],
        [G, 'I offer you a second life, little calf. Return to the mortal pasture. Start a cult in my name. Gather the lost beasts and make them believe.'],
        [G, 'Then slay the four Bishops who bind me: Sir Loin, Lady Brisket, Baron Rump Roast, and Chuck the Eternal.'],
        [G, 'Take this crown. It marks you as my Prime Cut.'],
        [G, '...My Chosen One. I said Chosen One.'],
        ['You', 'Moo.'],
        [G, 'Splendid. Now GO.', () => { this.flash = 1; Sfx.roar(); }],
      ], () => {
        S.started = true;
        const first = makeFollower('chicken', 'Clucksworth');
        first.faith = 70;
        S.followers.push(first);
        saveGame();
        UI.fade(() => Game.setScene(Base, { after: () => Base.tutorial() }));
      });
    } else if (this.mode === 'chain') {
      const r = this.params.realm;
      const b = BOSSES[REALMS[r].boss];
      const left = 4 - this.chains;
      UI.dialog([
        ['', `A chain shatters in the dark. ${b.name} is no more.`, () => { Sfx.chop(); this.flash = 0.8; Game.shake = 10; }],
        [G, pick([
          'Delicious. I mean... delightful. Well done. I mean... good job.',
          'Ahh, I can feel my strength returning. And my appetite. Mostly my strength.',
          'Excellent work, my little calf. You are really... marinating into the role.',
        ])],
        [G, left > 0 ? `${left} chain${left > 1 ? 's' : ''} remain${left > 1 ? '' : 's'}. Grow your flock. Go deeper.` : 'All four chains are broken. When you are ready... come to me. Through the Red Gate. I will be waiting. I\'m great at waiting.'],
      ], () => UI.fade(() => Game.setScene(Base, { after: this.params.after })));
    } else if (this.mode === 'final') {
      this.chains = 4;
      UI.dialog([
        [G, 'At last. The chains are broken. Come closer, little calf. Closer...'],
        [G, 'Closer to the GRILL.', () => { this.flash = 1; Sfx.roar(); Game.shake = 12; }],
        [G, 'Did you truly believe I raised you out of KINDNESS? You are the Last Cow. The finest cut in all the world.'],
        [G, 'I have waited CENTURIES for this barbecue. I have preheated for three hundred years. Do you know what that does to an electric bill?'],
        ['You', 'Moo.'],
        [G, '...Yes. Well. Prepare to be TENDERIZED!'],
      ], () => UI.fade(() => Game.setScene(Crusade, { realm: 4 })));
    } else if (this.mode === 'ending') {
      this.grillsTarget = 0;
      for (const f of S.followers) f.faith = 100;
      UI.dialog([
        ['', 'The fires of The One Who Grills sputter... and go out.', () => { Sfx.chop(); this.flash = 1; }],
        ['', 'The Last Cow stands alone in the void, crown askew, bell ringing softly.'],
        ['You', 'Moo.'],
        ['', 'And the void, for the first time in a thousand years, moos back.', () => Sfx.moo(0.7, 1.4)],
        ['', 'THE END. Your cult endures, grateful and slightly confused. Every follower\'s faith is restored.'],
        ['', 'Thank you for playing Cult of the Cow!'],
      ], () => {
        saveGame();
        UI.fade(() => Game.setScene(Base, {
          after: () => UI.menu({
            title: '🐮 You Won!',
            html: `<p>You defeated all four Butcher Bishops and The One Who Grills himself.</p>
              <div class="statgrid"><span>Days</span><b>${S.day}</b><span>Crusades</span><b>${S.runs}</b><span>Heretics bonked</span><b>${S.stats.kills}</b><span>Souls rescued</span><b>${S.stats.rescued}</b><span>Followers now</span><b>${S.followers.length}</b></div>
              <p>Your cult lives on. Keep crusading, keep preaching, keep mooing.</p>`,
            options: [{ icon: '🐄', label: 'Moo on', cls: 'primary', action: () => UI.closeMenu() }],
          }),
        }));
      });
    }
  },

  update(dt) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 1.5);
    this.black = lerp(this.black, this.blackTarget, Math.min(1, dt * 2));
    this.grillsA = lerp(this.grillsA, this.grillsTarget, Math.min(1, dt * (this.mode === 'ending' ? 0.5 : 1.5)));
    for (const m of this.motes) { m.y -= m.v * dt; if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); } }
  },

  draw(c) {
    const W = Game.W, H = Game.H, t = this.t;
    const g = c.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H * 0.45, Math.max(W, H) * 0.75);
    g.addColorStop(0, '#4a0c18'); g.addColorStop(0.5, '#1e0408'); g.addColorStop(1, '#070103');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (const m of this.motes) {
      c.save(); c.globalAlpha = 0.5;
      circ(c, m.x * W + Math.sin(t + m.y * 10) * 6, m.y * H, m.s, '#ff8a5a');
      c.restore();
    }
    c.save(); c.globalAlpha = 0.18; c.translate(W / 2, H * 0.8); c.rotate(t * 0.05);
    drawSigil(c, 0, 0, Math.min(W, H) * 0.42, '#c8283a', 3);
    c.restore();

    const portrait = H > W;
    const gx = W / 2, gy = portrait ? H * 0.5 : H * 0.62;
    const gs = portrait ? 3.8 : 2.6;
    if (this.grillsA > 0.01) {
      c.save(); c.globalAlpha = this.grillsA;
      // chains
      const anchors = [[0, H * 0.15], [W, H * 0.15], [0, H * 0.6], [W, H * 0.6]];
      anchors.forEach(([ax, ay], i) => {
        if (i < this.chains) return;
        const tx = gx + (ax < W / 2 ? -30 : 30), ty = gy - 26 * gs + (ay < H / 2 ? 0 : 40);
        const n = 14;
        for (let k = 0; k <= n; k++) {
          const x = lerp(ax, tx, k / n), y = lerp(ay, ty, k / n) + Math.sin((k / n) * Math.PI) * 20;
          ell(c, x, y, 6, 3.5, null, '#6a6570', 2.5, (k % 2) * 1.2 + Math.atan2(ty - ay, tx - ax));
        }
      });
      drawBoss(c, 'grills', gx, gy, 1, t, { scale: gs });
      c.restore();
    }
    drawCow(c, portrait ? W / 2 : W * 0.2, portrait ? H * 0.66 : H * 0.62, 1, t, { scale: 1.6, kneel: this.kneel });

    if (this.black > 0.01) { c.fillStyle = `rgba(0,0,0,${this.black})`; c.fillRect(0, 0, W, H); }
    if (this.flash > 0.01) { c.fillStyle = `rgba(255,240,230,${this.flash})`; c.fillRect(0, 0, W, H); }
  },
};
