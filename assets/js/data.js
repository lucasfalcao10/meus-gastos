import {
  db,
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from './firebase.js';
import { CAT_PADRAO, estado, somaMes } from './core.js';

const BATCH_SIZE = 450;

const colLancs = () => collection(db, 'users', estado.uid, 'lancamentos');
const docUser = () => doc(db, 'users', estado.uid);
const colIntegracoes = () => collection(db, 'users', estado.uid, 'integrations');
const colContas = () => collection(db, 'users', estado.uid, 'bank_accounts');

async function commitChunks(items, apply) {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = items.slice(i, i + BATCH_SIZE);
    for (const item of chunk) apply(batch, item);
    await batch.commit();
  }
}

function observeUser({ onChange, onError }) {
  return onSnapshot(docUser(), (snap) => {
    const data = snap.data();

    if (data?.categorias) {
      estado.cats = {
        out: data.categorias.out || [],
        in: data.categorias.in || [],
      };
    } else if (!snap.metadata.fromCache) {
      setDoc(docUser(), { categorias: CAT_PADRAO }, { merge: true }).catch(onError);
    }

    onChange?.();
  }, onError);
}

function observeMonth(m, { onChange, onError }) {
  const q = query(
    colLancs(),
    where('data', '>=', `${m}-01`),
    where('data', '<', `${somaMes(m, 1)}-01`),
    orderBy('data', 'desc'),
  );

  estado.lancs = [];
  estado.lancsAnt = [];
  onChange?.({ pendingWrites: false });

  return onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
    estado.lancs = snap.docs
      .map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }))
      .sort((a, b) => (
        b.data.localeCompare(a.data)
        || (b.criadoEm?.toMillis?.() ?? 0) - (a.criadoEm?.toMillis?.() ?? 0)
      ));

    return onChange?.({ pendingWrites: snap.metadata.hasPendingWrites });
  }, onError);
}

async function carregarMesAnterior(m, { onChange, onError } = {}) {
  const ant = somaMes(m, -1);

  try {
    const snap = await getDocs(query(
      colLancs(),
      where('data', '>=', `${ant}-01`),
      where('data', '<', `${m}-01`),
    ));

    if (estado.mes !== m) return;

    estado.lancsAnt = snap.docs.map((d) => d.data());
    onChange?.();
  } catch (error) {
    onError?.(error);
  }
}

function observeIntegracoes({ onChange, onError }) {
  return onSnapshot(colIntegracoes(), (snap) => {
    estado.integracoes = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((item) => item.status === 'connected')
      .sort((a, b) => String(a.instituicao).localeCompare(String(b.instituicao)));

    onChange?.();
  }, onError);
}

function observeContas({ onChange, onError }) {
  return onSnapshot(colContas(), (snap) => {
    estado.contas = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (
        String(a.instituicao).localeCompare(String(b.instituicao))
        || String(a.nome).localeCompare(String(b.nome))
      ));

    onChange?.();
  }, onError);
}

async function saveCategories() {
  await setDoc(docUser(), { categorias: estado.cats }, { merge: true });
}

async function saveTransaction(dados, id = null) {
  if (id) {
    await updateDoc(doc(colLancs(), id), dados);
    return id;
  }

  const ref = doc(colLancs());
  await setDoc(ref, { ...dados, criadoEm: serverTimestamp() });
  return ref.id;
}

async function deleteTransaction(id) {
  await deleteDoc(doc(colLancs(), id));
}

async function findSimilarBankTransactions({ description, tipo, currentId }) {
  if (!description) return [];

  const snap = await getDocs(query(
    colLancs(),
    where('origem', '==', 'banco'),
    where('tipo', '==', tipo),
    where('banco.descricaoOriginal', '==', description),
  ));

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((item) => item.id !== currentId)
    .filter((item) => !item.categoria || item.categoria === 'Outros');
}

async function applyCategoryToTransactions(ids, categoria) {
  if (!ids.length) return;
  await commitChunks(ids, (batch, id) => {
    batch.update(doc(colLancs(), id), { categoria });
  });
}

async function loadAllTransactions() {
  const snap = await getDocs(query(colLancs(), orderBy('data')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function saveBankAccounts(item, accounts) {
  const writes = accounts.map((account) => ({
    ref: doc(db, 'users', estado.uid, 'bank_accounts', `${item.id}__${account.id}`),
    data: {
      provedor: 'pluggy',
      itemId: item.id,
      accountId: account.id,
      instituicao: item.institution,
      nome: account.name,
      tipo: account.type,
      subtipo: account.subtype,
      numeroMascarado: account.number,
      saldo: account.balance,
      moeda: account.currencyCode,
      status: account.status,
      atualizadoEm: serverTimestamp(),
    },
  }));

  await commitChunks(writes, (batch, write) => {
    batch.set(write.ref, write.data, { merge: true });
  });

  const integrationRef = doc(db, 'users', estado.uid, 'integrations', item.id);
  await setDoc(integrationRef, {
    provedor: 'pluggy',
    itemId: item.id,
    instituicao: item.institution,
    status: 'connected',
    lastItemUpdatedAt: item.lastUpdatedAt,
    consentExpiresAt: item.consentExpiresAt,
    accountCount: accounts.length,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

async function saveBankPage(item, account, transactions, normalize) {
  const rows = transactions.map(normalize).filter(Boolean);
  if (!rows.length) return 0;

  const existing = await Promise.all(rows.map(({ id }) => getDoc(doc(colLancs(), id))));

  const writes = rows.map(({ id, dados }, index) => {
    const exists = existing[index].exists();
    const previous = exists ? existing[index].data() : null;
    const banco = {
      ...dados.banco,
      importadoEm: previous?.banco?.importadoEm || serverTimestamp(),
      sincronizadoEm: serverTimestamp(),
    };

    return {
      ref: doc(colLancs(), id),
      data: exists
        ? { origem: 'banco', banco }
        : { ...dados, criadoEm: serverTimestamp(), banco },
      merge: exists,
    };
  });

  await commitChunks(writes, (batch, write) => {
    if (write.merge) batch.set(write.ref, write.data, { merge: true });
    else batch.set(write.ref, write.data);
  });

  return rows.length;
}

async function disconnectIntegration(itemId) {
  const accounts = await getDocs(query(
    colContas(),
    where('itemId', '==', itemId),
  ));

  const writes = accounts.docs.map((snapshot) => snapshot.ref);
  await commitChunks(writes, (batch, ref) => batch.delete(ref));
  await deleteDoc(doc(db, 'users', estado.uid, 'integrations', itemId));
}

async function markIntegrationSynced(itemId) {
  await updateDoc(doc(db, 'users', estado.uid, 'integrations', itemId), {
    lastSyncedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export {
  colLancs,
  docUser,
  observeUser,
  observeMonth,
  carregarMesAnterior,
  observeIntegracoes,
  observeContas,
  saveCategories,
  saveTransaction,
  deleteTransaction,
  findSimilarBankTransactions,
  applyCategoryToTransactions,
  loadAllTransactions,
  saveBankAccounts,
  saveBankPage,
  markIntegrationSynced,
  disconnectIntegration,
};
