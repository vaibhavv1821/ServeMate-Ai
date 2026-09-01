import { spawn } from 'child_process';
import WebSocket from 'ws';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function debugBrowser() {
  console.log('1. Launching Headless Edge Browser...');
  const edgeProcess = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    'http://localhost:5173/'
  ]);

  // Wait 2s for Edge to start debugging server
  await new Promise(r => setTimeout(r, 2000));

  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = await listRes.json();
  const pageTab = tabs.find(t => t.type === 'page');

  if (!pageTab) {
    console.error('No page tab found in Edge!');
    edgeProcess.kill();
    return;
  }

  console.log(`2. Connecting DevTools WebSocket to page tab [${pageTab.title}]...`);
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

  ws.on('open', () => {
    console.log('3. DevTools WebSocket Connected! Enabling Console, Runtime, Page, Network domains...');
    ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));
    ws.send(JSON.stringify({ id: 4, method: 'Network.enable' }));
    ws.send(JSON.stringify({ id: 5, method: 'Page.reload' }));
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    // Capture Console API Calls
    if (msg.method === 'Console.messageAdded') {
      console.log(`[BROWSER CONSOLE ${msg.params.message.level.toUpperCase()}]`, msg.params.message.text);
    }

    // Capture Runtime Exceptions
    if (msg.method === 'Runtime.exceptionThrown') {
      const details = msg.params.exceptionDetails;
      console.error('[BROWSER RUNTIME EXCEPTION]', details.text, details.exception?.description || '', details.stackTrace || '');
    }

    // Capture Failed Network Requests
    if (msg.method === 'Network.loadingFailed') {
      console.error('[BROWSER NETWORK FAILED]', msg.params.errorText, msg.params.type);
    }

    if (msg.method === 'Network.responseReceived') {
      const res = msg.params.response;
      if (res.status >= 400) {
        console.error(`[BROWSER NETWORK HTTP ${res.status}]`, res.url);
      }
    }
  });

  // Wait 4s to capture all logs and runtime events
  await new Promise(r => setTimeout(r, 4000));

  // Evaluate DOM root content
  ws.send(JSON.stringify({
    id: 10,
    method: 'Runtime.evaluate',
    params: { expression: "document.getElementById('root')?.innerHTML" }
  }));

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id === 10) {
      console.log('--------------------------------------------------');
      console.log('REAL BROWSER DOM #root INNER HTML:');
      console.log(msg.result?.result?.value || '[EMPTY #root DIV]');
      console.log('--------------------------------------------------');
      ws.close();
      edgeProcess.kill();
      process.exit(0);
    }
  });
}

debugBrowser().catch(err => {
  console.error('DEBUGGER ERROR:', err);
  process.exit(1);
});
