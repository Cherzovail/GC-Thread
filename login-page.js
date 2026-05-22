import { initLogin } from './auth/login.js';
import { getCurrentUser } from './storage.js';

if (getCurrentUser()) {
  window.location.href = 'app.html';
} else {
  initLogin();
}

document.getElementById('showRegisterBtn')?.addEventListener('click', () => {
  window.location.href = 'register.html';
});
