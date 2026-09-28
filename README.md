# Meus Gastos

PWA simples de controle de gastos (HTML + CSS + JS num arquivo só, sem build).
Dados no Firebase (login Google + Firestore), hospedagem no GitHub Pages.

Arquivos:

- `index.html` — o app inteiro
- `manifest.json`, `sw.js`, `icons/` — PWA (ícone, tela cheia, splash, cache offline)
- `firestore.rules` — regras de segurança (cada usuário só vê os próprios dados)
- `worker/` — backend Cloudflare Workers Free para Meu Pluggy, sem Firebase Functions
- `config.js` — URL pública do Worker (não contém segredo)

## Meu Pluggy no plano gratuito

Esta integração preserva o Firebase Spark: o Cloudflare Worker guarda os
segredos da Pluggy, valida o token do Firebase Auth e entrega ao navegador só
os dados da própria conta. O navegador grava no Firestore usando o token do
usuário e as regras existentes. Não há Cloud Functions, conta de cobrança ou
webhook de escrita automática.

1. Crie o Worker seguindo [worker/README.md](worker/README.md), configurando
   os secrets no dashboard/CLI da Cloudflare.
2. Cole a URL `*.workers.dev` do deploy em `config.js`.
3. No Meu Pluggy, conecte primeiro a conta C6. No app, abra **Config. → Contas
   e integrações → Conectar banco** e autorize o Meu Pluggy no widget.

O Meu Pluggy atualiza suas conexões diariamente. No app, use **Sincronizar**
para importar o snapshot disponível. A importação usa um ID determinístico por
Item, conta e transação, portanto não duplica lançamentos.

## 1. Firebase (uma vez)

1. Em <https://console.firebase.google.com>, com a conta Google pessoal, crie um projeto (Analytics pode ficar desligado).
2. **Authentication → Sign-in method** → ative **Google**.
3. **Authentication → Settings → Authorized domains** → adicione `SEU-USUARIO.github.io`.
4. **Firestore Database** → Criar banco (modo produção, região `southamerica-east1`).
5. **Firestore → Regras** → cole o conteúdo de `firestore.rules` e publique.
6. **Configurações do projeto → Seus apps → Web (`</>`)** → registre o app e copie o `firebaseConfig`.
7. Cole esses valores no `firebaseConfig` dentro de `index.html` (procure `COLE_AQUI`).

Os valores do `firebaseConfig` não são secretos — a proteção é feita pelas regras do Firestore.

## 2. GitHub Pages

1. Crie um repositório na conta pessoal e faça push deste projeto na branch `main`.
2. **Settings → Pages** → Source: *Deploy from a branch*, branch `main`, pasta `/ (root)`.
3. O app fica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

Ao publicar mudanças, aumente `VERSAO` em `sw.js` para os celulares pegarem a versão nova.

## 3. No iPhone

Abra o link no **Safari** → botão Compartilhar → **Adicionar à Tela de Início**.
Cada pessoa entra com a própria conta Google e vê só os próprios lançamentos.

## Testar localmente

```sh
python3 -m http.server 5500
```

Abra <http://localhost:5500> (o `localhost` já vem autorizado no Firebase Auth).

## Modelo de dados

```
users/{uid}                       { categorias: { out: [...], in: [...] } }
users/{uid}/lancamentos/{id}      { tipo: "in"|"out", valor: centavos (int),
                                    categoria, data: "AAAA-MM-DD", descricao, criadoEm,
                                    origem: "manual"|"banco", banco? }
users/{uid}/integrations/{itemId} { status, última sincronização, dados do Item }
users/{uid}/bank_accounts/{id}    { itemId, accountId, nome, saldo, status }
```
