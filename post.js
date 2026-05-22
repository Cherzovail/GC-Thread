import { state } from '../state.js';
import { getPosts, savePosts, persistCurrentUser } from '../storage.js';
import { getTimeAgo, getCategoryClass, showError, hideError } from '../utils.js';
import { refreshProfile } from './profile.js';
import { createNotification } from '../notification.js';

let activeEditPostId = null;

function buildCardHTML(post, showStatus = false) {
  const uid = state.currentUser?.email || '';
  const isLiked = post.likedBy.includes(uid);
  const isDisliked = post.dislikedBy.includes(uid);
  const isAuthor = post.authorEmail === uid;
  const statusHTML = showStatus
    ? `<span class="status-badge ${post.resolved ? 'status-resolved' : 'status-open'}">${post.resolved ? 'Resolved' : 'Open'}</span>`
    : '';
  const locationHTML = post.location ? `<div class="post-location">📍 ${post.location}</div>` : '';
  const attachmentHTML = post.attachmentName ? `<div class="post-attachment">📎 ${post.attachmentName}</div>` : '';
  const editControl = isAuthor
    ? `<button class="action-btn edit" type="button" onclick="openEditPostModal('${post.id}')">Edit</button>`
    : '';

  return `
    <div class="post-header">
      <div class="post-avatar">${post.author?.charAt(0).toUpperCase() || 'G'}</div>
      <div class="post-info">
        <div class="post-author">
          ${post.author}
          ${post.trending ? '<svg class="trending-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>' : ''}
        </div>
        <div class="post-meta">
          <span class="category-badge ${getCategoryClass(post.category)}">${post.category}</span>
          <span class="post-time">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            ${getTimeAgo(post.createdAt)}
          </span>
        </div>
      </div>
      ${statusHTML}
    </div>
    <div class="post-content-text">
      <h4>${post.title}</h4>
      <p>${post.content}</p>
      ${locationHTML}
      ${attachmentHTML}
    </div>
    <div class="post-actions">
      <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="likePost('${post.id}')">
        <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
        </svg>
        <span>${post.likes || 0}</span>
      </button>
      <button class="action-btn ${isDisliked ? 'disliked' : ''}" onclick="dislikePost('${post.id}')">
        <svg viewBox="0 0 24 24" fill="${isDisliked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/>
        </svg>
        <span>${post.dislikes || 0}</span>
      </button>
      ${editControl}
    </div>`;
}

export function createPostCard(post) {
  return buildCardHTML(post, false);
}

export async function loadHomePosts() {
  const container = document.getElementById('homePageContent');
  if (!container) return;
  const posts = getPosts().slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  state.allHomePosts = posts;
  container.innerHTML = '';

  if (posts.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">No posts found. Create the first one!</div>';
    return;
  }

  posts.forEach(post => {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.innerHTML = buildCardHTML(post, false);
    container.appendChild(card);
  });
}

export async function loadConcerns(category = 'All') {
  const container = document.getElementById('concernsPageContent');
  if (!container) return;
  const posts = getPosts().slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const filtered = category === 'All' ? posts : posts.filter(post => post.category === category);
  const countEl = document.getElementById('concernsCount');

  container.innerHTML = '';
  if (countEl) {
    countEl.textContent = `${filtered.length} Total Concerns`;
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">No concerns found for this category.</div>';
    return;
  }

  filtered.forEach(post => {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.innerHTML = buildCardHTML(post, true);
    container.appendChild(card);
  });
}

export function getActiveConcernCategory() {
  const activePill = document.querySelector('#categoryPills .pill.active');
  return activePill?.dataset.category || 'All';
}

function closeEditPostModal() {
  const editModal = document.getElementById('editPostModal');
  editModal?.classList.remove('active');
  editModal?.style.removeProperty('display');
  document.getElementById('editPostForm')?.reset();
  document.getElementById('editPostAttachmentLabel').textContent = 'No file selected';
  activeEditPostId = null;
}

function openEditPostModal(postId) {
  if (!state.currentUser) return;
  const posts = getPosts();
  const post = posts.find(item => item.id === postId);
  if (!post || post.authorEmail !== state.currentUser.email) return;

  activeEditPostId = postId;
  document.getElementById('editPostTitle').value = post.title || '';
  document.getElementById('editPostContent').value = post.content || '';
  document.getElementById('editPostLocation').value = post.location || '';
  document.getElementById('editPostAttachmentLabel').textContent = post.attachmentName || 'No file selected';
  document.getElementById('editPostAttachment').value = '';
  const editModal = document.getElementById('editPostModal');
  editModal?.classList.add('active');
  editModal?.style.setProperty('display', 'flex');
}

function saveEditedPost(event) {
  event.preventDefault();
  hideError('editPostError');

  if (!activeEditPostId || !state.currentUser) {
    showError('editPostError', 'Unable to edit this post at the moment.');
    return;
  }

  const title = document.getElementById('editPostTitle')?.value.trim() || '';
  const content = document.getElementById('editPostContent')?.value.trim() || '';
  const location = document.getElementById('editPostLocation')?.value.trim() || '';
  const attachmentInput = document.getElementById('editPostAttachment');
  const attachmentName = attachmentInput?.files?.[0]?.name || '';

  if (!title || !content) {
    showError('editPostError', 'Please complete all required fields.');
    return;
  }

  const posts = getPosts();
  const post = posts.find(item => item.id === activeEditPostId);
  if (!post) return;

  post.title = title;
  post.content = content;
  post.location = location;
  if (attachmentName) {
    post.attachmentName = attachmentName;
  }
  post.updatedAt = new Date().toISOString();
  savePosts(posts);
  refreshFeeds();
  closeEditPostModal();
}

export function deleteUserPost(postId) {
  if (!state.currentUser) return;
  const posts = getPosts();
  const filtered = posts.filter(post => post.id !== postId || post.authorEmail !== state.currentUser.email);
  savePosts(filtered);
  refreshFeeds();
}

export function refreshFeeds() {
  const category = getActiveConcernCategory();
  loadHomePosts();
  loadConcerns(category);
  refreshProfile();
}

export async function likePost(postId) {
  if (!state.currentUser) return;
  const posts = getPosts();
  const post = posts.find(item => item.id === postId);
  if (!post) return;

  const userEmail = state.currentUser.email;
  const alreadyLiked = post.likedBy.includes(userEmail);
  const alreadyDisliked = post.dislikedBy.includes(userEmail);
  const isOwnPost = post.authorEmail === userEmail;

  if (alreadyLiked) {
    post.likes = Math.max(0, post.likes - 1);
    post.likedBy = post.likedBy.filter(email => email !== userEmail);
  } else {
    post.likes = (post.likes || 0) + 1;
    post.likedBy = Array.from(new Set([...post.likedBy, userEmail]));
    if (alreadyDisliked) {
      post.dislikes = Math.max(0, post.dislikes - 1);
      post.dislikedBy = post.dislikedBy.filter(email => email !== userEmail);
    }
    state.currentUser.likesGiven = (state.currentUser.likesGiven || 0) + 1;
    
    // Send notification to post author
    if (!isOwnPost) {
      const username = state.currentUsername || state.currentUser.email.split('@')[0];
      createNotification('like', `${username} liked your post: "${post.title}"`, postId);
    }
  }

  persistCurrentUser(state.currentUser);
  savePosts(posts);
  refreshFeeds();
}

export async function dislikePost(postId) {
  if (!state.currentUser) return;
  const posts = getPosts();
  const post = posts.find(item => item.id === postId);
  if (!post) return;

  const userEmail = state.currentUser.email;
  const alreadyDisliked = post.dislikedBy.includes(userEmail);
  const alreadyLiked = post.likedBy.includes(userEmail);
  const isOwnPost = post.authorEmail === userEmail;

  if (alreadyDisliked) {
    post.dislikes = Math.max(0, post.dislikes - 1);
    post.dislikedBy = post.dislikedBy.filter(email => email !== userEmail);
  } else {
    post.dislikes = (post.dislikes || 0) + 1;
    post.dislikedBy = Array.from(new Set([...post.dislikedBy, userEmail]));
    if (alreadyLiked) {
      post.likes = Math.max(0, post.likes - 1);
      post.likedBy = post.likedBy.filter(email => email !== userEmail);
    }
    
    // Send notification to post author
    if (!isOwnPost) {
      const username = state.currentUsername || state.currentUser.email.split('@')[0];
      createNotification('dislike', `${username} disliked your post: "${post.title}"`, postId);
    }
  }

  persistCurrentUser(state.currentUser);
  savePosts(posts);
  refreshFeeds();
}

export function initPostPage() {
  const submitButton = document.getElementById('submitPostBtn');
  const closeButton = document.getElementById('closePostBtn');
  const attachmentInput = document.getElementById('postAttachment');
  const attachmentLabel = document.getElementById('postAttachmentLabel');
  const editModalCloseBtn = document.getElementById('closeEditPostModal');
  const editModal = document.getElementById('editPostModal');
  const editForm = document.getElementById('editPostForm');
  const editAttachmentInput = document.getElementById('editPostAttachment');
  const editAttachmentLabel = document.getElementById('editPostAttachmentLabel');

  attachmentInput?.addEventListener('change', () => {
    const file = attachmentInput.files?.[0];
    attachmentLabel.textContent = file?.name || 'No file selected';
  });

  editAttachmentInput?.addEventListener('change', () => {
    const file = editAttachmentInput.files?.[0];
    editAttachmentLabel.textContent = file?.name || 'No file selected';
  });

  editModalCloseBtn?.addEventListener('click', closeEditPostModal);
  editModal?.addEventListener('click', event => {
    if (event.target === editModal) {
      closeEditPostModal();
    }
  });

  editForm?.addEventListener('submit', saveEditedPost);
  window.openEditPostModal = openEditPostModal;
  window.deleteUserPost = deleteUserPost;

  submitButton?.addEventListener('click', () => {
    hideError('postError');
    const category = document.getElementById('postCategory')?.value?.trim();
    const title = document.getElementById('postTitle')?.value?.trim() || '';
    const content = document.getElementById('postContent')?.value?.trim() || '';
    const location = document.getElementById('postLocation')?.value?.trim() || '';

    if (!category || !title || !content) {
      showError('postError', 'Please fill in all required fields (category, title, content).');
      return;
    }

    if (!state.currentUser) {
      showError('postError', 'You must be logged in to submit a post.');
      return;
    }

    const attachmentName = attachmentInput?.files?.[0]?.name || '';
    const posts = getPosts();
    posts.push({
      id: `post-${Date.now()}`,
      category,
      title,
      content,
      location,
      attachmentName,
      author: state.currentUsername || state.currentUser.email.split('@')[0],
      authorEmail: state.currentUser.email,
      createdAt: new Date().toISOString(),
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: [],
      trending: false,
      resolved: false
    });

    savePosts(posts);
    refreshFeeds();
    document.getElementById('postForm')?.reset();
    document.getElementById('postCategory')?.focus();
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector('[data-page="home"]')?.classList.add('active');
    document.getElementById('homePage')?.classList.add('active');
    document.getElementById('postPage')?.classList.remove('active');
  });

  closeButton?.addEventListener('click', () => {
    document.getElementById('postForm')?.reset();
    document.getElementById('postPage')?.classList.remove('active');
    document.getElementById('homePage')?.classList.add('active');
    document.querySelector('[data-page="home"]')?.classList.add('active');
    refreshFeeds();
  });
}
