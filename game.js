(() => {
  'use strict';

  const battle = globalThis.SaltBattle;
  const art = globalThis.SaltArt;
  const get = id => document.getElementById(id);
  const board = get('board');
  const dialogs = ['manual', 'armory', 'fortification'].map(get);
  const storageKey = 'evolution-war.first-level.v1';
  const roles = { front: '前排', ranged: '远程', flank: '突袭' };
  const keys = ['1', '2', '3', '4'];

  function loadProfile() {
    const profile = { coins: 0, clears: 0, best: null, relic: false, muted: false };
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved || saved.version !== 1) return profile;
      if (Number.isSafeInteger(saved.coins) && saved.coins >= 0) profile.coins = saved.coins;
      if (Number.isSafeInteger(saved.clears) && saved.clears >= 0) profile.clears = saved.clears;
      if (Number.isFinite(saved.best) && saved.best >= 0) profile.best = saved.best;
      profile.relic = saved.relic === true;
      profile.muted = saved.muted === true;
    } catch {
      return profile;
    }
    return profile;
  }

  const profile = loadProfile();
  let mode = 'ready';
  let difficulty = 'first';
  let state = battle.create(difficulty);
  let preview = battle.create(difficulty);
  let currentDialog = null;
  let firstFrame = null;
  let accumulator = 0;
  let uiWait = 0;
  let ambient = 0;
  let bannerUntil = 0;
  let lastRoster = '';
  let cards = [];
  let audio = null;
  let lastEffectSound = -10;

  function saveProfile() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, ...profile }));
      return true;
    } catch {
      return false;
    }
  }

  function clock(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    return [Math.floor(total / 60), total % 60].map(value => String(value).padStart(2, '0')).join(':');
  }

  function setText(id, value) {
    const element = get(id);
    const formatted = String(value);
    if (element.textContent !== formatted) element.textContent = formatted;
  }

  function setFeedback(copy) {
    setText('feedback', copy);
  }

  function makeSound(kind = 'click') {
    if (profile.muted) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
      if (audio.state !== 'running') return;
      const names = {
        click: [330, 250, .08, .032, 'sine'], deploy: [200, 132, .13, .051, 'triangle'],
        shot: [296, 104, .11, .028, 'triangle'], impact: [142, 48, .17, .058, 'triangle'],
        wave: [148, 88, .39, .045, 'triangle'], evolve: [293, 580, .64, .064, 'sine'],
        rally: [174, 301, .57, .055, 'triangle'], win: [330, 660, .85, .070, 'sine'], lose: [182, 66, .58, .060, 'triangle'],
      };
      const [from, to, length, volume, shape] = names[kind] || names.click;
      const time = audio.currentTime;
      const source = audio.createOscillator();
      const gain = audio.createGain();
      source.type = shape;
      source.frequency.setValueAtTime(from, time);
      source.frequency.exponentialRampToValueAtTime(to, time + length * .76);
      gain.gain.setValueAtTime(.0001, time);
      gain.gain.exponentialRampToValueAtTime(volume, time + Math.min(length * .17, .03));
      gain.gain.exponentialRampToValueAtTime(.0001, time + length);
      source.connect(gain).connect(audio.destination);
      source.start(time);
      source.stop(time + length + .01);
    } catch {
      return;
    }
  }

  function updateMute() {
    setText('mute', profile.muted ? '音效关' : '音效开');
    get('mute').setAttribute('aria-pressed', String(profile.muted));
  }

  function buildPreview() {
    preview = battle.create(difficulty);
    const player = [['stone-pike', 1, 355], ['stone-sling', 2, 267], ['stone-runner', 0, 413]];
    const enemy = [['red-shield', 2, 1040], ['red-archer', 1, 1161], ['red-vanguard', 0, 981]];
    player.forEach(([id, row, x]) => battle.spawn(preview, id, 0, row, x));
    enemy.forEach(([id, row, x]) => battle.spawn(preview, id, 1, row, x));
    preview.sides[1].tower = null;
  }

  function setMode(next) {
    mode = next;
    get('arena').dataset.mode = next;
    get('overlay').hidden = next === 'playing';
    get('arena-bottom').hidden = next !== 'playing';
    get('pause').disabled = next === 'ready' || next === 'over';
    get('pause').innerHTML = `${next === 'paused' ? '继续' : '暂停'} <kbd>空格</kbd>`;
    if (next !== 'playing') get('wave-announcement').hidden = true;
    if (next === 'playing' && bannerUntil > state.time) get('wave-announcement').hidden = false;
    updateHUD(true);
  }

  function setupOverlay(view) {
    const isReady = view === 'ready';
    const isPaused = view === 'paused';
    get('difficulty').hidden = !isReady;
    get('overlay-restart').hidden = !isPaused;
    get('result-stats').hidden = view !== 'over';
    get('relic-choice').hidden = !isReady || !profile.relic;
    get('overlay-tag').hidden = isReady;
    get('overlay-meta').hidden = isReady && profile.best === null;
    if (isReady) {
      setText('overlay-title', '第一关');
      setText('overlay-copy', '派出前排和远程，攻破对面的城门。');
      setText('overlay-meta', profile.best === null ? '' : `最快通关 ${clock(profile.best)}`);
      get('primary').innerHTML = '进入战场 <span aria-hidden="true">›</span>';
    } else if (isPaused) {
      setText('overlay-tag', '第一关');
      setText('overlay-title', '已暂停');
      setText('overlay-copy', '战斗时间暂停。');
      setText('overlay-meta', `${battle.modes[difficulty].title} · ${clock(state.time)}`);
      setText('primary', '继续战斗');
    }
  }

  function chooseDifficulty(id) {
    if (mode !== 'ready') return;
    difficulty = id;
    state = battle.create(id);
    get('mode-standard').setAttribute('aria-pressed', String(id === 'first'));
    get('mode-story').setAttribute('aria-pressed', String(id === 'first-easy'));
    buildPreview();
    updateHUD(true);
  }

  function enter() {
    state = battle.create(difficulty, profile.relic && get('equip-relic').checked);
    get('formation').value = 'auto';
    accumulator = 0;
    bannerUntil = 0;
    lastEffectSound = -10;
    setFeedback('');
    setMode('playing');
    makeSound();
  }

  function returnToCamp() {
    state = battle.create(difficulty);
    get('formation').value = 'auto';
    buildPreview();
    setupOverlay('ready');
    setMode('ready');
    setFeedback('');
    get('primary').focus({ preventScroll: true });
  }

  function pauseOrResume() {
    if (currentDialog) return;
    if (mode === 'playing') {
      setupOverlay('paused');
      setMode('paused');
      get('primary').focus({ preventScroll: true });
    } else if (mode === 'paused') {
      accumulator = 0;
      setMode('playing');
    }
  }

  function describeUnit(type, index, locked) {
    return locked ? `${type.name} · 花 ${type.unlock} 补给解锁，再花 ${type.cost} 补给招募。${type.detail}`
      : `${type.name} · ${type.cost} 补给。${type.detail}。快捷键 ${keys[index]}`;
  }

  function drawCards() {
    const player = state.sides[0];
    const roster = battle.getRoster(state);
    const signature = roster.join('/') + ':' + player.unlocked.join('/');
    if (signature === lastRoster) return;
    lastRoster = signature;
    cards = roster.map((id, index) => {
      const type = battle.types[id];
      const locked = Boolean(type.unlock && !player.unlocked.includes(id));
      const button = document.createElement('button');
      button.type = 'button';
      button.id = `unit-${index}`;
      button.className = `unit-card${locked ? ' locked' : ''}`;
      button.title = describeUnit(type, index, locked);
      button.setAttribute('aria-label', button.title);
      button.innerHTML = `<canvas width="114" height="94" aria-hidden="true"></canvas><span><span class="unit-name">${type.name}</span><span class="unit-detail">${locked ? '专用兵' : type.detail}</span></span><span class="unit-cost">${locked ? `解锁 ${type.unlock}` : type.cost}</span><kbd aria-hidden="true">${keys[index]}</kbd>`;
      button.addEventListener('click', () => recruit(index));
      art.portrait(button.querySelector('canvas'), id);
      return { button, price: locked ? type.unlock : type.cost, locked };
    });
    get('roster').replaceChildren(...cards.map(card => card.button));
  }

  function updateHUD(force = false) {
    const active = mode === 'playing' && !currentDialog;
    const [player, enemy] = state.sides;
    const camp = battle.eras[player.era];
    const evolutionWindow = state.level.windows[player.era];
    const next = evolutionWindow && battle.eras[player.era + 1];
    const progressing = battle.evolutionStatus(state);
    setText('ally-era', camp.name);
    setText('ally-hp', `${Math.ceil(player.hp)} / ${player.maxHp}`);
    setText('enemy-hp', `${Math.ceil(enemy.hp)} / ${enemy.maxHp}`);
    for (const [id, side] of [['ally-bar', player], ['enemy-bar', enemy]]) {
      const bar = get(id);
      if (bar.max !== side.maxHp) bar.max = side.maxHp;
      if (bar.value !== side.hp) bar.value = side.hp;
    }
    const remaining = Math.ceil(state.level.deadline - state.time);
    const urgent = remaining <= 20 && mode !== 'over';
    setText('clock', clock(remaining));
    get('clock').parentElement.classList.toggle('danger', urgent);
    setText('supply', Math.floor(player.supply + .00001));
    setText('income', `每秒 +${player.income}`);
    get('record').hidden = !profile.coins;
    setText('record', `战利金币 ${profile.coins}${profile.relic ? ' · 守关铜符' : ''}`);
    get('ranged-tally').hidden = !state.stats.rangedDamage;
    setText('ranged-tally', `远程对兵伤害 ${Math.floor(state.stats.rangedDamage)}`);
    if (force) lastRoster = '';
    drawCards();
    const atCapacity = state.units.filter(unit => !unit.side && unit.dead === null).length >= 28;
    for (const card of cards) card.button.disabled = !active || player.supply + .00001 < card.price ||
      (!card.locked && (atCapacity || player.unitReady > state.time));
    get('formation').disabled = !active;

    setText('evolve-name', next ? `升为${next.name}` : `已进入${camp.short}`);
    const paidTime = progressing.wait > 0 ? `抢先 ${clock(Math.ceil(progressing.wait))} · ` : '';
    setText('evolve-detail', !next ? '已开放青铜兵种' : !progressing.freeIn ? '现可免费进化' : `${paidTime}免费 ${clock(Math.ceil(progressing.freeIn))}`);
    setText('evolve-cost', next && progressing.price ? progressing.price : next ? '免费' : '✓');
    get('evolve').disabled = !active || !progressing.available || player.supply < progressing.price;
    get('evolve').classList.toggle('ready', active && progressing.available && player.supply >= progressing.price);
    get('evolve-fill').style.width = `${next ? Math.min(100, state.time / evolutionWindow.free * 100) : 100}%`;
    const defaultTower = state.relic ? 'bolts' : 'stones';
    setText('tower-name', player.tower ? battle.towerTypes[player.tower].title : '工事');
    setText('tower-info', player.tower ? '已建造' : state.relic ? '选择图纸' : `${battle.towerTypes[defaultTower].price} 补给`);
    get('tower').disabled = !active;
    const cooldown = Math.max(0, Math.ceil(player.skillReady - state.time));
    setText('horn-info', player.skillUntil > state.time ? '减伤生效' : cooldown ? `冷却 ${cooldown} 秒` : `${battle.skill.price} 补给`);
    get('horn').disabled = !active || cooldown > 0 || player.supply < battle.skill.price;
    get('research').disabled = !active;
    setText('research-info', player.points ? `${player.points} 点可用` : '训练与科技');

    const coming = state.level.waves[state.waveIndex];
    setText('intel-title', state.wave?.title || '斥候将至');
    setText('intel-detail', state.wave?.hint || '先派矛兵，再让投石手跟上。');
    setText('upcoming', coming ? `${coming.title} · ${Math.ceil(Math.max(0, coming.at - state.time))} 秒` : '攻破敌门');
    get('wave-announcement').hidden = mode !== 'playing' || state.time >= bannerUntil;
  }

  function showBanner(label, copy) {
    setText('wave-announcement-label', label);
    setText('wave-announcement-title', copy);
    bannerUntil = state.time + 2.8;
  }

  function updateSignals() {
    for (const item of battle.takeSignals(state)) {
      if (item.kind === 'wave') {
        showBanner('敌军来袭', item.text);
        setFeedback('');
        makeSound('wave');
      } else if (item.kind === 'evolve') {
        showBanner('时代进化', item.text);
        setFeedback(`${item.text}。可按 T 使用新的科技点。`);
        makeSound('evolve');
      } else {
        setFeedback(item.text);
        makeSound(item.kind === 'rally' ? 'rally' : 'click');
      }
    }
  }

  function act(action, failure) {
    if (mode !== 'playing') return false;
    if (!action()) {
      if (failure) setFeedback(failure);
      return false;
    }
    updateSignals();
    updateHUD();
    return true;
  }

  function recruit(index) {
    if (mode !== 'playing' || currentDialog) return;
    const player = state.sides[0];
    const id = battle.getRoster(state)[index];
    const type = battle.types[id];
    if (type.unlock && !player.unlocked.includes(id)) {
      act(() => battle.unlock(state), `解锁${type.name}需要 ${type.unlock} 补给。`);
    } else if (act(() => battle.deploy(state, index), player.supply < type.cost ? `招募${type.name}需要 ${type.cost} 补给。` : '部队正在出城。')) {
      makeSound('deploy');
    }
  }

  function addOption(container, title, detail, disabled, activate) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'tech-option';
    option.disabled = disabled;
    const name = document.createElement('b');
    name.textContent = title;
    const description = document.createElement('small');
    description.textContent = detail;
    option.append(name, description);
    option.addEventListener('click', activate);
    container.append(option);
  }

  function armory() {
    const player = state.sides[0];
    const price = battle.trainingPrice(state);
    setText('training-cost', `每项 ${price} 补给`);
    setText('tech-points', `${player.points} 点可用`);
    const training = get('training-options');
    training.replaceChildren();
    for (const [id, label] of Object.entries(roles)) {
      const row = document.createElement('div');
      row.className = 'training-line';
      const title = document.createElement('b');
      title.textContent = label;
      row.append(title);
      for (const [command, name, explanation] of [['attack', '攻击', '以后招募的同位置单位，伤害提高 18%。'], ['defense', '防御', '以后招募的同位置单位，生命提高 19%。']]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.disabled = Boolean(player.training[id]) || player.supply < price;
        button.textContent = player.training[id] === command ? `${name} ✓` : name;
        button.classList.toggle('trained', player.training[id] === command);
        button.title = explanation;
        button.setAttribute('aria-label', `${label}${name}，${explanation}`);
        button.addEventListener('click', () => {
          if (act(() => battle.train(state, id, command))) armory();
        });
        row.append(button);
      }
      training.append(row);
    }
    const technology = get('tech-options');
    technology.replaceChildren();
    for (const [id, option] of Object.entries(battle.technologies)) {
      const learned = player.techs.includes(id);
      addOption(technology, `${option.title}${learned ? ' ✓' : ' · 1 点'}`, option.detail, learned || !player.points, () => {
        if (act(() => battle.research(state, id))) armory();
      });
    }
  }

  function fortification() {
    const player = state.sides[0];
    const choices = state.relic ? ['stones', 'bolts'] : ['stones'];
    const list = get('tower-options');
    list.replaceChildren();
    for (const id of choices) {
      const weapon = battle.towerTypes[id];
      const label = player.tower === id ? `${weapon.title} · 已建造` : `${weapon.title} · ${weapon.price} 补给`;
      addOption(list, label, weapon.detail, Boolean(player.tower) || player.supply < weapon.price, () => {
        if (act(() => battle.build(state, id))) closeDialog(get('fortification'));
      });
    }
  }

  function openDialog(id) {
    if (currentDialog || (id !== 'manual' && mode !== 'playing')) return;
    if (id === 'armory') armory();
    if (id === 'fortification') fortification();
    currentDialog = get(id);
    currentDialog.showModal();
    updateHUD();
  }

  function releaseDialog(dialog) {
    if (currentDialog !== dialog) return;
    currentDialog = null;
    accumulator = 0;
    updateHUD();
  }

  function closeDialog(dialog) {
    dialog.close();
    releaseDialog(dialog);
  }

  function finish() {
    const won = state.outcome === 'win';
    const first = won && profile.clears === 0;
    const earnedRelic = won && !profile.relic && state.sides[0].hp / state.sides[0].maxHp >= .4;
    const reward = (first ? 60 : 0) + (earnedRelic ? 25 : 0);
    let saved = true;
    if (won) {
      profile.clears++;
      profile.coins += reward;
      profile.relic ||= earnedRelic;
      profile.best = profile.best === null ? state.time : Math.min(profile.best, state.time);
      saved = saveProfile();
    }
    setText('overlay-tag', `第一关 · ${battle.modes[difficulty].title}`);
    setText('overlay-title', won ? '通关' : state.outcome === 'time' ? '时间到' : '城门失守');
    setText('overlay-copy', won ? earnedRelic ? '我方城门守住四成以上，获得守关铜符。' : '敌方城门已攻破。'
      : state.outcome === 'time' ? '试试用近战加快攻城，远程负责打兵。' : '让矛兵保护远程，或留补给修建城门工事。');
    const stats = get('result-stats');
    const entries = [[clock(state.time), '用时'], [battle.eras[state.sides[0].era].short, '最终时代'], [won ? `+${reward}` : `${state.sides[0].kills}`, won ? '战利金币' : '击退敌军']];
    stats.innerHTML = entries.map(([value, label]) => `<div><b>${value}</b><small>${label}</small></div>`).join('');
    setText('overlay-meta', saved ? '' : '本次进度仅保留在当前页面');
    setText('primary', '返回');
    setupOverlay('over');
    setMode('over');
    setFeedback(won ? '第一关已完成。' : '本关结束。');
    get('primary').focus({ preventScroll: true });
    makeSound(won ? 'win' : 'lose');
  }

  function frame(timestamp) {
    const delta = Math.min(.15, (timestamp - (firstFrame || timestamp)) / 1000);
    firstFrame = timestamp;
    if (mode === 'ready' || (mode === 'playing' && !currentDialog)) ambient += delta;
    if (mode === 'playing' && !currentDialog) {
      accumulator += delta;
      while (accumulator >= battle.STEP && !state.outcome) {
        battle.step(state);
        accumulator -= battle.STEP;
      }
      updateSignals();
      if (state.time - lastEffectSound > .19) {
        const recent = state.effects.find(item => item.at >= state.time - delta - battle.STEP && ['tower', 'shot', 'break'].includes(item.kind));
        if (recent && recent.at > lastEffectSound) {
          lastEffectSound = state.time;
          makeSound(recent.kind === 'shot' ? 'shot' : 'impact');
        }
      }
      if (state.outcome) finish();
      uiWait += delta;
      if (uiWait >= .087) {
        uiWait = 0;
        updateHUD();
      }
    }
    art.scene(board, mode === 'ready' ? preview : state, ambient, mode === 'ready');
    requestAnimationFrame(frame);
  }

  get('primary').addEventListener('click', () => {
    if (mode === 'ready') enter();
    else if (mode === 'paused') pauseOrResume();
    else if (mode === 'over') returnToCamp();
  });
  get('mode-standard').addEventListener('click', () => chooseDifficulty('first'));
  get('mode-story').addEventListener('click', () => chooseDifficulty('first-easy'));
  get('pause').addEventListener('click', pauseOrResume);
  get('overlay-restart').addEventListener('click', returnToCamp);
  get('help').addEventListener('click', () => openDialog('manual'));
  get('research').addEventListener('click', () => openDialog('armory'));
  get('tower').addEventListener('click', () => openDialog('fortification'));
  get('horn').addEventListener('click', () => act(() => battle.cast(state), '号角需要补给，并有冷却。'));
  function advanceEra() {
    const status = battle.evolutionStatus(state);
    act(() => battle.evolve(state), state.sides[0].era >= state.level.windows.length ? '已进入青铜时代。'
      : status.available ? `抢先升代需要 ${status.price} 补给。` : `还要 ${Math.ceil(status.wait)} 秒才可抢先升代。`);
  }
  get('evolve').addEventListener('click', advanceEra);
  get('formation').addEventListener('change', event => { state.formation = event.target.value; });
  get('mute').addEventListener('click', () => {
    profile.muted = !profile.muted;
    updateMute();
    saveProfile();
    makeSound();
  });
  get('fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setFeedback('当前浏览器无法切换全屏。');
    }
  });
  document.addEventListener('fullscreenchange', () => setText('fullscreen', document.fullscreenElement ? '退出全屏' : '全屏'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && mode === 'playing' && !currentDialog) pauseOrResume();
  });
  for (const dialog of dialogs) {
    dialog.querySelector('[data-close]').addEventListener('click', () => closeDialog(dialog));
    dialog.addEventListener('close', () => releaseDialog(dialog));
  }
  document.addEventListener('keydown', event => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || currentDialog || event.target.closest?.('input, select, textarea')) return;
    const key = event.key.toLowerCase();
    if (key === ' ' && (mode === 'playing' || (mode === 'paused' && event.target.id !== 'primary'))) {
      event.preventDefault();
      pauseOrResume();
      return;
    }
    if (mode !== 'playing') return;
    if (keys.includes(key)) recruit(keys.indexOf(key));
    else if (key === 'e') advanceEra();
    else if (key === 'f') act(() => battle.cast(state), '号角需要补给，并有冷却。');
    else if (key === 't') openDialog('armory');
    else if (key === 'b') openDialog('fortification');
  });

  buildPreview();
  updateMute();
  setupOverlay('ready');
  updateHUD(true);
  art.ready.then(() => {
    lastRoster = '';
    drawCards();
    updateHUD();
  });
  requestAnimationFrame(frame);
})();
