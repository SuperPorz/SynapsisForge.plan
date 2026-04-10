// ===== CONSTANTS =====
const STORAGE_KEY = 'ysh_progress';

const PHASE_SCHEDULE = [
  { id:'ph0', name:'01 Setup/TS/DB',   start:1,   end:7,   color:'#9B7CF4' },
  { id:'ph1', name:'02 NestJS Core',   start:8,   end:24,  color:'#3DD6C8' },
  { id:'ph2', name:'03 Auth',          start:25,  end:35,  color:'#FF6B7A' },
  { id:'ph3', name:'04 Angular',       start:36,  end:56,  color:'#4A9EFF' },
  { id:'ph4', name:'05 Redis',         start:57,  end:66,  color:'#52D48A' },
  { id:'ph5', name:'06 BullMQ',        start:67,  end:77,  color:'#FF9F4A' },
  { id:'ph6', name:'07 Pagamenti',     start:78,  end:88,  color:'#4AC8FF' },
  { id:'ph7', name:'08 AWS/Deploy',    start:89,  end:100, color:'#F4C553' },
  { id:'ph8', name:'09 Testing/Sec',   start:101, end:111, color:'#4A9EFF' },
  { id:'ph9', name:'10 Portfolio',     start:112, end:125, color:'#9B7CF4' }
];
const TOTAL_DAYS = 125;

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
  const phaseNames  = ['01 Setup','02 NestJS','03 Auth','04 Angular','05 Redis','06 BullMQ','07 Pagamenti','08 Deploy','09 Testing','10 Portfolio'];
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

// ===== VELOCITY DASHBOARD (ex Planned vs Actual) =====
function updatePlannedVsActual(stats) {
  const { totalDone, totalAll, totalPct } = stats;
  const data = loadData();
  const container = document.getElementById('plannedVsActualBox');

  if (!data.startDate) {
    container.innerHTML = `
      <div class="pva-header">
        <div class="pva-title">&#9881; Velocità progressi & Fine Stimata</div>
        <div class="pva-status" id="pvaStatus">—</div>
      </div>
      <div class="pva-note" id="pvaNote">
        Imposta la data di inizio con il pulsante "Data Inizio" per attivare le stime di completamento.
      </div>`;
    return;
  }

  const start       = new Date(data.startDate);
  const today       = new Date();
  today.setHours(0,0,0,0);
  start.setHours(0,0,0,0);
  const daysElapsed = Math.max(1, Math.floor((today - start) / 86400000) + 1);
  const tasksRemaining = totalAll - totalDone;

  // Velocity: task/giorno reale
  const velocity = totalDone / daysElapsed; // task per giorno

  // Giorni ancora necessari al ritmo attuale
  const daysNeeded = velocity > 0 ? Math.ceil(tasksRemaining / velocity) : null;

  // Data fine stimata
  let estEndDate = null;
  let estEndStr  = '—';
  if (daysNeeded !== null) {
    estEndDate = new Date(today);
    estEndDate.setDate(estEndDate.getDate() + daysNeeded);
    estEndStr = estEndDate.toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'numeric' });
  }

  // Data fine pianificata
  const plannedEnd = new Date(start);
  plannedEnd.setDate(plannedEnd.getDate() + TOTAL_DAYS - 1);
  const plannedEndStr = plannedEnd.toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'numeric' });

  // Delta in giorni (stimata vs pianificata)
  let deltaStr = '—';
  let deltaColor = 'var(--gold)';
  let deltaIcon = '';
  if (estEndDate) {
    const deltaDays = Math.round((estEndDate - plannedEnd) / 86400000);
    if (deltaDays > 1) {
      deltaStr   = `+${deltaDays} giorni di ritardo`;
      deltaColor = '#FF6B7A';
      deltaIcon  = '▼';
    } else if (deltaDays < -1) {
      deltaStr   = `${Math.abs(deltaDays)} giorni di anticipo`;
      deltaColor = '#52D48A';
      deltaIcon  = '▲';
    } else {
      deltaStr   = 'In linea con il piano';
      deltaColor = '#F4C553';
      deltaIcon  = '✓';
    }
  }

  // Burn rate vs required rate
  const requiredVelocity = totalAll / TOTAL_DAYS;
  const velocityRatio    = velocity > 0 ? (velocity / requiredVelocity * 100).toFixed(0) : 0;
  const velocityColor    = velocity >= requiredVelocity ? '#52D48A' : velocity >= requiredVelocity * 0.8 ? '#F4C553' : '#FF6B7A';

  // % completato
  const pct = totalAll > 0 ? Math.round(totalDone / totalAll * 100) : 0;

  container.innerHTML = `
    <div class="pva-header">
      <div class="pva-title">&#9881; Velocitò progressi + Fine Stimata</div>
      <div class="pva-status" style="color:${deltaColor}">${deltaIcon} ${deltaStr}</div>
    </div>

    <div class="vel-grid">
      <!-- Fine stimata — card principale -->
      <div class="vel-card vel-card-main">
        <div class="vel-card-label">Fine stimata</div>
        <div class="vel-card-value vel-end-date" style="color:${deltaColor}">${estEndStr}</div>
        <div class="vel-card-sub">Pianificata: ${plannedEndStr}</div>
      </div>

      <!-- KPI secondari -->
      <div class="vel-kpi-group">
        <div class="vel-kpi">
          <div class="vel-kpi-label">Task completate</div>
          <div class="vel-kpi-value">${totalDone}<span class="vel-kpi-total">/${totalAll}</span></div>
        </div>
        <div class="vel-kpi">
          <div class="vel-kpi-label">Giorni trascorsi</div>
          <div class="vel-kpi-value">${daysElapsed}<span class="vel-kpi-total">/${TOTAL_DAYS}</span></div>
        </div>
        <div class="vel-kpi">
          <div class="vel-kpi-label">Giorni mancanti (stim.)</div>
          <div class="vel-kpi-value" style="color:${deltaColor}">${daysNeeded ?? '—'}</div>
        </div>
        <div class="vel-kpi">
          <div class="vel-kpi-label">Velocità attuale</div>
          <div class="vel-kpi-label"><small><i>task_fatte/Giorni_Trascorsi</i></small></div>
          <div class="vel-kpi-value" style="color:${velocityColor}">${velocity.toFixed(2)}<span class="vel-kpi-total"> t/g</span></div>
        </div>
      </div>
    </div>

    <!-- Burn bar: task completate vs rimanenti -->
    <div class="vel-burn-wrap">
      <div class="vel-burn-labels">
        <span style="color:var(--teal)">&#9632; completate ${pct}%</span>
        <span style="color:var(--muted)">&#9632; rimanenti ${100 - pct}%</span>
        <span style="color:${velocityColor};margin-left:auto">velocità: ${velocityRatio}% del ritmo richiesto</span>
      </div>
      <div class="vel-burn-bar">
        <div class="vel-burn-done" style="width:${pct}%"></div>
        <div class="vel-burn-pace" style="left:${Math.min(daysElapsed/TOTAL_DAYS*100,100)}%"></div>
      </div>
      <div class="vel-burn-axis">
        <span>Inizio</span>
        <span style="margin-left:auto">Fine piano</span>
      </div>
      <div style="position:relative;height:14px;font-size:10px;letter-spacing:0.06em;">
        <span style="position:absolute;left:${Math.min(daysElapsed/TOTAL_DAYS*100,100)}%;transform:translateX(-50%);color:var(--gold);white-space:nowrap;">Oggi</span>
      </div>
    </div>`;
}

// ===== GANTT CHART — Planned ghost + Real state primary =====
function renderGantt() {
  const data = loadData();
  const inner = document.getElementById('ganttInner');

  // --- Build per-day stats ---
  // dayTaskMap[dayNum] = { total, done, phaseIdx }
  const dayTaskMap = {};
  document.querySelectorAll('.phase-checkbox').forEach(cb => {
    const parts = cb.id.split('-task-');
    if (parts.length < 2) return;
    const phIdStr = parts[0];
    const dayNum  = parseInt(parts[1].split('-')[0]);
    if (isNaN(dayNum)) return;
    const phaseIdx = PHASE_SCHEDULE.findIndex(p => p.id === phIdStr);
    if (!dayTaskMap[dayNum]) dayTaskMap[dayNum] = { total:0, done:0, phaseIdx };
    dayTaskMap[dayNum].total++;
    if (cb.checked) dayTaskMap[dayNum].done++;
  });

  // --- Today marker (in project days) ---
  let todayDay = null;
  const todayLeg = document.getElementById('todayLegend');
  if (data.startDate) {
    const s = new Date(data.startDate); s.setHours(0,0,0,0);
    const t = new Date();               t.setHours(0,0,0,0);
    todayDay = Math.max(1, Math.floor((t - s) / 86400000) + 1);
    todayLeg.style.display = todayDay <= TOTAL_DAYS ? '' : 'none';
  } else {
    todayLeg.style.display = 'none';
  }

  // --- Estimated end line ---
  // velocity = doneTasksTotal / daysElapsed → daysNeeded = remaining / velocity
  let estEndDay = null;
  if (todayDay && todayDay >= 1) {
    let totalDone = 0, totalAll = 0;
    Object.values(dayTaskMap).forEach(d => { totalDone += d.done; totalAll += d.total; });
    const velocity = totalDone / todayDay;
    const remaining = totalAll - totalDone;
    if (velocity > 0) {
      estEndDay = todayDay + Math.ceil(remaining / velocity);
    }
  }

  const DAY_W   = 6;    // px per day — wider for better readability
  const ROW_H   = 34;
  const LABEL_W = 108;
  const AXIS_H  = 28;
  const totalW  = LABEL_W + TOTAL_DAYS * DAY_W;
  const totalH  = PHASE_SCHEDULE.length * ROW_H + AXIS_H;

  let html = `<div class="gantt-root" style="width:${totalW}px;height:${totalH}px;">`;

  // ── Week grid lines ──
  for (let d = 1; d <= TOTAL_DAYS; d += 7) {
    const x = LABEL_W + (d - 1) * DAY_W;
    html += `<div class="gantt-tick" style="left:${x}px;height:${totalH}px;"></div>`;
    html += `<div class="gantt-tick-label" style="left:${x + 2}px;top:${totalH - AXIS_H + 6}px;">G${d}</div>`;
  }

  // ── Phase rows ──
  PHASE_SCHEDULE.forEach((ph, i) => {
    const rowTop = i * ROW_H;
    const barTop = rowTop + 5;
    const barH   = ROW_H - 10;

    // Row label
    html += `<div class="gantt-row-label" style="top:${rowTop}px;width:${LABEL_W - 8}px;height:${ROW_H}px;">${ph.name}</div>`;

    // ── LAYER 1 (ghost): planned phase span ──
    const ghostX = LABEL_W + (ph.start - 1) * DAY_W;
    const ghostW = (ph.end - ph.start + 1) * DAY_W;
    html += `<div class="gantt-ghost-bar" style="left:${ghostX}px;top:${barTop}px;width:${ghostW}px;height:${barH}px;border-color:${ph.color}30;"></div>`;

    // ── LAYER 2 (primary): per-day actual state bars ──
    for (let d = ph.start; d <= ph.end; d++) {
      const info = dayTaskMap[d];
      const barX = LABEL_W + (d - 1) * DAY_W;
      const bW   = DAY_W - 1; // 1px gap between day cells

      if (!info || info.total === 0) {
        // No tasks on this day (shouldn't happen but guard)
        html += `<div class="gantt-day-cell gantt-day-empty" style="left:${barX}px;top:${barTop}px;width:${bW}px;height:${barH}px;"></div>`;
        continue;
      }

      const isPast   = todayDay && d < todayDay;
      const isToday  = todayDay && d === todayDay;
      const allDone  = info.done === info.total;
      const someDone = info.done > 0 && !allDone;
      const notDone  = info.done === 0;

      let cellClass, fillColor, tooltip;
      tooltip = `Giorno ${d}: ${info.done}/${info.total} task`;

      if (allDone) {
        // Completed: solid phase color
        cellClass = 'gantt-day-done';
        fillColor = ph.color;
      } else if (someDone) {
        // Partial
        cellClass = 'gantt-day-partial';
        fillColor = ph.color + '99';
      } else if (isToday) {
        // Today, not started
        cellClass = 'gantt-day-today-cell';
        fillColor = 'var(--gold)';
      } else if (isPast && notDone) {
        // Overdue
        cellClass = 'gantt-day-overdue';
        fillColor = 'var(--rose)';
      } else {
        // Future planned
        cellClass = 'gantt-day-future';
        fillColor = ph.color + '28';
      }

      html += `<div class="${cellClass}" title="${tooltip}" style="left:${barX}px;top:${barTop}px;width:${bW}px;height:${barH}px;background:${fillColor};"></div>`;

      // Partial fill overlay for someDone
      if (someDone) {
        const partH = Math.round(barH * info.done / info.total);
        html += `<div class="gantt-day-partial-fill" style="left:${barX}px;top:${barTop + barH - partH}px;width:${bW}px;height:${partH}px;background:${ph.color};"></div>`;
      }
    }

    // Phase % label at end of bar
    const allBoxes = document.querySelectorAll(`.${ph.id} .phase-checkbox`);
    const phaseDone  = [...allBoxes].filter(c=>c.checked).length;
    const phaseTotal = allBoxes.length;
    const phasePct   = phaseTotal > 0 ? Math.round(phaseDone/phaseTotal*100) : 0;
    if (ghostW > 28) {
      html += `<div class="gantt-phase-pct" style="left:${ghostX + ghostW + 2}px;top:${barTop + 2}px;color:${ph.color};">${phasePct}%</div>`;
    }
  });

  // ── Today line ──
  if (todayDay && todayDay <= TOTAL_DAYS + 10) {
    const tx = LABEL_W + (todayDay - 0.5) * DAY_W;
    html += `<div class="gantt-today" style="left:${tx}px;top:0;height:${totalH - AXIS_H}px;"></div>`;
    html += `<div class="gantt-today-label" style="left:${tx}px;top:${totalH - AXIS_H + 6}px;">oggi</div>`;
  }

  // ── Estimated end line ──
  if (estEndDay && estEndDay !== todayDay) {
    const ex = LABEL_W + (estEndDay - 0.5) * DAY_W;
    const clampedEx = Math.min(ex, totalW - 4);
    const isLate = estEndDay > TOTAL_DAYS;
    const estColor = isLate ? 'var(--rose)' : 'var(--green)';
    html += `<div class="gantt-est-line" style="left:${clampedEx}px;top:0;height:${totalH - AXIS_H}px;background:${estColor};"></div>`;
    html += `<div class="gantt-est-label" style="left:${clampedEx}px;top:${totalH - AXIS_H + 6}px;color:${estColor};">stima</div>`;
  }

  html += '</div>';
  inner.innerHTML = html;

  // ── Update legend ──
  const legEst = document.getElementById('estEndLegend');
  if (legEst && estEndDay) {
    legEst.style.display = '';
    const isLate = estEndDay > TOTAL_DAYS;
    legEst.querySelector('.gantt-leg-dot').style.background = isLate ? 'var(--rose)' : 'var(--green)';
  }
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
