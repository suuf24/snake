// ─── Game Config ───────────────────────────────────────────────
const CONFIG = {
    gridSize: 16,          // 16x16 grid
    cellSize: 1,
    moveInterval: 180,     // ms per step
    initialLength: 3,
    foodGlowColor: 0xff6633,
    snakeColors: [0x44ddff, 0x33bbee, 0x2299dd, 0x44ddbb, 0x66eecc],
};

const GRID = CONFIG.gridSize;
const HALF = GRID / 2;

// ─── Game State ────────────────────────────────────────────────
let snake = [];
let direction = { x: 1, z: 0 };
let inputQueue = [];
let food = null;
let score = 0;
let highScore = parseInt(localStorage.getItem('snake3d_high') || '0');
let gameRunning = false;
let gameOver = false;
let moveStartTime = 0;
const foodParticles = [];

// ─── Explosion / Collision State ────────────────────────────
let exploding = false;
let explosionTimer = 0;
let shakeIntensity = 0;
const baseCamPos = new THREE.Vector3();

// ─── Sound Manager ────────────────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let ambientTimer = null;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playOpeningSound() {
    initAudio();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = audioCtx.currentTime + i * 0.13;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
    });
}

function playEatSound() {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
    osc.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + 0.12);
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.13, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
}

function playCollisionSound() {
    initAudio();
    const sr = audioCtx.sampleRate;
    const buf = audioCtx.createBuffer(1, sr * 0.35, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.08));
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buf;
    const ng = audioCtx.createGain();
    ng.gain.setValueAtTime(0.2, audioCtx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
    noise.connect(ng);
    ng.connect(audioCtx.destination);
    noise.start();

    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.4);
    g.gain.setValueAtTime(0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

function startAmbient() {
    if (ambientTimer) return;
    const pulse = () => {
        if (!gameRunning || gameOver) return;
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 50 + Math.random() * 15;
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.025, audioCtx.currentTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
    };
    pulse();
    ambientTimer = setInterval(pulse, CONFIG.moveInterval);
}

function stopAmbient() {
    if (ambientTimer) {
        clearInterval(ambientTimer);
        ambientTimer = null;
    }
}

// ─── Three.js Setup ────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2a4a);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 50);
camera.position.set(HALF * 1.6, HALF * 1.6, HALF * 1.6);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.prepend(renderer.domElement);

// ─── Lights ────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x88aadd, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffeedd, 1.8);
dirLight.position.set(HALF, HALF * 2.5, HALF);
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x4488ff, 0.5);
fillLight.position.set(-HALF, HALF * 0.5, -HALF);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xff8844, 0.3);
rimLight.position.set(-HALF, -HALF * 0.5, HALF);
scene.add(rimLight);

// ─── Ground Grid ───────────────────────────────────────────────
const gridHelper = new THREE.Group();

// Main grid plane
const gridGeo = new THREE.PlaneGeometry(GRID, GRID);
const gridMat = new THREE.MeshStandardMaterial({
    color: 0x1a2a4a,
    roughness: 0.6,
    metalness: 0.1,
    transparent: true,
    opacity: 0.6,
});
const gridMesh = new THREE.Mesh(gridGeo, gridMat);
gridMesh.rotation.x = -Math.PI / 2;
gridMesh.position.y = -0.51;
gridHelper.add(gridMesh);

// Grid lines
const lineMat = new THREE.LineBasicMaterial({ color: 0x4488cc, transparent: true, opacity: 0.5 });
for (let i = 0; i <= GRID; i++) {
    const pos = -HALF + i;
    // X lines
    const g1 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-HALF, 0, pos),
        new THREE.Vector3(HALF, 0, pos)
    ]);
    gridHelper.add(new THREE.Line(g1, lineMat));
    // Z lines
    const g2 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pos, 0, -HALF),
        new THREE.Vector3(pos, 0, HALF)
    ]);
    gridHelper.add(new THREE.Line(g2, lineMat));
}

scene.add(gridHelper);

// Border walls
const wallMat = new THREE.MeshStandardMaterial({
    color: 0x3a6a9a,
    roughness: 0.4,
    metalness: 0.2,
    transparent: true,
    opacity: 0.3,
});
const wallPositions = [
    { pos: [0, 0.5, -HALF - 0.25], size: [GRID + 0.5, 1, 0.5] },
    { pos: [0, 0.5, HALF + 0.25], size: [GRID + 0.5, 1, 0.5] },
    { pos: [-HALF - 0.25, 0.5, 0], size: [0.5, 1, GRID + 0.5] },
    { pos: [HALF + 0.25, 0.5, 0], size: [0.5, 1, GRID + 0.5] },
];
wallPositions.forEach(w => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...w.size), wallMat);
    mesh.position.set(...w.pos);
    scene.add(mesh);
});

// Corner pillars
const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x4a6a9a,
    roughness: 0.3,
    metalness: 0.6,
});
const corners = [
    [-HALF, 0, -HALF], [HALF, 0, -HALF],
    [-HALF, 0, HALF], [HALF, 0, HALF]
];
corners.forEach(c => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8), pillarMat);
    pillar.position.set(c[0], 0.6, c[2]);
    scene.add(pillar);
});

// ─── Snake Segments Container ──────────────────────────────────
const snakeGroup = new THREE.Group();
scene.add(snakeGroup);

// ─── Materials ─────────────────────────────────────────────────
const foodMat = new THREE.MeshStandardMaterial({
    color: CONFIG.foodGlowColor,
    emissive: CONFIG.foodGlowColor,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.3,
});

const foodGlowMat = new THREE.SphereGeometry(0.35, 16, 16);

// ─── Helper Functions ──────────────────────────────────────────
function gridToWorld(gx, gz) {
    return { x: gx - HALF + 0.5, z: gz - HALF + 0.5 };
}

function worldToGrid(wx, wz) {
    return { x: Math.round(wx + HALF - 0.5), z: Math.round(wz + HALF - 0.5) };
}

function randomGridPos() {
    return {
        x: Math.floor(Math.random() * GRID),
        z: Math.floor(Math.random() * GRID),
    };
}

function isOccupied(gx, gz) {
    return snake.some(s => s.gridX === gx && s.gridZ === gz);
}

function createSnakeSegment(color, isHead = false) {
    const size = isHead ? 0.85 : 0.75;
    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: isHead ? 0.15 : 0.3,
        metalness: isHead ? 0.7 : 0.4,
        emissive: color,
        emissiveIntensity: isHead ? 0.15 : 0.05,
    });
    const mesh = new THREE.Mesh(geo, mat);
    return mesh;
}

function getSnakeColor(index) {
    return CONFIG.snakeColors[index % CONFIG.snakeColors.length];
}

// ─── Food ──────────────────────────────────────────────────────
let foodMesh = null;
let foodGlow = null;
let foodBobbing = 0;

function spawnFood() {
    // Find free cell with safety limit
    const maxAttempts = GRID * GRID * 2;
    let attempts = 0;
    let pos;
    do {
        pos = randomGridPos();
        attempts++;
        if (attempts > maxAttempts) {
            // Grid is nearly full — scan for any free cell
            for (let x = 0; x < GRID; x++) {
                for (let z = 0; z < GRID; z++) {
                    if (!isOccupied(x, z)) {
                        pos = { x, z };
                        attempts = 0;
                        break;
                    }
                }
                if (attempts === 0) break;
            }
            if (attempts > 0) break; // truly full
        }
    } while (isOccupied(pos.x, pos.z));

    food = pos;

    if (foodMesh) {
        scene.remove(foodMesh);
        foodMesh.geometry.dispose();
    }

    // Main food sphere
    const geo = new THREE.SphereGeometry(0.35, 20, 20);
    const mat = foodMat.clone();
    foodMesh = new THREE.Mesh(geo, mat);
    const w = gridToWorld(food.x, food.z);
    foodMesh.position.set(w.x, 0.35, w.z);
    scene.add(foodMesh);

    // Glow ring
    if (foodGlow) scene.remove(foodGlow);
    const glowGeo = new THREE.RingGeometry(0.15, 0.5, 32);
    const glowMat2 = new THREE.MeshBasicMaterial({
        color: CONFIG.foodGlowColor,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
    });
    foodGlow = new THREE.Mesh(glowGeo, glowMat2);
    foodGlow.rotation.x = -Math.PI / 2;
    foodGlow.position.set(w.x, 0.01, w.z);
    scene.add(foodGlow);
}

// ─── Snake ─────────────────────────────────────────────────────
function initSnake() {
    // Clear old
    while (snakeGroup.children.length) {
        const c = snakeGroup.children[0];
        c.geometry?.dispose();
        snakeGroup.remove(c);
    }
    snake = [];
    direction = { x: 1, z: 0 };
    inputQueue = [];

    const startX = Math.floor(GRID / 4);
    const startZ = Math.floor(GRID / 2);

    for (let i = 0; i < CONFIG.initialLength; i++) {
        const gx = startX - i;
        const gz = startZ;
        const color = getSnakeColor(i);
        const mesh = createSnakeSegment(color, i === 0);
        const w = gridToWorld(gx, gz);
        mesh.position.set(w.x, 0.5, w.z);
        mesh.userData.gridX = gx;
        mesh.userData.gridZ = gz;
        mesh.userData.prevX = w.x;
        mesh.userData.prevZ = w.z;
        mesh.userData.targetX = w.x;
        mesh.userData.targetZ = w.z;
        snakeGroup.add(mesh);
        snake.push({ gridX: gx, gridZ: gz, mesh });
    }
}

// ─── Game Logic ────────────────────────────────────────────────
function moveSnake() {
    if (!gameRunning || gameOver) return;

    // Pop next direction from input queue (or keep current)
    const nextDir = inputQueue.shift() || { ...direction };

    const head = snake[0];
    const newX = head.gridX + nextDir.x;
    const newZ = head.gridZ + nextDir.z;

    // Wall collision
    if (newX < 0 || newX >= GRID || newZ < 0 || newZ >= GRID) {
        endGame();
        return;
    }

    // Check if eating food (before collision so we know if tail moves)
    const ate = (newX === food.x && newZ === food.z);

    // Self collision (skip tail only if it will move away)
    const tailWillMove = !ate;
    const limit = tailWillMove ? snake.length - 1 : snake.length;
    for (let i = 0; i < limit; i++) {
        if (snake[i].gridX === newX && snake[i].gridZ === newZ) {
            endGame();
            return;
        }
    }

    direction = { ...nextDir };

    // Store prev positions for all segments (before changes)
    const currPositions = snake.map(seg => ({
        x: seg.mesh.position.x,
        z: seg.mesh.position.z
    }));

    // Move: insert new head, remove tail (unless eating)
    const color = getSnakeColor(0);
    const newHeadMesh = createSnakeSegment(color, true);
    const wh = gridToWorld(newX, newZ);
    newHeadMesh.position.set(wh.x, 0.5, wh.z);
    newHeadMesh.userData.gridX = newX;
    newHeadMesh.userData.gridZ = newZ;
    newHeadMesh.userData.prevX = wh.x;
    newHeadMesh.userData.prevZ = wh.z;
    newHeadMesh.userData.targetX = wh.x;
    newHeadMesh.userData.targetZ = wh.z;
    snakeGroup.add(newHeadMesh);

    const newHead = { gridX: newX, gridZ: newZ, mesh: newHeadMesh };
    snake.unshift(newHead);

    // Move old head to normal segment color
    if (snake.length > 1) {
        const oldHead = snake[1];
        const oldColor = getSnakeColor(1);
        oldHead.mesh.material.color.setHex(oldColor);
        oldHead.mesh.material.emissive.setHex(oldColor);
        oldHead.mesh.material.emissiveIntensity = 0.05;
        oldHead.mesh.material.metalness = 0.4;
        oldHead.mesh.material.roughness = 0.3;
        const s = 0.75;
        oldHead.mesh.scale.set(s / 0.85, s / 0.85, s / 0.85);
    }

    // Detect reverse: new head is at the neck's previous position
    const isReversing = snake.length > 1 && newX === snake[1].gridX && newZ === snake[1].gridZ;

    if (!ate) {
        const tail = snake.pop();
        // Restore prev position before removing (for smooth tail retraction)
        if (tail.mesh.userData.prevX !== undefined) {
            tail.mesh.position.x = tail.mesh.userData.prevX;
            tail.mesh.position.z = tail.mesh.userData.prevZ;
        }
        snakeGroup.remove(tail.mesh);
        tail.mesh.geometry.dispose();
        tail.mesh.material.dispose();
    } else {
        score += 10;
        updateScore();
        playEatSound();
        spawnFoodParticles(gridToWorld(food.x, food.z));
        spawnFood();
    }

    // When reversing, shift body segment meshes to prevent overlap with head
    if (isReversing && snake.length > 2) {
        for (let i = snake.length - 1; i >= 2; i--) {
            const target = snake[i - 1];
            snake[i].mesh.userData.gridX = target.userData.gridX;
            snake[i].mesh.userData.gridZ = target.userData.gridZ;
        }
    }

    // Set target positions for all segments (smooth interpolation in animate loop)
    // and keep mesh at prev position for the start of animation
    snake.forEach((seg, idx) => {
        const from = currPositions[idx] || { x: seg.mesh.position.x, z: seg.mesh.position.z };
        seg.mesh.userData.prevX = from.x;
        seg.mesh.userData.prevZ = from.z;
        const wt = gridToWorld(seg.gridX, seg.gridZ);
        seg.mesh.userData.targetX = wt.x;
        seg.mesh.userData.targetZ = wt.z;
        // Reset mesh to prev position for smooth interpolation
        seg.mesh.position.x = from.x;
        seg.mesh.position.z = from.z;
    });
}

function spawnFoodParticles(worldPos) {
    const particleCount = 20;
    const colors = [0xff6633, 0xff8844, 0xffaa66, 0x44ddff, 0x66eecc];
    for (let i = 0; i < particleCount; i++) {
        const size = 0.05 + Math.random() * 0.1;
        const geo = new THREE.BoxGeometry(size, size, size);
        const mat = new THREE.MeshStandardMaterial({
            color: colors[Math.floor(Math.random() * colors.length)],
            emissive: 0xff8844,
            emissiveIntensity: 0.5,
        });
        const particle = new THREE.Mesh(geo, mat);
        particle.position.set(
            worldPos.x + (Math.random() - 0.5) * 0.3,
            0.3 + Math.random() * 0.3,
            worldPos.z + (Math.random() - 0.5) * 0.3
        );
        particle.userData.vel = new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            4 + Math.random() * 4,
            (Math.random() - 0.5) * 4
        );
        particle.userData.life = 1.0;
        scene.add(particle);
        foodParticles.push(particle);
    }
}

function updateParticles(dt) {
    for (let i = foodParticles.length - 1; i >= 0; i--) {
        const p = foodParticles[i];
        p.userData.vel.y -= 12 * dt;
        p.position.x += p.userData.vel.x * dt;
        p.position.y += p.userData.vel.y * dt;
        p.position.z += p.userData.vel.z * dt;
        p.userData.life -= dt * 1.8;
        p.material.opacity = Math.max(0, p.userData.life);
        p.material.transparent = true;
        p.scale.setScalar(Math.max(0, p.userData.life));
        if (p.userData.life <= 0) {
            scene.remove(p);
            p.geometry.dispose();
            p.material.dispose();
            foodParticles.splice(i, 1);
        }
    }
}

function endGame() {
    gameOver = true;
    gameRunning = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snake3d_high', String(highScore));
        document.getElementById('high-score').textContent = highScore;
    }
    document.getElementById('final-score').textContent = score;

    // Trigger explosion effect instead of instantly showing GAME OVER
    triggerSnakeExplosion();
}

function resetGame() {
    document.getElementById('game-over').classList.remove('visible');
    document.getElementById('start-screen').classList.add('hidden');
    score = 0;
    gameOver = false;
    exploding = false;
    explosionTimer = 0;
    shakeIntensity = 0;
    updateScore();
    initSnake();
    if (foodMesh) { scene.remove(foodMesh); foodMesh = null; }
    // Restore camera position (in case shake left it offset)
    camera.position.copy(baseCamPos);
    camera.lookAt(0, 0, 0);
    spawnFood();
    gameRunning = true;
    moveStartTime = performance.now();
    // Sounds
    playOpeningSound();
    startAmbient();
}

// ─── Explosion Effects ────────────────────────────────────────
function triggerSnakeExplosion() {
    exploding = true;
    explosionTimer = 1.8;
    shakeIntensity = 0.6;

    // Hide food during explosion
    if (foodMesh) foodMesh.visible = false;
    if (foodGlow) foodGlow.visible = false;

    // Sounds
    stopAmbient();
    playCollisionSound();

    // Get head position for blast center
    const head = snake[0];
    const hx = head.mesh.position.x;
    const hz = head.mesh.position.z;

    // Impact particles at collision point
    spawnCollisionParticles({ x: hx, z: hz });

    // Explode each snake segment outward with physics
    snake.forEach((seg) => {
        const dx = seg.mesh.position.x - hx + (Math.random() - 0.5) * 0.5;
        const dz = seg.mesh.position.z - hz + (Math.random() - 0.5) * 0.5;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        const speed = 3 + Math.random() * 5;

        seg.mesh.userData.velX = (dx / len) * speed;
        seg.mesh.userData.velY = 4 + Math.random() * 6;
        seg.mesh.userData.velZ = (dz / len) * speed;
        seg.mesh.userData.rotSpeed = (Math.random() - 0.5) * 15;

        // Brighten material for explosion
        seg.mesh.material.emissiveIntensity = 0.8;
        seg.mesh.material.emissive.setHex(0xff4400);
    });
}

function spawnCollisionParticles(pos) {
    const count = 40;
    const colors = [0xff2222, 0xff4433, 0xff6633, 0xff8833, 0xffaa44, 0xffffff];
    for (let i = 0; i < count; i++) {
        const size = 0.05 + Math.random() * 0.15;
        const geo = new THREE.BoxGeometry(size, size, size);
        const mat = new THREE.MeshStandardMaterial({
            color: colors[Math.floor(Math.random() * colors.length)],
            emissive: 0xff4400,
            emissiveIntensity: 0.8,
            transparent: true,
        });
        const particle = new THREE.Mesh(geo, mat);
        particle.position.set(
            pos.x + (Math.random() - 0.5) * 0.4,
            0.2 + Math.random() * 0.5,
            pos.z + (Math.random() - 0.5) * 0.4
        );
        particle.userData.vel = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            6 + Math.random() * 8,
            (Math.random() - 0.5) * 10
        );
        particle.userData.life = 1.5 + Math.random() * 0.5;
        scene.add(particle);
        foodParticles.push(particle);
    }
}

function updateScore() {
    document.getElementById('score').textContent = score;
}

// ─── Input (with input queue for responsive controls) ─────────
function enqueueDirection(nd) {
    if (!nd) return;
    inputQueue.push(nd);
    if (inputQueue.length > 3) inputQueue.shift();
}

document.addEventListener('keydown', e => {
    if (!gameRunning) return;
    const key = e.key;
    const keyBindings = {
        'ArrowUp': { x: 0, z: -1 }, 'w': { x: 0, z: -1 }, 'W': { x: 0, z: -1 },
        'ArrowDown': { x: 0, z: 1 }, 's': { x: 0, z: 1 }, 'S': { x: 0, z: 1 },
        'ArrowLeft': { x: -1, z: 0 }, 'a': { x: -1, z: 0 }, 'A': { x: -1, z: 0 },
        'ArrowRight': { x: 1, z: 0 }, 'd': { x: 1, z: 0 }, 'D': { x: 1, z: 0 },
    };
    const nd = keyBindings[key];
    if (!nd) return;
    e.preventDefault();
    enqueueDirection(nd);
});

// Touch / swipe
let touchStart = null;
document.addEventListener('touchstart', e => {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });

document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

document.addEventListener('touchend', e => {
    if (!touchStart || !gameRunning) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 20) return;

    let nd = null;
    if (absDx > absDy) {
        nd = dx > 0 ? { x: 1, z: 0 } : { x: -1, z: 0 };
    } else {
        nd = dy > 0 ? { x: 0, z: 1 } : { x: 0, z: -1 };
    }
    enqueueDirection(nd);
    touchStart = null;
}, { passive: true });

// ─── Fixed Camera (aligned with WASD) ────────────────────────
// Camera faces from +Z axis: W=-Z (up), S=+Z (down), A=-X (left), D=+X (right)
// User can orbit manually via mouse drag / two-finger drag
let cameraAngle = 0;

function orbitCamera(angle) {
    const dist = HALF * 1.8;
    const height = HALF * 2.2;
    baseCamPos.set(Math.sin(angle) * dist, height, Math.cos(angle) * dist);
    camera.position.copy(baseCamPos);
    camera.lookAt(0, 0, 0);
}

function setupCamera() {
    orbitCamera(cameraAngle);
}

// ─── Buttons ───────────────────────────────────────────────────
document.getElementById('start-btn').addEventListener('click', resetGame);
document.getElementById('restart-btn').addEventListener('click', resetGame);

// ─── Resize ────────────────────────────────────────────────────
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Render Loop ───────────────────────────────────────────────
let _prevTime = 0;

function animate(time) {
    // Delta time for animations (capped to prevent jumps)
    const dt = _prevTime ? Math.min((time - _prevTime) / 1000, 0.05) : 0.016;
    _prevTime = time;

    // ── Camera base position (reset shake every frame) ──
    camera.position.copy(baseCamPos);
    camera.lookAt(0, 0, 0);

    // Compute progress from moveStartTime for smooth 60fps interpolation
    let moveProgress = 0;
    if (gameRunning && !gameOver) {
        moveProgress = (time - moveStartTime) / CONFIG.moveInterval;
        if (moveProgress >= 1) {
            moveProgress -= 1;
            moveStartTime = time;
            moveSnake();
        }
    }

    // Linear interpolation — perfectly smooth, no easing stutter
    if (gameRunning) {
        const t = Math.min(moveProgress, 1);
        snakeGroup.children.forEach((seg) => {
            const px = seg.userData.prevX;
            const pz = seg.userData.prevZ;
            const tx = seg.userData.targetX;
            const tz = seg.userData.targetZ;
            if (px !== undefined && tx !== undefined) {
                seg.position.x = px + (tx - px) * t;
                seg.position.z = pz + (tz - pz) * t;
            }
        });
    }

    // ── Snake Explosion Effect ──
    if (exploding) {
        explosionTimer -= dt;

        // Physics: apply gravity and move each segment
        snakeGroup.children.forEach((seg) => {
            if (seg.userData.velX !== undefined) {
                seg.userData.velY -= 14 * dt; // gravity
                seg.position.x += seg.userData.velX * dt;
                seg.position.y += seg.userData.velY * dt;
                seg.position.z += seg.userData.velZ * dt;
                seg.rotation.x += seg.userData.rotSpeed * dt;
                seg.rotation.z += seg.userData.rotSpeed * dt;
            }
        });

        // Camera shake
        if (shakeIntensity > 0.01) {
            camera.position.x += (Math.random() - 0.5) * shakeIntensity * 0.6;
            camera.position.y += (Math.random() - 0.5) * shakeIntensity * 0.4;
            camera.position.z += (Math.random() - 0.5) * shakeIntensity * 0.6;
            shakeIntensity *= 0.88;
        }

        // Show game over after explosion animation finishes
        if (explosionTimer <= 0) {
            exploding = false;
            document.getElementById('game-over').classList.add('visible');
        }
    }

    // Food animation
    if (foodMesh && foodMesh.visible) {
        foodBobbing += dt * 3;
        foodMesh.position.y = 0.35 + Math.sin(foodBobbing) * 0.12;
        foodMesh.rotation.y += dt * 2;
        if (foodGlow) {
            foodGlow.scale.setScalar(1 + Math.sin(foodBobbing * 0.8) * 0.15);
            foodGlow.material.opacity = 0.15 + Math.sin(foodBobbing) * 0.08;
        }
    }

    // Snake idle sway
    if (gameRunning && !exploding) {
        snakeGroup.children.forEach((seg, i) => {
            seg.position.y = 0.5 + Math.sin(time * 0.002 + i * 0.5) * 0.03;
        });
    }

    // Particles
    updateParticles(dt);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// ─── Init ──────────────────────────────────────────────────────
document.getElementById('high-score').textContent = highScore;
initSnake();
spawnFood();
setupCamera();
animate(performance.now());

// ─── Manual camera control (mouse drag) ───────────────────────
let isDragging = false;
let prevMouse = { x: 0, y: 0 };

// ─── Manual Camera Orbit (user-initiated drag) ───────────────
renderer.domElement.addEventListener('mousedown', e => {
    isDragging = true;
    prevMouse.x = e.clientX;
    prevMouse.y = e.clientY;
});

window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - prevMouse.x;
    cameraAngle += dx * 0.005;
    prevMouse.x = e.clientX;
    orbitCamera(cameraAngle);
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

// Touch orbit (two fingers)
document.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
        isDragging = true;
        prevMouse.x = e.touches[0].clientX;
    }
}, { passive: true });

document.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && isDragging) {
        const dx = e.touches[0].clientX - prevMouse.x;
        cameraAngle += dx * 0.005;
        prevMouse.x = e.touches[0].clientX;
        orbitCamera(cameraAngle);
    }
}, { passive: true });

document.addEventListener('touchend', () => {
    isDragging = false;
}, { passive: true });

// ─── Prevent page scroll ──────────────────────────────────────
window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
}, { passive: false });

console.log('🐍 3D Snake Game loaded!');
