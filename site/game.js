const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let carImg = new Image();
carImg.src = "car.png"; // Mets ici l’image de ta voiture (PNG avec fond transparent)

let cityImg = new Image();
cityImg.src = "city-silhouette.png"; // Silhouette de ville

let car = { 
  x: canvas.width / 2 - 40, 
  y: canvas.height - 140, 
  w: 80, 
  h: 120, 
  speed: 8 
};

let obstacles = [];
let roadLines = [];
let gameRunning = true;
let horizonY = canvas.height / 3; // Position de l’horizon

// Lignes de route
for (let i = 0; i < 20; i++) {
  roadLines.push({ x: canvas.width / 2 - 5, y: i * 80, w: 10, h: 40 });
}

// Dessiner horizon + ville
function drawBackground() {
  // Horizon
  ctx.fillStyle = "#0ff";
  ctx.fillRect(0, horizonY, canvas.width, 2);

  // Silhouette de ville
  ctx.drawImage(cityImg, 0, horizonY - 100, canvas.width, 150);
}

// Dessiner la route
function drawRoad() {
  ctx.fillStyle = "#0ff";
  roadLines.forEach(line => {
    ctx.fillRect(line.x, line.y, line.w, line.h);
  });
}

// Dessiner obstacles
function drawObstacles() {
  ctx.fillStyle = "#ff1f4d";
  obstacles.forEach(o => ctx.fillRect(o.x, o.y, o.w, o.h));
}

// Dessiner voiture
function drawCar() {
  ctx.drawImage(carImg, car.x, car.y, car.w, car.h);
}

// Générer obstacle
function spawnObstacle() {
  const laneWidth = canvas.width / 3;
  const lane = Math.floor(Math.random() * 3);
  obstacles.push({ x: lane * laneWidth + laneWidth / 2 - 25, y: -100, w: 50, h: 100 });
}

// Boucle du jeu
function update() {
  if (!gameRunning) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Arrière-plan (horizon + ville)
  drawBackground();

  // Route
  roadLines.forEach(line => {
    line.y += 10;
    if (line.y > canvas.height) line.y = -40;
  });
  drawRoad();

  // Obstacles
  obstacles.forEach(o => o.y += 6);
  obstacles = obstacles.filter(o => o.y < canvas.height + 100);
  drawObstacles();

  // Collision
  obstacles.forEach(o => {
    if (car.x < o.x + o.w && car.x + car.w > o.x && car.y < o.y + o.h && car.y + car.h > o.y) {
      gameOver();
    }
  });

  // Voiture
  drawCar();

  requestAnimationFrame(update);
}

// Contrôles clavier
document.addEventListener("keydown", e => {
  if (!gameRunning) return;
  if (e.key === "ArrowLeft" && car.x > 0) car.x -= car.speed * 2;
  if (e.key === "ArrowRight" && car.x + car.w < canvas.width) car.x += car.speed * 2;
});

// Contrôle gyroscope (mobile)
window.addEventListener("deviceorientation", event => {
  if (!gameRunning) return;
  const gamma = event.gamma;
  if (gamma < -10 && car.x > 0) car.x -= car.speed;
  if (gamma > 10 && car.x + car.w < canvas.width) car.x += car.speed;
});

// Spawn obstacles
setInterval(() => {
  if (gameRunning) spawnObstacle();
}, 2000);

// Game Over
function gameOver() {
  gameRunning = false;
  document.getElementById("gameOver").style.display = "block";
}

// Restart
function restartGame() {
  car.x = canvas.width / 2 - 40;
  car.y = canvas.height - 140;
  obstacles = [];
  gameRunning = true;
  document.getElementById("gameOver").style.display = "none";
  update();
}

// Démarrage
update();
