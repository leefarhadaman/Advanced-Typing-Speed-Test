// static/js/script.js
class TypingTest {
    constructor() {
        this.initializeVariables();
        this.initializeElements();
        this.initializeCharts();
        this.attachEventListeners();
    }

    initializeVariables() {
        this.timeLeft = 60;
        this.timer = null;
        this.isTestActive = false;
        this.currentText = '';
        this.startTime = null;
        this.speedData = [];
        this.mistakes = 0;
        this.lastCorrectIndex = -1;
        this.wordHistory = [];
        this.isLoggedIn = false;
        this.currentMode = 'practice';
    }

    initializeElements() {
        // Auth elements
        this.authContainer = document.getElementById('auth-container');
        this.mainContainer = document.getElementById('main-container');
        this.loginBtn = document.getElementById('login-btn');
        this.registerBtn = document.getElementById('register-btn');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');

        // Test elements
        this.textDisplay = document.getElementById('text-display');
        this.inputArea = document.getElementById('input-area');
        this.startBtn = document.getElementById('start-btn');
        this.difficultySelect = document.getElementById('difficulty');
        this.timeLimitSelect = document.getElementById('time-limit');
        this.timeDisplay = document.getElementById('time');
        this.wpmDisplay = document.getElementById('wpm');
        this.accuracyDisplay = document.getElementById('accuracy');
        this.mistakesDisplay = document.getElementById('mistakes');
        
        // Modal elements
        this.resultModal = document.getElementById('result-modal');
        this.resultDetails = document.querySelector('.result-details');
        this.retryBtn = document.getElementById('retry-btn');
        this.shareBtn = document.getElementById('share-btn');
    }

    initializeCharts() {
        // Speed Chart
        const speedCtx = document.getElementById('speedChart').getContext('2d');
        this.speedChart = new Chart(speedCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'WPM Over Time',
                    data: [],
                    borderColor: '#4CAF50',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Words Per Minute'
                        }
                    }
                }
            }
        });

        // Progress Chart
        const progressCtx = document.getElementById('progressChart').getContext('2d');
        this.progressChart = new Chart(progressCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Progress Over Time',
                    data: [],
                    borderColor: '#2196F3',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Average WPM'
                        }
                    }
                }
            }
        });
    }

    attachEventListeners() {
        // Auth listeners
        this.loginBtn.addEventListener('click', () => this.handleAuth('login'));
        this.registerBtn.addEventListener('click', () => this.handleAuth('register'));

        // Test listeners
        this.startBtn.addEventListener('click', () => this.startTest());
        this.inputArea.addEventListener('input', () => this.handleInput());
        this.retryBtn.addEventListener('click', () => this.hideModal());
        this.shareBtn.addEventListener('click', () => this.shareResults());

        // Mode selection
        document.querySelectorAll('.mode-option').forEach(option => {
            option.addEventListener('click', (e) => this.changeMode(e.target.dataset.mode));
        });
    }

    async handleAuth(type) {
        const username = this.usernameInput.value;
        const password = this.passwordInput.value;

        const response = await fetch(`/${type}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (data.status === 'success') {
            this.isLoggedIn = true;
            this.authContainer.classList.add('hidden');
            this.mainContainer.classList.remove('hidden');
            this.loadUserStats();
        } else {
            alert(data.message);
        }
    }

    changeMode(mode) {
        this.currentMode = mode;
        document.querySelectorAll('.mode-option').forEach(option => {
            option.classList.toggle('active', option.dataset.mode === mode);
        });

        // Adjust UI based on mode
        if (mode === 'challenge') {
            this.timeLimitSelect.disabled = true;
            this.timeLimitSelect.value = '60';
        } else {
            this.timeLimitSelect.disabled = false;
        }
    }

    async startTest() {
        this.isTestActive = true;
        this.timeLeft = parseInt(this.timeLimitSelect.value);
        this.speedData = [];
        this.mistakes = 0;
        this.startTime = null;
        this.lastCorrectIndex = -1;

        try {
            const response = await fetch(`/get_text/${this.difficultySelect.value}`);
            const data = await response.json();
            this.currentText = data.text;
            this.textDisplay.textContent = this.currentText;
            this.inputArea.value = '';
            this.inputArea.disabled = false;
            this.inputArea.focus();

            this.resetCharts();
            this.startTimer();
            this.startBtn.disabled = true;
        } catch (error) {
            console.error('Error fetching text:', error);
            alert('Error starting test. Please try again.');
        }
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.timeDisplay.textContent = this.timeLeft;

            if (this.timeLeft <= 0) {
                this.endTest();
            }
        }, 1000);
    }

    handleInput() {
        if (!this.startTime && this.isTestActive) {
            this.startTime = Date.now();
        }

        const input = this.inputArea.value;
        this.updateTextDisplay(input);
        this.updateStats(input);

        // Check for completion
        if (input.length === this.currentText.length) {
            this.endTest();
        }
    }

    updateTextDisplay(input) {
        let html = '';
        for (let i = 0; i < this.currentText.length; i++) {
            if (i < input.length) {
                if (input[i] === this.currentText[i]) {
                    html += `<span class="correct">${this.currentText[i]}</span>`;
                    if (i > this.lastCorrectIndex) {
                        this.lastCorrectIndex = i;
                    }
                } else {
                    html += `<span class="incorrect">${this.currentText[i]}</span>`;
                    if (i > this.lastCorrectIndex) {
                        this.mistakes++;
                    }
                }
            } else {
                html += this.currentText[i];
            }
        }
        this.textDisplay.innerHTML = html;
        this.mistakesDisplay.textContent = this.mistakes;
    }

    updateStats(input) {
        const wpm = this.calculateWPM(input.length);
        const accuracy = this.calculateAccuracy(input);
        
        this.wpmDisplay.textContent = wpm;
        this.accuracyDisplay.textContent = `${accuracy}%`;
        
        this.speedData.push(wpm);
        this.updateSpeedChart();
    }

    calculateWPM(inputLength) {
        if (!this.startTime) return 0;
        const timeElapsed = (Date.now() - this.startTime) / 1000 / 60; // in minutes
        return Math.round((inputLength / 5) / timeElapsed);
    }

    calculateAccuracy(input) {
        let correct = 0;
        const minLength = Math.min(input.length, this.currentText.length);
        
        for (let i = 0; i < minLength; i++) {
            if (input[i] === this.currentText[i]) correct++;
        }
        
        return Math.round((correct / this.currentText.length) * 100);
    }

    updateSpeedChart() {
        this.speedChart.data.labels = Array.from(
            { length: this.speedData.length },
            (_, i) => i
        );
        this.speedChart.data.datasets[0].data = this.speedData;
        this.speedChart.update();
    }

    async endTest() {
        clearInterval(this.timer);
        this.isTestActive = false;
        this.inputArea.disabled = true;
        this.startBtn.disabled = false;

        const finalStats = {
            wpm: parseInt(this.wpmDisplay.textContent),
            accuracy: parseInt(this.accuracyDisplay.textContent),
            mistakes: this.mistakes,
            difficulty: this.difficultySelect.value,
            textLength: this.currentText.length,
            mode: this.currentMode
        };

        if (this.isLoggedIn) {
            await this.saveResults(finalStats);
            await this.loadUserStats();
        }

        this.showResultModal(finalStats);
    }

    async saveResults(stats) {
        try {
            await fetch('/save_result', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(stats)
            });
        } catch (error) {
            console.error('Error saving results:', error);
        }
    }

    async loadUserStats() {
        try {
            const response = await fetch('/get_stats');
            const data = await response.json();
            this.updateProgressChart(data.recent);
            this.updateStatsCards(data.stats);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateProgressChart(recentTests) {
        const labels = recentTests.map(test => 
            new Date(test.timestamp).toLocaleDateString()
        );
        const data = recentTests.map(test => test.wpm);

        this.progressChart.data.labels = labels;
        this.progressChart.data.datasets[0].data = data;
        this.progressChart.update();
    }

    updateStatsCards(stats) {
        const overallStats = document.getElementById('overall-stats');
        const recentTests = document.getElementById('recent-tests');
        const achievements = document.getElementById('achievements');

        // Update overall stats
        overallStats.innerHTML = this.generateOverallStatsHTML(stats);
        recentTests.innerHTML = this.generateRecentTestsHTML(stats);
        achievements.innerHTML = this.generateAchievementsHTML(stats);
    }

    showResultModal(stats) {
        this.resultDetails.innerHTML = `
            <h3>Test Complete!</h3>
            <p>WPM: ${stats.wpm}</p>
            <p>Accuracy: ${stats.accuracy}%</p>
            <p>Mistakes: ${stats.mistakes}</p>
            <p>Mode: ${stats.mode}</p>
            <p>Difficulty: ${stats.difficulty}</p>
        `;
        this.resultModal.classList.remove('hidden');
    }

    hideModal() {
        this.resultModal.classList.add('hidden');
        this.resetTest();
    }

    // Continuing the TypingTest class...
    
    resetTest() {
        this.initializeVariables();
        this.textDisplay.textContent = 'Click Start Test to begin...';
        this.inputArea.value = '';
        this.updateStats('');
        this.resetCharts();
    }

    resetCharts() {
        this.speedChart.data.labels = [];
        this.speedChart.data.datasets[0].data = [];
        this.speedChart.update();
    }

    generateOverallStatsHTML(stats) {
        if (!stats.length) return '<p>No tests completed yet</p>';

        const totalTests = stats.reduce((acc, s) => acc + s.tests_taken, 0);
        const avgWPM = stats.reduce((acc, s) => acc + (s.avg_wpm * s.tests_taken), 0) / totalTests;
        const maxWPM = Math.max(...stats.map(s => s.max_wpm));

        return `
            <h3>Overall Statistics</h3>
            <div class="stat-grid">
                <div>
                    <p>Total Tests: ${totalTests}</p>
                    <p>Average WPM: ${avgWPM.toFixed(1)}</p>
                    <p>Best WPM: ${maxWPM}</p>
                </div>
                <div class="difficulty-breakdown">
                    ${stats.map(s => `
                        <div class="difficulty-stat">
                            <h4>${s.difficulty}</h4>
                            <p>Avg WPM: ${s.avg_wpm.toFixed(1)}</p>
                            <p>Accuracy: ${s.avg_accuracy.toFixed(1)}%</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateRecentTestsHTML(stats) {
        return `
            <h3>Recent Performance</h3>
            <div class="recent-tests-grid">
                ${stats.map(s => `
                    <div class="test-card">
                        <p>Date: ${new Date(s.timestamp).toLocaleDateString()}</p>
                        <p>WPM: ${s.wpm}</p>
                        <p>Accuracy: ${s.accuracy}%</p>
                        <p>Difficulty: ${s.difficulty}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    generateAchievementsHTML(stats) {
        const achievements = this.calculateAchievements(stats);
        return `
            <h3>Achievements</h3>
            <div class="achievements-grid">
                ${achievements.map(a => `
                    <div class="achievement ${a.unlocked ? 'unlocked' : ''}">
                        <span class="achievement-icon">${a.icon}</span>
                        <div class="achievement-info">
                            <h4>${a.name}</h4>
                            <p>${a.description}</p>
                            ${a.unlocked ? '<span class="unlocked-badge">Unlocked!</span>' : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    calculateAchievements(stats) {
        const maxWPM = Math.max(...stats.map(s => s.max_wpm));
        const totalTests = stats.reduce((acc, s) => acc + s.tests_taken, 0);
        
        return [
            {
                name: 'Speed Demon',
                description: 'Achieve 100+ WPM',
                icon: '🚀',
                unlocked: maxWPM >= 100
            },
            {
                name: 'Precision Master',
                description: 'Complete a test with 100% accuracy',
                icon: '🎯',
                unlocked: stats.some(s => s.avg_accuracy === 100)
            },
            {
                name: 'Dedicated Typist',
                description: 'Complete 50 tests',
                icon: '💪',
                unlocked: totalTests >= 50
            },
            {
                name: 'Code Warrior',
                description: 'Complete a code snippet with 90%+ accuracy',
                icon: '👨‍💻',
                unlocked: stats.some(s => s.difficulty === 'code' && s.avg_accuracy >= 90)
            }
        ];
    }

    shareResults() {
        const stats = {
            wpm: this.wpmDisplay.textContent,
            accuracy: this.accuracyDisplay.textContent,
            difficulty: this.difficultySelect.value
        };

        const text = `I just completed a typing test!\n` +
                    `WPM: ${stats.wpm}\n` +
                    `Accuracy: ${stats.accuracy}\n` +
                    `Difficulty: ${stats.difficulty}\n` +
                    `Try it yourself!`;

        if (navigator.share) {
            navigator.share({
                title: 'My Typing Test Results',
                text: text
            }).catch(console.error);
        } else {
            // Fallback - copy to clipboard
            navigator.clipboard.writeText(text)
                .then(() => alert('Results copied to clipboard!'))
                .catch(console.error);
        }
    }

    // Multiplayer functionality
    initializeMultiplayer() {
        // This could be expanded with WebSocket implementation
        this.multiplayerMode = {
            isActive: false,
            roomId: null,
            players: []
        };
    }

    // Practice mode features
    enablePracticeMode() {
        this.currentMode = 'practice';
        this.timeLimitSelect.disabled = false;
        // Enable word highlighting and mistake analysis
        this.enableWordHighlighting();
    }

    enableWordHighlighting() {
        this.inputArea.addEventListener('input', () => {
            const words = this.currentText.split(' ');
            const typedWords = this.inputArea.value.split(' ');
            
            let html = words.map((word, i) => {
                if (i < typedWords.length) {
                    if (word === typedWords[i]) {
                        return `<span class="correct-word">${word}</span>`;
                    } else {
                        return `<span class="incorrect-word">${word}</span>`;
                    }
                }
                return word;
            }).join(' ');
            
            this.textDisplay.innerHTML = html;
        });
    }

    // Challenge mode features
    enableChallengeMode() {
        this.currentMode = 'challenge';
        this.timeLimitSelect.value = '60';
        this.timeLimitSelect.disabled = true;
        // Add progressive difficulty
        this.enableProgressiveDifficulty();
    }

    enableProgressiveDifficulty() {
        // Increase difficulty based on performance
        let baseWPM = 0;
        this.inputArea.addEventListener('input', () => {
            const currentWPM = this.calculateWPM(this.inputArea.value.length);
            if (currentWPM > baseWPM + 20) {
                baseWPM = currentWPM;
                // Increase difficulty by selecting more complex texts
                this.increaseDifficulty();
            }
        });
    }

    increaseDifficulty() {
        // Logic to select progressively harder texts
        const difficulties = ['easy', 'medium', 'hard', 'code'];
        const currentIndex = difficulties.indexOf(this.difficultySelect.value);
        if (currentIndex < difficulties.length - 1) {
            this.difficultySelect.value = difficulties[currentIndex + 1];
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const typingTest = new TypingTest();
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            // Ctrl+Enter to start/restart test
            typingTest.startTest();
        } else if (e.ctrlKey && e.key === 'r') {
            // Ctrl+R to reset test
            e.preventDefault();
            typingTest.resetTest();
        }
    });
});