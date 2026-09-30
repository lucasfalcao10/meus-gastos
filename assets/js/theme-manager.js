import { $$ } from './core.js';

function aplicarTema(tema) {
  try {
    localStorage.setItem('tema', tema);
  } catch (_) {}

  const html = document.documentElement;

  if (tema === 'claro') html.dataset.theme = 'light';
  else if (tema === 'escuro') html.dataset.theme = 'dark';
  else delete html.dataset.theme;

  for (const button of $$('[data-tema]')) {
    button.setAttribute('aria-pressed', String(button.dataset.tema === tema));
  }

  requestAnimationFrame(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(document.body).backgroundColor;
  });
}

function temaInicial() {
  try {
    return localStorage.getItem('tema') || 'auto';
  } catch (_) {
    return 'auto';
  }
}

export { aplicarTema, temaInicial };
