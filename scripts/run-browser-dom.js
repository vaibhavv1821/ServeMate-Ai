import pkg from 'jsdom';
const { JSDOM, ResourceLoader } = pkg;

async function runDOM() {
  console.log('Loading JSDOM on http://localhost:5173/...');

  const dom = await JSDOM.fromURL('http://localhost:5173/', {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
  });

  const { window } = dom;

  window.console.log = (...args) => console.log('[BROWSER CONSOLE LOG]', ...args);
  window.console.error = (...args) => console.error('[BROWSER CONSOLE ERROR]', ...args);
  window.console.warn = (...args) => console.warn('[BROWSER CONSOLE WARN]', ...args);

  window.addEventListener('error', (event) => {
    console.error('[BROWSER UNCAUGHT ERROR]', event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[BROWSER UNHANDLED REJECTION]', event.reason);
  });

  // Wait 4 seconds for scripts and React mount to complete
  await new Promise((resolve) => setTimeout(resolve, 4000));

  const rootHTML = window.document.getElementById('root')?.innerHTML;
  console.log('--------------------------------------------------');
  console.log('MOUNTED #root HTML OUTPUT:');
  console.log(rootHTML || '[EMPTY #root DIV]');
  console.log('--------------------------------------------------');

  window.close();
}

runDOM().catch((err) => {
  console.error('JSDOM RUNNER ERROR:', err);
});
