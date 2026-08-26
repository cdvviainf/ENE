import { Metadata } from 'next';
import SignInViewPage from '@/features/auth/components/sign-in-view';

export const metadata: Metadata = {
  title: 'Iniciar sesión | Extremo Norte Expediciones',
  description: 'Acceso al Sistema de Gestión de Operaciones'
};

export default function Page() {
  return <SignInViewPage />;
}
