import { auth } from "../firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Enforce: user must be explicitly logged-in via login page.
// If no Firebase user, redirect.
export function protectApp() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'index.html';
    }
  });
}

