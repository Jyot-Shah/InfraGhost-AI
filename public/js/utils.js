// Utility functions
export const Utils = {
  showElement: (id) => document.getElementById(id)?.classList.remove('hidden'),
  hideElement: (id) => document.getElementById(id)?.classList.add('hidden'),
  addClass: (id, className) => document.getElementById(id)?.classList.add(className),
  removeClass: (id, className) => document.getElementById(id)?.classList.remove(className),
  scrollIntoView: (id, smooth = true) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'center'
    });
  },
  formatDate: (date) => new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }),
  getScoreColor: (score) => 
    score >= 60 ? 'var(--error)' : score > 30 ? 'var(--warning)' : 'var(--success)',
  getStatusClass: (ghostLevel) => {
    if (ghostLevel === 'InfraGhost') return 'ghost';
    if (ghostLevel === 'Partial') return 'partial';
    return 'functional';
  }
};

// DOM Helpers
export const DOM = {
  ById: (id) => document.getElementById(id),
  ByClass: (className) => document.querySelector(`.${className}`),
  BySelector: (selector) => document.querySelector(selector),
  AllBySelector: (selector) => document.querySelectorAll(selector)
};

// API Helpers
export const API = {
  post: async (url, data) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return {
      ok: response.ok,
      status: response.status,
      data: await response.json()
    };
  },
  get: async (url) => {
    const response = await fetch(url);
    return {
      ok: response.ok,
      status: response.status,
      data: await response.json()
    };
  }
};

// LocalStorage wrapper
export const Storage = {
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
  get: (key) => {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  },
  remove: (key) => localStorage.removeItem(key),
  clear: () => localStorage.clear()
};

// Event Handlers
export const Events = {
  onReady: (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  },
  on: (element, event, handler) => element?.addEventListener(event, handler),
  off: (element, event, handler) => element?.removeEventListener(event, handler),
  onClick: (id, handler) => document.getElementById(id)?.addEventListener('click', handler),
  onInput: (id, handler) => document.getElementById(id)?.addEventListener('input', handler),
  onChange: (id, handler) => document.getElementById(id)?.addEventListener('change', handler),
  onSubmit: (id, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('submit', (e) => { e.preventDefault(); handler(e); });
  }
};

// Toast Notifications
export const Notify = {
  show: (type, message, duration = 5000) => {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} slide-in`;
    const icon = {success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️'}[type];
    notification.innerHTML = `<span style="font-size: 1.2rem;">${icon}</span><div>${message}</div>`;
    document.body.insertBefore(notification, document.body.firstChild);
    if (duration) setTimeout(() => notification.remove(), duration);
    return notification;
  },
  success: (message, duration = 5000) => Notify.show('success', message, duration),
  error: (message, duration = 5000) => Notify.show('error', message, duration),
  warning: (message, duration = 5000) => Notify.show('warning', message, duration),
  info: (message, duration = 5000) => Notify.show('info', message, duration)
};

// Loading overlay
export const Loading = {
  show: () => document.getElementById('loadingOverlay')?.classList.remove('hidden'),
  hide: () => document.getElementById('loadingOverlay')?.classList.add('hidden')
};

export default { Utils, DOM, API, Storage, Events, Notify, Loading };
