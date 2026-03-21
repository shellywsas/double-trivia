window.qDB = window.qDB || {};

// --- מערכת פיירבייס ---
const firebaseConfig = {
    apiKey: "AIzaSyD-YOSA2nOwB_knR7bPLLkZ93teAsspU_0",
    authDomain: "doubletriviaonline.firebaseapp.com",
    projectId: "doubletriviaonline",
    storageBucket: "doubletriviaonline.firebasestorage.app",
    messagingSenderId: "481045312726",
    appId: "1:481045312726:web:af9af75ff5d5d96534c577"
};
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();

// --- מעקב ואנליטיקה ---
if (!localStorage.getItem('trivia_user_id')) {
    localStorage.setItem('trivia_user_id', 'user_' + Math.random().toString(36).substr(2, 9));
    localStorage.setItem('trivia_visit_count', 0);
    localStorage.setItem('trivia_games_finished', 0);
}
let startTime = Date.now(); 

function logEventToSheets(eventType, themeName, timeSpent, rating, msg) {
    let savedName = localStorage.getItem('trivia_player_name');
    let baseId = localStorage.getItem('trivia_user_id');
    let finalId = savedName ? `${savedName} (${baseId})` : baseId;

    const googleSheetUrl = "https://script.google.com/macros/s/AKfycbwfV4K48iRLCJ7B25kmuMmMZbnBw4Z5w1KBizf9_3rd7kMmD3PBuFMkeXlHg6--xT0H/exec";
    fetch(googleSheetUrl, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            "תאריך ושעה": new Date().toLocaleString('he-IL'), "מזהה": finalId,
            "מספר כניסות": localStorage.getItem('trivia_visit_count'), "סוג אירוע": eventType,
            "נושא": themeName || "-", "זמן משחק (דקות)": timeSpent || "-",
            "דירוג": rating || "-", "הודעת משוב": msg || "-"
        })
    }).catch(e => console.log("Log failed"));
}

window.onload = () => {
    let savedName = localStorage.getItem('trivia_player_name');
    if (savedName) document.getElementById('player-name-input').value = savedName;

    if (!sessionStorage.getItem('trivia_active_session')) {
        let visits = parseInt(localStorage.getItem('trivia_visit_count')) + 1;
        localStorage.setItem('trivia_visit_count', visits);
        sessionStorage.setItem('trivia_active_session', 'true');
        logEventToSheets("כניסה לאתר 🌐", "-", "-", "-", window.innerWidth < 768 ? "מכשיר: נייד" : "מכשיר: מחשב");
    }

    if (typeof gameConfig !== 'undefined') {
        loadAllQuestionFiles();
        buildThemeButtons();
    } else { alert("שגיאה: קובץ ההגדרות לא נטען."); }

    let savedDevice = sessionStorage.getItem('doubleTriviaDevice');
    if (savedDevice) {
        document.getElementById('device-selection-group').style.display = 'none';
        document.getElementById('network-selection-group').style.display = 'block';
        selectedDevice = savedDevice;
    }

    if (localStorage.getItem('savedTriviaGame')) {
        document.getElementById('resume-btn').style.display = 'inline-block';
    }
};

window.addEventListener("popstate", (e) => {
    if (document.getElementById('game-container').style.display === 'flex') {
        const confirmExit = confirm("בטוחים שאתם רוצים לצאת חזרה להגדרות?");
        if (!confirmExit) { history.pushState(null, null, window.location.href); } 
        else { goBackToSettings(); }
    }
});

// --- הגדרות משחק ותצוגה ---
let selectedDevice = null, selectedTheme = 'gen', selectedPairs = 20, gameMode = 4;
let activeTeamId = 1, cards = [], flippedCards = [], activePair = [];
let timerInterval, timeLeft = 15, currentCols = 8, matchedPairsCount = 0;
let teams = [], currentQuestionObj = null, lockBoard = false;
let availableQuestions = [];
let botTriviaProb = 0.85, botMemoryProb = 0.5;  
let currentThemeIcons = [];
let manualClosePending = false; 

// --- משתני רשת ---
let isOnlineNetwork = false;
let myPlayerId = null;
let myTeamId = null;
let isHost = false;
let currentRoomId = null;

const fallbackIcons = ['🌍','🚀','💡','🎸','⏰','💎','🎲','🧩','🔬','🧬','🔭','💻','⚡','🪐','🧪','🔋','📡','🦠','🧲','🗽','🗼','🗻','🐫','🗺️','🏝️','⛩️','🏰','🗿','🏔️','🏜️','🌋','🎬','🎨','🎤','🎭','⚽','🍔','🏆','🎮','📸','🎧','🚗','🚲','⚓','🎈','🎯','🪄','🧸','📚','🔥'];

function buildThemeButtons() {
    const container = document.getElementById('themes-container'); 
    container.innerHTML = '';
    gameConfig.categories.forEach((cat, index) => {
        let btn = document.createElement('button');
        btn.className = 'option-btn theme-option' + (index === 0 ? ' selected' : '');
        btn.innerText = cat.title; 
        btn.onclick = (e) => selectMainTheme(cat, e.target);
        container.appendChild(btn); 
        if (index === 0) selectMainTheme(cat, btn);
    });
}

function loadAllQuestionFiles() {
    gameConfig.categories.forEach(cat => {
        if (cat.file) { let s = document.createElement('script'); s.src = cat.file; document.head.appendChild(s); }
        if (cat.subCategories) { cat.subCategories.forEach(sub => { if (sub.file) { let s = document.createElement('script'); s.src = sub.file; document.head.appendChild(s); } }); }
    });
}

function selectMainTheme(category, btnElement) { 
    document.querySelectorAll('.theme-option').forEach(b => b.classList.remove('selected')); 
    if(btnElement) btnElement.classList.add('selected'); 
    currentThemeIcons = category.icons ? category.icons : fallbackIcons;

    const subGroup = document.getElementById('sub-themes-group');
    const subContainer = document.getElementById('sub-themes-container');
    
    if (category.subCategories && category.subCategories.length > 0) {
        subGroup.style.display = 'block'; 
        subContainer.innerHTML = '';
        category.subCategories.forEach((sub, index) => {
            let btn = document.createElement('button');
            btn.className = 'option-btn sub-option' + (index === 0 ? ' selected' : '');
            btn.innerText = sub.title; 
            btn.onclick = (e) => selectSubTheme(sub, e.target);
            subContainer.appendChild(btn); 
            if(index === 0) selectSubTheme(sub, btn);
        });
    } else {
        subGroup.style.display = 'none'; 
        selectedTheme = category.id;
    }
}

function selectSubTheme(sub, btnElement) { 
    document.querySelectorAll('.sub-option').forEach(b => b.classList.remove('selected')); 
    if(btnElement) btnElement.classList.add('selected'); 
    selectedTheme = sub.id; 
}

// --- סאונד ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx; 
let isMuted = false;

function initAudio() { 
    if(!audioCtx && !isMuted) audioCtx = new AudioContext(); 
}

function toggleMute() { 
    isMuted = !isMuted; 
    const btn = document.getElementById('mute-btn'); 
    if(isMuted) { 
        btn.innerText = "🔇 מושתק"; 
        btn.classList.add('muted'); 
    } else { 
        btn.innerText = "🔊 סאונד פועל"; 
        btn.classList.remove('muted'); 
        initAudio(); 
    } 
}

function playTone(freq, type, dur, start, vol=0.1) { 
    if(isMuted || !audioCtx) return; 
    try{ 
        const osc = audioCtx.createOscillator(), gain = audioCtx.createGain(); 
        osc.type = type; 
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start); 
        osc.connect(gain); 
        gain.connect(audioCtx.destination); 
        gain.gain.setValueAtTime(vol, audioCtx.currentTime + start); 
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + start + dur); 
        osc.start(audioCtx.currentTime + start); 
        osc.stop(audioCtx.currentTime + start + dur); 
    } catch(e){} 
}

function playHappySound() { initAudio(); playTone(440,'sine',0.5,0,0.2); playTone(554,'sine',0.5,0.15,0.2); playTone(659,'sine',0.5,0.3,0.2); playTone(880,'sine',1.0,0.45,0.3); }
function playSadSound() { initAudio(); playTone(300,'sawtooth',1.0,0,0.2); playTone(250,'sawtooth',1.0,1.0,0.2); }
function playVictorySound() { initAudio(); [523,659,783,1046,783,1046].forEach((f,i)=>playTone(f,'square',0.5,i*0.2,0.1)); }

function requestGoBack() {
    const confirmExit = confirm("בטוחים שאתם רוצים לצאת חזרה להגדרות? (באופליין המשחק יישמר, באונליין תצאו מהחדר)");
    if (confirmExit) goBackToSettings();
}

// יציאה נכונה שמתנתקת מהרשת
function goBackToSettings() { 
    if (isOnlineNetwork) {
        // רענון מלא מנקה את החיבורים לפיירבייס בצורה הכי בטוחה
        location.reload(); 
    } else {
        clearInterval(timerInterval); 
        document.getElementById('game-container').style.display = 'none'; 
        document.getElementById('start-screen').style.display = 'flex';
        if (localStorage.getItem('savedTriviaGame')) { 
            document.getElementById('resume-btn').style.display = 'inline-block'; 
        }
    }
}

function selectDevice(dev) { 
    document.querySelectorAll('#dev-desktop, #dev-mobile').forEach(b=>b.classList.remove('selected')); 
    document.getElementById('dev-'+dev).classList.add('selected'); 
    selectedDevice = dev; 
    sessionStorage.setItem('doubleTriviaDevice', dev); 
    document.getElementById('network-selection-group').style.display = 'block'; 
    document.getElementById('network-selection-group').style.animation = 'fadeInDown 0.6s ease forwards'; 
}
function chooseNetwork(mode) {
    let adv = document.getElementById('advanced-settings');
    
    // פותחים את ההגדרות למטה, אבל כבר לא מעלימים את בחירת הרשת!
    adv.style.display = 'flex';
    
    if (mode === 'local') {
        isOnlineNetwork = false;
        document.getElementById('online-role-group').style.display = 'none';
        document.getElementById('online-guest-lobby').style.display = 'none';
        document.getElementById('host-action-group').style.display = 'none';
        document.getElementById('team-selection-group').style.display = 'block';
        document.getElementById('main-themes-group').style.display = 'block';
        document.getElementById('pairs-group').style.display = 'block';
        document.getElementById('main-start-btn').style.display = 'block';
        selectPlayers(4); 
    } else {
        isOnlineNetwork = true;
        document.getElementById('online-role-group').style.display = 'block';
        document.getElementById('team-selection-group').style.display = 'none';
        document.getElementById('player-name-group').style.display = 'none';
        document.getElementById('main-themes-group').style.display = 'none';
        document.getElementById('sub-themes-group').style.display = 'none';
        document.getElementById('pairs-group').style.display = 'none';
        document.getElementById('main-start-btn').style.display = 'none';
        document.getElementById('host-action-group').style.display = 'none';
    }
}

function selectOnlineRole(role) {
    if(role === 'host') {
        document.getElementById('online-guest-lobby').style.display = 'none';
        document.getElementById('player-name-group').style.display = 'block';
        document.getElementById('main-themes-group').style.display = 'block';
        document.getElementById('pairs-group').style.display = 'block';
        document.getElementById('host-action-group').style.display = 'block';
        document.getElementById('player-name-input').placeholder = "שם המארח/ת...";
    } else {
        document.getElementById('online-guest-lobby').style.display = 'block';
        document.getElementById('player-name-group').style.display = 'none';
        document.getElementById('main-themes-group').style.display = 'none';
        document.getElementById('sub-themes-group').style.display = 'none';
        document.getElementById('pairs-group').style.display = 'none';
        document.getElementById('host-action-group').style.display = 'none';
    }
}

function selectPairs(num) { 
    document.querySelectorAll('.pair-option').forEach(btn => btn.classList.remove('selected')); 
    if(event && event.target) event.target.classList.add('selected'); 
    selectedPairs = num; 
}

function selectPlayers(mode) { 
    document.querySelectorAll('.player-option').forEach(btn => btn.classList.remove('selected')); 
    if(event && event.target) event.target.classList.add('selected'); 
    gameMode = mode; 
    document.getElementById('bot-diff-group').style.display = (mode === 'bot') ? 'block' : 'none'; 
    document.getElementById('player-name-group').style.display = (mode === 1 || mode === 'bot') ? 'block' : 'none';
    document.getElementById('player-name-input').placeholder = "הקלד/י את השם כאן...";
}

function selectBotDiff(level, tProb, mProb) { 
    document.querySelectorAll('.bot-diff-btn').forEach(btn => btn.classList.remove('selected')); 
    if(event && event.target) event.target.classList.add('selected'); 
    botTriviaProb = tProb; 
    botMemoryProb = mProb; 
}

function prepareShuffledQuestionsData() {
    let rawQs = window.qDB[selectedTheme] ? JSON.parse(JSON.stringify(window.qDB[selectedTheme].q)) : [];
    shuffle(rawQs);
    let safeQs = [];
    rawQs.forEach(q => {
        if(q && q.length > 0) {
            let validOptions = [];
            let originalOptions = [q[1], q[2], q[3], q[4]];
            for(let i=0; i<4; i++) {
                if(originalOptions[i] !== "") validOptions.push({ text: originalOptions[i], isCorrect: (i === q[5]) });
            }
            if (!(validOptions.length === 2 && (validOptions[0].text === "נכון" || validOptions[0].text === "לא נכון"))) {
                shuffle(validOptions);
            }
            safeQs.push({
                q: q[0],
                options: validOptions,
                timer: q.length > 6 ? q[6] : null
            });
        }
    });
    return safeQs;
}

// --- לוגיקת אונליין ---
function sendOnlineEvent(type, payload) {
    if (!isOnlineNetwork || !currentRoomId) return;
    db.ref('rooms/' + currentRoomId + '/events').push({ 
        sender: myPlayerId, 
        type: type, 
        payload: payload || {}, 
        timestamp: firebase.database.ServerValue.TIMESTAMP 
    });
}

function createRoom() {
    let btn = document.querySelector('#host-action-group .start-btn'); 
    if (btn.disabled) return;
    btn.disabled = true; 
    btn.innerText = "יוצר חדר...";

    let pName = document.getElementById('player-name-input').value.trim() || "מארח/ת";
    let roomId = Math.floor(1000 + Math.random() * 9000).toString(); 
    currentRoomId = roomId; 
    myPlayerId = "host"; 
    isHost = true;

    document.getElementById('host-room-status').style.display = 'block';
    document.getElementById('host-room-status').innerHTML = `
        <h3 style="color: #e65100; margin-bottom: 5px;">החדר נוצר!</h3>
        <p>תגידו לכולם להזין את הקוד:</p>
        <div style="font-size: 4rem; font-weight: 900; letter-spacing: 5px; color: #d32f2f;">${roomId}</div>
        <div id="joined-players-list" style="margin: 15px 0; color: #1565c0; font-weight: bold; font-size:1.1rem;">שחקנים שהצטרפו: רק אתה בינתיים...</div>
        <button id="host-start-game-btn" class="start-btn" style="background-color: #4caf50; font-size: 1.3rem; padding: 15px 30px;" onclick="generateAndUploadBoard('${roomId}')">התחל משחק לכולם! 🚀</button>`;

    db.ref('rooms/' + roomId).set({ 
        status: 'waiting', 
        hostName: pName, 
        theme: selectedTheme, 
        pairs: selectedPairs, 
        createdAt: Date.now(), 
        players: {} 
    }).then(() => {
        btn.style.display = 'none'; 
        db.ref('rooms/' + roomId + '/players').on('value', snap => {
            let playersData = snap.val();
            if(playersData) { 
                let names = Object.values(playersData).map(p => p.name).join(' | '); 
                document.getElementById('joined-players-list').innerText = "הצטרפו: " + names; 
            }
        });
    });
}

function joinRoom() {
    let btn = document.querySelector('#online-guest-lobby .start-btn'); 
    if (btn.disabled) return;
    
    let roomId = document.getElementById('room-code-input').value.trim(); 
    if(!roomId) { alert("נא להזין קוד חדר!"); return; }
    
    btn.disabled = true; 
    btn.innerText = "מתחבר... ⏳";
    let pName = document.getElementById('guest-name-input').value.trim() || "אורח/ת";

    db.ref('rooms/' + roomId).once('value').then((snapshot) => {
        if(snapshot.exists() && snapshot.val().status === 'waiting') {
            currentRoomId = roomId; 
            myPlayerId = "u_" + Math.random().toString(36).substr(2, 9); 
            isHost = false;
            
            db.ref('rooms/' + roomId + '/players/' + myPlayerId).set({ name: pName }).then(() => {
                document.getElementById('guest-room-status').innerHTML = `<h3 style="color: #66bb6a;">התחברת בהצלחה! ממתין למארח שיתחיל...</h3>`;
                btn.style.display = 'none'; 
                db.ref('rooms/' + roomId + '/status').on('value', (snap) => {
                    if(snap.val() === 'playing') { 
                        db.ref('rooms/' + roomId + '/status').off(); 
                        startOnlineGameLocally(); 
                    }
                });
            });
        } else { 
            alert("שגיאה: החדר לא קיים או שכבר התחיל!"); 
            btn.disabled = false; 
            btn.innerText = "הצטרף לחדר 🚪"; 
        }
    }).catch(err => { 
        alert("שגיאת התחברות!"); 
        btn.disabled = false; 
        btn.innerText = "הצטרף לחדר 🚪"; 
    });
}

function generateAndUploadBoard(roomId) {
    let startBtn = document.getElementById('host-start-game-btn'); 
    if (startBtn) { 
        startBtn.disabled = true; 
        startBtn.innerText = "מכין לוח... ⏳"; 
    }
    
    try {
        db.ref('rooms/' + roomId).once('value').then(snap => {
            let roomData = snap.val(); 
            let hostName = roomData.hostName || "מארח"; 
            let joinedPlayers = roomData.players || {};
            
            let generatedTeams = []; 
            generatedTeams.push({ id: 1, name: hostName, score: 0, streak: 0, maxStreak: 0, consecutiveFailures: 0, pairsFound: 0, correctAnswers: 0, wrongAnswers: 0 });

            let teamId = 2, updatedPlayers = {};
            for (let key in joinedPlayers) {
                generatedTeams.push({ id: teamId, name: joinedPlayers[key].name || "שחקן", score: 0, streak: 0, maxStreak: 0, consecutiveFailures: 0, pairsFound: 0, correctAnswers: 0, wrongAnswers: 0 });
                updatedPlayers[key] = { name: joinedPlayers[key].name, teamId: teamId }; 
                teamId++;
            }
            db.ref('rooms/' + roomId + '/players').set(updatedPlayers);

            let safeQs = prepareShuffledQuestionsData();

            let cols = 8;
            if(selectedPairs === 5 || selectedPairs === 10) cols = 5; 
            else if(selectedPairs === 30 || selectedPairs === 40 || selectedPairs === 50) cols = 10;
            if(window.innerWidth < 768) cols = 4;

            let combinedIcons = [...new Set([...currentThemeIcons, ...fallbackIcons])];
            const gameIcons = combinedIcons.slice(0, selectedPairs);
            let boardCards = []; 
            gameIcons.forEach(icon => { boardCards.push(icon); boardCards.push(icon); }); 
            shuffle(boardCards);

            db.ref('rooms/' + roomId).update({
                status: 'playing',
                gameState: { 
                    theme: selectedTheme, 
                    pairs: selectedPairs, 
                    teams: generatedTeams, 
                    cards: boardCards, 
                    questions: safeQs, 
                    cols: cols 
                }
            }).then(() => { startOnlineGameLocally(); }).catch(err => alert("תקלה: " + err));
        });
    } catch (e) { alert("שגיאה ביצירת הלוח: " + e.message); }
}

function startOnlineGameLocally() {
    db.ref('rooms/' + currentRoomId + '/gameState').once('value').then((snap) => {
        let gameState = snap.val(); 
        if (!gameState) { alert("שגיאה בטעינת הלוח מהשרת."); return; }
        
        selectedTheme = gameState.theme || 'gen'; 
        selectedPairs = gameState.pairs || 20;
        teams = gameState.teams ? Object.values(gameState.teams) : [];
        cards = gameState.cards ? Object.values(gameState.cards) : [];
        availableQuestions = gameState.questions ? Object.values(gameState.questions) : [];
        currentCols = gameState.cols || 8;

        let teamIdPromise = isHost ? Promise.resolve((myTeamId = 1)) : db.ref('rooms/' + currentRoomId + '/players/' + myPlayerId).once('value').then(pSnap => { 
            if (pSnap.exists() && pSnap.val().teamId) myTeamId = pSnap.val().teamId; 
        });

        teamIdPromise.then(() => {
            db.ref('rooms/' + currentRoomId + '/events').on('child_added', eventSnap => {
                let event = eventSnap.val(); 
                if (!event || event.sender === myPlayerId) return; 
                
                if (event.type === 'FLIP_CARD') {
                    let cardEl = document.querySelector(`.card[data-id='${event.payload.cardIndex}']`);
                    if (cardEl) { 
                        let originalLock = lockBoard; 
                        lockBoard = false; 
                        flipCard.call(cardEl, true); 
                        lockBoard = originalLock; 
                    }
                } else if (event.type === 'REVEAL_QUESTION') { 
                    revealQuestion(true);
                } else if (event.type === 'CHECK_ANSWER') { 
                    checkAnswer(event.payload.selectedIndex, true);
                } else if (event.type === 'FINISH_TURN') { 
                    finishQuestionTurn(event.payload.isSuccess, true); 
                }
            });

            activeTeamId = 1; 
            matchedPairsCount = 0; 
            flippedCards = []; 
            activePair = []; 
            lockBoard = false;
            initAudio(); 
            
            document.getElementById('start-screen').style.display = 'none'; 
            document.getElementById('game-container').style.display = 'flex';
            if(window.innerWidth < 768) document.body.classList.add('mobile-mode');

            document.getElementById('game-board').style.gridTemplateColumns = `repeat(${currentCols}, 1fr)`;
            renderScoreboard(); 
            renderBoard(false); 
            startTime = Date.now();
        });
    });
}

// --- התחלת משחק אופליין ---
function initGame(isResume = false) {
    if(!selectedDevice) { alert("אנא בחרו מכשיר!"); return; }
    if(!isResume && !window.qDB[selectedTheme]) { alert("שגיאה: קובץ השאלות לא נטען."); return; }
    
    initAudio(); 
    document.getElementById('start-screen').style.display = 'none'; 
    document.getElementById('game-container').style.display = 'flex';
    if(selectedDevice === 'mobile') document.body.classList.add('mobile-mode');
    history.pushState(null, null, window.location.href);

    if (!isResume) {
        teams = []; 
        matchedPairsCount = 0; 
        activeTeamId = 1; 
        flippedCards = []; 
        activePair = []; 
        lockBoard = false;
        
        let pNameInput = document.getElementById('player-name-input').value.trim();
        if (pNameInput) localStorage.setItem('trivia_player_name', pNameInput);
        else if (gameMode !== 1 && gameMode !== 'bot') localStorage.removeItem('trivia_player_name');
        
        let savedName = localStorage.getItem('trivia_player_name') || "";
        let numPlayers = (gameMode === 'bot') ? 2 : parseInt(gameMode);
        
        for(let i=1; i<=numPlayers; i++) {
            let tName = `קבוצה ${i}`;
            if (gameMode === 1 || gameMode === 'bot') {
                if (i === 1) tName = savedName ? savedName : "שחקן יחיד";
                if (gameMode === 'bot' && i === 2) tName = "בוט אונליין 🤖";
            }
            teams.push({ id: i, name: tName, score: 0, streak: 0, maxStreak: 0, consecutiveFailures: 0, pairsFound: 0, correctAnswers: 0, wrongAnswers: 0 });
        }

        availableQuestions = prepareShuffledQuestionsData();

        if(selectedPairs === 5 || selectedPairs === 10) currentCols = 5; 
        else if(selectedPairs === 30 || selectedPairs === 40 || selectedPairs === 50) currentCols = 10; 
        else currentCols = 8;
        
        if(selectedDevice === 'mobile') currentCols = 4;
        
        let combinedIcons = [...new Set([...currentThemeIcons, ...fallbackIcons])];
        const gameIcons = combinedIcons.slice(0, selectedPairs);
        cards = []; 
        gameIcons.forEach((icon) => { cards.push(icon); cards.push(icon); }); 
        shuffle(cards); 

        startTime = Date.now();
        let themeName = window.qDB[selectedTheme] ? window.qDB[selectedTheme].title : selectedTheme;
        logEventToSheets("התחיל משחק 🎮", themeName, "-", "-", `מצב: ${gameMode}, זוגות: ${selectedPairs}`);
    }

    document.getElementById('game-board').style.gridTemplateColumns = `repeat(${currentCols}, 1fr)`;
    renderScoreboard(); 
    renderBoard(isResume); 
    if(!isResume) saveGameState(); 
}

function loadGameState() {
    const saved = localStorage.getItem('savedTriviaGame'); 
    if (!saved) return;
    const state = JSON.parse(saved);
    
    selectedTheme = state.selectedTheme; 
    selectedPairs = state.selectedPairs; 
    gameMode = state.gameMode;
    teams = state.teams; 
    activeTeamId = state.activeTeamId; 
    matchedPairsCount = state.matchedPairsCount;
    cards = state.cards; 
    currentCols = state.currentCols; 
    currentThemeIcons = state.currentThemeIcons;
    availableQuestions = state.availableQuestions;
    botTriviaProb = state.botTriviaProb !== undefined ? state.botTriviaProb : 0.85; 
    botMemoryProb = state.botMemoryProb !== undefined ? state.botMemoryProb : 0.5;

    initGame(true);
    document.querySelectorAll('.card').forEach((c, idx) => { 
        if (state.solvedIndices.includes(idx)) { c.classList.add('flipped', 'solved'); } 
    });
}

function saveGameState() {
    if (isOnlineNetwork || matchedPairsCount >= selectedPairs) return; 
    let solvedIndices = []; 
    document.querySelectorAll('.card').forEach((c, idx) => { 
        if (c.classList.contains('solved')) solvedIndices.push(idx); 
    });
    const state = { 
        selectedTheme, selectedPairs, gameMode, teams, activeTeamId, 
        matchedPairsCount, cards, solvedIndices, currentCols, currentThemeIcons, 
        availableQuestions, botTriviaProb, botMemoryProb 
    };
    localStorage.setItem('savedTriviaGame', JSON.stringify(state));
}

function shuffle(array) { 
    for (let i = array.length - 1; i > 0; i--) { 
        const j = Math.floor(Math.random() * (i + 1)); 
        [array[i], array[j]] = [array[j], array[i]]; 
    } 
}

function renderScoreboard() {
    const sb = document.getElementById('scoreboard'); 
    sb.innerHTML = '';
    teams.forEach((t, i) => {
        let div = document.createElement('div');
        div.className = `team-score ${t.id === activeTeamId ? 'active' : ''}`; 
        div.id = `team-${t.id}`;
        div.innerHTML = `${t.name} <span id="score-${t.id}">${t.score}</span>
                         <div class="streak-icon" id="streak-${t.id}" style="display:${t.streak >= 3 ? 'block' : 'none'}">🔥 רצף: ${t.streak}</div>
                         <div class="mercy-icon" id="mercy-${t.id}" style="display:${(t.consecutiveFailures > 0 && t.name !== "בוט אונליין 🤖") ? 'block' : 'none'}">${t.consecutiveFailures >= 5 ? 'זמן אינסופי!' : 'טעות ' + t.consecutiveFailures + '/5'}</div>`;
        if(t.consecutiveFailures >= 5 && t.name !== "בוט אונליין 🤖") div.querySelector('.mercy-icon').style.color = "var(--active-team)";
        sb.appendChild(div);
    });
}

function renderBoard(isResume) {
    const board = document.getElementById('game-board'); 
    board.innerHTML = '';
    cards.forEach((icon, index) => {
        const rowNum = Math.floor(index / currentCols) + 1;
        const colLetter = String.fromCharCode(65 + (index % currentCols));
        const card = document.createElement('div'); 
        card.classList.add('card'); 
        card.dataset.icon = icon; 
        card.dataset.id = index;
        card.innerHTML = `<div class="card-face card-front"><div class="coord-label" dir="ltr">${colLetter}${rowNum}</div></div><div class="card-face card-back">${icon}</div>`;
        card.addEventListener('click', () => { if(!lockBoard) flipCard.call(card); });
        board.appendChild(card);
    });
}

function flipCard(fromNetwork = false) {
    if (isOnlineNetwork && !fromNetwork && activeTeamId !== myTeamId) {
        let activeTeamEl = document.getElementById(`team-${activeTeamId}`);
        if (activeTeamEl) { 
            activeTeamEl.style.transform = "scale(1.1)"; 
            setTimeout(() => activeTeamEl.style.transform = "scale(1.05)", 200); 
        }
        return;
    }

    if (flippedCards.length < 2 && !this.classList.contains('flipped') && !this.classList.contains('solved')) {
        this.classList.add('flipped'); 
        flippedCards.push(this);
        if (isOnlineNetwork && !fromNetwork) sendOnlineEvent('FLIP_CARD', { cardIndex: this.dataset.id });
        if (flippedCards.length === 2) setTimeout(checkMatch, 600);
    }
}

function checkMatch() {
    const [c1, c2] = flippedCards;
    if (c1.dataset.icon === c2.dataset.icon) {
        teams[activeTeamId - 1].pairsFound++; 
        activePair = [c1, c2]; 
        openTriviaModal();
    } else {
        c1.classList.remove('flipped'); 
        c2.classList.remove('flipped');
        flippedCards = []; 
        resetStreakAndNextTeam(); 
    }
}

function resetStreakAndNextTeam() {
    let tIndex = activeTeamId - 1; 
    teams[tIndex].streak = 0; 
    renderScoreboard();
    
    activeTeamId = (activeTeamId % teams.length) + 1;
    document.querySelectorAll('.team-score').forEach(el => el.classList.remove('active'));
    document.getElementById(`team-${activeTeamId}`).classList.add('active');
    
    saveGameState(); 
    if(gameMode === 'bot' && activeTeamId === 2) { 
        lockBoard = true; 
        setTimeout(botPlay, 1000); 
    } else { 
        lockBoard = false; 
    }
}

let isInfiniteTime = false;

function checkIfSerious() {
    const t = window.qDB[selectedTheme] ? window.qDB[selectedTheme].title : "";
    return /פיזיקה|מתמטיקה|אזרחות|היסטוריה|מדעי המחשב|java|python|javascript|c#/i.test(t) || /פיזיקה|מתמטיקה|אזרחות|היסטוריה|מדעי המחשב|java|python|javascript|c#/i.test(selectedTheme);
}

function openTriviaModal() {
    document.getElementById('close-q-btn').classList.add('hidden'); 
    manualClosePending = false;
    
    const modal = document.getElementById('modal-overlay');
    document.getElementById('start-q-box').classList.remove('hidden'); 
    document.getElementById('question-content').classList.add('hidden');
    
    const themeTitle = window.qDB[selectedTheme] ? window.qDB[selectedTheme].title : "ידע כללי";
    document.getElementById('topic-badge-start').innerText = `נושא: ${themeTitle}`; 
    document.getElementById('topic-badge-q').innerText = `נושא: ${themeTitle}`;

    let titleText = (gameMode === 'bot' && activeTeamId === 2) ? "הבוט מצא זוג!" : "זוג תואם! מוכנים/ות לשאלה?";
    document.getElementById('modal-title').innerText = titleText;

    if (availableQuestions.length === 0) availableQuestions = prepareShuffledQuestionsData();
    currentQuestionObj = availableQuestions.pop();

    const grid = document.getElementById('answers-grid'); 
    grid.innerHTML = ''; 
    currentQuestionObj.options.forEach((opt, index) => {
        let btn = document.createElement('button');
        btn.className = `mcq-btn opt-color-${index}`; 
        btn.id = `btn-ans-${index}`;
        btn.innerText = (opt.text === "נכון" || opt.text === "לא נכון") ? opt.text : "אבגד"[index] + ". " + opt.text;
        btn.onclick = () => checkAnswer(index);
        
        if (isOnlineNetwork && activeTeamId !== myTeamId) btn.style.pointerEvents = 'none'; 
        
        grid.appendChild(btn);
    });
    
    document.getElementById('question-text').innerText = currentQuestionObj.q;
    modal.classList.add('show');

    if(gameMode === 'bot' && activeTeamId === 2) {
        document.getElementById('btn-reveal').style.display = 'none';
        setTimeout(() => { revealQuestion(); setTimeout(botAnswerTrivia, 3000); }, 2000);
    } else { 
        let br = document.getElementById('btn-reveal');
        if (isOnlineNetwork && activeTeamId !== myTeamId) {
            br.style.display = 'none'; 
            document.getElementById('modal-title').innerText = "זוג תואם! מחכים שהקבוצה השנייה תפתח את השאלה...";
        } else {
            br.style.display = 'inline-block'; 
            document.getElementById('modal-title').innerText = "זוג תואם! מוכנים/ות לשאלה?";
        }
    }
}

function revealQuestion(fromNetwork = false) {
    if (isOnlineNetwork && !fromNetwork && activeTeamId !== myTeamId) return;
    if (isOnlineNetwork && !fromNetwork) sendOnlineEvent('REVEAL_QUESTION', {});

    document.getElementById('start-q-box').classList.add('hidden'); 
    document.getElementById('question-content').classList.remove('hidden');
    
    let currentT = teams[activeTeamId - 1]; 
    let timerEl = document.getElementById('timer-container');

    if (currentT.consecutiveFailures >= 5 && currentT.name !== "בוט אונליין 🤖") {
        isInfiniteTime = true; 
        timerEl.innerText = "∞"; 
        timerEl.style.fontSize = "4rem"; 
        timerEl.style.borderColor = "var(--active-team)"; 
        timerEl.style.color = "var(--active-team)";
    } else {
        isInfiniteTime = false; 
        timeLeft = currentQuestionObj.timer ? currentQuestionObj.timer : (checkIfSerious() ? 30 : 15); 
        timerEl.innerText = timeLeft; 
        timerEl.style.fontSize = "3rem"; 
        timerEl.style.borderColor = "white"; 
        timerEl.style.color = "white";
        
        timerInterval = setInterval(() => {
            timeLeft--; 
            timerEl.innerText = timeLeft;
            if(timeLeft <= 5) { 
                timerEl.style.borderColor = "#ef5350"; 
                timerEl.style.color = "#ef5350"; 
            }
            if (timeLeft <= 0) { 
                clearInterval(timerInterval); 
                handleTimeOut(); 
            }
        }, 1000);
    }
}

function checkAnswer(selectedIndex, fromNetwork = false) {
    if (isOnlineNetwork && !fromNetwork && activeTeamId !== myTeamId) return;
    if(!isInfiniteTime && timeLeft <= 0) return; 
    if(!isInfiniteTime) clearInterval(timerInterval); 
    lockButtons();

    if (isOnlineNetwork && !fromNetwork) sendOnlineEvent('CHECK_ANSWER', { selectedIndex: selectedIndex });

    let currentT = teams[activeTeamId - 1];
    let correctIndex = currentQuestionObj.options.findIndex(opt => opt.isCorrect);

    if (currentQuestionObj.options[selectedIndex].isCorrect) { 
        currentT.consecutiveFailures = 0; 
        document.getElementById(`btn-ans-${selectedIndex}`).classList.add('correct-ans'); 
        successQuestion(); 
    } else { 
        currentT.consecutiveFailures++; 
        document.getElementById(`btn-ans-${selectedIndex}`).classList.add('selected-wrong'); 
        document.getElementById(`btn-ans-${correctIndex}`).classList.add('correct-ans'); 
        failQuestion(); 
    }
}

function handleTimeOut() { 
    if(isInfiniteTime) return; 
    lockButtons(); 
    teams[activeTeamId - 1].consecutiveFailures++; 
    let correctIndex = currentQuestionObj.options.findIndex(opt => opt.isCorrect);
    document.getElementById(`btn-ans-${correctIndex}`).classList.add('correct-ans');
    failQuestion(); 
}

function lockButtons() { 
    currentQuestionObj.options.forEach((_, i) => { 
        let b = document.getElementById(`btn-ans-${i}`); 
        if(b) { b.disabled = true; b.classList.add('wrong-ans'); } 
    }); 
}

function showAnim(type, textOverride) { 
    const el = document.getElementById(`feedback-${type}`); 
    if(!el) return;
    if(textOverride) el.innerText = textOverride;
    el.className = 'feedback-anim'; 
    void el.offsetWidth; 
    el.classList.add(`anim-${type}`);
}

function successQuestion() {
    // הפעלת סאונד ואנימציה רק לשחקן ששיחק עכשיו
    if (!isOnlineNetwork || activeTeamId === myTeamId) {
        playHappySound(); 
        showAnim('success');
    }
    
    let t = teams[activeTeamId-1]; 
    t.score++; t.streak++; t.correctAnswers++; 
    if(t.streak > t.maxStreak) t.maxStreak = t.streak;
    
    // מעדכנים ניקוד אצל כולם
    renderScoreboard(); 
    
    if(t.streak >= 3) { 
        if (!isOnlineNetwork || activeTeamId === myTeamId) {
            setTimeout(() => { showAnim('streak', `🔥 אש! ${t.streak} ברצף! 🔥`); }, 1500); 
        }
    }
    
    if(activePair[0]) activePair[0].classList.add('solved'); 
    if(activePair[1]) activePair[1].classList.add('solved'); 
    matchedPairsCount++;
    saveGameState(); 
    
    if (!isOnlineNetwork || activeTeamId === myTeamId) { 
        setTimeout(() => { finishQuestionTurn(true); }, 3000); 
    }
}

function failQuestion() {
    // הפעלת סאונד ואנימציה רק לשחקן ששיחק עכשיו
    if (!isOnlineNetwork || activeTeamId === myTeamId) {
        playSadSound(); 
        showAnim('fail'); 
    }
    
    teams[activeTeamId-1].wrongAnswers = (teams[activeTeamId-1].wrongAnswers || 0) + 1; 
    
    // מעדכנים ניקוד אצל כולם
    renderScoreboard();
    
    if (!isOnlineNetwork || activeTeamId === myTeamId) {
        if (checkIfSerious() && !(gameMode === 'bot' && activeTeamId === 2)) {
            document.getElementById('close-q-btn').classList.remove('hidden'); 
            manualClosePending = true;
        } else { 
            setTimeout(() => { if(!manualClosePending) finishQuestionTurn(false); }, 4000); 
        }
    }
}

function closeModalManual(fromNetwork = false) {
    if (isOnlineNetwork && !fromNetwork && activeTeamId !== myTeamId) return;
    document.getElementById('close-q-btn').classList.add('hidden'); 
    manualClosePending = false; 
    finishQuestionTurn(false);
}

function finishQuestionTurn(isSuccess, fromNetwork = false) {
    if (isOnlineNetwork && !fromNetwork && activeTeamId === myTeamId) {
        sendOnlineEvent('FINISH_TURN', { isSuccess: isSuccess });
    }

    document.getElementById('modal-overlay').classList.remove('show'); 
    document.getElementById('start-q-box').classList.add('hidden'); 
    document.getElementById('question-content').classList.add('hidden');
    document.getElementById('close-q-btn').classList.add('hidden'); 
    clearInterval(timerInterval); 

    if(!isSuccess) {
        if(activePair[0]) activePair[0].classList.remove('flipped'); 
        if(activePair[1]) activePair[1].classList.remove('flipped'); 
        flippedCards = []; 
        activePair = []; 
        resetStreakAndNextTeam();
    } else { 
        flippedCards = []; 
        activePair = []; 
        checkEndGame(); 
    }
}

function checkEndGame() { 
    if(matchedPairsCount >= selectedPairs) {
        setTimeout(showEndScreen, 1500); 
    } else if(gameMode === 'bot' && activeTeamId === 2) { 
        lockBoard = true; 
        setTimeout(botPlay, 1000); 
    } 
}

function botPlay() {
    let available = Array.from(document.querySelectorAll('.card:not(.solved):not(.flipped)')); 
    if(available.length < 2) return;
    
    let c1, c2;
    if (Math.random() < botMemoryProb) {
        let iconMap = {}; 
        available.forEach(c => { 
            let icon = c.dataset.icon; 
            if(!iconMap[icon]) iconMap[icon] = []; 
            iconMap[icon].push(c); 
        });
        let pairedIcons = Object.values(iconMap).filter(arr => arr.length === 2);
        if (pairedIcons.length > 0) { 
            let chosenPair = pairedIcons[Math.floor(Math.random() * pairedIcons.length)]; 
            c1 = chosenPair[0]; 
            c2 = chosenPair[1]; 
        }
    }
    
    if (!c1 || !c2) { 
        c1 = available[Math.floor(Math.random() * available.length)]; 
        let remaining = available.filter(c => c !== c1); 
        c2 = remaining[Math.floor(Math.random() * remaining.length)]; 
    }
    
    flipCard.call(c1); 
    setTimeout(() => { flipCard.call(c2); }, 800);
}

function botAnswerTrivia() {
    if(timeLeft <= 0) return;
    let isCorrect = Math.random() < botTriviaProb; 
    let correctIndex = currentQuestionObj.options.findIndex(opt => opt.isCorrect);
    let chosen = isCorrect ? correctIndex : currentQuestionObj.options.map((o, i) => i).filter(i => i !== correctIndex)[Math.floor(Math.random() * 3)];
    checkAnswer(chosen);
}

function fireConfetti() {
    const colors = ['#ffca28', '#ab47bc', '#29b6f6', '#66bb6a', '#ec407a'];
    for (let i = 0; i < 150; i++) {
        let conf = document.createElement('div'); 
        conf.className = 'confetti'; 
        conf.style.left = Math.random() * 100 + 'vw'; 
        conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]; 
        conf.style.top = '-10px'; 
        document.getElementById('end-screen').appendChild(conf);
        
        let speed = Math.random() * 3 + 2, angle = Math.random() * 360;
        let fall = setInterval(() => { 
            let currentTop = parseFloat(conf.style.top); 
            if (currentTop > window.innerHeight) { clearInterval(fall); conf.remove(); } 
            conf.style.top = currentTop + speed + 'px'; 
            conf.style.transform = `rotate(${angle}deg)`; 
            angle += 5; 
        }, 20);
    }
}

let currentRating = 0;
function setRating(val) { 
    currentRating = val; 
    document.querySelectorAll('.star').forEach((star, index) => { 
        if (index < val) star.classList.add('active'); 
        else star.classList.remove('active'); 
    }); 
}

function sendFeedback() {
    const msg = document.getElementById('feedback-input').value;
    const btn = document.getElementById('feedback-btn');
    
    if(!msg && currentRating === 0) { 
        alert("אנא סמנו דירוג כוכבים או כתבו לנו משהו לפני השליחה 😊"); 
        return; 
    }
    
    btn.disabled = true; 
    btn.innerText = "שולח... ⏳";
    
    let timeSpent = Math.round((Date.now() - startTime) / 1000 / 60);
    let themeName = window.qDB[selectedTheme] ? window.qDB[selectedTheme].title : selectedTheme;
    logEventToSheets("משוב שחקן 💬", themeName, timeSpent, currentRating > 0 ? currentRating + "/5" : "-", msg);
    
    setTimeout(() => { 
        document.getElementById('feedback-section').innerHTML = "<h3 style='color:#69f0ae;'>תודה רבה! המשוב נשמר בהצלחה 💖</h3>"; 
    }, 1500);
}

function showEndScreen() {
    localStorage.removeItem('savedTriviaGame'); 
    let finished = parseInt(localStorage.getItem('trivia_games_finished') || 0) + 1; 
    localStorage.setItem('trivia_games_finished', finished);
    
    document.getElementById('end-screen').classList.add('show');
    
    let timeSpent = Math.round((Date.now() - startTime) / 1000 / 60);
    let themeName = window.qDB[selectedTheme] ? window.qDB[selectedTheme].title : selectedTheme;
    logEventToSheets("סיים משחק 🏆", themeName, timeSpent, "-", `סיים בסך הכל ${finished} משחקים אי פעם`);

    let sortedTeams = [...teams].sort((a,b) => b.score - a.score); 
    sortedTeams[0].rank = 0; 
    
    for(let i=1; i<sortedTeams.length; i++) { 
        if(sortedTeams[i].score === sortedTeams[i-1].score) {
            sortedTeams[i].rank = sortedTeams[i-1].rank; 
        } else {
            sortedTeams[i].rank = i; 
        }
    }
    
    let podiumHTML = '';
    let placesStyles = ['p0', 'p1', 'p2', 'p3'];
    let displayOrder = [];
    
    if(teams.length === 1) displayOrder.push(sortedTeams[0]); 
    else if(teams.length === 2) displayOrder.push(sortedTeams[1], sortedTeams[0]); 
    else if(teams.length === 3) displayOrder.push(sortedTeams[1], sortedTeams[0], sortedTeams[2]); 
    else displayOrder.push(sortedTeams[1], sortedTeams[0], sortedTeams[2], sortedTeams[3]);

    displayOrder.forEach(t => {
        let styleRank = t.rank > 3 ? 3 : t.rank;
        let wrongs = t.wrongAnswers || 0;
        podiumHTML += `<div class="podium-place ${placesStyles[styleRank]}" id="podium-rank-${t.id}">
                        <div class="team-stats-podium">💡 זוגות: ${t.pairsFound}<br>✅ נכון: ${t.correctAnswers} | ❌ טעות: ${wrongs}</div>
                        <div class="team-name-podium">${t.name}</div>
                        <span>${t.score} נק'</span>
                       </div>`;
    });
    
    document.getElementById('podium').innerHTML = podiumHTML; 
    document.getElementById('podium').style.display = 'flex'; 
    document.getElementById('podium-announcer').style.display = 'block';

    let revealSequence = [];
    for (let i = sortedTeams.length - 1; i >= 0; i--) {
        let text = "";
        if(sortedTeams[i].rank === 0) text = `ובמקום הראשון... ${sortedTeams[i].name}!!! 🏆`; 
        else if(sortedTeams[i].rank === 1) text = `במקום השני... ${sortedTeams[i].name}!`; 
        else if(sortedTeams[i].rank === 2) text = `במקום השלישי... ${sortedTeams[i].name}!`; 
        else text = `במקום הרביעי... ${sortedTeams[i].name}!`;
        
        revealSequence.push({ id: sortedTeams[i].id, text: text, isFirst: sortedTeams[i].rank === 0 });
    }

    let announcer = document.getElementById('podium-announcer');
    let delay = 1000;
    
    revealSequence.forEach((step, index) => {
        setTimeout(() => {
            announcer.innerText = step.text; 
            announcer.classList.add('pop-anim'); 
            document.getElementById(`podium-rank-${step.id}`).classList.add('revealed');
            
            if (step.isFirst) {
                playVictorySound(); 
                fireConfetti();
                // ממתינים קצת ואז מעלימים את הפודיום ומראים את המשוב והכפתורים
                setTimeout(() => {
                    document.getElementById('podium').style.display = 'none';
                    document.getElementById('podium-announcer').style.display = 'none';
                    document.getElementById('end-controls').style.display = 'block';
                    document.getElementById('feedback-section').style.display = 'block';
                }, 4500); 
            } else { 
                playTone(400 + (index*100), 'sine', 0.4, 0, 0.2); 
            }
            setTimeout(() => announcer.classList.remove('pop-anim'), 800);
        }, delay);
        delay += 2500; 
    });
}

// כפתור המשחק החדש בסוף המשחק - מאפס הכל כולל חדר רשת
function resetToMainMenu() {
    location.reload(); 
}