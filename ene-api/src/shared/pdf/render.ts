import { getBrowser } from './browser.js'

export interface OpcionesPaginaPdf {
  formato: 'A4' | 'Letter'
  orientacion: 'portrait' | 'landscape'
  margen: string // formato CSS, ej. '14mm 12mm 18mm 12mm'
}

// Motor de Documentos (CLAUDE.md §8): el preview es el PDF. Esta función NO
// navega una URL — recibe el HTML ya armado por la plantilla y lo carga
// directo con `setContent`. Locale es-CL y timezone America/Santiago para que
// fechas y números salgan igual que en la app.
export async function renderPdf(html: string, pagina: OpcionesPaginaPdf): Promise<Buffer> {
  const browser = await getBrowser()
  const context = await browser.newContext({ locale: 'es-CL', timezoneId: 'America/Santiago' })
  try {
    const page = await context.newPage()
    // 'load' (no 'networkidle'): el HTML es autocontenido — CSS inline, sin
    // fetch a red — esperar red inactiva solo agregaría latencia.
    await page.setContent(html, { waitUntil: 'load' })
    // Espera a que las fuentes estén listas antes de fotografiar. Se pasa como
    // string para no arrastrar el lib DOM al tsconfig del backend (Node).
    await page.evaluate('document.fonts.ready')

    const pdf = await page.pdf({
      format: pagina.formato,
      landscape: pagina.orientacion === 'landscape',
      printBackground: true,
      // El @page del CSS manda sobre format/landscape/margin si los define.
      preferCSSPageSize: true,
      margin: parseMargen(pagina.margen),
    })
    return Buffer.from(pdf)
  } finally {
    await context.close()
  }
}

function parseMargen(margen: string): { top: string; right: string; bottom: string; left: string } {
  const partes = margen.trim().split(/\s+/)
  const top = partes[0] ?? '0'
  const right = partes[1] ?? top
  const bottom = partes[2] ?? top
  const left = partes[3] ?? right
  return { top, right, bottom, left }
}
