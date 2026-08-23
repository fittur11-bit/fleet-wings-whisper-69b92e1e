import { createFileRoute } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { addHours, addDays, format } from 'date-fns';

export const Route = createFileRoute('/api/public/process-notifications')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Simple security check using a secret header
        const cronSecret = request.headers.get('x-cron-secret');
        if (cronSecret !== 'super-secret-notification-trigger') {
          return new Response('Unauthorized', { status: 401 });
        }

        const now = new Date();
        const in24h = addDays(now, 1);
        const in1h = addHours(now, 1);

        const { data: startingSoonData } = await supabase
          .from('demands' as any)
          .select('*')
          .neq('status', 'done')
          .neq('status', 'cancelled')
          .gte('scheduled_start', now.toISOString())
          .lte('scheduled_start', in24h.toISOString());

        const startingSoon = startingSoonData as any[];

        const { data: endingSoonData } = await supabase
          .from('demands' as any)
          .select('*')
          .neq('status', 'done')
          .neq('status', 'cancelled')
          .gte('scheduled_end', now.toISOString())
          .lte('scheduled_end', in1h.toISOString());

        const endingSoon = endingSoonData as any[];

        const notifications: any[] = [];

        if (Array.isArray(startingSoon)) {
          for (const demand of startingSoon) {
             notifications.push({
               user_id: demand.user_id,
               demand_id: demand.id,
               type: 'start_soon',
               message: `O agendamento "${demand.title}" ${demand.aircraft_prefix ? `(${demand.aircraft_prefix})` : ''} inicia em breve (previsto para ${format(new Date(demand.scheduled_start), 'HH:mm')}).`,
             });
          }
        }

        if (Array.isArray(endingSoon)) {
          for (const demand of endingSoon) {
            notifications.push({
              user_id: demand.user_id,
              demand_id: demand.id,
              type: 'ending_soon',
              message: `O agendamento "${demand.title}" está prestes a terminar (previsão: ${format(new Date(demand.scheduled_end), 'HH:mm')}).`,
            });
          }
        }

        if (notifications.length > 0) {
          const twelveHoursAgo = addHours(now, -12).toISOString();
          
          for (const n of notifications) {
            const { data: existingData } = await supabase
              .from('notifications' as any)
              .select('id')
              .eq('user_id', n.user_id)
              .eq('demand_id', n.demand_id)
              .eq('type', n.type)
              .gt('created_at', twelveHoursAgo)
              .limit(1);

            const existing = existingData as any[];

            if (!existing || (Array.isArray(existing) && existing.length === 0)) {
              await supabase.from('notifications' as any).insert(n as any);
            }
          }
        }

        return new Response(JSON.stringify({ processed: notifications.length }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
