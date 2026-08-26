'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

// Better Auth responde en inglés con un `code` estable; se traduce acá en vez
// de mostrar `error.message` (viene en inglés y no es apto para los usuarios
// del sistema). Código no mapeado → mensaje genérico, nunca el texto crudo.
const MENSAJES_ERROR: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Correo o contraseña incorrectos.',
  EMAIL_NOT_VERIFIED: 'La cuenta aún no está verificada. Contacta a un administrador.',
  USER_NOT_FOUND: 'Correo o contraseña incorrectos.'
};

function mensajeError(code: string | undefined): string {
  return (code && MENSAJES_ERROR[code]) || 'No fue posible iniciar sesión. Intenta nuevamente.';
}

export default function UserAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(mensajeError(result.error.code));
        return;
      }
      toast.success('Sesión iniciada');
      // RN-PER-01: sin nivel de acceso el sidebar decide qué mostrar; acá solo
      // se respeta el destino original si el usuario llegó redirigido.
      const destino = searchParams.get('from') || '/dashboard';
      router.push(destino);
      router.refresh();
    } catch {
      setError('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className='w-full space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='email'>Correo electrónico</Label>
        <Input
          id='email'
          type='email'
          placeholder='usuario@extremonorte.cl'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
          autoComplete='email'
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='password'>Contraseña</Label>
        <Input
          id='password'
          type='password'
          placeholder='••••••••'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
          autoComplete='current-password'
        />
      </div>
      {error && <p className='text-destructive text-sm'>{error}</p>}
      <Button type='submit' className='w-full' disabled={loading}>
        {loading ? 'Ingresando...' : 'Iniciar sesión'}
      </Button>
    </form>
  );
}
