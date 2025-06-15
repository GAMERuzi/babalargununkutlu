const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const scoreDisplay = document.getElementById('score');
const timeDisplay = document.getElementById('time');
const bgMusic = document.getElementById('bgMusic');
const sirenSound = document.getElementById('sirenSound');

canvas.width = 480;
canvas.height = 720;

// Oyun değişkenleri
let gameRunning = false;
let score = 0;
let time = 0;
let laneCount = 4;
let laneWidth = canvas.width / laneCount;
let truckWidth = laneWidth * 0.7;
let truckHeight = 120;
let truckLane = 1;
let speed = 5;
let obstacleSpeed = 4;
let golds = [];
let policeCars = [];
let gameInterval, timerInterval;
let sirenActive = false;

// Dokunmatik kontroller için basit butonlar
let touchLeft, touchRight;

function setupTouchControls() {
  touchLeft = document.createElement('button');
  touchRight = document.createElement('button');
  touchLeft.innerText = '◀';
  touchRight.innerText = '▶';
  touchLeft.id = 'touchLeftBtn';
  touchRight.id = 'touchRightBtn';

  document.body.appendChild(touchLeft);
  document.body.appendChild(touchRight);

  touchLeft.style.position = 'fixed';
  touchLeft.style.bottom = '20px';
  touchLeft.style.left = '20px';
  touchLeft.style.fontSize = '2rem';
  touchLeft.style.padding = '10px 20px';
  touchLeft.style.zIndex = 10;
  touchLeft.style.opacity = 0.5;

  touchRight.style.position = 'fixed';
  touchRight.style.bottom = '20px';
  touchRight.style.right = '20px';
  touchRight.style.fontSize = '2rem';
  touchRight.style.padding = '10px 20px';
  touchRight.style.zIndex = 10;
  touchRight.style.opacity = 0.5;

  touchLeft.addEventListener('touchstart', () => moveLeft());
  touchRight.addEventListener('touchstart', () => moveRight());
}

function clearTouchControls() {
  if(touchLeft) touchLeft.remove();
  if(touchRight) touchRight.remove();
}

// Tır çizimi (basit üstten görünüm)
function drawTruck(x, y) {
  ctx.fillStyle = '#ff9900'; // turuncu
  ctx.strokeStyle = '#cc7a00';
  ctx.lineWidth = 4;
  ctx.fillRect(x, y, truckWidth, truckHeight);
  ctx.strokeRect(x, y, truckWidth, truckHeight);

  // Tekerlekler
  ctx.fillStyle = '#333';
  let wheelRadius = 15;
  ctx.beginPath();
  ctx.arc(x + 20, y + truckHeight - 10, wheelRadius, 0, Math.PI * 2);
  ctx.arc(x + truckWidth - 20, y + truckHeight - 10, wheelRadius, 0, Math.PI * 2);
  ctx.fill();
}

// Polis aracı çizimi (üstten görünüm)
function drawPoliceCar(x, y) {
  ctx.fillStyle = '#cc0000'; // kırmızı
  ctx.strokeStyle = '#990000';
  ctx.lineWidth = 3;
  ctx.fillRect(x, y, truckWidth * 0.9, truckHeight * 0.7);
  ctx.strokeRect(x, y, truckWidth * 0.9, truckHeight * 0.7);

  // Tekerlekler
  ctx.fillStyle = '#222';
  let wheelRadius = 12;
  ctx.beginPath();
  ctx.arc(x + 15, y + truckHeight * 0.7 - 8, wheelRadius, 0, Math.PI * 2);
  ctx.arc(x + truckWidth * 0.9 - 15, y + truckHeight * 0.7 - 8, wheelRadius, 0, Math.PI * 2);
  ctx.fill();

  // Işık üstü (lamba)
  ctx.fillStyle = '#ff2222';
  ctx.fillRect(x + truckWidth * 0.35, y + 5, truckWidth * 0.2, 10);
}

// Altın çizimi (dönüyor)
function drawGold(x, y, angle) {
  ctx.save();
  ctx.translate(x + 15, y + 15);
  ctx.rotate(angle);
  ctx.fillStyle = '#ffd700'; // altın sarısı
  ctx.beginPath();
  for(let i=0; i<5; i++) {
    ctx.lineTo(0, 10);
    ctx.rotate(Math.PI / 5);
    ctx.lineTo(0, 5);
    ctx.rotate(Math.PI / 5);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Yol çizgileri
function drawRoad() {
  ctx.fillStyle = '#555555';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Şerit çizgileri
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 4;
  for(let i=1; i<laneCount; i++) {
    let x = i * laneWidth;
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

// Oyuncu tırının pozisyonu (x, y)
function getTruckX(lane) {
  return lane * laneWidth + (laneWidth - truckWidth)/2;
}
const truckY = canvas.height - truckHeight - 20;

// Oyun döngüsü ve mantık
let goldAngle = 0;

function spawnGold() {
  if(Math.random() < 0.03) { // düşük ihtimal altın çıkışı
    let lane = Math.floor(Math.random() * laneCount);
    golds.push({
      lane: lane,
      y: -50,
      angle: 0
    });
  }
}

function spawnPolice() {
  if(Math.random() < 0.015) { // düşük ihtimal polis çıkışı
    let lane = Math.floor(Math.random() * laneCount);
    policeCars.push({
      lane: lane,
      y: -120
    });
  }
}

function updateObjects() {
  golds.forEach(g => {
    g.y += speed;
    g.angle += 0.05;
  });
  golds = golds.filter(g => g.y < canvas.height + 50);

  policeCars.forEach(p => {
    p.y += speed + 1.5;
  });
  policeCars = policeCars.filter(p => p.y < canvas.height + 120);
}

function drawObjects() {
  golds.forEach(g => {
    let x = g.lane * laneWidth + laneWidth / 2 - 15;
    drawGold(x, g.y, g.angle);
  });

  policeCars.forEach(p => {
    let x = p.lane * laneWidth + (laneWidth - truckWidth*0.9)/2;
    drawPoliceCar(x, p.y);
  });
}

function detectCollisions() {
  // Altın toplama
  golds.forEach((g, i) => {
    if(g.lane === truckLane && g.y > truckY && g.y < truckY + truckHeight) {
      score++;
      golds.splice(i,1);
      scoreDisplay.textContent = `Altın: ${score}`;
    }
  });

  // Polis çarpması
  for(let p of policeCars) {
    if(p.lane === truckLane && p.y > truckY && p.y < truckY + truckHeight) {
      endGame();
      break;
    }
  }
}

function drawTruckAndUI() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoad();
  drawObjects();
  drawTruck(getTruckX(truckLane), truckY);
}

function gameLoop() {
  spawnGold();
  spawnPolice();
  updateObjects();
  detectCollisions();
  drawTruckAndUI();

  // Zorluk arttıkça sireni aç/kapa
  if(score > 10 && !sirenActive) {
    sirenActive = true;
    sirenSound.play();
  } else if(score <= 10 && sirenActive) {
    sirenActive = false;
    sirenSound.pause();
    sirenSound.currentTime = 0;
  }
}

function startGame() {
  startScreen.style.display = 'none';
  gameOverScreen.style.display = 'none';
  gameRunning = true;
  score = 0;
  time = 0;
  truckLane = 1;
  golds = [];
  policeCars = [];
  scoreDisplay.textContent = `Altın: ${score}`;
  timeDisplay.textContent = `Süre: ${time}s`;
  bgMusic.play();
  sirenSound.pause();
  sirenSound.currentTime = 0;
  sirenActive = false;

  setupTouchControls();

  gameInterval = setInterval(gameLoop, 30);
  timerInterval = setInterval(() => {
    time++;
    timeDisplay.textContent = `Süre: ${time}s`;
  }, 1000);
}

function endGame() {
  gameRunning = false;
  clearInterval(gameInterval);
  clearInterval(timerInterval);
  bgMusic.pause();
  sirenSound.pause();
  gameOverScreen.style.display = 'block';
  clearTouchControls();
}

// Klavye ve dokunmatik hareketleri
window.addEventListener('keydown', (e) => {
  if(!gameRunning) return;
  if(e.key === 'ArrowLeft') moveLeft();
  if(e.key === 'ArrowRight') moveRight();
});

function moveLeft() {
  if(truckLane > 0) truckLane--;
}

function moveRight() {
  if(truckLane < laneCount - 1) truckLane++;
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
