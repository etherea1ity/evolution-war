(function (root) {
  'use strict';

  const FIELD = { width: 1440, height: 720, gates: [105, 1335], rows: [340, 418, 496], towerInset: 140, towerDepth: 1.86, deadline: 440 };
  const STEP = 1 / 30;
  const eras = [
    { name: '石器时代', short: '石器', art: 'gate-stone', roster: ['stone-pike', 'stone-sling', 'stone-runner', 'stone-maul'] },
    { name: '青铜时代', short: '青铜', art: 'gate-bronze', roster: ['bronze-pike', 'bronze-bow', 'bronze-runner', 'bronze-hook'] },
    { name: '铁器时代', short: '铁器', art: 'gate-iron', roster: ['iron-pike', 'iron-bow', 'iron-runner', 'iron-ram'] },
  ];
  const types = {
    'stone-pike': { name: '石矛兵', role: 'front', detail: '架矛拦截冲锋', cost: 27, hp: 101, armor: 5, dmg: 16, rate: 1.1, range: 46, speed: 77, bounty: 6 },
    'stone-sling': { name: '投石手', role: 'ranged', detail: '前排身后持续投石', cost: 35, hp: 44, armor: 0, dmg: 23, rate: 1.34, range: 220, speed: 72, pierce: 3, bounty: 7 },
    'stone-runner': { name: '轻步兵', role: 'flank', detail: '绕侧接近后排', cost: 36, hp: 48, armor: 0, dmg: 29, rate: 1.13, range: 35, speed: 123, bounty: 7 },
    'stone-maul': { name: '石锤兵', role: 'break', detail: '重击震开重盾', cost: 51, unlock: 58, hp: 91, armor: 3, dmg: 32, rate: 1.72, range: 48, speed: 64, bounty: 11 },
    'bronze-pike': { name: '铜盾矛兵', role: 'front', detail: '架矛护翼', cost: 38, hp: 144, armor: 9, dmg: 23, rate: 1.1, range: 51, speed: 77, bounty: 9 },
    'bronze-bow': { name: '青铜弓手', role: 'ranged', detail: '跨排射击，持续输出', cost: 46, hp: 55, armor: 1, dmg: 32, rate: 1.29, range: 245, speed: 73, pierce: 5, bounty: 10 },
    'bronze-runner': { name: '青铜突袭兵', role: 'flank', detail: '从侧面切后排', cost: 49, hp: 66, armor: 2, dmg: 38, rate: 1.13, range: 38, speed: 127, bounty: 11 },
    'bronze-hook': { name: '钩盾兵', role: 'break', detail: '拉开重盾的防御', cost: 62, unlock: 76, hp: 118, armor: 4, dmg: 39, rate: 1.57, range: 55, speed: 68, bounty: 13 },
    'iron-pike': { name: '铁卫', role: 'front', detail: '护送攻城部队', cost: 48, hp: 184, armor: 13, dmg: 30, rate: 1.07, range: 55, speed: 79, bounty: 12 },
    'iron-bow': { name: '铁弩手', role: 'ranged', detail: '射穿重甲', cost: 57, hp: 66, armor: 2, dmg: 44, rate: 1.42, range: 265, speed: 70, pierce: 10, bounty: 13 },
    'iron-runner': { name: '铁刃突袭兵', role: 'flank', detail: '压制火绳枪手', cost: 62, hp: 75, armor: 4, dmg: 45, rate: 1.05, range: 40, speed: 132, bounty: 14 },
    'iron-ram': { name: '铁首攻城车', role: 'siege', detail: '高额要塞伤害', cost: 79, unlock: 68, hp: 265, armor: 9, dmg: 27, gateDmg: 111, rate: 2.0, range: 57, speed: 51, bounty: 19 },
    'red-vanguard': { name: '敌方矛兵', role: 'front', cost: 30, hp: 103, armor: 5, dmg: 17, rate: 1.1, range: 42, speed: 78, bounty: 8 },
    'red-archer': { name: '敌方弓手', role: 'ranged', cost: 38, hp: 47, armor: 1, dmg: 22, rate: 1.32, range: 202, speed: 67, bounty: 8 },
    'red-cutter': { name: '敌方突袭兵', role: 'flank', cost: 44, hp: 58, armor: 1, dmg: 36, rate: 1.15, range: 37, speed: 130, bounty: 12 },
    'red-shield': { name: '敌方重盾兵', role: 'front', heavy: true, cost: 57, hp: 151, armor: 17, dmg: 23, rate: 1.22, range: 47, speed: 60, bounty: 14 },
    'red-gunner': { name: '赤寨火绳枪手', role: 'ranged', cost: 61, hp: 60, armor: 2, dmg: 32, rate: 1.85, range: 272, speed: 65, pierce: 5, bounty: 15 },
    'red-ram': { name: '赤寨撞门车', role: 'siege', cost: 78, hp: 236, armor: 10, dmg: 26, gateDmg: 65, rate: 2.1, range: 62, speed: 47, bounty: 20 },
  };
  const modes = {
    first: { title: '标准', start: 127, income: 6.1, hp: 450, opposite: 525, enemyFunds: 150, enemyIncome: 5.5, introductory: true },
    'first-easy': { title: '演练', start: 145, income: 6.5, hp: 530, opposite: 400, enemyFunds: 150, enemyIncome: 4.8, introductory: true },
    standard: { title: '标准', start: 156, income: 5.55, hp: 980, opposite: 1470, enemyFunds: 155, enemyIncome: 4.7 },
    story: { title: '演练', start: 170, income: 5.85, hp: 1160, opposite: 1370, enemyFunds: 128, enemyIncome: 4.05 },
  };
  const towerTypes = {
    stones: { title: '投石台', price: 78, dmg: 47, range: 229, rate: 2.35, splash: 75, detail: '附近前排与突袭，小范围溅射' },
    bolts: { title: '守关重弩', price: 102, dmg: 77, range: 215, rate: 2.1, splash: 0, pierce: 9, detail: '只射前排与突袭，擅长重甲' },
    red: { title: '赤寨重弩', price: 0, dmg: 36, range: 187, rate: 2.4, splash: 0, detail: '只射前排与突袭' },
  };
  const technologies = {
    brace: { title: '枪阵', detail: '新长矛兵能拦截相邻纵深的突袭。' },
    bodkin: { title: '重箭', detail: '新远程增加穿甲，射击间隔稍长。' },
  };
  const windows = [{ paid: 61, free: 89, cost: 67 }, { paid: 171, free: 201, cost: 96 }];
  const skill = { title: '坚守号角', price: 40, duration: 6, cooldown: 31, radius: 325 };
  const firstWindows = [{ paid: 30, free: 51, cost: 54 }];
  const firstWaves = [
    { at: 5, title: '前排接敌', hint: '先派矛兵，再派投石手。', units: [['red-vanguard', 1], ['red-archer', 1]] },
    { at: 27, title: '敌军绕侧', hint: '两侧有突袭兵。留矛兵保护远程。', units: [['red-vanguard', 1], ['red-cutter', 0], ['red-archer', 2]] },
    { at: 51, title: '重盾推进', hint: '重盾挡普通箭。用重击破盾，或从侧面突袭。', units: [['red-shield', 1], ['red-vanguard', 2], ['red-archer', 1]] },
    { at: 76, title: '最后的援兵', hint: '击退这波，带前排攻打敌门。', units: [['red-shield', 2], ['red-cutter', 0], ['red-archer', 1]] },
  ];
  const waves = [
    { at: 15, title: '斥候试探', hint: '先出石矛兵，再用远程接上。', units: [['red-vanguard', 1], ['red-vanguard', 0], ['red-archer', 1]] },
    { at: 39, title: '绕翼突袭', hint: '赤寨突袭兵正沿道路两侧靠近，留矛兵护住后排。', units: [['red-cutter', 0], ['red-cutter', 2], ['red-vanguard', 1], ['red-archer', 1]] },
    { at: 78, title: '铁盾压阵', hint: '铁盾能挡下正面的普通箭。重击或破盾可以打开缺口。', units: [['red-shield', 1], ['red-shield', 2], ['red-vanguard', 0], ['red-archer', 1]] },
    { at: 112, title: '火绳初鸣', hint: '城门塔打不到火绳枪手。先拦住前排，找机会绕过去。', units: [['red-vanguard', 0], ['red-shield', 1], ['red-gunner', 1], ['red-cutter', 2], ['red-archer', 0]] },
    { at: 152, title: '两翼夹攻', hint: '两侧有突袭，中央有枪手。留一队前排在弓手附近。', units: [['red-cutter', 0], ['red-vanguard', 1], ['red-cutter', 2], ['red-gunner', 0], ['red-gunner', 2], ['red-vanguard', 2]] },
    { at: 189, title: '火器掩护', hint: '火器躲在重盾后面。青铜钩盾或重箭可以削弱这道阵线。', units: [['red-shield', 0], ['red-shield', 2], ['red-gunner', 1], ['red-archer', 2], ['red-gunner', 0], ['red-cutter', 2]] },
    { at: 229, title: '撞门车出阵', hint: '撞门车对城门威胁最大。保护好能持续输出的远程。', units: [['red-vanguard', 0], ['red-shield', 1], ['red-ram', 1], ['red-gunner', 2], ['red-cutter', 0], ['red-gunner', 0]] },
    { at: 268, title: '赤寨守备', hint: '下一波之后是反攻机会。铁卫能护送攻城车。', units: [['red-shield', 1], ['red-gunner', 1], ['red-vanguard', 2], ['red-cutter', 0], ['red-gunner', 0]] },
    { at: 312, title: '最后的援军', hint: '击退这一波，向要塞推进。', units: [['red-shield', 0], ['red-shield', 2], ['red-ram', 1], ['red-gunner', 0], ['red-cutter', 2], ['red-gunner', 2], ['red-vanguard', 1]] },
  ];

  const isTowerTarget = unit => ['front', 'flank', 'break'].includes(unit.type.role);
  const isBackline = unit => ['ranged', 'siege'].includes(unit.type.role);
  const direction = side => side ? -1 : 1;

  function makeSide(hp, supply, income, tower) {
    return { hp, maxHp: hp, supply, income, tower, towerReady: 0, era: 0, points: 0, techs: [], unlocked: [], training: {},
      unitReady: 0, skillUntil: 0, skillReady: 0, kills: 0 };
  }

  function create(mode = 'standard', relic = false) {
    const settings = modes[mode] || modes.standard;
    const player = makeSide(settings.hp, settings.start, settings.income, null);
    const enemy = makeSide(settings.opposite, settings.enemyFunds, settings.enemyIncome, settings.introductory ? null : 'red');
    enemy.era = settings.introductory ? 1 : 2;
    const level = settings.introductory
      ? { deadline: 130, waves: firstWaves, windows: firstWindows, gateArmor: 14 }
      : { deadline: FIELD.deadline, waves, windows };
    return { time: 0, mode, relic, level, sides: [player, enemy], units: [], effects: [], signals: [], nextId: 0, waveIndex: 0, wave: null,
      queue: [], shots: [], queueReady: 0, outcome: null, formation: 'auto', stats: { deployed: 0, towerKills: 0, intercepts: 0, flanks: 0, techs: 0, evolutions: [], damageTaken: 0, rangedDamage: 0 } };
  }

  function signal(state, kind, text, extra = {}) {
    state.signals.push({ kind, text, ...extra });
  }

  function takeSignals(state) {
    return state.signals.splice(0);
  }

  function effect(state, kind, x, depth, data = {}, life = 0.42) {
    state.effects.push({ kind, x, depth, at: state.time, life, ...data });
  }

  function spawn(state, id, side, row, x = FIELD.gates[side] + direction(side) * 63) {
    const original = types[id];
    const camp = state.sides[side];
    const type = { ...original };
    if (camp.training[type.role] === 'attack') type.dmg = Math.round(type.dmg * 1.18);
    if (camp.training[type.role] === 'defense') type.hp = Math.round(type.hp * 1.19);
    if (type.role === 'ranged' && camp.techs.includes('bodkin')) {
      type.pierce = (type.pierce || 0) + 13;
      type.rate *= 1.14;
    }
    const unit = { id, uid: state.nextId++, side, x, row, depth: row, hp: type.hp, type, facing: direction(side), born: state.time,
      ready: state.time + 0.38, strike: -10, hit: -10, dead: null, walking: false, dashing: false, braced: false, motion: null,
      braceRange: camp.techs.includes('brace') ? 1.15 : 0.53, flankLane: row === 1 ? 0 : row,
      interceptedUntil: 0, brokenUntil: 0, hasFlanked: false };
    state.units.push(unit);
    return unit;
  }

  function getRoster(state) {
    return eras[state.sides[0].era].roster;
  }

  function chooseRow(state, type) {
    const allies = state.units.filter(unit => unit.side === 0 && unit.dead === null);
    if (state.formation !== 'auto') return Number(state.formation);
    const order = type.role === 'flank' ? [0, 2] : [1, 0, 2];
    const ranked = order.map(row => {
      const inRow = allies.filter(unit => unit.row === row);
      const count = inRow.filter(unit => unit.type.role === type.role).length;
      const guard = inRow.some(unit => unit.type.role === 'front');
      const entrant = inRow.some(unit => unit.x < FIELD.gates[0] + 123);
      return { row, score: count * 5 + inRow.length + Number(entrant) * 2 - (type.role === 'ranged' && guard ? 7 : 0) };
    });
    ranked.sort((left, right) => left.score - right.score);
    return ranked[0].row;
  }

  function deploy(state, index) {
    const player = state.sides[0];
    const id = getRoster(state)[index];
    const type = types[id];
    if (!type || state.outcome || player.unitReady > state.time || player.supply < type.cost ||
        (type.unlock && !player.unlocked.includes(id))) return false;
    if (state.units.filter(unit => unit.side === 0 && unit.dead === null).length >= 28) return false;
    player.supply -= type.cost;
    player.unitReady = state.time + 0.51;
    state.stats.deployed++;
    const unit = spawn(state, id, 0, chooseRow(state, type));
    effect(state, 'deploy', unit.x, unit.depth, { side: 0 }, 0.5);
    return true;
  }

  function unlock(state) {
    const player = state.sides[0];
    const id = getRoster(state)[3];
    const unit = types[id];
    if (state.outcome || player.unlocked.includes(id) || player.supply < unit.unlock) return false;
    player.supply -= unit.unlock;
    player.unlocked.push(id);
    signal(state, 'research', `${unit.name}已解锁`);
    return true;
  }

  function evolutionStatus(state) {
    const player = state.sides[0];
    const window = state.level.windows[player.era];
    if (!window) return { price: 0, available: false, wait: 0, freeIn: 0 };
    return { price: state.time < window.free ? window.cost : 0, available: state.time >= window.paid,
      wait: Math.max(0, window.paid - state.time), freeIn: Math.max(0, window.free - state.time) };
  }

  function evolve(state) {
    const player = state.sides[0];
    const status = evolutionStatus(state);
    if (state.outcome || !status.available || player.supply < status.price) return false;
    player.supply -= status.price;
    player.era++;
    player.points++;
    state.stats.evolutions.push({ time: state.time, era: player.era, paid: status.price });
    effect(state, 'evolve', FIELD.gates[0], 1, { side: 0 }, 1.24);
    signal(state, 'evolve', `迈入${eras[player.era].name}`, { era: player.era });
    return true;
  }

  function trainingPrice(state) {
    return [42, 54, 67][state.sides[0].era];
  }

  function train(state, role, branch) {
    const player = state.sides[0];
    const cost = trainingPrice(state);
    if (state.outcome || !['front', 'ranged', 'flank'].includes(role) || !['attack', 'defense'].includes(branch) ||
        player.training[role] || player.supply < cost) return false;
    player.supply -= cost;
    player.training[role] = branch;
    signal(state, 'research', branch === 'attack' ? '攻击训练完成' : '防御训练完成');
    return true;
  }

  function research(state, id) {
    const player = state.sides[0];
    if (state.outcome || !technologies[id] || !player.points || player.techs.includes(id)) return false;
    player.points--;
    player.techs.push(id);
    state.stats.techs++;
    signal(state, 'research', `已研究${technologies[id].title}`);
    return true;
  }

  function build(state, id = state.relic ? 'bolts' : 'stones') {
    const player = state.sides[0];
    const turret = towerTypes[id];
    if (state.outcome || (id !== 'stones' && !(id === 'bolts' && state.relic)) || player.tower || player.supply < turret.price) return false;
    player.supply -= turret.price;
    player.tower = id;
    player.towerReady = state.time + 0.6;
    effect(state, 'build', FIELD.gates[0] + 56, 1, { side: 0 }, 0.85);
    signal(state, 'build', `${turret.title}已就位`);
    return true;
  }

  function cast(state) {
    const player = state.sides[0];
    if (state.outcome || player.skillReady > state.time || player.supply < skill.price) return false;
    player.supply -= skill.price;
    player.skillReady = state.time + skill.cooldown;
    player.skillUntil = state.time + skill.duration;
    effect(state, 'rally', FIELD.gates[0] + 30, 1, { side: 0 }, 1.5);
    signal(state, 'rally', '坚守号角已响，城门附近的前排获得减伤');
    return true;
  }

  function stageEnemy(state) {
    const enemy = state.sides[1];
    if (state.level.waves[state.waveIndex]?.at <= state.time) {
      const wave = state.level.waves[state.waveIndex++];
      state.wave = wave;
      for (const pair of wave.units) state.queue.push(pair);
      signal(state, 'wave', wave.title, { detail: wave.hint });
    }
    if (state.queueReady > state.time) return;
    const [id, row] = state.queue[0] || [];
    if (!id || enemy.supply < types[id].cost) return;
    enemy.supply -= types[id].cost;
    state.queueReady = state.time + 1.17;
    state.queue.shift();
    const unit = spawn(state, id, 1, row);
    effect(state, 'deploy', unit.x, unit.depth, { side: 1 }, 0.4);
  }

  function opponent(unit, enemies, minimum = -30) {
    const dir = direction(unit.side);
    let target = null;
    let best = Infinity;
    for (const enemy of enemies) {
      const ahead = (enemy.x - unit.x) * dir;
      const off = Math.abs(enemy.depth - unit.depth);
      if (ahead < minimum) continue;
      const score = Math.abs(ahead) + off * 77;
      if (score < best) {
        target = enemy;
        best = score;
      }
    }
    return target;
  }

  function shotDistance(unit, target) {
    return Math.hypot(unit.x - target.x, (unit.depth - target.depth) * 73);
  }

  function rangedTarget(unit, enemies) {
    let selected = null;
    let best = Infinity;
    for (const enemy of enemies) {
      const distance = shotDistance(unit, enemy);
      const score = distance + (distance > unit.type.range ? 1000 : 0);
      if (score < best) {
        selected = enemy;
        best = score;
      }
    }
    return selected;
  }

  function weaponFor(unit) {
    if (unit.id === 'red-gunner') return 'matchlock';
    if (unit.id === 'stone-sling') return 'sling';
    if (unit.id === 'iron-bow') return 'crossbow';
    if (unit.type.role === 'ranged') return 'bow';
    if (unit.id === 'stone-maul') return 'maul';
    if (unit.type.role === 'break') return 'hook';
    if (unit.type.role === 'flank') return 'blade';
    if (unit.type.role === 'siege') return 'ram';
    return 'spear';
  }

  const windupTimes = { spear: .19, blade: .14, maul: .29, hook: .24, sling: .30, bow: .31, crossbow: .23, matchlock: .34, ram: .26 };
  const flightSpeed = { bow: 590, sling: 470, crossbow: 790, matchlock: 2100 };

  function startMotion(state, unit, target) {
    const weapon = weaponFor(unit);
    const windup = windupTimes[weapon];
    unit.ready = state.time + unit.type.rate;
    unit.strike = state.time;
    unit.motion = { weapon, start: state.time, timing: windup, end: state.time + windup + .23, targetId: target?.uid, delivered: false };
  }

  function releaseMotion(state, unit, enemies, attacks, gate) {
    const { motion, type } = unit;
    const ranged = type.role === 'ranged';
    if (motion.delivered || state.time < motion.start + motion.timing) return;
    motion.delivered = true;
    const target = motion.targetId === undefined ? null : enemies.find(enemy => enemy.uid === motion.targetId);
    if (motion.targetId !== undefined && !target) return;
    if (target && (ranged ? shotDistance(unit, target) > type.range + 25
      : Math.abs(target.x - unit.x) > type.range + 19 || Math.abs(target.depth - unit.depth) > .79)) return;
    const closeShot = ranged && target && Math.abs(target.x - unit.x) < 54;
    const attack = { kind: ranged ? 'shot' : 'hit', source: unit, target, side: unit.side,
      x: target?.x ?? gate, depth: target?.depth ?? unit.depth,
      damage: target ? type.dmg * (closeShot ? .47 : 1) : type.gateDmg || type.dmg, pierce: type.pierce || 0 };
    if (!ranged) {
      if (type.role === 'flank' && target && isBackline(target) && !unit.side && !unit.hasFlanked) {
        unit.hasFlanked = true;
        state.stats.flanks++;
      }
      attacks.push(attack);
      return;
    }
    const distance = target ? shotDistance(unit, target) : Math.abs(unit.x - gate);
    const travel = Math.max(.085, distance / flightSpeed[motion.weapon]);
    state.shots.push({ ...attack, due: state.time + travel });
    effect(state, 'shot', attack.x, attack.depth, { side: unit.side, from: unit.x, fromDepth: unit.depth, sourceId: unit.uid,
      targetId: target?.uid, weapon: motion.weapon, facing: unit.facing }, travel);
  }

  function flankRoute(state, unit, enemies, ordinary, allies) {
    if (unit.type.role !== 'flank' || unit.interceptedUntil > state.time) return { target: ordinary, desired: ordinary?.depth ?? unit.row, bypass: false };
    const dir = direction(unit.side);
    const front = opponent(unit, enemies.filter(enemy => !isBackline(enemy)), -24);
    const rear = opponent(unit, enemies.filter(isBackline), -70);
    if (!rear || Math.abs(rear.x - unit.x) > 390) return { target: ordinary, desired: ordinary?.depth ?? unit.row, bypass: false };
    const engaged = front && allies.some(ally => ['front', 'break', 'siege'].includes(ally.type.role) && Math.abs(ally.x - front.x) < 114);
    if (front && !engaged) return { target: ordinary, desired: ordinary?.depth ?? unit.row, bypass: false };
    if (front && (front.x - unit.x) * dir > -18 && (rear.x - unit.x) * dir > 50) {
      const defense = enemies.filter(enemy => enemy.type.role === 'front' && Math.abs(unit.x - enemy.x) < 182);
      const score = row => Math.abs(unit.depth - row) * 0.4 + defense.filter(enemy => Math.abs(enemy.depth - row) < enemy.braceRange).length * 2;
      if (Math.abs(front.x - unit.x) > 62) unit.flankLane = score(0) <= score(2) ? 0 : 2;
      const guard = defense.find(enemy => Math.abs(enemy.depth - unit.depth) <= enemy.braceRange && Math.abs(enemy.x - unit.x) <= 55);
      if (guard) {
        unit.interceptedUntil = state.time + 2.1;
        if (unit.side) state.stats.intercepts++;
        effect(state, 'brace', unit.x, unit.depth, { side: guard.side }, 0.6);
        return { target: guard, desired: guard.depth, bypass: false };
      }
      return { target: rear, desired: unit.flankLane, bypass: true };
    }
    return { target: rear, desired: rear.depth, bypass: true };
  }

  function planUnit(state, unit, allies, enemies, attacks, dt) {
    const type = unit.type;
    const dir = direction(unit.side);
    const opposingGate = FIELD.gates[1 - unit.side] - dir * 23;
    const ranged = type.role === 'ranged';
    if (unit.motion && state.time < unit.motion.end) {
      releaseMotion(state, unit, enemies, attacks, opposingGate);
      unit.walking = false;
      unit.dashing = false;
      return;
    }
    unit.motion = null;
    const closest = ranged ? rangedTarget(unit, enemies) : opponent(unit, enemies);
    const route = flankRoute(state, unit, enemies, closest, allies);
    const target = route.target;
    const within = target ? ranged ? shotDistance(unit, target) <= type.range
      : Math.abs(target.x - unit.x) <= type.range && Math.abs(target.depth - unit.depth) < .51
      : Math.abs(opposingGate - unit.x) <= Math.max(type.range, unit.side && ranged ? 258 : 0);
    unit.walking = false;
    unit.dashing = type.role === 'flank' && route.bypass && target && isBackline(target) && !within;
    unit.braced = type.role === 'front' && within;
    unit.facing = target && (target.x - unit.x) * dir < -5 ? -dir : dir;
    if (within) {
      if (state.time >= unit.ready) startMotion(state, unit, target);
      return;
    }
    const desired = ranged ? unit.row : route.desired;
    if ((target && Math.abs(target.x - unit.x) < 160) || route.bypass || !target) {
      const delta = desired - unit.depth;
      unit.depth += Math.sign(delta) * Math.min(Math.abs(delta), dt * (route.bypass ? 2.8 : 1.75));
    }
    let allyGap = Infinity;
    for (const friend of allies) {
      if (friend === unit || Math.abs(friend.depth - unit.depth) >= 0.52) continue;
      const ahead = (friend.x - unit.x) * dir;
      if (ahead > 0 || (ahead === 0 && friend.uid < unit.uid)) allyGap = Math.min(allyGap, ahead - (ranged ? 41 : 33));
    }
    let room = Math.abs(opposingGate - unit.x);
    if (target && Math.abs(target.depth - unit.depth) < 0.51) {
      const ahead = (target.x - unit.x) * dir;
      if (ahead > 0) room = Math.min(room, ahead - 16);
    }
    if (target && (target.x - unit.x) * dir < -10) {
      unit.x -= dir * Math.min(type.speed * dt, Math.abs(target.x - unit.x) - 8);
      unit.walking = true;
      return;
    }
    const move = Math.max(0, Math.min(type.speed * dt * (unit.dashing ? 1.13 : 1), allyGap, room));
    unit.x += move * dir;
    unit.walking = move > 0.1;
  }

  function planTower(state, side, enemies, attacks) {
    const camp = state.sides[side];
    const tower = towerTypes[camp.tower];
    if (!tower || camp.towerReady > state.time) return;
    const gate = FIELD.gates[side];
    const targets = enemies.filter(enemy => isTowerTarget(enemy) && Math.abs(enemy.x - gate) <= tower.range + 38);
    targets.sort((left, right) => Math.abs(left.x - gate) - Math.abs(right.x - gate));
    const target = targets[0];
    if (!target) return;
    camp.towerReady = state.time + tower.rate;
    attacks.push({ kind: 'tower', target, side, x: target.x, depth: target.depth, damage: tower.dmg, pierce: tower.pierce || 0,
      from: gate + direction(side) * FIELD.towerInset, fromDepth: FIELD.towerDepth });
    if (!tower.splash) return;
    for (const unit of targets.slice(1)) {
      if (Math.abs(unit.x - target.x) > tower.splash || Math.abs(unit.depth - target.depth) > 0.95) continue;
      attacks.push({ kind: 'splash', target: unit, side, x: unit.x, depth: unit.depth, damage: tower.dmg * 0.55, pierce: 0 });
    }
  }

  function resolve(state, attack) {
    const { target, side, source } = attack;
    const camp = state.sides[side];
    if (target) {
      if (target.dead !== null) return;
      if (source?.type.role === 'break' && target.type.role === 'front' && target.type.armor >= 9) {
        if (target.brokenUntil <= state.time) effect(state, 'break', target.x, target.depth, { side }, 0.77);
        target.brokenUntil = state.time + 2.85;
      }
      const armoring = target.brokenUntil > state.time ? target.type.armor * 0.23 : target.type.armor;
      let dealt = Math.max(2, attack.damage - Math.max(0, armoring - attack.pierce));
      if (source?.type.role === 'ranged' && target.type.heavy && target.brokenUntil <= state.time &&
          attack.pierce < 10 && (source.x - target.x) * direction(target.side) > 0) dealt *= 0.78;
      if (attack.kind === 'shot' && target.dashing && target.walking) dealt *= .48;
      if (source?.type.role === 'front' && target.type.role === 'flank') dealt *= 1.62;
      const targetCamp = state.sides[target.side];
      if (!target.side && targetCamp.skillUntil > state.time && !isBackline(target) && target.x <= FIELD.gates[0] + skill.radius) dealt *= 0.55;
      if (!side && attack.kind === 'shot') state.stats.rangedDamage += Math.min(dealt, target.hp);
      target.hp = Math.max(0, target.hp - dealt);
      target.hit = state.time;
      if (!target.hp) {
        target.dead = state.time;
        camp.supply = Math.min(500, camp.supply + target.type.bounty);
        camp.kills++;
        if (!side && ['tower', 'splash'].includes(attack.kind)) state.stats.towerKills++;
        if (!side) effect(state, 'bounty', target.x, target.depth, { value: target.type.bounty, side }, 0.63);
      }
    } else {
      const targetCamp = state.sides[1 - side];
      const armor = side ? 6 : state.level.gateArmor ?? 26;
      const role = source?.type.role;
      const earlyGate = !side && state.level.gateArmor !== undefined;
      const force = earlyGate && role === 'flank' ? .39 : 1;
      const leverage = earlyGate && role === 'front' ? 1.5 : 1;
      const gatedDamage = Math.max(3, attack.damage * force - armor) * leverage;
      const damage = attack.kind === 'shot' && !side ? Math.max(1, gatedDamage * (earlyGate ? .15 : .29)) : gatedDamage;
      targetCamp.hp = Math.max(0, targetCamp.hp - damage);
      targetCamp.lastHit = state.time;
      if (side) state.stats.damageTaken += Math.ceil(damage);
    }
    if (attack.kind !== 'splash') {
      const kind = attack.kind === 'shot' ? 'impact' : attack.kind;
      effect(state, kind, target?.x ?? attack.x, target?.depth ?? attack.depth, { side, from: attack.from ?? source?.x,
        fromDepth: attack.fromDepth ?? source?.depth ?? 1, target: target?.id, weapon: source?.id, gate: !target }, kind === 'tower' ? .53 : .30);
    }
  }

  function step(state, dt = STEP) {
    if (state.outcome) return;
    state.time += dt;
    for (const camp of state.sides) camp.supply = Math.min(500, camp.supply + camp.income * dt);
    stageEnemy(state);
    const sides = [[], []];
    for (const unit of state.units) if (unit.dead === null) sides[unit.side].push(unit);
    const attacks = [];
    for (let side = 0; side < sides.length; side++) {
      const allies = sides[side];
      const enemies = sides[1 - side];
      planTower(state, side, enemies, attacks);
      for (const unit of allies) planUnit(state, unit, allies, enemies, attacks, dt);
    }
    for (const attack of attacks) resolve(state, attack);
    state.shots = state.shots.filter(shot => {
      if (shot.due > state.time) return true;
      resolve(state, shot);
      return false;
    });
    state.units = state.units.filter(unit => unit.dead === null || state.time - unit.dead < 0.51);
    state.effects = state.effects.filter(item => state.time < item.at + item.life);
    if (state.sides[0].hp <= 0) state.outcome = 'lose';
    else if (state.sides[1].hp <= 0) state.outcome = 'win';
    else if (state.time >= state.level.deadline) state.outcome = 'time';
  }

  const api = { FIELD, STEP, eras, types, modes, towerTypes, technologies, windows, skill, waves,
    create, spawn, step, deploy, unlock, build, cast, evolve, train, research, trainingPrice, evolutionStatus, getRoster, takeSignals, weaponFor };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SaltBattle = api;
})(globalThis);
