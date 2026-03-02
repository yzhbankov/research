import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    // CORS proxy plugin for Code Executor node
    {
      name: 'cors-proxy',
      configureServer(server) {
        server.middlewares.use('/api/cors-proxy', async (req, res) => {
          const url = new URL(req.url!, `http://${req.headers.host}`);
          const targetUrl = url.searchParams.get('url');
          if (!targetUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing ?url= parameter' }));
            return;
          }

          try {
            const targetParsed = new URL(targetUrl);
            // Forward the original method, headers (minus host), and body
            const headers: Record<string, string> = {};
            for (const [key, val] of Object.entries(req.headers)) {
              if (['host', 'origin', 'referer', 'connection'].includes(key)) continue;
              if (typeof val === 'string') headers[key] = val;
            }
            headers['host'] = targetParsed.host;

            // Read body for non-GET
            let body: Buffer | undefined;
            if (req.method !== 'GET' && req.method !== 'HEAD') {
              const chunks: Buffer[] = [];
              for await (const chunk of req) chunks.push(chunk as Buffer);
              body = Buffer.concat(chunks);
            }

            const upstream = await fetch(targetUrl, {
              method: req.method,
              headers,
              body,
            });

            // Relay status + headers
            const respHeaders: Record<string, string> = {
              'access-control-allow-origin': '*',
            };
            upstream.headers.forEach((v, k) => {
              if (!['transfer-encoding', 'content-encoding', 'connection'].includes(k.toLowerCase())) {
                respHeaders[k] = v;
              }
            });

            res.writeHead(upstream.status, respHeaders);
            const arrayBuf = await upstream.arrayBuffer();
            res.end(Buffer.from(arrayBuf));
          } catch (err: unknown) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: String(err) }));
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ''),
      },
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
      },
      '/api/google': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/google/, ''),
      },
    },
  },
});
