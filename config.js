window.MEUS_GASTOS_CONFIG = {
  workerUrl: 'https://meus-gastos-pluggy.meusgastos.workers.dev',
  firebase: {
    apiKey: 'AIzaSyCsKTKa15jSfDic1SlehpXNpIrBrpryauQ',
    authDomain: 'meus-gastos-2a04e.firebaseapp.com',
    projectId: 'meus-gastos-2a04e',
    storageBucket: 'meus-gastos-2a04e.firebasestorage.app',
    messagingSenderId: '76744848170',
    appId: '1:76744848170:web:285429da75470f024ae453',
  },
};

// Compatibilidade para integrações/versões antigas.
window.MEUS_GASTOS_WORKER_URL = window.MEUS_GASTOS_CONFIG.workerUrl;
