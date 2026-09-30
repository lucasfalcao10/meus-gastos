# Meus Gastos

PWA de controle financeiro pessoal, sem framework e sem etapa de build. O aplicativo é hospedado no GitHub Pages, usa Google/Firebase Authentication + Firestore e integra contas bancárias pelo Cloudflare Worker + Meu Pluggy.

## Estrutura atual

```text
meus-gastos/
├── index.html                 # Estrutura das telas
├── config.js                  # Configurações públicas do cliente
├── assets/
│   ├── css/app.css            # Estilos do aplicativo
│   └── js/
│       ├── app.js             # Eventos, navegação e ciclo de vida
│       ├── core.js            # Estado, utilitários e regras visuais
│       ├── data.js            # Camada de acesso ao Firestore
│       ├── firebase.js        # Inicialização do Firebase SDK
│       ├── banking.js         # Integração com o Worker/Pluggy
│       ├── ui.js              # Renderização das telas
│       ├── theme.js           # Tema antes da pintura inicial
│       └── theme-manager.js   # Troca e persistência do tema
├── firestore.rules            # Segurança por usuário
├── firestore.indexes.json     # Índice da categorização em lote
├── sw.js                      # Service Worker / PWA
├── manifest.json              # Metadados da PWA
└── worker/                    # Cloudflare Worker
```

## Modelo de dados

```text
users/{uid}
  categorias: { out: [...], in: [...] }

users/{uid}/lancamentos/{id}
  tipo: "in" | "out"
  valor: centavos (int)
  categoria: string | null
  data: "AAAA-MM-DD"
  descricao: string
  origem: "manual" | "banco"
  criadoEm: timestamp
  banco?: {
    provedor
    instituicao
    itemId
    contaId
    transacaoId
    descricaoOriginal
    categoriaOriginal
    sincronizadoEm
    importadoEm
    ...
  }

users/{uid}/integrations/{itemId}
  provedor, itemId, instituicao, status,
  lastSyncedAt, consentExpiresAt, ...

users/{uid}/bank_accounts/{itemId__accountId}
  itemId, accountId, instituicao, nome, saldo, status, ...
```

A importação bancária usa um ID determinístico por Item, conta e transação, por isso a sincronização é idempotente. Quando o lançamento já existe, dados editados pelo usuário (valor, data, categoria e descrição) não são sobrescritos.

`Sem categoria` é representado por `categoria: null`; `Outros` continua sendo uma categoria real. Ao categorizar um lançamento bancário, o aplicativo pode localizar outros lançamentos com a mesma descrição original e oferecer a aplicação da mesma categoria.

## Firebase

1. Crie um projeto no Firebase e habilite Google em Authentication.
2. Crie o Firestore em modo de produção.
3. Publique `firestore.rules`.
4. Publique `firestore.indexes.json` se usar o Firebase CLI para gerenciar índices.
5. Registre o app Web e mantenha o `firebaseConfig` em `config.js`. Esses valores são públicos; a proteção é feita pelas regras do Firestore.
6. Autorize o domínio do GitHub Pages em Authentication → Settings → Authorized domains.

As regras foram estruturadas para que a permissão do documento `users/{uid}` não seja herdada pelas subcoleções. Cada subcoleção possui sua própria validação.

## Cloudflare Worker / Meu Pluggy

O Worker mantém `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `FIREBASE_WEB_API_KEY` e `ALLOWED_ORIGIN` nos secrets da Cloudflare. O navegador envia somente o ID token do Firebase. O Worker valida o usuário e verifica se o Item pertence àquele usuário e ao conector Meu Pluggy antes de consultar contas ou transações.

Na pasta `worker/`:

```sh
npx wrangler secret put PLUGGY_CLIENT_ID
npx wrangler secret put PLUGGY_CLIENT_SECRET
npx wrangler secret put FIREBASE_WEB_API_KEY
npx wrangler secret put ALLOWED_ORIGIN
npx wrangler deploy
```

Atualize a URL pública em `config.js`.

## GitHub Pages

A aplicação não precisa de build. Publique a pasta raiz na branch `main`. Ao alterar assets ou módulos do aplicativo, incremente `VERSAO` em `sw.js` para invalidar o shell antigo nos dispositivos.

## Teste local

```sh
python3 -m http.server 5500
```

Abra `http://localhost:5500`.
