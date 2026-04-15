import { useState, useCallback } from 'react';
import { ToastType } from '../components/Toast';
import { haptics } from '../lib/haptics';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

export const useToast = () => {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', haptic: boolean = true) => {
      setToast({ visible: true, message, type });
      
      if (haptic) {
        if (type === 'success') {
          haptics.success();
        } else if (type === 'error') {
          haptics.error();
        } else if (type === 'warning') {
          haptics.warning();
        } else {
          haptics.light();
        }
      }
    },
    []
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const error = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const warning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast]);

  return {
    toast,
    showToast,
    hideToast,
    success,
    error,
    warning,
    info,
  };
};
