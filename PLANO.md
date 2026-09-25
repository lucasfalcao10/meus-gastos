# Meus Gastos — plano

Projeto pessoal, **totalmente separado do EnterHub** (outra pasta, outro git, contas pessoais).

## Decisões
- PWA simples: `index.html` (HTML+CSS+JS juntos), `manifest.json`, `sw.js`. Sem framework, sem build.
- Hospedagem: GitHub Pages (conta pessoal).
- Dados e login: Firebase (conta Google pessoal), plano gratuito.
  - Login: botão "Entrar com Google".
  - Banco: Firestore, cada usuário só vê os próprios dados (regras de segurança por uid).
  - Cache offline do Firestore: funciona sem internet e sincroniza depois.
- Uso multiusuário: eu e minha namorada, mesmo link, cada um com a sua conta Google.
- Otimizado para iPhone (Safari → Adicionar à Tela de Início), responsivo pra computador.

## MVP
1. Login com Google
2. Início: saldo do mês, entradas e despesas, lançamentos recentes
3. Botão ＋ para lançar entrada ou despesa (valor, categoria, data, descrição)
4. Filtro/troca de mês
5. Relatório: gráfico por categoria
6. Config.: categorias, tema claro/escuro, exportar CSV, sair
7. PWA: ícone, tela cheia, splash, cache

Navegação inferior: 🏠 Início · 📊 Relatório · ⚙️ Config.

## Fase 2 (depois)
Cartões, parcelamentos, recorrentes, contas bancárias, metas, evolução dos gastos,
lembretes, PIN/passkey, orçamento compartilhado do casal.
