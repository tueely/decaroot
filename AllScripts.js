/******************************************************
     *  1) Global Setup
     ******************************************************/
    const canvas = document.getElementById("simulationCanvas");
    const ctx = canvas.getContext("2d");

    // Handle high DPI screens
    function resizeCanvasToDisplaySize(canvas) {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      return { width: canvas.width, height: canvas.height, dpr };
    }

    // Ball parameters
    const ball = {
      x: 0,
      y: 0,
      radius: 12, // Don't change
      vxPercent: 0.1, // horizontal velocity as % of canvas width per frame
      vy: 0,
      gravity: 9.8,
      cor: 0.7,
      trail: []
    };

    // Preset configurations
    const presets = {
      "Moon":             { gravity: 1.62,  cor: 0.5,  velocity: 4.5 },
      "Earth":            { gravity: 9.8,   cor: 0.5,  velocity: 10 },
      "Critical Damping": { gravity: 9.8,   cor: 0.99, velocity: 10 },
      "Over Damping":     { gravity: 9.8,   cor: 0.01, velocity: 10 },
      "Under Damping":    { gravity: 9.8,   cor: 0.5,  velocity: 10 }
    };

    // DOM elements
    const presetSelect     = document.getElementById("presetSelect");
    const gravityInput     = document.getElementById("gravityInput");
    const restitutionInput = document.getElementById("restitutionInput");
    const velocityInput    = document.getElementById("velocityInput");
    const testBtn          = document.getElementById("testBtn");
    const resetBtn         = document.getElementById("resetBtn");
    const loopBtn          = document.getElementById("loopBtn");

    // Track loop state (on/off)
    let loopEnabled = false;

    /******************************************************
     *  2) Helper Functions
     ******************************************************/
    // Reads the preset values into the input fields
    function setInputsFromPreset(presetName) {
      if (!presets[presetName]) return;
      gravityInput.value     = presets[presetName].gravity;
      restitutionInput.value = presets[presetName].cor;
      velocityInput.value    = presets[presetName].velocity;
    }

    // If any input changes, select 'Custom'
    function markPresetAsCustom() {
      if (presetSelect.value !== "Custom") {
        presetSelect.value = "Custom";
      }
    }

    // Apply preset if it's not "Custom"
    function applyPreset(presetName) {
      if (presetName === "Custom") return;
      setInputsFromPreset(presetName);
    }

    // Apply the user-input parameters to the ball
    function applyUserParameters() {
      ball.gravity = Math.max(0, parseFloat(gravityInput.value));
      ball.cor     = Math.min(Math.max(0, parseFloat(restitutionInput.value)), 1.0);
      // **Fix: Set the new velocity instead of adding**
      ball.vy     = parseFloat(velocityInput.value);
    }

    // Places the ball at bottom center, sets vy=0, clears trail
    function placeBallAtBottom() {
      const { width, height } = resizeCanvasToDisplaySize(canvas);
      ball.x = width / 2;
      ball.y = height - ball.radius;
      ball.vy = 0;
      ball.trail = [];
    }

    /******************************************************
     *  3) Event Listeners
     ******************************************************/
    // Preset dropdown
    presetSelect.addEventListener("change", () => {
      // Update input fields from chosen preset
      applyPreset(presetSelect.value);
      // Immediately apply to the ball (so if loop is on, it uses new values)
      applyUserParameters();
    });

    // Mark as "Custom" if user modifies any input
    gravityInput.addEventListener("input", markPresetAsCustom);
    restitutionInput.addEventListener("input", markPresetAsCustom);
    velocityInput.addEventListener("input", markPresetAsCustom);

    // Test button: do one shot with current parameters, disable loop
    testBtn.addEventListener("click", () => {
      applyUserParameters();
      loopEnabled = false;
      loopBtn.textContent = "Loop Off";
    });

    // Reset button: place ball at bottom, revert to Earth, apply those parameters
    resetBtn.addEventListener("click", () => {
      placeBallAtBottom();
      presetSelect.value = "Earth";
      setInputsFromPreset("Earth");
      applyUserParameters();
    });

    // Toggle loop on/off
    loopBtn.addEventListener("click", () => {
      loopEnabled = !loopEnabled;
      loopBtn.textContent = loopEnabled ? "Loop On" : "Loop Off";
    });

    /******************************************************
     *  4) Animation Loop
     ******************************************************/
    function update() {
      const { width, height } = resizeCanvasToDisplaySize(canvas);

      // Horizontal movement
      const vx = (ball.vxPercent / 100) * width;
      ball.x += vx;

      // Wrap horizontally
      if (ball.x - ball.radius > width) {
        ball.x = -ball.radius;
      }
      if (ball.x + ball.radius < 0) {
        ball.x = width + ball.radius;
      }

      // Gravity
      ball.vy += ball.gravity * 0.016; // ~16ms per frame
      ball.y += ball.vy;

      // Collision at bottom
      if (ball.y + ball.radius > height) {
        ball.y = height - ball.radius;
        // bounce
        ball.vy = -ball.vy * ball.cor;

        // If it's very slow, consider "at rest"
        if (Math.abs(ball.vy) < 0.1) {
          ball.vy = 0;
          ball.y = height - ball.radius;

          // If loop is ON, re-launch upward with new velocity
          if (loopEnabled) {
            // Use the *current* velocity setting from velocityInput
            ball.vy = -parseFloat(velocityInput.value);
          }
        }
      }

      /*
      // Collision at top (no bounce)
      if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = 0; 
      }
      */

      // Trail
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 250) {
        ball.trail.shift();
      }
    }

    function draw() {
      const { width, height } = resizeCanvasToDisplaySize(canvas);
      ctx.clearRect(0, 0, width, height);

      // Draw trail
      for (let i = 0; i < ball.trail.length; i++) {
        const pos = ball.trail[i];
        const alpha = i / ball.trail.length;
        ctx.fillStyle = `rgba(52, 152, 219, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#3498db";
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.closePath();
    }

    function animationLoop() {
      update();
      draw();
      requestAnimationFrame(animationLoop);
    }

    /******************************************************
     *  5) Initialization
     ******************************************************/
    // Resize canvas
    resizeCanvasToDisplaySize(canvas);

    // Place ball at bottom center
    placeBallAtBottom();

    // Default "Earth" preset
    setInputsFromPreset("Earth");
    applyUserParameters();

    // Start the animation
    animationLoop();
