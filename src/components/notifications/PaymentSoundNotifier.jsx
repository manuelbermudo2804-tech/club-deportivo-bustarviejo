import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSoundNotifications } from './useSoundNotifications';

export default function PaymentSoundNotifier({ user }) {
  const { data: payments } = useQuery({
    queryKey: ['payments-sound'],
    queryFn: () => base44.entities.Payment.list('-updated_date', 100),
    refetchInterval: 10000,
    enabled: !!user && user.role !== 'admin'
  });

  const { checkForNewItems } = useSoundNotifications({
    dataKey: 'payments',
    enabled: true,
    filter: (payment) => {
      // Solo pagos aprobados recientemente (últimas 2 horas)
      const isRecent = new Date(payment.updated_date) > new Date(Date.now() - 2 * 60 * 60 * 1000);
      return payment.estado === 'Pagado' && isRecent;
    }
  });

  useEffect(() => {
    if (payments) {
      checkForNewItems(payments);
    }
  }, [payments, checkForNewItems]);

  return null;
}