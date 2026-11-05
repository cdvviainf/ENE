import type { EmisorPdf } from '../schemas/emisor.schema.js'

// Cabecera común de los PDF del catálogo (CLAUDE.md §8, `ui/Encabezado`):
// logo + datos del emisor a la izquierda, título y referencias del documento a
// la derecha. El logo es el del mantenedor Datos de empresa (RN-EMP-01), ya
// resuelto como data URI por `resolverEmisor`. Cada plantilla incluye
// `encabezadoCss(...)` en su <style> para seguir siendo autocontenida.

export interface PropsEncabezado {
  emisor: EmisorPdf
  /** Título grande del documento, p. ej. "Cotización" / "Orden de compra". */
  titulo: string
  /** Líneas de referencia bajo el título (número, versión, fecha…). */
  referencias?: string[]
}

export function Encabezado({ emisor, titulo, referencias = [] }: PropsEncabezado): React.ReactElement {
  const datos = [emisor.rut, emisor.direccion, emisor.email, emisor.web, emisor.telefono].filter(Boolean).join(' · ')
  return (
    <header className='encabezado'>
      <div className='emisor'>
        {emisor.logoDataUri ? <img className='logo' src={emisor.logoDataUri} alt='' /> : null}
        <div>
          <div className='emisor-nombre'>{emisor.nombre}</div>
          {datos ? <div className='emisor-datos'>{datos}</div> : null}
        </div>
      </div>
      <div className='doc-titulo'>
        <div className='titulo'>{titulo}</div>
        {referencias.map((r) => (
          <div key={r} className='numero'>
            {r}
          </div>
        ))}
      </div>
    </header>
  )
}

/** CSS de la cabecera. `tinta`: color de texto y del filete inferior; `suave`:
 * color de los datos secundarios. */
export function encabezadoCss(colores: { tinta: string; suave: string }): string {
  return `
  .encabezado { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${colores.tinta}; padding-bottom: 10px; gap: 16px; }
  .emisor { display: flex; gap: 12px; align-items: flex-start; }
  .logo { max-height: 56px; max-width: 160px; object-fit: contain; }
  .emisor-nombre { font-size: 18px; font-weight: 700; }
  .emisor-datos { color: ${colores.suave}; margin-top: 3px; max-width: 320px; }
  .doc-titulo { text-align: right; white-space: nowrap; }
  .titulo { font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .numero { color: ${colores.suave}; margin-top: 3px; }
`
}
