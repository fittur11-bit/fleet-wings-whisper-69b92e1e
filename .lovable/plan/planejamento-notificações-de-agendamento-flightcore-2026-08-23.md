# Planejamento: Notificações de Agendamento (FlightCore)

O objetivo é implementar um sistema de notificações para alertar os usuários quando um agendamento no Quadro de Avisos (`demands`) estiver próximo do início ou do fim. Como o projeto utiliza TanStack Start e Lovable Cloud, usaremos cron jobs do banco de dados chamando endpoints da API do app.

## Alterações Propostas

### 1. Banco de Dados (Supabase)
- Criar a tabela `notifications` para armazenar os alertas gerados.
- Implementar RLS para que usuários vejam apenas suas próprias notificações.
- Configurar `pg_cron` para executar uma função de verificação a cada hora.
- Essa função (`check_upcoming_schedules`) fará uma requisição HTTP para o endpoint `/api/public/process-notifications`.

### 2. Backend (API do App)
- Criar a rota `src/routes/api/public/process-notifications.ts`.
- Este endpoint irá:
    - Buscar demandas com `scheduled_start` ou `scheduled_end` próximos (ex: 24h para início, 1h para fim).
    - Criar registros na tabela `notifications`.
    - (Opcional) Enviar e-mails via Supabase Auth ou integração SMTP se configurado.

### 3. Frontend (Interface)
- **Componente de Notificações**: Adicionar um sino de notificações no `AppSidebar` ou no header móvel do `AppShell`.
- **Pop-over de Alertas**: Exibir lista de notificações não lidas.
- **Push Visual**: Usar `sonner` para exibir brindes de notificações em tempo real se o usuário estiver logado.

## Detalhes Técnicos

### Esquema da Tabela `notifications`
```sql
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    demand_id UUID REFERENCES public.demands(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'start_soon', 'ending_soon', 'overdue'
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Lógica de Agendamento
- **Início Próximo**: Alerta 24 horas antes de `scheduled_start`.
- **Fim Próximo**: Alerta 1 hora antes de `scheduled_end`.

## Considerações de Segurança
- O endpoint `/api/public/process-notifications` será protegido por uma chave secreta no header (`x-cron-secret`) para evitar chamadas externas maliciosas.

## Próximos Passos
1. Executar migração SQL para tabelas e cron.
2. Implementar a rota de API.
3. Criar o componente UI de notificações.
