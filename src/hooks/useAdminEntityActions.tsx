import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { AdminConfirmModal } from '../components/admin/AdminConfirmModal';
import type { EntityAction } from '../components/admin/AdminEntityCard';
import { showSuccess } from '../utils/feedback';

type ConfirmConfig = {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
};

const CONFIRM_MESSAGES: Partial<Record<EntityAction, ConfirmConfig>> = {
  approve: { title: 'Aprobar', message: '¿Confirmas aprobar este registro?' },
  reject: {
    title: 'Rechazar',
    message: '¿Confirmas rechazar este registro?',
    confirmLabel: 'Rechazar',
    destructive: true,
  },
  suspend: {
    title: 'Suspender',
    message: '¿Confirmas suspender este registro? No podrá acceder a la plataforma.',
    confirmLabel: 'Suspender',
    destructive: true,
  },
  reactivate: {
    title: 'Reactivar',
    message: '¿Confirmas reactivar este registro?',
    confirmLabel: 'Reactivar',
  },
  resetPassword: {
    title: 'Reset contraseña',
    message:
      'Se enviará un OTP al teléfono del dueño para crear o restablecer su contraseña. ¿Continuar?',
    confirmLabel: 'Enviar OTP',
  },
  delete: {
    title: 'Eliminar',
    message: 'Esta acción es permanente. ¿Eliminar este registro y su cuenta?',
    confirmLabel: 'Eliminar',
    destructive: true,
  },
};

const SUCCESS_MESSAGES: Partial<Record<EntityAction, string>> = {
  approve: 'Registro aprobado.',
  reject: 'Registro rechazado.',
  suspend: 'Registro suspendido.',
  reactivate: 'Registro reactivado.',
  resetPassword: 'OTP enviado al teléfono del dueño.',
  delete: 'Registro eliminado.',
};

export function useAdminEntityActions(
  run: (action: EntityAction, id: string) => Promise<{ ok: boolean; error?: string }>,
  onSuccess: () => Promise<void> | void
) {
  const [pending, setPending] = useState<{ action: EntityAction; id: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const requestAction = useCallback((action: EntityAction, id: string) => {
    if (action === 'view' || action === 'edit') return;
    const config = CONFIRM_MESSAGES[action];
    if (!config) return;
    setPending({ action, id });
  }, []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    setLoading(true);
    const res = await run(pending.action, pending.id);
    setLoading(false);
    if (!res.ok) {
      Alert.alert('Error', res.error ?? 'No se pudo completar la acción');
      return;
    }
    setPending(null);
    const successMsg = SUCCESS_MESSAGES[pending.action];
    if (successMsg) showSuccess('Listo', successMsg);
    await onSuccess();
  }, [pending, run, onSuccess]);

  const cancel = useCallback(() => {
    if (!loading) setPending(null);
  }, [loading]);

  const confirmModal = pending ? (
    <AdminConfirmModal
      visible
      title={CONFIRM_MESSAGES[pending.action]?.title ?? 'Confirmar'}
      message={CONFIRM_MESSAGES[pending.action]?.message ?? '¿Continuar?'}
      confirmLabel={CONFIRM_MESSAGES[pending.action]?.confirmLabel}
      destructive={CONFIRM_MESSAGES[pending.action]?.destructive}
      loading={loading}
      onConfirm={() => void confirm()}
      onCancel={cancel}
    />
  ) : null;

  return { requestAction, confirmModal };
}
