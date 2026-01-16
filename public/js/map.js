import { Utils, DOM, API, Events } from './utils.js';

const state = {
  map: null,
  reports: [],
  MAPBOX_TOKEN: '',
  colors: { InfraGhost: '#ef4444', Partial: '#f59e0b', Functional: '#10b981' }
};

async function initializeMap() {
  try {
    const configRes = await API.get('/api/config');
    state.MAPBOX_TOKEN = configRes.data.mapboxToken;

    if (!state.MAPBOX_TOKEN) {
      showTokenWarning();
      return;
    }

    mapboxgl.accessToken = state.MAPBOX_TOKEN;
    state.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [75.5637, 26.8415],
      zoom: 14.5,
      antialias: true,
    });

    state.map.addControl(new mapboxgl.NavigationControl(), 'top-left');
    state.map.addControl(new mapboxgl.FullscreenControl(), 'top-left');

    loadReports();
    setInterval(loadReports, 30000);
  } catch (error) {
    console.error('Map init error:', error);
  }
}

function showTokenWarning() {
  const warning = document.createElement('div');
  warning.style.cssText = `position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
    background: var(--error); color: white; padding: 16px 24px; border-radius: 8px; z-index: 20;`;
  warning.textContent = '⚠️ Mapbox token missing. Add MAPBOX_TOKEN to .env';
  document.body.appendChild(warning);
}

async function loadReports() {
  try {
    const response = await API.get('/api/reports');
    state.reports = response.data;
    renderMap();
    updateStats();
    renderSidebar();
  } catch (error) {
    console.error('Load reports error:', error);
  }
}

function renderMap() {
  if (!state.map) return;
  document.querySelectorAll('.marker-style').forEach((el) => el.parentElement?.remove());

  state.reports.forEach((report) => {
    const color = state.colors[report.analysis.ghost_level] || '#9ca3af';
    const el = document.createElement('div');
    el.className = `marker-style ${report.analysis.ghost_level.toLowerCase()}`;
    el.style.backgroundColor = color;
    el.innerHTML = report.analysis.ghost_level === 'InfraGhost' ? '👻' :
                   report.analysis.ghost_level === 'Partial' ? '?' : '✓';

    const popup = new mapboxgl.Popup({ offset: 25 });
    popup.setHTML(createPopupHTML(report));

    new mapboxgl.Marker(el)
      .setLngLat([report.longitude, report.latitude])
      .setPopup(popup)
      .addTo(state.map);
  });
}

function createPopupHTML(report) {
  const scoreClass = report.analysis.ghost_score >= 60 ? 'high' :
                    report.analysis.ghost_score > 30 ? 'medium' : 'low';
  return `
    <div class="popup-title">${getInfraTypeEmoji(report.infra_type)} ${report.infra_type.toUpperCase()}</div>
    <div class="popup-item"><strong>Status:</strong> ${report.analysis.ghost_level}</div>
    <div class="popup-item"><strong>Comment:</strong> ${report.comment}</div>
    <div class="popup-item"><strong>Analysis:</strong> ${report.analysis.reason}</div>
    <div class="ghost-score ${scoreClass}">Ghost Score: ${report.analysis.ghost_score}</div>
    <div class="popup-item" style="font-size: 12px; color: #666; margin-top: 8px;">
      📍 ${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}</div>
    <div class="popup-item" style="font-size: 12px; color: #999;">
      ${new Date(report.timestamp).toLocaleDateString()}</div>
  `;
}

function getInfraTypeEmoji(type) {
  return {water: '🚰', toilet: '🚽', streetlight: '💡', ramp: '♿'}[type] || '📍';
}

function updateStats() {
  const ghosts = state.reports.filter((r) => r.analysis.ghost_score >= 60);
  const partial = state.reports.filter((r) => r.analysis.ghost_level === 'Partial');
  const functional = state.reports.filter((r) => r.analysis.ghost_level === 'Functional');

  DOM.ById('totalReports').textContent = state.reports.length;
  DOM.ById('ghostCount').textContent = ghosts.length;
  DOM.ById('partialCount').textContent = partial.length;
  DOM.ById('functionalCount').textContent = functional.length;
}

function renderSidebar() {
  const listDiv = DOM.ById('reportsList');
  if (!listDiv) return;

  if (state.reports.length === 0) {
    listDiv.innerHTML = '<div class="no-reports">No reports yet</div>';
    return;
  }

  const sorted = [...state.reports].sort((a, b) => b.analysis.ghost_score - a.analysis.ghost_score);

  listDiv.innerHTML = sorted
    .map((r) => `
      <div class="report-item" onclick="window.mapFlyTo(${r.longitude}, ${r.latitude})">
        <div class="report-item-header">
          <div class="report-item-name">${getInfraTypeEmoji(r.infra_type)} ${r.infra_type}</div>
          <div class="report-item-score ${Utils.getStatusClass(r.analysis.ghost_level)}">${r.analysis.ghost_score}</div>
        </div>
        <div class="report-item-comment">"${r.comment}"</div>
        <div class="report-item-status">${r.analysis.ghost_level}</div>
      </div>
    `)
    .join('');
}

window.mapFlyTo = (lng, lat) => {
  if (state.map) {
    state.map.flyTo({ center: [lng, lat], zoom: 15, duration: 1000 });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMap);
} else {
  initializeMap();
}

export default { state, initializeMap, loadReports };
