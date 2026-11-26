const test = require('node:test');
const assert = require('node:assert/strict');
const battle = require('../battle.js');

const player = state => state.sides[0];

function advance(state, seconds) {
  for (let tick = 0; tick < Math.ceil(seconds / battle.STEP); tick++) battle.step(state);
}

test('income accrues for both sides and kills give one fixed reward', () => {
  const state = battle.create();
  const [ally, enemy] = state.sides;
  const initial = state.sides.map(side => side.supply);
  const opponent = battle.spawn(state, 'red-vanguard', 1, 1, 614);
  opponent.hp = 1;
  battle.spawn(state, 'stone-pike', 0, 1, 585);
  advance(state, 1);
  assert.equal(ally.kills, 1);
  assert.equal(enemy.kills, 0);
  assert.ok(Math.abs(ally.supply - (initial[0] + ally.income + opponent.type.bounty)) < 0.01);
  assert.ok(Math.abs(enemy.supply - (initial[1] + enemy.income)) < 0.01);
});

test('paid and free evolution windows preserve old troops and fortification', () => {
  const state = battle.create();
  const ally = player(state);
  assert.equal(battle.evolve(state), false);
  assert.equal(battle.build(state), true);
  assert.equal(battle.deploy(state, 0), true);
  const oldTroop = state.units[0];
  state.time = battle.windows[0].paid;
  ally.supply = battle.windows[0].cost - 1;
  assert.equal(battle.evolve(state), false);
  ally.supply++;
  assert.equal(battle.evolve(state), true);
  assert.equal(ally.supply, 0);
  assert.equal(ally.tower, 'stones');
  assert.equal(oldTroop.id, 'stone-pike');
  assert.equal(battle.getRoster(state)[0], 'bronze-pike');
  state.time = battle.windows[1].free;
  assert.equal(battle.evolve(state), true);
  assert.equal(ally.supply, 0);
  assert.equal(ally.points, 2);
  assert.equal(battle.evolve(state), false);
});

test('special-unit research, training and technology apply to future recruits', () => {
  const state = battle.create();
  const ally = player(state);
  ally.supply = 500;
  assert.equal(battle.deploy(state, 3), false);
  assert.equal(battle.unlock(state), true);
  assert.equal(battle.unlock(state), false);
  assert.equal(battle.deploy(state, 3), true);
  const untrained = battle.spawn(state, 'stone-pike', 0, 0, 500);
  assert.equal(battle.train(state, 'front', 'defense'), true);
  assert.equal(battle.train(state, 'front', 'attack'), false);
  ally.points = 1;
  assert.equal(battle.research(state, 'brace'), true);
  assert.equal(battle.research(state, 'bodkin'), false);
  state.time = battle.windows[0].free;
  assert.equal(battle.evolve(state), true);
  assert.equal(battle.deploy(state, 3), false);
  assert.equal(battle.deploy(state, 0), true);
  assert.equal(untrained.hp, battle.types['stone-pike'].hp);
  assert.equal(untrained.braceRange, 0.53);
  const bronze = state.units.at(-1);
  assert.equal(bronze.hp, Math.round(battle.types['bronze-pike'].hp * 1.19));
  assert.equal(bronze.braceRange, 1.15);
});

test('the tower can kill an eligible unit without ever hitting nearby ranged troops', () => {
  const state = battle.create();
  assert.equal(battle.build(state, 'bolts'), false);
  assert.equal(battle.build(state, 'stones'), true);
  const frontline = battle.spawn(state, 'red-vanguard', 1, 1, 220);
  const rear = battle.spawn(state, 'red-gunner', 1, 1, 250);
  const second = battle.spawn(state, 'red-cutter', 1, 0, 222);
  frontline.hp = 1;
  second.hp = 1;
  advance(state, 6.8);
  assert.equal(frontline.hp, 0);
  assert.equal(second.hp, 0);
  assert.equal(rear.hp, rear.type.hp);
  assert.equal(state.stats.towerKills, 2);
});

test('a spear intercepts a runner trying to reach the rear', () => {
  const state = battle.create();
  const runner = battle.spawn(state, 'stone-runner', 0, 0, 650);
  battle.spawn(state, 'stone-pike', 0, 1, 678);
  battle.spawn(state, 'red-vanguard', 1, 0, 696);
  battle.spawn(state, 'red-archer', 1, 0, 770);
  battle.step(state);
  assert.ok(runner.interceptedUntil > state.time);
});

test('unsupported archers fall in two close-range attacks from a basic raider', () => {
  const state = battle.create();
  battle.spawn(state, 'stone-runner', 0, 0, 500);
  const archer = battle.spawn(state, 'red-archer', 1, 0, 531);
  advance(state, 0.57);
  assert.ok(archer.hp > 0 && archer.hp < archer.type.hp);
  advance(state, 1.2);
  assert.equal(archer.hp, 0);
});

test('a covered slinger shoots across rows and damage arrives with the projectile', () => {
  const state = battle.create();
  const slinger = battle.spawn(state, 'stone-sling', 0, 2, 508);
  battle.spawn(state, 'stone-pike', 0, 1, 659);
  const enemy = battle.spawn(state, 'red-vanguard', 1, 1, 695);
  let fired = false;
  for (let tick = 0; tick < 60 && !fired; tick++) {
    battle.step(state);
    fired = state.shots.some(shot => shot.source === slinger && shot.target === enemy);
  }
  assert.equal(fired, true);
  assert.equal(state.stats.rangedDamage, 0);
  advance(state, .5);
  assert.ok(state.stats.rangedDamage >= 19);
  assert.ok(enemy.hp < enemy.type.hp);
});

test('the horn reduces damage to nearby troops and enforces cooldown', () => {
  function duel(withHorn) {
    const state = battle.create();
    const guard = battle.spawn(state, 'stone-pike', 0, 1, 245);
    battle.spawn(state, 'red-vanguard', 1, 1, 279);
    if (withHorn) {
      assert.equal(battle.cast(state), true);
      assert.equal(battle.cast(state), false);
    }
    advance(state, 0.7);
    return guard.hp;
  }
  assert.ok(duel(true) > duel(false));
});

test('the iron ram deals much more damage to a gate than a basic infantry unit', () => {
  function gateDamage(id) {
    const state = battle.create();
    const gate = state.sides[1];
    battle.spawn(state, id, 0, 1, 1284);
    advance(state, 0.84);
    return gate.maxHp - gate.hp;
  }
  assert.ok(gateDamage('iron-ram') > 10 * gateDamage('iron-pike'));
});

test('two gate outcomes and the time limit stop the battle', () => {
  const won = battle.create();
  const lost = battle.create();
  const late = battle.create();
  won.sides[1].hp = 0;
  lost.sides[0].hp = 0;
  late.time = battle.FIELD.deadline;
  [won, lost, late].forEach(state => battle.step(state));
  assert.equal(won.outcome, 'win');
  assert.equal(lost.outcome, 'lose');
  assert.equal(late.outcome, 'time');
  const settledSupply = player(won).supply;
  advance(won, 1);
  assert.equal(player(won).supply, settledSupply);
});
test('the first level fields a Bronze Age opponent and allows only one evolution', () => {
  const state = battle.create('first');
  assert.equal(state.sides[1].era, 1);
  assert.equal(state.level.deadline, 130);
  assert.equal(battle.evolve(state), false);
  state.time = 30;
  assert.equal(battle.evolutionStatus(state).price, 54);
  assert.equal(battle.evolve(state), true);
  assert.equal(state.sides[0].era, 1);
  state.time = 115;
  assert.equal(battle.evolve(state), false);
  assert.ok(state.level.waves.every(wave => wave.units.every(([id]) => id !== 'red-gunner' && id !== 'red-ram')));
});
