// String War Engine & Studio Application - Slingshot Physics & Inner Circle String Generator

class StringWarStudio {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // 1080x1920 logical canvas size (9:16 vertical Shorts standard)
    this.width = 1080;
    this.height = 1920;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Arena geometry: Inner circle (active collision & string anchor track) + Outer circle guideline
    this.arena = {
      cx: this.width / 2,
      cy: 1120,
      innerRadius: 375,
      outerRadius: 490
    };

    // Simulation state
    this.running = false;
    this.paused = false;
    this.simTime = 0;
    this.lastFrameTime = 0;
    this.matchFinished = false;
    this.winner = null;

    // Configuration
    this.config = {
      title: "WHO WILL WIN?",
      subtitle: "COMMENT YOUR LEADER",
      initialStrings: 40,
      createOnTouch: true, // Generate new string whenever ball touches inner circle!
      cutMode: "steal",    // "steal" or "destroy"
      physicsSpeed: 1.0,
      stringTension: 1.1,
      bounciness: 0.96,
      orbRadius: 44,
      maxStringsCap: 160,
      subSteps: 4
    };

    // Entities
    this.contestants = [];
    this.particles = [];
    this.severedStrings = [];
    this.floatingTexts = [];
    this.confetti = [];
    this.eliminationBanner = null;
    this.shakeIntensity = 0;

    // Preloaded image cache
    this.imageCache = new Map();

    // MediaRecorder
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;

    this.initUI();
    this.loadPreset('world_leaders');
    this.startRenderLoop();
  }

  // --- PRESET LOADING ---
  loadPreset(presetKey) {
    const preset = window.PRESET_PACKS[presetKey];
    if (!preset) return;

    this.config.title = preset.title;
    this.config.subtitle = preset.subtitle;
    this.config.initialStrings = preset.initialStrings || 40;

    document.getElementById('inputTitle').value = this.config.title;
    document.getElementById('inputSubtitle').value = this.config.subtitle;
    document.getElementById('inputStrings').value = this.config.initialStrings;

    this.contestants = preset.contestants.map((c, i) => ({
      id: 'c_' + Date.now() + '_' + i,
      name: c.name,
      color: c.color,
      avatarUrl: c.avatar,
      initialStrings: c.strings || this.config.initialStrings,
      stringsList: [],
      alive: true,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: this.config.orbRadius,
      sectorAngle: 0,
      arcSpan: 0,
      pulse: 0,
      bladeGlow: 0,
      batchCutsMade: 0,
      batchCutsSuffered: 0,
      batchTimer: 0,
      touchCooldown: 0
    }));

    this.preloadAvatars().then(() => {
      this.resetSimulation();
      this.renderContestantList();
    });
  }

  preloadAvatars() {
    const promises = this.contestants.map(c => {
      return new Promise((resolve) => {
        if (!c.avatarUrl) {
          resolve(null);
          return;
        }
        if (this.imageCache.has(c.avatarUrl)) {
          resolve(this.imageCache.get(c.avatarUrl));
          return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          this.imageCache.set(c.avatarUrl, img);
          resolve(img);
        };
        img.onerror = () => {
          console.warn("Could not load image for", c.name);
          resolve(null);
        };
        img.src = c.avatarUrl;
      });
    });
    return Promise.all(promises);
  }

  // --- SIMULATION INITIALIZATION ---
  resetSimulation() {
    this.simTime = 0;
    this.matchFinished = false;
    this.winner = null;
    this.particles = [];
    this.severedStrings = [];
    this.floatingTexts = [];
    this.confetti = [];
    this.eliminationBanner = null;
    this.shakeIntensity = 0;

    const N = this.contestants.length;
    const count = parseInt(document.getElementById('inputStrings').value) || this.config.initialStrings;
    const startRadius = this.arena.innerRadius * 0.55;
    const arcSpan = (Math.PI * 2 / N) * 0.92;

    this.contestants.forEach((c, i) => {
      c.alive = true;
      c.radius = this.config.orbRadius;
      c.pulse = 0;
      c.bladeGlow = 0;
      c.batchCutsMade = 0;
      c.batchCutsSuffered = 0;
      c.batchTimer = 0;
      c.touchCooldown = 0;

      // Start distributed around the circle
      const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
      c.sectorAngle = angle;
      c.arcSpan = arcSpan;
      c.x = this.arena.cx + Math.cos(angle) * startRadius;
      c.y = this.arena.cy + Math.sin(angle) * startRadius;

      // High kinetic initial launch across the arena
      const launchAngle = angle + Math.PI + (Math.random() - 0.5) * 0.85;
      const speed = 380 + Math.random() * 80;
      c.vx = Math.cos(launchAngle) * speed;
      c.vy = Math.sin(launchAngle) * speed;

      // Initial strings anchored on the inner circle perimeter
      c.stringsList = [];
      const halfArc = arcSpan / 2;
      for (let s = 0; s < count; s++) {
        const t = (s / (count - 1 || 1)) * 2 - 1;
        const aAngle = angle + t * halfArc;
        c.stringsList.push({
          id: s,
          anchorX: this.arena.cx + Math.cos(aAngle) * this.arena.innerRadius,
          anchorY: this.arena.cy + Math.sin(aAngle) * this.arena.innerRadius,
          anchorAngle: aAngle,
          alive: true
        });
      }
    });

    this.updateHUDStats();
  }

  startMatch() {
    window.soundEngine.init();
    window.soundEngine.resume();
    this.resetSimulation();
    this.running = true;
    this.paused = false;
    this.lastFrameTime = performance.now();
    window.soundEngine.playBgm();
    document.getElementById('btnPlay').textContent = '⏸ Pause';
    document.getElementById('statusBadge').textContent = 'Match in progress';
    document.getElementById('statusBadge').className = 'status-badge active';
  }

  togglePause() {
    if (!this.running) {
      this.startMatch();
      return;
    }
    this.paused = !this.paused;
    if (this.paused) {
      window.soundEngine.pauseBgm();
      document.getElementById('btnPlay').textContent = '▶ Resume';
      document.getElementById('statusBadge').textContent = 'Paused';
    } else {
      window.soundEngine.playBgm();
      this.lastFrameTime = performance.now();
      document.getElementById('btnPlay').textContent = '⏸ Pause';
      document.getElementById('statusBadge').textContent = 'Match in progress';
    }
  }

  // Exact point to line segment distance
  distPointToSegment(cx, cy, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) {
      return { dist: Math.hypot(cx - x1, cy - y1), t: 0, px: x1, py: y1 };
    }
    const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / l2));
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    return {
      dist: Math.hypot(cx - px, cy - py),
      t: t,
      px: px,
      py: py
    };
  }

  // --- PHYSICS ENGINE ---
  updatePhysics(dt) {
    if (!this.running || this.paused || this.matchFinished) return;

    this.simTime += dt;
    const speedMultiplier = parseFloat(document.getElementById('inputSpeed').value) || 1.0;
    const effectiveDt = dt * speedMultiplier;

    // Decay screen shake
    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - effectiveDt * 35);
    }

    // Check banner expiration
    if (this.eliminationBanner && this.simTime > this.eliminationBanner.expiresAt) {
      this.eliminationBanner = null;
    }

    const aliveContestants = this.contestants.filter(c => c.alive);
    if (aliveContestants.length <= 1) {
      if (aliveContestants.length === 1 && !this.matchFinished) {
        this.handleVictory(aliveContestants[0]);
      }
      return;
    }

    // Multi-substep physics for smooth high-speed string cutting & collision
    const subSteps = this.config.subSteps;
    const subDt = effectiveDt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      this.stepPhysics(subDt, aliveContestants);
    }

    // Flush batch damage / steal text
    aliveContestants.forEach(c => {
      if (c.batchTimer > 0) {
        c.batchTimer -= effectiveDt;
        if (c.batchTimer <= 0) {
          if (c.batchCutsMade > 0) {
            this.spawnFloatingText(`+${c.batchCutsMade}`, c.x, c.y - 48, c.color);
            c.batchCutsMade = 0;
          }
          if (c.batchCutsSuffered > 0) {
            this.spawnFloatingText(`-${c.batchCutsSuffered}`, c.x, c.y + 48, '#ff3b30');
            c.batchCutsSuffered = 0;
          }
        }
      }
    });

    // Update visuals & particles
    this.updateParticles(effectiveDt);

    // Check eliminations
    this.checkContestantStates();
  }

  stepPhysics(dt, aliveContestants) {
    const tensionSlider = parseFloat(document.getElementById('inputTension')?.value) || this.config.stringTension;
    const bounceSlider = this.config.bounciness;

    // 1. Move balls through arena
    aliveContestants.forEach((c, idx) => {
      let fx = 0;
      let fy = 0;

      const activeStrings = c.stringsList.filter(s => s.alive);
      const activeCount = activeStrings.length;

      // Spring pull from strings (slingshot dynamics)
      if (activeCount > 0) {
        let avgAx = 0;
        let avgAy = 0;
        for (let s = 0; s < activeCount; s++) {
          avgAx += activeStrings[s].anchorX;
          avgAy += activeStrings[s].anchorY;
        }
        avgAx /= activeCount;
        avgAy /= activeCount;

        const distToAnchor = Math.hypot(avgAx - c.x, avgAy - c.y);
        const springForce = distToAnchor * tensionSlider * 0.42;
        const dirX = (avgAx - c.x) / (distToAnchor || 1);
        const dirY = (avgAy - c.y) / (distToAnchor || 1);
        fx += dirX * springForce;
        fy += dirY * springForce;
      }

      // Dynamic swirl force for looping, organic paths
      const toCenterX = this.arena.cx - c.x;
      const toCenterY = this.arena.cy - c.y;
      const perpX = -toCenterY;
      const perpY = toCenterX;
      const perpLen = Math.hypot(perpX, perpY) || 1;
      const swirlDir = (idx % 2 === 0) ? 1 : -1;
      fx += (perpX / perpLen) * 95 * swirlDir;
      fy += (perpY / perpLen) * 95 * swirlDir;

      // Velocity integration
      c.vx += fx * dt;
      c.vy += fy * dt;

      // Maintain high kinetic energy
      const curSpeed = Math.hypot(c.vx, c.vy);
      const minSpeed = 310;
      const maxSpeed = 760;
      if (curSpeed < minSpeed && curSpeed > 0.01) {
        const boost = minSpeed / curSpeed;
        c.vx *= boost;
        c.vy *= boost;
      } else if (curSpeed > maxSpeed) {
        const clamp = maxSpeed / curSpeed;
        c.vx *= clamp;
        c.vy *= clamp;
      }

      // Position update
      c.x += c.vx * dt;
      c.y += c.vy * dt;

      if (c.touchCooldown > 0) c.touchCooldown -= dt;
      c.bladeGlow = Math.min(1.0, curSpeed / 400);

      // --- INNER CIRCLE COLLISION & NEW STRING CREATION ---
      const distFromCenter = Math.hypot(c.x - this.arena.cx, c.y - this.arena.cy);
      const maxDist = this.arena.innerRadius - c.radius;

      if (distFromCenter >= maxDist) {
        const nx = (c.x - this.arena.cx) / distFromCenter;
        const ny = (c.y - this.arena.cy) / distFromCenter;
        c.x = this.arena.cx + nx * maxDist;
        c.y = this.arena.cy + ny * maxDist;

        // Normal bounce
        const dot = c.vx * nx + c.vy * ny;
        if (dot > 0) {
          c.vx -= (1 + bounceSlider) * dot * nx;
          c.vy -= (1 + bounceSlider) * dot * ny;

          // Add slight deflection
          const tangentX = -ny;
          const tangentY = nx;
          c.vx += tangentX * (Math.random() - 0.5) * 60;
          c.vy += tangentY * (Math.random() - 0.5) * 60;

          // EXACT CONTACT POINT ON THE INNER CIRCLE
          const contactX = this.arena.cx + nx * this.arena.innerRadius;
          const contactY = this.arena.cy + ny * this.arena.innerRadius;

          // FEATURE: CREATE A NEW STRING FROM THE TOUCH POINT ON THE INNER CIRCLE!
          if (this.config.createOnTouch && c.touchCooldown <= 0 && activeCount < this.config.maxStringsCap) {
            c.touchCooldown = 0.05; // debounced slightly to produce clean individual strings
            c.stringsList.push({
              id: Date.now() + Math.random(),
              anchorX: contactX,
              anchorY: contactY,
              anchorAngle: Math.atan2(ny, nx),
              alive: true
            });

            // Burst sparks at contact point on inner circle
            this.spawnSparks(contactX, contactY, '#ffffff', c.color, 12);

            // Ring touch pulse
            window.soundEngine.playPluck(idx, 1.15);
          } else {
            window.soundEngine.playPluck(idx, 0.95);
          }
        }
      }
    });

    // 2. Ball-to-Ball Collisions
    for (let i = 0; i < aliveContestants.length; i++) {
      for (let j = i + 1; j < aliveContestants.length; j++) {
        const c1 = aliveContestants[i];
        const c2 = aliveContestants[j];

        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = c1.radius + c2.radius;

        if (dist < minDist && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;

          // Separate
          c1.x -= nx * overlap * 0.5;
          c1.y -= ny * overlap * 0.5;
          c2.x += nx * overlap * 0.5;
          c2.y += ny * overlap * 0.5;

          // Elastic bounce
          const kx = c1.vx - c2.vx;
          const ky = c1.vy - c2.vy;
          const p = 2 * (nx * kx + ny * ky) / 2;

          c1.vx -= p * nx * bounceSlider;
          c1.vy -= p * ny * bounceSlider;
          c2.vx += p * nx * bounceSlider;
          c2.vy += p * ny * bounceSlider;

          const impactSpeed = Math.hypot(kx, ky);
          if (impactSpeed > 60) {
            c1.pulse = 1.0;
            c2.pulse = 1.0;
            window.soundEngine.playCollision(impactSpeed / 200);
            this.spawnSparks((c1.x + c2.x) / 2, (c1.y + c2.y) / 2, c1.color, c2.color, 12);
          }
        }
      }
    }

    // 3. STRING CUTTING: Moving balls slice through enemy strings
    for (let i = 0; i < aliveContestants.length; i++) {
      const cutter = aliveContestants[i];

      for (let j = 0; j < aliveContestants.length; j++) {
        if (i === j) continue;
        const target = aliveContestants[j];
        const targetActiveStrings = target.stringsList.filter(s => s.alive);

        targetActiveStrings.forEach(str => {
          const hit = this.distPointToSegment(
            cutter.x, cutter.y,
            target.x, target.y,
            str.anchorX, str.anchorY
          );

          if (hit.dist < cutter.radius && hit.t > 0.12 && hit.t < 0.98) {
            this.cutString(cutter, target, str, hit.px, hit.py);
          }
        });
      }
    }
  }

  // Handle a single string cut
  cutString(cutter, target, stringObj, cutX, cutY) {
    stringObj.alive = false;

    // Visual severed string snap
    this.severedStrings.push({
      x1: target.x, y1: target.y,
      x2: cutX, y2: cutY,
      anchorX: stringObj.anchorX, anchorY: stringObj.anchorY,
      color: target.color,
      alpha: 1.0,
      decay: 4.5
    });

    // Sparks at cut point
    this.spawnSparks(cutX, cutY, target.color, cutter.color, 8);

    // Audio: snappy pluck
    window.soundEngine.playSnap();
    window.soundEngine.playPluck(Math.floor(Math.random() * 8), 1.3);

    // Update string counts & stealing
    const cutMode = document.getElementById('selectCutMode')?.value || this.config.cutMode;
    if (cutMode === 'steal') {
      const cutterAngle = cutter.sectorAngle + (Math.random() - 0.5) * cutter.arcSpan;
      cutter.stringsList.push({
        id: Date.now() + Math.random(),
        anchorX: this.arena.cx + Math.cos(cutterAngle) * this.arena.innerRadius,
        anchorY: this.arena.cy + Math.sin(cutterAngle) * this.arena.innerRadius,
        anchorAngle: cutterAngle,
        alive: true
      });
      cutter.batchCutsMade++;
    }

    target.batchCutsSuffered++;
    cutter.batchTimer = 0.22;
    target.batchTimer = 0.22;
  }

  checkContestantStates() {
    this.contestants.forEach(c => {
      const aliveCount = c.stringsList.filter(s => s.alive).length;
      if (c.alive && aliveCount <= 0) {
        c.alive = false;
        this.handleElimination(c);
      }
    });

    const alive = this.contestants.filter(c => c.alive);
    this.updateHUDStats();

    if (alive.length === 1 && !this.matchFinished) {
      this.handleVictory(alive[0]);
    }
  }

  handleElimination(c) {
    this.shakeIntensity = 25;
    this.spawnSparks(c.x, c.y, c.color, '#ff0055', 85, true);
    window.soundEngine.playElimination();

    this.eliminationBanner = {
      name: c.name,
      color: c.color,
      expiresAt: this.simTime + 2.6
    };
  }

  handleVictory(winner) {
    this.matchFinished = true;
    this.winner = winner;

    window.soundEngine.stopSynthBgm();
    window.soundEngine.playVictory();
    this.spawnConfetti();

    document.getElementById('statusBadge').textContent = `Winner: ${winner.name}!`;
    document.getElementById('statusBadge').className = 'status-badge finished';

    if (this.isRecording) {
      setTimeout(() => this.stopRecording(), 3500);
    }
  }

  // --- PARTICLES & VISUALS ---
  spawnSparks(x, y, color1, color2, count = 12, isExplosion = false) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (isExplosion ? 330 : 150) * (0.3 + Math.random() * 0.9);
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.5 ? color1 : color2,
        size: (isExplosion ? 7 : 3.8) * (0.6 + Math.random() * 0.8),
        alpha: 1.0,
        decay: isExplosion ? 1.6 : 3.4
      });
    }
  }

  spawnFloatingText(text, x, y, color) {
    this.floatingTexts.push({
      text,
      x: x + (Math.random() - 0.5) * 16,
      y,
      color,
      alpha: 1.0,
      vy: -60
    });
  }

  spawnConfetti() {
    const colors = ['#FFD700', '#FF3B30', '#4CD964', '#5AC8FA', '#FF2D55', '#5856D6', '#FFFFFF'];
    for (let i = 0; i < 200; i++) {
      this.confetti.push({
        x: this.arena.cx + (Math.random() - 0.5) * 600,
        y: this.arena.cy - 300 + Math.random() * 200,
        vx: (Math.random() - 0.5) * 350,
        vy: -150 - Math.random() * 320,
        gravity: 380,
        size: 7 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 8,
        alpha: 1.0
      });
    }
  }

  updateParticles(dt) {
    // Sparks
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }

    // Severed strings
    for (let i = this.severedStrings.length - 1; i >= 0; i--) {
      const s = this.severedStrings[i];
      s.alpha -= s.decay * dt;
      if (s.alpha <= 0) this.severedStrings.splice(i, 1);
    }

    // Floating text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.alpha -= dt * 1.8;
      if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
    }

    // Confetti
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.vy += c.gravity * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rotation += c.vRot * dt;
      if (c.y > this.height + 100) this.confetti.splice(i, 1);
    }
  }

  // --- RENDERING ---
  render() {
    const ctx = this.ctx;
    ctx.save();

    // Screen Shake offset
    if (this.shakeIntensity > 0) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(sx, sy);
    }

    // 1. Deep Space Black Background
    ctx.fillStyle = '#08080c';
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle arena spotlight
    const spotGrad = ctx.createRadialGradient(
      this.arena.cx, this.arena.cy, 50,
      this.arena.cx, this.arena.cy, this.arena.outerRadius * 1.2
    );
    spotGrad.addColorStop(0, 'rgba(25, 30, 48, 0.45)');
    spotGrad.addColorStop(0.7, 'rgba(12, 14, 22, 0.15)');
    spotGrad.addColorStop(1, 'rgba(8, 8, 12, 0)');
    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.arc(this.arena.cx, this.arena.cy, this.arena.outerRadius * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // 2. OUTER CIRCLE GUIDELINE (Faint thin boundary)
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.arena.cx, this.arena.cy, this.arena.outerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3. INNER CIRCLE (Bright White Glowing Arena Boundary)
    ctx.beginPath();
    ctx.arc(this.arena.cx, this.arena.cy, this.arena.innerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 18;
    ctx.stroke();

    // Subtle inner secondary glow ring
    ctx.beginPath();
    ctx.arc(this.arena.cx, this.arena.cy, this.arena.innerRadius - 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 4. Render Strings
    this.renderStrings(ctx);

    // 5. Render Severed Strings
    this.renderSeveredStrings(ctx);

    // 6. Render Contestants (Orbs)
    this.renderContestants(ctx);

    // 7. Render Particles & Sparks
    this.renderParticles(ctx);

    // 8. Render Confetti
    this.renderConfetti(ctx);

    // 9. Render Floating Damage / Steal Numbers
    this.renderFloatingTexts(ctx);

    // 10. Render HUD (BIG Header, BIG Opponent Roster Bar, Subtitle)
    this.renderHUD(ctx);

    // 11. Elimination Banner
    if (this.eliminationBanner) {
      this.renderEliminationBanner(ctx);
    }

    // 12. Victory Banner
    if (this.matchFinished && this.winner) {
      this.renderVictoryOverlay(ctx);
    }

    ctx.restore();
  }

  renderStrings(ctx) {
    this.contestants.forEach(c => {
      if (!c.alive) return;
      const activeStrings = c.stringsList.filter(s => s.alive);
      if (activeStrings.length === 0) return;

      ctx.save();
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 1.45;
      ctx.shadowColor = c.color;
      ctx.shadowBlur = 6;
      ctx.globalAlpha = 0.72;

      for (let s = 0; s < activeStrings.length; s++) {
        const str = activeStrings[s];
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(str.anchorX, str.anchorY);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  renderSeveredStrings(ctx) {
    this.severedStrings.forEach(s => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s.x2, s.y2);
      ctx.lineTo(s.anchorX, s.anchorY);
      ctx.stroke();
      ctx.restore();
    });
  }

  renderContestants(ctx) {
    this.contestants.forEach(c => {
      if (!c.alive) return;

      ctx.save();
      const r = c.radius;
      const activeCount = c.stringsList.filter(s => s.alive).length;

      // Dynamic blade cutting halo when moving fast
      if (c.bladeGlow > 0.1) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, r + 12 * c.bladeGlow, 0, Math.PI * 2);
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 3.5;
        ctx.globalAlpha = 0.45 * c.bladeGlow;
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // Glow pulse on impact
      if (c.pulse > 0) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, r + 16 * c.pulse, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.globalAlpha = 0.35 * c.pulse;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Circular clipped avatar photo
      ctx.save();
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.clip();

      const img = this.imageCache.get(c.avatarUrl);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, c.x - r, c.y - r, r * 2, r * 2);
      } else {
        ctx.fillStyle = '#222';
        ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.name.substring(0, 2).toUpperCase(), c.x, c.y);
      }
      ctx.restore();

      // Glowing colored neon ring border
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 5;
      ctx.shadowColor = c.color;
      ctx.shadowBlur = 16;
      ctx.stroke();

      // String count badge below the orb
      ctx.save();
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(activeCount, c.x, c.y + r + 6);
      ctx.restore();

      ctx.restore();
    });
  }

  renderParticles(ctx) {
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  renderConfetti(ctx) {
    this.confetti.forEach(c => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
      ctx.restore();
    });
  }

  renderFloatingTexts(ctx) {
    this.floatingTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.fillStyle = ft.color;
      ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 10;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  }

  // --- BIGGER HEADING & BIGGER OPPONENT ROSTER SECTION ---
  renderHUD(ctx) {
    ctx.save();
    ctx.textAlign = 'center';

    // 1. BIGGER Top Main Title ("WHO WILL WIN?")
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 66px -apple-system, BlinkMacSystemFont, "Impact", "Segoe UI", sans-serif';
    ctx.letterSpacing = '3px';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 14;
    ctx.fillText(this.config.title.toUpperCase(), this.width / 2, 195);

    // 2. BIGGER Contestant Avatars Roster Bar & Alive Count
    const aliveCount = this.contestants.filter(c => c.alive).length;
    const barY = 285;
    const rosterCount = this.contestants.length;
    const ir = 26; // Avatar icon radius (52px diameter, significantly larger!)
    const iconSpacing = 68;
    const totalRosterWidth = (rosterCount - 1) * iconSpacing;
    const startX = this.width / 2 - totalRosterWidth / 2 - 50;

    this.contestants.forEach((c, idx) => {
      const ix = startX + idx * iconSpacing;
      const iy = barY;

      ctx.save();
      ctx.beginPath();
      ctx.arc(ix, iy, ir, 0, Math.PI * 2);
      ctx.clip();

      const img = this.imageCache.get(c.avatarUrl);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, ix - ir, iy - ir, ir * 2, ir * 2);
      } else {
        ctx.fillStyle = '#444';
        ctx.fill();
      }

      // If eliminated: dark overlay + prominent bold red 'X'
      if (!c.alive) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(ix - 14, iy - 14);
        ctx.lineTo(ix + 14, iy + 14);
        ctx.moveTo(ix + 14, iy - 14);
        ctx.lineTo(ix - 14, iy + 14);
        ctx.stroke();
      } else {
        ctx.restore();
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 8;
        ctx.stroke();
      }
    });

    // BIGGER Alive count badge (e.g. "8 LEFT", "2 LEFT")
    ctx.fillStyle = '#ff2a5f';
    ctx.font = '900 34px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 8;
    ctx.fillText(`${aliveCount} LEFT`, startX + rosterCount * iconSpacing - 12, barY + 12);

    // 3. BIGGER Subtitle / Call to Action ("COMMENT YOUR LEADER")
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '800 26px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText(this.config.subtitle.toUpperCase(), this.width / 2, 360);

    ctx.restore();
  }

  renderEliminationBanner(ctx) {
    ctx.save();
    ctx.textAlign = 'center';

    const eb = this.eliminationBanner;
    const bannerY = 285;

    // Background blackout bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    ctx.fillRect(0, bannerY - 58, this.width, 116);

    // Accent line
    ctx.fillStyle = eb.color;
    ctx.fillRect(0, bannerY + 56, this.width, 5);

    // Main text: "[NAME] OUT"
    ctx.fillStyle = eb.color;
    ctx.font = '900 48px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.shadowColor = eb.color;
    ctx.shadowBlur = 18;
    ctx.fillText(`${eb.name.toUpperCase()} OUT`, this.width / 2, bannerY);

    // Subtext: "[Name] is out"
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 24px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText(`${eb.name} is out`, this.width / 2, bannerY + 40);

    ctx.restore();
  }

  renderVictoryOverlay(ctx) {
    ctx.save();
    const w = this.winner;
    const bannerY = this.arena.cy;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    ctx.fillRect(0, bannerY - 75, this.width, 150);

    ctx.fillStyle = w.color;
    ctx.fillRect(0, bannerY - 77, this.width, 6);
    ctx.fillRect(0, bannerY + 73, this.width, 6);

    ctx.textAlign = 'center';
    ctx.fillStyle = w.color;
    ctx.font = '900 62px -apple-system, BlinkMacSystemFont, "Impact", sans-serif';
    ctx.shadowColor = w.color;
    ctx.shadowBlur = 28;
    ctx.fillText(`${w.name.toUpperCase()} WINS!`, this.width / 2, bannerY + 20);

    ctx.restore();
  }

  startRenderLoop() {
    const loop = (timestamp) => {
      const dt = Math.min(0.08, (timestamp - (this.lastFrameTime || timestamp)) / 1000);
      this.lastFrameTime = timestamp;

      this.updatePhysics(dt);
      this.render();

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // --- RECORDING & VIDEO EXPORT ---
  async startRecording() {
    window.soundEngine.init();
    window.soundEngine.resume();

    this.recordedChunks = [];
    const canvasStream = this.canvas.captureStream(60);
    const combinedStream = new MediaStream();
    canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));

    if (window.soundEngine.recorderDestination) {
      window.soundEngine.recorderDestination.stream.getAudioTracks().forEach(track => {
        combinedStream.addTrack(track);
      });
    }

    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];
    let selectedMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '';

    try {
      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 8000000
      });
    } catch (e) {
      console.warn("Fallback to standard MediaRecorder:", e);
      this.mediaRecorder = new MediaRecorder(combinedStream);
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.downloadRecordedVideo();
    };

    this.isRecording = true;
    this.mediaRecorder.start(100);

    document.getElementById('btnRecord').textContent = '⏹ Stop & Save Video';
    document.getElementById('btnRecord').classList.add('recording');

    this.startMatch();
  }

  stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    document.getElementById('btnRecord').textContent = '⏺ Record & Export Video';
    document.getElementById('btnRecord').classList.remove('recording');
  }

  downloadRecordedVideo() {
    const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType || 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    const ext = (this.mediaRecorder.mimeType && this.mediaRecorder.mimeType.includes('mp4')) ? 'mp4' : 'webm';
    a.download = `StringWar_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 150);

    alert(`Video export complete! File downloaded: StringWar_${Date.now()}.${ext}`);
  }

  cropToSquareDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 256;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // --- UI MANAGEMENT ---
  initUI() {
    document.getElementById('selectPreset').addEventListener('change', (e) => {
      this.loadPreset(e.target.value);
    });

    document.getElementById('btnPlay').addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('btnReset').addEventListener('click', () => {
      window.soundEngine.stopBgm();
      this.running = false;
      this.paused = false;
      this.resetSimulation();
      document.getElementById('btnPlay').textContent = '▶ Start Match';
      document.getElementById('statusBadge').textContent = 'Ready';
      document.getElementById('statusBadge').className = 'status-badge';
    });

    document.getElementById('btnRecord').addEventListener('click', () => {
      if (this.isRecording) {
        this.stopRecording();
      } else {
        this.startRecording();
      }
    });

    document.getElementById('inputTitle').addEventListener('input', (e) => {
      this.config.title = e.target.value;
    });
    document.getElementById('inputSubtitle').addEventListener('input', (e) => {
      this.config.subtitle = e.target.value;
    });
    document.getElementById('inputStrings').addEventListener('input', (e) => {
      this.config.initialStrings = parseInt(e.target.value) || 40;
    });

    document.getElementById('inputCustomBgm').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        window.soundEngine.setCustomBgm(file);
        document.getElementById('bgmStatus').textContent = `Loaded: ${file.name}`;
      }
    });

    document.getElementById('sliderSfxVol').addEventListener('input', (e) => {
      window.soundEngine.sfxVolume = parseFloat(e.target.value);
    });
    document.getElementById('sliderBgmVol').addEventListener('input', (e) => {
      window.soundEngine.bgmVolume = parseFloat(e.target.value);
      if (window.soundEngine.customBgmGain) {
        window.soundEngine.customBgmGain.gain.value = parseFloat(e.target.value);
      }
    });

    document.getElementById('btnAddContestant').addEventListener('click', () => {
      this.addContestantPrompt();
    });

    document.getElementById('btnExportJson').addEventListener('click', () => {
      this.exportProjectConfig();
    });
    document.getElementById('btnImportJson').addEventListener('click', () => {
      document.getElementById('inputImportJson').click();
    });
    document.getElementById('inputImportJson').addEventListener('change', (e) => {
      this.importProjectConfig(e.target.files[0]);
    });
  }

  renderContestantList() {
    const listEl = document.getElementById('contestantList');
    listEl.innerHTML = '';

    this.contestants.forEach((c, idx) => {
      const card = document.createElement('div');
      card.className = 'contestant-card';
      const activeCount = c.stringsList.filter(s => s.alive).length || c.initialStrings || this.config.initialStrings;

      card.innerHTML = `
        <div class="c-avatar-wrapper" style="border-color: ${c.color}">
          <img src="${c.avatarUrl}" class="c-avatar" alt="${c.name}">
          <label class="c-avatar-upload" title="Upload new photo">
            📷
            <input type="file" accept="image/*" class="input-c-avatar" data-idx="${idx}" style="display:none">
          </label>
        </div>
        <div class="c-info">
          <input type="text" class="c-name-input" value="${c.name}" data-idx="${idx}">
          <div class="c-controls">
            <input type="color" class="c-color-input" value="${c.color}" data-idx="${idx}">
            <span class="c-strings-badge">${activeCount} 🧵</span>
          </div>
        </div>
        <button class="c-delete-btn" data-idx="${idx}" title="Remove contestant">✕</button>
      `;

      listEl.appendChild(card);
    });

    listEl.querySelectorAll('.c-name-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = e.target.dataset.idx;
        this.contestants[idx].name = e.target.value;
      });
    });

    listEl.querySelectorAll('.c-color-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = e.target.dataset.idx;
        this.contestants[idx].color = e.target.value;
        this.renderContestantList();
      });
    });

    listEl.querySelectorAll('.input-c-avatar').forEach(input => {
      input.addEventListener('change', async (e) => {
        const idx = e.target.dataset.idx;
        const file = e.target.files[0];
        if (file) {
          try {
            const squareDataUrl = await this.cropToSquareDataUrl(file);
            this.contestants[idx].avatarUrl = squareDataUrl;
            this.preloadAvatars().then(() => {
              this.renderContestantList();
            });
          } catch (err) {
            console.error("Image crop error:", err);
          }
        }
      });
    });

    listEl.querySelectorAll('.c-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.target.dataset.idx;
        if (this.contestants.length <= 2) {
          alert("A match needs at least 2 contestants!");
          return;
        }
        this.contestants.splice(idx, 1);
        this.resetSimulation();
        this.renderContestantList();
      });
    });
  }

  addContestantPrompt() {
    const defaultColors = ['#FFD700', '#3B82F6', '#EC4899', '#84CC16', '#22C55E', '#06B6D4', '#A855F7', '#EF4444', '#F97316'];
    const newIdx = this.contestants.length + 1;
    const name = prompt("Enter new contestant name:", `Player ${newIdx}`);
    if (!name) return;

    const color = defaultColors[this.contestants.length % defaultColors.length];
    const avatar = window.createSvgAvatar(name.substring(0, 4).toUpperCase(), color, '#fff');

    this.contestants.push({
      id: 'c_' + Date.now(),
      name: name,
      color: color,
      avatarUrl: avatar,
      initialStrings: this.config.initialStrings,
      stringsList: [],
      alive: true,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: this.config.orbRadius,
      sectorAngle: 0,
      arcSpan: 0,
      pulse: 0,
      bladeGlow: 0,
      batchCutsMade: 0,
      batchCutsSuffered: 0,
      batchTimer: 0,
      touchCooldown: 0
    });

    this.preloadAvatars().then(() => {
      this.resetSimulation();
      this.renderContestantList();
    });
  }

  updateHUDStats() {
    const aliveCount = this.contestants.filter(c => c.alive).length;
    const counterEl = document.getElementById('statAliveCount');
    if (counterEl) {
      counterEl.textContent = `${aliveCount} / ${this.contestants.length}`;
    }
  }

  exportProjectConfig() {
    const data = {
      config: this.config,
      contestants: this.contestants.map(c => ({
        name: c.name,
        color: c.color,
        avatarUrl: c.avatarUrl,
        strings: c.stringsList.filter(s => s.alive).length || this.config.initialStrings
      }))
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StringWar_Template_${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  importProjectConfig(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.config) Object.assign(this.config, data.config);
        if (data.contestants) {
          this.contestants = data.contestants.map((c, i) => ({
            id: 'c_' + Date.now() + '_' + i,
            name: c.name,
            color: c.color,
            avatarUrl: c.avatarUrl,
            initialStrings: c.strings || 40,
            stringsList: [],
            alive: true,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            radius: this.config.orbRadius,
            sectorAngle: 0,
            arcSpan: 0,
            pulse: 0,
            bladeGlow: 0,
            batchCutsMade: 0,
            batchCutsSuffered: 0,
            batchTimer: 0,
            touchCooldown: 0
          }));
        }
        document.getElementById('inputTitle').value = this.config.title;
        document.getElementById('inputSubtitle').value = this.config.subtitle;
        this.preloadAvatars().then(() => {
          this.resetSimulation();
          this.renderContestantList();
        });
      } catch (err) {
        alert("Failed to parse template JSON: " + err.message);
      }
    };
    reader.readAsText(file);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.studio = new StringWarStudio();
});
