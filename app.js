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
