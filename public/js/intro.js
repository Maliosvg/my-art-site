/**
 * Intro Splash Animation — Butterflies + Code Typing + Spiral Converge + Iris Reveal
 */
(function () {
  var introCanvas = document.getElementById('intro-canvas');
  if (!introCanvas || sessionStorage.getItem('introPlayed')) {
      if (introCanvas) introCanvas.remove();
      document.querySelectorAll('#swup-container, .app-sidebar, #global-theme-toggle').forEach(function(el) {
          el.style.opacity = '1';
      });
      return;
  }
  sessionStorage.setItem('introPlayed', 'true');

  var ctx = introCanvas.getContext('2d');
  var W, H, dpr;

  // --- Theme ---
  function isDark() {
    var pref = localStorage.getItem('theme-preference');
    return pref !== 'light';
  }

  function colors() {
    var dark = isDark();
    return {
      bg: dark ? '#0a0b10' : '#ffffff',
      fg: dark ? '#ffffff' : '#000000',
      fgSoft: dark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)',
      fgCode: dark ? 'rgba(140,200,255,1.0)' : 'rgba(30,60,120,0.9)',
      fgCodeDim: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)',
      dot: dark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)',
      butterfly: dark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)',
      glow: 'rgba(74, 158, 218, 0.8)',
      centerDot: dark ? '#ffffff' : '#000000',
    };
  }

  // --- Resize ---
  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    introCanvas.width = W * dpr;
    introCanvas.height = H * dpr;
    introCanvas.style.width = W + 'px';
    introCanvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // --- Code Lines ---
  var codeLines = [
    'Reboot: The command started running but',
    'no known instruction set was found. The',
    'instruction set appears to be missing',
    'or corrupted. Please try again later.',
    '',
    '17:58:47 Error: "%(0)>(455655665[-[]::3:"',
    'Instruction set not found.',
    'Unable to continue operation.',
    'Please try again later.',
    '',
    'Reboot: The command started running but',
    'no known instruction set was found. The',
    'instruction set appears to be missing',
    'or corrupted. Please try again later.',
    '',
    '17:58:47 Error: "%(0)>(455655665[-[]::3:"',
    'Instruction set not found.',
    'Unable to continue operation.',
    'Please try again later.',
    '',
    'Reboot: The command started running but',
    'no known instruction set was found. The',
    ' instruction set appears to be missing',
    '  or corrupted. Please try again later.',
    '',
    'Warning\u26A0, the library has disappeared',
  ];

  // --- Code Typing State ---
  var codeTyped = [];
  var codeCurrentLine = 0;
  var codeCurrentChar = 0;
  var codeLastCharTime = 0;
  var CODE_CHAR_INTERVAL = 16;
  var CODE_LINE_PAUSE = 60;
  var codeLineStartTime = 0;
  var codeScrollOffset = 0;

  // --- Butterfly System ---
  var butterflies = [];
  var BUTTERFLY_COUNT = window.innerWidth < 820 ? 30 : 80;

  function createButterfly() {
    // Mix of sizes: mostly 20-80, some giants
    var rand = Math.random();
    var size;
    if (rand < 0.08) {
      size = 100 + Math.random() * 40; // 8% giants
    } else if (rand < 0.3) {
      size = 50 + Math.random() * 30; // 22% large
    } else {
      size = 20 + Math.random() * 30; // 70% normal
    }
    return {
      x: -size - Math.random() * W * 0.4,
      y: Math.random() * H,
      size: size,
      vx: 2.5 + Math.random() * 4.0,
      vy: (Math.random() - 0.5) * 2.0,
      wingPhase: Math.random() * Math.PI * 2,
      wingSpeed: 3 + Math.random() * 4,
      rotation: (Math.random() - 0.5) * 0.5,
      opacity: 0.6 + Math.random() * 0.4,
      origSize: 0,
      angularV: (Math.random() > 0.5 ? 1 : -1) * (0.01 + Math.random() * 0.02),
    };
  }

  function initButterflies() {
    butterflies = [];
    for (var i = 0; i < BUTTERFLY_COUNT; i++) {
      var b = createButterfly();
      b.origSize = b.size;
      butterflies.push(b);
    }
  }

  function drawButterfly(b, timestamp, c, sizeOverride) {
    var wingAngle = Math.sin(timestamp * 0.001 * b.wingSpeed + b.wingPhase) * 0.7;

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rotation);
    ctx.globalAlpha = b.opacity;

    var s = sizeOverride || b.size;
    ctx.fillStyle = c.butterfly;

    // Left wing
    ctx.save();
    ctx.scale(Math.cos(wingAngle), 1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-s * 0.6, -s * 0.8, -s * 1.1, -s * 0.5, -s * 0.4, -s * 0.05);
    ctx.bezierCurveTo(-s * 0.3, s * 0.05, 0, 0, 0, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-s * 0.5, s * 0.3, -s * 0.9, s * 0.7, -s * 0.3, s * 0.35);
    ctx.bezierCurveTo(-s * 0.1, s * 0.15, 0, s * 0.05, 0, 0);
    ctx.fill();
    ctx.restore();

    // Right wing
    ctx.save();
    ctx.scale(Math.cos(-wingAngle), 1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * 0.6, -s * 0.8, s * 1.1, -s * 0.5, s * 0.4, -s * 0.05);
    ctx.bezierCurveTo(s * 0.3, s * 0.05, 0, 0, 0, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * 0.5, s * 0.3, s * 0.9, s * 0.7, s * 0.3, s * 0.35);
    ctx.bezierCurveTo(s * 0.1, s * 0.15, 0, s * 0.05, 0, 0);
    ctx.fill();
    ctx.restore();

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.04, s * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // --- Dot Particles ---
  var dots = [];
  var DOT_COUNT = window.innerWidth < 820 ? 60 : 180;

  function createDot() {
    var rand = Math.random();
    var r;
    if (rand < 0.05) {
      r = 35 + Math.random() * 15; // 5% super large
    } else if (rand < 0.2) {
      r = 15 + Math.random() * 15; // 15% large
    } else {
      r = 3 + Math.random() * 12; // 80% normal
    }
    return {
      x: -r - Math.random() * W * 0.5,
      y: Math.random() * H,
      r: r,
      origR: r,
      vx: 1.2 + Math.random() * 3.5,
      vy: (Math.random() - 0.5) * 1.0,
      opacity: 0.4 + Math.random() * 0.55,
    };
  }

  function initDots() {
    dots = [];
    for (var i = 0; i < DOT_COUNT; i++) {
      dots.push(createDot());
    }
  }

  // --- Animation State ---
  var startTime = 0;
  var animRunning = true;

  // --- Timeline ---
  var T = {
    codeEnd: 5500,
    butterflyStart: 2000,
    codePushStart: 2500,
    codePushEnd: 5000,
    fillStart: 5000,
    slowDown: 5000,    // butterflies start slowing
    slowEnd: 5500,     // butterflies fully stopped
    spiralStart: 5500, // spiral convergence begins
    spiralEnd: 7000,   // everything condensed to center
    irisStart: 7000,   // iris bloom starts
    irisEnd: 8500,     // iris fully open
    fadeStart: 8500,   // fade out overlay
    fadeEnd: 9000,     // done
  };

  function updateCode(timestamp, elapsed) {
    if (codeCurrentLine >= codeLines.length) return;

    if (elapsed - codeLastCharTime > CODE_CHAR_INTERVAL) {
      var line = codeLines[codeCurrentLine];
      if (codeCurrentChar === 0 && codeTyped.length <= codeCurrentLine) {
        if (elapsed - codeLineStartTime < CODE_LINE_PAUSE && codeTyped.length > 0) return;
        codeTyped.push({ text: '', charCount: 0 });
      }

      if (codeCurrentChar < line.length) {
        codeTyped[codeCurrentLine].text = line.substring(0, codeCurrentChar + 1);
        codeTyped[codeCurrentLine].charCount = codeCurrentChar + 1;
        codeCurrentChar++;
      } else {
        codeCurrentLine++;
        codeCurrentChar = 0;
        codeLineStartTime = elapsed;
      }
      codeLastCharTime = elapsed;
    }
  }

  function drawCode(timestamp, elapsed, pushOffset, c) {
    var fontSize = W < 820 ? 11 : Math.max(15, Math.min(19, W * 0.014));
    var lineHeight = fontSize * 1.65;
    var startX = W * 0.52 + pushOffset;
    var startY = 60;
    var maxVisibleLines = Math.floor((H - 80) / lineHeight);

    ctx.font = '400 ' + fontSize + 'px "JetBrains Mono", "Fira Code", "Courier New", monospace';

    if (codeTyped.length > maxVisibleLines) {
      codeScrollOffset = (codeTyped.length - maxVisibleLines) * lineHeight;
    }

    for (var i = 0; i < codeTyped.length; i++) {
      var y = startY + i * lineHeight - codeScrollOffset;
      if (y < 20 || y > H - 20) continue;

      var line = codeTyped[i].text;

      if (line.indexOf('Reboot:') === 0 || line.indexOf('Warning') === 0) {
        ctx.fillStyle = c.fgSoft;
      } else if (line.indexOf('Error:') !== -1) {
        ctx.fillStyle = c.fgCode;
      } else {
        ctx.fillStyle = c.fgCodeDim;
      }

      ctx.fillText(line, startX, y);
    }

    // Blinking cursor
    if (codeCurrentLine < codeLines.length && Math.floor(timestamp / 500) % 2 === 0) {
      var curLine = codeTyped[codeTyped.length - 1];
      if (curLine) {
        var curY = startY + (codeTyped.length - 1) * lineHeight - codeScrollOffset;
        var curX = startX + ctx.measureText(curLine.text).width + 2;
        ctx.fillStyle = c.fg;
        ctx.fillRect(curX, curY - fontSize + 2, 2, fontSize);
      }
    }
  }

  function drawDots(c) {
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      if (d.opacity <= 0) continue;
      ctx.beginPath();
      ctx.arc(d.x, d.y, Math.max(d.r, 0.1), 0, Math.PI * 2);
      ctx.fillStyle = c.dot;
      ctx.globalAlpha = d.opacity;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // --- Easing ---
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // --- Main Loop ---
  function animate(timestamp) {
    if (!animRunning) return;

    if (!startTime) {
      startTime = timestamp;
      initButterflies();
      initDots();
    }

    var elapsed = timestamp - startTime;
    var c = colors();
    var cx = W / 2;
    var cy = H / 2;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);

    // --- Update Code ---
    if (elapsed < T.codeEnd) {
      updateCode(timestamp, elapsed);
    }

    // --- Calculate push offset ---
    var pushOffset = 0;
    if (elapsed > T.codePushStart && elapsed < T.codePushEnd + 500) {
      var pushProgress = Math.min((elapsed - T.codePushStart) / (T.codePushEnd - T.codePushStart), 1);
      pushOffset = easeInOutCubic(pushProgress) * (W * 0.8);
    } else if (elapsed >= T.codePushEnd + 500) {
      pushOffset = W * 0.8;
    }

    // --- Draw Code ---
    if (elapsed < T.codePushEnd + 500) {
      drawCode(timestamp, elapsed, pushOffset, c);
    }

    // --- Spiral convergence progress ---
    var spiralT = 0;
    if (elapsed >= T.spiralStart && elapsed < T.spiralEnd) {
      spiralT = (elapsed - T.spiralStart) / (T.spiralEnd - T.spiralStart);
      spiralT = easeInOutCubic(spiralT);
    } else if (elapsed >= T.spiralEnd) {
      spiralT = 1;
    }

    // --- Slow down factor ---
    var speedMult = 1;
    if (elapsed >= T.slowDown && elapsed < T.slowEnd) {
      speedMult = 1 - (elapsed - T.slowDown) / (T.slowEnd - T.slowDown);
    } else if (elapsed >= T.slowEnd) {
      speedMult = 0;
    }

    // --- Update & Draw Butterflies ---
    var butterfliesActive = elapsed > T.butterflyStart;
    var drawingElements = butterfliesActive && elapsed < T.irisEnd;

    if (drawingElements) {
      var targetCount = elapsed < T.fillStart
        ? Math.floor(BUTTERFLY_COUNT * Math.min((elapsed - T.butterflyStart) / 3000, 1))
        : BUTTERFLY_COUNT;

      for (var i = 0; i < butterflies.length && i < targetCount; i++) {
        var b = butterflies[i];

        if (spiralT > 0 && spiralT < 1) {
          // Fluid vortex: angular velocity increases as elements get closer
          var dx = cx - b.x;
          var dy = cy - b.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          
          // Radial pull: stronger as spiralT grows
          var pullStrength = spiralT * spiralT * 0.06;
          b.x += dx * pullStrength;
          b.y += dy * pullStrength;
          
          // Tangential rotation: faster when closer to center (like a real vortex)
          var tangentSpeed = (0.02 + spiralT * 0.04) * (1 + 200 / (dist + 50));
          var angle = Math.atan2(dy, dx);
          b.x += Math.cos(angle + Math.PI * 0.5) * dist * tangentSpeed * b.angularV / Math.abs(b.angularV);
          b.y += Math.sin(angle + Math.PI * 0.5) * dist * tangentSpeed * b.angularV / Math.abs(b.angularV);
          
          // Shrink smoothly
          b.size = b.origSize * Math.max(0.05, 1 - spiralT * spiralT * 0.95);
          b.opacity = Math.max(0.05, b.opacity * 0.997);
          b.rotation += tangentSpeed * 0.5;
        } else if (spiralT >= 1) {
          continue;
        } else {
          // Normal movement — faster horizontal
          b.x += b.vx * speedMult;
          if (elapsed >= T.fillStart && b.x > W + b.size) b.x = -b.size;
          b.y += (b.vy + Math.sin(timestamp * 0.001 + i) * 0.4) * speedMult;
          if (b.y < -b.size) b.y = H + b.size;
          if (b.y > H + b.size) b.y = -b.size;
        }

        drawButterfly(b, timestamp, c);
      }
    }

    // --- Update & Draw Dots ---
    if (drawingElements) {
      var dotTarget = elapsed < T.fillStart
        ? Math.floor(DOT_COUNT * Math.min((elapsed - T.butterflyStart) / 3000, 1))
        : DOT_COUNT;

      for (var j = 0; j < dots.length && j < dotTarget; j++) {
        var d = dots[j];

        if (spiralT > 0 && spiralT < 1) {
          var ddx = cx - d.x;
          var ddy = cy - d.y;
          var ddist = Math.sqrt(ddx * ddx + ddy * ddy);
          
          var dPull = spiralT * spiralT * 0.06;
          d.x += ddx * dPull;
          d.y += ddy * dPull;
          
          var dTangent = (0.015 + spiralT * 0.035) * (1 + 150 / (ddist + 40));
          var dAngle = Math.atan2(ddy, ddx);
          var dDir = (j % 2 === 0) ? 1 : -1;
          d.x += Math.cos(dAngle + Math.PI * 0.5) * ddist * dTangent * dDir;
          d.y += Math.sin(dAngle + Math.PI * 0.5) * ddist * dTangent * dDir;
          
          d.r = d.origR * Math.max(0.05, 1 - spiralT * spiralT * 0.9);
        } else if (spiralT >= 1) {
          continue;
        } else {
          d.x += d.vx * speedMult;
          if (elapsed >= T.fillStart && d.x > W + d.r) d.x = -d.r;
          d.y += d.vy * speedMult;
          if (d.y < -d.r) d.y = H + d.r;
          if (d.y > H + d.r) d.y = -d.r;
        }
      }
      drawDots(c);
    }

    // --- Center dot (condensed point) ---
    if (elapsed >= T.spiralEnd - 300 && elapsed < T.irisStart + 200) {
      var dotGrow = Math.min((elapsed - (T.spiralEnd - 300)) / 500, 1);
      var dotR = easeOutCubic(dotGrow) * 12;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fillStyle = c.centerDot;
      ctx.shadowColor = c.glow;
      ctx.shadowBlur = 30 * dotGrow;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // --- Iris Reveal (homepage shows through the hole) ---
    if (elapsed >= T.irisStart) {
      // Show the main content UNDERNEATH before we cut the hole
      if (!introCanvas._contentRevealed) {
        introCanvas._contentRevealed = true;
        var hideStyle = document.getElementById('intro-hide-style');
        if (hideStyle) hideStyle.remove();
        
        document.querySelectorAll('#swup-container, .app-sidebar, #global-theme-toggle').forEach(function(el) {
          // Keep CSS transitions intact, just change opacity
          el.style.opacity = '1';
        });
      }

      var irisT = Math.min((elapsed - T.irisStart) / (T.irisEnd - T.irisStart), 1);
      var irisEased = easeOutCubic(irisT);
      
      var maxR = Math.hypot(cx, cy) + 80;
      var r = irisEased * maxR;

      // Clear the entire canvas first so the hole is truly transparent
      ctx.clearRect(0, 0, W, H);

      // Draw opaque cover ONLY outside the iris circle
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.arc(cx, cy, Math.max(r, 0.1), 0, Math.PI * 2, true);
      ctx.fillStyle = c.bg;
      ctx.fill('evenodd');
      ctx.restore();

      // Glow ring at the iris edge
      if (r > 5 && r < maxR - 10) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(74, 158, 218, ' + (0.9 - irisT * 0.7) + ')';
        ctx.shadowColor = c.glow;
        ctx.shadowBlur = 40;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // When iris is fully open, remove the canvas entirely
      if (irisT >= 1) {
        animRunning = false;
        introCanvas.remove();
        return;
      }
    }

    requestAnimationFrame(animate);
  }

  // --- Start ---
  document.querySelectorAll('#swup-container, .app-sidebar, #global-theme-toggle').forEach(function(el) {
    el.style.opacity = '0';
  });

  requestAnimationFrame(animate);
})();
