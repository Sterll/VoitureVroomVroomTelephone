// Connexion Socket.io
const socket = io();

// Éléments DOM
const createBtn = document.getElementById("createBtn");
const createModal = document.getElementById("createModal");
const lobbyModal = document.getElementById("lobbyModal");
const closes = document.querySelectorAll(".close");

const hostPseudoInput = document.getElementById("hostPseudo");
const createRoomBtn = document.getElementById("createRoom");
const createError = document.getElementById("createError");

const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const playersList = document.getElementById("playersList");
const startGameBtn = document.getElementById("startGameBtn");
const startInfo = document.getElementById("startInfo");

// Variables
let currentRoomCode = '';
let currentPseudo = '';

// Ouvrir modal création
createBtn.addEventListener("click", () => {
    createModal.style.display = "flex";
});

// Fermer les modals
closes.forEach(c => c.addEventListener("click", () => {
    createModal.style.display = "none";
    // Ne pas fermer le lobby si on est dedans
}));

// Créer une room
createRoomBtn.addEventListener("click", () => {
    const pseudo = hostPseudoInput.value.trim();

    if (!pseudo) {
        createError.textContent = "Pseudo obligatoire";
        return;
    }

    createError.textContent = "";
    currentPseudo = pseudo;

    socket.emit('createRoom', { username: pseudo });
});

// Room créée avec succès
socket.on('roomCreated', (data) => {
    console.log('Room créée:', data);
    currentRoomCode = data.roomCode;

    roomCodeDisplay.textContent = data.roomCode;
    updatePlayersList([{ username: data.username, isHost: true, isController: false }]);

    createModal.style.display = "none";
    lobbyModal.style.display = "flex";
});

// Un joueur rejoint
socket.on('playerJoined', (data) => {
    console.log('Joueur rejoint:', data.username, data.isController ? '(manette)' : '(écran)');
    updatePlayersList(data.players);
    checkCanStart(data.players);
});

// Un joueur quitte
socket.on('playerLeft', (data) => {
    console.log('Joueur parti:', data.username);
    updatePlayersList(data.players);
    checkCanStart(data.players);
});

// Erreur du serveur
socket.on('error', (data) => {
    createError.textContent = data.message;
});

// Partie démarrée
socket.on('gameStarted', (data) => {
    console.log('Partie démarrée!', data);
    // Rediriger vers la page de jeu avec les infos
    const params = new URLSearchParams({
        pseudo: currentPseudo,
        code: currentRoomCode,
        isHost: 'true'
    });
    window.location.href = `game.html?${params.toString()}`;
});

// Mettre à jour la liste des joueurs
function updatePlayersList(players) {
    playersList.innerHTML = '';
    players.forEach(player => {
        const li = document.createElement('li');

        let icon = '👤';
        let type = '';
        if (player.isHost) {
            icon = '👑';
            type = '(Hôte - PC)';
        } else if (player.isController) {
            icon = '🎮';
            type = '(Manette)';
        }

        li.innerHTML = `${icon} ${player.username} <span class="player-type">${type}</span>`;
        playersList.appendChild(li);
    });
}

// Vérifier si on peut démarrer
function checkCanStart(players) {
    const controllers = players.filter(p => p.isController);
    const canStart = controllers.length >= 1;

    startGameBtn.disabled = !canStart;

    if (canStart) {
        startInfo.textContent = `${controllers.length} manette(s) connectée(s) - Prêt!`;
        startInfo.style.color = '#4caf50';
    } else {
        startInfo.textContent = 'En attente d\'au moins 1 manette...';
        startInfo.style.color = '#8d99ae';
    }
}

// Démarrer la partie
startGameBtn.addEventListener('click', () => {
    socket.emit('startGame', { roomCode: currentRoomCode });
});

// Déconnexion propre
window.addEventListener('beforeunload', () => {
    if (currentRoomCode) {
        socket.emit('leaveRoom', { roomCode: currentRoomCode });
    }
});
