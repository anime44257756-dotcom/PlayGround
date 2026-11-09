import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

const startButton = document.getElementById('startButton');
const message = document.getElementById('message');
const powerFill = document.getElementById('powerFill');
const powerValue = document.getElementById('powerValue');
const nightValue = document.getElementById('nightValue');
const clockValue = document.getElementById('clockValue');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#070910');
scene.fog = new THREE.FogExp2('#090c15', 0.075);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.08, 60);
camera.position.set(0, 1.68, 3.2);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.insertBefore(renderer.domElement, document.body.firstChild);

const state = {
  running: false,
  power: 100,
  time: 0,
  yaw: 0,
  pitch: 0,
  locked: false,
  keys: {},
  doors: { left: false, right: false },
  doorCooldown: 0,
  enemy: { active: false, distance: 11, side: 'left', attack: false, attackTimer: 0 },
  startTimestamp: 0,
};

const mat = (color, roughness = 0.9, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const m = {
  wall: mat('#55565c'), floor: mat('#3c3637'), darkWall: mat('#1b1b20'), wood: mat('#634637'), woodLight: mat('#8b6955'),
  blanket: mat('#4c3441'), sheet: mat('#aaa7a2'), pillow: mat('#d0c8b7'), blue: mat('#29374a'), gold: mat('#bf8b46'),
  plush: mat('#8e4b31'), black: mat('#111015'), eye: new THREE.MeshStandardMaterial({ color: '#f5e8ca', emissive: '#d9ac55', emissiveIntensity: 1.2 }),
  redEye: new THREE.MeshStandardMaterial({ color: '#ff251f', emissive: '#ff1008', emissiveIntensity: 2.8 }),
};

scene.add(new THREE.HemisphereLight('#aebbd7', '#403238', 1.15));
scene.add(new THREE.AmbientLight('#ffffff', 0.48));
const roomFill = new THREE.DirectionalLight('#c3cbe0', 1.15);
roomFill.position.set(-2, 6, 4);
scene.add(roomFill);
const ceilingLight = new THREE.PointLight('#d5b78e', 1.8, 11, 1.6);
ceilingLight.position.set(0, 2.8, 0.6);
scene.add(ceilingLight);
const lamp = new THREE.PointLight('#fff1cf', 0, 11, 1.7);
lamp.position.set(0, 1.9, 1.9);
scene.add(lamp);
const flashlight = new THREE.SpotLight('#fff3d4', 0, 22, Math.PI / 7, 0.55, 1.2);
flashlight.position.copy(camera.position);
flashlight.target.position.set(0, 1.4, -5);
scene.add(flashlight, flashlight.target);
flashlight.castShadow = true;
flashlight.shadow.mapSize.set(512, 512);

function box(name, size, material, position, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = options.castShadow !== false;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// A child’s bedroom opening onto a deep, unlit hallway.
box('bedroom floor', [9, 0.2, 9], m.floor, [0, -0.12, 0]);
box('ceiling', [9, 0.2, 9], m.darkWall, [0, 3.35, 0]);
box('back wall', [9, 3.5, 0.2], m.wall, [0, 1.65, 4.5]);
box('left wall', [0.2, 3.5, 9], m.wall, [-4.5, 1.65, 0]);
box('right wall', [0.2, 3.5, 9], m.wall, [4.5, 1.65, 0]);
box('hall floor', [5.4, 0.16, 15], m.darkWall, [0, -0.16, -8.9]);
box('hall ceiling', [5.4, 0.18, 15], m.darkWall, [0, 3.3, -8.9]);
for (const x of [-2.7, 2.7]) {
  box('hall side front', [0.18, 3.4, 1.3], m.wall, [x, 1.55, -2.05]);
  box('hall side beyond door', [0.18, 3.4, 12.1], m.wall, [x, 1.55, -10.15]);
}
box('hall end', [5.4, 3.4, 0.18], m.darkWall, [0, 1.55, -16.3]);

// Scuffed wall panels, faded stars and picture frames.
for (let x = -3.7; x <= 3.8; x += 1.25) {
  box('wall panel', [0.025, 1.15, 0.09], m.wood, [x, 1.55, 4.37], { castShadow: false });
}
for (const [x, y, color] of [[-3.1, 2.3, '#d2ad63'], [-2.3, 2.65, '#7388a8'], [2.8, 2.45, '#be7564'], [3.4, 2.8, '#d2ad63']]) {
  const star = new THREE.Mesh(new THREE.CircleGeometry(0.13, 5), mat(color));
  star.position.set(x, y, 4.36);
  scene.add(star);
}
box('picture frame', [0.84, 0.72, 0.09], m.wood, [-1.4, 2.45, 4.34]);
box('picture', [0.68, 0.56, 0.02], m.blue, [-1.4, 2.45, 4.28], { castShadow: false });

// Bed, blanket, pillows and a toy bear at the foot.
box('bed frame', [3.35, 0.48, 4.0], m.wood, [0.1, 0.38, 1.25]);
box('mattress', [3.2, 0.28, 3.8], m.sheet, [0.1, 0.69, 1.12]);
box('rumpled blanket', [3.22, 0.32, 2.25], m.blanket, [0.1, 0.9, 1.8]);
box('pillow left', [1.05, 0.23, 0.77], m.pillow, [-0.75, 0.91, -0.65]);
box('pillow right', [1.05, 0.23, 0.77], m.pillow, [0.8, 0.91, -0.65]);
for (const x of [-1.25, 1.45]) box('bed leg', [0.18, 0.7, 0.18], m.wood, [x, 0.1, 2.7]);

function makeToy(x, z, color = m.plush, scale = 1) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.38 * scale, 14, 12), color);
  body.scale.set(0.9, 1.15, 0.7); body.position.y = 0.55 * scale; group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3 * scale, 14, 12), color);
  head.position.y = 1.02 * scale; group.add(head);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.13 * scale, 0.34 * scale, 8), color);
    ear.position.set(side * 0.19 * scale, 1.31 * scale, 0); ear.rotation.z = side * -0.15; group.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045 * scale, 8, 8), m.eye);
    eye.position.set(side * 0.105 * scale, 1.06 * scale, 0.258 * scale); group.add(eye);
  }
  group.position.set(x, 0.02, z);
  scene.add(group);
  return group;
}
makeToy(1.4, -1.0, m.plush, 0.7);
makeToy(-2.2, 2.75, m.woodLight, 0.75);

// Bedside tables, lamp and clutter.
for (const x of [-3.35, 3.35]) {
  box('nightstand', [1.1, 1.2, 0.9], m.wood, [x, 0.55, 0.8]);
  box('drawer', [0.92, 0.25, 0.03], m.woodLight, [x, 0.75, 0.32]);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), m.gold);
  knob.position.set(x, 0.75, 0.27); scene.add(knob);
}
const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.1, 12), m.gold);
lampBase.position.set(-3.35, 1.2, 0.8); scene.add(lampBase);
const shade = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.48, 12, 1, true), mat('#b48a52'));
shade.position.set(-3.35, 1.52, 0.8); scene.add(shade);

// The two bedroom doorways. Doors slide down from the lintel when powered on.
const doors = {};
for (const [side, x] of [['left', -2.43], ['right', 2.43]]) {
  box(`${side} doorway frame`, [0.32, 2.5, 0.4], m.wood, [x, 1.2, -3.7]);
  box(`${side} hall trim`, [0.12, 2.2, 0.12], m.gold, [x + (side === 'left' ? 0.2 : -0.2), 1.18, -3.48]);
  const door = box(`${side} door`, [2.2, 2.45, 0.22], m.wood, [side === 'left' ? -4 : 4, 2.8, -3.65]);
  door.material = mat('#593c31');
  doors[side] = door;
  box(`${side} handle`, [0.07, 0.07, 0.08], m.gold, [side === 'left' ? -4.8 : 4.8, 1.15, -3.48]);
}

// Curtains, toy chest and floorboards add readable depth to the room.
box('toy chest', [1.4, 0.68, 0.72], m.wood, [2.55, 0.34, 3.25]);
box('chest lid', [1.48, 0.12, 0.8], m.woodLight, [2.55, 0.72, 3.25]);
for (let i = -4; i <= 4; i++) {
  const line = new THREE.Mesh(new THREE.BoxGeometry(8.7, 0.012, 0.012), mat('#221e20'));
  line.position.set(0, -0.01, i * 0.86); scene.add(line);
}

function buildMonster() {
  const group = new THREE.Group();
  const hide = mat('#231a20');
  const shell = mat('#704a3b');
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.45, 0.65), shell);
  torso.position.y = 1.1; group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.66, 16, 14), shell);
  head.position.y = 2.18; group.add(head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.68, 9), shell);
    ear.position.set(s * 0.48, 2.83, 0); ear.rotation.z = s * -0.15; group.add(ear);
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), hide);
    socket.position.set(s * 0.24, 2.23, 0.53); group.add(socket);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), m.redEye);
    eye.position.set(s * 0.24, 2.23, 0.68); group.add(eye);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.35, 0.3), shell);
    arm.position.set(s * 0.65, 1.07, 0.08); arm.rotation.z = s * -0.18; group.add(arm);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.34), shell);
    leg.position.set(s * 0.25, 0.28, 0); group.add(leg);
    for (let i = 0; i < 3; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 5), mat('#ddd2b8'));
      tooth.position.set(-0.2 + i * 0.2, 1.78, 0.57); tooth.rotation.x = Math.PI; group.add(tooth);
    }
  }
  for (let i = 0; i < 5; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.45, 6), hide);
    spike.position.set(-0.35 + i * 0.18, 2.78, -0.1); group.add(spike);
  }
  group.visible = false;
  scene.add(group);
  return group;
}
const monster = buildMonster();

function setMessage(text) { message.textContent = text; }
function updateHUD() {
  powerFill.style.width = `${state.power}%`;
  powerValue.textContent = `${Math.ceil(state.power)}%`;
  nightValue.textContent = '1';
  const gameMinutes = Math.min(360, Math.floor(state.time));
  const hour = gameMinutes >= 360 ? 6 : Math.floor(gameMinutes / 60) % 12 || 12;
  const minute = gameMinutes >= 360 ? 0 : gameMinutes % 60;
  clockValue.textContent = `${hour}:${String(minute).padStart(2, '0')} AM`;
}
function startGame() {
  state.running = true;
  state.power = 100;
  state.time = 0;
  state.yaw = 0;
  state.pitch = 0;
  state.enemy.active = false;
  state.enemy.attack = false;
  state.enemy.distance = 11;
  state.enemy.side = 'left';
  state.doors.left = false;
  state.doors.right = false;
  state.doorCooldown = 0;
  camera.position.set(0, 1.68, 3.2);
  startButton.classList.add('hidden');
  startButton.textContent = 'Start Night';
  setMessage('Listen carefully. Check both doors. Survive until 6 AM.');
}
function endGame(text, won = false) {
  state.running = false;
  document.exitPointerLock?.();
  state.locked = false;
  startButton.textContent = won ? 'Play Again' : 'Try Again';
  startButton.classList.remove('hidden');
  setMessage(text);
}
function doorToggle(side) {
  if (!state.running || state.doorCooldown > 0) return;
  state.doors[side] = !state.doors[side];
  state.doorCooldown = 0.25;
}
function setKey(code, down) {
  state.keys[code] = down;
  if (!down) return;
  if (code === 'KeyQ') doorToggle('left');
  if (code === 'KeyE') doorToggle('right');
  if (code === 'KeyF' && state.running) {
    lamp.intensity = lamp.intensity > 0 ? 0 : 2.7;
    flashlight.intensity = lamp.intensity > 0 ? 8 : 0;
  }
  if (code === 'KeyR') startGame();
}

function update(dt) {
  if (!state.running) return;
  state.time += dt * 10; // a full six-minute night lasts about 36 seconds
  state.doorCooldown = Math.max(0, state.doorCooldown - dt);
  const moving = state.keys.KeyW || state.keys.KeyA || state.keys.KeyS || state.keys.KeyD;
  if (moving) {
    const sprinting = state.keys.ShiftLeft || state.keys.ShiftRight;
    const speed = sprinting && state.power > 2 ? 3.1 : 1.8;
    if (sprinting && state.power > 0) state.power = Math.max(0, state.power - dt * 0.8);
    const forward = new THREE.Vector3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    const right = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
    if (state.keys.KeyW) camera.position.addScaledVector(forward, speed * dt);
    if (state.keys.KeyS) camera.position.addScaledVector(forward, -speed * dt);
    if (state.keys.KeyD) camera.position.addScaledVector(right, speed * dt);
    if (state.keys.KeyA) camera.position.addScaledVector(right, -speed * dt);
  }
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -3.9, 3.9);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -3.9, 3.3);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = state.yaw;
  camera.rotation.x = state.pitch;

  const doorUse = Number(state.doors.left) + Number(state.doors.right);
  state.power = Math.max(0, state.power - dt * (0.12 + doorUse * 0.9 + (lamp.intensity > 0 ? 0.5 : 0)));
  if (state.power <= 0) {
    lamp.intensity = 0;
    flashlight.intensity = 0;
    endGame('The power is gone. Something is in the room.');
  }

  for (const side of ['left', 'right']) {
    const door = doors[side];
    const targetY = state.doors[side] ? 1.2 : 2.8;
    door.position.y += (targetY - door.position.y) * Math.min(1, dt * 8);
  }
  if (state.time > 30) {
    state.enemy.active = true;
    const nearestSide = state.enemy.side;
    const blocked = state.doors[nearestSide];
    state.enemy.distance -= dt * (blocked ? 0.06 : 0.115 + state.time / 2600);
    if (state.enemy.distance < 6.7 && !blocked) setMessage(`Footsteps at the ${nearestSide} door...`);
    if (state.enemy.distance <= 2.6 && !blocked) {
      state.enemy.attack = true;
      state.enemy.attackTimer += dt;
      if (state.enemy.attackTimer > 0.75) endGame('The nightmare found you.');
    } else if (blocked && state.enemy.distance < 3.5) {
      state.enemy.distance = 9;
      state.enemy.side = nearestSide === 'left' ? 'right' : 'left';
      state.enemy.attackTimer = 0;
      setMessage('A heavy thud at the door... it moved away.');
    }
  }
  if (state.enemy.active) {
    const offset = state.enemy.side === 'left' ? -1.5 : 1.5;
    monster.position.set(offset, 0, -3.65 - Math.max(0, state.enemy.distance - 2.2) * 1.8);
    monster.rotation.y = state.enemy.side === 'left' ? 0.3 : -0.3;
    monster.visible = state.enemy.distance < 7;
    if (state.enemy.attack) monster.scale.setScalar(1 + Math.max(0, 0.3 - state.enemy.attackTimer) * 1.7);
    else monster.scale.setScalar(1);
  }
  if (state.time >= 360) endGame('6 AM. You survived the night.', true);
  updateHUD();
}

function render() {
  requestAnimationFrame(render);
  const dt = Math.min(clock.getDelta(), 0.04);
  update(dt);
  flashlight.position.copy(camera.position);
  flashlight.position.y += 0.12;
  const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  flashlight.target.position.copy(camera.position).addScaledVector(direction, 8);
  lamp.intensity = Math.min(lamp.intensity, state.power > 0 ? 2.7 : 0);
  renderer.render(scene, camera);
}
const clock = new THREE.Clock();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});
window.addEventListener('keydown', (event) => {
  if (['KeyQ', 'KeyE', 'KeyF', 'KeyR', 'Space'].includes(event.code)) event.preventDefault();
  setKey(event.code, true);
});
window.addEventListener('keyup', (event) => setKey(event.code, false));
window.addEventListener('mousemove', (event) => {
  if (!state.locked || !state.running) return;
  state.yaw -= event.movementX * 0.0025;
  state.pitch = THREE.MathUtils.clamp(state.pitch - event.movementY * 0.002, -0.9, 0.9);
});
document.addEventListener('pointerlockchange', () => { state.locked = document.pointerLockElement === renderer.domElement; });
renderer.domElement.addEventListener('click', () => {
  if (!state.running) startGame();
  renderer.domElement.requestPointerLock?.();
});
startButton.addEventListener('click', () => {
  startGame();
  if (matchMedia('(pointer: fine)').matches) renderer.domElement.requestPointerLock?.();
});
for (const button of document.querySelectorAll('#mobileControls button[data-key]')) {
  const code = button.dataset.key;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    if (code === 'KeyQ' || code === 'KeyE' || code === 'KeyF') setKey(code, true);
    else setKey(code, true);
  });
  const release = (event) => { event.preventDefault(); setKey(code, false); };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
}
let touchLook = null;
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'touch') return;
  touchLook = { x: event.clientX, y: event.clientY };
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'touch' || !touchLook || !state.running) return;
  state.yaw -= (event.clientX - touchLook.x) * 0.006;
  state.pitch = THREE.MathUtils.clamp(state.pitch - (event.clientY - touchLook.y) * 0.004, -0.9, 0.9);
  touchLook = { x: event.clientX, y: event.clientY };
});
renderer.domElement.addEventListener('pointerup', () => { touchLook = null; });
updateHUD();
render();
