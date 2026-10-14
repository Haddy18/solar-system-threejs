/* ═══ HUD: controles, panel de información, chips, ayuda ═════ */

import { ALL_BODIES } from './config.js';

const $ = (sel) => document.querySelector(sel);

/** valor del slider [0..100] → días por segundo [0,01 … 1000] */
export function sliderToDps(v) {
  return Math.pow(10, (v / 100) * 5 - 2);
}
export function dpsToSlider(dps) {
  return Math.max(0, Math.min(100, ((Math.log10(dps) + 2) / 5) * 100));
}

function fmtSpeed(dps) {
  if (dps < 1) {
    const h = dps * 24;
    return `${h < 10 ? h.toFixed(1) : Math.round(h)} h/s`;
  }
  if (dps < 400) return `${dps < 10 ? dps.toFixed(1) : Math.round(dps)} días/s`;
  const y = dps / 365.25;
  return `${y < 10 ? y.toFixed(1) : Math.round(y)} años/s`;
}

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric', month: 'short', year: 'numeric'
});
const timeFmt = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit', minute: '2-digit'
});

export class UI {
  /**
   * @param {object} h callbacks:
   *  onPlay, onSpeed(dps), onToday, onSelect(id), onToggle(name,val),
   *  onMode(real), onFollow, onRecenter, onDeselect
   */
  constructor(handlers) {
    this.h = handlers;

    this.playBtn = $('#btn-play');
    this.speed = $('#speed');
    this.speedLabel = $('#speed-label');
    this.dateEl = $('#sim-date');
    this.info = $('#info');
    this.chips = $('#chips');
    this.help = $('#help');
    this.loading = $('#loading');
    this.loadingBar = $('#loading-bar');
    this.loadingMsg = $('#loading-msg');
    this.badge = $('#mode-badge');
    this.hint = $('#hint');

    this.followBtn = $('#btn-follow');
    this._chipEls = new Map();

    this._bindTop();
    this._bindToggles();
    this._bindInfo();
    this._buildChips();
    this._bindHelp();
  }

  /* ── construcción ─────────────────────────────────────── */
  _buildChips() {
    for (const def of ALL_BODIES) {
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.dataset.id = def.id;
      btn.style.color = def.color;
      btn.innerHTML = `<i></i><span style="color:var(--txt)">${def.name}</span>`;
      btn.title = def.name;
      btn.addEventListener('click', () => this.h.onSelect(def.id));
      this.chips.appendChild(btn);
      this._chipEls.set(def.id, btn);
    }
  }

  _bindTop() {
    this.playBtn.addEventListener('click', () => this.h.onPlay());

    this.speed.addEventListener('input', () => {
      const dps = sliderToDps(+this.speed.value);
      this.speedLabel.textContent = fmtSpeed(dps);
      this.h.onSpeed(dps);
    });
    this.speedLabel.textContent = fmtSpeed(sliderToDps(+this.speed.value));

    $('#btn-today').addEventListener('click', () => this.h.onToday());
    $('#info-close').addEventListener('click', () => this.h.onDeselect());
  }

  _bindToggles() {
    const map = {
      'tg-orbits': 'orbits',
      'tg-labels': 'labels',
      'tg-belt': 'belt',
      'tg-clouds': 'clouds',
      'tg-bloom': 'bloom'
    };
    for (const [id, name] of Object.entries(map)) {
      const el = document.getElementById(id);
      el.addEventListener('change', () => this.h.onToggle(name, el.checked));
    }
    $('#tg-real').addEventListener('change', (e) => this.h.onMode(e.target.checked));
  }

  _bindInfo() {
    this.followBtn.addEventListener('click', () => this.h.onFollow());
    $('#btn-recenter').addEventListener('click', () => this.h.onRecenter());
  }

  _bindHelp() {
    $('#help-btn').addEventListener('click', () => this.toggleHelp());
  }

  toggleHelp(force) {
    const show = force !== undefined ? force : this.help.classList.contains('hidden');
    this.help.classList.toggle('hidden', !show);
  }

  /* ── estado ───────────────────────────────────────────── */
  setPlaying(playing) {
    this.playBtn.classList.toggle('paused', !playing);
    this.playBtn.title = playing ? 'Pausar (Espacio)' : 'Reanudar (Espacio)';
  }

  setSpeed(dps) {
    this.speed.value = String(Math.round(dpsToSlider(dps)));
    this.speedLabel.textContent = fmtSpeed(dps);
  }

  getSpeed() {
    return sliderToDps(+this.speed.value);
  }

  setDate(ms) {
    const d = new Date(ms);
    this.dateEl.textContent = `${dateFmt.format(d)} · ${timeFmt.format(d)}`;
  }

  setModeBadge(real) {
    this.badge.textContent = real ? 'escala real' : 'escala visual';
    $('#tg-real').checked = real;
  }

  setSelected(id) {
    for (const [cid, el] of this._chipEls) {
      el.classList.toggle('active', cid === id);
    }
  }

  setFollow(on) {
    this.followBtn.classList.toggle('active', on);
    this.followBtn.textContent = on ? 'Siguiendo' : 'Seguir';
  }

  /* ── panel de información ─────────────────────────────── */
  showInfo(def) {
    $('#info-name').textContent = def.name;
    $('#info-type').textContent = def.type;
    $('#info-dot').style.color = def.color;
    $('#info-desc').textContent = def.info.desc;

    const stats = $('#info-stats');
    stats.innerHTML = '';
    for (const [k, v] of Object.entries(def.info)) {
      if (k === 'desc' || k === 'facts') continue;
      const cell = document.createElement('div');
      cell.className = 'stat';
      cell.innerHTML = `<b>${v}</b><span>${k}</span>`;
      stats.appendChild(cell);
    }

    const ul = $('#info-facts');
    ul.innerHTML = '';
    for (const f of def.info.facts || []) {
      const li = document.createElement('li');
      li.textContent = f;
      ul.appendChild(li);
    }

    this.info.classList.remove('hidden');
    this.hideHint();
  }

  hideInfo() {
    this.info.classList.add('hidden');
  }

  /* ── carga y ayuda ────────────────────────────────────── */
  setProgress(p, msg) {
    this.loadingBar.style.width = `${Math.round(p * 100)}%`;
    if (msg) this.loadingMsg.textContent = msg;
  }

  hideLoading() {
    this.loading.classList.add('done');
    setTimeout(() => this.hideHintLater(), 4000);
  }

  hideHint() {
    this.hint.classList.add('hidden');
  }

  hideHintLater() {
    this.hideHint();
  }

  showFatal(msg) {
    this.loadingMsg.textContent = msg;
    this.loadingMsg.style.color = '#ff8a8a';
    this.loadingBar.style.width = '100%';
    this.loadingBar.style.background = '#ff5a5a';
  }
}
