import {
  $,
  $$,
  aviso,
  estado,
  folha,
  hojeISO,
  somaMes,
  nomeMes,
  nomeMesCurto,
} from './core.js';
import {
  auth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from './firebase.js';
import {
  carregarMesAnterior,
  observeUser,
  observeMonth,
  observeIntegracoes,
  observeContas,
  saveCategories,
  saveTransaction,
  deleteTransaction,
  findSimilarBankTransactions,
  applyCategoryToTransactions,
  loadAllTransactions,
} from './data.js';
import {
  sincronizarItem,
  sincronizarTudo,
  conectarBanco,
  desconectarBanco,
} from './banking.js';
import {
  aplicarTema,
  temaInicial,
} from './theme-manager.js';
import {
  renderCats,
  renderFiltros,
  renderInicio,
  renderLancamentos,
  renderRelatorio,
  renderContas,
  renderIntegracoes,
  renderFolha,
  renderOrigem,
  renderTudo,
  limparFiltros,
} from './ui.js';

let pararLancs = null;
let pararUser = null;
let pararIntegracoes = null;
let pararContas = null;

function erroInterface(prefixo, error) {
  console.error(error);
  aviso(`${prefixo}: ${error?.message || 'erro inesperado'}`);
}

function iniciarListeners(user) {
  estado.uid = user.uid;

  pararUser = observeUser({
    onChange: () => {
      renderCats();
      renderFiltros();
      renderFolha();
      renderInicio();
    },
    onError: (error) => erroInterface('Erro ao carregar suas configurações', error),
  });

  pararLancs = observeMonth(estado.mes, {
    onChange: (meta = {}) => {
      $('#offline').hidden = !meta.pendingWrites;
      renderInicio();
      renderRelatorio();
      renderFiltros();
    },
    onError: (error) => erroInterface('Erro ao carregar lançamentos', error),
  });

  carregarMesAnterior(estado.mes, {
    onChange: () => {
      renderInicio();
      renderRelatorio();
    },
    onError: (error) => console.error(error),
  });

  pararIntegracoes = observeIntegracoes({
    onChange: () => {
      $('#btn-sync').hidden = !estado.integracoes.length;
      renderIntegracoes();
    },
    onError: (error) => erroInterface('Erro ao carregar integrações', error),
  });

  pararContas = observeContas({
    onChange: () => {
      renderContas();
      renderFiltros();
      renderInicio();
    },
    onError: (error) => erroInterface('Erro ao carregar contas', error),
  });
}

function pararListeners() {
  pararLancs?.();
  pararUser?.();
  pararIntegracoes?.();
  pararContas?.();
  pararLancs = pararUser = pararIntegracoes = pararContas = null;
}

function mudarMes(mes) {
  estado.mes = mes;
  $('#mes-nome').textContent = nomeMes(mes);
  $('#mes-input').value = mes;
  $('#saldo-mes-label').textContent = nomeMesCurto(mes);

  if (!estado.uid) return;

  pararLancs?.();
  pararLancs = observeMonth(estado.mes, {
    onChange: (meta = {}) => {
      $('#offline').hidden = !meta.pendingWrites;
      renderInicio();
      renderRelatorio();
      renderFiltros();
    },
    onError: (error) => erroInterface('Erro ao carregar lançamentos', error),
  });

  carregarMesAnterior(estado.mes, {
    onChange: () => {
      renderInicio();
      renderRelatorio();
    },
    onError: (error) => console.error(error),
  });
}

function irPara(aba) {
  estado.aba = aba;

  for (const button of $$('nav.abas button')) {
    if (button.dataset.aba === aba) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }

  $('#v-inicio').hidden = aba !== 'inicio';
  $('#v-lancamentos').hidden = aba !== 'lancamentos';
  $('#v-relatorio').hidden = aba !== 'relatorio';
  $('#v-config').hidden = aba !== 'config';
  $('header.topo').hidden = aba === 'config';
  $('#fab').hidden = aba === 'config';

  if (aba === 'lancamentos') renderLancamentos();
  window.scrollTo(0, 0);
}

async function salvarCats() {
  try {
    await saveCategories();
    renderCats();
    renderFolha();
  } catch (error) {
    console.error(error);
    aviso('Erro ao salvar categorias');
  }
}

// LOGIN
$('#btn-entrar').addEventListener('click', async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  $('#login-erro').hidden = true;

  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    if ([
      'auth/popup-blocked',
      'auth/operation-not-supported-in-this-environment',
      'auth/cancelled-popup-request',
    ].includes(error.code)) {
      return signInWithRedirect(auth, provider);
    }
    if (error.code === 'auth/popup-closed-by-user') return;
    $('#login-erro').hidden = false;
    $('#login-erro').textContent = `Não foi possível entrar: ${error.code || error.message}`;
  }
});

getRedirectResult(auth).catch((error) => {
  $('#login-erro').hidden = false;
  $('#login-erro').textContent = `Não foi possível entrar: ${error.code || error.message}`;
});

$('#btn-sair').addEventListener('click', async () => {
  if (!confirm('Sair da sua conta?')) return;
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  pararListeners();

  if (!user) {
    estado.uid = null;
    $('#app').hidden = true;
    $('#login').hidden = false;
    return;
  }

  $('#usuario').textContent = user.email || user.displayName || 'Usuário';
  $('#titulo-inicio').textContent = user.displayName
    ? `Olá, ${user.displayName.split(' ')[0]}`
    : 'Olá';

  $('#login').hidden = true;
  $('#app').hidden = false;

  iniciarListeners(user);
  renderTudo();
});

// MÊS
$('#mes-ant').addEventListener('click', () => mudarMes(somaMes(estado.mes, -1)));
$('#mes-prox').addEventListener('click', () => mudarMes(somaMes(estado.mes, 1)));
$('#mes-input').addEventListener('change', (event) => {
  if (event.target.value) mudarMes(event.target.value);
});

// NAVEGAÇÃO
for (const button of $$('nav.abas button')) {
  button.addEventListener('click', () => irPara(button.dataset.aba));
}

$('#atalho-lancamentos').addEventListener('click', () => irPara('lancamentos'));
$('#ver-todos').addEventListener('click', () => irPara('lancamentos'));
$('#atalho-analise').addEventListener('click', () => irPara('relatorio'));
$('#ir-integracoes').addEventListener('click', () => {
  irPara('config');
  setTimeout(() => $('#integracoes').scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
});





















    /* =========================================================
       FILTROS
    ========================================================== */













    for (
      const b of $$('[data-f-tipo]')
    ) {

      b.addEventListener(
        'click',
        () => {

          estado.filtro.tipo =
            b.dataset.fTipo;

          renderFiltros();
          renderLancamentos();
        }
      );
    }


    $('#filtro-rever')
      .addEventListener(
        'click',
        () => {

          estado.filtro.rever =
            !estado.filtro.rever;

          renderFiltros();
          renderLancamentos();
        }
      );


    $('#sel-origem')
      .addEventListener(
        'change',
        (e) => {

          estado.filtro.origem =
            e.target.value;

          renderFiltros();
          renderLancamentos();
        }
      );


    $('#sel-conta')
      .addEventListener(
        'change',
        (e) => {

          estado.filtro.conta =
            e.target.value;

          renderFiltros();
          renderLancamentos();
        }
      );


    $('#sel-cat')
      .addEventListener(
        'change',
        (e) => {

          estado.filtro.cat =
            e.target.value;

          renderFiltros();
          renderLancamentos();
        }
      );


    $('#busca')
      .addEventListener(
        'input',
        (e) => {

          estado.filtro.q =
            e.target.value;

          renderFiltros();
          renderLancamentos();
        }
      );


    $('#busca-limpar')
      .addEventListener(
        'click',
        () => {

          estado.filtro.q = '';

          $('#busca').value = '';

          renderFiltros();
          renderLancamentos();
        }
      );


    $('#alerta-rever')
      .addEventListener(
        'click',
        () => {

          estado.filtro = {
            ...estado.filtro,
            q: '',
            tipo: 'todos',
            origem: 'todas',
            conta: 'todas',
            cat: 'todas',
            rever: true
          };


          $('#busca').value = '';

          renderFiltros();

          irPara('lancamentos');

          renderLancamentos();

        }
      );


    /* =========================================================
       TOTAIS
    ========================================================== */




    /* =========================================================
       HTML DE ITEM
    ========================================================== */




    /* =========================================================
       INÍCIO
    ========================================================== */







    $('#lista-recentes')
      .addEventListener(
        'click',
        (e) => {

          const li =
            e.target.closest(
              'li.item'
            );

          if (!li) {
            return;
          }


          const l =
            estado.lancs.find(
              (x) =>
                x.id ===
                li.dataset.id
            );


          if (l) {
            abrirFolha(l);
          }
        }
      );


    /* =========================================================
       LANÇAMENTOS
    ========================================================== */




    $('#lista')
      .addEventListener(
        'click',
        (e) => {

          if (
            e.target.closest(
              '#limpar-filtros'
            )
          ) {
            limparFiltros();
            return;
          }


          const li =
            e.target.closest(
              'li.item'
            );


          if (!li) {
            return;
          }


          const l =
            estado.lancs.find(
              (x) =>
                x.id ===
                li.dataset.id
            );


          if (l) {
            abrirFolha(l);
          }
        }
      );


    /* =========================================================
       CONTAS
    ========================================================== */




    $('#contas')
      .addEventListener(
        'click',
        (e) => {

          const b =
            e.target.closest(
              '[data-conta]'
            );


          if (!b) {
            return;
          }


          estado.filtro.conta =
            estado.filtro.conta ===
              b.dataset.conta
              ? 'todas'
              : b.dataset.conta;


          renderFiltros();
          irPara('lancamentos');
          renderLancamentos();

        }
      );


    /* =========================================================
       ANÁLISE
    ========================================================== */




    for (
      const b of $$('[data-rtipo]')
    ) {

      b.addEventListener(
        'click',
        () => {

          estado.rtipo =
            b.dataset.rtipo;

          renderRelatorio();
        }
      );
    }


    $('#maiores')
      .addEventListener(
        'click',
        (e) => {

          const li =
            e.target.closest(
              'li.item'
            );


          if (!li) {
            return;
          }


          const l =
            estado.lancs.find(
              (x) =>
                x.id ===
                li.dataset.id
            );


          if (l) {
            abrirFolha(l);
          }
        }
      );


    /* =========================================================
       CATEGORIAS
    ========================================================== */







    /* =========================================================
       PLUGGY
    ========================================================== */





    ) {

      if (!workerUrl) {
        throw new Error(
          'Configure a URL do Worker para conectar o banco'
        );
      }


      const token =
        await auth.currentUser
          ?.getIdToken(true);


      if (!token) {
        throw new Error(
          'Entre novamente para conectar o banco'
        );
      }


      const response =
        await fetch(
          workerUrl + path,
          {
            ...options,

            headers: {
              Authorization:
                `Bearer ${token}`,

              'Content-Type':
                'application/json',

              ...(options.headers || {})
            }
          }
        );


      if (!response.ok) {

        const body =
          await response.json()
            .catch(
              () => ({})
            );


        throw new Error(
          body.error ||
          'Não foi possível consultar o Meu Pluggy'
        );
      }


      return response.json();
    }


    /*
     * Pluggy não determina diretamente a categoria
     * do aplicativo.
     *
     * Só usamos a categoria retornada pelo banco
     * quando ela existir exatamente nas categorias
     * configuradas pelo usuário.
     *
     * Caso contrário:
     * categoria = null
     *
     * Isso diferencia "Sem categoria" de "Outros".
     */




















$('#v-config').addEventListener('click', async (event) => {
  if (event.target.closest('#conectar-banco')) {
    await conectarBanco();
    return;
  }

  const sync = event.target.closest('[data-sync-item]');
  if (sync) {
    try {
      aviso('Buscando atualizações...');
      const total = await sincronizarItem(sync.dataset.syncItem);
      aviso(`${total} transação(ões) sincronizada(s)`);
    } catch (error) {
      console.error(error);
      aviso(error.message || 'Não foi possível sincronizar agora');
    }
    return;
  }

  const disconnect = event.target.closest('[data-disconnect-item]');
  if (!disconnect || !confirm('Desconectar esta conta? Os lançamentos importados serão mantidos.')) return;

  try {
    await desconectarBanco(disconnect.dataset.disconnectItem);
    aviso('Banco desconectado');
  } catch (error) {
    console.error(error);
    aviso(error.message || 'Não foi possível desconectar');
  }
});

    $('#v-config')
      .addEventListener(
        'click',
        (e) => {

          const x =
            e.target.closest(
              'button.x'
            );


          if (!x) {
            return;
          }


          const {
            tipo,
            i
          } = x.dataset;


          const nome =
            estado.cats[tipo][i];


          if (
            !confirm(
              `Remover a categoria "${nome}"? Lançamentos antigos continuam com ela.`
            )
          ) {
            return;
          }


          estado.cats[tipo]
            .splice(
              Number(i),
              1
            );


          salvarCats();
        }
      );


    for (
      const f of $$('form.add-cat')
    ) {

      f.addEventListener(
        'submit',
        (e) => {

          e.preventDefault();


          const nome =
            f.nome.value.trim();


          const lista =
            estado.cats[
            f.dataset.tipo
            ];


          if (!nome) {
            return;
          }


          if (
            lista.some(
              (c) =>
                c.toLowerCase() ===
                nome.toLowerCase()
            )
          ) {

            aviso(
              'Essa categoria já existe'
            );

            return;
          }


          lista.push(nome);

          f.nome.value = '';

          salvarCats();
        }
      );
    }


    /* =========================================================
       RENDER GERAL
    ========================================================== */




    /* =========================================================
       TEMA
    ========================================================== */


    /* =========================================================
       FOLHA DE LANÇAMENTO
    ========================================================== */


    function abrirFolha(l) {

      if (
        !l &&
        estado.aba !== 'inicio'
      ) {
        irPara('inicio');
      }


      folha.id =
        l?.id ??
        null;


      folha.tipo =
        l?.tipo ??
        'out';


      folha.valor =
        l?.valor ??
        0;


      folha.categoria =
        l?.categoria ??
        null;


      folha.origem =
        l?.origem ??
        'manual';


      /*
       * Guarda os dados bancários originais
       * enquanto a folha estiver aberta.
       *
       * Isso permite usar a descricaoOriginal
       * do banco depois de salvar a alteração,
       * sem depender de estado.lancs estar atualizado.
       */

      folha.banco =
        l?.banco ??
        null;


      $('#folha-titulo')
        .textContent =
        l
          ? 'Editar lançamento'
          : 'Novo lançamento';


      $('#f-data').value =
        l?.data ??
        (
          estado.mes ===
            mesAtual()
            ? hojeISO()
            : `${estado.mes}-01`
        );


      $('#f-desc').value =
        l?.descricao ??
        '';


      $('#f-excluir').hidden =
        !l;


      renderOrigem(l);
      renderFolha();


      $('#folha-fundo').hidden =
        false;


      if (!l) {

        setTimeout(
          () =>
            $('#f-valor').focus(),
          50
        );
      }
    }


    function fecharFolha() {

      $('#folha-fundo').hidden =
        true;

      $('#f-valor').blur();
    }








    for (
      const b of $$('[data-ftipo]')
    ) {

      b.addEventListener(
        'click',
        () => {

          if (
            folha.tipo ===
            b.dataset.ftipo
          ) {
            return;
          }


          folha.tipo =
            b.dataset.ftipo;


          folha.categoria =
            null;


          renderFolha();
        }
      );
    }


    $('#f-cats')
      .addEventListener(
        'click',
        (e) => {

          const b =
            e.target.closest(
              '[data-cat]'
            );


          if (!b) {
            return;
          }


          folha.categoria =
            b.dataset.cat ||
            null;


          for (
            const x of $$('#f-cats button')
          ) {

            x.setAttribute(
              'aria-pressed',
              String(
                x === b
              )
            );
          }
        }
      );


    $('#f-valor')
      .addEventListener(
        'input',
        (e) => {

          const digitos =
            e.target.value
              .replace(
                /\D/g,
                ''
              )
              .slice(
                0,
                11
              );


          folha.valor =
            Number(
              digitos || 0
            );


          e.target.value =
            fmt(
              folha.valor
            );
        }
      );


    $('#f-valor')
      .addEventListener(
        'focus',
        (e) => {

          requestAnimationFrame(
            () => {

              e.target.setSelectionRange(
                e.target.value.length,
                e.target.value.length
              );
            }
          );
        }
      );


    $('#fab')
      .addEventListener(
        'click',
        () =>
          abrirFolha(null)
      );


    $('#f-cancelar')
      .addEventListener(
        'click',
        fecharFolha
      );


    $('#folha-fundo')
      .addEventListener(
        'click',
        (e) => {

          if (
            e.target ===
            e.currentTarget
          ) {
            fecharFolha();
          }
        }
      );


    document.addEventListener(
      'keydown',
      (e) => {

        if (
          e.key === 'Escape' &&
          !$('#folha-fundo').hidden
        ) {
          fecharFolha();
        }
      }
    );


    $('#folha').addEventListener('submit', async (event) => {
      event.preventDefault();

      if (folha.valor <= 0) {
        aviso('Informe um valor');
        return;
      }

      if (!folha.categoria && folha.origem !== 'banco') {
        aviso('Escolha uma categoria');
        return;
      }

      const data = $('#f-data').value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        aviso('Informe a data');
        return;
      }

      const dados = {
        tipo: folha.tipo,
        valor: folha.valor,
        categoria: folha.categoria || null,
        data,
        descricao: $('#f-desc').value.trim(),
        origem: folha.origem,
      };

      const editingId = folha.id;

      try {
        await saveTransaction(dados, editingId);

        if (
          folha.origem === 'banco' &&
          folha.categoria &&
          editingId &&
          folha.banco?.descricaoOriginal
        ) {
          try {
            const semelhantes = await findSimilarBankTransactions({
              description: folha.banco.descricaoOriginal,
              tipo: folha.tipo,
              currentId: editingId,
            });

            if (semelhantes.length) {
              const aplicar = confirm(
                `Encontramos ${semelhantes.length} outro${semelhantes.length === 1 ? '' : 's'} lançamento${semelhantes.length === 1 ? '' : 's'} iguais.\n\n` +
                `Deseja aplicar "${folha.categoria}" também a eles?`
              );

              if (aplicar) {
                await applyCategoryToTransactions(
                  semelhantes.map((item) => item.id),
                  folha.categoria
                );

                for (const item of semelhantes) {
                  const local = estado.lancs.find((l) => l.id === item.id);
                  if (local) local.categoria = folha.categoria;
                }

                renderInicio();
                renderLancamentos();
                renderRelatorio();
                renderFiltros();
                aviso(`${semelhantes.length} lançamento${semelhantes.length === 1 ? '' : 's'} atualizado${semelhantes.length === 1 ? '' : 's'} para "${folha.categoria}"`);
              }
            }
          } catch (error) {
            // A alteração principal já foi salva; uma falha na sugestão em lote
            // não deve informar ao usuário que o lançamento principal falhou.
            console.error('Falha ao localizar/aplicar lançamentos semelhantes:', error);
            aviso('Lançamento salvo. Não foi possível aplicar a categoria aos semelhantes.');
          }
        }

        fecharFolha();
        aviso(editingId ? 'Lançamento atualizado' : 'Lançamento salvo');

        if (data.slice(0, 7) !== estado.mes) {
          mudarMes(data.slice(0, 7));
        }
      } catch (error) {
        console.error(error);
        aviso(error.message || 'Erro ao salvar');
      }
    });


    $('#f-excluir').addEventListener('click', async () => {
      if (!folha.id || !confirm('Excluir este lançamento?')) return;

      const id = folha.id;
      try {
        await deleteTransaction(id);
        fecharFolha();
        aviso('Lançamento excluído');
      } catch (error) {
        console.error(error);
        aviso(error.message || 'Erro ao excluir');
      }
    });


function baixarCSV(lancs, nome) {
  const cel = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const linhas = [['Data','Tipo','Categoria','Descrição','Origem','Conta','Valor'].join(';')];

  for (const l of [...lancs].sort((a, b) => a.data.localeCompare(b.data))) {
    const [a,m,d] = l.data.split('-');
    const valor = ((l.tipo === 'in' ? 1 : -1) * l.valor / 100).toFixed(2).replace('.', ',');
    linhas.push([
      `${d}/${m}/${a}`,
      l.tipo === 'in' ? 'Entrada' : 'Despesa',
      cel(l.categoria || 'Sem categoria'),
      cel(l.descricao),
      l.origem === 'banco' ? 'Banco' : 'Manual',
      cel(l.origem === 'banco' ? (l.banco?.contaNome || l.banco?.instituicao || '') : ''),
      valor,
    ].join(';'));
  }

  const blob = new Blob(['\ufeff' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

$('#csv-mes').addEventListener('click', () => baixarCSV(estado.lancs, `gastos-${estado.mes}.csv`));
$('#csv-tudo').addEventListener('click', async () => {
  try {
    baixarCSV(await loadAllTransactions(), `gastos-${hojeISO()}.csv`);
  } catch (error) {
    erroInterface('Erro ao exportar', error);
  }
});

// TEMA
for (const button of $$('[data-tema]')) {
  button.addEventListener('click', () => aplicarTema(button.dataset.tema));
}

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => aplicarTema(temaInicial()));
aplicarTema(temaInicial());

// PERSISTÊNCIA / PWA
$('#btn-sync').addEventListener('click', sincronizarTudo);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((error) => console.error(error));
}

// Inicialização da UI antes do primeiro snapshot.
$('#mes-nome').textContent = nomeMes(estado.mes);
$('#mes-input').value = estado.mes;
$('#saldo-mes-label').textContent = nomeMesCurto(estado.mes);
renderTudo();
