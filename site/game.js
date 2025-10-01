const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let carImg = new Image();
carImg.src = "voitoure.png"; // image de voiture PNG avec fond transparent

let cityImg = new Image();
cityImg.src = "ville.png"; // Silhouette de ville

let car = { 
  x: 0, y: 0, w: 80, h: 120, speed: 8 
};

carImg.onload = () => {
  const scale = 0.15; // échelle (15% de la taille d'origine par ex.)
  car.w = carImg.width * scale;
  car.h = carImg.height * scale;
  car.x = canvas.width / 2 - car.w / 2;
  car.y = canvas.height - car.h - 20;
};

let obstacles = [];
let roadLines = [];
let gameRunning = true;
let horizonY = canvas.height / 3; // Position de la ville

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
  ctx.drawImage(cityImg, 0, horizonY - 135, canvas.width, 150);
}

// Dessiner la route
function drawRoad() {
  ctx.fillStyle = "#0ff";
  roadLines.forEach(line => {
    if (line.y + line.h < horizonY) return; // n'affiche pas au-dessus de l’horizon
    ctx.fillRect(line.x, line.y, line.w, line.h);
  });
}

// Mise à jour des lignes
roadLines.forEach(line => {
  line.y += 10;
  if (line.y > canvas.height) line.y = -40;
});

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
  obstacles.push({ x: lane * laneWidth + laneWidth / 2 - 25, y: horizonY, w: 50, h: 100 });
}

// Boucle du jeu
function update() {
  if (!gameRunning) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Fond
  ctx.fillStyle = "#081040";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Route (pointillés)
  roadLines.forEach(line => {
    line.y += 10;
    if (line.y > canvas.height) line.y = -40;
  });
  drawRoad();

  // 3. Obstacles (au-dessus de la route, mais sous la ville)
  obstacles.forEach(o => o.y += 6);
  obstacles = obstacles.filter(o => o.y < canvas.height + 100);
  drawObstacles();

  // 4. Ville (recouvre la route au fond, mais pas la voiture)
  drawBackground();

  // 5. Collision check (sur les vraies positions, peu importe l’ordre visuel)
  obstacles.forEach(o => {
    if (car.x < o.x + o.w &&
        car.x + car.w > o.x &&
        car.y < o.y + o.h &&
        car.y + car.h > o.y) {
      gameOver();
    }
  });

  // 6. Voiture (au-dessus de tout)
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
