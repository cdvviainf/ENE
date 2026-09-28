import { chromium, type Browser } from 'playwright'
import { env } from '../../config/env.js'

// Motor de Documentos (CLAUDE.md §8, portado de FAS): una sola instancia de
// Chromium reutilizada entre requests — lanzarlo en frío por cada PDF es el
// costo dominante del render. Se lanza perezoso (al primer render) y se
// mantiene caliente. En desarrollo usa el Chromium local
// (`npx playwright install chromium`); si PDF_BROWSER_WS está definido
// (CLAUDE.md §11) se conecta a un Chromium remoto por WebSocket.
let browserPromise: Promise<Browser> | null = null

async function launch(): Promise<Browser> {
  if (env.PDF_BROWSER_WS) {
    return chromium.connect(env.PDF_BROWSER_WS)
  }
  return chromium.launch({ args: ['--font-render-hinting=none'] })
}

export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launch().catch((err) => {
      // Si el lanzamiento falla, no dejar la promesa rota en caché — el
      // próximo render debe reintentar en vez de fallar para siempre.
      browserPromise = null
      throw err
    })
  }
  const browser = await browserPromise
  // Un browser puede caerse solo; si ya no está conectado se descarta y se
  // relanza en el próximo acceso en vez de devolver un handle muerto.
  if (!browser.isConnected()) {
    browserPromise = null
    return getBrowser()
  }
  return browser
}

// Cierre ordenado — registrado como hook `onClose` de Fastify en app.ts.
export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return
  const browser = await browserPromise.catch(() => null)
  browserPromise = null
  if (browser) await browser.close()
}
