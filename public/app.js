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

// Réception de messages
socket.on('message', (data) => {
    displayMessage(data);
});

// Envoi de message
function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('message', {
            text: message,
            timestamp: new Date().toLocaleTimeString()
        });
        messageInput.value = '';
    }
}

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Affichage des messages
function displayMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.innerHTML = `
        <span class="time">${data.timestamp}</span>
        <span class="text">${data.text}</span>
    `;
    messagesElement.appendChild(messageDiv);
    messagesElement.scrollTop = messagesElement.scrollHeight;
}