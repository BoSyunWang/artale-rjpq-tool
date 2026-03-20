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
let currentUser = Number(document.querySelector('input[name="p-select"]:checked').value);

document.querySelectorAll('input[name="p-select"]').forEach(radio => {
    radio.addEventListener('change', async (e) => {
        currentUser = Number(e.target.value);
        const roomRef = ref(db, `rooms/${currentRoom}/room_state`);
        try {
            const snapshot = await get(roomRef);
            if (snapshot.exists()) {
                updateUI(snapshot.val());
            }
        } catch (error) {
            console.error("抓取資料失敗:", error);
        }
    });
});

async function loadUserConfigs() {
    const res = await fetch('user_config.json');
    const data = await res.json();
}

window.onload = () => {
    loadUserConfigs();
    const params = new URLSearchParams(window.location.search);
    if (params.has('room')) {
        roomIdInput.value = params.get('room');
        roomPassInput.focus();
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
    startListening();
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

        for (let p = 1; p <= 4; p++) {
            const tileId = `${f}-${p}`;
            const cellWrapper = document.createElement('div');
            cellWrapper.className = 'cell-wrapper';
            cellWrapper.id = `cell-${f}-${p}`;

            const indicatorGrid = document.createElement('div');
            indicatorGrid.className = 'indicator-grid';
            for(let p2 = 1; p2 <= 4; p2++) {
                const light = document.createElement('div');
                light.className = `status-light p${p2}`;
                light.id = `light-${tileId}-p${p2}`;
                indicatorGrid.appendChild(light);
            }

            indicatorGrid.onclick = (e) => {
                e.stopPropagation();
                handleFlagToggle(f, p);
            };

            const btn = document.createElement('button');
            btn.className = 'door-btn';
            btn.id = `b-${f}-${p}`;
            btn.innerText = p;
            btn.onclick = () => handleTileClaim(f, p);
            cellWrapper.appendChild(indicatorGrid);
            cellWrapper.appendChild(btn);
            gridContainer.appendChild(cellWrapper);
        }
    }
}

function startListening() {
    const roomStateRef = ref(db, `rooms/${currentRoom}/room_state`);
    onValue(roomStateRef, (snapshot) => {
        const data = snapshot.val() || {};
        updateUI(data);
    });
}

async function updateUI(roomState) {
    for (let f = 1; f <= 10; f++) {
        for (let p = 1; p <= 4; p++) {
            const data = roomState[`f${f}`]?.[`p${p}`];
            if (!data) continue;

            const tileId = `${f}-${p}`;

            const btn = document.getElementById(`b-${tileId}`);
            if (data.owner && ["0", "1", "2", "3"].includes(data.owner.toString())) {
                btn.style.backgroundColor = `var(--p${Number(data.owner) + 1})`;
                btn.style.color = "#fff";
            } else {
                btn.style.backgroundColor = `var(--input-bg)`;
                btn.style.color = `var(--text-btn-defult)`;
            }

            if (data && data.flags && Array.isArray(data.flags)) {
                data.flags.forEach((isTrue, index) => {
                    const playerNum = index;
                    const light = document.getElementById(`light-${tileId}-p${playerNum + 1}`);
                    if (light) {
                        if (isTrue) {
                            light.classList.add('active');
                        } else {
                            light.classList.remove('active');
                        }
                    }
                });
            } else {
                for (let p = 1; p <= 4; p++) {
                    const light = document.getElementById(`light-${tileId}-p${p}`);
                    if (light) light.classList.remove('active');
                }
            }
        }
    }
}

async function handleTileClaim(floor, platform) {
    const path = `rooms/${currentRoom}/room_state/f${floor}/p${platform}`;
    const ownerRef = ref(db, `${path}/owner`);
    try {
        const snapshot = await get(ownerRef);
        const currentRemoteOwner = snapshot.exists() ? snapshot.val().toString() : "-1";

        const updates = {};
        updates[`rooms/${currentRoom}/metadata/password`] = currentPass;

        if (currentRemoteOwner === currentUser.toString()) {
            updates[`${path}/owner`] = "-1";
        } else {
            updates[`${path}/owner`] = String(currentUser);
        }
        await update(ref(db), updates);
    } catch (e) {
        console.error("Firebase Update Error:", e);
        alert("操作失敗，請檢查密碼或網路連線");
    }
}

async function handleFlagToggle(floor, platform) {
    if (isNaN(currentUser) || currentUser < 0 || currentUser > 3) {
        console.error("無效的使用者編號:", currentUser);
        return;
    }
    const flagRef = ref(db, `rooms/${currentRoom}/room_state/f${floor}/p${platform}/flags`);
    const snapshot = await get(flagRef);
    let currentFlags = snapshot.val() || [false, false, false, false];
    currentFlags[currentUser] = !currentFlags[currentUser];

    const updates = {};
    updates[`rooms/${currentRoom}/metadata/password`] = currentPass;
    updates[`rooms/${currentRoom}/room_state/f${floor}/p${platform}/flags`] = currentFlags;

    try {
        await update(ref(db), updates);
    } catch (e) {
        alert("同步失敗，請確認密碼是否正確");
    }
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