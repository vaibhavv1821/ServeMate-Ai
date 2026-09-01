import { spawn } from 'child_process';
import path from 'path';

// Launch Edge with remote debugging port enabled
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const edgeProcess = spawn(edgePath, [
  '--headless',
  '--disable-gpu',
  '--remote-debugging-port=9222',
  'http://localhost:5173/'
]);

edgeProcess.stdout.on('data', d => console.log('EDGE STDOUT:', d.toString()));
edgeProcess.stderr.on('data', d => console.log('EDGE STDERR:', d.toString()));

setTimeout(async () => {
  try {
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const tabs = await listRes.json();
    console.log('EDGE TABS:', tabs);

    if (tabs.length > 0) {
      const wsUrl = tabs[0].webSocketDebuggerUrl;
      console.log('WEBSOCKET DEBUGGER URL:', wsUrl);
    }
  } catch (err) {
    console.error('FAILED TO CONNECT TO EDGE DEBUGGER:', err.message);
  } finally {
    edgeProcess.kill();
  }
}, 3000);
