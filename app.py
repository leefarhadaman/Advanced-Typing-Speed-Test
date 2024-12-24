from flask import Flask, render_template, jsonify, request, session
from datetime import datetime
import random
import json
import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY')  # Required for session management

# Database initialization
def init_db():
    with sqlite3.connect('typing_test.db') as conn:
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS users 
                    (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT)''')
        c.execute('''CREATE TABLE IF NOT EXISTS test_results 
                    (id INTEGER PRIMARY KEY, user_id INTEGER, wpm INTEGER, 
                     accuracy REAL, difficulty TEXT, text_length INTEGER, 
                     timestamp DATETIME, mistakes INTEGER,
                     FOREIGN KEY (user_id) REFERENCES users(id))''')
        conn.commit()

# Expanded text categories
TEXTS = {
    'easy': [
        "The quick brown fox jumps over the lazy dog.",
        "A simple sentence for typing practice.",
        "Learning to type faster is a useful skill."
    ],
    'medium': [
        "The exploration of space has captivated humans for centuries, leading to remarkable discoveries.",
        "Programming requires attention to detail and logical thinking abilities.",
        "The interconnected nature of global economics affects markets worldwide."
    ],
    'hard': [
        "In quantum mechanics, particles can exhibit wave-like behavior through quantum superposition.",
        "The implementation of sophisticated algorithms requires careful consideration of time complexity.",
        "Neurotransmitters facilitate communication between neurons through synaptic transmission."
    ],
    'code': [
        "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
        "for i in range(len(array)):\n    if array[i] > max_value:\n        max_value = array[i]",
        "class Node:\n    def __init__(self, value):\n        self.value = value\n        self.next = None"
    ],
    'quotes': [
        "Be the change you wish to see in the world. - Mahatma Gandhi",
        "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment. - Ralph Waldo Emerson",
        "The only way to do great work is to love what you do. - Steve Jobs"
    ]
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')  # In production, use proper password hashing
    
    try:
        with sqlite3.connect('typing_test.db') as conn:
            c = conn.cursor()
            c.execute('INSERT INTO users (username, password) VALUES (?, ?)',
                     (username, password))
            conn.commit()
        return jsonify({'status': 'success'})
    except sqlite3.IntegrityError:
        return jsonify({'status': 'error', 'message': 'Username already exists'})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    with sqlite3.connect('typing_test.db') as conn:
        c = conn.cursor()
        c.execute('SELECT id, password FROM users WHERE username = ?', (username,))
        result = c.fetchone()
        
        if result and result[1] == password:  # In production, use proper password verification
            session['user_id'] = result[0]
            return jsonify({'status': 'success'})
    return jsonify({'status': 'error', 'message': 'Invalid credentials'})

@app.route('/get_text/<difficulty>')
def get_text(difficulty):
    if difficulty in TEXTS:
        text = random.choice(TEXTS[difficulty])
        return jsonify({'text': text})
    return jsonify({'error': 'Invalid difficulty level'})

@app.route('/save_result', methods=['POST'])
def save_result():
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Not logged in'})
        
    data = request.json
    with sqlite3.connect('typing_test.db') as conn:
        c = conn.cursor()
        c.execute('''INSERT INTO test_results 
                    (user_id, wpm, accuracy, difficulty, text_length, timestamp, mistakes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)''',
                 (session['user_id'], data['wpm'], data['accuracy'],
                  data['difficulty'], data['textLength'],
                  datetime.now(), data['mistakes']))
        conn.commit()
    return jsonify({'status': 'success'})

@app.route('/get_stats')
def get_stats():
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Not logged in'})
        
    with sqlite3.connect('typing_test.db') as conn:
        c = conn.cursor()
        # Get average WPM and accuracy
        c.execute('''SELECT AVG(wpm), AVG(accuracy), COUNT(*),
                    MAX(wpm), difficulty, AVG(mistakes)
                    FROM test_results 
                    WHERE user_id = ?
                    GROUP BY difficulty''', (session['user_id'],))
        stats = c.fetchall()
        
        # Get recent progress
        c.execute('''SELECT wpm, accuracy, timestamp, difficulty
                    FROM test_results 
                    WHERE user_id = ?
                    ORDER BY timestamp DESC LIMIT 10''', (session['user_id'],))
        recent = c.fetchall()
        
    return jsonify({
        'stats': [{'avg_wpm': row[0], 'avg_accuracy': row[1],
                  'tests_taken': row[2], 'max_wpm': row[3],
                  'difficulty': row[4], 'avg_mistakes': row[5]} for row in stats],
        'recent': [{'wpm': row[0], 'accuracy': row[1],
                   'timestamp': row[2], 'difficulty': row[3]} for row in recent]
    })

if __name__ == '__main__':
    init_db()
    app.run(debug=True)