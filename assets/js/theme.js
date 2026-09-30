(() => {
  let tema = 'auto';

  try {
    tema = localStorage.getItem('tema') || 'auto';
  } catch (_) {
    // O tema padrão continua sendo automático quando o storage estiver indisponível.
  }

  if (tema === 'claro') {
    document.documentElement.dataset.theme = 'light';
  }

  if (tema === 'escuro') {
    document.documentElement.dataset.theme = 'dark';
  }
})();
