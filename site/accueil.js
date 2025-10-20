const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const createModal = document.getElementById("createModal");
const joinModal = document.getElementById("joinModal");
const closes = document.querySelectorAll(".close");

createBtn.addEventListener("click", () => {
    
    const code = generateRoomCode();
    document.getElementById("roomCodeDisplay").textContent = code;
    createModal.style.display = "flex";
});

joinBtn.addEventListener("click", () => {
    joinModal.style.display = "flex";
});

closes.forEach(c => c.addEventListener("click", () => {
    createModal.style.display = "none";
    joinModal.style.display = "none";
}));


function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

document.getElementById("joinRoom").addEventListener("click", () => {
    const pseudo = document.getElementById("pseudo").value.trim();
    const roomCode = document.getElementById("roomCode").value.trim();
    const error = document.getElementById("joinError");

    if (!pseudo) {
        error.textContent = "Pseudo obligatoire";
        return;
    }
    if (!roomCode) {
        error.textContent = "Code room requis";
        return;
    }

    error.textContent = "";

    const encodedPseudo = encodeURIComponent(pseudo);
    const encodedCode = encodeURIComponent(roomCode);
    
    const gameUrl = `jeu.html?pseudo=${encodedPseudo}&code=${encodedCode}`;
    
    window.location.href = gameUrl;
});