// Connexion Socket.io
const socket = io();

// Éléments DOM
const joinScreen = document.getElementById('joinScreen');
const waitingScreen = document.getElementById('waitingScreen');
const controllerScreen = document.getElementById('controllerScreen');
const permissionModal = document.getElementById('permissionModal');

const pseudoInput = document.getElementById('pseudo');
const roomCodeInput = document.getElementById('roomCode');
const joinBtn = document.getElementById('joinBtn');
const errorEl = document.getElementById('error');

const displayRoomCode = document.getElementById('displayRoomCode');
const displayPseudo = document.getElementById('displayPseudo');
const playersList = document.getElementById('playersList');

const controllerPseudo = document.getElementById('controllerPseudo');
const carIndicator = document.getElementById('carIndicator');
const gammaValue = document.getElementById('gammaValue');
const requestPermissionBtn = document.getElementById('requestPermissionBtn');

// Variables
let currentRoomCode = '';
let currentPseudo = '';
let gyroscopeActive = false;

// Auto uppercase pour le code room
roomCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// Rejoindre une room
joinBtn.addEventListener('click', () => {
    const pseudo = pseudoInput.value.trim();
    const roomCode = roomCodeInput.value.trim().toUpperCase();

    if (!pseudo) {
        errorEl.textContent = 'Pseudo obligatoire';
        return;
    }
    if (!roomCode) {
        errorEl.textContent = 'Code room requis';
        return;
    }

    errorEl.textContent = '';
    currentPseudo = pseudo;
    currentRoomCode = roomCode;

    // Rejoindre comme manette (isController: true)
    socket.emit('joinRoom', {
        roomCode: roomCode,
        username: pseudo,
        isController: true
    });
});

// Réponses du serveur
socket.on('roomJoined', (data) => {
    console.log('Room rejointe:', data);
    displayRoomCode.textContent = data.roomCode;
    displayPseudo.textContent = data.username;
    updatePlayersList(data.players);

    joinScreen.classList.add('hidden');
    waitingScreen.classList.remove('hidden');
});

socket.on('playerJoined', (data) => {
    console.log('Joueur rejoint:', data.username);
    updatePlayersList(data.players);
});

socket.on('playerLeft', (data) => {
    console.log('Joueur parti:', data.username);
    updatePlayersList(data.players);
});

socket.on('error', (data) => {
    errorEl.textContent = data.message;
});

socket.on('gameStarted', (data) => {
    console.log('Partie démarrée!', data);
    waitingScreen.classList.add('hidden');
    controllerScreen.classList.remove('hidden');
    controllerPseudo.textContent = currentPseudo;

    // Demander la permission pour le gyroscope
    requestGyroscopePermission();
});

// Mettre à jour la liste des joueurs
function updatePlayersList(players) {
    playersList.innerHTML = '';
    players.forEach(player => {
        const li = document.createElement('li');
        li.className = player.isHost ? 'host' : (player.isController ? 'controller' : '');

        let icon = '👤';
        if (player.isHost) icon = '👑';
        else if (player.isController) icon = '🎮';

        li.innerHTML = `<span>${icon}</span> ${player.username}`;
        playersList.appendChild(li);
    });
}

// Gestion du gyroscope
function requestGyroscopePermission() {
    // iOS 13+ nécessite une permission explicite
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+
        permissionModal.classList.remove('hidden');

        requestPermissionBtn.addEventListener('click', async () => {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    permissionModal.classList.add('hidden');
                    startGyroscope();
                } else {
                    alert('Permission refusée. La manette ne fonctionnera pas sans le gyroscope.');
                }
            } catch (error) {
                console.error('Erreur permission gyroscope:', error);
                alert('Erreur lors de la demande de permission.');
            }
        });
    } else {
        // Android et autres navigateurs
        startGyroscope();
    }
}

function startGyroscope() {
    gyroscopeActive = true;

    window.addEventListener('deviceorientation', handleOrientation);
    console.log('Gyroscope activé');
}

function handleOrientation(event) {
    if (!gyroscopeActive) return;

    const gamma = event.gamma || 0; // Inclinaison gauche/droite (-90 à 90)
    const beta = event.beta || 0;   // Inclinaison avant/arrière (-180 à 180)

    // Mettre à jour l'affichage
    gammaValue.textContent = Math.round(gamma);

    // Déplacer l'indicateur de voiture (visuel)
    const maxOffset = 40; // % de déplacement max
    const offset = Math.max(-maxOffset, Math.min(maxOffset, gamma));
    const position = 50 + offset; // Centre à 50%
    carIndicator.style.left = `${position}%`;

    // Envoyer les données au serveur
    socket.emit('gyroscope', {
        roomCode: currentRoomCode,
        username: currentPseudo,
        gamma: gamma,
        beta: beta
    });
}

// Empêcher le scroll/zoom sur mobile
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// Déconnexion propre
window.addEventListener('beforeunload', () => {
    if (currentRoomCode) {
        socket.emit('leaveRoom', { roomCode: currentRoomCode });
    }
});
