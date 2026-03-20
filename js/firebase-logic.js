import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, update } from "firebase/database";
import { firebaseConfig } from "../config.js";

// 初始化
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let currentRoom = "";
let currentUser = "";
let userColors = {};

// 1. 載入 User Config
async function loadUserConfigs() {
    const res = await fetch('user_config.json');
    const data = await res.json();
    userColors = data.player_colors;
}

// 2. URL 參數自動帶入
window.onload = () => {
    loadUserConfigs();
    const params = new URLSearchParams(window.location.search);
    if (params.has('room')) {
        document.getElementById('room-id').value = params.get('room');
    }
};

// 3. 建立或加入房間
document.getElementById('btn-join').onclick = async () => {
    const roomId = document.getElementById('room-id').value;
    const pass = document.getElementById('room-pass').value;
    const name = document.getElementById('user-name').value;

    if (!roomId || !pass || !name) return alert("請填寫所有欄位");

    const roomRef = ref(db, `rooms/${roomId}`);
    const snapshot = await get(roomRef);

    if (snapshot.exists()) {
        // 驗證密碼
        if (snapshot.val().metadata.password !== pass) {
            return alert("密碼錯誤！");
        }
    } else {
        // 初始化新房間
        await set(roomRef, {
            metadata: { password: pass, created_at: Date.now() },
            user_configs: {},
            room_state: {}
        });
    }

    // 登入成功，更新使用者色卡到 Firebase (邏輯解耦)
    const color = userColors[name] || userColors["default"];
    await update(ref(db, `rooms/${roomId}/user_configs/${name}`), { color: color });

    currentRoom = roomId;
    currentUser = name;
    startSync();
};

// 4. 即時同步邏輯
function startSync() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('display-room').innerText = currentRoom;
    document.getElementById('display-user').innerText = currentUser;

    const roomStateRef = ref(db, `rooms/${currentRoom}`);

    // 監聽數據變動
    onValue(roomStateRef, (snapshot) => {
        const data = snapshot.val();
        renderGrid(data.room_state || {}, data.user_configs || {});
        if (data.metadata.last_updated_by) {
            document.getElementById('last-update').innerText = `最後更新: ${data.metadata.last_updated_by}`;
        }
    });
}

// 5. 渲染網格
function renderGrid(states, configs) {
    const container = document.getElementById('grid-container');
    container.innerHTML = "";

    for (let i = 1; i <= 25; i++) {
        const tileId = `tile_${i}`;
        const state = states[tileId] || { status: "empty" };

        const div = document.createElement('div');
        div.className = `tile ${state.status}`;
        div.innerHTML = `<span>${state.user || i}</span><button class="btn-skip">Skip</button>`;

        // 應用玩家顏色
        if (state.status === 'claimed' && configs[state.user]) {
            div.style.backgroundColor = configs[state.user].color;
        }

        // Claim 事件 (點擊格子)
        div.onclick = (e) => {
            if (e.target.className === 'btn-skip') {
                updateState(tileId, 'skipped');
            } else {
                updateState(tileId, 'claimed');
            }
        };

        container.appendChild(div);
    }
}

// 6. 更新狀態到 Firebase
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
