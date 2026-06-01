// === Firebase 設定檔 (由使用者提供) ===
const firebaseConfig = {
  apiKey: "AIzaSyCmjHcNVcBnZP6wGZye1cOuwhbgR028gFs",
  authDomain: "alba-a3861.firebaseapp.com",
  projectId: "alba-a3861",
  storageBucket: "alba-a3861.firebasestorage.app",
  messagingSenderId: "133561460813",
  appId: "1:133561460813:web:200fd7c428716872f3d404",
  measurementId: "G-SBLEQDZBZ4"
};

// 使用相容版 (compat) 語法初始化 Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// === 關卡與遊戲設定 ===
const LEVELS_CONFIG = [
    { id: 1, name: "卡斯提爾家族", answer: "733263935569", uvAnswer: "1981", uvMeaning: "西班牙現行國徽與國旗啟用的年份", x: "45.3%", y: "41.9%" },
    { id: 2, name: "索拉納家族", answer: "摺扇", uvAnswer: "0425", uvMeaning: "佛朗明哥舞后莎拉·巴拉斯的生日", x: "29.6%", y: "70.6%" },
    { id: 3, name: "塞拉家族", answer: "泰德峰高3718", uvAnswer: "1918", uvMeaning: "西班牙最早的國家公園宣告成立的年份", x: "53%", y: "11.2%" },
    { id: 4, name: "托雷家族", answer: "424442", uvAnswer: "2034", uvMeaning: "聖家堂的預計完工年份", x: "68.7%", y: "37.2%" },
    { id: 5, name: "阿曼達家族", answer: "費爾南德斯", uvAnswer: "2008", uvMeaning: "西班牙國家足球隊奪得歐洲盃冠軍的輝煌之年", x: "27.2%", y: "16.7%" },
    { id: 6, name: "奧利瓦家族", answer: "TOMATO", uvAnswer: "1451", uvMeaning: "哥倫布出生的年份", x: "59.4%", y: "69.3%" }
];

// === 結算畫面時間座標設定 (x, y) ===
const RESULTS_POS = {
    1: { x: '33.0%', y: '65.6%' },
    2: { x: '12.8%', y: '88.7%' },
    3: { x: '53.9%', y: '40%' },
    4: { x: '74.3%', y: '61.6%' },
    5: { x: '13%', y: '48%' },
    6: { x: '53.0%', y: '88.8%' },
    total: { x: '83.6%', y: '83%' }
};

// === 應用程式狀態 (State) ===
let teamName = "";
let levelStatus = LEVELS_CONFIG.map(l => ({ ...l, completed: false, timeSec: 0, uvCode: "" }));
let activeLevelId = null;
let timerInterval = null;
let currentTimerSec = 0;
let justCompletedLevel = false;

// === DOM 元素取得 ===
const views = {
    login: document.getElementById('login-view'),
    map: document.getElementById('map-view'),
    results: document.getElementById('results-view'),
    uvSummary: document.getElementById('uv-summary-view'),
    leaderboard: document.getElementById('leaderboard-view')
};
const modal = document.getElementById('level-modal');
const teamNameInput = document.getElementById('team-name-input');
const pinsContainer = document.getElementById('pins-container');
const finishBtn = document.getElementById('finish-btn');

// 紫光密碼相關元素
const step1Controls = document.getElementById('step-1-controls');
const step2Controls = document.getElementById('step-2-controls');
const step3Controls = document.getElementById('step-3-controls');
const uvCodeInput = document.getElementById('uv-code-input');
const saveUvBtn = document.getElementById('save-uv-btn');
const uvFeedback = document.getElementById('uv-feedback');
const uvMeaningText = document.getElementById('uv-meaning-text');
const closeModalFinalBtn = document.getElementById('close-modal-final-btn');

const resultsTeamName = document.getElementById('results-team-name');
const resultsTableBody = document.getElementById('results-table-body');
const resultsTotalTime = document.getElementById('results-total-time');
const goToUvBtn = document.getElementById('go-to-uv-btn');

const uvCodesList = document.getElementById('uv-codes-list');
const goToLeaderboardBtn = document.getElementById('go-to-leaderboard-btn');

const modalTitle = document.getElementById('modal-level-title');
const modalTimer = document.getElementById('modal-timer');
const answerInput = document.getElementById('answer-input');
const answerFeedback = document.getElementById('answer-feedback');
const modalImage = document.getElementById('modal-level-image');
const leaderboardBody = document.getElementById('leaderboard-body');

// === 輔助函式 ===
function switchView(viewName) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[viewName].classList.add('active');
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// === 初始化地圖關卡 ===
function initMap() {
    pinsContainer.innerHTML = '';
    let allCompleted = true;
    let completedLevels = [];

    levelStatus.forEach(level => {
        const pin = document.createElement('div');
        pin.className = `pin ${level.completed ? 'completed' : ''}`;
        pin.style.left = level.x;
        pin.style.top = level.y;
        
        if (!level.completed) {
            allCompleted = false;
            pin.addEventListener('click', () => openLevel(level.id));
        } else {
            completedLevels.push(level);
        }
        pinsContainer.appendChild(pin);
    });
    
    // 更新彩色地圖遮罩 (Spotlight 效果)
    const colorLayer = document.getElementById('map-layer-color');
    if (completedLevels.length > 0) {
        // 為每個過關的點產生一個圓形漸層透明遮罩，透出底下的彩色圖
        const maskGradients = completedLevels.map(l => 
            `radial-gradient(circle 150px at ${l.x} ${l.y}, black 40%, rgba(0,0,0,0.5) 70%, transparent 100%)`
        ).join(', ');
        colorLayer.style.webkitMaskImage = maskGradients;
        colorLayer.style.maskImage = maskGradients;
    } else {
        // 預設全透明遮罩（完全隱藏彩色圖層）
        colorLayer.style.webkitMaskImage = 'radial-gradient(transparent, transparent)';
        colorLayer.style.maskImage = 'radial-gradient(transparent, transparent)';
    }

    if (allCompleted) {
        finishBtn.classList.remove('hidden');
    }
}

// === 事件監聽與流程控制 ===
document.getElementById('start-btn').addEventListener('click', () => {
    const name = teamNameInput.value.trim();
    if (!name) {
        alert("請輸入冒險者/小隊名稱！");
        return;
    }
    teamName = name;
    
    // 嘗試進入全螢幕模式以增加沉浸感
    try {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        }
    } catch(err) {
        console.log("全螢幕請求失敗:", err);
    }

    initMap();
    switchView('map');
});

function openLevel(id) {
    activeLevelId = id;
    const level = levelStatus.find(l => l.id === id);
    
    modalTitle.innerText = level.name;
    modalImage.src = `assets/level-${id}.png`;
    
    currentTimerSec = level.timeSec;
    modalTimer.innerText = formatTime(currentTimerSec);
    
    // 重置為第一階段 (解謎)
    step1Controls.style.display = 'flex';
    step2Controls.style.display = 'none';
    step3Controls.style.display = 'none';
    answerInput.value = '';
    answerFeedback.innerText = '';
    answerFeedback.className = 'feedback';
    uvCodeInput.value = '';
    uvFeedback.innerText = '';
    uvFeedback.className = 'feedback';
    
    modal.classList.remove('hidden');
    
    // 開始計時
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        currentTimerSec++;
        modalTimer.innerText = formatTime(currentTimerSec);
    }, 1000);
}

function closeLevel() {
    clearInterval(timerInterval);
    if (activeLevelId) {
        const level = levelStatus.find(l => l.id === activeLevelId);
        if (!level.completed) {
            level.timeSec = currentTimerSec;
        }
    }
    modal.classList.add('hidden');
    activeLevelId = null;
    initMap(); // 重新整理地圖狀態
    
    // 如果是剛過關關閉視窗，觸發慶祝特效
    if (justCompletedLevel) {
        playSuccessSound();
        fireConfetti();
        justCompletedLevel = false;
    }
}

document.getElementById('close-modal-btn').addEventListener('click', closeLevel);
closeModalFinalBtn.addEventListener('click', closeLevel);

// 驗證主密碼
document.getElementById('submit-answer-btn').addEventListener('click', () => {
    const ans = answerInput.value.trim().toLowerCase();
    const level = levelStatus.find(l => l.id === activeLevelId);
    
    if (ans === level.answer.toLowerCase()) {
        answerFeedback.className = 'feedback success';
        answerFeedback.innerText = '✅ 密碼正確！';
        
        // 切換到第二階段
        setTimeout(() => {
            step1Controls.style.display = 'none';
            step2Controls.style.display = 'flex';
        }, 800);
    } else {
        answerFeedback.className = 'feedback error';
        answerFeedback.innerText = '❌ 密碼錯誤，請再試一次。';
    }
});

// 紀錄紫光密碼並顯示故事
saveUvBtn.addEventListener('click', () => {
    const uvCode = uvCodeInput.value.trim();
    const level = levelStatus.find(l => l.id === activeLevelId);
    
    if (uvCode === level.uvAnswer) {
        level.uvCode = uvCode;
        level.completed = true;
        level.timeSec = currentTimerSec;
        // 標記剛過關，準備在關閉視窗時播放特效
        justCompletedLevel = true;
        
        // 切換到第三階段：顯示歷史故事
        step2Controls.style.display = 'none';
        step3Controls.style.display = 'flex';
        uvMeaningText.innerHTML = `<span style="font-size: 1.8rem; font-family: monospace; color: var(--wax-red);">${uvCode}</span><br><br>${level.uvMeaning}`;
        
    } else {
        uvFeedback.className = 'feedback error';
        uvFeedback.innerText = '❌ 紫光數字不正確，請再確認。';
    }
});

finishBtn.addEventListener('click', () => {
    const totalTime = levelStatus.reduce((acc, l) => acc + l.timeSec, 0);
    const container = document.getElementById('results-container');
    container.innerHTML = ''; // 清空先前的結算
    
    // 產生 6 關的結算紅框
    levelStatus.forEach(l => {
        const div = document.createElement('div');
        div.className = 'result-time-box';
        div.style.left = RESULTS_POS[l.id].x;
        div.style.top = RESULTS_POS[l.id].y;
        div.innerText = formatTime(l.timeSec);
        container.appendChild(div);
    });
    
    // 產生總時間紅框
    const totalDiv = document.createElement('div');
    totalDiv.className = 'result-time-box';
    totalDiv.style.left = RESULTS_POS.total.x;
    totalDiv.style.top = RESULTS_POS.total.y;
    totalDiv.style.fontSize = '4.5rem'; // 從6rem縮小到75%
    totalDiv.innerHTML = `<span style="font-size: 0.5em;">總計: </span>${formatTime(totalTime)}`;
    container.appendChild(totalDiv);
    
    switchView('results');
});

goToUvBtn.addEventListener('click', async () => {
    const totalTime = levelStatus.reduce((acc, l) => acc + l.timeSec, 0);
    goToUvBtn.innerText = "紀錄上傳中...";
    goToUvBtn.disabled = true;
    
    try {
        await db.collection("leaderboard").add({
            teamName: teamName,
            totalTimeSec: totalTime,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        let codesHtml = `<div style="display: flex; flex-direction: column; gap: 3px;">`;
        levelStatus.forEach(l => {
            codesHtml += `
                <div style="background: rgba(255,255,255,0.8); padding: 4px 10px; border-radius: 8px; border-left: 5px solid var(--wax-red); display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: bold; color: var(--sea-blue); font-size: 1.38rem; white-space: nowrap;">${l.name}</span>
                    <span style="color: var(--dark-text); font-size: 1.26rem; flex-grow: 1; margin: 0 10px; line-height: 1.2;">${l.uvMeaning}</span>
                    <span style="font-family: monospace; font-weight: bold; font-size: 1.61rem; color: var(--wax-red);">${l.uvCode}</span>
                </div>
            `;
        });
        codesHtml += `</div>`;
        uvCodesList.innerHTML = codesHtml;
        
        switchView('uvSummary');
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("上傳失敗，請檢查網路連線。");
        goToUvBtn.innerText = "重新上傳";
        goToUvBtn.disabled = false;
    }
});

/* 測試通道已移除，準備正式上線 */

goToLeaderboardBtn.addEventListener('click', () => {
    switchView('leaderboard');
    loadLeaderboard();
});

// 排行榜：重新開始下一組
document.getElementById('restart-btn').addEventListener('click', () => {
    if(confirm("確定要結束這組的冒險並回到首頁嗎？")) {
        teamName = "";
        levelStatus.forEach(l => {
            l.completed = false;
            l.timeSec = 0;
            l.uvCode = "";
        });
        teamNameInput.value = "";
        switchView('login');
    }
});

// 排行榜：返回結算頁面
document.getElementById('back-to-results-btn').addEventListener('click', () => {
    switchView('results');
});

// 排行榜：刪除紀錄
document.getElementById('delete-records-btn').addEventListener('click', async () => {
    const pwd = prompt("請輸入刪除紀錄密碼：");
    if(pwd === "5168") {
        try {
            const snapshot = await db.collection("leaderboard").get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            alert("排行榜紀錄已全數刪除！");
            loadLeaderboard();
        } catch (e) {
            alert("刪除失敗：" + e.message);
        }
    } else if (pwd !== null) {
        alert("密碼錯誤！");
    }
});

// === 座標對位小工具 ===
// 點擊總時數框或排行榜區塊時，顯示座標幫助調整
document.querySelector('.result-time-box').addEventListener('click', (e) => {
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
    const yPercent = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
    alert(`總時數框點擊座標：\nleft: ${xPercent}%\ntop: ${yPercent}%`);
});

document.querySelector('.leaderboard-container').addEventListener('click', (e) => {
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
    const yPercent = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
    alert(`排行榜點擊座標：\nleft: ${xPercent}%\ntop: ${yPercent}%`);
});

document.getElementById('uv-summary-view').addEventListener('click', (e) => {
    if(e.target.closest('.primary-btn')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
    const yPercent = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
    alert(`紫光畫面點擊座標：\nleft: ${xPercent}%\ntop: ${yPercent}%`);
});

// 載入榮譽英雄榜
async function loadLeaderboard() {
    leaderboardBody.innerHTML = '<tr><td colspan="3">載入中...</td></tr>';
    try {
        const snapshot = await db.collection("leaderboard")
            .orderBy("totalTimeSec", "asc")
            .limit(50)
            .get();
        
        leaderboardBody.innerHTML = '';
        if (snapshot.empty) {
            leaderboardBody.innerHTML = '<tr><td colspan="3">尚無紀錄</td></tr>';
            return;
        }
        
        let rank = 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="width: 20%; padding: 15px; text-align: center; font-size: 1.5rem; border-bottom: 1px dashed rgba(212, 175, 55, 0.3); color: black; font-weight: bold;">${rank}</td>
                <td style="width: 50%; padding: 15px; text-align: center; font-size: 1.5rem; border-bottom: 1px dashed rgba(212, 175, 55, 0.3); color: black; font-weight: bold;">${data.teamName}</td>
                <td style="width: 30%; padding: 15px; text-align: center; font-size: 1.5rem; border-bottom: 1px dashed rgba(212, 175, 55, 0.3); color: black; font-weight: bold;">${formatTime(data.totalTimeSec)}</td>
            `;
            leaderboardBody.appendChild(tr);
            rank++;
        });
    } catch (e) {
        console.error("Error loading leaderboard: ", e);
        leaderboardBody.innerHTML = '<tr><td colspan="3">載入失敗</td></tr>';
    }
}

// === 聲光慶祝特效 ===
function playSuccessSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        const audioCtx = new AudioContext();
        const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        
        frequencies.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1 + (i * 0.1));
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5 + (i * 0.1));
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            osc.start(audioCtx.currentTime + (i * 0.1));
            osc.stop(audioCtx.currentTime + 2);
        });
    } catch(e) { console.log('音效播放失敗', e); }
}

function fireConfetti() {
    if (typeof confetti !== 'function') return;
    const duration = 3000;
    const end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#d4af37', '#9b2226', '#1b263b'],
            zIndex: 9999
        });
        confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#d4af37', '#9b2226', '#1b263b'],
            zIndex: 9999
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}
