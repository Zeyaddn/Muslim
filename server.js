// هُدَى — Production server: Next.js + prayer-push scheduler in one Node process.
const { createServer } = require('http');
const next = require('next');
const { startScheduler } = require('./lib/scheduler-runner');

const dev = process.env.NODE_ENV === 'development'; // default: production (like next start)
const port = parseInt(process.env.PORT || '3000', 10);
const hostname = process.env.HOST || '0.0.0.0';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  startScheduler();
  createServer((req, res) => handle(req, res)).listen(port, hostname, () => {
    console.log('> هُدَى ready on http://' + hostname + ':' + port);
  });
}).catch(err => {
  console.error('server boot failed:', err);
  process.exit(1);
});
