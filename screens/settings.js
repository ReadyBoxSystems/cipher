// screens/settings.js — Settings screen (profile view, display name edit, sign out).
// Self-registers with the router at import time.
// Full implementation: Phase 2, Plan 03.
import * as router from '../lib/router.js'

router.register('settings', async (_param) => {
  // Stub: Phase 2 Plan 03 implements this screen.
  const app = document.getElementById('app')
  if (app) app.innerHTML = '<div class="screen"></div>'
  return () => {}
})
