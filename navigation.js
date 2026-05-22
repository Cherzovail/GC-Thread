import { showAppPage } from './utils.js';

export function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (!page) return;
      const nextPage = page === 'post' ? 'postPage' : `${page}Page`;
      showAppPage(nextPage);
    });
  });

  document.getElementById('homeLogoBtn')?.addEventListener('click', () => {
    showAppPage('homePage');
  });
}
