/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { initGA } from './lib/analytics'

// Boot gtag.js before React mounts so `window.gtag` is available when
// the SPA page_view listener in App.tsx fires its first useEffect.
// initGA() is a silent no-op when VITE_GA_MEASUREMENT_ID is unset or
// malformed — see src/lib/analytics.ts for the loader contract and
// the Session 136 root-cause history that drove the TS-side design.
initGA()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
