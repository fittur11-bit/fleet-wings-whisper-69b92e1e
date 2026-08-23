# Redesign Visual do Core Flight — Identidade Aeronáutica Profissional

O objetivo é transformar a interface em um sistema de operação aeronáutica sóbrio e técnico, focando em precisão e confiabilidade.

## Mudanças Visuais e de Identidade

- **Nova Paleta Técnica**:
    - **Fundo**: `#F4F5F6` (Claro) / `#17212B` (Escuro)
    - **Acentuação**: Azul Institucional (`#245A7A`) e Âmbar Técnico (`#C58A21`).
    - **Status**: Verde (`#37805A`) e Vermelho (`#B94A48`).
- **Tipografia**: Migração total para a fonte **Inter**. Remoção da Sora e Manrope.
- **Geometria**: Border-radius padronizado em **6px** globalmente.
- **Remoção de Efeitos de IA**: Fim de gradientes, glows, efeitos de vidro (glassmorphism) e sombras saturadas.

## Implementação Técnica

- **Estilos Globais (`src/styles.css`)**:
    - Reconfiguração dos tokens de tema para as novas cores.
    - Remoção das classes `.glass-card`, `.gold-text` e utilitários de gradiente.
    - Simplificação do scrollbar e bordas.
- **Tipografia (`src/routes/__root.tsx`)**:
    - Atualização do link do Google Fonts para focar apenas na **Inter**.
- **Sidebar (`src/components/AppSidebar.tsx`)**:
    - Redesign para um visual corporativo escuro (`#17212B`).
    - Itens de navegação com hover e estado ativo simplificados (sem gradientes).
- **Dashboard (`src/routes/dashboard.tsx`)**:
    - Reformulação do layout Bento Grid para um grid técnico e denso.
    - Substituição de cards decorativos por KPIs operacionais diretos.
    - Ajuste de cores dos gráficos para a nova paleta.
- **Componentes UI**:
    - Padronização de botões, inputs e tabelas para a nova estética industrial.
