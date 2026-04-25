const QUESTION_COUNT = 5;

let vehicles = [];
let questions = [];
let currentIndex = 0;

// 配列をランダムに並び替えて新しい配列を返す（元の配列は変更しない）
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Web Speech API でテキストを日本語読み上げ
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'ja-JP';
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
}

// vehicles.json を fetch で読み込んで配列を返す
async function loadVehicles() {
  const res = await fetch('data/vehicles.json');
  if (!res.ok) throw new Error('vehicles.json の読み込みに失敗しました');
  return res.json();
}

// count 問分のクイズ配列を生成する
// 戻り値: [{ correct: vehicle, choices: [v1, v2, v3, v4] }, ...]
function generateQuiz(allVehicles, count) {
  const pool = shuffle(allVehicles);
  const correctVehicles = pool.slice(0, count);
  return correctVehicles.map(correct => {
    const others = shuffle(allVehicles.filter(v => v.id !== correct.id)).slice(0, 3);
    const choices = shuffle([correct, ...others]);
    return { correct, choices };
  });
}

// 指定インデックスの問題をDOMに描画しTTSで読み上げる
function renderQuestion(index) {
  const q = questions[index];
  document.getElementById('question-text').textContent = `${q.correct.name} は どれ？`;
  document.getElementById('progress').textContent = `問題 ${index + 1} / ${QUESTION_COUNT}`;

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

    card.appendChild(img);
    card.appendChild(label);
    card.addEventListener('click', () => handleTap(vehicle.id));
    grid.appendChild(card);
  });

  speak(`${q.correct.name} は どれ？`);
}

// 車カードがタップされた時の処理
function handleTap(tappedId) {
  const q = questions[currentIndex];
  const cards = document.querySelectorAll('.vehicle-card');
  const tappedCard = [...cards].find(c => c.dataset.id === tappedId);

  // 既にwrongマーク済みのカードは無視
  if (!tappedCard || tappedCard.classList.contains('wrong')) return;

  if (tappedId === q.correct.id) {
    // 正解
    tappedCard.classList.add('correct');
    tappedCard.querySelector('.card-label').textContent = `⭕️ ${q.correct.name}`;
    cards.forEach(c => { if (c.dataset.id !== tappedId) c.classList.add('dimmed'); });
    speak(`せいかい！ ${q.correct.name} だよ`);
    setTimeout(() => {
      currentIndex++;
      if (currentIndex >= QUESTION_COUNT) {
        showResult();
      } else {
        renderQuestion(currentIndex);
      }
    }, 1500);
  } else {
    // 不正解
    const vehicle = q.choices.find(v => v.id === tappedId);
    tappedCard.classList.add('wrong');
    tappedCard.querySelector('.card-label').textContent = `❌ ${vehicle.name}`;
    tappedCard.style.pointerEvents = 'none';
  }
}

// クイズセクションを隠して結果セクションを表示する
function showResult() {
  document.getElementById('quiz-section').classList.add('hidden');
  document.getElementById('result-section').classList.remove('hidden');
  speak('よくできました！');
}
