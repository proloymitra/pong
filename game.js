// Radio stations
const radioStations = [
    "https://ice5.somafm.com/groovesalad-128-mp3", // SomaFM Groove Salad
    "https://stream.radioparadise.com/eclectic-192", // Radio Paradise
    "https://icecast.radiofrance.fr/fip-midfi.mp3" // FIP Radio
];
let currentStationIndex = 0;

// Game variables
let canvas, ctx, gameWidth, gameHeight;
let paddleWidth, paddleHeight, paddleSpeed;
let ballSize, ballX, ballY, ballSpeedX, ballSpeedY, initialBallSpeed;
let playerPaddleX, aiPaddleX;
let score = 0;
let lives = 5;
let gameRunning = false;
let gamePaused = false;
let animationId;
let lastTime = 0;
let particles = [];
let touchX = null;
let radioPlaying = false;
let radioAudio = null;
let isMobile = false;

// Set safe areas for mobile devices (in pixels)
let safeAreaTop = 40;
let safeAreaBottom = 60;

// DOM elements
const gameContainer = document.getElementById('game-container');
const menuScreen = document.getElementById('menu');
const gameOverScreen = document.getElementById('game-over');
const startBtn = document.getElementById('start-btn');
const exitBtn = document.getElementById('exit-btn');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');
const pauseBtn = document.getElementById('pause-btn');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const finalScoreDisplay = document.getElementById('final-score');
const particlesContainer = document.getElementById('particles');
const radioToggleBtn = document.getElementById('radio-toggle-btn');
const touchPad = document.getElementById('touch-pad');
const touchIndicator = document.getElementById('touch-indicator');

// Keyboard controls
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    a: false,
    d: false
};

// Initialize the game
function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Detect mobile devices
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Check for iOS devices to handle safe areas
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
        // Adjust safe areas for iOS
        safeAreaTop = 60;
        safeAreaBottom = 80;
    }
    
    // Set up event listeners
    window.addEventListener('resize', handleResize);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    
    // Set up touchpad event listeners
    touchPad.addEventListener('touchstart', handleTouchPadStart);
    touchPad.addEventListener('touchmove', handleTouchPadMove);
    touchPad.addEventListener('touchend', handleTouchPadEnd);
    
    // Set up button event listeners
    startBtn.addEventListener('click', startGame);
    exitBtn.addEventListener('click', exitGame);
    restartBtn.addEventListener('click', restartGame);
    menuBtn.addEventListener('click', showMenu);
    pauseBtn.addEventListener('click', togglePause);
    radioToggleBtn.addEventListener('click', toggleRadio);
    
    // Initial resize
    handleResize();
    
    // Start the animation loop
    requestAnimationFrame(gameLoop);
}

// Handle window resize
function handleResize() {
    // Set canvas dimensions
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gameWidth = canvas.width;
    gameHeight = canvas.height;
    
    // Adjust game dimensions
    paddleWidth = gameWidth * 0.3;
    paddleHeight = gameHeight * 0.02;
    ballSize = Math.min(gameWidth, gameHeight) * 0.05;
    paddleSpeed = gameWidth * 0.015;
    initialBallSpeed = gameHeight * 0.0003;
    
    // Update touchpad position and size
    if (isMobile) {
        touchPad.style.display = gameRunning ? 'block' : 'none';
        touchPad.style.width = `${gameWidth * 0.7}px`;
        touchPad.style.bottom = `${gameHeight * 0.05}px`;
    }
    
    // Reposition elements if game is running
    if (gameRunning) {
        playerPaddleX = (gameWidth - paddleWidth) / 2;
        aiPaddleX = (gameWidth - paddleWidth) / 2;
        resetBall();
    }
}

// Start the game
function startGame() {
    menuScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameRunning = true;
    gamePaused = false;
    score = 0;
    lives = 5;
    updateScoreDisplay();
    updateLivesDisplay();
    
    playerPaddleX = (gameWidth - paddleWidth) / 2;
    aiPaddleX = (gameWidth - paddleWidth) / 2;
    resetBall();
    
    // Generate initial particles
    particles = [];
    for (let i = 0; i < 50; i++) {
        particles.push(createParticle());
    }
    
    // Show touchpad for mobile devices when game starts
    if (isMobile) {
        touchPad.style.display = 'block';
    }
}

// Reset the ball
function resetBall() {
    ballX = gameWidth / 2;
    ballY = gameHeight / 2;
    
    // Random angle but avoid horizontal directions
    let angle;
    if (Math.random() < 0.5) {
        // Upward
        angle = Math.random() * Math.PI / 4 - Math.PI / 2 - Math.PI / 8;
    } else {
        // Downward
        angle = Math.random() * Math.PI / 4 + Math.PI / 2 + Math.PI / 8;
    }
    
    ballSpeedX = Math.cos(angle) * initialBallSpeed;
    ballSpeedY = Math.sin(angle) * initialBallSpeed;
}

// Update game state
function update(deltaTime) {
    if (!gameRunning || gamePaused) return;
    
    // Calculate target position for player paddle
    let targetX = playerPaddleX;
    
    // Keyboard controls - set target position
    if (keys.ArrowLeft || keys.a) {
        targetX = Math.max(0, playerPaddleX - paddleSpeed * deltaTime);
    }
    if (keys.ArrowRight || keys.d) {
        targetX = Math.min(gameWidth - paddleWidth, playerPaddleX + paddleSpeed * deltaTime);
    }
        
    // Touch/mouse control - override keyboard target position
    if (touchX !== null) {
        targetX = Math.min(
            Math.max(0, touchX - paddleWidth/2),
            gameWidth - paddleWidth
        );
    }
    
    // Apply smooth movement to player paddle
    playerPaddleX += (targetX - playerPaddleX) * 0.2;
    
    // AI paddle movement
    const aiTargetX = ballX - paddleWidth / 2;
    const aiDiff = (aiTargetX - aiPaddleX) * 0.6; // Reduce perfection
    aiPaddleX += aiDiff * 0.03;
    aiPaddleX = Math.max(0, Math.min(gameWidth - paddleWidth, aiPaddleX));
    
    // Move ball
    ballX += ballSpeedX * deltaTime;
    ballY += ballSpeedY * deltaTime;
    
    // Ball collision with side walls
    if (ballX < ballSize/2 || ballX > gameWidth - ballSize/2) {
        ballSpeedX = -ballSpeedX;
        // Add particles for wall collision
        addCollisionParticles(ballX, ballY, ballSpeedX > 0 ? 180 : 0);
    }
    
    // Ball collision with top wall (AI goal)
    if (ballY < ballSize/2 + safeAreaTop) {
        // Check if it hits AI paddle
        if (ballX > aiPaddleX && ballX < aiPaddleX + paddleWidth) {
            ballSpeedY = Math.abs(ballSpeedY);
            // Angle based on where it hit the paddle
            const hitPos = (ballX - aiPaddleX) / paddleWidth;
            ballSpeedX += (hitPos - 0.5) * initialBallSpeed * 2;
            // Add particles for paddle collision
            addCollisionParticles(ballX, ballY + ballSize/2, 270);
            // Speed up the ball
            increaseBallSpeed();
            // Increase score
            score += 10;
            updateScoreDisplay();
        } else {
            // AI missed, but no penalty to player
            resetBall();
        }
    }
    
    // Ball collision with bottom wall (Player goal)
    if (ballY > gameHeight - ballSize/2 - safeAreaBottom) {
        // Check if it hits player paddle
        if (ballX > playerPaddleX && ballX < playerPaddleX + paddleWidth) {
            ballSpeedY = -Math.abs(ballSpeedY);
            // Angle based on where it hit the paddle
            const hitPos = (ballX - playerPaddleX) / paddleWidth;
            ballSpeedX += (hitPos - 0.5) * initialBallSpeed * 2;
            // Add particles for paddle collision
            addCollisionParticles(ballX, ballY - ballSize/2, 90);
            // Speed up the ball
            increaseBallSpeed();
            // Increase score
            score += 10;
            updateScoreDisplay();
        } else {
            // Player missed
            lives--;
            updateLivesDisplay();
            // Add particles for life loss
            for (let i = 0; i < 20; i++) {
                addCollisionParticles(ballX, gameHeight - safeAreaBottom, 90, '#f55');
            }
            
            if (lives <= 0) {
                gameOver();
            } else {
                resetBall();
            }
        }
    }
    
    // Update particles
    updateParticles(deltaTime);
}

// Render game objects
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw center line
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.setLineDash([15, 15]);
    ctx.moveTo(0, gameHeight/2);
    ctx.lineTo(gameWidth, gameHeight/2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw paddles
    ctx.fillStyle = '#0ff';
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 10;
    
    // AI paddle (top) - with safe area padding
    ctx.fillRect(aiPaddleX, safeAreaTop + 10, paddleWidth, paddleHeight);
    
    // Player paddle (bottom) - with safe area padding
    ctx.fillRect(playerPaddleX, gameHeight - paddleHeight - 10 - safeAreaBottom, paddleWidth, paddleHeight);
    
    // Draw ball with glow effect
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 15;
    ctx.arc(ballX, ballY, ballSize/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
    // Render particles
    renderParticles();
    
    // Draw pause screen if game is paused
    if (gamePaused && gameRunning) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, gameWidth, gameHeight);
        ctx.fillStyle = '#0ff';
        ctx.font = `${Math.min(gameWidth, gameHeight) * 0.05}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PAUSED', gameWidth / 2, gameHeight / 2);
    }
}

// Game loop
function gameLoop(timestamp) {
    // Calculate delta time (cap to prevent huge jumps)
    const deltaTime = Math.min(64, timestamp - (lastTime || timestamp));
    lastTime = timestamp;
    
    // Update and render
    update(deltaTime);
    draw();
    
    // Continue the loop
    animationId = requestAnimationFrame(gameLoop);
}

// Increase ball speed gradually
function increaseBallSpeed() {
    const speedIncrease = 1.02;
    ballSpeedX *= speedIncrease;
    ballSpeedY *= speedIncrease;
    
    // Cap to maximum speed
    const maxSpeed = initialBallSpeed * 4;
    const currentSpeed = Math.sqrt(ballSpeedX*ballSpeedX + ballSpeedY*ballSpeedY);
    if (currentSpeed > maxSpeed) {
        const ratio = maxSpeed / currentSpeed;
        ballSpeedX *= ratio;
        ballSpeedY *= ratio;
    }
}

// Game over
function gameOver() {
    gameRunning = false;
    finalScoreDisplay.textContent = score;
    gameOverScreen.style.display = 'flex';
    
    // Hide touchpad when game is over
    if (isMobile) {
        touchPad.style.display = 'none';
    }
}

// Restart game
function restartGame() {
    gameOverScreen.style.display = 'none';
    startGame();
}

// Show menu
function showMenu() {
    gameOverScreen.style.display = 'none';
    menuScreen.style.display = 'flex';
    gameRunning = false;
    
    // Hide touchpad when in menu
    if (isMobile) {
        touchPad.style.display = 'none';
    }
}

// Exit game
function exitGame() {
    if (confirm('This will close the game. Are you sure?')) {
        window.close();
        // If window.close() doesn't work (which is likely in most browsers)
        document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#000;color:#0ff;font-family:Arial;">You have exited the game. Refresh the page to play again.</div>';
    }
}

// Toggle pause
function togglePause() {
    if (!gameRunning) return;
    
    gamePaused = !gamePaused;
    pauseBtn.textContent = gamePaused ? '▶️' : '⏸️';
}

// Update score display
function updateScoreDisplay() {
    scoreDisplay.textContent = `Score: ${score}`;
    finalScoreDisplay.textContent = score;
}

// Update lives display
function updateLivesDisplay() {
    const lifeElements = livesDisplay.querySelectorAll('.life');
    for (let i = 0; i < lifeElements.length; i++) {
        if (i < lives) {
            lifeElements[i].classList.remove('lost');
        } else {
            lifeElements[i].classList.add('lost');
        }
    }
}

// Toggle radio
function toggleRadio() {
    if (radioPlaying) {
        if (radioAudio) {
            radioAudio.pause();
            radioAudio = null;
        }
        radioPlaying = false;
        radioToggleBtn.textContent = 'Radio: Off';
    } else {
        try {
            // Create audio element with appropriate settings
            radioAudio = new Audio();
            radioAudio.crossOrigin = "anonymous";
            radioAudio.preload = "auto";
            
            // Load stream through a media element source
            radioAudio.src = radioStations[currentStationIndex];
            
            // Handle errors
            radioAudio.onerror = function(e) {
                console.error("Error loading radio stream:", e);
                // Try next station
                currentStationIndex = (currentStationIndex + 1) % radioStations.length;
                console.log("Trying next radio station:", radioStations[currentStationIndex]);
                radioAudio.src = radioStations[currentStationIndex];
                
                // Only show error if all stations have been tried
                if (currentStationIndex === 0) {
                    alert("Couldn't connect to any radio stream. Please try again later.");
                    radioPlaying = false;
                    radioToggleBtn.textContent = 'Radio: Off';
                } else {
                    radioAudio.play().catch(err => {
                        console.log("Second try radio error:", err);
                    });
                }
            };
            
            // Start playing
            let playPromise = radioAudio.play();
            
            if (playPromise !== undefined) {
                playPromise.then(_ => {
                    // Playing successfully
                    radioPlaying = true;
                    radioToggleBtn.textContent = 'Radio: On';
                })
                .catch(err => {
                    console.log("Radio autoplay prevented:", err);
                    alert("Click the radio button again to start radio (browser autoplay policy).");
                    radioPlaying = false;
                    radioToggleBtn.textContent = 'Radio: Off';
                });
            }
        } catch (err) {
            console.error("Radio initialization error:", err);
            alert("Could not initialize radio stream.");
        }
    }
}

// Keyboard event handlers
function handleKeyDown(e) {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
        e.preventDefault();
    }
    
    // Pause with Escape key
    if (e.key === 'Escape' || e.key === 'p') {
        togglePause();
        e.preventDefault();
    }
}

function handleKeyUp(e) {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
        e.preventDefault();
    }
}

// Touch controls for canvas
function handleTouchStart(e) {
    if (!gameRunning || e.target !== canvas) return;
    const touch = e.touches[0];
    touchX = touch.clientX;
    e.preventDefault();
}

function handleTouchMove(e) {
    if (!gameRunning || touchX === null || e.target !== canvas) return;
    const touch = e.touches[0];
    touchX = touch.clientX;
    e.preventDefault();
}

function handleTouchEnd(e) {
    if (e.target === canvas) {
        touchX = null;
        e.preventDefault();
    }
}

// Touch controls for touchpad
function handleTouchPadStart(e) {
    if (!gameRunning) return;
    const touchPadRect = touchPad.getBoundingClientRect();
    const touch = e.touches[0];
    
    // Calculate relative position within touchpad
    const relativeX = Math.max(0, Math.min(touch.clientX - touchPadRect.left, touchPadRect.width));
    const touchPadWidth = touchPadRect.width;
    const percentage = relativeX / touchPadWidth;
    
    // Update touch indicator position
    touchIndicator.style.left = `${relativeX}px`;
    
    // Calculate paddle position based on touchpad touch
    touchX = percentage * gameWidth;
    e.preventDefault();
}

function handleTouchPadMove(e) {
    if (!gameRunning) return;
    const touchPadRect = touchPad.getBoundingClientRect();
    const touch = e.touches[0];
    
    // Calculate relative position within touchpad
    const relativeX = Math.max(0, Math.min(touch.clientX - touchPadRect.left, touchPadRect.width));
    const touchPadWidth = touchPadRect.width;
    const percentage = relativeX / touchPadWidth;
    
    // Update touch indicator position
    touchIndicator.style.left = `${relativeX}px`;
    
    // Calculate paddle position based on touchpad touch
    touchX = percentage * gameWidth;
    e.preventDefault();
}

function handleTouchPadEnd(e) {
    // Reset touchpad control
    touchIndicator.style.left = '50%';
    touchX = null;
    e.preventDefault();
}

// Mouse controls
let mouseDown = false;

function handleMouseDown(e) {
    if (!gameRunning) return;
    mouseDown = true;
    touchX = e.clientX;
}

function handleMouseMove(e) {
    if (!gameRunning || !mouseDown) return;
    touchX = e.clientX;
}

function handleMouseUp() {
    mouseDown = false;
    touchX = null;
}

// Particle system
function createParticle(x, y, color) {
    return {
        x: x !== undefined ? x : Math.random() * gameWidth,
        y: y !== undefined ? y : Math.random() * gameHeight,
        size: Math.random() * 3 + 1,
        color: color || '#0ff',
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        alpha: Math.random() * 0.7 + 0.3,
        fadeSpeed: Math.random() * 0.02 + 0.005
    };
}

function addCollisionParticles(x, y, angle, color) {
    const count = 10;
    const spread = Math.PI / 3; // 60 degrees spread
    
    for (let i = 0; i < count; i++) {
        const particleAngle = angle * (Math.PI / 180) + (Math.random() * spread - spread/2);
        const speed = Math.random() * 2 + 1;
        const particle = {
            x: x,
            y: y,
            size: Math.random() * 4 + 2,
            color: color || '#0ff',
            speedX: Math.cos(particleAngle) * speed,
            speedY: Math.sin(particleAngle) * speed,
            alpha: 1,
            fadeSpeed: Math.random() * 0.04 + 0.02
        };
        
        particles.push(particle);
    }
}

function updateParticles(deltaTime) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        p.x += p.speedX * deltaTime;
        p.y += p.speedY * deltaTime;
        p.alpha -= p.fadeSpeed * deltaTime * 0.05;
        
        // Remove faded particles
        if (p.alpha <= 0) {
            particles.splice(i, 1);
            // Create a new particle to replace it
            if (gameRunning) {
                particles.push(createParticle());
            }
        }
    }
}

function renderParticles() {
    for (const p of particles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.globalAlpha = 1;
}

// Initialize the game when the page loads
window.onload = init;