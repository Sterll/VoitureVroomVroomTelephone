const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 8080;

// Servir les fichiers statiques depuis le dossier 'site'
app.use(express.static(path.join(__dirname, '..', 'site')));

const rooms = new Map();


/**
 * Generates a random 6-character room code.
 * @returns {string} A 6-character room code.
 */
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    do {
        // Reset the code
        code = '';
        // Generate a random 6-character code
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    } while (rooms.has(code));
    // Return the generated code if it's not already in use
    return code;
}

function cleanupRooms() {
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    const now = Date.now();

    for (const [code, room] of rooms.entries()) {
        if (room.players.length === 0 || (now - room.createdAt) > TWO_HOURS) {
            rooms.delete(code);
            console.log(`Salle ${code} supprimée (vide ou expirée)`);
        }
    }
}

setInterval(cleanupRooms, 30 * 60 * 1000);

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
                isHost: true,
                isController: false
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
        const { roomCode, username, isController } = data;

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
            isHost: false,
            isController: isController || false
        };

        room.players.push(player);
        socket.join(roomCode.toUpperCase());

        console.log(`${username} (${socket.id}) a rejoint la salle ${roomCode} ${isController ? '(manette)' : '(écran)'}`);

        socket.emit('roomJoined', {
            roomCode: roomCode.toUpperCase(),
            username: username.trim(),
            players: room.players,
            isHost: false
        });

        socket.to(roomCode.toUpperCase()).emit('playerJoined', {
            username: username.trim(),
            playerId: socket.id,
            players: room.players,
            isController: isController || false
        });
    });

    // Recevoir les données gyroscope de la manette et les transmettre au jeu
    socket.on('gyroscope', (data) => {
        const { roomCode, gamma, beta, username } = data;

        if (!roomCode) return;

        const room = rooms.get(roomCode.toUpperCase());
        if (!room) return;

        // Transmettre les données gyroscope à tous les autres dans la room (le PC)
        socket.to(roomCode.toUpperCase()).emit('gyroscopeData', {
            playerId: socket.id,
            username: username,
            gamma: gamma,
            beta: beta
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

        // Permettre de jouer avec au moins 1 manette
        const controllers = room.players.filter(p => p.isController);
        if (controllers.length < 1) {
            socket.emit('error', { message: 'Il faut au moins 1 manette connectée pour commencer' });
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
