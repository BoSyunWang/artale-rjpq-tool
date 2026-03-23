# artale-rjpq-tool
🎮 Real-time RJPQ Tracker for Artale (Maple World). A reliable, self-hosted collaborative grid tool designed to replace unstable online alternatives. Built with Vanilla JS &amp; Firebase. | Generated with Google Gemini

## 🚀 核心功能
- **自動導向**：支援 URL 參數 `?room=ROOM_ID` 自動填入房間號碼。
- **房間機制**：若房間不存在則自動初始化，若已存在則需密碼驗證。
- **雙重狀態**：
  - **Claim (主點擊)**：占領該格子，顯示玩家顏色與名稱。
  - **Skip (右上小按鈕)**：標記該格為已跳過（灰色打叉）。
- **即時同步**：所有操作會即時同步給房間內的所有成員。
- **邏輯解耦**：玩家顏色配置獨立於資料庫邏輯。

## 🛠️ 技術規格
- **前端**: HTML5, CSS3, Vanilla JS (ES6+)
- **後端**: Firebase Realtime Database
- **部署**: GitHub Pages

## 📦 檔案結構
- `index.html`: 主介面與進入點。
- `config.js`: Firebase SDK 初始化設定。
- `user_config.json`: 玩家名稱與顏色對應表。
- `css/style.css`: 5x5 網格佈局與狀態樣式。
- `js/firebase-logic.js`: 負責所有資料庫監聽與寫入邏輯。

---

## ⚙️ 建立自己的 Firebase 後端 (Step-by-Step)

1. **建立專案**：
   - 前往 [Firebase Console](https://console.firebase.google.com/)。
   - 點擊「新增專案」，輸入專案名稱（例如 `my-grid-tool`）。

2. **啟動 Realtime Database**：
   - 在左側選單點擊 **Build > Realtime Database**。
   - 點擊「建立資料庫」，選擇資料中心地點（建議選擇亞洲）。
   - 在「安全性規則」先選擇「以測試模式啟動」（稍後再修改規則）。

3. **獲取 API Key**：
   - 點擊左上角齒輪「專案設定」。
   - 在下方「您的應用程式」點擊 `</>` (Web) 圖示。
   - 註冊應用程式名稱，獲取 `firebaseConfig` 內容。
   - 將內容填入專案中的 `config.js` 檔案。

4. **設定安全性規則**：
   - 回到 Realtime Database 的 **Rules** 標籤頁，貼入以下代碼：
   ```json
    {
      "rules": {
        "rooms": {
          ".read":false,
          "$roomId": {
            ".read":true,
            "metadata": {
              ".read": false,
              ".write": "!data.exists() || newData.child('password').val() == data.child('password').val()"
            },
            "room_state": {
              ".read": true,
              ".write": "newData.parent().child('metadata/password').val() == data.parent().child('metadata/password').val()"
            },
            "user_configs": {
              ".read": true,
              ".write": "newData.parent().child('metadata/password').val() == data.parent().child('metadata/password').val()"
            }
          }
        }
      }
    }

---

## 🤖 技術與致謝 (Technical Attribution)

- **核心架構**：由 **Google Gemini** 協助產出，採用模組化設計（Frontend/Backend Separation）。
- **技術棧**：
  - **Firebase Realtime Database**: 提供多人低延遲同步。
  - **GitHub Pages**: 免費且穩定的網頁代管服務。
  - **Vanilla JavaScript**: 確保極致的載入速度與跨瀏覽器相容性。

*Created with the power of AI to empower the Artale player community.*
