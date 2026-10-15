'use strict';
// All game content: species, names, realms, enemies, bishops, blessings, rituals, lines.

const DAY_LEN = 240; // seconds per in-game day

const SPECIES = {
  chicken: { label: 'Chicken', names: ['Clucksworth', 'Eggbert', 'Henrietta', 'Chickpea', 'Nugget', 'Drumstick', 'Sir Pecks'] },
  pig: { label: 'Pig', names: ['Hamlet', 'Porkchop', 'Sir Oinksalot', 'Truffles', 'Pigasus', 'Bacon (Please No)', 'Snoutbert'] },
  sheep: { label: 'Sheep', names: ['Baa-rbara', 'Woolfgang', 'Fleecy', 'Mutton', 'Ewe-gene', 'Shearlock'] },
  goat: { label: 'Goat', names: ['Goatlieb', 'Billy', 'Gruff', 'Kidd', 'Goat Malone', 'Vincent van Goat'] },
  duck: { label: 'Duck', names: ['Quackers', 'Mallard', 'Duckworth', 'Waddles', 'Bill', 'Orange Sauce'] },
  horse: { label: 'Horse', names: ['Neigh-thaniel', 'Hay-ley', 'Clip-Clop', 'Colt Cobain', 'Mare-y Poppins'] },
  rabbit: { label: 'Rabbit', names: ['Bun Jovi', 'Hopkins', 'Hare-iet', 'Carrot Top', 'Bunsen'] },
  donkey: { label: 'Donkey', names: ['Hee-Haw-ard', 'Donk', 'Burro-ito', 'Jackie', 'Assisi'] },
  lamb: { label: 'Lamb', names: ['Lambert'] },
};
const SPECIES_WEIGHTS = [['chicken', 10], ['pig', 10], ['sheep', 10], ['goat', 9], ['duck', 9], ['horse', 7], ['rabbit', 8], ['donkey', 7], ['lamb', 1.5]];

const ROBE_COLORS = ['#6d5a4a', '#8a2a36', '#34507e', '#5e3a86', '#c8962a'];

const THOUGHTS = {
  happy: [
    'Praise the Udder!',
    'I used to think grass was just grass. Now I know it is HOLY grass.',
    'Moo. I don\'t know why I said that. It felt right.',
    'Is it weird that we all wear robes? ...No? Okay. Cool. Cool cool cool.',
    'I have never felt so spiritually pasteurized.',
    'The Cow spoke to me today. It said "moo." I wept.',
    'Our leader has a CROWN. Have you ever seen a cow with a crown? Exactly.',
    'They call it a cult. I call it a herd with benefits.',
    'I tithed my grain today. All of it. I feel lighter.',
    'Got milk? I mean that spiritually.',
  ],
  hungry: [
    'My tummy is louder than my prayers.',
    'Is the hay... communal? Asking for me.',
    'I would worship SO much harder with a snack.',
    'If I don\'t eat soon I\'m going to start eyeing the trough wood.',
  ],
  doubt: [
    'Lately I\'ve been wondering if our leader is just... a cow.',
    'The farmer down the road has a petting zoo. With benefits. And snacks.',
    'I\'m not saying I\'m leaving. I\'m saying I looked at the gate.',
    'Has anyone else noticed the poop situation?',
  ],
  poop: [
    'Someone needs to deal with the... offerings.',
    'It smells like holy ground. And not in a good way.',
  ],
  lamb: [
    'I started a cult once. It got... complicated. Something about a crown.',
    'You remind me of myself. Except bigger. And moo-ier.',
    'Word of advice: never trust anyone who says they\'ve been "waiting."',
  ],
};

const REALMS = [
  {
    id: 0, name: 'The Feedlot', sub: 'Muddy pens of the faithless',
    floor: '#4b3a28', floor2: '#3d2f20', wall: '#24180f', wallTop: '#3a2a1a', accent: '#a8843f',
    enemies: [['farmhand', 5], ['fly', 3], ['slinger', 2]], obstacle: 'hay', req: 0, boss: 'sirloin', decor: 'mud',
  },
  {
    id: 1, name: 'The Slaughter Marsh', sub: 'Brine, bog, and bad intentions',
    floor: '#2c3a2d', floor2: '#243024', wall: '#121a13', wallTop: '#22301f', accent: '#6f9a5a',
    enemies: [['farmhand', 3], ['fly', 4], ['slinger', 3], ['butcher', 2]], obstacle: 'reeds', req: 2, boss: 'brisket', decor: 'puddle',
  },
  {
    id: 2, name: 'The Smokehouse', sub: 'Where hope goes to be cured',
    floor: '#3d2b2a', floor2: '#332322', wall: '#1a100f', wallTop: '#2e1c1a', accent: '#b0603a',
    enemies: [['butcher', 3], ['smoker', 3], ['fly', 2], ['farmhand', 2]], obstacle: 'barrel', req: 4, boss: 'rump', decor: 'soot',
  },
  {
    id: 3, name: 'The Grill Spire', sub: 'The hottest place in the world, theologically',
    floor: '#2c1d2e', floor2: '#241726', wall: '#120a13', wallTop: '#26162a', accent: '#d0583a',
    enemies: [['butcher', 3], ['smoker', 3], ['slinger', 2], ['fly', 2], ['farmhand', 2]], obstacle: 'bones', req: 5, boss: 'chuck', decor: 'ember',
  },
];

const FINAL_REALM = {
  id: 4, name: 'The Grill Throne', sub: 'He has waited. He is preheated.',
  floor: '#2a1214', floor2: '#220e10', wall: '#0e0506', wallTop: '#2a0d10', accent: '#ff7a2a',
  enemies: [['fly', 1]], obstacle: 'bones', req: 6, boss: 'grills', decor: 'ember',
};

const ENEMIES = {
  farmhand: { name: 'Heretic Farmhand', hp: 3, r: 11, speed: 68, ai: 'melee', grass: [2, 4] },
  butcher: { name: 'Butcher Acolyte', hp: 6, r: 14, speed: 48, ai: 'charger', grass: [3, 6] },
  slinger: { name: 'Sausage Slinger', hp: 3, r: 11, speed: 56, ai: 'ranged', shots: 1, grass: [2, 5] },
  smoker: { name: 'Smokemonger', hp: 4, r: 12, speed: 50, ai: 'ranged', shots: 3, grass: [3, 5] },
  fly: { name: 'Meat Fly', hp: 1, r: 7, speed: 100, ai: 'fly', grass: [1, 2] },
};

const BOSSES = {
  sirloin: {
    name: 'Sir Loin', title: 'First Butcher Bishop', hp: 42, r: 26, speed: 62, minion: 'farmhand',
    patterns: ['charge', 'ring', 'summon', 'charge'],
    intro: [
      ['Sir Loin', 'Halt, beast! None pass the Feedlot without being graded, stamped, and PRIME.'],
      ['Sir Loin', 'A cow... with a CROWN? The prophecy! I shall end it with my Cleaver of Ten Thousand Steaks!'],
      ['You', 'Moo.'],
      ['Sir Loin', 'Do not "moo" at me in that tone!'],
    ],
    outro: [['Sir Loin', 'Im... impossible... I was... well done...']],
    unlock: 'holymoo',
  },
  brisket: {
    name: 'Lady Brisket', title: 'Bishop of the Brine', hp: 55, r: 26, speed: 60, minion: 'fly',
    patterns: ['hop', 'spread', 'summon', 'hop'],
    intro: [
      ['Lady Brisket', 'Ooh, a fresh one. Do you know how long it takes to brine a cow properly, darling?'],
      ['Lady Brisket', 'Twelve hours. I have been marinating my hatred for THREE HUNDRED YEARS.'],
      ['You', 'Moo?'],
      ['Lady Brisket', 'Don\'t you dare ask me about my skincare routine.'],
    ],
    outro: [['Lady Brisket', 'You... you\'ve made me... tender... *glorp*']],
    unlock: 'ascend',
  },
  rump: {
    name: 'Baron Rump Roast', title: 'Bishop of the Smoke', hp: 68, r: 27, speed: 70, minion: 'smoker',
    patterns: ['spiral', 'spread', 'charge', 'summon'],
    intro: [
      ['Baron Rump Roast', '*puff* Well, well. The little calf has come to my Smokehouse. Low and slow, my dear. Low... and... slow.'],
      ['Baron Rump Roast', 'I have smoked brisket, ham, salmon, and one (1) very confused tofu. You shall be my masterpiece.'],
      ['You', 'Moo.'],
    ],
    outro: [['Baron Rump Roast', 'Curse you... *cough*... I should have quit smoking...']],
    unlock: 'golden',
  },
  chuck: {
    name: 'Chuck the Eternal', title: 'Bishop of the Grind', hp: 82, r: 28, speed: 66, minion: 'butcher',
    patterns: ['ring', 'charge', 'spiral', 'summon', 'spread'],
    intro: [
      ['Chuck the Eternal', 'I AM CHUCK. I have six arms and every one of them holds a different knife.'],
      ['Chuck the Eternal', 'Paring knife. Boning knife. Bread knife. Butter knife. A spork. And this one I found.'],
      ['Chuck the Eternal', 'I will grind you into a patty so fine the gods themselves will ask for seconds.'],
      ['You', 'MOO.'],
    ],
    outro: [['Chuck the Eternal', 'Ground... down... at last...']],
    unlock: null,
  },
  grills: {
    name: 'The One Who Grills', title: 'He Who Waited (To Grill)', hp: 140, r: 32, speed: 74, minion: 'fly',
    patterns: ['hop', 'spiral', 'ring', 'charge', 'spread', 'summon'],
    intro: [],
    outro: [
      ['The One Who Grills', 'No... NO! I had the buns ready! I had the TONGS!'],
      ['The One Who Grills', 'I was going to make... BURGERS...'],
    ],
    unlock: null,
  },
};

const BLESSINGS = [
  { id: 'hearts', icon: '❤️', name: 'Thicker Hide', desc: '+1 max heart in crusades.', costs: [30, 60, 110] },
  { id: 'damage', icon: '🔔', name: 'Heavier Bell', desc: '+35% bell damage.', costs: [25, 55, 95] },
  { id: 'udder', icon: '🥛', name: 'Holy Udder', desc: 'Heal 1 heart whenever you clear a room.', costs: [45] },
  { id: 'fervor', icon: '🐮', name: 'Lungs of Faith', desc: 'Holy Moo charges faster and hits harder.', costs: [35, 75] },
  { id: 'greed', icon: '🌿', name: 'Golden Grazing', desc: '+40% grass from fallen heretics.', costs: [40] },
];

const RITUALS = [
  { id: 'feast', icon: '🥗', name: 'Feast of Clover', desc: 'Every follower is fed in full. +10 faith.', grass: 25, dev: 0 },
  { id: 'holymoo', icon: '📣', name: 'The Holy Moo-ment', desc: 'A cult-wide moo of devotion. +35 faith for all.', grass: 40, dev: 0 },
  { id: 'ascend', icon: '☁️', name: 'Ascension to the Big Pasture', desc: 'A follower ascends. Grants a lot of devotion. Others are... mostly fine.', grass: 0, dev: 0 },
  { id: 'golden', icon: '🐂', name: 'Ritual of the Golden Calf', desc: 'Melt down grass into pure devotion. +40 devotion.', grass: 60, dev: 0 },
];
