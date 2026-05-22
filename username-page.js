import { initUsernameSetup } from './auth/username.js';
import { getCurrentUser } from './storage.js';

if (!getCurrentUser()) {
  window.location.href = 'index.html';
} else {
  initUsernameSetup();
}
