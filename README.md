# Neon Brawl: Streets of KL

A mobile-first browser beat 'em up inspired by classic arcade brawlers, with original characters, stages, sprite animation and martial-arts combat.

## Features

- Responsive HTML5 Canvas game
- Mobile joystick and four-button arcade controls
- Desktop keyboard support
- Runtime-generated pixel sprite atlas with distinct player, enemy and boss designs
- Rafi wears a red headband, red arm wraps and a white kung-fu gi
- Punch chains: jab, cross, hook and heavy finisher
- Kick chains: front kick, roundhouse and axe kick
- Mixed combos: punch-punch-kick and kick-kick-punch
- Rapid left-right plus kick twist attack
- Simultaneous punch and kick cyclone move
- Jump uppercut and flying kick
- Combo scoring, comic impact bursts, screen shake and generated arcade sound effects
- Automatic local save state with cookie marker and Continue menu
- Three original stages with parallax scenery
- Multiple enemy archetypes, weapons, pickups and three boss fights
- Offline-capable PWA shell
- No build step and no external game engine

## Controls

- Move: touch joystick, WASD or arrow keys
- Punch: J
- Kick: K
- Jump: L
- Special: I
- Pause: P or Escape

## Combo examples

- Punch, Punch: jab into cross
- Punch, Punch, Punch: hook finisher
- Punch x4: heavy punch
- Kick, Kick: roundhouse
- Kick x3: axe kick
- Punch, Punch, Kick: dragon kick
- Kick, Kick, Punch: spinning backfist
- Tap left then right quickly, then Kick: twist kick
- Punch and Kick together: cyclone
- Jump then Punch: rising uppercut
- Jump then Kick: flying kick

## Save and continue

Progress is stored in `localStorage`, with a lightweight cookie marker used to detect that a save exists. The game saves stage, wave, score, lives, health, energy, weapon and position during play, pause, tab hiding and browser closure.

## Run locally

Open `index.html`, or serve the folder with any static server.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.
