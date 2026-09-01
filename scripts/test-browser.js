import http from 'http';

const paths = [
  '/src/main.jsx',
  '/src/index.css',
  '/src/App.jsx',
  '/node_modules/.vite/deps/react.js',
  '/node_modules/.vite/deps/react-dom_client.js',
  '/node_modules/.vite/deps/react-router-dom.js'
];

async function checkPaths() {
  for (const path of paths) {
    await new Promise((resolve) => {
      http.get(`http://localhost:5173${path}`, (res) => {
        let size = 0;
        res.on('data', chunk => size += chunk.length);
        res.on('end', () => {
          console.log(`PATH: ${path} | STATUS: ${res.statusCode} | SIZE: ${size} bytes`);
          resolve();
        });
      }).on('error', err => {
        console.error(`PATH: ${path} | ERROR:`, err.message);
        resolve();
      });
    });
  }
}

checkPaths();
