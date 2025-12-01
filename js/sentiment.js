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
