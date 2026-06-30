// ===== CONSTANTS =====
const PHASE_SCHEDULE = [
  { id:'ph0', name:'01 Setup/TS/DB',   start:1, end:7,   color:'#9B7CF4' },
  { id:'ph1', name:'02 NestJS Core',   start:8, end:24,  color:'#3DD6C8' },
  { id:'ph2', name:'03 Auth',          start:25, end:35,  color:'#FF6B7A' },
  { id:'ph3', name:'04 Angular',       start:36, end:55,  color:'#4A9EFF' },
  { id:'ph4', name:'05 Redis',         start:56, end:65,  color:'#52D48A' },
  { id:'ph5', name:'06 BullMQ',        start:66, end:71,  color:'#FF9F4A' },
  { id:'ph6', name:'07 Pagamenti',     start:72, end:82,  color:'#4AC8FF' },
  { id:'ph7', name:'08 AWS/Deploy',    start:83, end:94, color:'#F4C553' },
  { id:'ph8', name:'09 Testing/Sec',   start:95, end:105, color:'#4A9EFF' },
  { id:'ph9', name:'10 Portfolio',     start:106, end:119, color:'#9B7CF4' }
];
const TOTAL_DAYS = 119;
const RAW_URL = 'https://raw.githubusercontent.com/SuperPorz/SynapsisForge.plan/main/progress_default.json';

// ===== APP STATE =====
let appData = { startDate: null, progress: {} };

// ===== INIT =====
async function inizializzaApplicazione() {
  initCheckboxes();
  try {
    const local = await fetch(`progress_default.json?t=${Date.now()}`);
    if (local.ok) {
      appData = await local.json();
    } else {
      throw new Error(`HTTP ${local.status}`);
    }
  } catch (localError) {
    console.warn('Local JSON fallito, provo GitHub:', localError);
    try {
      const remote = await fetch(`${RAW_URL}?t=${Date.now()}`);
      if (!remote.ok) throw new Error(`HTTP ${remote.status}`);
      appData = await remote.json();
    } catch (remoteError) {
      console.error('Anche GitHub fallito:', remoteError);
    }
  }
  applyProgress(appData.progress);
  updateAll();
}

// ===== CHECKBOXES =====
function initCheckboxes() {
  document.querySelectorAll('.day-tasks li').forEach((li, globalIdx) => {
    let phaseId = '';
    for (let i = 0; i <= 9; i++) {
      if (li.closest('.ph' + i)) { phaseId = 'ph' + i; break; }
    }
    const dayNum = li.closest('.day-row')?.querySelector('.day-number')?.textContent?.trim() || '0';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = `${phaseId}-task-${dayNum}-${globalIdx}`;
    cb.className = 'phase-checkbox';
    cb.checked = false;
    li.insertBefore(cb, li.firstChild);
  });
}

function applyProgress(progressData) {
  if (!progressData) return;
  document.querySelectorAll('.phase-checkbox').forEach(cb => {
    cb.checked = !!progressData[cb.id];
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

  const list = document.getElementById('phaseProgressList');
  list.innerHTML = '';
  phaseStats.forEach(s => {
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

// ===== VELOCITY DASHBOARD =====
function updatePlannedVsActual(stats) {
  const { totalDone, totalAll, totalPct } = stats;
  const container = document.getElementById('plannedVsActualBox');

  if (!appData.startDate) {
    container.innerHTML = `
      <div class="pva-header">
        <div class="pva-title">&#9881; Velocità progressi & Fine Stimata</div>
        <div class="pva-status" id="pvaStatus">—</div>
      </div>
      <div class="pva-note" id="pvaNote">
        Data di inizio non impostata nel JSON.
      </div>`;
    return;
  }

  const start       = new Date(appData.startDate);
  const today       = new Date();
  today.setHours(0,0,0,0);
  start.setHours(0,0,0,0);
  const daysElapsed = Math.max(1, Math.floor((today - start) / 86400000) + 1);
  const tasksRemaining = totalAll - totalDone;

  const velocity = totalDone / daysElapsed;
  const daysNeeded = velocity > 0 ? Math.ceil(tasksRemaining / velocity) : null;

  let estEndDate = null;
  let estEndStr  = '—';
  if (daysNeeded !== null) {
    estEndDate = new Date(today);
    estEndDate.setDate(estEndDate.getDate() + daysNeeded);
    estEndStr = estEndDate.toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'numeric' });
  }

  const plannedEnd = new Date(start);
  plannedEnd.setDate(plannedEnd.getDate() + TOTAL_DAYS - 1);
  const plannedEndStr = plannedEnd.toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'numeric' });

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

  const requiredVelocity = totalAll / TOTAL_DAYS;
  const velocityRatio    = velocity > 0 ? (velocity / requiredVelocity * 100).toFixed(0) : 0;
  const velocityColor    = velocity >= requiredVelocity ? '#52D48A' : velocity >= requiredVelocity * 0.8 ? '#F4C553' : '#FF6B7A';
  const pct = totalAll > 0 ? Math.round(totalDone / totalAll * 100) : 0;

  container.innerHTML = `
    <div class="pva-header">
      <div class="pva-title">&#9881; Velocità progressi + Fine Stimata</div>
      <div class="pva-status" style="color:${deltaColor}">${deltaIcon} ${deltaStr}</div>
    </div>

    <div class="vel-grid">
      <div class="vel-card vel-card-main">
        <div class="vel-card-label">Fine stimata</div>
        <div class="vel-card-value vel-end-date" style="color:${deltaColor}">${estEndStr}</div>
        <div class="vel-card-sub">Pianificata: ${plannedEndStr}</div>
      </div>

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

// ===== GANTT CHART =====
function renderGantt() {
  const inner = document.getElementById('ganttInner');

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

  let todayDay = null;
  const todayLeg = document.getElementById('todayLegend');
  if (appData.startDate) {
    const s = new Date(appData.startDate); s.setHours(0,0,0,0);
    const t = new Date();                  t.setHours(0,0,0,0);
    todayDay = Math.max(1, Math.floor((t - s) / 86400000) + 1);
    todayLeg.style.display = todayDay <= TOTAL_DAYS ? '' : 'none';
  } else {
    todayLeg.style.display = 'none';
  }

  let estEndDay = null;
  if (todayDay && todayDay >= 1) {
    let totalDone = 0, totalAll = 0;
    Object.values(dayTaskMap).forEach(d => { totalDone += d.done; totalAll += d.total; });
    const velocity = totalDone / todayDay;
    const remaining = totalAll - totalDone;
    if (velocity > 0) estEndDay = todayDay + Math.ceil(remaining / velocity);
  }

  const DAY_W   = 6;
  const ROW_H   = 34;
  const LABEL_W = 108;
  const AXIS_H  = 28;
  const totalW  = LABEL_W + TOTAL_DAYS * DAY_W;
  const totalH  = PHASE_SCHEDULE.length * ROW_H + AXIS_H;

  let html = `<div class="gantt-root" style="width:${totalW}px;height:${totalH}px;">`;

  for (let d = 1; d <= TOTAL_DAYS; d += 7) {
    const x = LABEL_W + (d - 1) * DAY_W;
    html += `<div class="gantt-tick" style="left:${x}px;height:${totalH}px;"></div>`;
    html += `<div class="gantt-tick-label" style="left:${x + 2}px;top:${totalH - AXIS_H + 6}px;">G${d}</div>`;
  }

  PHASE_SCHEDULE.forEach((ph, i) => {
    const rowTop = i * ROW_H;
    const barTop = rowTop + 5;
    const barH   = ROW_H - 10;

    html += `<div class="gantt-row-label" style="top:${rowTop}px;width:${LABEL_W - 8}px;height:${ROW_H}px;">${ph.name}</div>`;

    const ghostX = LABEL_W + (ph.start - 1) * DAY_W;
    const ghostW = (ph.end - ph.start + 1) * DAY_W;
    html += `<div class="gantt-ghost-bar" style="left:${ghostX}px;top:${barTop}px;width:${ghostW}px;height:${barH}px;border-color:${ph.color}30;"></div>`;

    for (let d = ph.start; d <= ph.end; d++) {
      const info = dayTaskMap[d];
      const barX = LABEL_W + (d - 1) * DAY_W;
      const bW   = DAY_W - 1;

      if (!info || info.total === 0) {
        html += `<div class="gantt-day-cell gantt-day-empty" style="left:${barX}px;top:${barTop}px;width:${bW}px;height:${barH}px;"></div>`;
        continue;
      }

      const isPast   = todayDay && d < todayDay;
      const isToday  = todayDay && d === todayDay;
      const allDone  = info.done === info.total;
      const someDone = info.done > 0 && !allDone;
      const notDone  = info.done === 0;
      const tooltip  = `Giorno ${d}: ${info.done}/${info.total} task`;

      let cellClass, fillColor;
      if (allDone) {
        cellClass = 'gantt-day-done';       fillColor = ph.color;
      } else if (someDone) {
        cellClass = 'gantt-day-partial';    fillColor = ph.color + '99';
      } else if (isToday) {
        cellClass = 'gantt-day-today-cell'; fillColor = 'var(--gold)';
      } else if (isPast && notDone) {
        cellClass = 'gantt-day-overdue';    fillColor = 'var(--rose)';
      } else {
        cellClass = 'gantt-day-future';     fillColor = ph.color + '28';
      }

      html += `<div class="${cellClass}" title="${tooltip}" style="left:${barX}px;top:${barTop}px;width:${bW}px;height:${barH}px;background:${fillColor};"></div>`;

      if (someDone) {
        const partH = Math.round(barH * info.done / info.total);
        html += `<div class="gantt-day-partial-fill" style="left:${barX}px;top:${barTop + barH - partH}px;width:${bW}px;height:${partH}px;background:${ph.color};"></div>`;
      }
    }

    const allBoxes  = document.querySelectorAll(`.${ph.id} .phase-checkbox`);
    const phaseDone = [...allBoxes].filter(c => c.checked).length;
    const phasePct  = allBoxes.length > 0 ? Math.round(phaseDone / allBoxes.length * 100) : 0;
    if (ghostW > 28) {
      html += `<div class="gantt-phase-pct" style="left:${ghostX + ghostW + 2}px;top:${barTop + 2}px;color:${ph.color};">${phasePct}%</div>`;
    }
  });

  if (todayDay && todayDay <= TOTAL_DAYS + 10) {
    const tx = LABEL_W + (todayDay - 0.5) * DAY_W;
    html += `<div class="gantt-today" style="left:${tx}px;top:0;height:${totalH - AXIS_H}px;"></div>`;
    html += `<div class="gantt-today-label" style="left:${tx}px;top:${totalH - AXIS_H + 6}px;">oggi</div>`;
  }

  if (estEndDay && estEndDay !== todayDay) {
    const ex        = LABEL_W + (estEndDay - 0.5) * DAY_W;
    const clampedEx = Math.min(ex, totalW - 4);
    const isLate    = estEndDay > TOTAL_DAYS;
    const estColor  = isLate ? 'var(--rose)' : 'var(--green)';
    html += `<div class="gantt-est-line" style="left:${clampedEx}px;top:0;height:${totalH - AXIS_H}px;background:${estColor};"></div>`;
    html += `<div class="gantt-est-label" style="left:${clampedEx}px;top:${totalH - AXIS_H + 6}px;color:${estColor};">stima</div>`;
  }

  html += '</div>';
  inner.innerHTML = html;

  const legEst = document.getElementById('estEndLegend');
  if (legEst && estEndDay) {
    legEst.style.display = '';
    legEst.querySelector('.gantt-leg-dot').style.background = estEndDay > TOTAL_DAYS ? 'var(--rose)' : 'var(--green)';
  }
}

// ===== MAIN UPDATE =====
function updateAll() {
  const stats = updateProgress();
  updatePlannedVsActual(stats);
  renderGantt();
}

// ===== EXPORT =====
function exportJSON() {
  const progress = {};
  document.querySelectorAll('.phase-checkbox').forEach(cb => {
    progress[cb.id] = cb.checked;
  });
  const data = {
    version: appData.version ?? 2,
    startDate: appData.startDate,
    progress,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'progress_default.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ===== TOGGLE =====
function toggle(id) {
  document.getElementById(id)?.classList.toggle('open');
}

// ===== BOOT =====
document.addEventListener('DOMContentLoaded', () => {
  inizializzaApplicazione();
  // Keep a chosen phase open — CAMBIARE FASE QUI
  document.getElementById('ph9')?.classList.add('open');
});