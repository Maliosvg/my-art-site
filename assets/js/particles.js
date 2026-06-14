/**
 * Interactive Particle Background with 8-Hand Theme Transition
 */
(function () {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height, dpr;
  let particles = [];
  let mouse = { x: -9999, y: -9999, active: false };
  let animationId;

  // --- Config ---
  const CONFIG = {
    particleCount: 70, // Base count for light mode
    particleCountDark: 130, // More dots in dark mode
    particleMinRadius: 0.8,
    particleMaxRadius: 2.2,
    particleSpeed: 0.3,
    lineDistance: 110,
    lineOpacity: 0.1,
    repelRadius: 65,
    repelStrength: 6,
    recoveryRate: 0.035,
    particleOpacityMin: 0.2,
    particleOpacityMax: 0.65,
  };

  // --- Theme State ---
  function checkDarkMode() {
    let pref = localStorage.getItem('theme-preference');
    return pref === 'dark' || (!document.body.classList.contains('light') && pref !== 'light');
  }

  // --- Danmaku system ---
  let danmakuItems = [];
  let danmakuEnabled = false;

  function initDanmaku() {
    const postContent = document.querySelector('.post-content');
    if (!postContent) return;
    danmakuEnabled = true;
    const text = postContent.innerText || '';
    const chunks = text.split(/[。！？\n.!?]+/).filter(function(s) { return s.trim().length > 2 && s.trim().length < 40; });
    if (chunks.length === 0) return;

    var count = Math.min(chunks.length, 25);
    for (var i = 0; i < count; i++) {
      let angle = (Math.random() - 0.5) * 40 * (Math.PI / 180); // -20 to 20 degrees
      let speed = 0.5 + Math.random() * 0.8;
      danmakuItems.push({
        text: chunks[i].trim(),
        x: width + Math.random() * width * 0.8,
        y: 60 + Math.random() * (height - 120),
        vx: -Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        opacity: 0.12 + Math.random() * 0.15, // Increased brightness
        fontSize: 16 + Math.random() * 8, // Increased size
      });
    }
  }

  function updateDanmaku() {
    if (!danmakuEnabled) return;
    for (var i = 0; i < danmakuItems.length; i++) {
      var d = danmakuItems[i];
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < -600 || d.y < -100 || d.y > height + 100) {
        d.x = width + Math.random() * 300;
        d.y = 60 + Math.random() * (height - 120);
      }
    }
  }

  function drawDanmaku() {
    if (!danmakuEnabled) return;
    for (var i = 0; i < danmakuItems.length; i++) {
      var d = danmakuItems[i];
      ctx.font = d.fontSize + 'px "Inter", sans-serif';
      ctx.fillStyle = 'rgba(100, 160, 255, ' + d.opacity + ')';
      ctx.fillText(d.text, d.x, d.y);
    }
  }

  // --- Hand Transition Animation ---
  let transitionActive = false;
  let transitionStartTime = 0;
  let transitionTargetMode = 'dark';
  let transitionResolved = false;

  window.addEventListener('request-theme-transition', function(e) {
      startTransition(e.detail.theme);
  });

  function startTransition(targetTheme) {
      if (transitionActive) return;
      transitionTargetMode = targetTheme;
      transitionActive = true;
      transitionStartTime = performance.now();
      transitionResolved = false;
      canvas.style.zIndex = '9999'; // Cover everything including DOM!

      let isDarkTarget = (targetTheme === 'dark');
      let targetCount = isDarkTarget ? CONFIG.particleCountDark : CONFIG.particleCount;
      if (particles.length < targetCount) {
          let needed = targetCount - particles.length;
          for(let i=0; i<needed; i++) particles.push(createParticle());
      } else if (particles.length > targetCount) {
          particles.splice(targetCount);
      }
  }

  function drawRealHand(ctx, x, y, size, rotation, color) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.scale(size, size);
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5 / size; // maintain consistent line thickness regardless of scale
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.moveTo(-2000, -25); // Thinner arm
      ctx.lineTo(0, -25);
      
      // Palm base to Thumb
      ctx.bezierCurveTo(15, -25, 25, -60, 45, -70); // Thumb reaches out far
      ctx.bezierCurveTo(55, -75, 60, -65, 50, -55); // Thumb tip
      ctx.bezierCurveTo(40, -45, 20, -20, 20, -15); // Thumb base
      
      // Index finger
      ctx.bezierCurveTo(35, -25, 90, -40, 110, -35); // Long index
      ctx.bezierCurveTo(120, -30, 115, -15, 100, -10); // Tip
      ctx.bezierCurveTo(70, -5, 30, 0, 30, 0); // Base
      
      // Middle finger
      ctx.bezierCurveTo(45, 0, 105, -15, 125, -10); // Longest finger
      ctx.bezierCurveTo(135, -5, 130, 10, 115, 15); // Tip
      ctx.bezierCurveTo(80, 20, 30, 15, 30, 15); // Base
      
      // Ring finger
      ctx.bezierCurveTo(45, 15, 100, 5, 115, 15);
      ctx.bezierCurveTo(125, 20, 120, 35, 105, 35);
      ctx.bezierCurveTo(70, 35, 25, 25, 25, 25);
      
      // Pinky
      ctx.bezierCurveTo(35, 25, 80, 30, 90, 40);
      ctx.bezierCurveTo(100, 50, 90, 60, 80, 60);
      ctx.bezierCurveTo(50, 55, 15, 35, 5, 30); // Base connects to wrist
      
      ctx.lineTo(-2000, 30); // Bottom of arm
      // Intentionally not closing path so the arm doesn't have a solid line crossing the screen edge
      ctx.stroke();
      ctx.restore();
  }

  function drawTransition(timestamp) {
    if (!transitionActive) return;
    let elapsed = timestamp - transitionStartTime;
    
    // Phase 1: Many hands close in from all directions (0 - 2000ms)
    // Phase 2: Pause full cover, DOM updates (2000 - 2400ms)
    // Phase 3: Wave sweep reveal (2400 - 4000ms)

    let p1 = Math.min(elapsed / 2000, 1);
    p1 = p1 < 0.5 ? 4 * p1 * p1 * p1 : 1 - Math.pow(-2 * p1 + 2, 3) / 2; // smooth ease-in-out

    let p3 = Math.max(0, Math.min((elapsed - 2400) / 1600, 1)); 

    let handColor = transitionTargetMode === 'dark' ? '#0a0b10' : '#ffffff';

    if (elapsed > 2200 && !transitionResolved) {
        window.dispatchEvent(new CustomEvent('theme-change-ready', { detail: { theme: transitionTargetMode } }));
        transitionResolved = true;
    }

    if (elapsed < 2400) {
        // ALWAYS target center
        let cx = width / 2;
        let cy = height / 2;
        
        let maxDist = Math.max(
            Math.hypot(cx, cy),
            Math.hypot(width - cx, cy),
            Math.hypot(cx, height - cy),
            Math.hypot(width - cx, height - cy)
        ) + 100;

        let offset = maxDist * (1 - p1);
        let size = Math.min(width, height) / 250; // slightly larger to ensure overlapverlap

        // To guarantee a perfect solid screen when hands overlap in the center
        if (p1 > 0.8) {
            ctx.save();
            ctx.fillStyle = handColor;
            ctx.globalAlpha = (p1 - 0.8) / 0.2;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }

        // Draw 32 hands from all directions
        let handCount = 32;
        for (let i = 0; i < handCount; i++) {
            let angle = (i / handCount) * Math.PI * 2;
            
            // To make it look chaotic and organic, add slight stagger to offset
            let staggerOffset = offset + Math.sin(i * 1.5) * (maxDist * 0.1) * (1 - p1);
            
            let handX = cx - Math.cos(angle) * staggerOffset;
            let handY = cy - Math.sin(angle) * staggerOffset;
            
            drawRealHand(ctx, handX, handY, size, angle, handColor);
        }
    }

    // Phase 3: Wave Reveal
    if (elapsed >= 2400 && elapsed < 4000) {
        var waveX = p3 * (width + 600) - 300;
        
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(waveX, 0);
        for (var y = 0; y <= height; y += 4) {
          var wave = Math.sin(y * 0.015 + elapsed * 0.004) * 60 + Math.sin(y * 0.008 + elapsed * 0.003) * 35;
          ctx.lineTo(waveX + wave, y);
        }
        ctx.lineTo(width + 10, height);
        ctx.lineTo(width + 10, 0);
        ctx.closePath();
        ctx.fillStyle = handColor; // Right side of the wave remains covered!
        ctx.fill();

        // Glowing blue edge
        ctx.beginPath();
        for (var y2 = 0; y2 <= height; y2 += 4) {
          var w2 = Math.sin(y2 * 0.015 + elapsed * 0.004) * 60 + Math.sin(y2 * 0.008 + elapsed * 0.003) * 35;
          if (y2 === 0) ctx.moveTo(waveX + w2, y2);
          else ctx.lineTo(waveX + w2, y2);
        }
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(0, 229, 255, ' + (1 - p3 * 0.2) + ')';
        ctx.shadowColor = 'rgba(0, 229, 255, 0.9)';
        ctx.shadowBlur = 40;
        ctx.stroke();
        ctx.restore();
    }

    if (elapsed >= 4000) {
        transitionActive = false;
        canvas.style.zIndex = '0'; // Restore canvas z-index behind DOM
    }
  }

  // --- Resize ---
  function resize() {
    dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // --- Particle ---
  function createParticle() {
    var angle = Math.random() * Math.PI * 2;
    var speed = CONFIG.particleSpeed * (0.4 + Math.random() * 0.6);
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      r: CONFIG.particleMinRadius + Math.random() * (CONFIG.particleMaxRadius - CONFIG.particleMinRadius),
      baseVx: Math.cos(angle) * speed,
      baseVy: Math.sin(angle) * speed,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      opacity: CONFIG.particleOpacityMin + Math.random() * (CONFIG.particleOpacityMax - CONFIG.particleOpacityMin),
      twinkleSpeed: 0.005 + Math.random() * 0.015,
      twinklePhase: Math.random() * Math.PI * 2,
      currentOpacity: 0,
    };
  }

  function initParticles() {
    particles = [];
    let isDark = checkDarkMode();
    let count = isDark ? CONFIG.particleCountDark : CONFIG.particleCount;
    for (var i = 0; i < count; i++) {
      particles.push(createParticle());
    }
  }

  // --- Update ---
  function update() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      if (mouse.active) {
        var dx = p.x - mouse.x;
        var dy = p.y - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONFIG.repelRadius && dist > 0) {
          var force = (1 - dist / CONFIG.repelRadius) * CONFIG.repelStrength;
          var nx = dx / dist;
          var ny = dy / dist;
          p.vx += nx * force * 0.15;
          p.vy += ny * force * 0.15;
        }
      }

      p.vx += (p.baseVx - p.vx) * CONFIG.recoveryRate;
      p.vy += (p.baseVy - p.vy) * CONFIG.recoveryRate;

      var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      var maxSpeed = CONFIG.particleSpeed * 6;
      if (speed > maxSpeed) {
        p.vx = (p.vx / speed) * maxSpeed;
        p.vy = (p.vy / speed) * maxSpeed;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;

      p.twinklePhase += p.twinkleSpeed;
      p.currentOpacity = p.opacity * (0.6 + 0.4 * Math.sin(p.twinklePhase));
    }

    updateDanmaku();
  }

  // --- Draw ---
  function draw(timestamp) {
    let isDarkMode = checkDarkMode();
    ctx.clearRect(0, 0, width, height);

    let lineColor = isDarkMode ? 'rgba(255, 255, 255, ' : 'rgba(0, 0, 0, ';
    let particleColor = isDarkMode ? 'rgba(255, 255, 255, ' : 'rgba(0, 0, 0, ';

    // Lines
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.lineDistance) {
          var opacity = (1 - dist / CONFIG.lineDistance) * CONFIG.lineOpacity;
          ctx.beginPath();
          ctx.strokeStyle = lineColor + opacity + ')';
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Particles
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = particleColor + p.currentOpacity + ')';
      ctx.fill();
    }

    // Always show circle around mouse
    if (mouse.x !== -9999) {
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, CONFIG.repelRadius / 2, 0, Math.PI * 2);
        ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Danmaku
    drawDanmaku();

    // Transition overlay
    if (transitionActive) {
      drawTransition(timestamp);
    }
  }

  // --- Animation Loop ---
  function loop(timestamp) {
    update();
    draw(timestamp || performance.now());
    animationId = requestAnimationFrame(loop);
  }

  // --- Mouse events ---
  function onMouseMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  }

  function onMouseLeave() {
    mouse.active = false;
    mouse.x = -9999;
    mouse.y = -9999;
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      mouse.x = e.touches[0].clientX;
      mouse.y = e.touches[0].clientY;
      mouse.active = true;
    }
  }

  function onTouchEnd() {
    mouse.active = false;
    mouse.x = -9999;
    mouse.y = -9999;
  }

  // --- Init ---
  function init() {
    resize();
    initParticles();
    initDanmaku();

    window.addEventListener('resize', function () {
      resize();
      if (particles.length > 0) {
        particles.forEach(function (p) {
          if (p.x > width) p.x = Math.random() * width;
          if (p.y > height) p.y = Math.random() * height;
        });
      }
    });

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);

    loop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
