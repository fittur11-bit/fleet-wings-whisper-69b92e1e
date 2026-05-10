O sistema atual já possui uma base sólida com gestão de frota, biblioteca técnica e controle de envio de peças. Para elevar o patamar e torná-lo um sistema de aviação profissional completo, os seguintes módulos e funcionalidades serão implementados:

### 1. Gestão de Diários de Bordo e Jornada
- **Registro de Voos:** Interface intuitiva para lançar horas de decolagem/pouso, ciclos e consumo de combustível.
- **Atualização Automática de Horas:** O tempo total da aeronave (TTSN) será atualizado automaticamente após cada voo lançado.
- **Controle de Tripulação:** Registro de quem realizou o voo e monitoramento de validade de habilitações (CMA, IFR, etc.).

### 2. Manutenção Preditiva e Preventiva
- **Status das Inspeções:** Painel visual mostrando quanto tempo resta para as próximas inspeções (50h, 100h, Anual).
- **Controle de Componentes:** Monitoramento de peças com limite de vida (LLP) e itens que requerem revisão periódica.
- **Alertas Antecipados:** Notificações quando uma aeronave estiver próxima de um vencimento técnico.

### 3. Gestão de Documentação Legal (RAB & ANAC)
- **Vencimento de Documentos:** Monitoramento automático de CVA, Seguro RETA e Fiam.
- **Histórico de Proprietários/Operadores:** Espaço para armazenar o histórico legal da aeronave.

### 4. Relatórios e Dashboards Executivos
- **Custo Operacional:** Gráficos mostrando o gasto por hora de voo e por aeronave.
- **Disponibilidade de Frota:** Indicadores de quantas aeronaves estão prontas para voo vs. em manutenção.

### Detalhes Técnicos:
- **Banco de Dados:** Criação das tabelas `flight_logs` (diários), `inspections` (manutenções programadas) e `crew_members`.
- **Lógica de Horas:** Implementação de triggers no Supabase para garantir que o horímetro da aeronave esteja sempre sincronizado.
- **UI/UX:** Adição de um menu lateral consolidado e um Dashboard central que resume o status de toda a operação.

Deseja que eu comece pela implementação dos **Diários de Bordo** para automatizar o controle de horas das aeronaves?