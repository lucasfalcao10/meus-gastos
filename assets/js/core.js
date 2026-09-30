const CAT_PADRAO = {
  out: [
    'Alimentação',
    'Mercado',
    'Moradia',
    'Transporte',
    'Saúde',
    'Lazer',
    'Educação',
    'Compras',
    'Assinaturas',
    'Outros',
  ],
  in: [
    'Salário',
    'Freelance',
    'Investimentos',
    'Presente',
    'Outros',
  ],
};

const CAT_EMOJI = {
  'alimentação': '🍔',
  'mercado': '🛒',
  'moradia': '🏠',
  'transporte': '🚗',
  'saúde': '⚕',
  'lazer': '🎮',
  'educação': '📚',
  'compras': '🛍',
  'assinaturas': '🔄',
  'viagem': '✈',
  'pets': '🐶',
  'academia': '🏋',
  'combustível': '⛽',
  'salário': '💰',
  'freelance': '💼',
  'investimentos': '📈',
  'presente': '🎁',
  'outros': '•',
};

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const fmt = (centavos) => brl.format((Number(centavos) || 0) / 100);
const fmtReais = (valor) => brl.format(Number(valor) || 0);
const pad = (n) => String(n).padStart(2, '0');

const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const mesAtual = () => hojeISO().slice(0, 7);

const somaMes = (m, delta) => {
  const [a, mm] = m.split('-').map(Number);
  const d = new Date(a, mm - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

const nomeMes = (m) => {
  const [a, mm] = m.split('-').map(Number);
  return new Date(a, mm - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(' de ', ' ');
};

const nomeMesCurto = (m) => {
  const [a, mm] = m.split('-').map(Number);
  return new Date(a, mm - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long' });
};

const nomeDia = (iso) => {
  if (iso === hojeISO()) return 'Hoje';

  const [a, m, d] = iso.split('-').map(Number);
  const dt = new Date(a, m - 1, d);
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);

  if (dt.toDateString() === ontem.toDateString()) return 'Ontem';

  return dt.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[c]));

const semAcento = (s) => String(s ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

function matiz(texto) {
  let h = 0;
  const s = semAcento(texto);
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) % 360;
  }
  return h;
}

const corCat = (cat) => `hsl(${matiz(cat)} 62% 48%)`;
const corCatFundo = (cat) => `hsl(${matiz(cat)} 62% 48% / .14)`;

const iconeCat = (cat) => CAT_EMOJI[
  String(cat || '').toLocaleLowerCase('pt-BR')
] || String(cat || '?').slice(0, 1).toUpperCase();

const iniciais = (nome) => String(nome || '?').trim().slice(0, 2).toUpperCase();

let avisoTimer;

function aviso(msg) {
  $('.aviso')?.remove();
  const el = document.createElement('div');
  el.className = 'aviso';
  el.textContent = msg;
  document.body.append(el);
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => el.remove(), 2800);
}

const estado = {
  uid: null,
  mes: mesAtual(),
  lancs: [],
  lancsAnt: [],
  contas: [],
  cats: structuredClone(CAT_PADRAO),
  aba: 'inicio',
  rtipo: 'out',
  integracoes: [],
  filtro: {
    q: '',
    tipo: 'todos',
    origem: 'todas',
    conta: 'todas',
    cat: 'todas',
    rever: false,
  },
  sincronizando: false,
};

const folha = {
  id: null,
  tipo: 'out',
  valor: 0,
  categoria: null,
  origem: 'manual',
  banco: null,
};

const precisaCategoria = (l) => l.origem === 'banco' && !String(l.categoria || '').trim();

const contaDoLanc = (l) => l.banco?.contaId
  ? `${l.banco.itemId}__${l.banco.contaId}`
  : '';

const nomeContaDoLanc = (l) => {
  if (l.origem !== 'banco') return '';
  const c = estado.contas.find((x) => x.id === contaDoLanc(l));
  return c?.nome || l.banco?.contaNome || l.banco?.instituicao || 'Banco';
};

const bancoDoLanc = (l) => l.banco?.instituicao || estado.contas.find(
  (x) => x.id === contaDoLanc(l)
)?.instituicao || 'Banco';

export {
  CAT_PADRAO,
  CAT_EMOJI,
  $,
  $$,
  fmt,
  fmtReais,
  pad,
  hojeISO,
  mesAtual,
  somaMes,
  nomeMes,
  nomeMesCurto,
  nomeDia,
  esc,
  semAcento,
  matiz,
  corCat,
  corCatFundo,
  iconeCat,
  iniciais,
  aviso,
  estado,
  folha,
  precisaCategoria,
  contaDoLanc,
  nomeContaDoLanc,
  bancoDoLanc,
};
