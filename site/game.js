
const params = new URLSearchParams(window.location.search);
const pseudo = params.get('pseudo');
const roomCode = params.get('code');

if (pseudo && roomCode) {
    console.log(`Le joueur ${pseudo} a rejoint la salle ${roomCode}.`);
} else {
    console.warn("Paramètres de connexion (pseudo ou code) manquants.");
}


const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let carImg = new Image();
carImg.src = "voitoure.png";

let obstacleImg = new Image();
obstacleImg.src = "pierro.png"; 

let car = {
    x: 0, y: 0, w: 80, h: 120, speed: 10
};

carImg.onload = () => {
    const scale = 0.35;
    car.w = carImg.width * scale;
    car.h = carImg.height * scale;
    car.x = canvas.width / 2 - car.w / 2;
    car.y = canvas.height - car.h - 20;
};

let obstacles = [];
let roadLines = [];
let gameRunning = true;

const roadWidth = canvas.width / 1.8; 
const laneWidth = roadWidth / 5;

const lineWidth = 10; 

const roadLinesCenter = canvas.width / 2;
const roadEdges = [
    roadLinesCenter - roadWidth / 2, 
    roadLinesCenter - laneWidth, 
    roadLinesCenter, 
    roadLinesCenter + laneWidth, 
    roadLinesCenter + roadWidth / 2 
];

let lineSpacing = 60; 
let lineLength = 30; 
let lineCount = Math.ceil(canvas.height / lineSpacing) + 1;

for (let i = 0; i < lineCount; i++) {
    const yPos = i * lineSpacing - lineLength;
    for (let i = 0; i < 5; i++) {
        roadLines.push({ 
            x: roadEdges[i] - lineWidth / 2, 
            y: yPos, 
            w: lineWidth, 
            h: lineLength, 
            isEdge: false
        });
    }
}

/**
 * Fait le dessin de la route
 * @returns {void}
 */
function drawRoad() {
    ctx.fillStyle = "#ffffff";

    roadLines.forEach(line => {
        ctx.fillStyle = line.isEdge ? "#8d99ae" : "#ffffff";
        ctx.fillRect(line.x, line.y, line.w, line.h);
    });
}

/**
 * Fait le dessin des obstacles
 * @returns {void}
 */
function drawObstacles() {
    obstacles.forEach(o => ctx.drawImage(obstacleImg, o.x, o.y, o.w, o.h));
}

/**
 * Fait le dessin du voiture
 * @returns {void}
 */
function drawCar() {
    ctx.drawImage(carImg, car.x, car.y, car.w, car.h);
}

/**
 * Fait spawn les obtacles
 * @returns {void}
 */
function spawnObstacle() {
    const MAX_OBSTACLES = 2;
    if (obstacles.length >= MAX_OBSTACLES) return;

    // 3 voies possibles : gauche, centre, droite
    const laneMids = [
        (roadEdges[0] + roadEdges[1]) / 2, // voie gauche
        (roadEdges[1] + roadEdges[3]) / 2, // voie centrale
        (roadEdges[3] + roadEdges[4]) / 2  // voie droite
    ];

    const laneIndex = Math.floor(Math.random() * laneMids.length);
    const obstacleX = laneMids[laneIndex] - 45;

    obstacles.push({ x: obstacleX, y: -130, w: 90, h: 130 });
}

/**
 * Met à jour l'affichage du jeu et des obstacles
 * @return {void}
 */
function update() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#2c3e50"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#343a40"; 
    const roadStartX = roadLinesCenter - roadWidth / 2;
    ctx.fillRect(roadStartX, 0, roadWidth, canvas.height);

    roadLines.forEach(line => {
        line.y += 15;
        if (line.y > canvas.height) { 
            line.y -= (lineCount * lineSpacing); 
        }
    });
    
    drawRoad();

    obstacles.forEach(o => o.y += 10);
    obstacles = obstacles.filter(o => o.y < canvas.height + 100); 
    drawObstacles();

    obstacles.forEach(o => {
        if (car.x < o.x + o.w &&
            car.x + car.w > o.x &&
            car.y < o.y + o.h &&
            car.y + car.h > o.y) {
            gameOver();
        }
    });

    drawCar();

    requestAnimationFrame(update);
}


document.addEventListener("keydown", e => {
    if (!gameRunning) return;
    
    const maxLeft = roadEdges[0];
    const maxRight = roadEdges[4] - car.w; 
    
    if (e.key === "ArrowLeft") {
        car.x = Math.max(car.x - car.speed * 3, maxLeft);
    }
    if (e.key === "ArrowRight") {
        car.x = Math.min(car.x + car.speed * 3, maxRight);
    }
});

window.addEventListener("deviceorientation", event => {
    if (!gameRunning) return;
    const gamma = event.gamma;
    
    const maxLeft = roadEdges[0];
    const maxRight = roadEdges[4] - car.w;

    if (gamma < -10) {
        car.x = Math.max(car.x - car.speed, maxLeft);
    }
    if (gamma > 10) {
        car.x = Math.min(car.x + car.speed, maxRight);
    }
});

setInterval(() => {
    if (gameRunning) spawnObstacle();
}, 1500);

/**
 * Terminer le jeu en affichant l'élément HTML #gameOver
 * @return {void}
 */
function gameOver() {
    gameRunning = false;
    const gameOverElement = document.getElementById("gameOver");
    if (gameOverElement) {
        gameOverElement.style.display = "block";
    } else {
        console.log("Jeu terminé !");
    }
}

/**
 * Redémarrer le jeu
 * Réinitialise les positions du voiture et des obstacles, puis relance le jeu
 * @return {void}
 */
function restartGame() {
    car.x = canvas.width / 2 - car.w / 2;
    car.y = canvas.height - car.h - 20;
    obstacles = [];
    gameRunning = true;
    const gameOverElement = document.getElementById("gameOver");
    if (gameOverElement) {
        gameOverElement.style.display = "none";
    }
    update();
}

update();