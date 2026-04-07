// ===== CONSTANTS =====
const STORAGE_KEY = 'ysh_progress';

const PHASE_SCHEDULE = [
  { id:'ph0', name:'Fondamenta',    start:1,   end:6,   color:'#9B7CF4' },
  { id:'ph1', name:'NestJS',        start:7,   end:34,  color:'#3DD6C8' },
  { id:'ph2', name:'Auth',          start:35,  end:48,  color:'#FF6B7A' },
  { id:'ph3', name:'Angular',       start:49,  end:90,  color:'#4A9EFF' },
  { id:'ph4', name:'Redis / LB',    start:91,  end:104, color:'#52D48A' },
  { id:'ph5', name:'BullMQ',        start:105, end:118, color:'#FF9F4A' },
  { id:'ph6', name:'Pagamenti',     start:119, end:132, color:'#4AC8FF' },
  { id:'ph7', name:'AWS S3',        start:133, end:144, color:'#F4C553' },
  { id:'ph8', name:'Docker/DevOps', start:145, end:165, color:'#4A9EFF' },
  { id:'ph9', name:'Testing',       start:166, end:181, color:'#9B7CF4' }
];
const TOTAL_DAYS = 181;

// ===== DATA LAYER =====
function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { version:2, startDate:null, progress:{} };
  } catch { return { version:2, startDate:null, progress:{} }; }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ===== IMPORT / EXPORT =====
function exportJSON() {
  const data = loadData();
  data.progress = collectProgress();
  data.exportedAt = new Date().toISOString();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        // Merge: keep structure, overwrite progress + startDate
        const current = loadData();
        current.progress = data.progress || {};
        if (data.startDate) current.startDate = data.startDate;
        saveData(current);
        applyProgress(current.progress);
        updateAll();
      } catch { alert('File JSON non valido'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ===== DATE PROMPT =====
function promptStartDate() {
  const data = loadData();
  const cur = data.startDate || new Date().toISOString().slice(0,10);
  const date = prompt('Data di inizio progetto (YYYY-MM-DD):', cur);
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    data.startDate = date;
    saveData(data);
    updateAll();
  }
}

// ===== CHECKBOXES =====
function collectProgress() {
  const progress = {};
  document.querySelectorAll('.phase-checkbox').forEach(cb => { progress[cb.id] = cb.checked; });
  return progress;
}

function applyProgress(progressData) {
  Object.entries(progressData || {}).forEach(([id, checked]) => {
    const cb = document.getElementById(id);
    if (cb) cb.checked = !!checked;
  });
}

function initCheckboxes() {
  const data = loadData();
  document.querySelectorAll('.day-tasks li').forEach((li, globalIdx) => {
    // Find phase class
    let phaseId = '';
    for (let i = 0; i <= 9; i++) {
      const el = li.closest('.ph' + i);
      if (el) { phaseId = 'ph' + i; break; }
    }
    const dayNum = li.closest('.day-row')?.querySelector('.day-number')?.textContent?.trim() || '0';
    const cbId = `${phaseId}-task-${dayNum}-${globalIdx}`;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = cbId;
    cb.className = 'phase-checkbox';
    cb.checked = !!(data.progress && data.progress[cbId]);

    cb.addEventListener('change', () => {
      const d = loadData();
      d.progress[cbId] = cb.checked;
      saveData(d);
      updateAll();
    });

    li.insertBefore(cb, li.firstChild);
  });
}

// ===== PROGRESS BAR =====
function updateProgress() {
  const phaseColors = ['purple','teal','rose','blue','green','orange','cyan','gold','blue','purple'];
  const phaseNames  = ['Fondamenta','NestJS','Auth','Angular','Redis/LB','BullMQ','Pagamenti','AWS S3','Docker/DevOps','Testing'];
  let totalDone = 0, totalAll = 0;
  const phaseStats = [];

  PHASE_SCHEDULE.forEach((ph, i) => {
    const boxes = document.querySelectorAll(`.${ph.id} .phase-checkbox`);
    const done  = [...boxes].filter(c => c.checked).length;
    const total = boxes.length;
    const pct   = total > 0 ? Math.round(done / total * 100) : 0;
    totalDone += done; totalAll += total;
    phaseStats.push({ done, total, pct, color: phaseColors[i], name: phaseNames[i] });
  });

  const totalPct = totalAll > 0 ? Math.round(totalDone / totalAll * 100) : 0;
  document.getElementById('totalPercentage').textContent = totalPct;
  document.getElementById('totalProgressBar').style.width = totalPct + '%';

  // Phase mini-bars
  const list = document.getElementById('phaseProgressList');
  list.innerHTML = '';
  phaseStats.forEach((s, i) => {
    const item = document.createElement('div');
    item.className = 'phase-progress-item';
    item.innerHTML = `
      <div class="phase-progress-name">${s.name}</div>
      <div class="phase-progress-bar">
        <div class="phase-progress-bar-fill" style="width:${s.pct}%;background:var(--${s.color})"></div>
      </div>
      <div class="phase-progress-value">${s.done}/${s.total} (${s.pct}%)</div>`;
    list.appendChild(item);
  });

  return { totalDone, totalAll, totalPct, phaseStats };
}

// ===== PLANNED VS ACTUAL =====
function updatePlannedVsActual(stats) {
  const { totalPct, totalAll, phaseStats } = stats;
  const data = loadData();
  const note = document.getElementById('pvaNote');
  const status = document.getElementById('pvaStatus');

  if (!data.startDate) {
    note.style.display = 'block';
    document.getElementById('plannedPct').textContent = '—';
    document.getElementById('actualPct').textContent = totalPct + '%';
    document.getElementById('actualBar').style.width = totalPct + '%';
    document.getElementById('plannedBar').style.width = '0%';
    status.textContent = '—';
    drawPvaSvg(0, totalPct);
    return;
  }

  note.style.display = 'none';
  const start   = new Date(data.startDate);
  const today   = new Date();
  const elapsed = Math.max(0, Math.floor((today - start) / 86400000));
  const plannedPct = Math.min(100, Math.round(elapsed / TOTAL_DAYS * 100));
  const delta = totalPct - plannedPct;
  const daysAhead = Math.round(delta / 100 * TOTAL_DAYS);

  document.getElementById('plannedPct').textContent = plannedPct + '%';
  document.getElementById('actualPct').textContent  = totalPct + '%';
  document.getElementById('plannedBar').style.width = plannedPct + '%';
  document.getElementById('actualBar').style.width  = totalPct + '%';

  if (delta > 2) {
    status.textContent = `▲ ${Math.abs(daysAhead)} giorni di anticipo`;
    status.style.color = '#52D48A';
  } else if (delta < -2) {
    status.textContent = `▼ ${Math.abs(daysAhead)} giorni di ritardo`;
    status.style.color = '#FF6B7A';
  } else {
    status.textContent = '✓ In linea con il piano';
    status.style.color = '#F4C553';
  }

  drawPvaSvg(plannedPct, totalPct);
}

function drawPvaSvg(planned, actual) {
  const svg = document.getElementById('pvaSvg');
  const W = 700, H = 80;

  // cumulative planned line: linear from 0 to 100 over TOTAL_DAYS
  // cumulative actual: flat at current percentage (we have only one data point)
  // Show a simple comparison bar chart
  const pad = 10;
  const barH = 28, gap = 8;
  const pW = Math.round((W - pad * 2) * planned / 100);
  const aW = Math.round((W - pad * 2) * actual / 100);

  svg.innerHTML = `
    <text x="${pad}" y="16" fill="#6B738A" font-size="9" font-family="JetBrains Mono, monospace" letter-spacing="1">PIANIFICATO</text>
    <rect x="${pad}" y="20" width="${W - pad*2}" height="${barH}" fill="rgba(255,255,255,0.05)" rx="3"/>
    <rect x="${pad}" y="20" width="${Math.max(pW,2)}" height="${barH}" fill="rgba(155,124,244,0.6)" rx="3"/>
    <text x="${pad + pW + 4}" y="39" fill="#9B7CF4" font-size="11" font-family="Syne, sans-serif" font-weight="700">${planned}%</text>

    <text x="${pad}" y="62" fill="#6B738A" font-size="9" font-family="JetBrains Mono, monospace" letter-spacing="1">COMPLETATO</text>
    <rect x="${pad}" y="66" width="${W - pad*2}" height="${barH}" fill="rgba(255,255,255,0.05)" rx="3"/>
    <rect x="${pad}" y="66" width="${Math.max(aW,2)}" height="${barH}" fill="rgba(61,214,200,0.7)" rx="3"/>
    <text x="${pad + aW + 4}" y="85" fill="#3DD6C8" font-size="11" font-family="Syne, sans-serif" font-weight="700">${actual}%</text>
  `;
  // adjust viewBox height
  svg.setAttribute('viewBox', `0 0 ${W} 100`);
  svg.setAttribute('height', '100');
}

// ===== GANTT CHART =====
function renderGantt() {
  const data = loadData();
  const inner = document.getElementById('ganttInner');

  // Per-phase task counts from DOM
  const phaseTaskCounts = {};
  const phaseDoneCountsMap = {};
  PHASE_SCHEDULE.forEach(ph => {
    const boxes = document.querySelectorAll(`.${ph.id} .phase-checkbox`);
    phaseTaskCounts[ph.id]   = boxes.length;
    phaseDoneCountsMap[ph.id] = [...boxes].filter(c => c.checked).length;
  });

  // Build per-day task data from checkbox IDs
  // ID format: ph0-task-DAYNUM-INDEX  (DAYNUM may be "10-11" for multi-day rows)
  const dayTaskMap = {}; // dayNum (int) -> { total, done }
  document.querySelectorAll('.phase-checkbox').forEach(cb => {
    const parts = cb.id.split('-task-');
    if (parts.length < 2) return;
    const dayRaw = parts[1].split('-')[0];
    const dayNum = parseInt(dayRaw);
    if (isNaN(dayNum)) return;
    if (!dayTaskMap[dayNum]) dayTaskMap[dayNum] = { total: 0, done: 0 };
    dayTaskMap[dayNum].total++;
    if (cb.checked) dayTaskMap[dayNum].done++;
  });

  // Today marker
  let todayDay = null;
  const todayLeg = document.getElementById('todayLegend');
  if (data.startDate) {
    const start = new Date(data.startDate);
    const today = new Date();
    todayDay = Math.max(1, Math.floor((today - start) / 86400000) + 1);
    if (todayDay <= TOTAL_DAYS) {
      todayLeg.style.display = '';
    }
  }

  const DAY_W  = 4;   // px per day
  const ROW_H  = 36;
  const LABEL_W = 100;
  const totalW = LABEL_W + TOTAL_DAYS * DAY_W;
  const totalH = PHASE_SCHEDULE.length * ROW_H + 32; // 32 for day axis

  // Build HTML (pure divs — faster than SVG for many elements)
  let html = `<div class="gantt-root" style="width:${totalW}px;height:${totalH}px;position:relative;">`;

  // Day axis ticks (every 7 days)
  for (let d = 1; d <= TOTAL_DAYS; d += 7) {
    const x = LABEL_W + (d - 1) * DAY_W;
    html += `<div class="gantt-tick" style="left:${x}px;top:0;height:${totalH}px;"></div>`;
    html += `<div class="gantt-tick-label" style="left:${x}px;top:${totalH - 16}px;">G${d}</div>`;
  }

  // Today line
  if (todayDay && todayDay <= TOTAL_DAYS) {
    const tx = LABEL_W + (todayDay - 1) * DAY_W;
    html += `<div class="gantt-today" style="left:${tx}px;top:0;height:${totalH - 16}px;"></div>`;
  }

  // Phase rows
  PHASE_SCHEDULE.forEach((ph, i) => {
    const y       = i * ROW_H + 4;
    const barX    = LABEL_W + (ph.start - 1) * DAY_W;
    const barW    = (ph.end - ph.start + 1) * DAY_W;
    const total   = phaseTaskCounts[ph.id] || 0;
    const done    = phaseDoneCountsMap[ph.id] || 0;
    const pct     = total > 0 ? done / total : 0;
    const doneW   = Math.round(barW * pct);

    html += `<div class="gantt-row-label" style="top:${y}px;left:0;width:${LABEL_W - 6}px;">${ph.name}</div>`;

    // Background bar (planned)
    html += `<div class="gantt-bar-bg" style="left:${barX}px;top:${y}px;width:${barW}px;height:${ROW_H - 10}px;background:${ph.color}22;border:1px solid ${ph.color}44;border-radius:3px;"></div>`;

    // Completion fill
    if (doneW > 0) {
      html += `<div class="gantt-bar-fill" style="left:${barX}px;top:${y}px;width:${doneW}px;height:${ROW_H - 10}px;background:${ph.color}bb;border-radius:3px 0 0 3px;"></div>`;
    }

    // Percentage label inside bar
    const label = total > 0 ? `${Math.round(pct*100)}%` : '';
    if (barW > 20) {
      html += `<div class="gantt-bar-label" style="left:${barX + 4}px;top:${y + 3}px;">${label}</div>`;
    }

    // Per-day task dots within the phase bar
    for (let d = ph.start; d <= ph.end; d++) {
      const dayInfo = dayTaskMap[d];
      if (!dayInfo || dayInfo.total === 0) continue;
      const dotX = LABEL_W + (d - 1) * DAY_W;
      const allDone = dayInfo.done === dayInfo.total;
      const someDone = dayInfo.done > 0;
      const dotColor = allDone ? '#52D48A' : someDone ? '#F4C553' : 'rgba(255,255,255,0.2)';
      html += `<div class="gantt-day-dot" title="Giorno ${d}: ${dayInfo.done}/${dayInfo.total} task" style="left:${dotX + 1}px;top:${y + ROW_H - 18}px;background:${dotColor};"></div>`;
    }
  });

  html += '</div>';
  inner.innerHTML = html;
}

// ===== MAIN UPDATE =====
function updateAll() {
  const stats = updateProgress();
  updatePlannedVsActual(stats);
  renderGantt();
}

// ===== TOGGLE (phase accordion) =====
function toggle(id) {
  document.getElementById(id)?.classList.toggle('open');
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initCheckboxes();

  document.getElementById('exportBtn').addEventListener('click', exportJSON);
  document.getElementById('importBtn').addEventListener('click', importJSON);

  updateAll();

  // Keep first phase open
  document.getElementById('ph0')?.classList.add('open');
});
