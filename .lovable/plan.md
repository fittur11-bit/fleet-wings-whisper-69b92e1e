# Plano: Agendamento de Aeronaves no Quadro de Avisos

Adicionar funcionalidade de agendamento (início, fim e tipo) ao módulo de Quadro de Avisos (Demandas), permitindo organizar eventos temporais para as aeronaves.

## Alterações Técnicas

### Frontend

- **src/routes/demands.tsx**:
    - Importar ícone `Calendar` de `lucide-react`.
    - Importar `SCHEDULE_TYPES` e `scheduleTypeLabel` de `@/lib/demands`.
    - Atualizar o estado inicial do formulário (`emptyForm`) com os novos campos.
    - Atualizar a função `openEdit` para carregar os dados de agendamento existentes.
    - Modificar a função `submit` para enviar `scheduled_start`, `scheduled_end` e `schedule_type` para o banco de dados.
    - Adicionar novos campos de entrada no diálogo de criação/edição:
        - Tipo de agendamento (Select).
        - Data/Hora de início (Input datetime-local).
        - Data/Hora de fim (Input datetime-local).
    - Atualizar o componente `DemandCard` para exibir as informações de agendamento de forma clara, utilizando ícones e badges se necessário.

## Detalhes de Segurança e Banco de Dados

- As colunas já foram adicionadas via migração (`scheduled_start`, `scheduled_end`, `schedule_type`).
- As políticas de RLS existentes para a tabela `demands` já cobrem esses novos campos.
