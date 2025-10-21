// Récupération des paramètres d'URL
const params = new URLSearchParams(window.location.search);
const pseudo = params.get('pseudo');
const roomCode = params.get('code');

// Éléments DOM
const roomDisplay = document.getElementById('roomDisplay');
const leaderboardList = document.getElementById('leaderboardList');

// Affichage des informations de la salle
if (roomCode) {
    roomDisplay.textContent = `Salle: ${roomCode}`;
} else {
    roomDisplay.textContent = 'Aucune salle spécifiée';
}

// Fonction pour charger le classement
async function loadLeaderboard() {
    if (!roomCode) {
        showNoScores('Code de salle manquant');
        return;
    }

    try {
        const response = await fetch(`/api/leaderboard/${roomCode}`);
        
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des scores');
        }

        const data = await response.json();
        displayLeaderboard(data.leaderboard);
        
    } catch (error) {
        console.error('Erreur:', error);
        showNoScores('Erreur lors du chargement des scores');
    }
}

// Fonction pour afficher le classement
function displayLeaderboard(scores) {
    leaderboardList.innerHTML = '';

    if (!scores || scores.length === 0) {
        showNoScores();
        return;
    }

    scores.forEach((scoreData, index) => {
        const rank = index + 1;
        const scoreRow = createScoreRow(scoreData, rank);
        leaderboardList.appendChild(scoreRow);
    });
}

// Fonction pour créer une ligne de score
function createScoreRow(scoreData, rank) {
    const row = document.createElement('div');
    row.className = `score-row rank-${rank <= 3 ? rank : ''}`;
    
    const date = new Date(scoreData.date);
    const formattedDate = date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Ajouter des médailles pour le top 3
    let rankDisplay = rank;
    if (rank === 1) rankDisplay = '🥇';
    else if (rank === 2) rankDisplay = '🥈';
    else if (rank === 3) rankDisplay = '🥉';

    row.innerHTML = `
        <div class="rank">${rankDisplay}</div>
        <div class="player">${escapeHtml(scoreData.pseudo)}</div>
        <div class="score">${scoreData.score.toLocaleString()}</div>
        <div class="time">${scoreData.survivalTime}s</div>
        <div class="date">${formattedDate}</div>
    `;

    return row;
}

// Fonction pour afficher le message "aucun score"
function showNoScores(message = null) {
    leaderboardList.innerHTML = `
        <div class="no-scores">
            <p>${message || 'Aucun score enregistré pour cette salle'}</p>
            <p>Commencez à jouer pour voir les scores !</p>
        </div>
    `;
}

// Fonction pour échapper le HTML (sécurité)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Fonction pour actualiser le classement
function refreshLeaderboard() {
    loadLeaderboard();
}

// Fonction pour aller au jeu
function goToGame() {
    if (pseudo && roomCode) {
        window.location.href = `game.html?pseudo=${encodeURIComponent(pseudo)}&code=${encodeURIComponent(roomCode)}`;
    } else {
        alert('Informations de connexion manquantes');
        goHome();
    }
}

// Fonction pour retourner à l'accueil
function goHome() {
    window.location.href = 'accueil.html';
}

// Écouter les nouveaux scores en temps réel (si vous utilisez Socket.IO)
if (typeof io !== 'undefined' && roomCode) {
    const socket = io();
    
    socket.emit('joinRoom', { roomCode, username: pseudo || 'Spectateur' });
    
    socket.on('newScore', (data) => {
        // Actualiser le classement quand un nouveau score arrive
        if (data.leaderboard) {
            displayLeaderboard(data.leaderboard);
        }
    });
}

// Actualisation automatique toutes les 30 secondes
setInterval(() => {
    loadLeaderboard();
}, 30000);

// Charger le classement au démarrage
loadLeaderboard();