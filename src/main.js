import './style.css';

// Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const OBSTACLE_SPEED_INITIAL = 5;
const SPAWN_RATE_INITIAL = 1500; // ms

// State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let highscore = localStorage.getItem('lumina_highscore') || 0;
let lastTime = 0;
let obstacleTimer = 0;
let gameSpeed = 1;

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highscoreEl = document.getElementById('highscore');
const finalScoreEl = document.getElementById('finalScore');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

// Set canvas dimensions
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
highscoreEl.textContent = highscore;

// Classes
class Player {
  constructor() {
    this.x = 100;
    this.y = CANVAS_HEIGHT - 50;
    this.radius = 15;
    this.vy = 0;
    this.isJumping = false;
    this.color = '#00f2ff';
  }

  jump() {
    if (!this.isJumping) {
      this.vy = JUMP_FORCE;
      this.isJumping = true;
    }
  }

  update() {
    this.vy += GRAVITY;
    this.y += this.vy;

    // Floor collision
    if (this.y > CANVAS_HEIGHT - 50) {
      this.y = CANVAS_HEIGHT - 50;
      this.vy = 0;
      this.isJumping = false;
    }
  }

  draw() {
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Obstacle {
  constructor(speed) {
    this.width = 20 + Math.random() * 30;
    this.height = 40 + Math.random() * 60;
    this.x = CANVAS_WIDTH + this.width;
    this.y = CANVAS_HEIGHT - this.height - 20; // Slightly above "ground"
    this.speed = speed;
    this.color = '#bc13fe';
  }

  update() {
    this.x -= this.speed;
  }

  draw() {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    // Triangular/Pulse shape
    ctx.moveTo(this.x, this.y + this.height);
    ctx.lineTo(this.x + this.width / 2, this.y);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  isOffscreen() {
    return this.x + this.width < 0;
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = Math.random() * 4 + 1;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8;
    this.life = 1.0;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 0.02;
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.life;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

// Game Instances
let player = new Player();
let obstacles = [];
let particles = [];

// Functions
function spawnObstacle() {
  obstacles.push(new Obstacle(OBSTACLE_SPEED_INITIAL * gameSpeed));
}

function handleCollision(p, o) {
  // Simple AABB vs Circle
  const closestX = Math.max(o.x, Math.min(p.x, o.x + o.width));
  const closestY = Math.max(o.y, Math.min(p.y, o.y + o.height));
  const dx = p.x - closestX;
  const dy = p.y - closestY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < p.radius;
}

function explode(x, y, color) {
  for (let i = 0; i < 20; i++) {
    particles.push(new Particle(x, y, color));
  }
}

function init() {
  player = new Player();
  obstacles = [];
  particles = [];
  score = 0;
  gameSpeed = 1;
  obstacleTimer = 0;
  scoreEl.textContent = '0';
  gameState = 'PLAYING';
  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  requestAnimationFrame(gameLoop);
}

function gameOver() {
  gameState = 'GAMEOVER';
  if (score > highscore) {
    highscore = score;
    localStorage.setItem('lumina_highscore', highscore);
    highscoreEl.textContent = highscore;
  }
  finalScoreEl.textContent = score;
  gameOverOverlay.classList.remove('hidden');
  explode(player.x, player.y, player.color);
}

function gameLoop(timestamp) {
  if (gameState !== 'PLAYING') return;

  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  // Clear
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Background Grid/Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }

  // ground line
  ctx.strokeStyle = 'rgba(0, 242, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_HEIGHT - 35);
  ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 35);
  ctx.stroke();

  // Spawning
  obstacleTimer += deltaTime;
  if (obstacleTimer > SPAWN_RATE_INITIAL / gameSpeed) {
    spawnObstacle();
    obstacleTimer = 0;
  }

  // Update & Draw Player
  player.update();
  player.draw();

  // Update & Draw Obstacles
  obstacles.forEach((o, index) => {
    o.update();
    o.draw();

    if (handleCollision(player, o)) {
      gameOver();
    }

    if (o.isOffscreen()) {
      obstacles.splice(index, 1);
      score++;
      scoreEl.textContent = score;
      gameSpeed += 0.02; // Gradually increase difficulty
    }
  });

  // Particles
  particles.forEach((p, index) => {
    p.update();
    p.draw();
    if (p.life <= 0) particles.splice(index, 1);
  });

  requestAnimationFrame(gameLoop);
}

// Event Listeners
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    if (gameState === 'PLAYING') player.jump();
    else if (gameState === 'START' || gameState === 'GAMEOVER') init();
  }
});

canvas.addEventListener('mousedown', () => {
  if (gameState === 'PLAYING') player.jump();
});

startBtn.addEventListener('click', init);
restartBtn.addEventListener('click', init);

// Initial draw or screen background
ctx.fillStyle = '#050510';
ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
