import { Utils, DOM, API, Events, Notify, Loading } from './utils.js';

const state = { userLocation: { latitude: null, longitude: null }, imageFile: null };

function initializeLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        updateLocationDisplay();
      },
      () => {
        const locationEl = DOM.ById('locationStatus');
        if (locationEl) {
          locationEl.innerHTML = '⚠️ Enable location in browser';
          locationEl.style.borderColor = 'var(--warning)';
        }
      }
    );
  }
}

function updateLocationDisplay() {
  const locationEl = DOM.ById('locationStatus');
  if (locationEl && state.userLocation.latitude) {
    locationEl.innerHTML = `📍 ${state.userLocation.latitude.toFixed(4)}, ${state.userLocation.longitude.toFixed(4)}`;
  }
}

function initializeImageUpload() {
  const imageDropZone = DOM.ById('imageDropZone');
  const imageInput = DOM.ById('imageInput');
  const imagePreview = DOM.ById('imagePreview');
  const imageLabel = DOM.ById('imageLabel');

  if (!imageDropZone || !imageInput) return;

  imageDropZone.addEventListener('click', () => imageInput.click());
  imageDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageDropZone.classList.add('drop-zone-active');
  });
  imageDropZone.addEventListener('dragleave', () => imageDropZone.classList.remove('drop-zone-active'));
  imageDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    imageDropZone.classList.remove('drop-zone-active');
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) {
      imageInput.files = e.dataTransfer.files;
      previewImage();
    }
  });

  imageInput.addEventListener('change', previewImage);

  function previewImage() {
    const file = imageInput.files[0];
    if (file) {
      state.imageFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.src = e.target.result;
        imagePreview.classList.remove('hidden');
        imageLabel.classList.add('hidden');
      };
      reader.readAsDataURL(file);
    }
  }
}

function initializeCharCounter() {
  const commentEl = DOM.ById('comment');
  const charCountEl = DOM.ById('charCount');
  if (commentEl && charCountEl) {
    commentEl.addEventListener('input', (e) => {
      charCountEl.textContent = `${e.target.value.length}/100 characters`;
    });
  }
}

function initializeFormSubmission() {
  const reportForm = DOM.ById('reportForm');
  if (reportForm) reportForm.addEventListener('submit', handleFormSubmit);
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const infraType = DOM.ById('infraType')?.value;
  const comment = DOM.ById('comment')?.value || 'No comment';
  const submitBtn = DOM.ById('submitBtn');

  if (!state.imageFile) return Notify.error('Please upload an image');
  if (!state.userLocation.latitude) return Notify.error('Location access required');

  ['successMessage', 'errorMessage'].forEach(Utils.hideElement);
  Loading.show();
  if (submitBtn) submitBtn.disabled = true;

  try {
    const imageBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(state.imageFile);
    });

    const response = await API.post('/api/submit-report', {
      infra_type: infraType,
      comment,
      latitude: state.userLocation.latitude,
      longitude: state.userLocation.longitude,
      image_base64: imageBase64,
    });

    Loading.hide();

    if (response.ok) {
      displaySuccessResult(response.data.report.analysis);
      resetForm();
      Utils.scrollIntoView('successMessage', true);
    } else {
      Notify.error(response.data.error || 'Failed to submit');
    }
  } catch (error) {
    Loading.hide();
    Notify.error('Network error: ' + error.message);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

function displaySuccessResult(analysis) {
  const createStatusSpan = (isPositive) => 
    `<span style="color: var(--${isPositive ? 'success' : 'error'}); font-weight: 600;">${isPositive ? '✓ Yes' : '✗ No'}</span>`;

  DOM.ById('existsValue').innerHTML = createStatusSpan(analysis.exists);
  DOM.ById('usableValue').innerHTML = createStatusSpan(analysis.usable);
  DOM.ById('reasonValue').textContent = analysis.reason;
  DOM.ById('usabilityValue').textContent = analysis.usability_score;
  
  const ghostScoreEl = DOM.ById('ghostScoreValue');
  ghostScoreEl.textContent = analysis.ghost_score;
  ghostScoreEl.style.color = Utils.getScoreColor(analysis.ghost_score);

  const badgeEl = DOM.ById('ghostLevelValue');
  badgeEl.textContent = analysis.ghost_level;
  const badgeColors = { ghost: 'error', partial: 'warning', functional: 'success' };
  const colorKey = badgeColors[Utils.getStatusClass(analysis.ghost_level)];
  badgeEl.style.background = `var(--${colorKey})`;
  badgeEl.style.color = 'white';

  ['heroSection', 'formSection', 'infoSection', 'mapLinkSection'].forEach(Utils.hideElement);
  Utils.showElement('successMessage');
}

function resetForm() {
  const reportForm = DOM.ById('reportForm');
  const imagePreview = DOM.ById('imagePreview');
  const imageLabel = DOM.ById('imageLabel');
  const charCountEl = DOM.ById('charCount');

  if (reportForm) reportForm.reset();
  if (imagePreview) imagePreview.classList.add('hidden');
  if (imageLabel) imageLabel.classList.remove('hidden');
  if (charCountEl) charCountEl.textContent = '0/100 characters';
  state.imageFile = null;
}

function initializeCloseButton() {
  const closeBtn = DOM.ById('closeSuccess');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      Utils.hideElement('successMessage');
      Utils.hideElement('mapLinkSection');
      Utils.showElement('heroSection');
      Utils.showElement('formSection');
      Utils.showElement('infoSection');
    });
  }
}

function initialize() {
  initializeLocation();
  initializeImageUpload();
  initializeCharCounter();
  initializeFormSubmission();
  initializeCloseButton();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

export default { state, initialize };
