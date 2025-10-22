// Balanced difficulty: moderate spawn rate, slower fall speeds, modest bad-drop chance.
// Big drop = +5, good drop = +1 (green), bad black drop = -1 (red).

const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const container = document.getElementById('game-container');

let score = 0;
let timeLeft = 30;
let spawnInterval = null;
let timerInterval = null;

// Difficulty tuning (middle) — make a couple values mutable so we can ramp difficulty
let spawnIntervalMs = 850;       // spawn interval (not too fast) — can be decreased to increase difficulty
const BIG_CHANCE = 0.12;         // chance for +5 big drop
let obstacleChance = 0.08;       // chance for obstacle that reduces score (will increase)
const BAD_CHANCE = 0.12;         // chance a regular drop is bad
const REGULAR_MIN_MS = 6000;     // regular drop fall min duration
const REGULAR_RAND_MS = 3000;    // plus random up to this
const BIG_MIN_MS = 8000;         // big drop fall min duration
const BIG_RAND_MS = 3000;        // plus random up to this

let difficultyLevel = 0;         // increments each time player collects a +5 big-drop
const OBSTACLE_INCR_PER_BIG = 0.02;   // how much obstacleChance increases per big-drop
const SPAWN_DECR_PER_BIG = 50;        // how much spawn interval reduces per big-drop (ms)
const OBSTACLE_CHANCE_MAX = 0.35;
const SPAWN_MS_MIN = 400;

startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', onReset);

// visual button feedback: excite start and make reset joyful
startBtn.addEventListener('click', () => {
  // short animated "excite" effect when pressed
  startBtn.classList.add('excited');
  setTimeout(() => startBtn.classList.remove('excited'), 900);
});

resetBtn.addEventListener('click', () => {
  resetBtn.classList.add('joy');
  setTimeout(() => resetBtn.classList.remove('joy'), 700);
});

function startGame() {
  if (spawnInterval || timerInterval) return; // already running
  resetGame();
  startBtn.disabled = true;
  startBtn.textContent = 'Playing...';

  spawnInterval = setInterval(spawnEntity, spawnIntervalMs);

  timerInterval = setInterval(() => {
    timeLeft--;
    timeEl.textContent = timeLeft;
    if (timeLeft <= 0) stopGame();
  }, 1000);
}

function resetGame() {
  clearIntervals();
  // reset difficulty when a new game starts or on manual reset
  difficultyLevel = 0;
  obstacleChance = 0.08;
  spawnIntervalMs = 850;

  score = 0;
  timeLeft = 30;
  scoreEl.textContent = score;
  timeEl.textContent = timeLeft;
  // remove any existing items
  container.querySelectorAll('.falling').forEach(n => n.remove());
}

function onReset() {
  // stop any running game and reset to initial state
  resetGame();
  // ensure start button is enabled for a fresh play
  startBtn.disabled = false;
  startBtn.textContent = 'Start Game';
  // small visual feedback
  pulseScore();
}

function clearIntervals() {
  if (spawnInterval) { clearInterval(spawnInterval); spawnInterval = null; }
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function stopGame() {
  clearIntervals();
  startBtn.disabled = false;
  startBtn.textContent = `Play Again (Score: ${score})`;
  container.querySelectorAll('.falling').forEach(n => n.remove());
  pulseScore();
}

/* Feedback helpers */
function pulseScore() {
  scoreEl.classList.add('score-update');
  setTimeout(() => scoreEl.classList.remove('score-update'), 300);
}

function showFloatingText(targetEl, value) {
  const txt = document.createElement('div');
  txt.className = 'float-text ' + (value > 0 ? 'positive' : 'negative');
  txt.textContent = (value > 0 ? `+${value}` : `${value}`);
  // position at center of target element
  const rect = targetEl.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const left = rect.left - containerRect.left + rect.width / 2;
  const top = rect.top - containerRect.top + rect.height / 2;
  txt.style.left = `${left}px`;
  txt.style.top = `${top}px`;
  container.appendChild(txt);
  setTimeout(() => txt.remove(), 900);
}

/* spawn drops and occasional big drops (+5) and obstacles (-2) */
function spawnEntity() {
  const el = document.createElement('div');
  el.classList.add('falling');

  const r = Math.random();
  if (r < BIG_CHANCE) {
    // big water drop (+5)
    el.classList.add('big-drop');
    el.dataset.value = 5;
    el.setAttribute('aria-label', 'Big water drop');
    el.innerText = '💧';
  } else if (r < BIG_CHANCE + obstacleChance) {
    // obstacle: reduces score when clicked (-2)
    el.classList.add('obstacle');
    el.dataset.value = -2;
    el.setAttribute('aria-label', 'Storm obstacle');
    el.innerText = '⛈️';
  } else {
    // regular drops: mostly good (+1), occasional bad (-1)
    el.classList.add('drop');
    if (Math.random() < BAD_CHANCE) {
      el.classList.add('bad');
      el.dataset.value = -1;
      el.innerText = '💧';
      el.setAttribute('aria-label', 'Bad drop');
    } else {
      el.classList.add('good');
      el.dataset.value = 1;
      el.innerText = '💧';
      el.setAttribute('aria-label', 'Good drop');
    }
  }

  // horizontal position inside the boxed container
  const containerWidth = container.clientWidth || 360;
  const elCssSize = el.classList.contains('big-drop')
    ? getComputedStyle(document.documentElement).getPropertyValue('--big-drop-size')
    : getComputedStyle(document.documentElement).getPropertyValue('--entity-size');
  const elWidth = parseSize(elCssSize) || (el.classList.contains('big-drop') ? 92 : 60);
  const maxLeft = Math.max(0, containerWidth - elWidth);
  el.style.left = `${Math.random() * maxLeft}px`;

  // fall duration (slower so a child or mouse can click)
  if (el.classList.contains('big-drop')) {
    const dur = BIG_MIN_MS + Math.random() * BIG_RAND_MS; // ~8-11s
    el.style.animationDuration = `${Math.round(dur)}ms`;
  } else if (el.classList.contains('obstacle')) {
    // obstacle moves a bit faster than regular drops to act as a challenge
    const dur = 5500 + Math.random() * 2500; // ~5.5-8s
    el.style.animationDuration = `${Math.round(dur)}ms`;
  } else {
    const dur = REGULAR_MIN_MS + Math.random() * REGULAR_RAND_MS; // ~6-9s
    el.style.animationDuration = `${Math.round(dur)}ms`;
  }

  // click to collect / hit (positive for good, negative for bad/obstacle)
  const onCollect = (e) => {
    e.stopPropagation();
    const val = parseInt(el.dataset.value || '0', 10);

    // update score
    score += val;
    scoreEl.textContent = score;

    // show colored floating text +1/ +5 (green) or negative (red)
    showFloatingText(el, val);
    pulseScore();

    if (val > 0) el.classList.add('collected-good');
    if (val < 0) el.classList.add('collected-bad');

    // if player collected a +5 big-drop, increase difficulty
    if (val === 5) {
      increaseDifficulty();
    }

    el.classList.add('collected');
    el.removeEventListener('click', onCollect);
    el.style.pointerEvents = 'none';
    setTimeout(() => el.remove(), 260);
  };
  el.addEventListener('click', onCollect);

  // remove when falls out (missed)
  el.addEventListener('animationend', () => el.remove());

  container.appendChild(el);
}

// Increase difficulty when player collects a big-drop (+5)
// - increases obstacleChance (more obstacles)
// - slightly shortens spawn interval (more items overall)
function increaseDifficulty() {
  difficultyLevel++;
  obstacleChance = Math.min(OBSTACLE_CHANCE_MAX, Number((obstacleChance + OBSTACLE_INCR_PER_BIG).toFixed(3)));
  spawnIntervalMs = Math.max(SPAWN_MS_MIN, spawnIntervalMs - SPAWN_DECR_PER_BIG);

  // if spawn interval is currently active, restart it with the new rate
  if (spawnInterval) {
    clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnEntity, spawnIntervalMs);
  }
}

/* helper: parse CSS value like "72px" or "clamp(...)" fallback */
function parseSize(cssValue) {
  if (!cssValue) return 0;
  const px = cssValue.trim().match(/([\d.]+)px/);
  if (px) return Number(px[1]);
  const num = cssValue.trim().match(/([\d.]+)/);
  return num ? Number(num[1]) : 0;
}
