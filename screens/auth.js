// screens/auth.js — Authentication screen (sign in / sign up).
// Self-registers with the router at import time.
// Full implementation: Phase 2, Plan 02.
import * as router from '../lib/router.js'

router.register('auth', async (_param) => {
  // Stub: Phase 2 Plan 02 implements this screen.
  const app = document.getElementById('app')
  if (app) app.innerHTML = '<div class="screen auth-screen"></div>'
  return () => {}
})
