# 🐮 Cult of the Cow

*A Mooving Parody.* You are the **Last Cow**, a cow prophesied never to be eaten. The four **Butcher Bishops** chopped you anyway. Now a mysterious chained figure, **The One Who Grills**, has brought you back to start a cult in his name. He says he only wants you to break his chains. He seems trustworthy.

It's a mobile-first browser game that parodies *Cult of the Lamb*. It's plain HTML5 canvas and JavaScript, with no build step, no dependencies and no asset files. All the art is drawn in code, and every sound (the moo included) is synthesized with WebAudio.

## Play

- **Locally:** open `index.html` in any modern browser, or serve the folder (`npx http-server .`) and open it on your phone over your LAN.
- **Install it:** when it's served over HTTPS (GitHub Pages works), use *Add to Home Screen*. It runs fullscreen and works offline through a service worker.

### Controls

| | Touch | Keyboard |
|---|---|---|
| Move | Drag anywhere (floating joystick) | WASD / arrows |
| Interact | Gold action button | E / Enter |
| Bell swing (3-hit combo) | 🔔 | Space / J |
| Dodge roll | 💨 | Shift / K |
| Holy Moo shockwave | 🐮 (when charged) | L / Q |

## The Loop

**🏠 The Cult (base)**
- **Shrine:** followers worship here and produce ✨ Devotion. Walk past to collect it, then spend it on Blessings: extra hearts, a heavier bell, the Holy Udder, and more.
- **Temple:** preach a free Sermon once a day (it's mostly mooing). You can also perform Rituals: Feast of Clover, The Holy Moo-ment, Ascension to the Big Pasture, and Ritual of the Golden Calf. Each Bishop you slay unlocks a new one.
- **Trough & Hay Field:** harvest hay and keep the trough full, or your flock goes hungry.
- **Ratcliff the Hay Rat:** trades hay for grass and gives questionable advice.
- **Followers:** chickens, pigs, sheep, goats, ducks, horses, rabbits, donkeys, and one very familiar lamb. You can inspire them, hand-feed them, or level them up with a Milk Baptism. Clean up their "offerings". If you neglect them, they leave for a petting zoo.
- A day/night cycle keeps running while you're away on a crusade.

**⚔️ Crusades**
- **The Feedlot** → **The Slaughter Marsh** → **The Smokehouse** → **The Grill Spire**. Each realm has combat rooms, one captive to rescue and indoctrinate, and a Bishop's chamber.
- The heretics are pitchfork Farmhands, charging Butcher Acolytes, Sausage Slingers, Smokemongers and Meat Flies.
- The Bishops are **Sir Loin**, **Lady Brisket**, **Baron Rump Roast** and **Chuck the Eternal**. Each has its own attack patterns: charges, slam rings, spreads, spirals, hops and summons. All of them get enraged at half health.
- Your swing knocks projectiles out of the air. Deeper realms need a bigger flock before they open.
- Break all four chains and the Red Gate leads to **The Grill Throne**. You can probably guess what happens.

## Project Layout

```
index.html            DOM overlay (HUD, controls, dialog, menus, title)
css/style.css         Mobile UI styling, safe-area aware
js/util.js            Math helpers, seeded RNG
js/audio.js           Synthesized SFX (moo, cowbell, hits…)
js/input.js           Floating joystick, buttons, keyboard
js/data.js            Species, names, realms, enemies, bosses, blessings, rituals, dialogue
js/art.js             Procedural canvas drawing for every character and prop
js/state.js           Save state + localStorage persistence
js/ui.js              Dialog/typewriter, menus, toasts, HUD
js/base.js            The cult: followers AI, simulation, buildings, rituals
js/crusade.js         Combat rooms, enemy AI, boss patterns, run flow
js/void.js            Cutscenes with The One Who Grills
js/main.js            Boot, scene manager, game loop, title & pause
sw.js                 Offline cache
manifest.webmanifest  PWA manifest
```

Progress autosaves to `localStorage`.

*Not affiliated with any lambs. No cows were harmed. Several butchers were.*
