// ================================
// AYO ABC — Alfabetsspel för barn
// ================================

'use strict';

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

// Regnbågsfärger för tangenterna
const KEY_COLORS = [
  '#FF6B6B','#FF8C42','#FFC914','#A9E34B','#69DB7C',
  '#38D9A9','#4DABF7','#748FFC','#9775FA','#DA77F2',
  '#FF6B9D','#FF8C42',
];

// --- Skärmhantering ---

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showParentScreen() {
  showScreen('parent-screen');
  const inp = document.getElementById('parent-input');
  inp.value = '';
  setTimeout(() => inp.focus(), 80);
}

// --- Starta spelet ---

function startGame() {
  const raw = document.getElementById('parent-input').value.trim().toUpperCase();
  if (!raw) {
    triggerShake(document.getElementById('parent-input'));
    return;
  }

  state.targetText     = raw;
  state.currentIndex   = 0;
  state.wrongAttempts  = 0;
  state.totalLetters   = [...raw].filter(c => c !== ' ').length;
  state.correctLetters = 0;

  buildWordDisplay();
  buildKeyboard();
  updateProgress();
  skipSpaces();
  setCurrentBox();
  setKeyHint();

  showScreen('game-screen');
}

// Hoppa över mellanslag automatiskt
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
      btn.className  = 'key';
      btn.dataset.letter = letter;
      btn.setAttribute('aria-label', `Bokstav ${letter}`);
      btn.textContent = letter;

      const color = KEY_COLORS[ci % KEY_COLORS.length];
      btn.style.backgroundColor = color;
      btn.style.boxShadow = `0 5px 0 ${darkenHex(color)}`;

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

function setKeyHint(strong = false) {
  document.querySelectorAll('.key').forEach(k => k.classList.remove('hint','hint-strong'));
  if (state.currentIndex >= state.targetText.length) return;

  const target = state.targetText[state.currentIndex];
  const key = document.querySelector(`.key[data-letter="${target}"]`);
  if (key) key.classList.add(strong ? 'hint-strong' : 'hint');
}

// --- Tangenthantering ---

function pressKey(letter, btn) {
  // Spela alltid upp bokstavsljudet
  speakLetter(letter);

  if (state.currentIndex >= state.targetText.length) return;

  // Visuell animation på tangenten
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
    // Slumpmässig glad färg per bokstav
    const hue = Math.floor(Math.random() * 360);
    box.style.background = `hsl(${hue}, 65%, 55%)`;
    box.classList.remove('current','wrong');
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

  // Efter 3 fel: stark ledtråd på tangenterna
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
  document.getElementById('celebration-word').textContent = state.targetText;
  showScreen('celebration-screen');
  setTimeout(() => speakWord(state.targetText), 350);
  setTimeout(() => speakWord(state.targetText), 3200);
  launchConfetti();
}

function launchConfetti() {
  const COLORS  = ['#FF6B6B','#FFD43B','#69DB7C','#4DABF7','#FF8C42','#CC5DE8','#F06595','#FFA94D'];
  const SHAPES  = ['round','square','star'];
  const COUNT   = 200;

  for (let i = 0; i < COUNT; i++) {
    setTimeout(() => {
      const el    = document.createElement('div');
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      el.className = `confetti ${shape}`;

      const size = 8 + Math.random() * 13;
      el.style.cssText = [
        `left:${Math.random() * 100}vw`,
        `width:${size}px`,
        `height:${size}px`,
        `background:${COLORS[Math.floor(Math.random() * COLORS.length)]}`,
        `animation-duration:${2 + Math.random() * 2.2}s`,
        `transform:rotate(${Math.random() * 360}deg)`,
      ].join(';');

      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, i * 9);
  }
}

// --- Hjälpfunktioner ---

function triggerShake(el) {
  el.classList.remove('shake');
  void el.offsetWidth; // förce reflow
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
  showParentScreen();
  document.getElementById('parent-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') startGame();
  });
});
