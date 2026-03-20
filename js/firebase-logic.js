import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, update } from "firebase/database";
import { firebaseConfig } from "../config.js";

const roomIdInput = document.getElementById('room-id');
const roomPassInput = document.getElementById('room-pass');
const enterBtn = document.getElementById('btn-enter');
const passHint = document.getElementById('pass-hint');
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const gridContainer = document.getElementById('grid-screen');
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let currentRoom = "";
let currentPass = "";
let currentUser = "";

async function loadUserConfigs() {
    const res = await fetch('user_config.json');
    const data = await res.json();
    // User Name
}

window.onload = () => {
    loadUserConfigs();
    const params = new URLSearchParams(window.location.search);
    if (params.has('room')) {
        roomIdInput.value = params.get('room');
    }
    validateInputs();
};

document.getElementById('btn-enter').onclick = async () => {
    let finalRoom = roomIdInput.value;
    let finalPass = roomPassInput.value;

    if (finalRoom === "" && finalPass === "") {
        finalRoom = Math.floor(100000 + Math.random() * 900000).toString();
        finalPass = Math.floor(1000 + Math.random() * 9000).toString();
    }

    currentRoom = finalRoom;
    currentPass = finalPass

    const roomMetadataRef = ref(db, `rooms/${currentRoom}/metadata`);
    const roomRef = ref(db, `rooms/${currentRoom}`);
    try {
        const snapshot = await get(roomRef);
        if (!snapshot.exists()) {
        await set(ref(db, `rooms/${currentRoom}/metadata`), {
            password: currentPass,
            created_at: Date.now()
        });
        } else {
            await update(roomMetadataRef, { password: currentPass });
        }
        window.history.pushState({}, '', `?room=${currentRoom}`);
        startApp(currentRoom, currentPass);
    } catch(error) {
        console.error("Firebase Auth Error:", error);
        alert("進入失敗：密碼錯誤或無法建立房間。");
    }
};

function startApp(room, pass) {
    loginScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    document.getElementById('room-display').innerText = room;
    document.getElementById('room-display-pass').innerText = pass;

    initGrid();
    //startListening();
}

function initGrid() {
    gridContainer.innerHTML = '';

    const title = document.createElement('div');
    title.innerText = "層";
    title.className = "title_column";
    gridContainer.appendChild(title);

    for(let col_num = 1; col_num <= 4; col_num++) {
        const title_col = document.createElement('div');
        title_col.className = 'title_column';
        title_col.innerText = col_num;
        gridContainer.appendChild(title_col);
    }

    for (let f = 10; f >= 1; f--) {
        const label = document.createElement('div');
        label.className = 'floor-label';
        label.innerText = f;
        gridContainer.appendChild(label);

        for (let d = 1; d <= 4; d++) {
            const cellWrapper = document.createElement('div');
            cellWrapper.className = 'cell-wrapper';
            cellWrapper.id = `cell-${f}-${d}`;

            const indicatorGrid = document.createElement('div');
            indicatorGrid.className = 'indicator-grid';
            for(let p = 1; p <= 4; p++) {
                const light = document.createElement('div');
                light.className = `status-light light-p${p}`;
                light.id = `light-${f}-${d}-p${p}`;
                indicatorGrid.appendChild(light);
            }

            indicatorGrid.onclick = (e) => {
                e.stopPropagation();
                //handleFlagToggle(f, d);
            };

            const btn = document.createElement('button');
            btn.className = 'door-btn';
            btn.id = `b-${f}-${d}`;
            btn.innerText = d;
            //btn.onclick = () => handleToggle(f, d);
            cellWrapper.appendChild(indicatorGrid);
            cellWrapper.appendChild(btn);
            gridContainer.appendChild(cellWrapper);
        }
    }
}

async function updateState(tileId, status) {
    const updates = {};
    updates[`rooms/${currentRoom}/room_state/${tileId}`] = {
        status: status,
        user: currentUser,
        timestamp: Date.now()
    };
    updates[`rooms/${currentRoom}/metadata/last_updated_by`] = currentUser;

    await update(ref(db), updates);
}

function validateInputs() {
    const rLen = roomIdInput.value.length;
    const pLen = roomPassInput.value.length;

    const isEmptyMode = (rLen === 0 && pLen === 0);
    const isFullMode = (rLen === 6 && pLen === 4);

    enterBtn.classList.remove('state-create', 'state-join');

    if (isEmptyMode) {
        enterBtn.disabled = false;
        enterBtn.innerText = "自動生成房間";
        enterBtn.style.background = "linear-gradient(135deg, #4caf50, #388e3c)";
        passHint.innerText = "✨ 將自動產生 6 位房號與 4 位密碼";
        enterBtn.classList.add('state-create');
    } else if (isFullMode) {
        enterBtn.disabled = false;
        enterBtn.innerText = "驗證並進入";
        enterBtn.style.background = "linear-gradient(135deg, #448aff, #2979ff)";
        passHint.innerText = "🔒 格式正確，準備連線";
        enterBtn.classList.add('state-join');
    } else {
        enterBtn.disabled = true;
        enterBtn.innerText = "格式不符";
        enterBtn.style.background = "#333";
        passHint.innerText = "需為「全留空」或「6位房號+4位密碼」";
    }
}

[roomIdInput, roomPassInput].forEach(el => {
    el.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        validateInputs();
    });
});