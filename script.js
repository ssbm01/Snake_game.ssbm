(() => {
  // ===== Canvas & DOM References =====
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const miniCanvas = document.getElementById('minimap');
  const miniCtx = miniCanvas.getContext('2d');
  const prevCanvas = document.getElementById('previewCanvas');
  const prevCtx = prevCanvas.getContext('2d');

  const bgMusic = document.getElementById('bgMusic');
  const hud = document.getElementById('hud');
  const startScreen = document.getElementById('startScreen');
  const pauseScreen = document.getElementById('pauseScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const scoreValEl = document.getElementById('scoreVal');
  const bestScoreEl = document.getElementById('bestScoreDisplay');
  const lastScoreEl = document.getElementById('lastScoreDisplay');
  const lbListEl = document.getElementById('lbList');
  const lbSelfEl = document.getElementById('lbSelf');
  const boostBtn = document.getElementById('boostBtn');
  const exitBtn = document.getElementById('exitBtn');
  const playBtn = document.getElementById('playBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const quitBtn = document.getElementById('quitBtn');
  const retryBtn = document.getElementById('retryBtn');
  const menuBtn = document.getElementById('menuBtn');
  const nameInput = document.getElementById('playerNameInput');

  // ===== Game Constants =====
  const WORLD_RADIUS = 1650;
  const WALL_INNER_RADIUS = WORLD_RADIUS - 36; // Strict inner stone boundary
  const AI_COUNT = 18;
  const BASE_FOOD_COUNT = 220;
  const BASE_SPEED = 132;
  const BOOST_SPEED = 248;
  const TURN_SPEED = 4.6;

  // 12 Diverse Colors
  const COLORS = [
    { name: 'Red', main: '#ff3b4e', dark: '#9e1120', light: '#ff8a96' },
    { name: 'Cyan', main: '#2be4ff', dark: '#087996', light: '#9ef4ff' },
    { name: 'Purple', main: '#a55eff', dark: '#501db0', light: '#d6b5ff' },
    { name: 'Gold', main: '#ffd22b', dark: '#ad6f00', light: '#fff099' },
    { name: 'HotPink', main: '#ff4db8', dark: '#9c1265', light: '#ffa6db' },
    { name: 'Orange', main: '#ff8224', dark: '#a63b00', light: '#ffc28c' },
    { name: 'Blue', main: '#4287ff', dark: '#1241a3', light: '#9ec2ff' },
    { name: 'Lime', main: '#b8f224', dark: '#5e960a', light: '#e8ff78' },
    { name: 'Magenta', main: '#e83bff', dark: '#800f94', light: '#f4a3ff' },
    { name: 'Coral', main: '#ff6f61', dark: '#a82c20', light: '#ffb4ad' },
    { name: 'Teal', main: '#20f0b5', dark: '#098562', light: '#99ffe2' },
    { name: 'Silver', main: '#dce6ff', dark: '#6c7ca3', light: '#ffffff' }
  ];

  const PATTERNS = [
    { id: 'flower', label: '🌼' },
    { id: 'heart', label: '❤️' },
    { id: 'star', label: '⭐' },
    { id: 'paw', label: '🐾' },
    { id: 'ring', label: '⭕' },
    { id: 'plain', label: '✨' }
  ];

  const FOOD_COLORS = ['#2bff6a', '#ff3d68', '#33d6ff', '#ffe63b', '#c45cff', '#ff8c2b'];
  const BOT_NAMES = [
    'Tom', 'Kip', 'Oreo', 'Scott', 'Luna', 'Rocher', 'Aaryu', 'Merve',
    'Quick', 'Dr.Comet', 'Dusky', 'Nova', 'Zoro', 'Pixel', 'Max', 'Bella', 'Leo', 'Kai'
  ];
  const RANDOM_PLAYER_NAMES = ['Mc', 'Nova', 'Ace', 'Rex', 'Sky', 'Zed', 'Kai', 'Leo'];

  // ===== Sound Engine (Web Audio API) =====
  let audioCtx = null;
  let lastBoostSound = 0;

  function initAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playTone(freq, endFreq, dur, type = 'sine', vol = 0.16) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), audioCtx.currentTime + dur);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  }

  function sfxStart() {
    playTone(340, 680, 0.14, 'triangle', 0.2);
    setTimeout(() => playTone(540, 900, 0.18, 'sine', 0.18), 85);
  }

  function sfxEat(isMedium) {
    if (isMedium) playTone(520, 940, 0.11, 'sine', 0.15);
    else playTone(440, 720, 0.08, 'sine', 0.11);
  }

  function sfxBoost() {
    const now = performance.now();
    if (now - lastBoostSound < 180) return;
    lastBoostSound = now;
    playTone(170, 265, 0.12, 'sawtooth', 0.055);
  }

  // Softer, smoother Blast Sound Effect
  function sfxBlast(volumeScale = 1) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const dur = 0.42;
    const bufferSize = Math.floor(audioCtx.sampleRate * dur);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.8);
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, now);
    filter.frequency.exponentialRampToValueAtTime(95, now + dur);

    const nGain = audioCtx.createGain();
    nGain.gain.setValueAtTime(0.42 * volumeScale, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(audioCtx.destination);
    noise.start(now);

    // Warm smooth pop/thump instead of harsh crunch
    playTone(125, 36, 0.36, 'sine', 0.38 * volumeScale);
    playTone(85, 28, 0.42, 'triangle', 0.3 * volumeScale);
  }

  function stopMusic() {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      bgMusic.pause();
    } else if (state === 'playing') {
      bgMusic.play().catch(() => {});
    }
  });
  window.addEventListener('pagehide', stopMusic);

  // ===== Game State =====
  let state = 'menu'; // 'menu' | 'playing' | 'paused' | 'gameover'
  let selectedColorIdx = 7;
  let selectedPattern = 'flower';
  let bestScore = parseInt(localStorage.getItem('st_best') || '0', 10);
  let lastScore = 0;

  let snakes = [];
  let player = null;
  let foods = [];
  let particles = [];
  let popups = [];
  let stones = [];
  let stars = [];

  let camera = { x: 0, y: 0, zoom: 1 };
  let steerTouchId = null;
  let boostHeld = false;
  let pointerScreen = { x: 0, y: 0, active: false };
  let lastTime = 0;
  let worldTime = 0;
  let kingSnake = null;
  let gameOverTimer = null;
  let colorCycleIdx = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // ===== Bright Moving Stars & Dense 3D Blue-Purple Stone Wall =====
  function initEnvironment() {
    stars = [];
    const starTints = ['#ffffff', '#cce8ff', '#fff2b8', '#d6c7ff'];
    for (let i = 0; i < 260; i++) {
      stars.push({
        x: (Math.random() - 0.5) * WORLD_RADIUS * 2.9,
        y: (Math.random() - 0.5) * WORLD_RADIUS * 2.9,
        r: Math.random() * 2.4 + 1.1,
        alpha: Math.random() * 0.5 + 0.5,
        depth: Math.random() * 0.55 + 0.5,
        twinkle: Math.random() * Math.PI * 2,
        sparkle: i % 5 === 0,
        tint: starTints[i % starTints.length]
      });
    }

    stones = [];
    // Inner dense overlapping stone ring (no gaps)
    const innerCount = 150;
    for (let i = 0; i < innerCount; i++) {
      const a = (i / innerCount) * Math.PI * 2;
      stones.push({
        orbitAngle: a,
        orbitSpeed: 0.006,
        dist: WORLD_RADIUS + (i % 2 === 0 ? 4 : 18),
        rx: 42 + Math.random() * 14,
        ry: 32 + Math.random() * 12,
        rot: a + Math.PI / 2 + (Math.random() - 0.5) * 0.5,
        rotSpeed: (Math.random() - 0.5) * 0.15,
        layer: 'front'
      });
    }
    // Outer scattered floating stones behind the wall
    const outerCount = 85;
    for (let i = 0; i < outerCount; i++) {
      const a = (i / outerCount) * Math.PI * 2 + Math.random() * 0.05;
      stones.push({
        orbitAngle: a,
        orbitSpeed: -0.008,
        dist: WORLD_RADIUS + 68 + Math.random() * 85,
        rx: 22 + Math.random() * 22,
        ry: 18 + Math.random() * 18,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        layer: 'back'
      });
    }
  }

  // ===== Ring Food =====
  function spawnFood(x, y, forcedColor = null, forcedType = null) {
    if (x === undefined || y === undefined) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * (WALL_INNER_RADIUS - 100);
      x = Math.cos(a) * d;
      y = Math.sin(a) * d;
    }
    const isMedium = forcedType ? forcedType === 'medium' : Math.random() < 0.28;
    foods.push({
      x,
      y,
      r: isMedium ? 6.8 : 4.0,
      type: isMedium ? 'medium' : 'small',
      color: forcedColor || FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)],
      pulse: Math.random() * Math.PI * 2
    });
  }

  // ===== Snake Class =====
  class Snake {
    constructor(name, x, y, colorObj, pattern, isPlayer = false, initScore = 0) {
      this.name = name;
      this.x = x;
      this.y = y;
      this.angle = Math.random() * Math.PI * 2;
      this.targetAngle = this.angle;
      this.color = colorObj;
      this.pattern = pattern;
      this.isPlayer = isPlayer;
      this.score = initScore;
      this.alive = true;
      this.boosting = false;
      this.boostHoldTime = 0;
      this.aiTimer = 0;
      this.shieldTimer = isPlayer ? 3.0 : 0;

      this.path = [];
      const initLen = this.getSegmentCount() * 4;
      for (let i = 0; i < initLen; i++) {
        this.path.push({
          x: x - Math.cos(this.angle) * i * 2.2,
          y: y - Math.sin(this.angle) * i * 2.2
        });
      }
      this.segments = [];
      this.rebuildSegments();
    }

    // Starts slim (8.5px) and gradually grows thicker with length/score
    getRadius() {
      return Math.min(34, 8.5 + Math.pow(Math.max(0, this.score), 0.39) * 0.92);
    }

    getSegmentCount() {
      return Math.min(220, 14 + Math.floor(Math.max(0, this.score) / 10));
    }

    getFlareCount() {
      if (this === kingSnake) return 5;
      if (this.score >= 1600) return 5;
      if (this.score >= 850) return 4;
      if (this.score >= 380) return 3;
      if (this.score >= 130) return 2;
      return 1;
    }

    rebuildSegments() {
      const targetSegs = this.getSegmentCount();
      const spacing = this.getRadius() * 0.46;
      const segs = [{ x: this.x, y: this.y }];
      let acc = 0;
      let prev = this.path[0] || { x: this.x, y: this.y };

      for (let i = 1; i < this.path.length && segs.length < targetSegs; i++) {
        const pt = this.path[i];
        const d = Math.hypot(pt.x - prev.x, pt.y - prev.y);
        acc += d;
        if (acc >= spacing) {
          segs.push({ x: pt.x, y: pt.y });
          acc = 0;
        }
        prev = pt;
      }
      const maxPath = Math.max(90, targetSegs * 9);
      if (this.path.length > maxPath) this.path.length = maxPath;
      this.segments = segs;
    }

    update(dt) {
      if (!this.alive) return;
      if (this.shieldTimer > 0) this.shieldTimer = Math.max(0, this.shieldTimer - dt);

      if (!this.isPlayer) this.updateAI(dt);

      if (this.boosting && this.score >= 100) {
        this.boostHoldTime += dt;
        const drainRate = Math.min(20, 8 + this.boostHoldTime * 4.5);
        this.score = Math.max(0, this.score - drainRate * dt);
        if (this.isPlayer) sfxBoost();
        if (this.score < 100) {
          this.boosting = false;
          this.boostHoldTime = 0;
        }
      } else {
        this.boosting = false;
        this.boostHoldTime = 0;
      }

      let diff = Math.atan2(
        Math.sin(this.targetAngle - this.angle),
        Math.cos(this.targetAngle - this.angle)
      );
      const maxTurn = TURN_SPEED * dt;
      if (Math.abs(diff) <= maxTurn) this.angle = this.targetAngle;
      else this.angle += Math.sign(diff) * maxTurn;

      const spd = this.boosting ? BOOST_SPEED : BASE_SPEED;
      this.x += Math.cos(this.angle) * spd * dt;
      this.y += Math.sin(this.angle) * spd * dt;

      // Strict Stone Wall Boundary Check (impossible to cross outside)
      const distCenter = Math.hypot(this.x, this.y);
      const maxAllowed = WALL_INNER_RADIUS - this.getRadius();
      if (distCenter >= maxAllowed) {
        const nx = this.x / distCenter;
        const ny = this.y / distCenter;
        this.x = nx * maxAllowed;
        this.y = ny * maxAllowed;
        killSnake(this);
        return;
      }

      this.path.unshift({ x: this.x, y: this.y });
      this.rebuildSegments();
    }

    updateAI(dt) {
      this.aiTimer -= dt;
      const distCenter = Math.hypot(this.x, this.y);

      if (distCenter > WALL_INNER_RADIUS - 260) {
        this.targetAngle = Math.atan2(-this.y, -this.x) + (Math.random() - 0.5) * 0.35;
        this.boosting = false;
        return;
      }

      const lookX = this.x + Math.cos(this.angle) * 125;
      const lookY = this.y + Math.sin(this.angle) * 125;
      for (const other of snakes) {
        if (other === this || !other.alive) continue;
        for (let i = 0; i < other.segments.length; i += 2) {
          const s = other.segments[i];
          const d = Math.hypot(lookX - s.x, lookY - s.y);
          if (d < other.getRadius() + 72) {
            this.targetAngle = Math.atan2(this.y - s.y, this.x - s.x);
            this.boosting = this.score > 160 && Math.random() < 0.28;
            return;
          }
        }
      }

      if (this.aiTimer <= 0) {
        this.aiTimer = 0.28 + Math.random() * 0.35;
        let bestFood = null;
        let bestScoreDist = 360;
        for (let i = 0; i < foods.length; i += 2) {
          const f = foods[i];
          const d = Math.hypot(f.x - this.x, f.y - this.y);
          const weight = f.type === 'medium' ? d * 0.65 : d;
          if (weight < bestScoreDist) {
            bestScoreDist = weight;
            bestFood = f;
          }
        }
        if (bestFood) {
          this.targetAngle = Math.atan2(bestFood.y - this.y, bestFood.x - this.x);
          this.boosting = this.score > 180 && bestFood.type === 'medium' && Math.random() < 0.22;
        } else {
          this.targetAngle += (Math.random() - 0.5) * 1.1;
          this.boosting = false;
        }
      }
    }
  }

  // ===== Blast & Death Drop =====
  function createBlast(x, y, colorHex) {
    particles.push({ x, y, r: 12, alpha: 1, type: 'wave' });
    for (let i = 0; i < 36; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 65 + Math.random() * 240;
      particles.push({
        x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        r: 4 + Math.random() * 11,
        alpha: 1,
        decay: 1.3 + Math.random() * 1.1,
        type: 'fire',
        color: i % 3 === 0 ? '#fff59d' : (i % 2 === 0 ? '#ff8f1f' : colorHex)
      });
    }
  }

  function killSnake(snake) {
    if (!snake.alive) return;
    snake.alive = false;
    createBlast(snake.x, snake.y, snake.color.main);

    for (let i = 0; i < snake.segments.length; i += 2) {
      const seg = snake.segments[i];
      spawnFood(
        seg.x + (Math.random() - 0.5) * 24,
        seg.y + (Math.random() - 0.5) * 24,
        snake.color.main,
        Math.random() < 0.55 ? 'medium' : 'small'
      );
    }

    if (snake.isPlayer) {
      sfxBlast(1.0);
      lastScore = Math.floor(snake.score);
      if (lastScore > bestScore) {
        bestScore = lastScore;
        localStorage.setItem('st_best', String(bestScore));
      }
      clearTimeout(gameOverTimer);
      gameOverTimer = setTimeout(() => {
        if (state === 'playing') showGameOver();
      }, 2000);
    } else {
      if (player && Math.hypot(snake.x - player.x, snake.y - player.y) < 620) {
        sfxBlast(0.6);
      }
      setTimeout(() => {
        if (state === 'playing') spawnBot(false);
      }, 2200);
    }
  }

  function getNextDiverseColor() {
    const col = COLORS[colorCycleIdx % COLORS.length];
    colorCycleIdx++;
    return col;
  }

  function spawnBot(initial = false) {
    const a = Math.random() * Math.PI * 2;
    const minDist = initial ? 430 : 250;
    const d = minDist + Math.random() * (WALL_INNER_RADIUS - minDist - 180);
    const col = getNextDiverseColor();
    const pat = PATTERNS[Math.floor(Math.random() * PATTERNS.length)].id;
    const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    let sc = Math.floor(Math.random() * 90);
    if (initial) {
      const r = Math.random();
      if (r > 0.85) sc = 900 + Math.floor(Math.random() * 1100);
      else if (r > 0.5) sc = 200 + Math.floor(Math.random() * 500);
    }
    snakes.push(new Snake(name, Math.cos(a) * d, Math.sin(a) * d, col, pat, false, sc));
  }

  // ===== Strict Collision & Food Eating =====
  function handleInteractions() {
    for (const s of snakes) {
      if (!s.alive) continue;
      const eatDist = s.getRadius() + 13;
      for (let i = foods.length - 1; i >= 0; i--) {
        const f = foods[i];
        const dx = s.x - f.x;
        const dy = s.y - f.y;
        if (dx * dx + dy * dy < (eatDist + f.r) * (eatDist + f.r)) {
          let pts = f.type === 'medium' ? 20 : 5;
          if (Math.random() < 0.16) {
            pts = 5 + Math.floor(Math.random() * 41);
          }
          s.score += pts;
          if (s.isPlayer) {
            sfxEat(f.type === 'medium' || pts > 20);
            popups.push({ x: f.x, y: f.y, text: `+${pts}`, alpha: 1, color: f.color });
          }
          foods.splice(i, 1);
        }
      }
    }

    while (foods.length < BASE_FOOD_COUNT) spawnFood();

    const toKill = new Set();
    for (const a of snakes) {
      if (!a.alive || a.shieldTimer > 0) continue;
      const radA = a.getRadius();
      for (const b of snakes) {
        if (a === b || !b.alive) continue;
        const radB = b.getRadius();

        const hdx = a.x - b.x;
        const hdy = a.y - b.y;
        const headHit = (radA + radB) * 0.86;
        if (hdx * hdx + hdy * hdy < headHit * headHit) {
          toKill.add(a);
          if (b.shieldTimer <= 0) toKill.add(b);
          break;
        }

        const bodyHit = radA * 0.85 + radB * 0.85;
        const bodyHit2 = bodyHit * bodyHit;
        for (let i = 1; i < b.segments.length; i++) {
          const seg = b.segments[i];
          const dx = a.x - seg.x;
          const dy = a.y - seg.y;
          if (dx * dx + dy * dy < bodyHit2) {
            toKill.add(a);
            break;
          }
        }
        if (toKill.has(a)) break;
      }
    }

    toKill.forEach(s => killSnake(s));
    snakes = snakes.filter(s => s.alive || s.isPlayer);
  }

  // ===== Drawing Functions =====
  function drawBackground() {
    ctx.fillStyle = '#060c28';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const st of stars) {
      const sx = (st.x - camera.x * st.depth) * camera.zoom + canvas.width / 2;
      const sy = (st.y - camera.y * st.depth) * camera.zoom + canvas.height / 2;
      if (sx < -12 || sx > canvas.width + 12 || sy < -12 || sy > canvas.height + 12) continue;
      const tw = 0.55 + 0.45 * Math.sin(worldTime * 3.5 + st.twinkle);
      ctx.globalAlpha = st.alpha * tw;
      ctx.fillStyle = st.tint;

      const sr = st.r * camera.zoom;
      if (st.sparkle) {
        ctx.beginPath();
        ctx.moveTo(sx, sy - sr * 2.1);
        ctx.lineTo(sx + sr * 0.6, sy - sr * 0.6);
        ctx.lineTo(sx + sr * 2.1, sy);
        ctx.lineTo(sx + sr * 0.6, sy + sr * 0.6);
        ctx.lineTo(sx, sy + sr * 2.1);
        ctx.lineTo(sx - sr * 0.6, sy + sr * 0.6);
        ctx.lineTo(sx - sr * 2.1, sy);
        ctx.lineTo(sx - sr * 0.6, sy - sr * 0.6);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawStoneWall() {
    const viewLim = Math.max(canvas.width, canvas.height) / camera.zoom + 160;

    // Draw back floating stones first, then dense front stone ring
    for (const layer of ['back', 'front']) {
      for (const st of stones) {
        if (st.layer !== layer) continue;
        const a = st.orbitAngle + worldTime * st.orbitSpeed;
        const sx = Math.cos(a) * st.dist;
        const sy = Math.sin(a) * st.dist;

        if (Math.hypot(sx - camera.x, sy - camera.y) > viewLim) continue;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(st.rot + worldTime * st.rotSpeed);

        // 3D Blue-Purple Shaded Asteroid Rock
        const grad = ctx.createRadialGradient(-st.rx * 0.3, -st.ry * 0.3, st.rx * 0.1, 0, 0, st.rx * 1.15);
        if (layer === 'front') {
          grad.addColorStop(0, '#7889f0');
          grad.addColorStop(0.55, '#3b429c');
          grad.addColorStop(1, '#1b1d54');
        } else {
          grad.addColorStop(0, '#5a68c7');
          grad.addColorStop(0.6, '#2b3078');
          grad.addColorStop(1, '#13153d');
        }

        ctx.beginPath();
        ctx.ellipse(0, 0, st.rx, st.ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.lineWidth = layer === 'front' ? 2.5 : 1.5;
        ctx.strokeStyle = layer === 'front' ? 'rgba(165, 185, 255, 0.55)' : 'rgba(110, 130, 220, 0.3)';
        ctx.stroke();

        // Subtle rock ridge highlight
        ctx.beginPath();
        ctx.ellipse(-st.rx * 0.22, -st.ry * 0.22, st.rx * 0.42, st.ry * 0.2, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200, 215, 255, 0.18)';
        ctx.fill();

        ctx.restore();
      }
    }
  }

  function drawFoods() {
    const viewW = canvas.width / camera.zoom + 70;
    const viewH = canvas.height / camera.zoom + 70;
    for (const f of foods) {
      if (Math.abs(f.x - camera.x) > viewW || Math.abs(f.y - camera.y) > viewH) continue;
      const p = 1 + 0.1 * Math.sin(worldTime * 4 + f.pulse);
      const r = f.r * p;

      ctx.beginPath();
      ctx.arc(f.x, f.y, r + 3, 0, Math.PI * 2);
      ctx.fillStyle = f.color + '33';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.lineWidth = f.type === 'medium' ? 3.0 : 2.0;
      ctx.strokeStyle = f.color;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(f.x, f.y, r * 0.85, 0, Math.PI * 2);
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = '#ffffffaa';
      ctx.stroke();
    }
  }

  function drawFireFlares(x, y, angle, r, count, boosting) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI);
    const spread = count === 1 ? 0 : 0.72;
    const scaleBoost = boosting ? 1.45 : 1;

    for (let i = 0; i < count; i++) {
      const frac = count === 1 ? 0 : (i / (count - 1) - 0.5);
      const fa = frac * spread;
      const flicker = 0.82 + Math.random() * 0.36;
      const len = (r * 1.45 + count * 2.4) * flicker * scaleBoost;
      const wid = r * (0.42 - count * 0.03);

      ctx.save();
      ctx.rotate(fa);
      ctx.beginPath();
      ctx.moveTo(r * 0.5, -wid);
      ctx.quadraticCurveTo(r * 0.5 + len * 0.7, 0, r * 0.5 + len, 0);
      ctx.quadraticCurveTo(r * 0.5 + len * 0.7, 0, r * 0.5, wid);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 110, 20, 0.88)';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(r * 0.55, -wid * 0.5);
      ctx.lineTo(r * 0.55 + len * 0.65, 0);
      ctx.lineTo(r * 0.55, wid * 0.5);
      ctx.closePath();
      ctx.fillStyle = '#fff59d';
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawHeadPuppet(ctxRef, x, y, angle, r, colorObj, showArrow, shielded = false) {
    ctxRef.save();
    ctxRef.translate(x, y);

    if (shielded) {
      ctxRef.beginPath();
      ctxRef.arc(0, 0, r * 1.65, 0, Math.PI * 2);
      ctxRef.strokeStyle = 'rgba(110, 240, 255, 0.85)';
      ctxRef.lineWidth = 2.5;
      ctxRef.stroke();
    }

    ctxRef.rotate(angle);

    if (showArrow) {
      ctxRef.fillStyle = '#e5dbff';
      ctxRef.strokeStyle = '#2d1c63';
      ctxRef.lineWidth = 1.8;
      ctxRef.beginPath();
      ctxRef.moveTo(r + 16, 0);
      ctxRef.lineTo(r + 6, -6);
      ctxRef.lineTo(r + 6, 6);
      ctxRef.closePath();
      ctxRef.fill();
      ctxRef.stroke();
    }

    ctxRef.beginPath();
    ctxRef.arc(0, 0, r * 1.12, 0, Math.PI * 2);
    ctxRef.fillStyle = colorObj.main;
    ctxRef.fill();
    ctxRef.lineWidth = 2.2;
    ctxRef.strokeStyle = colorObj.dark;
    ctxRef.stroke();

    ctxRef.beginPath();
    ctxRef.arc(r * 0.14, 0, r * 0.86, 0, Math.PI * 2);
    const grad = ctxRef.createRadialGradient(r * 0.35, -r * 0.25, r * 0.1, r * 0.14, 0, r * 0.88);
    grad.addColorStop(0, '#c8f7ff');
    grad.addColorStop(0.7, '#4fd5ff');
    grad.addColorStop(1, '#1a75b8');
    ctxRef.fillStyle = grad;
    ctxRef.fill();

    // Ears
    ctxRef.fillStyle = colorObj.dark;
    ctxRef.beginPath();
    ctxRef.arc(-r * 0.18, -r * 0.36, r * 0.22, 0, Math.PI * 2);
    ctxRef.arc(-r * 0.18, r * 0.36, r * 0.22, 0, Math.PI * 2);
    ctxRef.fill();

    // Eyes
    ctxRef.fillStyle = '#ffffff';
    ctxRef.beginPath();
    ctxRef.ellipse(r * 0.18, -r * 0.24, r * 0.24, r * 0.19, 0, 0, Math.PI * 2);
    ctxRef.ellipse(r * 0.18, r * 0.24, r * 0.24, r * 0.19, 0, 0, Math.PI * 2);
    ctxRef.fill();

    // Pupils
    ctxRef.fillStyle = '#111111';
    ctxRef.beginPath();
    ctxRef.arc(r * 0.26, -r * 0.22, r * 0.1, 0, Math.PI * 2);
    ctxRef.arc(r * 0.26, r * 0.22, r * 0.1, 0, Math.PI * 2);
    ctxRef.fill();

    // Nose
    ctxRef.fillStyle = '#ff6b8b';
    ctxRef.beginPath();
    ctxRef.arc(r * 0.44, 0, r * 0.09, 0, Math.PI * 2);
    ctxRef.fill();

    // Glass shine
    ctxRef.fillStyle = 'rgba(255,255,255,0.5)';
    ctxRef.beginPath();
    ctxRef.ellipse(r * 0.38, -r * 0.42, r * 0.22, r * 0.1, -0.5, 0, Math.PI * 2);
    ctxRef.fill();

    ctxRef.restore();
  }

  function drawSnake(s) {
    if (!s.alive) return;
    const r = s.getRadius();
    const segs = s.segments;

    for (let i = segs.length - 1; i >= 1; i--) {
      const pt = segs[i];
      const taper = i > segs.length - 5 ? (segs.length - i) / 5 : 1;
      const sr = Math.max(3.5, r * (0.94 * taper));

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, sr, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? s.color.main : s.color.dark;
      ctx.fill();

      if (s.pattern !== 'plain' && i % 3 === 0 && sr > 7.5) {
        const patObj = PATTERNS.find(p => p.id === s.pattern);
        if (patObj) {
          ctx.font = `${Math.floor(sr * 1.15)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(patObj.label, pt.x, pt.y + 1);
        }
      }
    }

    drawFireFlares(s.x, s.y, s.angle, r, s.getFlareCount(), s.boosting);
    drawHeadPuppet(ctx, s.x, s.y, s.angle, r, s.color, s.isPlayer, s.shieldTimer > 0);

    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = s.color.main;
    const label = (s === kingSnake ? '👑 ' : '') + s.name;
    ctx.fillText(label, s.x, s.y - r - 14);
  }

  function drawParticlesAndPopups(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (p.type === 'wave') {
        p.r += 250 * dt;
        p.alpha -= 2.1 * dt;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 190, 60, ${p.alpha})`;
        ctx.lineWidth = 5;
        ctx.stroke();
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= p.decay * dt;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    for (let i = popups.length - 1; i >= 0; i--) {
      const pop = popups[i];
      pop.y -= 35 * dt;
      pop.alpha -= 1.4 * dt;
      if (pop.alpha <= 0) { popups.splice(i, 1); continue; }
      ctx.globalAlpha = pop.alpha;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
    }
  }

  // ===== Live Minimap & Leaderboard =====
  function updateHUD() {
    const aliveList = snakes.filter(s => s.alive).sort((a, b) => b.score - a.score);
    kingSnake = aliveList[0] || null;

    if (player) {
      const sc = Math.floor(player.score);
      scoreValEl.textContent = sc;

      if (sc >= 100 && player.alive) {
        boostBtn.classList.remove('disabled');
        boostBtn.classList.add('ready');
      } else {
        boostBtn.classList.add('disabled');
        boostBtn.classList.remove('ready', 'active');
        boostHeld = false;
      }
    }

    let html = '';
    aliveList.slice(0, 5).forEach((s, idx) => {
      html += `<div class="lb-row" style="color:${s.color.main}">
        <span class="lb-name">${idx + 1} ${s.name}</span>
        <span>${Math.floor(s.score)}</span>
      </div>`;
    });
    lbListEl.innerHTML = html;

    if (player) {
      const myRank = aliveList.indexOf(player) + 1;
      lbSelfEl.innerHTML = `<div class="lb-row" style="color:${player.color.main}">
        <span class="lb-name">${myRank || '-'} ${player.name}</span>
        <span>${Math.floor(player.score)}</span>
      </div>
      <div style="font-size:9.5px;color:#9bb0e8">${myRank || '-'} / ${aliveList.length}</div>`;
    }

    const w = miniCanvas.width;
    const half = w / 2;
    const scale = (half - 8) / WALL_INNER_RADIUS;
    miniCtx.clearRect(0, 0, w, w);

    miniCtx.strokeStyle = 'rgba(130, 175, 255, 0.35)';
    miniCtx.lineWidth = 1.5;
    miniCtx.beginPath();
    miniCtx.arc(half, half, half - 6, 0, Math.PI * 2);
    miniCtx.stroke();

    for (const s of aliveList) {
      const mx = half + s.x * scale;
      const my = half + s.y * scale;
      if (s === kingSnake) {
        miniCtx.font = '13px sans-serif';
        miniCtx.textAlign = 'center';
        miniCtx.textBaseline = 'middle';
        miniCtx.fillText('👑', mx, my);
      } else if (s.isPlayer) {
        miniCtx.fillStyle = s.color.main;
        miniCtx.beginPath();
        miniCtx.arc(mx, my, 4.2, 0, Math.PI * 2);
        miniCtx.fill();
        miniCtx.strokeStyle = '#ffe44d';
        miniCtx.lineWidth = 1.4;
        miniCtx.stroke();
      } else {
        miniCtx.fillStyle = 'rgba(255,255,255,0.85)';
        miniCtx.beginPath();
        miniCtx.arc(mx, my, 2, 0, Math.PI * 2);
        miniCtx.fill();
      }
    }
  }

  // ===== Main Game Loop =====
  function loop(ts) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (ts - lastTime) / 1000 || 0.016);
    lastTime = ts;

    if (state === 'paused') return;

    worldTime += dt;

    if (state !== 'playing') {
      camera.x = Math.cos(worldTime * 0.12) * 200;
      camera.y = Math.sin(worldTime * 0.12) * 200;
      camera.zoom = 1;
      drawBackground();
      return;
    }

    if (player && player.alive) {
      if (pointerScreen.active) {
        const dx = pointerScreen.x - canvas.width / 2;
        const dy = pointerScreen.y - canvas.height / 2;
        if (dx * dx + dy * dy > 100) {
          player.targetAngle = Math.atan2(dy, dx);
        }
      }
      player.boosting = boostHeld && player.score >= 100;
    }

    for (const s of snakes) s.update(dt);
    handleInteractions();

    if (player && player.alive) {
      camera.x += (player.x - camera.x) * Math.min(1, dt * 8);
      camera.y += (player.y - camera.y) * Math.min(1, dt * 8);
      const targetZoom = Math.max(0.58, 1 - (player.getRadius() - 8.5) * 0.016);
      camera.zoom += (targetZoom - camera.zoom) * Math.min(1, dt * 3);
    }

    drawBackground();

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    drawStoneWall();
    drawFoods();
    for (const s of snakes) drawSnake(s);
    drawParticlesAndPopups(dt);

    ctx.restore();

    updateHUD();
  }

  // ===== Controls =====
  canvas.addEventListener('touchstart', (e) => {
    if (state !== 'playing') return;
    for (const t of e.changedTouches) {
      if (steerTouchId === null) {
        steerTouchId = t.identifier;
        pointerScreen = { x: t.clientX, y: t.clientY, active: true };
      }
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (state !== 'playing') return;
    for (const t of e.changedTouches) {
      if (t.identifier === steerTouchId) {
        pointerScreen = { x: t.clientX, y: t.clientY, active: true };
      }
    }
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === steerTouchId) {
        steerTouchId = null;
        pointerScreen.active = false;
      }
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (state === 'playing') pointerScreen = { x: e.clientX, y: e.clientY, active: true };
  });

  function setBoost(val) {
    if (val && player && player.score >= 100 && player.alive && state === 'playing') {
      boostHeld = true;
      boostBtn.classList.add('active');
    } else {
      boostHeld = false;
      boostBtn.classList.remove('active');
    }
  }

  boostBtn.addEventListener('touchstart', (e) => { e.preventDefault(); setBoost(true); });
  boostBtn.addEventListener('touchend', (e) => { e.preventDefault(); setBoost(false); });
  boostBtn.addEventListener('touchcancel', () => setBoost(false));
  boostBtn.addEventListener('mousedown', () => setBoost(true));
  window.addEventListener('mouseup', () => setBoost(false));
  window.addEventListener('keydown', (e) => { if (e.code === 'Space') setBoost(true); });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') setBoost(false); });

  // ===== Start, Pause, Quit & Game Over =====
  function startGame() {
    clearTimeout(gameOverTimer);
    initAudio();
    sfxStart();

    bgMusic.volume = 0.6;
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});

    snakes = [];
    foods = [];
    particles = [];
    popups = [];
    boostHeld = false;
    steerTouchId = null;
    pointerScreen.active = false;
    colorCycleIdx = Math.floor(Math.random() * COLORS.length);

    const pName = (nameInput.value || 'Mc').trim();
    player = new Snake(pName, 0, 0, COLORS[selectedColorIdx], selectedPattern, true, 0);
    snakes.push(player);

    for (let i = 0; i < AI_COUNT; i++) spawnBot(true);
    for (let i = 0; i < BASE_FOOD_COUNT; i++) spawnFood();

    camera.x = 0;
    camera.y = 0;
    state = 'playing';

    startScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
  }

  function pauseGame() {
    if (state !== 'playing') return;
    state = 'paused';
    boostHeld = false;
    bgMusic.pause();
    pauseScreen.classList.remove('hidden');
  }

  function resumeGame() {
    if (state !== 'paused') return;
    state = 'playing';
    pauseScreen.classList.add('hidden');
    bgMusic.play().catch(() => {});
  }

  function quitGame() {
    clearTimeout(gameOverTimer);
    stopMusic();
    showMenu();
  }

  function showGameOver() {
    state = 'gameover';
    hud.classList.add('hidden');
    const aliveList = snakes.filter(s => s.alive).sort((a, b) => b.score - a.score);
    document.getElementById('goScore').textContent = lastScore;
    document.getElementById('goBest').textContent = bestScore;
    document.getElementById('goRank').textContent = `#${aliveList.length + 1}`;
    gameOverScreen.classList.remove('hidden');
  }

  function showMenu() {
    state = 'menu';
    hud.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    bestScoreEl.textContent = bestScore;
    lastScoreEl.textContent = lastScore;
    drawPreviewSnake();
  }

  playBtn.addEventListener('click', startGame);
  retryBtn.addEventListener('click', startGame);
  exitBtn.addEventListener('click', pauseGame);
  resumeBtn.addEventListener('click', resumeGame);
  quitBtn.addEventListener('click', quitGame);
  menuBtn.addEventListener('click', quitGame);

  // ===== Customize Snake Body Preview & Pickers =====
  function drawPreviewSnake() {
    prevCtx.clearRect(0, 0, prevCanvas.width, prevCanvas.height);
    const col = COLORS[selectedColorIdx];
    const pat = PATTERNS.find(p => p.id === selectedPattern);
    const cy = prevCanvas.height / 2;

    for (let i = 0; i < 11; i++) {
      const px = 42 + i * 15;
      const py = cy + Math.sin(i * 0.65) * 7;
      prevCtx.beginPath();
      prevCtx.arc(px, py, 10.5, 0, Math.PI * 2);
      prevCtx.fillStyle = i % 2 === 0 ? col.main : col.dark;
      prevCtx.fill();

      if (selectedPattern !== 'plain' && i % 2 === 0 && pat) {
        prevCtx.font = '11px sans-serif';
        prevCtx.textAlign = 'center';
        prevCtx.textBaseline = 'middle';
        prevCtx.fillText(pat.label, px, py + 1);
      }
    }
    drawHeadPuppet(prevCtx, 212, cy, 0, 12, col, true);
  }

  function setupCustomizer() {
    nameInput.value = RANDOM_PLAYER_NAMES[Math.floor(Math.random() * RANDOM_PLAYER_NAMES.length)];

    const colorPicker = document.getElementById('colorPicker');
    COLORS.forEach((c, idx) => {
      const btn = document.createElement('div');
      btn.className = 'color-swatch' + (idx === selectedColorIdx ? ' selected' : '');
      btn.style.background = c.main;
      btn.addEventListener('click', () => {
        selectedColorIdx = idx;
        colorPicker.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('selected'));
        btn.classList.add('selected');
        drawPreviewSnake();
      });
      colorPicker.appendChild(btn);
    });

    const patternPicker = document.getElementById('patternPicker');
    PATTERNS.forEach((p) => {
      const btn = document.createElement('button');
      btn.className = 'pattern-btn' + (p.id === selectedPattern ? ' selected' : '');
      btn.textContent = p.label;
      btn.addEventListener('click', () => {
        selectedPattern = p.id;
        patternPicker.querySelectorAll('.pattern-btn').forEach(el => el.classList.remove('selected'));
        btn.classList.add('selected');
        drawPreviewSnake();
      });
      patternPicker.appendChild(btn);
    });
  }

  // ===== Init =====
  initEnvironment();
  setupCustomizer();
  showMenu();
  requestAnimationFrame(loop);
})();

// Live FPS Counter
(function () {
  const fpsEls = document.querySelectorAll('.fps-badge');
  if (!fpsEls.length) return;

  let frameCount = 0;
  let lastTime = performance.now();

  function updateFPS(now) {
    frameCount++;
    const delta = now - lastTime;

    if (delta >= 500) {
      const fps = Math.round((frameCount * 1000) / delta);
      fpsEls.forEach(el => {
        el.textContent = fps + ' FPS';
      });
      frameCount = 0;
      lastTime = now;
    }

    requestAnimationFrame(updateFPS);
  }

  requestAnimationFrame(updateFPS);
})();

