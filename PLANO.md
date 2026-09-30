# Meus Gastos — direção técnica

Projeto pessoal separado do EnterHub. O foco é oferecer uma experiência simples de finanças pessoais com dados bancários sincronizados, sem introduzir framework/build enquanto o produto continua pequeno.

## Princípios

- **Sem build por enquanto:** GitHub Pages + JavaScript ES Modules.
- **Separação por responsabilidade:** UI, estado, Firestore, integração bancária e tema ficam em módulos diferentes.
- **Dados originais preservados:** informações vindas do banco ficam em `banco.*`; alterações do usuário ficam nos campos apresentados pelo app.
- **Sincronização idempotente:** ID determinístico por provedor/Item/conta/transação.
- **Categorias confiáveis:** `null` significa `Sem categoria`; `Outros` é categoria explícita.
- **Segurança por tenant:** cada usuário só acessa documentos cujo `uid` coincide com o próprio Firebase Auth.

## Funcionalidades atuais

- Login Google
- Dashboard mensal
- Lançamentos manuais
- Lançamentos bancários via Meu Pluggy
- Conta/cartão identificados por conta de origem
- Categorização e alerta de lançamentos sem categoria
- Aplicação de categoria a lançamentos bancários equivalentes
- Análise por categoria
- Filtros e pesquisa
- Exportação CSV
- Temas claro/escuro/automático
- PWA com cache do shell
- Firestore offline persistence

## Próximas evoluções naturais

1. Regras permanentes de categorização por estabelecimento.
2. Normalização de estabelecimento (`Carrefour`, `Uber`, etc.).
3. Detecção e pareamento de transferências entre contas próprias.
4. Modelo dedicado para cartão de crédito/faturas/parcelas.
5. Orçamentos, recorrências e metas.
6. Só depois avaliar classificação assistida por IA/ML.
