import type { PropsPlantilla } from '../../../documentos.types.js'
import type { CotizacionPdfPayload } from '../../../schemas/cotizacion.schema.js'
import { fmt } from '../../../ui/formato.js'
import { textos } from '../i18n.js'

// Plantilla de Cotización v1 — bilingüe y con dos modalidades (RN-COT-06).
// Autocontenida: CSS inline, sin fetch a red (el render la carga con
// setContent). RN-COT-07: la modalidad `desglosado` muestra la venta por ítem;
// NINGUNA modalidad muestra costo ni margen (el payload ni siquiera los trae).

const COLORS = { tinta: '#1a1a1a', suave: '#666', linea: '#d9d9d9', banda: '#f2f4f5', marca: '#e63946' }

export function CotizacionV1({ d, opciones, marcaAgua }: PropsPlantilla<CotizacionPdfPayload>): React.ReactElement {
  const t = textos(opciones.idioma)
  const desglosado = opciones.modalidad === 'desglosado'
  const area = d.areaNegocio === 'RECEPTIVO' ? t.areaReceptivo : t.areaEventos

  return (
    <html lang={opciones.idioma}>
      <head>
        <meta charSet='utf-8' />
        <style>{css}</style>
      </head>
      <body>
        {marcaAgua ? <div className='marca-agua'>{marcaAgua}</div> : null}

        <header className='encabezado'>
          <div>
            <div className='emisor-nombre'>{d.emisor.nombre}</div>
            <div className='emisor-datos'>
              {[d.emisor.email, d.emisor.web].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div className='doc-titulo'>
            <div className='titulo'>{t.titulo}</div>
            <div className='numero'>{t.cotizacion} {d.numero}</div>
          </div>
        </header>

        <section className='ficha'>
          <Campo etiqueta={t.cliente} valor={d.cliente.razonSocial} />
          <Campo etiqueta={t.grupo} valor={d.grupoApellido} />
          <Campo etiqueta={t.fechaOperacion} valor={fmt.fecha(d.fechaOperacion, opciones.idioma)} />
          <Campo etiqueta={t.pasajeros} valor={String(d.cantidadPax)} />
          {d.zona ? <Campo etiqueta={t.zona} valor={d.zona} /> : null}
          <Campo etiqueta='' valor={area} />
        </section>

        <section className='itinerario'>
          {d.dias.length === 0 ? (
            <p className='sin-servicios'>{t.sinServicios}</p>
          ) : (
            d.dias.map((dia) => (
              <div key={dia.dia} className='dia'>
                <div className='dia-cabecera'>
                  {t.dia} {dia.dia} · {fmt.fecha(dia.fecha, opciones.idioma)}
                </div>
                {dia.bloques.map((bloque) => (
                  <div key={bloque.bloque} className='bloque'>
                    <div className='bloque-rotulo'>{bloque.bloque === 'AM' ? t.am : t.pm}</div>
                    <table className='lineas'>
                      <tbody>
                        {bloque.lineas.map((linea, i) => (
                          <tr key={i}>
                            <td className='linea-desc'>{linea.descripcion}</td>
                            {desglosado ? (
                              <td className='linea-valor'>{fmt.monto(linea.ventaTotal, d.moneda)}</td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ))
          )}
        </section>

        <section className='totales'>
          <div className='total-fila'>
            <span className='total-rotulo'>{t.total}</span>
            <span className='total-valor'>{fmt.monto(d.totalVenta, d.moneda)}</span>
          </div>
        </section>
      </body>
    </html>
  )
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor: string }): React.ReactElement {
  return (
    <div className='campo'>
      {etiqueta ? <span className='campo-etiqueta'>{etiqueta}</span> : null}
      <span className='campo-valor'>{valor}</span>
    </div>
  )
}

const css = `
  @page { size: A4 portrait; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: ${COLORS.tinta}; font-size: 11px; margin: 0; }
  .marca-agua {
    position: fixed; top: 42%; left: 0; right: 0; text-align: center;
    font-size: 96px; font-weight: 700; color: ${COLORS.marca}; opacity: 0.08;
    transform: rotate(-24deg); letter-spacing: 8px; pointer-events: none; z-index: 0;
  }
  .encabezado { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${COLORS.tinta}; padding-bottom: 10px; }
  .emisor-nombre { font-size: 18px; font-weight: 700; }
  .emisor-datos { color: ${COLORS.suave}; margin-top: 3px; }
  .doc-titulo { text-align: right; }
  .titulo { font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .numero { color: ${COLORS.suave}; margin-top: 3px; }
  .ficha { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin: 16px 0; }
  .campo { display: flex; gap: 6px; }
  .campo-etiqueta { color: ${COLORS.suave}; min-width: 110px; }
  .campo-valor { font-weight: 600; }
  .itinerario { margin-top: 8px; }
  .dia { margin-bottom: 12px; break-inside: avoid; }
  .dia-cabecera { background: ${COLORS.banda}; padding: 5px 8px; font-weight: 700; border-left: 3px solid ${COLORS.tinta}; }
  .bloque { margin: 6px 0 6px 8px; }
  .bloque-rotulo { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: ${COLORS.suave}; margin-bottom: 2px; }
  table.lineas { width: 100%; border-collapse: collapse; }
  table.lineas td { padding: 4px 6px; border-bottom: 1px solid ${COLORS.linea}; vertical-align: top; }
  .linea-valor { text-align: right; white-space: nowrap; width: 130px; font-variant-numeric: tabular-nums; }
  .sin-servicios { color: ${COLORS.suave}; font-style: italic; }
  .totales { margin-top: 16px; border-top: 2px solid ${COLORS.tinta}; padding-top: 8px; }
  .total-fila { display: flex; justify-content: flex-end; gap: 24px; align-items: baseline; }
  .total-rotulo { font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .total-valor { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
`
