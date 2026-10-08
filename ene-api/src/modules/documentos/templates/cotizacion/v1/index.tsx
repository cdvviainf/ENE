import type { PropsPlantilla } from '../../../documentos.types.js'
import type { CotizacionPdfPayload } from '../../../schemas/cotizacion.schema.js'
import { fmt } from '../../../ui/formato.js'
import { textos } from '../i18n.js'

// Plantilla de Cotización v1 — bilingüe y con tres modalidades (RN-COT-06/12).
// Autocontenida: CSS inline, logo como data URI, sin fetch a red (el render la
// carga con setContent). RN-COT-07: ninguna modalidad muestra costo ni margen
// (el payload ni siquiera los trae).

const COLORS = { tinta: '#1a1a1a', suave: '#666', linea: '#d9d9d9', banda: '#f2f4f5', marca: '#e63946' }

// Gate de presentación: ¿el monto es distinto de cero? (sin parseFloat, RN-DIN-01).
const noEsCero = (m: string): boolean => !/^-?0(\.0+)?$/.test(m)

export function CotizacionV1({ d, opciones, marcaAgua }: PropsPlantilla<CotizacionPdfPayload>): React.ReactElement {
  const t = textos(opciones.idioma)
  const desglosado = opciones.modalidad === 'desglosado'
  const porPax = opciones.modalidad === 'desglosado_pax'
  const area = d.areaNegocio === 'RECEPTIVO' ? t.areaReceptivo : t.areaEventos
  const tieneRecargo = noEsCero(d.recargoTotal)

  return (
    <html lang={opciones.idioma}>
      <head>
        <meta charSet='utf-8' />
        <style>{css}</style>
      </head>
      <body>
        {marcaAgua ? <div className='marca-agua'>{marcaAgua}</div> : null}

        <header className='encabezado'>
          <div className='emisor'>
            {d.empresa.logoDataUri ? <img className='logo' src={d.empresa.logoDataUri} alt='' /> : null}
            <div>
              <div className='emisor-nombre'>{d.empresa.nombre}</div>
              <div className='emisor-datos'>
                {[d.empresa.rut, d.empresa.direccion, d.empresa.email, d.empresa.web, d.empresa.telefono].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
          <div className='doc-titulo'>
            <div className='titulo'>{t.titulo}</div>
            <div className='numero'>{t.cotizacion} {d.numero}</div>
            <div className='numero'>{t.version} {d.version}</div>
          </div>
        </header>

        <section className='ficha'>
          <Campo etiqueta={t.cliente} valor={d.cliente.razonSocial} />
          {d.ejecutivo ? (
            <Campo etiqueta={t.ejecutivo} valor={[d.ejecutivo.nombre, d.ejecutivo.email].filter(Boolean).join(' · ')} />
          ) : null}
          <Campo etiqueta={t.negocio} valor={d.negocioApellido} />
          <Campo etiqueta={t.fechaOperacion} valor={fmt.fecha(d.fechaOperacion, opciones.idioma)} />
          <Campo etiqueta={t.fechaCotizacion} valor={fmt.fecha(d.fechaCotizacion, opciones.idioma)} />
          {d.fechaVigencia ? <Campo etiqueta={t.vigencia} valor={fmt.fecha(d.fechaVigencia, opciones.idioma)} /> : null}
          <Campo etiqueta={t.pasajeros} valor={String(d.cantidadPax)} />
          {d.zonas.length ? <Campo etiqueta={t.zona} valor={d.zonas.join(', ')} /> : null}
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
                      {porPax ? (
                        <thead>
                          <tr>
                            <th className='col-desc'>{t.servicio}</th>
                            <th className='col-num'>{t.valorPorPax}</th>
                            <th className='col-pax'>{t.pax}</th>
                            <th className='col-num'>{t.total}</th>
                          </tr>
                        </thead>
                      ) : null}
                      <tbody>
                        {bloque.lineas.map((linea, i) => (
                          <tr key={i}>
                            <td className='linea-desc'>
                              {linea.descripcion}
                              {linea.observacion ? <div className='linea-obs'>{linea.observacion}</div> : null}
                            </td>
                            {porPax ? (
                              <>
                                <td className='linea-valor'>{fmt.monto(linea.ventaPorPax, d.moneda)}</td>
                                <td className='linea-pax'>{linea.cantidadPax}</td>
                                <td className='linea-valor'>{fmt.monto(linea.ventaTotal, d.moneda)}</td>
                              </>
                            ) : desglosado ? (
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
          {tieneRecargo ? (
            <>
              <div className='total-fila sub'>
                <span className='total-rotulo'>{t.total}</span>
                <span className='total-valor'>{fmt.monto(d.totalVenta, d.moneda)}</span>
              </div>
              <div className='total-fila sub'>
                <span className='total-rotulo'>
                  {t.recargo}{d.recargoFormaPago ? ` (${d.recargoFormaPago})` : ''}
                </span>
                <span className='total-valor'>{fmt.monto(d.recargoTotal, d.moneda)}</span>
              </div>
              <div className='total-fila'>
                <span className='total-rotulo'>{t.totalConRecargo}</span>
                <span className='total-valor'>{fmt.monto(d.totalConRecargo, d.moneda)}</span>
              </div>
            </>
          ) : (
            <div className='total-fila'>
              <span className='total-rotulo'>{t.total}</span>
              <span className='total-valor'>{fmt.monto(d.totalVenta, d.moneda)}</span>
            </div>
          )}
        </section>

        {d.incluidos || d.noIncluidos || d.notasImportantes ? (
          <section className='notas'>
            {d.incluidos ? <Nota titulo={t.incluidos} texto={d.incluidos} /> : null}
            {d.noIncluidos ? <Nota titulo={t.noIncluidos} texto={d.noIncluidos} /> : null}
            {d.notasImportantes ? <Nota titulo={t.notasImportantes} texto={d.notasImportantes} /> : null}
          </section>
        ) : null}
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

function Nota({ titulo, texto }: { titulo: string; texto: string }): React.ReactElement {
  return (
    <div className='nota'>
      <div className='nota-titulo'>{titulo}</div>
      <div className='nota-texto'>{texto}</div>
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
  .encabezado { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${COLORS.tinta}; padding-bottom: 10px; gap: 16px; }
  .emisor { display: flex; gap: 12px; align-items: flex-start; }
  .logo { max-height: 56px; max-width: 160px; object-fit: contain; }
  .emisor-nombre { font-size: 18px; font-weight: 700; }
  .emisor-datos { color: ${COLORS.suave}; margin-top: 3px; max-width: 320px; }
  .doc-titulo { text-align: right; white-space: nowrap; }
  .titulo { font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .numero { color: ${COLORS.suave}; margin-top: 3px; }
  .ficha { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin: 16px 0; }
  .campo { display: flex; gap: 6px; }
  .campo-etiqueta { color: ${COLORS.suave}; min-width: 120px; }
  .campo-valor { font-weight: 600; }
  .itinerario { margin-top: 8px; }
  .dia { margin-bottom: 12px; break-inside: avoid; }
  .dia-cabecera { background: ${COLORS.banda}; padding: 5px 8px; font-weight: 700; border-left: 3px solid ${COLORS.tinta}; }
  .bloque { margin: 6px 0 6px 8px; }
  .bloque-rotulo { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: ${COLORS.suave}; margin-bottom: 2px; }
  table.lineas { width: 100%; border-collapse: collapse; }
  table.lineas th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.suave}; padding: 2px 6px; border-bottom: 1px solid ${COLORS.linea}; }
  table.lineas td { padding: 4px 6px; border-bottom: 1px solid ${COLORS.linea}; vertical-align: top; }
  .col-num, .linea-valor { text-align: right; white-space: nowrap; width: 110px; font-variant-numeric: tabular-nums; }
  .col-pax, .linea-pax { text-align: right; white-space: nowrap; width: 70px; font-variant-numeric: tabular-nums; }
  .linea-obs { color: ${COLORS.suave}; font-size: 10px; margin-top: 2px; font-style: italic; }
  .sin-servicios { color: ${COLORS.suave}; font-style: italic; }
  .totales { margin-top: 16px; border-top: 2px solid ${COLORS.tinta}; padding-top: 8px; }
  .total-fila { display: flex; justify-content: flex-end; gap: 24px; align-items: baseline; }
  .total-fila.sub { color: ${COLORS.suave}; margin-bottom: 3px; }
  .total-fila.sub .total-valor { font-size: 12px; font-weight: 600; }
  .total-rotulo { font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .total-valor { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .notas { margin-top: 20px; break-inside: avoid; }
  .nota { margin-bottom: 10px; }
  .nota-titulo { font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; border-bottom: 1px solid ${COLORS.linea}; padding-bottom: 2px; margin-bottom: 3px; }
  .nota-texto { color: ${COLORS.tinta}; white-space: pre-wrap; }
`
