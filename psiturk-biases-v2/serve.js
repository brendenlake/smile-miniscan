/**
 * serve.js — minimal dev server for psiturk-example-v2
 *
 * Replaces the psiturk Flask server. Run with:
 *   node psiturk-example-v2/serve.js
 * then open http://localhost:3333
 *
 * - GET /           → templates/exp.html with stub template vars
 * - GET /static/pages/* → templates/* (psiturk fetches fragments here)
 * - GET /static/*   → static/*
 */

import http from 'http'
import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = 3333
const BASE = __dirname
const ROOT = path.resolve(__dirname, '..')

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
}

// Stub values for Jinja2 template variables in exp.html
const STUB = {
  uniqueId:       'debug_worker:debug_assignment',
  condition:      0,
  counterbalance: 0,
  adServerLoc:    '/',
  mode:           'debug',
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not found: ' + filePath)
      return
    }
    const mime = MIME[path.extname(filePath)] || 'application/octet-stream'
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    })
    res.end(data)
  })
}

// Seeded PRNG script injected into exp.html when ?seed=N is in the URL.
// Uses the same mulberry32 algorithm as ScanExpView.vue so both experiments
// produce identical shuffle sequences with the same seed.
function seedScript(seed) {
  return `<script>
(function() {
  var s = ${seed} | 0;
  Math.random = function() {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();
\x3c/script>`
}

function scanSeedScript(seed) {
  return `<script>
(function() {
  var s = ${seed} | 0;
  Math.random = function() {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();
\x3c/script>`
}

const server = http.createServer((req, res) => {
  const url      = new URL(req.url, `http://localhost:${PORT}`)
  const pathname = url.pathname
  const seed     = url.searchParams.get('seed')

  if (pathname === '/' || pathname === '/exp') {
    // Serve exp.html with Jinja2 variable substitution
    fs.readFile(path.join(BASE, 'templates', 'exp.html'), 'utf8', (err, html) => {
      if (err) { res.writeHead(500); res.end('Error reading exp.html'); return }
      for (const [key, val] of Object.entries(STUB)) {
        html = html.replaceAll(`{{ ${key} }}`, val)
      }
      // Inject seeded PRNG as the very first script if ?seed=N is set
      if (seed !== null) {
        html = html.replace('<head>', '<head>\n  ' + seedScript(parseInt(seed, 10)))
        html = html.replace(
          '<script src="/static/js/scan_stimuli_simple.js" type="text/javascript"> </script>',
          '  ' + scanSeedScript(parseInt(seed, 10)) + '\n\t\t<script src="/static/js/scan_stimuli_simple.js" type="text/javascript"> </script>'
        )
      }
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      })
      res.end(html)
    })
  } else if (pathname.startsWith('/static/pages/')) {
    // psiturk fetches template fragments from /static/pages/<name>
    const page = pathname.slice('/static/pages/'.length)
    serveFile(path.join(BASE, 'templates', page), res)
  } else if (pathname === '/vendor/underscore/underscore-min.js') {
    serveFile(path.join(ROOT, 'node_modules', 'underscore', 'underscore-min.js'), res)
  } else if (pathname.startsWith('/static/')) {
    serveFile(path.join(BASE, pathname.slice(1)), res)
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  }
})

server.listen(PORT, () => {
  console.log(`\nPsiturk experiment → http://localhost:${PORT}\n`)
})
