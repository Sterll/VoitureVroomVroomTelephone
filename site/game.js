const params = new URLSearchParams(window.location.search);
const pseudo = params.get('pseudo');
const roomCode = params.get('code');
const isHost = params.get('isHost') === 'true';

if (!pseudo || !roomCode) {
    console.warn("Paramètres de connexion (pseudo ou code) manquants.");
    window.location.href = 'accueil.html';
}

const socket = io();

console.log(`Game.js: Tentative de rejoindre room ${roomCode}`);
socket.emit('joinRoom', {
    roomCode: roomCode,
    username: pseudo + '_screen',
    isController: false
});

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let carImg = new Image();
carImg.src = "voitoure.png";

let obstacleImg = new Image();
obstacleImg.src = "pierro.png";

const players = new Map();

const playerColors = ['#cf3d3d', '#3f72af', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4'];
let colorIndex = 0;

const roadWidth = canvas.width / 1.8;
const laneWidth = roadWidth / 5;
const roadLinesCenter = canvas.width / 2;
const roadEdges = [
    roadLinesCenter - roadWidth / 2,
    roadLinesCenter - laneWidth,
    roadLinesCenter,
    roadLinesCenter + laneWidth,
    roadLinesCenter + roadWidth / 2
];

let obstacles = [];
let gameRunning = true;
let score = 0;

let lineSpacing = 60;
let lineLength = 30;
let lineWidth = 10;
let lineCount = Math.ceil(canvas.height / lineSpacing) + 1;
let roadLines = [];

for (let i = 0; i < lineCount; i++) {
    const yPos = i * lineSpacing - lineLength;

    roadLines.push({
        x: roadEdges[0] - lineWidth / 2,
        y: yPos,
        w: lineWidth,
        h: lineLength * 2,
        isEdge: true
    });
    roadLines.push({
        x: roadEdges[4] - lineWidth / 2,
        y: yPos,
        w: lineWidth,
        h: lineLength * 2,
        isEdge: true
    });
    roadLines.push({
        x: roadEdges[2] - lineWidth / 2,
        y: yPos,
        w: lineWidth,
        h: lineLength,
        isEdge: false
    });
    roadLines.push({
        x: roadEdges[1] - lineWidth / 2,
        y: yPos,
        w: lineWidth,
        h: lineLength / 2,
        isEdge: false
    });
    roadLines.push({
        x: roadEdges[3] - lineWidth / 2,
        y: yPos,
        w: lineWidth,
        h: lineLength / 2,
        isEdge: false
    });
}

class Player {
    constructor(id, username, color) {
        this.id = id;
        this.username = username;
        this.color = color;
        this.x = canvas.width / 2;
        this.y = canvas.height - 150;
        this.w = 80;
        this.h = 120;
        this.speed = 8;
        this.targetX = this.x;
        this.alive = true;
    }

    updateFromGyro(gamma) {
        if (!this.alive) return;

        const maxLeft = roadEdges[0];
        const maxRight = roadEdges[4] - this.w;

        const sensitivity = 1.2;
        const movement = gamma * sensitivity;

        this.targetX = Math.max(maxLeft, Math.min(maxRight, this.x + movement));
    }

    update() {
        if (!this.alive) return;

        const diff = this.targetX - this.x;
        this.x += diff * 0.15;
    }

    draw() {
        if (!this.alive) return;

        ctx.drawImage(carImg, this.x, this.y, this.w, this.h);

        ctx.fillStyle = this.color;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.username, this.x + this.w / 2, this.y - 10);
    }

    checkCollision(obstacle) {
        return this.x < obstacle.x + obstacle.w &&
            this.x + this.w > obstacle.x &&
            this.y < obstacle.y + obstacle.h &&
            this.y + this.h > obstacle.y;
    }
}

carImg.onload = () => {
    const scale = 0.35;
    const w = carImg.width * scale;
    const h = carImg.height * scale;

    players.forEach(player => {
        player.w = w;
        player.h = h;
        player.x = canvas.width / 2 - w / 2;
    });
};

socket.on('roomJoined', (data) => {
    console.log('✅ Game.js: Room rejointe!', data);
    console.log(`   ${data.players.length} joueur(s) présent(s)`);

    data.players.forEach(player => {
        if (player.isController && !players.has(player.id)) {
            const color = playerColors[colorIndex % playerColors.length];
            colorIndex++;

            const newPlayer = new Player(player.id, player.username, color);
            if (carImg.complete) {
                newPlayer.w = carImg.width * 0.35;
                newPlayer.h = carImg.height * 0.35;
            }
            players.set(player.id, newPlayer);
            console.log(`🎮 Joueur manette créé: ${player.username} (${player.id})`);
        }
    });
});

socket.on('playerJoined', (data) => {
    if (data.isController) {
        const color = playerColors[colorIndex % playerColors.length];
        colorIndex++;

        const player = new Player(data.playerId, data.username, color);
        if (carImg.complete) {
            player.w = carImg.width * 0.35;
            player.h = carImg.height * 0.35;
        }
        players.set(data.playerId, player);

        console.log(`Nouveau joueur: ${data.username} (${data.playerId})`);
    }
});

socket.on('gyroscopeData', (data) => {
    console.log('Données reçues:', data);
    const player = players.get(data.playerId);
    if (player) {
        player.updateFromGyro(data.gamma);
    } else {
        console.log('Joueur non trouvé:', data.playerId);
    }
});

socket.on('playerLeft', (data) => {
    players.delete(data.playerId);
    console.log(`Joueur parti: ${data.username}`);
});

function drawRoad() {
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#343a40";
    const roadStartX = roadLinesCenter - roadWidth / 2;
    ctx.fillRect(roadStartX, 0, roadWidth, canvas.height);

    roadLines.forEach(line => {
        ctx.fillStyle = line.isEdge ? "#8d99ae" : "#ffffff";
        ctx.fillRect(line.x, line.y, line.w, line.h);
    });
}

function drawObstacles() {
    obstacles.forEach(o => ctx.drawImage(obstacleImg, o.x, o.y, o.w, o.h));
}

function spawnObstacle() {
    const MAX_OBSTACLES = 2 + Math.floor(score / 500);

    if (obstacles.length >= Math.min(MAX_OBSTACLES, 5)) return;

    const laneMids = [
        (roadEdges[0] + roadEdges[1]) / 2,
        (roadEdges[1] + roadEdges[3]) / 2,
        (roadEdges[3] + roadEdges[4]) / 2
    ];

    const laneIndex = Math.floor(Math.random() * laneMids.length);
    const obstacleX = laneMids[laneIndex] - 45;

    obstacles.push({ x: obstacleX, y: -130, w: 90, h: 130 });
}

function updateScore() {
    score += 1;
    document.getElementById('score').textContent = score;
}

function update() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    roadLines.forEach(line => {
        line.y += 15;
        if (line.y > canvas.height) {
            line.y -= (lineCount * lineSpacing);
        }
    });

    drawRoad();

    const obstacleSpeed = 10 + Math.floor(score / 1000) * 2;
    obstacles.forEach(o => o.y += obstacleSpeed);
    obstacles = obstacles.filter(o => o.y < canvas.height + 100);
    drawObstacles();

    players.forEach(player => {
        player.update();
        player.draw();

        obstacles.forEach(o => {
            if (player.alive && player.checkCollision(o)) {
                player.alive = false;
                console.log(`${player.username} a crashé!`);
            }
        });
    });

    let allDead = true;
    players.forEach(player => {
        if (player.alive) allDead = false;
    });

    if (players.size > 0 && allDead) {
        gameOver();
        return;
    }

    updateScore();

    requestAnimationFrame(update);
}

function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = `Score: ${score}`;
    document.getElementById("gameOver").style.display = "block";
}

function restartGame() {
    players.forEach(player => {
        player.alive = true;
        player.x = canvas.width / 2 - player.w / 2;
        player.targetX = player.x;
    });

    obstacles = [];
    score = 0;
    gameRunning = true;
    document.getElementById("gameOver").style.display = "none";
    update();
}

setInterval(() => {
    if (gameRunning) spawnObstacle();
}, 1500);

console.log(`Jeu démarré - Room: ${roomCode}, Host: ${pseudo}`);
console.log('En attente des joueurs manettes...');
update();
