# Worker Meu Gastos / Pluggy

Este Worker foi feito para o plano Cloudflare Workers Free. Ele gera Connect
Tokens e faz proxy autenticado das contas/transações Pluggy; ele nao grava no
Firestore e nao recebe webhooks. O navegador autenticado grava somente em seus
proprios documentos, sujeitos as regras do Firestore.

## Secrets e variaveis

No diretorio `worker/`, com o Wrangler autenticado na conta Cloudflare:

```sh
npx wrangler secret put PLUGGY_CLIENT_ID
npx wrangler secret put PLUGGY_CLIENT_SECRET
npx wrangler secret put FIREBASE_WEB_API_KEY
npx wrangler secret put ALLOWED_ORIGIN
npx wrangler deploy
```

`FIREBASE_WEB_API_KEY` e a `apiKey` do `firebaseConfig` do app. Ela ja e
publica no cliente, mas fica configurada aqui para o Worker validar tokens com
o endpoint oficial do Firebase Auth. `ALLOWED_ORIGIN` deve ser a origem exata
do GitHub Pages, sem barra final.

Depois do deploy, preencha a URL do Worker em `config.js`, na raiz do projeto.
Esse arquivo e publico e nao contem secrets.

O app usa o conector MeuPluggy no widget. Primeiro conecte o C6 no Meu Pluggy;
depois autorize o Meu Pluggy no widget do app. A sincronizacao e manual: ela
importa o snapshot que o Meu Pluggy atualiza diariamente. Desconectar no app
remove somente o Item proxy criado para este app; os lançamentos já importados
são mantidos.
