import { auth } from "../firestore.js";
import { setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Enforce NO auto-login behavior across refresh by using session persistence.
// This prevents remembering credentials across browser restarts.
// (If you need strict re-login on every single refresh, switch to `browserLocalPersistence` OFF and implement a UI gate.)
export async function enforceNoAutoLogin() {
  try {
    await setPersistence(auth, browserSessionPersistence);
  } catch (e) {
    console.warn("Persistence config failed:", e?.message || e);
  }
}


