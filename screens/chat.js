// Chat screen — #/chat/:convId — message thread.
// Stub registered in Phase 3 Plan 01 so app.js import resolves cleanly.
// Plan 02 replaces this file with the full send/receive implementation.

import * as router from '../lib/router.js'

router.register('chat', async (_param) => {
  const app = document.getElementById('app')
  if (app) app.innerHTML = '<div class="screen"><div class="center-msg">LOADING...</div></div>'
  return () => {}
})
