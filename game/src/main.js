// Sunset Cove — Spot the Difference.
// One cozy seaside café scene, drawn twice on a single canvas with vector
// shapes (no images, no network). The right-hand picture quietly changes
// seven things. Clicking a difference in either picture rings it in gold on
// both, ticks the counter down, and chimes; a wrong click leaves a red cross
// that fades. Find all seven to win.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const PANEL_W = 520;
const PANEL_H = 420;
const PANEL_Y = 30;
const LEFT_X = 20;
const RIGHT_X = 580;

// The seven differences. lx/ly is the spot in the left picture, rx/ry in the
// right one (they differ only for the moved cat); r is the click radius.
const DIFFS = [
  { name: 'sun colour',      lx: 88,  ly: 72,  rx: 88,  ry: 72,  r: 44 },
  { name: 'extra seagull',   lx: 252, ly: 58,  rx: 252, ry: 58,  r: 30 },
  { name: 'missing parasol', lx: 408, ly: 198, rx: 408, ry: 198, r: 46 },
  { name: 'sail colour',     lx: 148, ly: 238, rx: 148, ry: 238, r: 40 },
  { name: 'the cat moved',   lx: 66,  ly: 312, rx: 138, ry: 312, r: 30 },
  { name: 'missing starfish',lx: 258, ly: 382, rx: 258, ry: 382, r: 26 },
  { name: 'lighthouse lamp', lx: 36,  ly: 150, rx: 36,  ry: 150, r: 28 },
];

const state = {
  found: new Set(),
  misses: 0,
  missMarks: [], // {x, y, panel, until}
  hintIdx: -1,
  hintUntil: 0,
  startedAt: Date.now(),
  frozenClock: null,
  won: false,
};

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot === 'play') {
  for (const i of [0, 3, 5]) state.found.add(i);
  state.misses = 1;
  state.frozenClock = '1:24';
} else if (shot === 'end') {
  for (let i = 0; i < DIFFS.length; i++) state.found.add(i);
  state.misses = 2;
  state.frozenClock = '2:47';
  state.won = true;
}

// ---------- small drawing helpers ----------
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function circle(x, y, r, fill) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
}
function line(x1, y1, x2, y2, stroke, w) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = stroke; ctx.lineWidth = w; ctx.stroke();
}
function cloud(x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  for (const [dx, dy, r] of [[0, 0, 20], [18, -6, 26], [40, 0, 20], [20, 6, 24]]) {
    ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); ctx.fill();
  }
}
function gull(x, y, s, colour) {
  ctx.strokeStyle = colour; ctx.lineWidth = 2.4 * s; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 13 * s, y);
  ctx.quadraticCurveTo(x - 5 * s, y - 8 * s, x, y);
  ctx.quadraticCurveTo(x + 5 * s, y - 8 * s, x + 13 * s, y);
  ctx.stroke();
}
function starfish(x, y, r, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const a2 = a + Math.PI / 5;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(a2) * r * 0.48, y + Math.sin(a2) * r * 0.48);
  }
  ctx.closePath(); ctx.fill();
  circle(x, y, r * 0.16, '#c7512f');
}
function cat(x, y, colour) {
  // Sitting cat, side-on: haunch, chest, head, ears, curled tail.
  ctx.fillStyle = colour;
  ctx.beginPath(); ctx.ellipse(x, y - 8, 13, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 3, y - 16, 8, 12, -0.25, 0, Math.PI * 2); ctx.fill();
  circle(x + 8, y - 30, 8, colour);
  ctx.beginPath();
  ctx.moveTo(x + 2, y - 36); ctx.lineTo(x + 4, y - 44); ctx.lineTo(x + 8, y - 37);
  ctx.moveTo(x + 10, y - 37); ctx.lineTo(x + 15, y - 43); ctx.lineTo(x + 16, y - 35);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = colour; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 11, y - 3);
  ctx.quadraticCurveTo(x - 22, y - 2, x - 20, y - 12);
  ctx.stroke();
  circle(x + 10.5, y - 31, 1.4, '#ffe9a8'); // eye glint
}

// ---------- the scene ----------
// variant: 0 = left (original), 1 = right (changed)
function drawScene(variant) {
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, 250);
  sky.addColorStop(0, '#7ec3e8'); sky.addColorStop(0.7, '#bfe3f2'); sky.addColorStop(1, '#ffe3b3');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, PANEL_W, 252);

  // sun — DIFFERENCE 1: warm gold on the left, coral on the right
  const sunColour = variant === 0 ? '#ffd23e' : '#ff8c66';
  ctx.strokeStyle = sunColour; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + 0.4;
    line(88 + Math.cos(a) * 44, 72 + Math.sin(a) * 44, 88 + Math.cos(a) * 54, 72 + Math.sin(a) * 54, sunColour, 4);
  }
  circle(88, 72, 36, sunColour);
  circle(88, 72, 30, variant === 0 ? '#ffe066' : '#ffa07e');

  cloud(170, 52, 0.9);
  cloud(330, 96, 0.7);
  cloud(428, 44, 0.8);

  gull(180, 96, 1, '#3d5a73');
  gull(205, 112, 0.7, '#3d5a73');
  // DIFFERENCE 2: an extra seagull drifts through the right picture only
  if (variant === 1) gull(252, 58, 1.15, '#274b63');

  // headland + lighthouse, far left
  ctx.fillStyle = '#8a9a5b';
  ctx.beginPath();
  ctx.moveTo(0, 252); ctx.lineTo(0, 196); ctx.quadraticCurveTo(30, 176, 62, 200);
  ctx.quadraticCurveTo(84, 216, 84, 252); ctx.closePath(); ctx.fill();
  // lighthouse tower
  ctx.fillStyle = '#f4f1e6'; ctx.fillRect(24, 158, 24, 52);
  ctx.fillStyle = '#d64545'; ctx.fillRect(24, 172, 24, 10); ctx.fillRect(24, 192, 24, 10);
  ctx.fillStyle = '#5b4636'; ctx.fillRect(20, 148, 32, 10);
  // DIFFERENCE 7: the lamp is lit on the left, dark on the right
  if (variant === 0) {
    circle(36, 150, 13, 'rgba(255, 214, 90, 0.35)');
    circle(36, 150, 6, '#ffd23e');
  } else {
    circle(36, 150, 6, '#6b7a86');
  }

  // sea
  const sea = ctx.createLinearGradient(0, 252, 0, 330);
  sea.addColorStop(0, '#4f9ec4'); sea.addColorStop(1, '#2f6f9f');
  ctx.fillStyle = sea; ctx.fillRect(0, 252, PANEL_W, 78);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (const [x, y, w] of [[30, 272, 34], [120, 292, 44], [230, 268, 30], [300, 300, 40], [420, 282, 36], [70, 312, 30], [380, 314, 30]]) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w / 2, y - 5, x + w, y); ctx.stroke();
  }

  // boat — DIFFERENCE 4: white sail on the left, red sail on the right
  line(148, 288, 148, 208, '#6b4a2f', 4);
  ctx.fillStyle = variant === 0 ? '#ffffff' : '#e23b3b';
  ctx.beginPath();
  ctx.moveTo(148, 212); ctx.lineTo(148, 272); ctx.lineTo(196, 272); ctx.closePath(); ctx.fill();
  ctx.fillStyle = variant === 0 ? '#ffe9a8' : '#ffd2d2';
  ctx.beginPath();
  ctx.moveTo(144, 224); ctx.lineTo(144, 272); ctx.lineTo(112, 272); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e2703a';
  ctx.beginPath();
  ctx.moveTo(148, 208); ctx.lineTo(168, 214); ctx.lineTo(148, 220); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7a4a21';
  ctx.beginPath();
  ctx.moveTo(104, 288); ctx.lineTo(204, 288); ctx.lineTo(188, 306); ctx.lineTo(118, 306); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#96613a'; ctx.fillRect(104, 288, 100, 5);

  // café building, right side
  ctx.fillStyle = '#fdf3d8'; ctx.fillRect(356, 168, 150, 140);
  ctx.fillStyle = '#b8552f';
  ctx.beginPath();
  ctx.moveTo(346, 170); ctx.lineTo(431, 128); ctx.lineTo(516, 170); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a3d20'; ctx.fillRect(424, 128, 14, 20); // chimney
  // striped awning
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? '#f4f1e6' : '#d64545';
    ctx.beginPath();
    ctx.moveTo(362 + i * 23, 196); ctx.lineTo(385 + i * 23, 196);
    ctx.lineTo(379 + i * 23, 212); ctx.lineTo(368 + i * 23, 212);
    ctx.closePath(); ctx.fill();
  }
  // window + door
  rr(376, 228, 40, 44, 4); ctx.fillStyle = '#a8d4ea'; ctx.fill();
  line(396, 228, 396, 272, '#5b4636', 3); line(376, 250, 416, 250, '#5b4636', 3);
  rr(452, 224, 34, 84, 5); ctx.fillStyle = '#7a4a21'; ctx.fill();
  circle(480, 268, 3, '#ffd23e');
  // sign
  rr(398, 138, 66, 22, 6); ctx.fillStyle = '#274b63'; ctx.fill();
  ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 14px Georgia'; ctx.textAlign = 'center';
  ctx.fillText('CAFÉ', 431, 154);

  // terrace + table
  ctx.fillStyle = '#c98d5e'; ctx.fillRect(330, 308, 190, 10);
  line(408, 300, 408, 336, '#5b4636', 4);
  ctx.fillStyle = '#f4f1e6';
  ctx.beginPath(); ctx.ellipse(408, 300, 30, 7, 0, 0, Math.PI * 2); ctx.fill();
  // ice-cream cone on the table (same in both — a decoy)
  ctx.fillStyle = '#d99a4e';
  ctx.beginPath(); ctx.moveTo(398, 288); ctx.lineTo(408, 288); ctx.lineTo(403, 300); ctx.closePath(); ctx.fill();
  circle(403, 284, 7, '#ff9fb2');
  circle(403, 276, 3, '#d64545');
  // chairs
  ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 3.5;
  line(362, 306, 362, 336, '#5b4636', 3.5); line(362, 306, 376, 306, '#5b4636', 3.5); line(376, 306, 376, 336, '#5b4636', 3.5); line(362, 318, 376, 318, '#5b4636', 3.5);
  line(442, 306, 442, 336, '#5b4636', 3.5); line(442, 306, 456, 306, '#5b4636', 3.5); line(456, 306, 456, 336, '#5b4636', 3.5);
  // DIFFERENCE 3: the parasol shades the table on the left only
  if (variant === 0) {
    line(408, 300, 408, 196, '#8a5a33', 3.5);
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.moveTo(356, 200); ctx.quadraticCurveTo(408, 158, 460, 200);
    ctx.quadraticCurveTo(434, 188, 408, 200); ctx.quadraticCurveTo(382, 188, 356, 200);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e2703a';
    ctx.beginPath();
    ctx.moveTo(382, 192); ctx.quadraticCurveTo(408, 168, 434, 192);
    ctx.quadraticCurveTo(420, 184, 408, 192); ctx.quadraticCurveTo(396, 184, 382, 192);
    ctx.closePath(); ctx.fill();
  }

  // harbour wall the cat sits on
  ctx.fillStyle = '#9b8d7a'; ctx.fillRect(0, 318, 330, 16);
  ctx.fillStyle = '#7d7160'; ctx.fillRect(0, 318, 330, 4);
  ctx.strokeStyle = 'rgba(60,50,40,0.35)'; ctx.lineWidth = 1.5;
  for (const x of [46, 108, 172, 236, 292]) line(x, 322, x, 334, 'rgba(60,50,40,0.35)', 1.5);
  // DIFFERENCE 5: the cat sits at the wall's left end, or further along it
  if (variant === 0) cat(66, 318, '#3a3f4a'); else cat(138, 318, '#3a3f4a');

  // sand
  const sand = ctx.createLinearGradient(0, 334, 0, PANEL_H);
  sand.addColorStop(0, '#f2d492'); sand.addColorStop(1, '#e3b96e');
  ctx.fillStyle = sand; ctx.fillRect(0, 334, PANEL_W, PANEL_H - 334);
  starfish(452, 372, 13, '#e2703a');
  // shells (decoys, same in both)
  ctx.fillStyle = '#fff3f6';
  ctx.beginPath(); ctx.arc(96, 386, 8, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#ffd2dc';
  ctx.beginPath(); ctx.arc(330, 398, 7, Math.PI, 0); ctx.fill();
  // DIFFERENCE 6: a second starfish on the left picture's sand only
  if (variant === 0) starfish(258, 382, 14, '#f2a03d');
  // grass tufts
  ctx.strokeStyle = '#6f9a4d'; ctx.lineWidth = 2.4;
  for (const x of [24, 300, 492]) {
    line(x, 420, x - 4, 404, '#6f9a4d', 2.4);
    line(x + 5, 420, x + 6, 402, '#6f9a4d', 2.4);
    line(x + 10, 420, x + 15, 406, '#6f9a4d', 2.4);
  }
}

// ---------- markers, HUD, loop ----------
function drawMarker(x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffb300'; ctx.lineWidth = 5; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(60,35,0,0.65)'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + r - 9, y - r - 13); ctx.lineTo(x + r - 4, y - r - 7); ctx.lineTo(x + r + 6, y - r - 17);
  ctx.stroke();
}

function render(now) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // labels
  ctx.fillStyle = '#fff7e6'; ctx.font = 'bold 17px Georgia'; ctx.textAlign = 'center';
  ctx.fillText('ORIGINAL', LEFT_X + PANEL_W / 2, 20);
  ctx.fillText('SPOT THE CHANGES', RIGHT_X + PANEL_W / 2, 20);

  for (const [panelX, variant] of [[LEFT_X, 0], [RIGHT_X, 1]]) {
    ctx.save();
    ctx.translate(panelX, PANEL_Y);
    ctx.beginPath(); rr(0, 0, PANEL_W, PANEL_H, 10); ctx.clip();
    drawScene(variant);
    // found markers on both pictures
    DIFFS.forEach((d, i) => {
      if (!state.found.has(i)) return;
      drawMarker(variant === 0 ? d.lx : d.rx, variant === 0 ? d.ly : d.ry, Math.min(d.r, 30));
    });
    // hint pulse
    if (state.hintIdx >= 0 && now < state.hintUntil) {
      const d = DIFFS[state.hintIdx];
      const pulse = 30 + Math.sin(now / 90) * 6;
      ctx.beginPath();
      ctx.arc(variant === 0 ? d.lx : d.rx, variant === 0 ? d.ly : d.ry, pulse, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5; ctx.stroke();
    }
    // miss crosses
    for (const m of state.missMarks) {
      if (m.panel !== variant || now > m.until) continue;
      ctx.strokeStyle = 'rgba(214,40,40,0.9)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x - 9, m.y - 9); ctx.lineTo(m.x + 9, m.y + 9);
      ctx.moveTo(m.x + 9, m.y - 9); ctx.lineTo(m.x - 9, m.y + 9);
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); rr(panelX, PANEL_Y, PANEL_W, PANEL_H, 10);
    ctx.strokeStyle = '#0e1838'; ctx.lineWidth = 3; ctx.stroke();
  }
  requestAnimationFrame(render);
}

function syncHud() {
  document.getElementById('remaining').textContent = String(DIFFS.length - state.found.size);
  document.getElementById('found').textContent = String(state.found.size);
  document.getElementById('misses').textContent = String(state.misses);
  if (state.won) {
    document.getElementById('winText').textContent =
      `Every difference spotted in ${state.frozenClock ?? document.getElementById('clock').textContent} with ${state.misses} mistake${state.misses === 1 ? '' : 's'}.`;
    document.getElementById('banner').style.display = 'flex';
  }
}

function tickClock() {
  if (state.frozenClock) { document.getElementById('clock').textContent = state.frozenClock; return; }
  if (state.won) return;
  const s = Math.floor((Date.now() - state.startedAt) / 1000);
  document.getElementById('clock').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
setInterval(tickClock, 500);

// ---------- sound (tiny WebAudio chimes, no files) ----------
let audio = null;
function tone(freqA, freqB, dur, type) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freqA, t);
    osc.frequency.exponentialRampToValueAtTime(freqB, t + dur);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(audio.destination);
    osc.start(t); osc.stop(t + dur);
  } catch { /* sound is a bonus, never a blocker */ }
}

// ---------- play ----------
function restart() {
  state.found.clear();
  state.misses = 0;
  state.missMarks = [];
  state.hintIdx = -1;
  state.won = false;
  state.frozenClock = null;
  state.startedAt = Date.now();
  document.getElementById('banner').style.display = 'none';
  syncHud(); tickClock();
}

canvas.addEventListener('click', (ev) => {
  if (state.won) return;
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  const px = (ev.clientX - rect.left) * sx;
  const py = (ev.clientY - rect.top) * sy;
  for (const [panelX, variant] of [[LEFT_X, 0], [RIGHT_X, 1]]) {
    const lx = px - panelX;
    const ly = py - PANEL_Y;
    if (lx < 0 || lx > PANEL_W || ly < 0 || ly > PANEL_H) continue;
    let hit = -1;
    DIFFS.forEach((d, i) => {
      if (state.found.has(i)) return;
      const cx = variant === 0 ? d.lx : d.rx;
      const cy = variant === 0 ? d.ly : d.ry;
      if (Math.hypot(lx - cx, ly - cy) <= d.r) hit = i;
    });
    if (hit >= 0) {
      state.found.add(hit);
      tone(740, 1320, 0.18, 'sine');
      if (state.found.size === DIFFS.length) {
        state.won = true;
        tone(523, 1046, 0.45, 'triangle');
      }
    } else {
      state.misses += 1;
      state.missMarks.push({ x: lx, y: ly, panel: variant, until: performance.now() + 650 });
      tone(220, 130, 0.16, 'square');
    }
    syncHud();
    return;
  }
});

function hint() {
  const left = DIFFS.map((d, i) => i).filter((i) => !state.found.has(i));
  if (!left.length) return;
  state.hintIdx = left[Math.floor(Math.random() * left.length)];
  state.hintUntil = performance.now() + 1400;
}
document.getElementById('hintBtn').addEventListener('click', hint);
document.getElementById('againBtn').addEventListener('click', restart);
document.getElementById('winBtn').addEventListener('click', restart);
window.addEventListener('keydown', (ev) => {
  if (ev.key === 'h' || ev.key === 'H') hint();
  if (ev.key === 'r' || ev.key === 'R') restart();
});

syncHud(); tickClock();
requestAnimationFrame(render);
