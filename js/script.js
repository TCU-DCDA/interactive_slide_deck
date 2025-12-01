// Initialize Reveal.js
Reveal.initialize({
    hash: true,
    controls: true,
    progress: true,
    center: true,
});

// --- System Status Check ---
const statusDiv = document.createElement('div');
statusDiv.style.position = 'fixed';
statusDiv.style.bottom = '10px';
statusDiv.style.left = '10px';
statusDiv.style.fontSize = '12px';
statusDiv.style.color = '#666';
statusDiv.style.zIndex = '1000';
statusDiv.id = 'system-status';
statusDiv.innerText = 'System: Initializing...';
document.body.appendChild(statusDiv);

function updateStatus(msg) {
    const el = document.getElementById('system-status');
    if(el) el.innerText = 'System: ' + msg;
    const indicator = document.getElementById('status-indicator');
    if(indicator) indicator.innerText = 'Status: ' + msg;
    console.log('System:', msg);
}

// --- PeerJS Host Setup ---
// Generate a random 4-character room code
const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
const peerId = 'tcu-deck-' + roomCode;

const peer = new Peer(peerId);
let connections = []; // Store all connected students

peer.on('open', (id) => {
    updateStatus('Host Ready. Room: ' + roomCode);
    
    // Generate Link
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
    const studentLink = `${baseUrl}/student.html?room=${roomCode}`;
    
    document.getElementById('join-link').innerHTML = `<a href="${studentLink}" target="_blank" style="color:#42affa;">${studentLink}</a>`;
    
    // Generate QR Code
    new QRCode(document.getElementById("qrcode"), {
        text: studentLink,
        width: 128,
        height: 128
    });
});

peer.on('connection', (conn) => {
    connections.push(conn);
    
    // Send current stats immediately upon connection
    const currentStats = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ) || JSON.stringify(DEFAULT_QUIZ_STATS));
    conn.on('open', () => {
        conn.send({ type: 'stats_update', payload: currentStats });
    });

    conn.on('data', (data) => {
        console.log('Received data:', data);
        if (data.type === 'thought') {
            handleThought(data.payload);
        } else if (data.type === 'quiz') {
            handleQuizAnswer(data.payload);
        }
    });
    
    conn.on('close', () => {
        connections = connections.filter(c => c !== conn);
    });
});

peer.on('error', (err) => {
    console.error(err);
    updateStatus('Network Error: ' + err.type);
});

// --- Data Handlers ---

function handleThought(thoughtData) {
    // Save to local storage for persistence (optional, but good for refresh)
    const currentThoughts = JSON.parse(localStorage.getItem(STORAGE_KEY_THOUGHTS) || '[]');
    currentThoughts.push(thoughtData);
    localStorage.setItem(STORAGE_KEY_THOUGHTS, JSON.stringify(currentThoughts));
    
    // Update UI
    createBubble(thoughtData);
}

function handleQuizAnswer(isCorrect) {
    updateGlobalQuizStats(isCorrect);
}


// --- LocalStorage Syncing (Legacy/Backup) ---
const STORAGE_KEY_THOUGHTS = 'class_thoughts';
const STORAGE_KEY_QUIZ = 'class_quiz_results';

// Listen for changes from other tabs/windows (still useful for local testing)
window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY_THOUGHTS) {
        loadThoughts();
    } else if (e.key === STORAGE_KEY_QUIZ) {
        loadQuizResults();
    }
});

// --- Quiz Logic (Independent of Sentiment) ---
// Default structure: { total: {correct:0, incorrect:0}, q1: {correct:0, incorrect:0}, ... }
const DEFAULT_QUIZ_STATS = {
    total: { correct: 0, incorrect: 0 },
    q1: { correct: 0, incorrect: 0 },
    q2: { correct: 0, incorrect: 0 },
    q3: { correct: 0, incorrect: 0 },
    q4: { correct: 0, incorrect: 0 },
    q5: { correct: 0, incorrect: 0 },
    q6: { correct: 0, incorrect: 0 },
    q7: { correct: 0, incorrect: 0 },
    q8: { correct: 0, incorrect: 0 },
    q9: { correct: 0, incorrect: 0 },
    q10: { correct: 0, incorrect: 0 }
};

// Load initial quiz state
try {
    loadQuizResults();
} catch (e) {
    console.error("Error loading quiz results", e);
}

function updateGlobalQuizStats(data) {
    // Handle both old format (boolean) and new format (object)
    let isCorrect, questionNum;
    
    if (typeof data === 'boolean') {
        // Legacy fallback (assume generic correct/incorrect if no question provided)
        isCorrect = data;
        questionNum = 'unknown';
    } else {
        isCorrect = data.isCorrect;
        questionNum = 'q' + data.question;
    }

    const stats = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ) || JSON.stringify(DEFAULT_QUIZ_STATS));
    
    // Ensure structure exists (migration)
    if (!stats.total) {
        // Migrate old format to new
        const oldCorrect = stats.correct || 0;
        const oldIncorrect = stats.incorrect || 0;
        stats.total = { correct: oldCorrect, incorrect: oldIncorrect };
        // Reset per-question stats as we don't know where old votes came from
        for(let i=1; i<=10; i++) stats['q'+i] = { correct: 0, incorrect: 0 };
        delete stats.correct;
        delete stats.incorrect;
    }

    // Update Total
    if (isCorrect) {
        stats.total.correct++;
    } else {
        stats.total.incorrect++;
    }

    // Update Specific Question
    if (stats[questionNum]) {
        if (isCorrect) {
            stats[questionNum].correct++;
        } else {
            stats[questionNum].incorrect++;
        }
    }

    localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(stats));
    loadQuizResults();
    
    // Broadcast new stats to all students
    broadcastStats(stats);
}

function broadcastStats(stats) {
    connections.forEach(conn => {
        if (conn.open) {
            conn.send({ type: 'stats_update', payload: stats });
        }
    });
}

function loadQuizResults() {
    let stats = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ));
    
    // Initialize if empty or old format
    if (!stats || !stats.total) {
        stats = JSON.parse(JSON.stringify(DEFAULT_QUIZ_STATS));
    }

    const tbody = document.getElementById('results-body');
    if (tbody) {
        tbody.innerHTML = ''; // Clear existing
        
        // Generate rows for Q1-Q10
        for (let i = 1; i <= 10; i++) {
            const key = 'q' + i;
            const qStats = stats[key] || { correct: 0, incorrect: 0 };
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>Question ${i}</td>
                <td style="color: #4caf50;">${qStats.correct}</td>
                <td style="color: #f44336;">${qStats.incorrect}</td>
            `;
            tbody.appendChild(row);
        }
    }

    // Update Totals
    const totalCorrectEl = document.getElementById('total-correct');
    const totalIncorrectEl = document.getElementById('total-incorrect');
    
    if (totalCorrectEl) totalCorrectEl.innerText = stats.total.correct;
    if (totalIncorrectEl) totalIncorrectEl.innerText = stats.total.incorrect;
}

window.resetQuiz = function() {
    localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(DEFAULT_QUIZ_STATS));
    localStorage.setItem(STORAGE_KEY_THOUGHTS, JSON.stringify([])); 
    loadQuizResults();
    loadThoughts();
    
    alert("Quiz Reset!");
    // No need to reset UI buttons here as this is the instructor view
};


// --- Sentiment Analysis Setup ---
const bubbleContainer = document.getElementById('bubble-container');
const thoughtInput = document.getElementById('thoughtInput');
const addThoughtBtn = document.getElementById('addThoughtBtn');

// Simple internal sentiment analyzer to avoid CDN issues
class SimpleSentiment {
    constructor() {
        this.positive = new Set(['good', 'great', 'awesome', 'excellent', 'happy', 'love', 'wonderful', 'best', 'better', 'fun', 'exciting', 'glad', 'nice', 'cool', 'amazing', 'fantastic', 'brilliant', 'joy', 'success', 'win', 'learning', 'fast', 'easy', 'smart']);
        this.negative = new Set(['bad', 'terrible', 'awful', 'worst', 'hate', 'sad', 'angry', 'boring', 'difficult', 'hard', 'fail', 'lose', 'poor', 'wrong', 'ugly', 'nasty', 'horrible', 'scary', 'fear', 'pain', 'slow', 'confusing', 'stuck']);
    }

    analyze(text) {
        const words = text.toLowerCase().match(/\b\w+\b/g) || [];
        let score = 0;
        words.forEach(word => {
            if (this.positive.has(word)) score += 1;
            if (this.negative.has(word)) score -= 1;
        });
        return { score };
    }
}

const sentiment = new SimpleSentiment();
updateStatus('Ready (Internal Sentiment Loaded)');

// Load initial thoughts
loadThoughts();

if (addThoughtBtn) {
    addThoughtBtn.addEventListener('click', () => {
        const text = thoughtInput.value.trim();
        if (text) {
            let score = 0;
            if (sentiment) {
                const result = sentiment.analyze(text);
                score = result.score;
            }
            
            const thoughtData = {
                text: text,
                score: score,
                id: Date.now()
            };
            
            const currentThoughts = JSON.parse(localStorage.getItem(STORAGE_KEY_THOUGHTS) || '[]');
            currentThoughts.push(thoughtData);
            localStorage.setItem(STORAGE_KEY_THOUGHTS, JSON.stringify(currentThoughts));

            createBubble(thoughtData);
            thoughtInput.value = '';
        }
    });
}



function loadThoughts() {
    // Clear current bubbles to avoid duplicates (simple approach)
    bubbleContainer.innerHTML = '';
    const savedThoughts = JSON.parse(localStorage.getItem(STORAGE_KEY_THOUGHTS) || '[]');
    savedThoughts.forEach(createBubble);
}

function createBubble(data) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerText = data.text;
    
    // Size based on text length (clamped)
    const size = Math.min(Math.max(data.text.length * 5 + 50, 80), 150);
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    
    // Color based on sentiment
    if (data.score > 0) {
        bubble.style.backgroundColor = '#81c784'; // Greenish
    } else if (data.score < 0) {
        bubble.style.backgroundColor = '#e57373'; // Reddish
    } else {
        bubble.style.backgroundColor = '#fff176'; // Yellowish
    }
    
    // Deterministic Position based on ID (Pseudo-random)
    // This ensures the same bubble appears in the same spot on all screens
    const seed = data.id; 
    const pseudoRandom = (seed) => {
        let x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    };

    const containerWidth = bubbleContainer.clientWidth || 900;
    const containerHeight = bubbleContainer.clientHeight || 500;

    const maxX = containerWidth - size;
    const maxY = containerHeight - size;
    
    // Sort by Sentiment Zones
    // Positive (Green) -> Right side
    // Negative (Red) -> Left side
    // Neutral (Yellow) -> Center
    
    let zoneX_Start, zoneX_End;
    
    if (data.score > 0) {
        // Right 1/3
        zoneX_Start = containerWidth * 0.66;
        zoneX_End = maxX;
    } else if (data.score < 0) {
        // Left 1/3
        zoneX_Start = 0;
        zoneX_End = containerWidth * 0.33 - size;
    } else {
        // Center 1/3
        zoneX_Start = containerWidth * 0.33;
        zoneX_End = containerWidth * 0.66 - size;
    }
    
    // Ensure valid ranges
    if (zoneX_End < zoneX_Start) zoneX_End = zoneX_Start;

    // Calculate position within the specific zone
    const randomX = zoneX_Start + (pseudoRandom(seed) * (zoneX_End - zoneX_Start));
    const randomY = pseudoRandom(seed + 1) * maxY; // Use seed+1 for Y to be different from X
    
    bubble.style.left = `${randomX}px`;
    bubble.style.top = `${randomY}px`;
    
    // Add animation delay for variety
    bubble.style.animationDelay = `${pseudoRandom(seed + 2) * 2}s`;

    bubbleContainer.appendChild(bubble);
}

// Reload bubbles/results when entering the slide to ensure correct positioning/data
Reveal.on('slidechanged', event => {
    if (event.currentSlide.id === 'bubble-slide') {
        loadThoughts();
    }
    if (event.currentSlide.id === 'results-slide') {
        loadQuizResults();
    }
});
