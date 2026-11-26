(() => {
  'use strict';

  const battlefield = globalThis.SaltBattle;
  const fighters = globalThis.SaltFighters;
  const { FIELD } = battlefield;
  const images = {};
  const origins = new WeakMap();
  const artPaths = {
    ground: 'assets/illustrated/ground.png', people: 'assets/salt-roster.png',
    gates: 'assets/stage-gates.png', rivals: 'assets/salt-rivals.png',
  };
  const cuts = {};
  const factions = ['#76d1ba', '#f3a173'];
  const roster = battlefield.eras.map(era => era.roster);
  const rowCuts = [[0, 397, 713, 1066, 1448], [0, 393, 712, 1063, 1448], [0, 381, 686, 1023, 1448]];
  const rowStart = [46, 375, 744, 1070];
  const rowEnd = [361, 703, 1052];
  const heights = [[92, 91, 84, 100], [98, 98, 89, 98], [103, 96, 88, 83]];
  const rivals = [['red-vanguard', 'red-archer', 'red-cutter'], ['red-shield', 'red-gunner', 'red-ram']];
  const rivalHeights = [[97, 92, 86], [106, 100, 89]];

  function registerCut(id, sheet, left, top, right, bottom, height, facing = 1) {
    cuts[id] = { sheet, left, top, width: right - left, height: bottom - top, displayHeight: height, facing };
  }

  roster.forEach((line, row) => line.forEach((id, column) =>
    registerCut(id, 'people', rowCuts[row][column], rowStart[row], rowCuts[row][column + 1], rowEnd[row], heights[row][column])));
  rivals.forEach((line, row) => line.forEach((id, column) =>
    registerCut(id, 'rivals', column * 512 + 16, row ? 531 : 65, (column + 1) * 512 - 16, row ? 967 : 469,
      rivalHeights[row][column], row ? 1 : -1)));
  registerCut('gate-stone', 'gates', 10, 63, 642, 570, 229);
  registerCut('gate-bronze', 'gates', 4, 645, 686, 1114, 215);
  registerCut('gate-iron', 'gates', 4, 645, 686, 1114, 215);
  registerCut('gate-red', 'gates', 685, 28, 1353, 572, 237);
  registerCut('tower-stones', 'gates', 741, 738, 1339, 1115, 60);

  const imageLoads = Object.entries(artPaths).map(([id, path]) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => { images[id] = img; resolve(true); };
    img.onerror = () => resolve(false);
    img.src = path;
  }));
  const ready = Promise.all([fighters.ready, ...imageLoads]).then(([frames, ...background]) => [...frames, ...background]);

  const foot = depth => FIELD.rows[0] + (FIELD.rows[1] - FIELD.rows[0]) * depth;

  function groundAt(x, depth) {
    const gateDistance = Math.min(Math.abs(x - FIELD.gates[0]), Math.abs(x - FIELD.gates[1]));
    const funnel = Math.max(0, Math.min(1, (183 - gateDistance) / 109)) * 0.51;
    return foot(depth + (1.70 - depth) * funnel);
  }

  function paintSprite(ctx, id, x, y, height, facing = 1, tilt = 0, compression = 1) {
    const area = cuts[id];
    const image = area && images[area.sheet];
    if (!image) return false;
    const h = height || area.displayHeight;
    const w = h * area.width / area.height;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.scale(facing / area.facing, compression);
    ctx.drawImage(image, area.left, area.top, area.width, area.height, -w / 2, -h, w, h);
    ctx.restore();
    return true;
  }

  function portrait(canvas, id) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (fighters.portrait(canvas, id)) return;
    const cut = cuts[id];
    if (!cut) return;
    const height = Math.min(canvas.height - 7, (canvas.width - 10) * cut.height / cut.width);
    paintSprite(ctx, id, canvas.width / 2, canvas.height - 3, height);
  }

  function ellipse(ctx, x, y, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function halo(ctx, x, y, range, rgb, intensity) {
    const color = ctx.createRadialGradient(x, y, 0, x, y, range);
    color.addColorStop(0, `rgba(${rgb},${intensity})`);
    color.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = color;
    ctx.fillRect(x - range, y - range, range * 2, range * 2);
  }

  function gate(ctx, state, side) {
    const camp = state.sides[side];
    const x = FIELD.gates[side] + (side ? 15 : -7);
    const y = foot(1.60) + 2;
    const id = side ? 'gate-red' : battlefield.eras[camp.era].art;
    const flash = state.time - camp.lastHit < 0.17;
    ctx.save();
    if (!camp.hp) ctx.globalAlpha = 0.64;
    ellipse(ctx, x + 12, y + 1, 135, 10, '#56443862');
    if (flash) ctx.filter = 'brightness(1.16)';
    if (!paintSprite(ctx, id, x, y)) {
      ctx.fillStyle = side ? '#673541' : '#354a50';
      ctx.fillRect(x - 75, y - 160, 150, 160);
      ctx.fillStyle = '#161521';
      ctx.fillRect(x - 26, y - 105, 52, 105);
    }
    ctx.restore();
  }

  function timber(ctx, ax, ay, bx, by, width, color) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#201521';
    ctx.lineWidth = width + 3;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function turret(ctx, state, side) {
    const camp = state.sides[side];
    if (!camp.tower) return;
    const x = FIELD.gates[side] + (side ? -1 : 1) * FIELD.towerInset;
    const y = foot(FIELD.towerDepth);
    const heavy = camp.tower !== 'stones';
    ellipse(ctx, x, y, 36, 6, '#5c473b78');
    const repeat = battlefield.towerTypes[camp.tower].rate;
    const recoil = Math.max(0, camp.towerReady - state.time - repeat + 0.24) / 0.24;
    if (!heavy && paintSprite(ctx, 'tower-stones', x, y, 60, side ? -1 : 1, recoil * .08)) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(side ? -1 : 1, 1);
    timber(ctx, -30, -4, 29, -4, 10, '#ac734d');
    timber(ctx, -21, -6, -8, -43, 9, '#996342');
    timber(ctx, 20, -6, -8, -43, 8, '#bb8254');
    timber(ctx, -24, -17, 17, -20, 6, side ? '#ba5e46' : '#3f8b89');
    if (heavy) {
      timber(ctx, -24 - recoil * 8, -42, 28, -42, 8, '#b48561');
      timber(ctx, 8, -42, 21, -61, 6, '#63727b');
      timber(ctx, 8, -42, 25, -25, 6, '#63727b');
      timber(ctx, 14, -42, 31, -42, 3, '#f7d39e');
    } else {
      timber(ctx, -23, -51 - recoil * 10, 25, -33 + recoil * 8, 8, '#c08b58');
      ellipse(ctx, -22, -55 - recoil * 10, 11, 8, '#201725');
      ellipse(ctx, -22, -56 - recoil * 10, 8, 6, '#a6949a');
      ellipse(ctx, -24, -59 - recoil * 10, 3, 2, '#e2bcc2');
    }
    ctx.restore();
  }

  function unitPose(unit, now, preview) {
    const part = cuts[unit.id];
    const sinceStrike = now - unit.strike;
    const dying = unit.dead !== null;
    const fallen = dying ? Math.min(1, (now - unit.dead) / 0.51) : 0;
    const travel = unit.walking ? Math.sin(now * (unit.type.role === 'flank' ? 20 : 14) + unit.uid * 1.89) : 0;
    const rush = unit.type.role === 'flank' && unit.walking;
    const kick = sinceStrike >= 0 && sinceStrike < .22 ? Math.sin(sinceStrike / .22 * Math.PI) : 0;
    const drawnHeight = fighters.height(unit.id);
    const height = drawnHeight ? drawnHeight * (.975 + unit.depth * .019)
      : (part?.displayHeight || 86) * (.92 + unit.depth * .055);
    const arrival = preview ? 1 : Math.min(1, (now - unit.born) / .34);
    const groundX = unit.x - (unit.side ? -1 : 1) * (1 - arrival) * 34;
    const y = groundAt(groundX, 1.62 + (unit.depth - 1.62) * arrival);
    return { unit, groundX, y, height, fallen, travel, kick, rush, opacity: Math.max(0, 1 - fallen) * (.56 + arrival * .44) };
  }

  function unitShadow(ctx, pose) {
    const { unit, groundX, y, opacity, travel, height } = pose;
    ctx.save();
    ctx.globalAlpha = opacity;
    ellipse(ctx, groundX + 9, y - 1, height * (unit.type.role === 'siege' ? .39 : .26), height * .061, '#43312d70');
    ellipse(ctx, groundX, y + 3, height * .18, 2.5, `${factions[unit.side]}ba`);
    if (unit.walking && unit.dead === null && Math.abs(travel) > .55) {
      const dust = (unit.uid % 3 - 1) * 3;
      ellipse(ctx, groundX - unit.facing * 23, y + dust, 8 + Math.abs(travel) * 6, 2, '#f0c29059');
    }
    ctx.restore();
  }

  function unitSprite(ctx, pose, now) {
    const { unit, groundX, y, height, fallen, travel, kick, rush, opacity } = pose;
    const x = groundX + kick * unit.facing * (unit.type.role === 'ranged' ? -4 : 11);
    const rise = Math.abs(travel) * (rush ? 4.2 : 2.8);
    const tip = unit.dead !== null ? fallen * .86 * -unit.facing : travel * (rush ? .05 : .027) + kick * unit.facing * .054;
    ctx.save();
    ctx.globalAlpha = opacity;
    if (now - unit.hit < 0.10) ctx.filter = 'brightness(1.34)';
    if (!paintSprite(ctx, unit.id, x, y - rise + fallen * 8, height, unit.facing, tip, 1 - Math.abs(travel) * .028)) {
      ctx.fillStyle = factions[unit.side];
      ctx.fillRect(x - 13, y - 42, 26, 42);
    }
    ctx.restore();
  }

  function unitHealth(ctx, pose, painted) {
    const { unit, groundX, y, height } = pose;
    const top = y - height * (painted ? 1.03 : 1) - 9;
    ctx.fillStyle = '#1b1522d4';
    ctx.fillRect(groundX - 19, top, 38, 4);
    ctx.fillStyle = factions[unit.side];
    ctx.fillRect(groundX - 18, top + 1, 36 * unit.hp / unit.type.hp, 2);
  }

  function spark(ctx, x, y, radius, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3 + .11;
      ctx.moveTo(x + Math.cos(angle) * radius * .34, y + Math.sin(angle) * radius * .34);
      ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    }
    ctx.stroke();
  }

  function showProjectile(ctx, shot, t, state) {
    const target = state.units.find(unit => unit.uid === shot.targetId && unit.dead === null);
    const sling = shot.weapon === 'sling';
    const fire = shot.weapon === 'matchlock';
    if (!origins.has(shot)) {
      const source = state.units.find(unit => unit.uid === shot.sourceId);
      const muzzle = source && fighters.origin({
        unit: { ...source, facing: shot.facing },
        groundX: shot.from,
        y: groundAt(shot.from, shot.fromDepth),
        height: (fighters.height(source.id) || 87) * (.975 + shot.fromDepth * .019),
      });
      origins.set(shot, muzzle || {
        x: shot.from + shot.facing * (fire ? 47 : sling ? 18 : 33),
        y: groundAt(shot.from, shot.fromDepth) - (sling ? 74 : 58),
      });
    }
    const { x: ax, y: ay } = origins.get(shot);
    const bx = target?.x ?? shot.x;
    const by = groundAt(bx, target?.depth ?? shot.depth) - (target ? (fighters.height(target.id) || 87) * .52 : 47);
    const arc = sling ? 37 : fire ? 2 : 19;
    const point = ratio => ({ x: ax + (bx - ax) * ratio, y: ay + (by - ay) * ratio - 4 * ratio * (1 - ratio) * arc });
    const forward = point(Math.min(1, t));
    const behind = point(Math.max(0, t - (fire ? .44 : .22)));
    ctx.globalAlpha = .97;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(behind.x, behind.y);
    ctx.lineTo(forward.x, forward.y);
    ctx.lineWidth = fire ? 3.7 : sling ? 2.5 : 3;
    ctx.strokeStyle = fire ? '#fff5a5' : shot.side ? '#ffe0ab' : '#d9fff1';
    ctx.stroke();
    if (sling) {
      ellipse(ctx, forward.x, forward.y, 5, 4, '#474052');
      ellipse(ctx, forward.x - 1, forward.y - 1, 2.4, 1.7, '#feedc8');
    } else if (!fire) {
      const angle = Math.atan2(forward.y - behind.y, forward.x - behind.x);
      ctx.save();
      ctx.translate(forward.x, forward.y);
      ctx.rotate(angle);
      ctx.fillStyle = '#fff6d7';
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(-7, -3.5);
      ctx.lineTo(-7, 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if (fire && t < .76) {
      ctx.globalAlpha = (1 - t) * .85;
      spark(ctx, ax, ay, 15 + t * 11, '#ffcf8e');
      halo(ctx, ax, ay, 24 + 11 * t, '255,166,111', .38 * (1 - t));
      ellipse(ctx, ax - shot.facing * 7 + 11 * t, ay - t * 10, 8 + t * 8, 4 + t * 7, '#e4d3d2a0');
    }
  }

  function showEffect(ctx, item, state) {
    const time = state.time;
    const t = (time - item.at) / item.life;
    const y = groundAt(item.x, item.depth);
    ctx.save();
    ctx.globalAlpha = (1 - t) * 0.95;
    if (item.kind === 'shot') {
      showProjectile(ctx, item, t, state);
    } else if (item.kind === 'tower') {
      const dx = item.x - item.from;
      const fromY = foot(item.fromDepth) - 49;
      const toY = y - 31;
      const duration = item.kind === 'tower' ? .77 : .56;
      const flight = Math.min(1, t / duration);
      const pointX = item.from + dx * flight;
      const pointY = fromY + (toY - fromY) * flight - 4 * flight * (1 - flight) * (item.kind === 'tower' ? 74 : 24);
      ctx.globalAlpha = 0.95 * (1 - Math.max(0, t - duration) / (1 - duration));
      ctx.strokeStyle = item.weapon === 'red-gunner' ? '#fff1ad' : item.side ? '#ffb07d' : '#dbfff3';
      ctx.lineWidth = item.weapon === 'red-gunner' ? 4 : 2.1;
      ctx.beginPath();
      ctx.moveTo(pointX - Math.sign(dx) * (item.weapon === 'red-gunner' ? 28 : 16) * (1 - t), pointY - 3);
      ctx.lineTo(pointX, pointY);
      ctx.stroke();
      if (item.kind === 'tower') ellipse(ctx, pointX, pointY, 5.5, 4, '#fff2d6');
      if (flight === 1) spark(ctx, item.x, toY, 8 + (t - duration) * 28, '#fff1b3');
    } else if (['hit', 'impact', 'break', 'brace'].includes(item.kind)) {
      const color = item.kind === 'brace' ? '#d6fff5' : item.kind === 'break' ? '#fff0ae' : '#fff3cf';
      const height = fighters.height(item.target) || 88;
      spark(ctx, item.x, y - height * (item.kind === 'impact' ? .53 : .57), 7 + t * (item.kind === 'break' ? 34 : 13), color);
      if (item.kind === 'brace' || item.kind === 'break') {
        ctx.fillStyle = '#221927';
        ctx.font = '700 18px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.kind === 'brace' ? '拦截' : '破盾', item.x, y - 91 - t * 12);
      }
    } else if (item.kind === 'bounty') {
      ctx.fillStyle = '#ffdf8e';
      ctx.strokeStyle = '#5d3647';
      ctx.lineWidth = 3;
      ctx.font = '700 17px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText(`+${item.value}`, item.x, y - 52 - t * 25);
      ctx.fillText(`+${item.value}`, item.x, y - 52 - t * 25);
    } else {
      const spread = item.kind === 'rally' ? 99 : item.kind === 'evolve' ? 68 : 38;
      ctx.strokeStyle = item.kind === 'evolve' ? '#ffe1a0' : factions[item.side || 0];
      ctx.lineWidth = item.kind === 'evolve' ? 4 : 2;
      ctx.beginPath();
      ctx.ellipse(item.x, y, 9 + t * spread, 4 + t * spread * .27, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (item.kind === 'evolve') halo(ctx, item.x, y - 60, 160, '255,181,85', .48 * (1 - t));
    }
    ctx.restore();
  }

  function scene(canvas, state, ambient = 0, preview = false) {
    const ctx = canvas.getContext('2d');
    if (images.ground) ctx.drawImage(images.ground, 0, 0, FIELD.width, FIELD.height);
    else {
      ctx.fillStyle = '#23364c';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.fillStyle = '#ba8257';
      ctx.fillRect(0, 208, FIELD.width, 319);
    }
    for (let n = 0; n < 9; n++) {
      const wave = Math.sin(ambient * .64 + n * 1.93);
      const x = 65 + (n * 137 % 1330) + wave * 25;
      const y = 525 + (n * 21 % 107) + Math.sin(ambient * .54 + n) * 11;
      ellipse(ctx, x, y, 2 + (n % 3) * .4, .95, `rgba(243,221,188,${0.20 + wave * .12})`);
    }
    gate(ctx, state, 0);
    gate(ctx, state, 1);
    turret(ctx, state, 0);
    turret(ctx, state, 1);
    const now = preview ? ambient : state.time;
    const poses = state.units.map(unit => unitPose(unit, now, preview)).sort((left, right) => left.y - right.y || left.unit.uid - right.unit.uid);
    for (const pose of poses) unitShadow(ctx, pose);
    for (const pose of poses) {
      const animated = fighters.draw(ctx, pose, now);
      if (!animated) unitSprite(ctx, pose, now);
      const { unit } = pose;
      if (!preview && unit.dead === null && unit.hp < unit.type.hp && (now - unit.hit < 3.5 || unit.hp / unit.type.hp < .44)) {
        unitHealth(ctx, pose, animated);
      }
    }
    for (const item of state.effects) showEffect(ctx, item, state);
  }

  globalThis.SaltArt = { ready, scene, portrait };
})();
