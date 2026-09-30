import {
  $,
  $$,
  fmt,
  fmtReais,
  nomeMesCurto,
  somaMes,
  esc,
  semAcento,
  corCat,
  corCatFundo,
  iconeCat,
  iniciais,
  estado,
  folha,
  precisaCategoria,
  contaDoLanc,
  nomeContaDoLanc,
  bancoDoLanc,
} from './core.js';

export {
  renderFiltros,
  filtrados,
  temFiltro,
  limparFiltros,
  totais,
  itemHTML,
  renderInicio,
  renderRecentes,
  renderLancamentos,
  renderContas,
  renderRelatorio,
  renderCats,
  dataHora,
  renderIntegracoes,
  renderOrigem,
  renderFolha,
  renderTudo
};

function renderFiltros() {

      const f =
        estado.filtro;


      for (
        const b of $$('[data-f-tipo]')
      ) {

        b.setAttribute(
          'aria-pressed',
          String(
            b.dataset.fTipo === f.tipo
          )
        );
      }


      $('#busca-limpar').hidden =
        !f.q;


      const rotOrigem = {
        todas: 'Origem',
        banco: 'Do banco',
        manual: 'Manuais'
      };


      $('#filtro-origem-txt')
        .textContent =
        rotOrigem[f.origem];


      $('#sel-origem').value =
        f.origem;


      $('#filtro-origem')
        .classList.toggle(
          'ativo',
          f.origem !== 'todas'
        );


      const contasUsadas =
        estado.contas.filter(
          (c) =>
            estado.lancs.some(
              (l) =>
                contaDoLanc(l) === c.id
            )
        );


      const listaContas =
        contasUsadas.length
          ? contasUsadas
          : estado.contas;


      $('#filtro-conta').hidden =
        !listaContas.length;


      $('#sel-conta').innerHTML =
        `<option value="todas">
          Todas as contas
        </option>` +
        listaContas
          .map(
            (c) =>
              `<option value="${esc(c.id)}">
                ${esc(c.instituicao || 'Banco')} ·
                ${esc(c.nome || c.subtipo || 'Conta')}
              </option>`
          )
          .join('');


      if (
        !listaContas.some(
          (c) => c.id === f.conta
        )
      ) {
        f.conta = 'todas';
      }


      $('#sel-conta').value =
        f.conta;


      const contaSel =
        listaContas.find(
          (c) => c.id === f.conta
        );


      $('#filtro-conta-txt')
        .textContent =
        contaSel
          ? (
            contaSel.nome ||
            contaSel.instituicao
          )
          : 'Conta';


      $('#filtro-conta')
        .classList.toggle(
          'ativo',
          f.conta !== 'todas'
        );


      const cats =
        [
          ...new Set([
            ...estado.lancs
              .map(
                (l) => l.categoria
              )
              .filter(Boolean),

            ...estado.cats.out,
            ...estado.cats.in
          ])
        ]
          .sort(
            (a, b) =>
              a.localeCompare(
                b,
                'pt-BR'
              )
          );


      $('#sel-cat').innerHTML =
        `<option value="todas">
          Todas as categorias
        </option>` +
        cats
          .map(
            (c) =>
              `<option value="${esc(c)}">
                ${esc(c)}
              </option>`
          )
          .join('');


      if (!cats.includes(f.cat)) {
        f.cat = 'todas';
      }


      $('#sel-cat').value =
        f.cat;


      $('#filtro-cat-txt')
        .textContent =
        f.cat === 'todas'
          ? 'Categoria'
          : f.cat;


      $('#filtro-cat')
        .classList.toggle(
          'ativo',
          f.cat !== 'todas'
        );


      const rever =
        estado.lancs.filter(
          precisaCategoria
        ).length;


      $('#filtro-rever').hidden =
        !rever;


      $('#filtro-rever')
        .textContent =
        `Sem categoria (${rever})`;


      $('#filtro-rever')
        .setAttribute(
          'aria-pressed',
          String(f.rever)
        );
    }

function filtrados() {

      const f =
        estado.filtro;

      const q =
        semAcento(
          f.q.trim()
        );


      return estado.lancs.filter(
        (l) => {

          if (
            f.tipo !== 'todos' &&
            l.tipo !== f.tipo
          ) {
            return false;
          }


          if (
            f.origem === 'banco' &&
            l.origem !== 'banco'
          ) {
            return false;
          }


          if (
            f.origem === 'manual' &&
            l.origem === 'banco'
          ) {
            return false;
          }


          if (
            f.conta !== 'todas' &&
            contaDoLanc(l) !== f.conta
          ) {
            return false;
          }


          if (
            f.cat !== 'todas' &&
            l.categoria !== f.cat
          ) {
            return false;
          }


          if (
            f.rever &&
            !precisaCategoria(l)
          ) {
            return false;
          }


          if (q) {

            const alvo =
              semAcento(
                [
                  l.descricao,
                  l.categoria,
                  nomeContaDoLanc(l),
                  l.banco?.descricaoOriginal
                ]
                  .filter(Boolean)
                  .join(' ')
              );


            if (!alvo.includes(q)) {
              return false;
            }
          }


          return true;
        }
      );
    }

function temFiltro() {

      const f =
        estado.filtro;

      return !!(
        f.q.trim() ||
        f.tipo !== 'todos' ||
        f.origem !== 'todas' ||
        f.conta !== 'todas' ||
        f.cat !== 'todas' ||
        f.rever
      );
    }

function limparFiltros() {

      estado.filtro = {
        q: '',
        tipo: 'todos',
        origem: 'todas',
        conta: 'todas',
        cat: 'todas',
        rever: false
      };


      $('#busca').value = '';

      renderFiltros();
      renderLancamentos();
    }

function totais(lancs) {

      let entrada = 0;
      let saida = 0;


      for (const l of lancs) {

        if (l.tipo === 'in') {
          entrada += l.valor;
        } else {
          saida += l.valor;
        }
      }


      return {
        entrada,
        saida
      };
    }

function itemHTML(l) {

      const sinal =
        l.tipo === 'in'
          ? '+'
          : '−';


      const banco =
        l.origem === 'banco';


      const rever =
        precisaCategoria(l);


      const categoria =
        l.categoria ||
        'Sem categoria';


      const conta =
        banco
          ? nomeContaDoLanc(l)
          : 'Manual';


      const inst =
        banco
          ? bancoDoLanc(l)
          : '';


      return `
        <li class="item"
            data-id="${esc(l.id)}">

          <div
            class="ic"
            style="
              background:${corCatFundo(categoria)};
              color:${corCat(categoria)}
            ">

            ${esc(iconeCat(categoria))}

            ${banco
          ? `
                  <span
                    class="banco-selo"
                    style="background:${corCat(inst)}"
                    title="${esc(inst)}">
                    ${esc(iniciais(inst))}
                  </span>
                `
          : ''
        }

          </div>


          <div class="txt">

            <div class="t1">
              ${esc(
          l.descricao ||
          categoria ||
          'Lançamento'
        )}
            </div>

            <div class="t2">

              ${rever
          ? `
                    <span class="tag rever">
                      Sem categoria
                    </span>
                  `
          : `
                    <span>
                      ${esc(categoria)}
                    </span>
                  `
        }

              <span class="sep">·</span>

              <span class="conta-nome">
                ${esc(conta)}
              </span>

            </div>

          </div>


          <div class="v num ${l.tipo}">
            ${sinal} ${esc(fmt(l.valor))}
          </div>

        </li>
      `;
    }

function renderInicio() {

      const {
        entrada,
        saida
      } = totais(
        estado.lancs
      );


      const saldo =
        entrada - saida;


      $('#saldo')
        .textContent =
        fmt(saldo);


      $('#saldo')
        .classList.toggle(
          'neg',
          saldo < 0
        );


      $('#saldo-mes-label')
        .textContent =
        nomeMesCurto(
          estado.mes
        );


      $('#tot-in')
        .textContent =
        fmt(entrada);


      $('#tot-out')
        .textContent =
        fmt(saida);


      const soma =
        entrada + saida;


      $('#barra-fluxo')
        .children[0]
        .style.width =
        soma
          ? `${entrada / soma * 100}%`
          : '0';


      $('#barra-fluxo')
        .children[1]
        .style.width =
        soma
          ? `${saida / soma * 100}%`
          : '0';


      const antSaida =
        totais(
          estado.lancsAnt
        ).saida;


      const cmp =
        $('#comparativo');


      if (
        antSaida &&
        saida
      ) {

        const pct =
          Math.round(
            ((saida - antSaida) /
              antSaida) *
            100
          );


        cmp.hidden = false;


        cmp.innerHTML =
          pct === 0
            ? `Despesas iguais às de ${esc(
              nomeMesCurto(
                somaMes(
                  estado.mes,
                  -1
                )
              )
            )}.`
            : `
              Despesas
              <b>
                ${pct > 0 ? '+' : ''}
                ${pct}%
              </b>
              em relação a
              ${esc(
              nomeMesCurto(
                somaMes(
                  estado.mes,
                  -1
                )
              )
            )}.
            `;

      } else {

        cmp.hidden = true;

      }


      const rever =
        estado.lancs.filter(
          precisaCategoria
        ).length;


      $('#alerta-rever').hidden =
        !rever;


      $('#alerta-titulo')
        .textContent =
        `${rever} lançamento${rever === 1
          ? ''
          : 's'
        } sem categoria`;


      renderRecentes();

    }

function renderRecentes() {

      const ul =
        $('#lista-recentes');


      const recentes =
        [...estado.lancs]
          .sort(
            (a, b) =>
              b.data.localeCompare(
                a.data
              ) ||
              (
                b.criadoEm?.toMillis?.() ??
                0
              ) -
              (
                a.criadoEm?.toMillis?.() ??
                0
              )
          )
          .slice(0, 8);


      if (!recentes.length) {

        ul.innerHTML = `
          <li class="vazio">
            Nenhum lançamento em
            ${esc(
          nomeMes(
            estado.mes
          )
        )}.
            <br>
            Use o botão +
            para adicionar.
          </li>
        `;

        return;
      }


      let html = '';
      let dia = '';


      for (const l of recentes) {

        if (l.data !== dia) {

          dia = l.data;

          html += `
            <li class="dia">
              <span>
                ${esc(
            nomeDia(l.data)
          )}
              </span>
            </li>
          `;
        }


        html += itemHTML(l);
      }


      ul.innerHTML = html;
    }

function renderLancamentos() {

      const lista =
        filtrados();


      const res =
        $('#resultado');


      if (temFiltro()) {

        const t =
          totais(lista);


        res.hidden = false;


        res.innerHTML = `
          <span>
            <b>${lista.length}</b>
            lançamento${lista.length === 1
            ? ''
            : 's'
          }
          </span>

          <span class="num">

            ${t.entrada
            ? `
                  <b class="v in">
                    + ${esc(
              fmt(t.entrada)
            )}
                  </b>
                `
            : ''
          }

            ${t.saida
            ? `
                  <b>
                    − ${esc(
              fmt(t.saida)
            )}
                  </b>
                `
            : ''
          }

          </span>
        `;

      } else {

        res.hidden = true;

      }


      const ul =
        $('#lista');


      if (!lista.length) {

        ul.innerHTML =
          estado.lancs.length
            ? `
              <li class="vazio">
                Nenhum lançamento
                encontrado.
                <br>
                <button
                  class="btn sec"
                  id="limpar-filtros">
                  Limpar filtros
                </button>
              </li>
            `
            : `
              <li class="vazio">
                Nenhum lançamento
                neste mês.
              </li>
            `;

        return;
      }


      let html = '';
      let dia = '';


      for (const l of lista) {

        if (l.data !== dia) {

          dia = l.data;

          const doDia =
            lista.filter(
              (x) =>
                x.data === dia
            );


          const t =
            totais(doDia);


          const liquido =
            t.entrada -
            t.saida;


          html += `
            <li class="dia">

              <span>
                ${esc(
            nomeDia(dia)
          )}
              </span>

              <span class="tot num">
                ${liquido < 0
              ? '−'
              : '+'
            }
                ${esc(
              fmt(
                Math.abs(
                  liquido
                )
              )
            )}
              </span>

            </li>
          `;
        }


        html += itemHTML(l);
      }


      ul.innerHTML = html;
    }

function renderContas() {

      const bloco =
        $('#bloco-contas');


      bloco.hidden =
        !estado.contas.length;


      if (!estado.contas.length) {
        return;
      }


      $('#contas').innerHTML =
        estado.contas
          .map(
            (c) => {

              const inst =
                c.instituicao ||
                'Banco';


              const saldoNeg =
                Number(c.saldo) < 0;


              return `
                <button
                  class="conta"
                  data-conta="${esc(c.id)}"
                  aria-pressed="${estado.filtro.conta ===
                c.id
                }">

                  <div class="banco">

                    <span
                      class="selo"
                      style="background:${corCat(inst)}">
                      ${esc(
                  iniciais(inst)
                )}
                    </span>

                    ${esc(inst)}

                  </div>


                  <div class="nome">
                    ${esc(
                  c.nome ||
                  c.subtipo ||
                  'Conta'
                )}
                    ${c.numeroMascarado
                  ? ` · ${esc(
                    c.numeroMascarado
                  )}`
                  : ''
                }
                  </div>


                  <div
                    class="saldo num${saldoNeg
                  ? ' neg'
                  : ''
                }">

                    ${esc(
                  fmtReais(
                    c.saldo
                  )
                )}

                  </div>

                </button>
              `;
            }
          )
          .join('');
    }

function renderRelatorio() {

      const tipo =
        estado.rtipo;


      for (
        const b of $$('[data-rtipo]')
      ) {

        b.setAttribute(
          'aria-pressed',
          String(
            b.dataset.rtipo ===
            tipo
          )
        );
      }


      const porCat =
        new Map();


      let total = 0;


      for (
        const l of estado.lancs
      ) {

        if (
          l.tipo !== tipo
        ) {
          continue;
        }


        const cat =
          l.categoria ||
          'Sem categoria';


        porCat.set(
          cat,
          (
            porCat.get(cat) ||
            0
          ) + l.valor
        );


        total += l.valor;
      }


      $('#rel-rotulo')
        .textContent =
        tipo === 'out'
          ? 'Despesas'
          : 'Entradas';


      $('#rel-total')
        .textContent =
        fmt(total);


      const itens =
        [...porCat]
          .sort(
            (a, b) =>
              b[1] - a[1]
          );


      const max =
        itens[0]?.[1] || 1;


      let acc = 0;


      const fatias =
        itens.map(
          ([cat, v]) => {

            const ini =
              (
                acc /
                (total || 1)
              ) * 100;


            acc += v;


            return `
              ${corCat(cat)}
              ${ini}%
              ${(
                acc /
                (total || 1)
              ) * 100
              }%
            `;
          }
        );


      $('#rosca').style.background =
        fatias.length
          ? `conic-gradient(${fatias.join(',')})`
          : 'conic-gradient(var(--bar-track) 0 100%)';


      const antTotal =
        estado.lancsAnt
          .filter(
            (l) =>
              l.tipo === tipo
          )
          .reduce(
            (s, l) =>
              s + l.valor,
            0
          );


      const cmp =
        $('#rel-comparativo');


      if (antTotal) {

        const pct =
          Math.round(
            (
              (total - antTotal) /
              antTotal
            ) * 100
          );


        const classe =
          pct > 0
            ? (
              tipo === 'out'
                ? 'sobe'
                : 'desce'
            )
            : pct < 0
              ? (
                tipo === 'out'
                  ? 'desce'
                  : 'sobe'
              )
              : 'igual';


        cmp.innerHTML = `
          <span
            class="delta ${classe}">
            ${pct > 0
            ? '▲'
            : pct < 0
              ? '▼'
              : '='
          }
            ${Math.abs(pct)}%
          </span>

          <div style="margin-top:6px">
            vs.
            ${esc(
            nomeMesCurto(
              somaMes(
                estado.mes,
                -1
              )
            )
          )}:
            ${esc(
            fmt(antTotal)
          )}
          </div>
        `;

      } else {

        cmp.textContent =
          'Sem dados do mês anterior para comparar.';
      }


      $('#barras').innerHTML =
        itens.length

          ? itens
            .map(
              ([cat, v]) => {

                const pct =
                  Math.round(
                    (v / total) *
                    100
                  );


                return `
                    <li>

                      <div class="linha">

                        <span class="cat">

                          <i
                            class="pt"
                            style="
                              background:${corCat(cat)}
                            ">
                          </i>

                          <span>
                            ${esc(cat)}
                          </span>

                        </span>

                        <span class="num">

                          ${esc(
                  fmt(v)
                )}

                          <span class="pct">
                            ${pct}%
                          </span>

                        </span>

                      </div>


                      <div class="trilho">

                        <div
                          class="barra"
                          style="
                            width:${(v / max) *
                  100
                  }%;
                            background:${corCat(cat)}
                          ">
                        </div>

                      </div>

                    </li>
                  `;
              }
            )
            .join('')

          : `
            <li class="vazio">
              Sem ${tipo === 'out'
            ? 'despesas'
            : 'entradas'
          } neste mês.
            </li>
          `;


      const maiores =
        estado.lancs
          .filter(
            (l) =>
              l.tipo === tipo
          )
          .sort(
            (a, b) =>
              b.valor - a.valor
          )
          .slice(0, 5);


      $('#maiores').innerHTML =
        maiores.length
          ? maiores
            .map(itemHTML)
            .join('')
          : `
            <li class="vazio">
              Nada para mostrar.
            </li>
          `;
    }

function renderCats() {

      for (
        const tipo of [
          'out',
          'in'
        ]
      ) {

        $(`#cats-${tipo}`)
          .innerHTML =
          estado.cats[tipo]
            .map(
              (c, i) =>
                `
                <span class="chip">

                  <i
                    class="pt"
                    style="
                      background:${corCat(c)}
                    ">
                  </i>

                  ${esc(c)}

                  <button
                    class="x"
                    data-tipo="${tipo}"
                    data-i="${i}"
                    aria-label="Remover ${esc(c)}">
                    ×
                  </button>

                </span>
                `
            )
            .join('') ||
          '<span class="sub">Nenhuma categoria.</span>';
      }
    }

function dataHora(valor) {

      const d =
        valor?.toDate?.() ||
        (
          valor
            ? new Date(valor)
            : null
        );


      return d &&
        !Number.isNaN(
          d.getTime()
        )
        ? d.toLocaleString(
          'pt-BR',
          {
            dateStyle: 'short',
            timeStyle: 'short'
          }
        )
        : 'ainda não atualizada';
    }

function renderIntegracoes() {

      const el =
        $('#integracoes');


      if (!estado.integracoes.length) {

        el.innerHTML = `
          <div class="linha">

            <div>

              <div>
                Nenhum banco conectado
              </div>

              <div class="sub">
                Conecte sua conta pelo Pluggy
                para importar os lançamentos.
              </div>

            </div>

          </div>

          <div class="integ-acoes">

            <button
              class="btn"
              id="conectar-banco">
              Conectar banco
            </button>

          </div>
        `;

        return;
      }


      el.innerHTML =
        estado.integracoes
          .map(
            (i) => {

              const inst =
                i.instituicao ||
                'Meu Pluggy';


              const contas =
                estado.contas.filter(
                  (c) =>
                    c.itemId ===
                    i.itemId
                );


              return `
                <div class="linha">

                  <div class="integ">

                    <span
                      class="selo"
                      style="
                        background:${corCat(inst)}
                      ">
                      ${esc(
                iniciais(inst)
              )}
                    </span>

                    <div>

                      <div>
                        <b>
                          ${esc(inst)}
                        </b>
                      </div>

                      <div class="integ-status">
                        Conectado
                        ${contas.length
                  ? ` · ${contas.length
                  } conta${contas.length ===
                    1
                    ? ''
                    : 's'
                  }`
                  : ''
                }
                      </div>

                      <div class="sub">
                        Atualizado em
                        ${esc(
                  dataHora(
                    i.lastSyncedAt
                  )
                )}
                      </div>

                    </div>

                  </div>

                </div>


                <div class="integ-acoes">

                  <button
                    class="btn sec"
                    data-sync-item="${esc(i.id)}">
                    Sincronizar
                  </button>

                  <button
                    class="btn del"
                    data-disconnect-item="${esc(i.id)}">
                    Desconectar
                  </button>

                </div>
              `;
            }
          )
          .join('') +

        `
          <div class="integ-acoes">

            <button
              class="btn sec"
              id="conectar-banco">
              Conectar outro banco
            </button>

          </div>
        `;
    }

function renderOrigem(l) {

      const box =
        $('#f-origem');


      if (
        !l ||
        l.origem !== 'banco'
      ) {

        box.hidden = true;
        box.innerHTML = '';

        return;
      }


      const inst =
        bancoDoLanc(l);


      const linhas = [

        [
          'Conta',
          nomeContaDoLanc(l)
        ],

        [
          'Descrição no banco',
          l.banco?.descricaoOriginal ||
          l.descricao ||
          '—'
        ],

        [
          'Categoria no banco',
          l.banco?.categoriaOriginal ||
          '—'
        ],

        [
          'Importado em',
          dataHora(
            l.banco?.importadoEm
          )
        ],

      ];


      box.hidden = false;


      box.innerHTML = `
        <div class="origem-box">

          <div class="titulo">

            <span
              class="selo"
              style="
                background:${corCat(inst)}
              ">
              ${esc(
        iniciais(inst)
      )}
            </span>

            Importado de
            ${esc(inst)}

          </div>


          <dl>

            ${linhas
          .map(
            ([k, v]) =>
              `
                    <dt>
                      ${esc(k)}
                    </dt>

                    <dd>
                      ${esc(v)}
                    </dd>
                  `
          )
          .join('')}

          </dl>


          <div
            class="sub"
            style="
              margin-top:10px;
              font-size:12px;
            ">

            Suas alterações de valor,
            data, categoria e descrição
            são mantidas nas próximas
            sincronizações.

          </div>

        </div>
      `;
    }

function renderFolha() {

      for (
        const b of $$('[data-ftipo]')
      ) {

        b.setAttribute(
          'aria-pressed',
          String(
            b.dataset.ftipo ===
            folha.tipo
          )
        );
      }


      const v =
        $('#f-valor');


      v.value =
        fmt(folha.valor);


      v.className =
        `valor-in num ${folha.tipo}`;


      const cats =
        [
          ...estado.cats[
          folha.tipo
          ]
        ];


      if (
        folha.categoria &&
        !cats.includes(
          folha.categoria
        )
      ) {

        cats.push(
          folha.categoria
        );
      }


      /*
       * Para uma transação sem categoria,
       * oferecemos explicitamente o botão
       * "Sem categoria" somente para registros
       * bancários.
       */

      if (
        folha.id &&
        folha.origem === 'banco' &&
        !folha.categoria
      ) {

        $('#f-cats').innerHTML =
          `
            <button
              type="button"
              data-cat=""
              aria-pressed="true">

              <span>
                —
              </span>

              Sem categoria

            </button>
          ` +
          cats
            .map(
              (c) =>
                `
                  <button
                    type="button"
                    data-cat="${esc(c)}"
                    aria-pressed="false">

                    <i
                      style="
                        display:inline-block;
                        width:8px;
                        height:8px;
                        border-radius:2px;
                        background:${corCat(c)}
                      ">
                    </i>

                    ${esc(c)}

                  </button>
                `
            )
            .join('');

      } else {

        $('#f-cats').innerHTML =
          cats
            .map(
              (c) =>
                `
                  <button
                    type="button"
                    data-cat="${esc(c)}"
                    aria-pressed="${c ===
                folha.categoria
                }">

                    <i
                      style="
                        display:inline-block;
                        width:8px;
                        height:8px;
                        border-radius:2px;
                        background:${corCat(c)}
                      ">
                    </i>

                    ${esc(c)}

                  </button>
                `
            )
            .join('');
      }
    }

function renderTudo() {

      renderFiltros();
      renderInicio();
      renderLancamentos();
      renderRelatorio();
      renderCats();
      renderIntegracoes();
      renderContas();
      renderFolha();
    }
