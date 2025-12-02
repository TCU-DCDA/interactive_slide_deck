// --- PeerJS Client Setup ---
// Get Room Code from URL
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room') ? urlParams.get('room').toUpperCase() : null;
let conn;
let globalStats = null; // Store class stats received from host
let myAnswers = {}; // Store student's own answers: { 1: true, 2: false ... }
let quizAnswers = null; // Store answer key received from host
let messageQueue = []; // Queue for messages before connection is open

if (roomCode) {
    const peer = new Peer(); // Auto-generate ID for student
    
    peer.on('open', (id) => {
        console.log('Student Peer ID:', id);
        // Connect to Host
        const hostId = 'tcu-deck-' + roomCode;
        conn = peer.connect(hostId);
        
        conn.on('open', () => {
            console.log('Connected to Host!');
            // Optional: Visual indicator
            document.querySelector('h1').innerText += ' (Connected)';
            
            // Flush queue
            while (messageQueue.length > 0) {
                const msg = messageQueue.shift();
                conn.send(msg);
            }
        });
        
        conn.on('data', (data) => {
            if (data.type === 'stats_update') {
                globalStats = data.payload;
                // If the student is already on the results screen, update it live
                if (!document.getElementById('quiz-done').classList.contains('hidden')) {
                    renderStudentResults();
                }
            } else if (data.type === 'quiz_config') {
                quizAnswers = data.payload;
                console.log('Quiz configuration received');
            }
        });
        
        conn.on('error', (err) => {
            console.error('Connection Error:', err);
            alert('Could not connect to instructor. Check the room code.');
        });
    });

    peer.on('error', (err) => {
        console.error('Peer Error:', err);
        if (err.type === 'peer-unavailable') {
            alert('Could not find the instructor (Room: ' + roomCode + ').\n\nMake sure the instructor slide is open and the code is correct.');
        } else {
            alert('Network Error: ' + err.type);
        }
    });
} else {
    // Fallback or manual entry could go here
    console.warn('No room code provided in URL');
}

// Helper to send data
function sendData(type, payload) {
    const msg = { type, payload };
    if (conn && conn.open) {
        conn.send(msg);
    } else {
        console.log('Connection not ready, queuing message...');
        messageQueue.push(msg);
    }
}


// Shared Keys (Legacy LocalStorage)
const STORAGE_KEY_THOUGHTS = 'class_thoughts';
const STORAGE_KEY_QUIZ = 'class_quiz_results';

// --- Sentiment Logic ---
const thoughtInput = document.getElementById('studentThoughtInput');
const addThoughtBtn = document.getElementById('studentAddThoughtBtn');

// Simple Sentiment (Duplicated to avoid dependency issues, or could be shared)
// Class moved to js/sentiment.js
const sentiment = new SimpleSentiment();

addThoughtBtn.addEventListener('click', () => {
    const text = thoughtInput.value.trim();
    if (text) {
        const result = sentiment.analyze(text);
        
        const thoughtData = {
            text: text,
            score: result.score,
            id: Date.now()
        };
        
        // Send via PeerJS
        sendData('thought', thoughtData);
        
        // Legacy LocalStorage (Keep for local testing)
        const currentThoughts = JSON.parse(localStorage.getItem(STORAGE_KEY_THOUGHTS) || '[]');
        currentThoughts.push(thoughtData);
        localStorage.setItem(STORAGE_KEY_THOUGHTS, JSON.stringify(currentThoughts));

        thoughtInput.value = '';
        alert('Thought sent!');
    }
});

// --- Quiz Logic ---
window.submitAnswer = function(qNum, answer, btn) {
    // Visual Feedback
    const parent = btn.parentElement;
    const buttons = parent.getElementsByTagName('button');
    for(let b of buttons) {
        b.disabled = true;
        b.style.opacity = '0.5';
    }
    btn.style.opacity = '1';
    btn.classList.add('selected');

    // Check correctness (Dynamic check using key from host)
    let isCorrect = false;
    
    if (quizAnswers && quizAnswers[qNum]) {
        isCorrect = (answer === quizAnswers[qNum]);
    } else {
        console.warn('Quiz answer key not loaded yet. Defaulting to false.');
        // Fallback or retry logic could go here
    }

    // Store local result
    myAnswers[qNum] = isCorrect;

    // Send via PeerJS
    sendData('quiz', { question: qNum, isCorrect: isCorrect });

    // Legacy LocalStorage
    const stats = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ) || '{"correct":0, "incorrect":0}');
    if (isCorrect) {
        stats.correct++;
    } else {
        stats.incorrect++;
    }
    localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(stats));

    // Navigation
    setTimeout(() => {
        // Hide current
        document.getElementById('q' + qNum).classList.add('hidden');
        
        // Show next or done
        const nextQ = qNum + 1;
        const nextEl = document.getElementById('q' + nextQ);
        
        if (nextEl) {
            nextEl.classList.remove('hidden');
        } else {
            document.getElementById('quiz-done').classList.remove('hidden');
            renderStudentResults();
        }
    }, 500);
};

function renderStudentResults() {
    const tbody = document.getElementById('student-results-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    for (let i = 1; i <= 10; i++) {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #eee';
        
        // My Result
        const myResult = myAnswers[i];
        let myIcon = '-';
        if (myResult === true) myIcon = '<span style="color:green">✔</span>';
        if (myResult === false) myIcon = '<span style="color:red">✘</span>';

        // Class Result
        let classStat = '-';
        if (globalStats && globalStats['q' + i]) {
            const q = globalStats['q' + i];
            const total = q.correct + q.incorrect;
            if (total > 0) {
                const percent = Math.round((q.correct / total) * 100);
                classStat = `${percent}% Correct`;
            } else {
                classStat = 'No Data';
            }
        }

        row.innerHTML = `
            <td style="padding: 8px;">Q${i}</td>
            <td style="text-align: center; padding: 8px;">${myIcon}</td>
            <td style="text-align: center; padding: 8px; font-size: 0.8em; color: #666;">${classStat}</td>
        `;
        tbody.appendChild(row);
    }
}