'use client';

import NextError from 'next/error';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  // eslint-disable-next-line no-console
  console.error(error);

  return (
    <html lang='es'>
      <body>
        {/* `NextError` es la página de error por defecto de Next.js. Su tipo exige
        `statusCode`; el App Router no expone códigos de estado para errores, así
        que se pasa 0 para renderizar un mensaje genérico. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
