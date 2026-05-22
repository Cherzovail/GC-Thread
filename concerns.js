import { loadConcerns, getActiveConcernCategory } from './post.js';

export function initConcerns() {
  document.querySelectorAll('#categoryPills .pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#categoryPills .pill').forEach(item => item.classList.remove('active'));
      pill.classList.add('active');
      loadConcerns(pill.dataset.category);
    });
  });

  loadConcerns(getActiveConcernCategory());
}
