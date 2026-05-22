import { state } from './state.js';

export function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.getElementById(pageId)?.classList.add('active');
}

export function showAppPage(pageId) {
  document.querySelectorAll('.app-page').forEach(page => page.classList.remove('active'));
  document.getElementById(pageId)?.classList.add('active');

  const isOverlay = pageId === 'fullCalendarPage';
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

  if (!isOverlay) {
    const navItem = document.querySelector(`[data-page="${pageId.replace('Page', '')}"]`);
    if (navItem) navItem.classList.add('active');
  }

  const header = document.getElementById('appHeader');
  const bottomNav = document.getElementById('bottomNav');
  if (header && bottomNav) {
    if (pageId === 'postPage') {
      header.style.display = 'none';
      bottomNav.style.display = 'none';
    } else {
      header.style.display = '';
      bottomNav.style.display = '';
    }
  }
}

export function showError(elementId, message) {
  const errorEl = document.getElementById(elementId);
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

export function hideError(elementId) {
  const errorEl = document.getElementById(elementId);
  if (!errorEl) return;
  errorEl.classList.add('hidden');
}

export function validateGCEmail(email) {
  return typeof email === 'string' && email.trim().endsWith('@gordoncollege.edu.ph');
}

export function validateUsername(username) {
  if (!username) {
    return { valid: true };
  }
  if (username.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters.' };
  }
  if (username.length > 20) {
    return { valid: false, message: 'Username cannot exceed 20 characters.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, message: 'Username may only contain letters, numbers, and underscores.' };
  }
  return { valid: true };
}

export function getTimeAgo(date) {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((new Date() - parsed) / 1000);
  const intervals = [
    [31536000, 'y'],
    [2592000, 'mo'],
    [86400, 'd'],
    [3600, 'h'],
    [60, 'm']
  ];
  for (const [secondsPerUnit, label] of intervals) {
    const count = Math.floor(seconds / secondsPerUnit);
    if (count >= 1) {
      return `${count}${label} ago`;
    }
  }
  return 'Just now';
}

export function getCategoryClass(category) {
  return {
    'Academics': 'category-academics',
    'Lost & Found': 'category-lost-found',
    'Events': 'category-events',
    'General': 'category-general'
  }[category] || 'category-general';
}

export function getCleanUsername(email) {
  return email.split('@')[0];
}

export function updateUserDisplay() {
  const displayName = state.currentUsername || (state.currentUser ? getCleanUsername(state.currentUser.email) : 'Guest');
  const avatarText = displayName.charAt(0).toUpperCase();
  document.getElementById('profileName').textContent = displayName;
  document.getElementById('profileAvatarText').textContent = avatarText;
  document.getElementById('profileEmail').textContent = state.currentUser?.email || '';
}
