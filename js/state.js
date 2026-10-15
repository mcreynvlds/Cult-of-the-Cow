'use strict';
// Persistent game state + save/load.

const SAVE_KEY = 'cult_of_the_cow_save_v1';
let S = null;

function newState() {
  return {
    version: 1,
    started: false,
    day: 1,
    time: DAY_LEN * 0.08,
    grass: 30,
    hay: 4,
    devotion: 0,
    shrineDevotion: 0,
    troughFood: 0,
    fieldGrowth: 0.6,
    followers: [],
    pies: [],
    nextId: 1,
    bosses: [false, false, false, false],
    finalDefeated: false,
    upgrades: { hearts: 0, damage: 0, udder: 0, fervor: 0, greed: 0 },
    sermonDay: 0,
    ritualDay: {},
    usedNames: [],
    runs: 0,
    tutorialDone: false,
    stats: { kills: 0, deaths: 0, rescued: 0, departed: 0, ascended: 0 },
  };
}

function saveGame() {
  if (!S) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    const s = Object.assign(newState(), d);
    s.upgrades = Object.assign(newState().upgrades, d.upgrades || {});
    s.stats = Object.assign(newState().stats, d.stats || {});
    return s;
  } catch (e) { return null; }
}

function hasSave() {
  const s = loadGame();
  return !!(s && s.started);
}

function wipeSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}

function makeFollower(species, name) {
  const f = {
    id: S.nextId++,
    name,
    species,
    level: 1,
    hunger: 75,
    faith: 65,
    dissent: 0,
    starve: 0,
    poopT: rand(50, 120),
    inspiredDay: 0,
    joinedDay: S.day,
  };
  S.usedNames.push(name);
  return f;
}

function randomFollower() {
  let species = weighted(SPECIES_WEIGHTS);
  if (species === 'lamb' && S.usedNames.includes('Lambert')) species = 'sheep';
  const pool = SPECIES[species].names.filter((n) => !S.usedNames.includes(n));
  let name;
  if (pool.length) name = pick(pool);
  else {
    const baseName = pick(SPECIES[species].names);
    let n = 2;
    while (S.usedNames.includes(`${baseName} ${roman(n)}`)) n++;
    name = `${baseName} ${roman(n)}`;
  }
  return makeFollower(species, name);
}

function roman(n) {
  const map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}

function cultFaith() {
  if (!S.followers.length) return 0;
  return S.followers.reduce((a, f) => a + f.faith, 0) / S.followers.length;
}

function ritualUnlocked(id) {
  if (id === 'feast') return true;
  const idx = ['sirloin', 'brisket', 'rump', 'chuck'].findIndex((b) => BOSSES[b].unlock === id);
  return idx >= 0 && S.bosses[idx];
}

function maxHearts() { return 3 + S.upgrades.hearts; }
function bellDamage() { return 1 + S.upgrades.damage * 0.35; }
