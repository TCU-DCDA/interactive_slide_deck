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
    conn.on('data', (data) => {
        console.log('Received data:', data);
        if (data.type === 'thought') {
            handleThought(data.payload);
        } else if (data.type === 'quiz') {
            handleQuizAnswer(data.payload);
        }
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
let correctCount = 0;
let incorrectCount = 0;

// Load initial quiz state
try {
    loadQuizResults();
} catch (e) {
    console.error("Error loading quiz results", e);
}

// (Instructor view doesn't answer questions anymore, so checkAnswer is removed/unused here)

function updateGlobalQuizStats(isCorrect) {
    const stats = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ) || '{"correct":0, "incorrect":0}');
    if (isCorrect) {
        stats.correct++;
    } else {
        stats.incorrect++;
    }
    localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(stats));
    loadQuizResults();
}

function loadQuizResults() {
    const stats = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ) || '{"correct":0, "incorrect":0}');
    const correctEl = document.getElementById('correct-count');
    const incorrectEl = document.getElementById('incorrect-count');
    
    if (correctEl) correctEl.innerText = stats.correct;
    if (incorrectEl) incorrectEl.innerText = stats.incorrect;
}

window.resetQuiz = function() {
    localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify({correct: 0, incorrect: 0}));
    localStorage.setItem(STORAGE_KEY_THOUGHTS, JSON.stringify([])); 
    loadQuizResults();
    loadThoughts();
    
    // Reset UI questions
    document.querySelector('.question:nth-child(1)').style.display = 'block';
    document.getElementById('q2').style.display = 'none';
    
    // Reset buttons visual state (reload page is easiest, but let's try manual)
    const buttons = document.getElementsByClassName('quiz-btn');
    for(let b of buttons) {
        b.style.backgroundColor = '#333';
        b.style.opacity = '1';
        b.style.cursor = 'pointer';
        // Remove the (Correct/Incorrect) text if present
        b.innerText = b.innerText.replace(' (Correct!)', '').replace(' (Incorrect)', '');
        // Re-attach handlers is tricky without reloading, so we advise reload
    }
    alert("Quiz Reset! Please refresh the page to reset the buttons.");
    Reveal.slide(3); 
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
