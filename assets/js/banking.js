import { auth } from './firebase.js';
import { aviso, estado, $ } from './core.js';
import {
  saveBankAccounts,
  saveBankPage,
  markIntegrationSynced,
  disconnectIntegration,
} from './data.js';

const workerUrl = String(window.MEUS_GASTOS_CONFIG?.workerUrl || '').replace(/\/$/, '');

const idBanco = (itemId, accountId, transactionId) =>
  `bank_${itemId}_${accountId}_${transactionId}`;

async function workerFetch(path, options = {}) {
  if (!workerUrl) {
    throw new Error('Configure a URL do Worker para conectar o banco');
  }

  const token = await auth.currentUser?.getIdToken();

  if (!token) {
    throw new Error('Entre novamente para conectar o banco');
  }

  const response = await fetch(workerUrl + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error || 'Não foi possível consultar o Meu Pluggy');
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function categoriaBanco(transaction, tipo) {
  const source = String(transaction.category || '').trim().toLocaleLowerCase('pt-BR');
  if (!source) return null;

  return estado.cats[tipo].find(
    (categoria) => categoria.toLocaleLowerCase('pt-BR') === source
  ) || null;
}

function normalizarTransacao(item, account, transaction) {
  const tipo = transaction.type === 'CREDIT' ? 'in' : 'out';
  const valor = Math.round(Math.abs(Number(transaction.amount)) * 100);
  const data = String(transaction.date || '').slice(0, 10);

  if (
    !transaction.id ||
    !Number.isFinite(valor) ||
    valor <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data)
  ) return null;

  return {
    id: idBanco(item.id, account.id, transaction.id),
    dados: {
      tipo,
      valor,
      categoria: categoriaBanco(transaction, tipo),
      data,
      descricao: String(
        transaction.description ||
        transaction.descriptionRaw ||
        'Transação bancária'
      ).slice(0, 80),
      origem: 'banco',
      banco: {
        provedor: 'pluggy',
        instituicao: item.institution,
        itemId: item.id,
        contaId: account.id,
        contaNome: account.name,
        transacaoId: transaction.id,
        descricaoOriginal: transaction.descriptionRaw || transaction.description || null,
        categoriaOriginal: transaction.category || null,
        status: transaction.status || null,
        tipoOriginal: transaction.type || null,
        providerId: transaction.providerId || null,
        providerCode: transaction.providerCode || null,
        moeda: transaction.currencyCode || 'BRL',
        atualizadoNaOrigemEm: transaction.updatedAt || null,
      },
    },
  };
}

async function sincronizarItem(itemId) {
  const { item, accounts } = await workerFetch('/item', {
    method: 'POST',
    body: JSON.stringify({ itemId }),
  });

  if (!accounts.length) {
    throw new Error('Nenhuma conta foi disponibilizada pelo Meu Pluggy');
  }

  await saveBankAccounts(item, accounts);

  let total = 0;

  for (const account of accounts) {
    let next = '';

    do {
      const params = new URLSearchParams({
        itemId: item.id,
        accountId: account.id,
      });

      if (next) params.set('next', next);

      const page = await workerFetch(`/transactions?${params}`, { method: 'GET' });
      total += await saveBankPage(item, account, page.results || [], (transaction) =>
        normalizarTransacao(item, account, transaction)
      );
      next = page.next || '';
    } while (next);
  }

  await markIntegrationSynced(item.id);
  return total;
}

async function sincronizarTudo() {
  if (estado.sincronizando || !estado.integracoes.length) return;

  estado.sincronizando = true;
  $('#btn-sync')?.classList.add('girando');
  aviso('Buscando atualizações...');

  let total = 0;
  let falhas = 0;

  try {
    for (const integration of estado.integracoes) {
      try {
        total += await sincronizarItem(integration.id);
      } catch (error) {
        console.error(error);
        falhas += 1;
      }
    }
  } finally {
    estado.sincronizando = false;
    $('#btn-sync')?.classList.remove('girando');
  }

  aviso(
    falhas
      ? `${total} lançamento(s) atualizados, ${falhas} conta(s) falharam`
      : `${total} lançamento(s) atualizados`
  );
}

async function conectarBanco() {
  if (!window.PluggyConnect) {
    aviso('Não foi possível abrir a conexão bancária');
    return;
  }

  try {
    const { accessToken } = await workerFetch('/connect-token', {
      method: 'POST',
      body: '{}',
    });

    new window.PluggyConnect({
      connectToken: accessToken,
      includeSandbox: false,
      connectorIds: [200],
      onSuccess: async (data) => {
        const itemId = data?.item?.id || data?.id;
        if (!itemId) {
          aviso('A conexão não retornou um identificador válido');
          return;
        }

        try {
          aviso('Importando transações...');
          const total = await sincronizarItem(itemId);
          aviso(`${total} transação(ões) importada(s)`);
        } catch (error) {
          console.error(error);
          aviso(error.message || 'A conexão foi criada, mas não foi possível importar');
        }
      },
      onError: (error) => {
        console.error(error);
        aviso(error?.message || 'Não foi possível concluir a conexão');
      },
    }).init();
  } catch (error) {
    console.error(error);
    aviso(error.message || 'Não foi possível iniciar a conexão');
  }
}

async function desconectarBanco(itemId) {
  await workerFetch('/item', {
    method: 'DELETE',
    body: JSON.stringify({ itemId }),
  });

  // O Item é desconectado na Pluggy; os lançamentos importados continuam no Firestore.
  await disconnectIntegration(itemId);
}

export {
  workerFetch,
  categoriaBanco,
  idBanco,
  normalizarTransacao,
  sincronizarItem,
  sincronizarTudo,
  conectarBanco,
  desconectarBanco,
};
