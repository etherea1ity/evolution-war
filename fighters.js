(() => {
  'use strict';

  const sheets = {};
  const ready = Promise.all(['stone', 'bronze', 'motions'].map(name => new Promise(resolve => {
    const image = new Image();
    image.onload = () => { sheets[name] = image; resolve(true); };
    image.onerror = () => resolve(false);
    image.src = `assets/illustrated/${name}.png`;
  })));

  // Source rectangle, followed by the hip and ground anchor within that rectangle.
  const stone = [
    [[45, 56, 250, 242, 102, 237], [350, 56, 251, 241, 97, 236], [671, 58, 235, 239, 79, 234], [953, 70, 294, 223, 104, 218]],
    [[45, 374, 209, 228, 99, 223], [336, 374, 233, 230, 105, 225], [639, 370, 214, 234, 100, 229], [978, 336, 239, 270, 103, 265]],
    [[50, 659, 206, 256, 88, 251], [342, 657, 217, 258, 101, 253], [669, 656, 193, 258, 87, 253], [949, 659, 281, 257, 100, 252]],
    [[31, 969, 270, 256, 113, 251], [350, 971, 254, 254, 105, 249], [662, 965, 240, 261, 86, 256], [932, 994, 311, 233, 117, 228]],
  ];
  const bronze = [
    [[32, 55, 278, 249, 102, 244], [331, 54, 294, 250, 107, 245], [648, 56, 270, 249, 99, 244], [932, 71, 318, 233, 119, 228]],
    [[64, 365, 175, 240, 78, 235], [355, 367, 194, 242, 86, 237], [677, 368, 179, 242, 77, 237], [972, 349, 245, 261, 102, 256]],
    [[52, 682, 198, 230, 90, 225], [351, 680, 220, 232, 84, 227], [665, 680, 204, 232, 84, 227], [944, 687, 293, 224, 106, 219]],
    [[36, 1001, 266, 224, 105, 219], [341, 998, 266, 227, 107, 222], [674, 997, 237, 225, 87, 220], [945, 962, 292, 264, 120, 259]],
  ];
  const transitions = [
    [[44, 55, 255, 246, 101, 241], [358, 71, 241, 228, 99, 223], [668, 57, 243, 242, 83, 237], [942, 152, 297, 150, 146, 145]],
    [[35, 349, 265, 261, 112, 256], [335, 363, 271, 245, 113, 240], [658, 354, 248, 256, 89, 251], [942, 463, 300, 151, 152, 146]],
    [[41, 662, 202, 245, 96, 240], [320, 668, 263, 237, 139, 232], [655, 665, 258, 239, 110, 234], [943, 707, 278, 200, 122, 195]],
    [[65, 969, 180, 243, 78, 238], [359, 951, 187, 262, 91, 257], [657, 965, 215, 246, 99, 241], [949, 1037, 286, 176, 135, 171]],
  ];

  const stoneFighters = [
    { sheet: 'stone', frames: stone[0], extra: transitions[0], height: 128, attack: 'spear' },
    { sheet: 'stone', frames: stone[1], extra: transitions[2], height: 118, attack: 'sling', release: [0.44, 0.70] },
    { sheet: 'stone', frames: stone[2], height: 115, attack: 'blade' },
    { sheet: 'stone', frames: stone[3], height: 131, attack: 'heavy' },
  ];
  const bronzeFighters = [
    { sheet: 'bronze', frames: bronze[0], extra: transitions[1], height: 129, attack: 'spear' },
    { sheet: 'bronze', frames: bronze[1], extra: transitions[3], height: 119, attack: 'bow', release: [0.44, 0.70] },
    { sheet: 'bronze', frames: bronze[2], height: 118, attack: 'blade' },
    { sheet: 'bronze', frames: bronze[3], height: 131, attack: 'heavy' },
  ];
  const fighters = {
    'stone-pike': stoneFighters[0],
    'stone-sling': stoneFighters[1],
    'stone-runner': stoneFighters[2],
    'stone-maul': stoneFighters[3],
    'bronze-pike': bronzeFighters[0],
    'bronze-bow': bronzeFighters[1],
    'bronze-runner': bronzeFighters[2],
    'bronze-hook': bronzeFighters[3],
    'red-vanguard': { ...bronzeFighters[0], height: 123 },
    'red-archer': bronzeFighters[1],
    'red-cutter': bronzeFighters[2],
    'red-shield': { ...bronzeFighters[0], height: 140 },
  };

  function selectPose(unit, now, fighter) {
    const { frames, extra, attack } = fighter;
    if (unit.dead !== null && extra) {
      const age = now - unit.dead;
      return { frame: age < .09 && attack === 'spear' ? extra[2] : extra[3], sheet: 'motions' };
    }
    if (unit.motion) {
      const { start, timing, end, delivered } = unit.motion;
      const phase = (now - start) / timing;
      if (delivered) {
        const recovery = (now - start - timing) / (end - start - timing);
        if (recovery < .72 && extra && (attack === 'sling' || attack === 'bow')) return { frame: extra[2], sheet: 'motions' };
        if (recovery < .59) return { frame: frames[3], sheet: fighter.sheet };
      } else if (phase > .60 && attack !== 'spear') {
        return { frame: frames[3], sheet: fighter.sheet };
      } else if (extra) {
        return { frame: extra[1], sheet: 'motions' };
      }
    }
    if (now - unit.hit < .16 && attack === 'spear' && extra) {
      return { frame: extra[2], sheet: 'motions' };
    }
    if (unit.walking) {
      const interval = unit.dashing ? .085 : unit.type.role === 'flank' ? .101 : .135;
      const step = Math.floor((now + unit.uid * .079) / interval) % 4;
      if (step % 2) return extra ? { frame: extra[0], sheet: 'motions' } : { frame: frames[0], sheet: fighter.sheet };
      return { frame: frames[step === 0 ? 1 : 2], sheet: fighter.sheet };
    }
    if (unit.braced && attack === 'spear' && extra) return { frame: extra[1], sheet: 'motions' };
    return { frame: frames[0], sheet: fighter.sheet };
  }

  function filterFor(id, side, hit = false) {
    const allyBronze = !side && id.startsWith('bronze-');
    const color = allyBronze ? 'hue-rotate(19deg) saturate(.82) brightness(1.09)' : '';
    return [color, hit ? 'brightness(1.21)' : ''].filter(Boolean).join(' ') || 'none';
  }

  function draw(ctx, pose, now) {
    const { unit, groundX, y, height, opacity, fallen } = pose;
    const fighter = fighters[unit.id];
    if (!fighter) return false;
    const { frame, sheet } = selectPose(unit, now, fighter);
    const image = sheets[sheet] || sheets[fighter.sheet];
    if (!image) return false;
    const [left, top, width, rows, anchorX, anchorY] = sheets[sheet] ? frame : fighter.frames[0];
    const ratio = height / fighter.frames[0][5];
    const striking = unit.motion?.delivered && (fighter.attack === 'spear' || fighter.attack === 'blade');
    const impulse = striking ? Math.max(0, 1 - (now - unit.strike - unit.motion.timing) / .16) * 6 : 0;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.filter = filterFor(unit.id, unit.side, unit.dead === null && now - unit.hit < .083);
    ctx.translate(groundX + unit.facing * impulse, y);
    if (fallen && !fighter.extra) ctx.rotate(-unit.facing * fallen * 1.32);
    ctx.scale(unit.facing, 1);
    ctx.drawImage(image, left, top, width, rows, -anchorX * ratio, -anchorY * ratio, width * ratio, rows * ratio);
    ctx.restore();
    return true;
  }

  function portrait(canvas, id) {
    const fighter = fighters[id];
    const image = fighter && sheets[fighter.sheet];
    if (!image) return false;
    const [x, y, width, height] = fighter.frames[0];
    const ctx = canvas.getContext('2d');
    const ratio = Math.min((canvas.width - 8) / width, (canvas.height - 7) / height);
    ctx.save();
    ctx.filter = filterFor(id, 0);
    ctx.drawImage(image, x, y, width, height, (canvas.width - width * ratio) / 2,
      canvas.height - 3 - height * ratio, width * ratio, height * ratio);
    ctx.restore();
    return true;
  }

  function origin(pose) {
    const release = fighters[pose.unit.id]?.release;
    if (!release) return null;
    const [ahead, above] = release;
    return { x: pose.groundX + pose.unit.facing * pose.height * ahead, y: pose.y - pose.height * above };
  }

  globalThis.SaltFighters = { ready, draw, portrait, origin,
    height: id => sheets[fighters[id]?.sheet] && fighters[id].height };
})();
