const socket = io();

const joinScreen = document.getElementById('joinScreen');
const waitingScreen = document.getElementById('waitingScreen');
const controllerScreen = document.getElementById('controllerScreen');

const pseudoInput = document.getElementById('pseudo');
const roomCodeInput = document.getElementById('roomCode');
const joinBtn = document.getElementById('joinBtn');
const errorEl = document.getElementById('error');

const displayRoomCode = document.getElementById('displayRoomCode');
const displayPseudo = document.getElementById('displayPseudo');
const playersList = document.getElementById('playersList');

const controllerPseudo = document.getElementById('controllerPseudo');
const directionValue = document.getElementById('directionValue');
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const btnUp = document.getElementById('btnUp');
const btnDown = document.getElementById('btnDown');

let currentRoomCode = '';
let currentPseudo = '';
let currentDirection = 0;

roomCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

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
    console.log(`Tentative de rejoindre: Room=${roomCode}, Pseudo=${pseudo}`);

    socket.emit('joinRoom', {
        roomCode: roomCode,
        username: pseudo,
        isController: true
    });
});

socket.on('roomJoined', (data) => {
    console.log('Room rejointe:', data);
    currentRoomCode = data.roomCode;
    currentPseudo = data.username;

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

    setupControls();
});

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

function setupControls() {
    console.log('Contrôles initialisés');
    console.log('Room:', currentRoomCode, 'Pseudo:', currentPseudo);

    btnLeft.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleDirection(-1);
    });
    btnLeft.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleDirection(0);
    });
    btnLeft.addEventListener('mousedown', () => handleDirection(-1));
    btnLeft.addEventListener('mouseup', () => handleDirection(0));

    btnRight.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleDirection(1);
    });
    btnRight.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleDirection(0);
    });
    btnRight.addEventListener('mousedown', () => handleDirection(1));
    btnRight.addEventListener('mouseup', () => handleDirection(0));

    [btnLeft, btnRight, btnUp, btnDown].forEach(btn => {
        btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });

    setInterval(sendControlData, 50);
}

function handleDirection(direction) {
    currentDirection = direction;
    console.log('Direction:', direction);

    if (direction === -1) {
        directionValue.textContent = '← Gauche';
        btnLeft.classList.add('active');
        btnRight.classList.remove('active');
    } else if (direction === 1) {
        directionValue.textContent = 'Droite →';
        btnRight.classList.add('active');
        btnLeft.classList.remove('active');
    } else {
        directionValue.textContent = 'Centre';
        btnLeft.classList.remove('active');
        btnRight.classList.remove('active');
    }
}

let sendCount = 0;
function sendControlData() {
    if (!currentRoomCode) return;

    const gamma = currentDirection * 50;

    socket.emit('gyroscope', {
        roomCode: currentRoomCode,
        username: currentPseudo,
        gamma: gamma,
        beta: 0
    });

    sendCount++;
    if (sendCount % 20 === 0) {
        console.log(`Envoi #${sendCount}: gamma=${gamma}° (direction=${currentDirection})`);
    }
}

document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

window.addEventListener('beforeunload', () => {
    if (currentRoomCode) {
        socket.emit('leaveRoom', { roomCode: currentRoomCode });
    }
});
