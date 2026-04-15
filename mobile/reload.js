const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 8081,
  path: '/message',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(JSON.stringify({ type: 'reload' }));
req.end();
