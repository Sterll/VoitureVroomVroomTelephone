const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '../site'))); // Servir les fichiers du site

const rooms = new Map();
const scores = new Map(); // Stockage des scores par salle

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    do {
        code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    } while (rooms.has(code));
    return code;
}

function cleanupRooms() {
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    const now = Date.now();

    for (const [code, room] of rooms.entries()) {
        if (room.players.length === 0 || (now - room.createdAt) > TWO_HOURS) {
            rooms.delete(code);
            scores.delete(code); // Nettoyer aussi les scores
            console.log(`Salle ${code} supprimée (vide ou expirée)`);
        }
    }
}

setInterval(cleanupRooms, 30 * 60 * 1000);

// Routes pour les scores
app.post('/api/score', (req, res) => {
    const { pseudo, roomCode, score, survivalTime, timestamp } = req.body;
    
    if (!pseudo || !roomCode || score === undefined || survivalTime === undefined) {
        return res.status(400).json({ error: 'Données manquantes' });
    }
    
    // Vérifier que la salle existe
    const room = rooms.get(roomCode);
    if (!room) {
        return res.status(404).json({ error: 'Salle introuvable' });
    }
    
    // Initialiser les scores de la salle si nécessaire
    if (!scores.has(roomCode)) {
        scores.set(roomCode, []);
    }
    
    const roomScores = scores.get(roomCode);
    
    // Ajouter le nouveau score
    const newScore = {
        pseudo,
        score,
        survivalTime,
        timestamp,
        date: new Date().toISOString()
    };
    
    roomScores.push(newScore);
    
    // Trier les scores par ordre décroissant
    roomScores.sort((a, b) => b.score - a.score);
    
    // Garder seulement les 10 meilleurs scores
    if (roomScores.length > 10) {
        roomScores.splice(10);
    }
    
    console.log(`Score reçu: ${pseudo} - ${score} points (${survivalTime}s) dans la salle ${roomCode}`);
    
    // Diffuser le nouveau score à tous les joueurs de la salle
    io.to(roomCode).emit('newScore', {
        pseudo,
        score,
        survivalTime,
        leaderboard: roomScores
    });
    
    res.json({ success: true, leaderboard: roomScores });
});

app.get('/api/scores/:roomCode', (req, res) => {
    const { roomCode } = req.params;
    
    const room = rooms.get(roomCode);
    if (!room) {
        return res.status(404).json({ error: 'Salle introuvable' });
    }
    
    const roomScores = scores.get(roomCode) || [];
    res.json({ scores: roomScores });
});

app.get('/api/leaderboard/:roomCode', (req, res) => {
    const { roomCode } = req.params;
    
    const roomScores = scores.get(roomCode) || [];
    res.json({ leaderboard: roomScores });
});

io.on('connection', (socket) => {
    console.log('Un utilisateur s\'est connecté:', socket.id);

    socket.on('createRoom', (data) => {
        const { username } = data;

        if (!username || username.trim() === '') {
            socket.emit('error', { message: 'Le pseudo est requis' });
            return;
        }

        const roomCode = generateRoomCode();
        const room = {
            host: socket.id,
            players: [{
                id: socket.id,
                username: username.trim(),
                isHost: true
            }],
            createdAt: Date.now(),
            gameStarted: false
        };

        rooms.set(roomCode, room);
        socket.join(roomCode);

        console.log(`Salle ${roomCode} créée par ${username} (${socket.id})`);

        socket.emit('roomCreated', {
            roomCode,
            username: username.trim(),
            isHost: true
        });
    });

    socket.on('joinRoom', (data) => {
        const { roomCode, username } = data;

        if (!roomCode || !username || username.trim() === '') {
            socket.emit('error', { message: 'Le code de salle et le pseudo sont requis' });
            return;
        }

        const room = rooms.get(roomCode.toUpperCase());

        if (!room) {
            socket.emit('error', { message: 'Cette salle n\'existe pas' });
            return;
        }

        if (room.gameStarted) {
            socket.emit('error', { message: 'La partie a déjà commencé' });
            return;
        }

        const usernameTaken = room.players.some(p => p.username.toLowerCase() === username.trim().toLowerCase());
        if (usernameTaken) {
            socket.emit('error', { message: 'Ce pseudo est déjà pris dans cette salle' });
            return;
        }

        const player = {
            id: socket.id,
            username: username.trim(),
            isHost: false
        };

        room.players.push(player);
        socket.join(roomCode.toUpperCase());

        console.log(`${username} (${socket.id}) a rejoint la salle ${roomCode}`);

        socket.emit('roomJoined', {
            roomCode: roomCode.toUpperCase(),
            username: username.trim(),
            players: room.players,
            isHost: false
        });

        socket.to(roomCode.toUpperCase()).emit('playerJoined', {
            username: username.trim(),
            playerId: socket.id,
            players: room.players
        });
    });

    socket.on('getPlayers', (data) => {
        const { roomCode } = data;
        const room = rooms.get(roomCode);

        if (!room) {
            socket.emit('error', { message: 'Cette salle n\'existe pas' });
            return;
        }

        socket.emit('playersList', { players: room.players });
    });

    socket.on('startGame', (data) => {
        const { roomCode } = data;
        const room = rooms.get(roomCode);

        if (!room) {
            socket.emit('error', { message: 'Cette salle n\'existe pas' });
            return;
        }

        if (room.host !== socket.id) {
            socket.emit('error', { message: 'Seul l\'hôte peut démarrer la partie' });
            return;
        }

        if (room.players.length < 2) {
            socket.emit('error', { message: 'Il faut au moins 2 joueurs pour commencer' });
            return;
        }

        room.gameStarted = true;

        console.log(`Partie démarrée dans la salle ${roomCode}`);

        io.to(roomCode).emit('gameStarted', {
            players: room.players
        });
    });

    socket.on('leaveRoom', (data) => {
        handlePlayerLeaving(socket, data?.roomCode);
    });

    socket.on('disconnect', () => {
        console.log('Un utilisateur s\'est déconnecté:', socket.id);
        handlePlayerLeaving(socket);
    });

    function handlePlayerLeaving(socket, roomCode = null) {
        let playerRoom = roomCode;
        let room = roomCode ? rooms.get(roomCode) : null;

        if (!room) {
            for (const [code, r] of rooms.entries()) {
                if (r.players.some(p => p.id === socket.id)) {
                    playerRoom = code;
                    room = r;
                    break;
                }
            }
        }

        if (!room) return;

        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex === -1) return;

        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);

        console.log(`${player.username} (${socket.id}) a quitté la salle ${playerRoom}`);

        if (room.players.length === 0) {
            rooms.delete(playerRoom);
            scores.delete(playerRoom); // Nettoyer aussi les scores
            console.log(`Salle ${playerRoom} supprimée (vide)`);
            return;
        }

        if (room.host === socket.id && room.players.length > 0) {
            room.host = room.players[0].id;
            room.players[0].isHost = true;

            io.to(room.host).emit('promotedToHost', {
                roomCode: playerRoom
            });
        }

        io.to(playerRoom).emit('playerLeft', {
            username: player.username,
            playerId: socket.id,
            players: room.players
        });
    }
});

server.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    console.log(`Accédez à http://localhost:${PORT}`);
    console.log('Système de rooms activé ✓');
});