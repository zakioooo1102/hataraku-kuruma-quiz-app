const QUESTION_COUNT = 5;

let vehicles = [];
let questions = [];
let currentIndex = 0;
let selectedVoice = null;
let muted = false;
let answered = false;
let audioContext;
const $ = id => document.getElementById(id);
function showScreen(id) {
  ['home-section','quiz-section','correct-overlay','result-section'].forEach(screen => $(screen).classList.toggle('hidden', screen !== id));
}
function goHome() {
  window.speechSynthesis?.cancel();
  showScreen('home-section');
  $('start-btn').focus();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Only Japanese voices are eligible; prefer enhanced voices when installed.
function initVoice() {
  if (!window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices().filter(v => /^ja(?:[-_]|$)/i.test(v.lang));
  const score = voice => {
    let value = 0;
    if (/premium|プレミアム/i.test(voice.name)) value += 100;
    else if (/enhanced|拡張/i.test(voice.name)) value += 80;
    if (/natural|neural|ナチュラル/i.test(voice.name)) value += 60;
    if (/Google 日本語|Nanami/i.test(voice.name)) value += 40;
    if (/Kyoko|Kyōko|O-ren/i.test(voice.name)) value += 20;
    if (voice.default) value += 1;
    return value;
  };
  selectedVoice = voices.sort((a, b) => score(b) - score(a))[0] || null;
}

function speakQuestion(vehicle) {
  // Standard spelling helps the engine recognize words; the UI stays child-friendly.
  speak(`${vehicle.speechName || vehicle.name}は、どこかな？`);
}

function playPinpon() {
  if (muted) return;
  try {
    const ctx = audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume();
    const now = ctx.currentTime;
    [[880, now, 0.35], [659, now + 0.28, 0.45]].forEach(([freq, start, dur]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start);
      osc.stop(start + dur);
    });
  } catch (e) {}
}

function speak(text) {
  if (!window.speechSynthesis || muted) return;
  window.speechSynthesis.cancel();
  initVoice();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'ja-JP';
  // Keep the original voice pitch; heavy slowing can make speech sound unnatural.
  utt.rate = 0.95;
  utt.pitch = 1.0;
  if (selectedVoice) utt.voice = selectedVoice;
  window.speechSynthesis.speak(utt);
}

async function loadVehicles() {
  const res = await fetch('data/vehicles.json');
  if (!res.ok) throw new Error('vehicles.json の読み込みに失敗しました');
  const data = await res.json();
  if (!Array.isArray(data) || data.length < QUESTION_COUNT || data.some(v => !v.id || !v.name || !v.image) || new Set(data.map(v => v.id)).size !== data.length) throw new Error('車データを確認してください');
  await Promise.all(data.map(v => new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = v.image;
    if (img.complete) resolve();
  })));
  return data;
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
  answered = false;
  const q = questions[index];
  document.getElementById('question-text').textContent = q.correct.name;
  $('question-count').textContent = `${index + 1} / ${questions.length}`;
  $('progress').setAttribute('aria-label', `${questions.length}もんちゅう ${index + 1}もんめ`);
  $('progress').innerHTML = questions.map((_, i) => `<span class="progress-stop ${i < index ? 'done' : i === index ? 'current' : ''}" aria-hidden="true"></span>`).join('');
  $('feedback').textContent = 'これかな？と おもったら タッチ！';

  const grid = document.getElementById('vehicle-grid');
  grid.innerHTML = '';

  q.choices.forEach(vehicle => {
    const card = document.createElement('button');
    card.type = 'button';
    card.setAttribute('aria-label', vehicle.name);
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
      fallback.textContent = vehicle.name;
      fallback.style.fontSize = '48px';
      card.insertBefore(fallback, label);
    };

    card.appendChild(img);
    card.appendChild(label);
    card.addEventListener('click', () => handleTap(vehicle.id));
    grid.appendChild(card);
  });

  $('question-text').focus({ preventScroll: true });
  speakQuestion(q.correct);
}

function handleTap(tappedId) {
  const q = questions[currentIndex];
  const cards = document.querySelectorAll('.vehicle-card');
  const tappedCard = [...cards].find(c => c.dataset.id === tappedId);

  if (answered || !tappedCard || tappedCard.disabled) return;

  if (tappedId === q.correct.id) {
    answered = true;
    window.speechSynthesis?.cancel();
    cards.forEach(c => c.disabled = true);
    tappedCard.classList.add('correct');
    tappedCard.style.pointerEvents = 'none';
    tappedCard.querySelector('.card-label').textContent = `⭕️ ${q.correct.name}`;
    cards.forEach(c => { if (c.dataset.id !== tappedId) c.classList.add('dimmed'); });
    playPinpon();
    showCorrectOverlay(q.correct.name, q.correct.image);
  } else {
    const vehicle = q.choices.find(v => v.id === tappedId);
    tappedCard.classList.add('wrong');
    tappedCard.querySelector('.card-label').textContent = vehicle.name;
    tappedCard.disabled = true;
    $('feedback').textContent = 'おしい！ ほかの くるまも みてみよう。';
    speak('おしい。もう一度、探してみよう。');
  }
}

function showCorrectOverlay(name, image) {
  document.getElementById('correct-name').textContent = name;
  document.getElementById('correct-img').src = image;
  $('correct-img').alt = name;
  $('next-btn').innerHTML = currentIndex === questions.length - 1 ? 'ゴールへ すすむ <span>★</span>' : 'つぎへ すすむ <span>▶</span>';
  document.getElementById('quiz-section').classList.add('hidden');
  document.getElementById('correct-overlay').classList.remove('hidden');
  $('correct-label').focus({ preventScroll: true });
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
  showScreen('result-section');
  $('collection').replaceChildren();
  questions.forEach(({correct}) => {
    const figure = document.createElement('figure');
    const img = document.createElement('img');
    img.src = correct.image;
    img.alt = '';
    const caption = document.createElement('figcaption');
    caption.textContent = correct.name;
    figure.append(img, caption);
    $('collection').append(figure);
  });
  $('result-title').focus({ preventScroll: true });
  speak('全部見つけたね。よくできました！');
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
  $('start-btn').disabled = true;
  $('start-btn').textContent = 'じゅんびちゅう…';
  try {
    vehicles = await loadVehicles();
    $('start-btn').innerHTML = 'はじめる <span>▶</span>';
    $('load-status').textContent = 'おとを きいて、くるまを タッチ。ぜんぶで 5もん！';
  } catch (e) {
    console.error(e);
    $('start-btn').textContent = 'もういちど よみこむ';
    $('load-status').textContent = 'くるまを よみこめなかったよ。もういちど おしてね。';
  }
  $('start-btn').disabled = false;
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = initVoice;
    initVoice();
  }
  $('start-btn').addEventListener('click', () => vehicles.length ? startQuiz() : init());
  $('speak-btn').addEventListener('click', () => {
    if (questions[currentIndex]) speakQuestion(questions[currentIndex].correct);
  });
  $('sound-btn').addEventListener('click', () => {
    muted = !muted;
    if (muted) window.speechSynthesis?.cancel();
    $('sound-btn').innerHTML = `おと ${muted ? 'OFF' : 'ON'} <span aria-hidden="true">♫</span>`;
    $('sound-btn').setAttribute('aria-label', muted ? 'おとを出す' : 'おとを消す');
    $('sound-btn').setAttribute('aria-pressed', String(muted));
    $('speak-btn').disabled = muted;
  });
  $('next-btn').addEventListener('click', () => { if (answered && !$('correct-overlay').classList.contains('hidden')) hideCorrectOverlay(); });
  $('replay-btn').addEventListener('click', startQuiz);
  $('home-btn').addEventListener('click', goHome);
  $('quit-btn').addEventListener('click', () => {
    window.speechSynthesis?.cancel();
    $('exit-dialog').showModal();
    $('continue-btn').focus();
  });
  $('continue-btn').addEventListener('click', () => $('exit-dialog').close());
  $('exit-btn').addEventListener('click', () => { $('exit-dialog').close(); goHome(); });
  document.querySelector('.brand').addEventListener('click', e => {
    e.preventDefault();
    if (!$('quiz-section').classList.contains('hidden') || !$('correct-overlay').classList.contains('hidden')) {
      window.speechSynthesis?.cancel();
      $('exit-dialog').showModal();
    } else goHome();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) window.speechSynthesis?.cancel(); });
  init();
});
