(() => {
  'use strict';

  const ink = '#241c26';
  const bone = '#f3d8a9';
  const metal = '#a5a5b3';
  const wood = '#aa6940';
  const palettes = [
    { skin: '#d99a60', light: '#edb47b', cloth: '#3d8884', leg: '#6d4a3e', boot: '#4b3640' },
    { skin: '#d49a64', light: '#f0b87d', cloth: '#39858c', leg: '#936143', boot: '#4e3c4a' },
    { skin: '#b8b7c2', light: '#d6c7b9', cloth: '#456986', leg: '#555264', boot: '#3a3545' },
    { skin: '#a6a0a6', light: '#d2b9a9', cloth: '#a84f43', leg: '#625062', boot: '#493747' },
  ];
  const heads = [[74, 122, 433, 412], [511, 77, 828, 406], [965, 127, 1257, 415], [1350, 109, 1678, 425]];
  const bodies = [[120, 527, 386, 826], [536, 523, 807, 828], [975, 521, 1236, 821], [1363, 523, 1673, 818]];
  const asset = new Image();
  const ready = new Promise(resolve => {
    asset.onload = () => resolve(true);
    asset.onerror = () => resolve(false);
  });
  asset.src = 'assets/salt-rig-skins.png';

  const pt = (x, y) => ({ x, y });
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

  function shape(ctx, points, fill, edge = ink, width = 3) {
    ctx.beginPath();
    for (const [index, point] of points.entries()) {
      if (index) ctx.lineTo(point.x, point.y);
      else ctx.moveTo(point.x, point.y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (edge) {
      ctx.strokeStyle = edge;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }

  function line(ctx, points, color, width) {
    ctx.beginPath();
    for (const [index, point] of points.entries()) {
      if (index) ctx.lineTo(point.x, point.y);
      else ctx.moveTo(point.x, point.y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function dot(ctx, x, y, radius, color, edge = null) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (edge) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = edge;
      ctx.stroke();
    }
  }

  function limb(ctx, start, bend, end, width, color, highlight) {
    line(ctx, [start, bend, end], ink, width + 4);
    line(ctx, [start, bend, end], color, width);
    if (highlight) line(ctx, [pt(bend.x - 1, bend.y - 1), pt(end.x - 1, end.y - 1)], highlight, Math.max(2, width * .27));
  }

  function hand(ctx, wrist, fill) {
    shape(ctx, [pt(wrist.x-4,wrist.y-3), pt(wrist.x+3,wrist.y-5), pt(wrist.x+7,wrist.y-1),
      pt(wrist.x+5,wrist.y+4), pt(wrist.x-2,wrist.y+4)], fill, ink, 1.8);
  }

  function legArmor(ctx, knee, foot, skin, foreground) {
    if (skin < 2) {
      line(ctx, [pt(knee.x-4,knee.y+3), pt(knee.x+4,knee.y+3)], foreground ? '#d1a16c' : '#77514a', 2.1);
      if (skin === 0) line(ctx, [pt(foot.x-5,foot.y-7), pt(foot.x+4,foot.y-7)], '#c19062', 2);
      return;
    }
    shape(ctx, [pt(knee.x-4,knee.y-3), pt(knee.x+5,knee.y-3), pt(foot.x+5,foot.y-6), pt(foot.x-3,foot.y-4)], foreground ? '#a9a5ae' : '#655f72', ink, 1.35);
    line(ctx, [pt(knee.x-1,knee.y), pt(foot.x,foot.y-8)], foreground ? '#d2c9c9' : '#817a89', 1.45);
  }

  function part(ctx, box, x, y, height, stretch = 1) {
    const [left, top, right, bottom] = box;
    const width = (right - left) * height / (bottom - top) * stretch;
    ctx.drawImage(asset, left, top, right - left, bottom - top, x - width / 2, y - height, width, height);
  }

  function shield(ctx, x, y, skin, palette, ready, heavy) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ready ? -.10 : .13);
    if (heavy) ctx.scale(1.20, 1.34);
    if (skin === 0) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 19, .25, 0, Math.PI * 2);
      ctx.fillStyle = '#8b523b';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = bone;
      ctx.stroke();
      line(ctx, [pt(-6, -13), pt(-4, 14)], '#5a3937', 2);
    } else {
      shape(ctx, [pt(-16,-16), pt(14,-18), pt(17,9), pt(2,22), pt(-15,13)], palette.cloth, '#dfa37e', 3);
      line(ctx, [pt(-9,-8), pt(0,0), pt(10,-9)], '#f7cea6', 3);
    }
    dot(ctx, 1, 1, 4, metal, ink);
    ctx.restore();
  }

  function pole(ctx, hand, angle, weapon, skin) {
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.rotate(angle);
    if (weapon === 'blade') {
      line(ctx, [pt(-8,0), pt(9,0)], ink, 7);
      shape(ctx, [pt(5,-3), pt(23,-7), pt(32,-3), pt(26,5), pt(6,4)], '#ded4c9');
    } else {
      const isMaul = weapon === 'maul';
      const reach = isMaul ? 36 : weapon === 'hook' ? 44 : 45;
      line(ctx, [pt(isMaul ? -15 : -26, 0), pt(reach,0)], ink, 8);
      line(ctx, [pt(isMaul ? -15 : -26, 0), pt(reach,0)], wood, 4);
      if (isMaul) shape(ctx, [pt(25,-13), pt(46,-13), pt(54,-4), pt(48,13), pt(24,11)], '#8c838d');
      else if (weapon === 'hook') {
        line(ctx, [pt(38,1), pt(48,-13), pt(58,-13), pt(63,-3), pt(60,5)], ink, 10);
        line(ctx, [pt(38,1), pt(48,-13), pt(58,-13), pt(63,-3), pt(60,5)], '#e1b78c', 5);
      } else shape(ctx, [pt(39,-4), pt(62,-1), pt(47,7), pt(37,5)], skin === 0 ? bone : '#a8b9bd', ink, 2);
    }
    ctx.restore();
  }

  function bow(ctx, grip, hand, draw, released, aiming) {
    const x = grip.x;
    const y = grip.y;
    const ends = [pt(x - 7 - draw * 5, y - 26), pt(x - 6 - draw * 4, y + 25)];
    ctx.beginPath();
    ctx.moveTo(ends[0].x, ends[0].y);
    ctx.quadraticCurveTo(x + 22, y - 2, ends[1].x, ends[1].y);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = '#c88b5c';
    ctx.lineWidth = 4;
    ctx.stroke();
    const string = aiming && !released ? hand : pt(x - 8, y);
    line(ctx, [ends[0], string, ends[1]], '#e3c8aa', 1.5);
    if (aiming && !released) {
      line(ctx, [hand, pt(x + 15, y)], '#efe2b0', 2.4);
      shape(ctx, [pt(x+12,y-3), pt(x+21,y), pt(x+12,y+3)], metal, null);
    }
  }

  function stock(ctx, hand, crossbow) {
    ctx.save();
    ctx.translate(hand.x, hand.y - 4);
    shape(ctx, [pt(-20,-2), pt(20,-5), pt(crossbow ? 35 : 47,-4), pt(crossbow ? 35 : 47,3), pt(-9,5), pt(-21,9)], wood);
    line(ctx, [pt(-4,-7), pt(crossbow ? 31 : 47,-7)], metal, crossbow ? 5 : 6);
    if (crossbow) {
      line(ctx, [pt(17,-18), pt(32,-7), pt(23,10)], ink, 7);
      line(ctx, [pt(17,-18), pt(32,-7), pt(23,10)], '#c88b5c', 3);
    }
    ctx.restore();
  }

  function phase(unit, time) {
    const motion = unit.motion;
    if (!motion) return { draw: 0, recoil: 0, action: false, released: false };
    const elapsed = time - motion.start;
    const released = elapsed >= motion.timing;
    const draw = released ? 0 : clamp(elapsed / motion.timing, 0, 1);
    const recoil = released ? Math.max(0, 1 - (elapsed - motion.timing) / .20) : 0;
    return { draw, recoil, action: true, released };
  }

  function ram(ctx, unit, x, y, height, time) {
    const pose = phase(unit, time);
    const cloth = unit.side ? '#a64e41' : '#386b7a';
    const bolt = -pose.draw * 10 + pose.recoil * 25;
    const fall = unit.dead === null ? 0 : clamp((time - unit.dead) * 1.6, 0, .65);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(unit.facing * height / 83, height / 83);
    ctx.rotate(-fall);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    shape(ctx, [pt(-38,-45), pt(30,-45), pt(41,-17), pt(-43,-17)], '#754d3f');
    line(ctx, [pt(-35,-42), pt(-8,-18), pt(28,-42)], '#bd835a', 4);
    shape(ctx, [pt(-43,-43), pt(-27,-68), pt(24,-66), pt(42,-43)], cloth);
    line(ctx, [pt(-27,-63), pt(22,-61), pt(37,-46)], '#b29b93', 2.6);
    line(ctx, [pt(-15,-61), pt(-23,-45)], '#231e2a', 2.6);
    line(ctx, [pt(4,-62), pt(11,-45)], '#231e2a', 2.6);
    line(ctx, [pt(19+bolt,-32), pt(45+bolt,-32)], ink, 13);
    line(ctx, [pt(19+bolt,-32), pt(46+bolt,-32)], wood, 7);
    shape(ctx, [pt(41+bolt,-41), pt(62+bolt,-32), pt(41+bolt,-23)], '#9896aa');
    for (const wheelX of [-29, 26]) {
      dot(ctx, wheelX, -12, 12, '#4d3a47', ink);
      dot(ctx, wheelX, -12, 9, '#a56a48');
      const roll = unit.x * .094 + wheelX;
      for (let n = 0; n < 3; n++) {
        const a = roll + n * Math.PI / 3;
        const offset = pt(Math.cos(a) * 8, Math.sin(a) * 8);
        line(ctx, [pt(wheelX-offset.x,-12-offset.y), pt(wheelX+offset.x,-12+offset.y)], '#4d3a47', 1.6);
      }
      dot(ctx, wheelX, -12, 2.8, '#ead0a7');
    }
    ctx.restore();
  }

  function arms(weapon, shoulder, pose, walk, time, ready) {
    const move = pose.draw;
    const snap = pose.recoil;
    const { x, y } = shoulder;
    if (weapon === 'bow') {
      const grip = pt(x + 30 + move * 8, y + 1);
      return { near: pt(x + 15 - move * 25 - snap * 12, y + 1), far: grip, angle: 0 };
    }
    if (weapon === 'crossbow' || weapon === 'matchlock') {
      return { near: pt(x + 8 - snap * 9, y + 12 - move * 8), far: pt(x + 26 - snap * 9, y + 8 - move * 8), angle: 0 };
    }
    if (weapon === 'sling') {
      const angle = time * 3 + move * 6.1;
      return { near: pt(x + 5 + Math.cos(angle) * move * 15 + snap * 32, y + 11 - move * 28),
        far: pt(x - 10, y + 16), angle };
    }
    if (weapon === 'maul' || weapon === 'hook') {
      return { near: pt(x + 12 - move * 9 + snap * 22, y + 15 - move * 39),
        far: pt(x + 22 - move * 13 + snap * 22, y + 19 - move * 38), angle: -.08 - move * 1.38 + snap * .42 };
    }
    if (weapon === 'blade') return { near: pt(x + 10 + walk * 17 + snap * 24 - move * 10, y + 21 - snap * 16), far: pt(x - 9 - walk * 10, y + 17), angle: -.5 + snap * .85 - move * .55 };
    return { near: pt(x + 5 + walk * 4 - move * 13 + snap * 29, y + 10),
      far: pt(x + (ready ? 25 : 10) - walk * 4, y + 21), angle: -.12 - walk * .16 - move * .1 };
  }

  function draw(ctx, unit, x, y, height, time) {
    if (unit.type.role === 'siege') {
      ram(ctx, unit, x, y, height, time);
      return true;
    }
    if (!asset.complete || !asset.naturalWidth) return false;
    const skin = unit.side ? 3 : unit.id.startsWith('stone') ? 0 : unit.id.startsWith('bronze') ? 1 : 2;
    const palette = palettes[skin];
    const weapon = globalThis.SaltBattle.weaponFor(unit);
    const pose = phase(unit, time);
    const dying = unit.dead !== null;
    const fall = dying ? clamp((time - unit.dead) / .51, 0, 1) : 0;
    const run = unit.type.role === 'flank';
    const stride = unit.walking && !dying ? 1 : 0;
    const cycle = time * (run ? 18 : 11.5) + unit.uid * .54;
    const walk = Math.sin(cycle) * stride;
    const bob = stride ? Math.abs(walk) * 3 : Math.sin(time * 3.5 + unit.uid) * 1.1;
    const stagger = clamp(1 - (time - unit.hit) / .20, 0, 1);
    const lean = (run ? stride * 10 : stride * 3) - stagger * 5 + pose.recoil * (unit.type.role === 'ranged' ? -6 : 8);
    const yBody = bob + (unit.braced ? 3.3 : 0);
    const shoulder = pt(lean + 2, -59 + yBody);
    const { near, far, angle } = arms(weapon, shoulder, pose, walk, time, unit.braced);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(height / 102 * unit.facing, height / 102);
    ctx.rotate(-fall * 1.17);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (const leg of [-1, 1]) {
      const reach = leg * walk * (run ? 16 : 12);
      const lift = Math.max(0, Math.cos(cycle) * leg) * stride * 13;
      const tip = pt(leg * 11 + reach + pose.recoil * 7, -lift - 4);
      const knee = pt(leg * 9 + reach * .62 + 6, -21 - lift * .6 + yBody * .3);
      const hip = pt(lean + leg * 4, -36 + yBody);
      limb(ctx, hip, pt((hip.x+knee.x)/2,(hip.y+knee.y)/2), knee, 12, palette.leg);
      limb(ctx, knee, pt((knee.x+tip.x)/2,(knee.y+tip.y)/2), tip, 7.6, leg < 0 ? palette.boot : palette.leg);
      legArmor(ctx, knee, tip, skin, leg === 1);
      shape(ctx, [pt(tip.x-5,tip.y-5), pt(tip.x+3,tip.y-5), pt(tip.x+12,tip.y), pt(tip.x+13,tip.y+3), pt(tip.x-7,tip.y+3)], palette.boot, ink, 2.4);
    }

    const farStart = pt(shoulder.x - 7, shoulder.y + 3);
    limb(ctx, farStart, pt((farStart.x + far.x) / 2 - 5, (farStart.y + far.y) / 2 + 8), far, 8, palette.leg);
    part(ctx, bodies[skin], lean - 4, -28 + yBody, 38, run ? .80 : 1.12);
    part(ctx, heads[skin], lean + 2, -62 + yBody, run ? 41 : 42);

    if (unit.type.role === 'front') shield(ctx, far.x - 5, far.y + 6, skin, palette, unit.braced, unit.type.heavy);
    if (weapon === 'bow') bow(ctx, far, near, pose.draw, pose.released, pose.action);
    else if (weapon === 'crossbow' || weapon === 'matchlock') stock(ctx, near, weapon === 'crossbow');
    else if (weapon === 'sling') {
      if (!pose.released) {
        const stone = pt(near.x + Math.cos(angle) * (pose.action ? 23 : 7), near.y + (pose.action ? Math.sin(angle) * 21 : 17));
        if (pose.draw > .28) {
          ctx.beginPath();
          ctx.arc(near.x, near.y, 23, angle - 1.65, angle);
          ctx.strokeStyle = '#ffe0b583';
          ctx.lineWidth = 2.6;
          ctx.stroke();
        }
      line(ctx, [near, stone], '#e4b382', pose.action ? 2.5 : 3);
        dot(ctx, stone.x, stone.y, 4.8, '#aaa2a9', ink);
      }
    } else pole(ctx, near, angle, weapon, skin);

    const elbow = pt((shoulder.x + near.x) / 2 - 4, (shoulder.y + near.y) / 2 + (weapon === 'bow' ? 9 : 8));
    limb(ctx, shoulder, elbow, near, run ? 8 : 10, palette.skin, palette.light);
    if (skin) {
      const guard = pt((elbow.x+near.x)/2, (elbow.y+near.y)/2);
      shape(ctx, [pt(guard.x-6,guard.y-3), pt(guard.x+5,guard.y-4), pt(guard.x+4,guard.y+4), pt(guard.x-6,guard.y+5)],
        skin === 1 ? '#c79051' : '#78798b', ink, 1.55);
    }
    hand(ctx, near, palette.light);
    if (weapon === 'bow') hand(ctx, far, palette.light);
    if (dying) line(ctx, [pt(lean - 10,-59), pt(lean - 16,-62)], '#e4b081', 2.5);
    ctx.restore();
    return true;
  }

  globalThis.SaltRig = { ready, draw };
})();
