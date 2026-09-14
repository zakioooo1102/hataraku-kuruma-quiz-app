const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const vehicles = JSON.parse(fs.readFileSync(path.join(root, 'data/vehicles.json')));
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function runtime(voices = []) {
  const calls = [];
  const context = vm.createContext({
    window: { speechSynthesis: {
      getVoices: () => voices,
      cancel: () => calls.push({ type: 'cancel' }),
      speak: utterance => calls.push({ type: 'speak', utterance }),
    } },
    document: { addEventListener() {} },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    vehicle: null,
  });
  vm.runInContext(source, context);
  return { context, calls, run: code => vm.runInContext(code, context) };
}

test('all 63 vehicles have unambiguous kana readings and existing images', () => {
  assert.equal(vehicles.length, 63);
  assert.equal(new Set(vehicles.map(v => v.id)).size, vehicles.length);
  for (const vehicle of vehicles) {
    assert.match(vehicle.speechName, /^[ァ-ヺー・]+$/, vehicle.id);
    assert.ok(fs.existsSync(path.join(root, vehicle.image)), vehicle.id);
  }
});

test('vehicle suffixes and difficult compounds keep the intended reading', () => {
  const expected = {
    shirobai: 'シロバイ', shikisha: 'シキシャ', hashigosha: 'ハシゴシャ',
    kyukyusha: 'キュウキュウシャ', kokidosha: 'コウキドウシャ',
    gomi_shusha: 'ゴミシュウシュウシャ', kosho_sagyo: 'コウショサギョウシャ',
    sowan_sagyo: 'ソウワンサギョウシャ', ido_kenketsu: 'イドウケンケツシャ',
    shobo_kyukyu: 'ショウボウキュウキュウシャ',
    concrete_mixer: 'コンクリートミキサーシャ', tarappu_sha: 'タラップシャ',
  };
  for (const [id, reading] of Object.entries(expected)) {
    assert.equal(vehicles.find(v => v.id === id).speechName, reading, id);
  }
});

test('every question passes its full kana reading to speech with no overlapping queue', () => {
  const r = runtime([{ name: 'Kyoko', lang: 'ja-JP' }]);
  for (const vehicle of vehicles) {
    r.context.vehicle = vehicle;
    r.run('speakQuestion(vehicle)');
    const { utterance } = r.calls.at(-1);
    assert.equal(r.calls.at(-2).type, 'cancel');
    assert.equal(utterance.text, `${vehicle.speechName}は、どこかな？`);
    assert.equal(utterance.lang, 'ja-JP');
    assert.equal(utterance.voice.lang, 'ja-JP');
    assert.equal(utterance.pitch, 1);
  }
});

test('foreign voices cannot win even with a preferred voice name', () => {
  const r = runtime([
    { name: 'Kyoko Premium', lang: 'en-US' },
    { name: 'Kyoko', lang: 'ja_JP' },
    { name: 'Kyoko Enhanced', lang: 'ja-JP' },
  ]);
  r.run('speak("テスト")');
  assert.equal(r.calls.at(-1).utterance.voice.name, 'Kyoko Enhanced');
});

test('voices arriving after initialization are picked up on playback', () => {
  const voices = [];
  const r = runtime(voices);
  r.run('initVoice()');
  voices.push({ name: 'Kyoko', lang: 'ja-JP' });
  r.run('speak("テスト")');
  assert.equal(r.calls.at(-1).utterance.voice.name, 'Kyoko');
});

test('mute prevents speech, and no Japanese voice still specifies Japanese', () => {
  const r = runtime([{ name: 'English', lang: 'en-US' }]);
  r.run('muted = true; speak("テスト")');
  assert.equal(r.calls.length, 0);
  r.run('muted = false; speak("テスト")');
  assert.equal(r.calls.at(-1).utterance.voice, undefined);
  assert.equal(r.calls.at(-1).utterance.lang, 'ja-JP');
});

test('missing or ambiguous readings fail loading rather than silently reverting to kanji', async () => {
  for (const invalid of [undefined, '', '救急車']) {
    const r = runtime();
    r.context.fetch = async () => ({ ok: true, json: async () => vehicles.map((v, i) => i ? v : { ...v, speechName: invalid }) });
    await assert.rejects(r.run('loadVehicles()'), /車データを確認/);
  }
});
