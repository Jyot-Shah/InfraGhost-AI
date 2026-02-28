// HTML escape to prevent XSS
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// DOM helpers
const $ = (id) => document.getElementById(id);

// State
let stats = null;

// Fetch stats from API
async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('API error');
    stats = await res.json();
    renderAll();
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// Render all sections
function renderAll() {
  if (!stats) return;
  renderMetrics();
  renderGhostRate();
  renderFailingTypes();
  renderLocations();
  renderDate();
}

// Render metric cards
function renderMetrics() {
  $('metricTotal').textContent = stats.total_reports || 0;
  $('metricGhosts').textContent = stats.infra_ghosts || 0;
  $('metricPartial').textContent = stats.partial || 0;
  $('metricFunctional').textContent = stats.functional || 0;
}

// Render ghost percentage
function renderGhostRate() {
  const total = stats.total_reports || 0;
  const ghosts = stats.infra_ghosts || 0;
  const percent = total > 0 ? Math.round((ghosts / total) * 100) : 0;
  $('ghostPercentage').textContent = `${percent}%`;
}

// Render failing infrastructure types
function renderFailingTypes() {
  const container = $('failingTypes');
  const types = stats.top_failing_types || [];

  if (types.length === 0) {
    container.innerHTML = '<p class="empty-state">No data available yet</p>';
    return;
  }

  container.innerHTML = types.map(t => `
    <div class="failing-type-item">
      <div class="failing-type-name">
        <h4>${escapeHTML(capitalize(t.type))}</h4>
        <p>${Number(t.total)} reported • ${Number(t.ghosts)} ghosts</p>
      </div>
      <div class="failing-type-stats">
        <span class="failing-type-percent">${Number(t.ghost_percentage)}%</span>
        <span class="failing-type-label">failing</span>
      </div>
    </div>
  `).join('');
}

// Render affected locations
function renderLocations() {
  const container = $('affectedLocations');
  const locations = stats.affected_locations || [];

  if (locations.length === 0) {
    container.innerHTML = '<p class="empty-state">No InfraGhosts reported yet</p>';
    return;
  }

  container.innerHTML = locations.map((loc, i) => `
    <div class="location-item">
      <span class="location-rank">${i + 1}</span>
      <div class="location-info">
        <h4>${escapeHTML(loc.location)}</h4>
        <p>${Number(loc.ghost_count)} InfraGhosts</p>
      </div>
    </div>
  `).join('');
}

// Render current date
function renderDate() {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  $('reportDate').textContent = date;
}

// Capitalize first letter
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// PDF Download
function downloadPDF() {
  const content = $('reportContent');
  if (!content || typeof html2pdf === 'undefined') return;

  // Minimal, simple configuration
  const options = {
    margin: 10,
    filename: 'infraghost-authority-report.pdf',
    image: { type: 'jpeg', quality: 0.9 },
    html2canvas: {
      scale: 2,
      backgroundColor: '#ffffff'
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    }
  };

  html2pdf()
    .set(options)
    .from(content)
    .save()
    .catch(err => console.error('PDF error:', err));
}

// Initialize
function init() {
  fetchStats();
  setInterval(fetchStats, 60000);

  const btn = $('downloadBtn');
  if (btn) btn.addEventListener('click', downloadPDF);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { fetchStats, downloadPDF };
