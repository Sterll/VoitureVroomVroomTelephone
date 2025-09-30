const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('Un utilisateur s\'est connecté:', socket.id);

    socket.on('message', (data) => {
        console.log('Message reçu:', data);
        io.emit('message', data);
    });

    socket.on('disconnect', () => {
        console.log('Un utilisateur s\'est déconnecté:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    console.log(`Accédez à http://localhost:${PORT}`);
});