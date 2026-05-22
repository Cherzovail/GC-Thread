import { initRegister } from './auth/register.js';
import { getCurrentUser } from './storage.js';

if (getCurrentUser()) {
  window.location.href = 'app.html';
} else {
  initRegister();
}

document.getElementById('showLoginBtn')?.addEventListener('click', () => {
  window.location.href = 'index.html';
});
