import {
  AnimationMixer, Box3, BoxGeometry, CanvasTexture, CylinderGeometry, DataTexture, DirectionalLight,
  Group, HemisphereLight, IcosahedronGeometry, LoopOnce, Mesh, MeshToonMaterial, NearestFilter,
  OrthographicCamera, RedFormat, Scene, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneRig } from 'three/addons/utils/SkeletonUtils.js';
import barbarian from './assets/models/Barbarian.glb';
import knight from './assets/models/Knight.glb';
import ranger from './assets/models/Ranger.glb';
import rogue from './assets/models/Rogue.glb';
import hooded from './assets/models/Rogue_Hooded.glb';
import medium from './assets/models/Rig_Medium.glb';
import axe from './assets/models/axe_1handed.glb';
import greatAxe from './assets/models/axe_2handed.glb';
import bow from './assets/models/bow.glb';
import arrow from './assets/models/arrow_bow.glb';
import crossbow from './assets/models/crossbow_2handed.glb';
import dagger from './assets/models/dagger.glb';
import woodShield from './assets/models/shield_round_barbarian.glb';
import roundShield from './assets/models/shield_round.glb';
import squareShield from './assets/models/shield_square.glb';
import sword from './assets/models/sword_1handed.glb';

const { FIELD } = globalThis.SaltBattle;
const actors = {
  'stone-pike': { body: 'barbarian', theme: 'hide', weapon: 'spear', shield: 'woodShield' },
  'stone-sling': { body: 'rogue', theme: 'sling', weapon: 'sling', hideCape: true },
  'stone-runner': { body: 'barbarian', theme: 'scout', weapon: 'axe', bare: true },
  'stone-maul': { body: 'barbarian', theme: 'scout', weapon: 'maul' },
  'bronze-pike': { body: 'knight', theme: 'bronze', weapon: 'spear', shield: 'roundShield', hideVisor: true },
  'bronze-bow': { body: 'ranger', theme: 'bronze', weapon: 'bow' },
  'bronze-runner': { body: 'rogue', theme: 'bronze', weapon: 'dagger' },
  'bronze-hook': { body: 'knight', theme: 'bronze', weapon: 'greatAxe', bare: true },
  'iron-pike': { body: 'knight', theme: 'steel', weapon: 'sword', shield: 'squareShield' },
  'iron-bow': { body: 'hooded', theme: 'steel', weapon: 'crossbow' },
  'iron-runner': { body: 'rogue', theme: 'steel', weapon: 'dagger' },
  'red-vanguard': { body: 'knight', theme: 'red', weapon: 'spear', shield: 'roundShield', hideVisor: true },
  'red-archer': { body: 'ranger', theme: 'red', weapon: 'bow' },
  'red-cutter': { body: 'rogue', theme: 'red', weapon: 'dagger', hideCape: true },
  'red-shield': { body: 'knight', theme: 'red', weapon: 'spear', shield: 'squareShield', hideVisor: true },
  'red-gunner': { body: 'hooded', theme: 'red', weapon: 'matchlock' },
};

// Attack time markers identify contact or release in KayKit's original clips.
const strikes = {
  spear: ['Melee_1H_Attack_Stab', .54],
  sword: ['Melee_1H_Attack_Slice_Horizontal', .43],
  axe: ['Melee_1H_Attack_Chop', .47],
  dagger: ['Melee_1H_Attack_Slice_Horizontal', .43],
  maul: ['Melee_2H_Attack_Chop', .51],
  greatAxe: ['Melee_2H_Attack_Chop', .51],
  sling: ['Throw', .53],
  crossbow: ['Ranged_2H_Shoot', .41],
  matchlock: ['Ranged_2H_Shoot', .41],
};
const palettes = {
  hide: [61, 104, 88], sling: [55, 92, 95], scout: [69, 104, 78],
  bronze: [53, 113, 102], steel: [69, 106, 128], red: [136, 65, 47],
};
const launcher = new Set(['crossbow', 'matchlock']);
const angle = .32;
const headScale = .74;
const depthScale = Math.sin(angle);
const camera = new OrthographicCamera(-FIELD.width / 2, FIELD.width / 2, FIELD.height / 2, -FIELD.height / 2, 1, 4000);
const scene = new Scene();
const formation = new Group();
const instances = new Map();
const portraits = new Map();
const templates = new Map();
const textures = new Map();
const point = new Vector3();
const loader = new GLTFLoader();
let renderer;
let outline;
let assets;
let clips;
let currentBattle;
let previousTime = 0;

camera.position.set(0, 2050 * Math.sin(angle), 2050 * Math.cos(angle));
camera.lookAt(0, 0, 0);
scene.add(formation, new HemisphereLight(0xf5ebdc, 0x726252, 1.63));
const key = new DirectionalLight(0xffdfb2, 1.9);
key.position.set(-300, 500, 420);
scene.add(key);

const gradient = new DataTexture(new Uint8Array([45, 75, 113, 170, 224, 250]), 6, 1, RedFormat);
gradient.minFilter = NearestFilter;
gradient.magFilter = NearestFilter;
gradient.needsUpdate = true;

const entries = { barbarian, knight, ranger, rogue, hooded, medium, axe, greatAxe,
  bow, arrow, crossbow, dagger, woodShield, roundShield, squareShield, sword };

const ready = (async () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true, preserveDrawingBuffer: true });
  if (!context) return false;
  renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(FIELD.width, FIELD.height, false);
  renderer.setClearColor(0x000000, 0);
  outline = new OutlineEffect(renderer, { defaultThickness: .0036, defaultColor: [.026, .018, .016] });
  const loaded = await Promise.all(Object.entries(entries).map(async ([name, bytes]) =>
    [name, await loader.parseAsync(bytes.buffer, '')]));
  assets = Object.fromEntries(loaded);
  clips = new Map(assets.medium.animations.map(clip => [clip.name, clip]));
  return true;
})().catch(error => {
  console.warn('3D troops could not load. Using the illustrated sprites.', error);
  renderer?.dispose();
  renderer = null;
  return false;
});

function recolor(map, theme, metal) {
  const id = `${map.uuid}/${theme}/${metal}`;
  if (textures.has(id)) return textures.get(id);
  const canvas = document.createElement('canvas');
  canvas.width = map.image.width;
  canvas.height = map.image.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(map.image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const tint = palettes[theme];
  for (let i = 0; i < pixels.data.length; i += 4) {
    const r = pixels.data[i];
    const g = pixels.data[i + 1];
    const b = pixels.data[i + 2];
    const textile = (r > 87 && r < 191 && r > g * 1.36 && g > b * 1.17) ||
      (r > 140 && g < r * .67 && b < r * .67) || (b > r * 1.26 && g > r * 1.16 && g > 90);
    if (textile) {
      const value = .49 + (r + g + b) / 370;
      for (let channel = 0; channel < 3; channel++) pixels.data[i + channel] = tint[channel] * value;
    } else if (metal && (theme === 'bronze' || theme === 'red') && b >= g && g >= r && r > 58) {
      pixels.data[i] = r * 1.06 + 13;
      pixels.data[i + 1] = g * .87 + 4;
      pixels.data[i + 2] = b * .64;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.flipY = map.flipY;
  texture.colorSpace = SRGBColorSpace;
  textures.set(id, texture);
  return texture;
}

function surface(color) {
  return new MeshToonMaterial({ color, gradientMap: gradient });
}

function part(group, geometry, material, x, y, z) {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

function historicalProp(name, theme) {
  const group = new Group();
  const wood = surface(0x704331);
  const bound = surface(0xa68153);
  const stone = surface(theme === 'bronze' ? 0xbe9157 : 0x818f99);
  if (name === 'spear' || name === 'maul') {
    const spear = name === 'spear';
    part(group, new CylinderGeometry(.035, .05, spear ? 1.96 : 1.23, 6), wood, 0, .22, 0);
    part(group, new CylinderGeometry(.057, .057, .22, 6), bound, 0, spear ? 1.08 : .73, 0);
    const head = part(group, new IcosahedronGeometry(1, 0), stone, 0, spear ? 1.30 : .86, 0);
    head.scale.set(spear ? .10 : .33, spear ? .33 : .24, spear ? .04 : .19);
  } else if (name === 'sling') {
    part(group, new CylinderGeometry(.025, .025, .30, 6), bound, .06, .12, .02).rotation.z = -.4;
    part(group, new IcosahedronGeometry(.12, 0), stone, .11, .28, .02);
  } else {
    part(group, new BoxGeometry(.13, .16, 1.5), wood, 0, -.04, .45);
    part(group, new BoxGeometry(.17, .23, .49), wood, 0, -.08, -.29).rotation.x = -.20;
    part(group, new CylinderGeometry(.045, .045, 1.38, 8), stone, 0, .068, .63).rotation.x = Math.PI / 2;
    part(group, new BoxGeometry(.15, .14, .11), bound, 0, .02, .98);
  }
  return group;
}

function equipment(name, theme) {
  return assets[name]?.scene.clone(true) || historicalProp(name, theme);
}

function makeTemplate(id) {
  const spec = actors[id];
  const model = cloneRig(assets[spec.body].scene);
  if (spec.bare) {
    for (const name of ['Knight_Helmet', 'Knight_HelmetVisor', 'Barbarian_BearHat']) {
      const piece = model.getObjectByName(name);
      if (piece) piece.visible = false;
    }
  }
  if (spec.hideVisor) {
    model.getObjectByName('Knight_HelmetVisor').visible = false;
  }
  if (spec.hideCape) model.getObjectByName('Rogue_Cape').visible = false;
  model.getObjectByName('head').scale.setScalar(headScale);
  const bounds = new Box3().setFromObject(model, true);
  const main = equipment(spec.weapon, spec.theme);
  main.name = 'HeldWeapon';
  const left = model.getObjectByName('handslotl');
  const right = model.getObjectByName('handslotr');
  if (spec.weapon === 'bow') {
    left.add(main);
    main.rotation.y = Math.PI;
    main.scale.setScalar(.74);
  } else {
    right.add(main);
    main.rotation.y = launcher.has(spec.weapon) ? Math.PI / 2 : Math.PI;
    main.position.x = launcher.has(spec.weapon) ? -.105 : 0;
    if (spec.weapon === 'dagger') main.scale.setScalar(.86);
  }
  if (spec.shield) {
    const shield = equipment(spec.shield, spec.theme);
    shield.position.set(0, .017, .156);
    left.add(shield);
  }
  if (spec.weapon === 'bow' || spec.weapon === 'crossbow') {
    const bolt = equipment('arrow', spec.theme);
    bolt.name = 'HeldArrow';
    if (spec.weapon === 'bow') model.add(bolt);
    else {
      bolt.position.set(0, .15, .58);
      bolt.scale.setScalar(.55);
      main.add(bolt);
    }
  }
  const materials = new Map();
  model.traverse(object => {
    if (!object.isMesh) return;
    object.frustumCulled = false;
    const original = object.material;
    if (!materials.has(original)) {
      const material = new MeshToonMaterial({
        color: original.color,
        gradientMap: gradient,
        map: original.map ? recolor(original.map, spec.theme, spec.body === 'knight') : null,
        side: original.side,
      });
      materials.set(original, material);
    }
    object.material = materials.get(original);
  });
  return { model, floor: bounds.min.y, height: bounds.max.y - bounds.min.y };
}

function makeActor(id) {
  if (!templates.has(id)) templates.set(id, makeTemplate(id));
  const template = templates.get(id);
  const model = cloneRig(template.model);
  const root = new Group();
  model.position.y = -template.floor;
  root.add(model);
  const materials = new Map();
  model.traverse(object => {
    if (!object.isMesh) return;
    if (!materials.has(object.material)) materials.set(object.material, object.material.clone());
    object.material = materials.get(object.material);
  });
  const grip = model.getObjectByName('HeldWeapon');
  const load = model.getObjectByName('HeldArrow');
  const hand = model.getObjectByName('handslotr');
  const muzzle = new Vector3();
  const string = [];
  if (actors[id].weapon === 'bow') {
    const material = surface(0xf7dfab);
    const geometry = new CylinderGeometry(.013, .013, 1, 5);
    string.push(new Mesh(geometry, material), new Mesh(geometry, material));
    root.add(...string);
  }
  return { root, model, grip, load, hand, head: model.getObjectByName('head'), muzzle, string, height: template.height,
    materials: [...materials.values()], mixer: new AnimationMixer(model), last: null, action: null };
}

function changeAction(actor, name, timed, phase) {
  if (name !== actor.last) {
    const next = actor.mixer.clipAction(clips.get(name));
    next.reset();
    next.clampWhenFinished = timed != null;
    next.paused = timed != null;
    if (timed != null) next.setLoop(LoopOnce, 1);
    if (actor.action) actor.action.fadeOut(.10);
    next.time = phase || 0;
    next.play();
    if (actor.action) next.fadeIn(.10);
    actor.action = next;
    actor.last = name;
  }
  if (timed != null) actor.action.time = clips.get(name).duration * Math.min(.999, Math.max(0, timed));
}

function motionFor(unit, spec, now) {
  if (unit.dead !== null) return ['Death_A', (now - unit.dead) / .48];
  if (unit.motion) {
    const { start, timing, end } = unit.motion;
    const elapsed = Math.max(0, now - start);
    if (spec.weapon === 'bow') {
      if (elapsed < timing) return ['Ranged_Bow_Draw', elapsed / timing];
      return ['Ranged_Bow_Release', (elapsed - timing) / (end - start - timing)];
    }
    const [name, contact] = strikes[spec.weapon];
    const progress = elapsed < timing ? elapsed / timing * contact
      : contact + (elapsed - timing) / (end - start - timing) * (1 - contact);
    return [name, progress];
  }
  if (now - unit.hit < .22) {
    return [spec.shield && unit.braced ? 'Melee_Block_Hit' : 'Hit_A', (now - unit.hit) / .22];
  }
  if (unit.walking) {
    if (spec.weapon === 'bow') return ['Running_HoldingBow', null, .88];
    if (launcher.has(spec.weapon)) return ['Running_HoldingRifle', null, .87];
    return unit.type.role === 'flank' ? ['Running_A', null, 1.12] : ['Walking_A', null, 1.18];
  }
  if (spec.weapon === 'bow') return ['Ranged_Bow_Idle'];
  if (launcher.has(spec.weapon)) {
    const reload = (now - unit.strike - .57) / .49;
    if (reload >= 0 && reload < 1) return ['Ranged_2H_Reload', reload];
    return ['Ranged_2H_Aiming'];
  }
  if (spec.shield && unit.braced) return ['Melee_Blocking'];
  return ['Idle_A'];
}

const up = new Vector3(0, 1, 0);
const forward = new Vector3(0, 0, 1);
const bowTip = new Vector3();
const nock = new Vector3();
const axis = new Vector3();

function aim(actor, unit, now) {
  if (unit.dead !== null) {
    if (actor.load) actor.load.visible = false;
    for (const cord of actor.string) cord.visible = false;
    return;
  }
  const weapon = actors[unit.id].weapon;
  actor.root.updateMatrixWorld(true);
  if (weapon === 'sling') {
    actor.grip.getWorldPosition(actor.muzzle);
    actor.grip.visible = !unit.motion?.delivered;
  }
  if (launcher.has(weapon)) {
    actor.grip.localToWorld(actor.muzzle.set(0, .08, weapon === 'crossbow' ? 1.12 : 1.36));
    if (actor.load) actor.load.visible = !unit.motion?.delivered && actor.last !== 'Ranged_2H_Reload';
  }
  if (weapon !== 'bow') return;
  const pulling = unit.motion && !unit.motion.delivered;
  const stringTension = pulling ? Math.min(1, (now - unit.motion.start) / unit.motion.timing) : 0;
  actor.grip.localToWorld(actor.muzzle.set(.04, 0, 0));
  actor.grip.localToWorld(nock.set(-.256, 0, 0));
  if (pulling) {
    actor.hand.getWorldPosition(point);
    nock.lerp(point, stringTension);
  }
  for (let i = 0; i < actor.string.length; i++) {
    const cord = actor.string[i];
    cord.visible = true;
    actor.grip.localToWorld(bowTip.set(-.256, 0, i ? .949 : -.949));
    actor.root.worldToLocal(bowTip);
    actor.root.worldToLocal(point.copy(nock));
    axis.subVectors(bowTip, point);
    cord.position.copy(bowTip).add(point).multiplyScalar(.5);
    cord.scale.y = axis.length();
    cord.quaternion.setFromUnitVectors(up, axis.normalize());
  }
  actor.load.visible = Boolean(pulling);
  if (actor.load.visible) {
    actor.model.worldToLocal(point.copy(nock));
    actor.model.worldToLocal(bowTip.copy(actor.muzzle));
    axis.subVectors(bowTip, point);
    actor.load.scale.z = Math.max(.35, axis.length() / 1.24 + .14);
    axis.normalize();
    actor.load.position.copy(point).addScaledVector(axis, .62 * actor.load.scale.z);
    actor.load.quaternion.setFromUnitVectors(forward, axis);
  }
}

function removeActor(actor) {
  actor.root.removeFromParent();
  actor.mixer.stopAllAction().uncacheRoot(actor.model);
  for (const material of actor.materials) material.dispose();
  if (actor.string.length) {
    actor.string[0].geometry.dispose();
    actor.string[0].material.dispose();
  }
}

function draw(ctx, poses, state, now) {
  if (!clips || !renderer || renderer.getContext().isContextLost()) return false;
  if (currentBattle !== state) {
    for (const actor of instances.values()) removeActor(actor);
    instances.clear();
    currentBattle = state;
    previousTime = now;
  }
  const delta = Math.max(0, Math.min(.12, now - previousTime));
  previousTime = now;
  const active = new Set();
  for (const { unit, groundX, y, height, opacity } of poses) {
    const spec = actors[unit.id];
    if (!spec) continue;
    active.add(unit.uid);
    if (!instances.has(unit.uid)) {
      const actor = makeActor(unit.id);
      instances.set(unit.uid, actor);
      formation.add(actor.root);
    }
    const actor = instances.get(unit.uid);
    actor.root.position.set(groundX - FIELD.width / 2, 0, (y - FIELD.height / 2) / depthScale);
    actor.root.rotation.y = unit.facing * 1.16;
    actor.root.scale.setScalar(height * 1.23 / actor.height);
    const [name, timed, speed = 1] = motionFor(unit, spec, now);
    changeAction(actor, name, timed, unit.uid * .127 % .7);
    actor.action.timeScale = speed;
    actor.mixer.update(delta);
    actor.head.scale.setScalar(headScale);
    const knockedOut = unit.dead !== null;
    for (const material of actor.materials) {
      material.transparent = knockedOut;
      material.opacity = knockedOut ? opacity : 1;
    }
    aim(actor, unit, now);
  }
  for (const [id, actor] of instances) {
    if (active.has(id)) continue;
    removeActor(actor);
    instances.delete(id);
  }
  renderer.render(scene, camera);
  outline.renderOutline(scene, camera);
  ctx.drawImage(renderer.domElement, 0, 0);
  return true;
}

function origin(id) {
  if (!renderer || renderer.getContext().isContextLost()) return null;
  const actor = instances.get(id);
  if (!actor || !actor.muzzle.lengthSq()) return null;
  point.copy(actor.muzzle).project(camera);
  return { x: (point.x + 1) * FIELD.width / 2, y: (1 - point.y) * FIELD.height / 2 };
}

function portrait(canvas, id) {
  if (!clips || !renderer || !actors[id] || renderer.getContext().isContextLost()) return false;
  if (!portraits.has(id)) {
    const actor = makeActor(id);
    const unit = { id, dead: null, hit: -10, type: {}, uid: 0 };
    actor.root.rotation.y = .42;
    actor.root.position.y = -.40;
    const [name] = motionFor(unit, actors[id], 0);
    changeAction(actor, name, null, .2);
    actor.mixer.update(0);
    actor.head.scale.setScalar(headScale);
    scene.add(actor.root);
    aim(actor, unit, 0);
    formation.visible = false;
    const closeup = new OrthographicCamera(-1.1, 1.1, 1.07, -1.07, .1, 20);
    closeup.position.set(0, 1.65, 5);
    closeup.lookAt(0, .68, 0);
    renderer.render(scene, closeup);
    outline.renderOutline(scene, closeup);
    const portraitImage = document.createElement('canvas');
    portraitImage.width = 132;
    portraitImage.height = 128;
    portraitImage.getContext('2d').drawImage(renderer.domElement, 0, 0, FIELD.width, FIELD.height, 0, 0, 132, 128);
    portraits.set(id, portraitImage);
    formation.visible = true;
    removeActor(actor);
  }
  const size = Math.min(canvas.width, canvas.height);
  canvas.getContext('2d').drawImage(portraits.get(id), (canvas.width - size) / 2, canvas.height - size, size, size);
  return true;
}

globalThis.SaltModels = { ready, draw, origin, portrait, has: id => Boolean(actors[id]) };
