import { state } from '../state.js';
import { loadHomePosts, createPostCard } from './post.js';

export function initDashboard() {
  const searchInput = document.getElementById('searchInput');
  const container = document.getElementById('homePageContent');

  if (!searchInput || !container) return;

  searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();
    if (!term) {
      loadHomePosts();
      return;
    }

    const filtered = state.allHomePosts.filter(post =>
      post.title.toLowerCase().includes(term) ||
      post.content.toLowerCase().includes(term) ||
      post.category.toLowerCase().includes(term) ||
      post.author.toLowerCase().includes(term)
    );

    container.innerHTML = '';
    if (filtered.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">No posts match your search.</div>';
      return;
    }

    filtered.forEach(post => {
      const card = document.createElement('div');
      card.className = 'post-card';
      card.innerHTML = createPostCard(post);
      container.appendChild(card);
    });
  });
}
