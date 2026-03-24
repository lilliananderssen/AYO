// ================================
// AYO ABC — Alfabetsspel för barn
// ================================

'use strict';

// --- Ordlista (föräldern fyller i) ---

let words = [];
let currentWordIndex = 0;

// --- Spelställning ---

const state = {
  targetText:     '',
  currentIndex:   0,
  wrongAttempts:  0,
  totalLetters:   0,
  correctLetters: 0,
};

// --- Tangentbordslayout (svensk QWERTY) ---

const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P','Å'],
  ['A','S','D','F','G','H','J','K','L','Ö','Ä'],
  ['Z','X','C','V','B','N','M'],
];

const KEY_COLORS = [
  '#FF6B6B','#FF8C42','#FFC914','#A9E34B','#69DB7C',
  '#38D9A9','#4DABF7','#748FFC','#9775FA','#DA77F2',
  '#FF6B9D','#FF8C42',
];

const CONFETTI_COLORS = [
  '#FF6B6B','#FFD43B','#69DB7C','#4DABF7',
  '#FF8C42','#CC5DE8','#F06595','#74C0FC',
];
const CONFETTI_SHAPES = ['round','square','star','ribbon'];

// --- Skärmhantering ---

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(id);
  void screen.offsetWidth; // starta om animationen
  screen.classList.add('active');
}

function showParentScreen() {
  showScreen('parent-screen');
  setTimeout(() => document.getElementById('word-input').focus(), 80);
}

// --- Föräldraskärm: lägg till / ta bort ord ---

function addWord() {
  const input = document.getElementById('word-input');
  const w = input.value.trim().toUpperCase();
  if (!w) {
    triggerShake(input);
    return;
  }
  words.push(w);
  input.value = '';
  input.focus();
  renderWordList();
}

function removeWord(index) {
  words.splice(index, 1);
  renderWordList();
}

function renderWordList() {
  const list = document.getElementById('word-list');
  list.innerHTML = '';

  words.forEach((w, i) => {
    const li = document.createElement('li');
    li.className = 'word-item';
    li.innerHTML = `
      <span class="word-item-text">${w}</span>
      <button class="btn-delete" onclick="removeWord(${i})" aria-label="Ta bort ${w}">🗑</button>
    `;
    list.appendChild(li);
  });

  // Visa/dölj startknapp
  const btn = document.getElementById('btn-starta');
  btn.classList.toggle('visible', words.length > 0);
}

// --- Starta spelomgång ---

function startSession() {
  if (words.length === 0) return;
  currentWordIndex = 0;
  loadWord(currentWordIndex);
}

function loadWord(index) {
  const word = words[index];

  state.targetText     = word;
  state.currentIndex   = 0;
  state.wrongAttempts  = 0;
  state.totalLetters   = [...word].filter(c => c !== ' ').length;
  state.correctLetters = 0;

  buildWordDisplay();
  buildKeyboard();
  updateProgress();
  skipSpaces();
  setCurrentBox();
  setKeyHint();

  document.getElementById('word-counter').textContent =
    `Ord ${index + 1}/${words.length}`;

  showScreen('game-screen');
}

// --- Hoppa över mellanslag ---

function skipSpaces() {
  while (
    state.currentIndex < state.targetText.length &&
    state.targetText[state.currentIndex] === ' '
  ) {
    state.currentIndex++;
  }
}

// --- Bygg ordvisning ---

function buildWordDisplay() {
  const container = document.getElementById('word-display');
  container.innerHTML = '';

  for (let i = 0; i < state.targetText.length; i++) {
    if (state.targetText[i] === ' ') {
      const sp = document.createElement('div');
      sp.className = 'word-spacer';
      container.appendChild(sp);
    } else {
      const box = document.createElement('div');
      box.className = 'letter-box';
      box.dataset.i = i;
      box.textContent = state.targetText[i];
      container.appendChild(box);
    }
  }
}

function getBox(i) {
  return document.querySelector(`.letter-box[data-i="${i}"]`);
}

function setCurrentBox() {
  document.querySelectorAll('.letter-box').forEach(b => b.classList.remove('current'));
  const box = getBox(state.currentIndex);
  if (box) box.classList.add('current');
}

// --- Bygg tangentbord ---

function darkenHex(hex, amount = 45) {
  const n = parseInt(hex.replace('#',''), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - amount);
  const g = Math.max(0, ((n >>  8) & 0xff) - amount);
  const b = Math.max(0, ( n        & 0xff) - amount);
  return `rgb(${r},${g},${b})`;
}

function buildKeyboard() {
  const keyboard = document.getElementById('keyboard');
  keyboard.innerHTML = '';

  let ci = 0;
  KEYBOARD_ROWS.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'kb-row';

    row.forEach(letter => {
      const btn = document.createElement('button');
      btn.className        = 'key';
      btn.dataset.letter   = letter;
      btn.textContent      = letter;
      btn.setAttribute('aria-label', `Bokstav ${letter}`);

      const color  = KEY_COLORS[ci % KEY_COLORS.length];
      const shadow = `0 5px 0 ${darkenHex(color)}`;
      btn.style.backgroundColor = color;
      btn.style.boxShadow       = shadow;
      btn.style.setProperty('--key-shadow', shadow);

      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        pressKey(letter, btn);
      });

      rowEl.appendChild(btn);
      ci++;
    });

    keyboard.appendChild(rowEl);
  });
}

// Markera nästa rätt tangent
function setKeyHint(strong = false) {
  document.querySelectorAll('.key').forEach(k => k.classList.remove('hint','hint-strong'));
  if (state.currentIndex >= state.targetText.length) return;

  const target = state.targetText[state.currentIndex];
  const key    = document.querySelector(`.key[data-letter="${target}"]`);
  if (key) key.classList.add(strong ? 'hint-strong' : 'hint');
}

// --- Tangenthantering ---

function pressKey(letter, btn) {
  speakLetter(letter);
  if (state.currentIndex >= state.targetText.length) return;

  if (btn) {
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 160);
  }

  if (letter === state.targetText[state.currentIndex]) {
    onCorrect();
  } else {
    onWrong();
  }
}

function onCorrect() {
  const box = getBox(state.currentIndex);
  if (box) {
    const hue = Math.floor(Math.random() * 360);
    box.style.background = `hsl(${hue}, 65%, 55%)`;
    box.classList.remove('current','wrong','shake');
    box.classList.add('filled');
  }

  state.correctLetters++;
  state.currentIndex++;
  state.wrongAttempts = 0;

  skipSpaces();
  updateProgress();

  if (state.currentIndex >= state.targetText.length) {
    setTimeout(celebrate, 520);
  } else {
    setCurrentBox();
    setKeyHint();
  }
}

function onWrong() {
  state.wrongAttempts++;
  const box = getBox(state.currentIndex);
  if (box) triggerShake(box);
  if (state.wrongAttempts >= 3) setKeyHint(true);
}

// --- Framstegsindikator ---

function updateProgress() {
  const pct = state.totalLetters > 0
    ? (state.correctLetters / state.totalLetters) * 100
    : 0;
  document.getElementById('progress-fill').style.width = `${pct}%`;
}

// --- Tal (Web Speech API) ---

const synth = window.speechSynthesis;

function speakLetter(letter) {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(letter);
  u.lang   = 'sv-SE';
  u.rate   = 0.8;
  u.pitch  = 1.3;
  u.volume = 1;
  synth.speak(u);
}

function speakWord(text) {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang   = 'sv-SE';
  u.rate   = 0.65;
  u.pitch  = 1.1;
  u.volume = 1;
  synth.speak(u);
}

// --- Firande ---

function celebrate() {
  speakWord(state.targetText);

  const isLastWord = currentWordIndex >= words.length - 1;

  if (isLastWord) {
    showFinalScreen();
  } else {
    showWordDoneScreen();
  }
}

function showWordDoneScreen() {
  document.getElementById('done-word-label').textContent = state.targetText;
  showScreen('word-done-screen');
  launchBurstConfetti();

  // Gå automatiskt vidare till nästa ord
  setTimeout(() => {
    currentWordIndex++;
    loadWord(currentWordIndex);
  }, 2400);
}

function showFinalScreen() {
  showScreen('final-screen');
  setTimeout(launchBurstConfetti, 100);
  setTimeout(launchFallingConfetti, 600);
  setTimeout(() => speakWord('Grattis'), 800);
}

// --- Konfetti ---

function launchBurstConfetti() {
  const count = 72;

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const el    = document.createElement('div');
      const shape = CONFETTI_SHAPES[i % CONFETTI_SHAPES.length];
      el.className = `confetti ${shape}`;

      const angle    = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed    = 100 + Math.random() * 240;
      const size     = 9 + Math.random() * 13;
      const duration = 0.65 + Math.random() * 0.55;

      el.style.left     = '50vw';
      el.style.top      = '50vh';
      el.style.width    = `${shape === 'ribbon' ? 5 : size}px`;
      el.style.height   = `${size}px`;
      el.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      el.style.setProperty('--bx',   `${Math.cos(angle) * speed}px`);
      el.style.setProperty('--by',   `${Math.sin(angle) * speed}px`);
      el.style.setProperty('--brot', `${(Math.random() - 0.5) * 720}deg`);
      el.style.animation = `confettiBurst ${duration}s ease-out forwards`;

      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, i * 7);
  }
}

function launchFallingConfetti() {
  const count = 160;

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const el    = document.createElement('div');
      const shape = CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)];
      el.className = `confetti ${shape} falling`;

      const size = 8 + Math.random() * 14;
      el.style.left             = `${Math.random() * 100}vw`;
      el.style.width            = `${shape === 'ribbon' ? 5 : size}px`;
      el.style.height           = `${size}px`;
      el.style.background       = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      el.style.animationDuration = `${2 + Math.random() * 2.4}s`;
      el.style.transform        = `rotate(${Math.random() * 360}deg)`;

      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, i * 9);
  }
}

// --- Kattfallback ---

function handleCatError(img) {
  const div = document.createElement('div');
  div.className   = 'cat-fallback';
  div.textContent = '🐱';
  img.parentNode.replaceChild(div, img);
}

// --- Hjälpfunktioner ---

function triggerShake(el) {
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
}

// --- Fysiskt tangentbord ---

document.addEventListener('keydown', e => {
  if (!document.getElementById('game-screen').classList.contains('active')) return;
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;

  const k = e.key.toUpperCase();
  if (/^[A-ZÅÄÖ]$/.test(k)) {
    e.preventDefault();
    const btn = document.querySelector(`.key[data-letter="${k}"]`);
    pressKey(k, btn);
  }
});

// --- Init ---

document.addEventListener('DOMContentLoaded', () => {
  showScreen('start-screen');

  document.getElementById('word-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addWord();
  });
});
