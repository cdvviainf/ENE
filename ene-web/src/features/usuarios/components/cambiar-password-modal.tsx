'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { usuariosService } from '../service';
import { PasswordStrengthIndicator } from './password-strength-indicator';
import type { Usuario } from '../types';

export function CambiarPasswordModal({
  usuario,
  open,
  onClose
}: {
  usuario: Usuario;
  open: boolean;
  onClose: () => void;
}) {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const mutation = useMutation({
    mutationFn: () => usuariosService.changePassword(usuario.id, { password, passwordConfirm }),
    onSuccess: () => {
      toast.success('Contraseña actualizada. Se cerraron las sesiones activas del usuario.');
      setPassword('');
      setPasswordConfirm('');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al cambiar la contraseña')
  });

  function cerrar() {
    setPassword('');
    setPasswordConfirm('');
    onClose();
  }

  return (
    <Modal
      title={`Cambiar contraseña — ${usuario.nombre}`}
      description='Revoca las sesiones activas del usuario (RN-PER-04): deberá volver a iniciar sesión.'
      isOpen={open}
      onClose={cerrar}
    >
      <div className='space-y-4 pt-2'>
        <div className='space-y-1.5'>
          <Label htmlFor='password'>Nueva contraseña</Label>
          <Input
            id='password'
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder='••••••••'
          />
          <PasswordStrengthIndicator password={password} />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='passwordConfirm'>Confirmar contraseña</Label>
          <Input
            id='passwordConfirm'
            type='password'
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder='••••••••'
          />
        </div>
        <div className='flex justify-end gap-2 pt-2'>
          <Button variant='outline' onClick={cerrar} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            isLoading={mutation.isPending}
            disabled={!password || !passwordConfirm}
          >
            Cambiar contraseña
          </Button>
        </div>
      </div>
    </Modal>
  );
}
