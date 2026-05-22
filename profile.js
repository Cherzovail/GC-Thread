import { state } from '../state.js';
import { clearSession, persistCurrentUser, getPosts } from '../storage.js';
import { showError, hideError, validateUsername, updateUserDisplay, getCategoryClass } from '../utils.js';

function buildHistoryCardHTML(post) {
  return `
    <div class="post-header">
      <div class="post-avatar">${post.author?.charAt(0).toUpperCase() || 'G'}</div>
      <div class="post-info">
        <div class="post-author">${post.author}</div>
        <div class="post-meta">
          <span class="category-badge ${getCategoryClass ? getCategoryClass(post.category) : ''}">${post.category}</span>
          <span class="post-time">${new Date(post.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
    <div class="post-content-text">
      <h4>${post.title}</h4>
      <p>${post.content}</p>
      ${post.location ? `<div class="post-location">📍 ${post.location}</div>` : ''}
      ${post.attachmentName ? `<div class="post-attachment">📎 ${post.attachmentName}</div>` : ''}
    </div>
    <div class="profile-post-actions">
      <button class="action-btn edit" type="button" onclick="openEditPostModal('${post.id}')">Edit</button>
      <button class="action-btn danger" type="button" onclick="deleteUserPost('${post.id}')">Delete</button>
    </div>`;
}

function renderUserPostHistory() {
  if (!state.currentUser) return;
  const container = document.getElementById('userPostsHistory');
  if (!container) return;

  const posts = getPosts().filter(post => post.authorEmail === state.currentUser.email)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  container.innerHTML = '';
  if (posts.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:1.5rem;color:#64748b;">No posts yet. Create one from the Create Post button.</div>';
    return;
  }

  posts.forEach(post => {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.innerHTML = buildHistoryCardHTML(post);
    container.appendChild(card);
  });
}

export function refreshProfile() {
  if (!state.currentUser) return;
  const posts = getPosts();
  const userPostsCount = posts.filter(post => post.authorEmail === state.currentUser.email).length;
  document.getElementById('userPostsCount').textContent = String(userPostsCount);
  document.getElementById('userLikesCount').textContent = String(state.currentUser.likesGiven || 0);
  updateUserDisplay();
  renderUserPostHistory();
}

export function initProfile() {
  const logoutBtn = document.getElementById('logoutBtn');
  const editProfileBtn = document.getElementById('editProfileBtn');
  const closeEditModal = document.getElementById('closeEditModal');
  const editProfileModal = document.getElementById('editProfileModal');
  const editProfileForm = document.getElementById('editProfileForm');
  const editUsernameInput = document.getElementById('editUsernameInput');

  logoutBtn?.addEventListener('click', () => {
    clearSession();
    state.currentUser = null;
    state.currentUsername = null;
    window.location.href = 'index.html';
  });

  editProfileBtn?.addEventListener('click', () => {
    if (state.currentUser) {
      editUsernameInput.value = state.currentUser.username || '';
      editProfileModal?.classList.add('active');
      editProfileModal?.style.setProperty('display', 'flex');
    }
  });

  closeEditModal?.addEventListener('click', () => {
    editProfileModal?.classList.remove('active');
    editProfileModal?.style.removeProperty('display');
  });

  editProfileModal?.addEventListener('click', (event) => {
    if (event.target === editProfileModal) {
      editProfileModal?.classList.remove('active');
      editProfileModal?.style.removeProperty('display');
    }
  });

  editProfileForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    hideError('editProfileError');
    const username = editUsernameInput?.value.trim() || '';
    const validation = validateUsername(username);
    if (!validation.valid) {
      showError('editProfileError', validation.message);
      return;
    }

    if (state.currentUser) {
      state.currentUser.username = username;
      state.currentUsername = username || state.currentUser.email.split('@')[0];
      persistCurrentUser(state.currentUser);
      refreshProfile();
    }

    editProfileModal?.classList.remove('active');
    editProfileModal?.style.removeProperty('display');
  });
}
