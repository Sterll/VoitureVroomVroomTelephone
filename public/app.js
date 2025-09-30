// Connexion au serveur Socket.IO
const socket = io();

const statusElement = document.getElementById('status');
const messagesElement = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

// Événements de connexion
socket.on('connect', () => {
    console.log('Connecté au serveur');
    statusElement.textContent = 'Connecté';
    statusElement.style.color = '#4CAF50';
});

socket.on('disconnect', () => {
    console.log('Déconnecté du serveur');
    statusElement.textContent = 'Déconnecté';
    statusElement.style.color = '#f44336';
});

function move() {

}

