# Redesign Visual do Core Flight — Identidade Aeronáutica Profissional

Esta proposta detalha o redesign visual do sistema para adotar uma estética profissional de aviação e engenharia, abandonando o visual genérico de "IA/SaaS".

## Mudanças Visuais

- **Nova Paleta de Cores**: Substituição do Azul Elétrico e Dourado por uma paleta institucional sóbria:
    - Fundo: `#F4F5F6`
    - Sidebar: `#17212B`
    - Cards: `#FFFFFF`
    - Azul Institucional: `#245A7A`
- **Tipografia**: Ajuste para focar exclusivamente na **Inter**, com pesos variados para hierarquia.
- **Formas e Bordas**: Redução do `border-radius` para **6px** globalmente, criando uma aparência mais técnica e precisa.
- **Remoção de Efeitos "IA"**: Eliminação de gradientes, glows, glassmorphism e sombras exageradas.
- **Redesign do Dashboard**: Foco em indicadores operacionais e densidade de informação, removendo elementos meramente decorativos.

## Detalhes Técnicos

- **CSS Moderno**: Atualização do `src/styles.css` utilizando o tema do Tailwind v4.
- **Refatoração de Componentes UI**:
    - **Card**: Remoção de `shadow` e ajuste de `rounded-xl` para `rounded-md` (6px).
    - **Button**: Ajuste das variantes `default` e `secondary` para as novas cores.
    - **AppSidebar**: Aplicação da cor `#17212B` e remoção do efeito glassmorphism.
    - **Table**: Melhoria da densidade e remoção de estilizações excessivas.
- **Dashboard**: Substituição do estilo "Bento Grid" luminoso por um layout de grid funcional com cores sóbrias.
- **Limpeza de Ativos**: Remoção de fontes e estilos não utilizados (Sora, JetBrains Mono se não essenciais).
