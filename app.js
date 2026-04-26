const QUESTION_COUNT = 5;

let vehicles = [];
let questions = [];
let currentIndex = 0;
let selectedVoice = null;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initVoice() {
  if (!window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  const preferred = ['Kyoko', 'O-ren', 'Google 日本語', 'Microsoft Nanami Online', 'Hattori'];
  for (const name of preferred) {
    const v = voices.find(v => v.name.includes(name));
    if (v) { selectedVoice = v; return; }
  }
  selectedVoice = voices.find(v => v.lang.startsWith('ja')) || null;
}

function playPinpon() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [[880, now, 0.35], [659, now + 0.28, 0.45]].forEach(([freq, start, dur]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.4, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start);
      osc.stop(start + dur);
    });
  } catch (e) {}
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'ja-JP';
  utt.rate = 0.85;
  utt.pitch = 1.1;
  if (selectedVoice) utt.voice = selectedVoice;
  window.speechSynthesis.speak(utt);
}

async function loadVehicles() {
  const res = await fetch('data/vehicles.json');
  if (!res.ok) throw new Error('vehicles.json の読み込みに失敗しました');
  return res.json();
}

function generateQuiz(allVehicles, count) {
  if (allVehicles.length < count) throw new Error(`車データが${count}件未満です`);
  if (allVehicles.length < 4) throw new Error('選択肢が4枚必要です');
  const pool = shuffle(allVehicles);
  const correctVehicles = pool.slice(0, count);
  return correctVehicles.map(correct => {
    const others = shuffle(allVehicles.filter(v => v.id !== correct.id)).slice(0, 3);
    const choices = shuffle([correct, ...others]);
    return { correct, choices };
  });
}

function renderQuestion(index) {
  const q = questions[index];
  document.getElementById('question-text').textContent = q.correct.name;
  document.getElementById('progress').textContent = `問題 ${index + 1} / ${questions.length}`;

  const grid = document.getElementById('vehicle-grid');
  grid.innerHTML = '';

  q.choices.forEach(vehicle => {
    const card = document.createElement('div');
    card.className = 'vehicle-card';
    card.dataset.id = vehicle.id;

    const img = document.createElement('img');
    img.src = vehicle.image;
    img.alt = vehicle.name;
    img.draggable = false;

    const label = document.createElement('div');
    label.className = 'card-label';

    img.onerror = () => {
      img.style.display = 'none';
      const fallback = document.createElement('span');
      fallback.textContent = '🚗';
      fallback.style.fontSize = '48px';
      card.insertBefore(fallback, label);
    };

    card.appendChild(img);
    card.appendChild(label);
    card.addEventListener('click', () => handleTap(vehicle.id));
    grid.appendChild(card);
  });

  speak(q.correct.name);
}

function handleTap(tappedId) {
  const q = questions[currentIndex];
  const cards = document.querySelectorAll('.vehicle-card');
  const tappedCard = [...cards].find(c => c.dataset.id === tappedId);

  if (!tappedCard || tappedCard.classList.contains('wrong')) return;

  if (tappedId === q.correct.id) {
    tappedCard.classList.add('correct');
    tappedCard.style.pointerEvents = 'none';
    tappedCard.querySelector('.card-label').textContent = `⭕️ ${q.correct.name}`;
    cards.forEach(c => { if (c.dataset.id !== tappedId) c.classList.add('dimmed'); });
    playPinpon();
    showCorrectOverlay(q.correct.name, q.correct.image);
  } else {
    const vehicle = q.choices.find(v => v.id === tappedId);
    tappedCard.classList.add('wrong');
    tappedCard.querySelector('.card-label').textContent = `❌ ${vehicle.name}`;
    tappedCard.style.pointerEvents = 'none';
  }
}

function showCorrectOverlay(name, image) {
  document.getElementById('correct-name').textContent = name;
  document.getElementById('correct-img').src = image;
  document.getElementById('quiz-section').classList.add('hidden');
  document.getElementById('correct-overlay').classList.remove('hidden');
}

function hideCorrectOverlay() {
  document.getElementById('correct-overlay').classList.add('hidden');
  currentIndex++;
  if (currentIndex >= questions.length) {
    showResult();
  } else {
    document.getElementById('quiz-section').classList.remove('hidden');
    renderQuestion(currentIndex);
  }
}

function showResult() {
  document.getElementById('result-section').classList.remove('hidden');
  speak('よくできました！');
}

function startQuiz() {
  currentIndex = 0;
  questions = generateQuiz(vehicles, QUESTION_COUNT);
  document.getElementById('home-section').classList.add('hidden');
  document.getElementById('quiz-section').classList.remove('hidden');
  document.getElementById('result-section').classList.add('hidden');
  document.getElementById('correct-overlay').classList.add('hidden');
  renderQuestion(currentIndex);
}

async function init() {
  try {
    if (vehicles.length === 0) {
      vehicles = await loadVehicles();
    }
  } catch (e) {
    console.error(e);
    document.body.innerHTML = '<p style="padding:2rem;font-size:24px;color:#ef4444;">データの読み込みに失敗しました。<br>サーバー経由でアクセスしてください。</p>';
    return;
  }
  startQuiz();
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = initVoice;
    initVoice();
  }

  document.getElementById('start-btn').addEventListener('click', () => {
    init(); // ユーザーアクション内で呼ぶことでiOS SafariのTTSが動作する
  });

  document.getElementById('speak-btn').addEventListener('click', () => {
    if (questions[currentIndex]) speak(questions[currentIndex].correct.name);
  });

  document.getElementById('next-btn').addEventListener('click', hideCorrectOverlay);

  document.getElementById('replay-btn').addEventListener('click', startQuiz);

  document.getElementById('home-btn').addEventListener('click', () => {
    document.getElementById('result-section').classList.add('hidden');
    document.getElementById('home-section').classList.remove('hidden');
  });
});
