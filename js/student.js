// Shared Keys
const STORAGE_KEY_THOUGHTS = 'class_thoughts';
const STORAGE_KEY_QUIZ = 'class_quiz_results';

// --- Sentiment Logic ---
const thoughtInput = document.getElementById('studentThoughtInput');
const addThoughtBtn = document.getElementById('studentAddThoughtBtn');

// Simple Sentiment (Duplicated to avoid dependency issues, or could be shared)
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

addThoughtBtn.addEventListener('click', () => {
    const text = thoughtInput.value.trim();
    if (text) {
        const result = sentiment.analyze(text);
        
        const thoughtData = {
            text: text,
            score: result.score,
            id: Date.now()
        };
        
        // Read - Modify - Write
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

    // Check correctness (Client-side check for simplicity)
    let isCorrect = false;
    if (qNum === 1 && answer === 'b') isCorrect = true;
    if (qNum === 2 && answer === 'b') isCorrect = true;
    if (qNum === 3 && answer === 'a') isCorrect = true;
    if (qNum === 4 && answer === 'c') isCorrect = true;
    if (qNum === 5 && answer === 'b') isCorrect = true;

    // Update Global Stats
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
        }
    }, 500);
};