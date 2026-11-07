import type { Request, Response } from 'express';

const HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  </style>
</head>
<body>
  <script>
    window.addEventListener('message', (e) => {
      if (e.source !== window.parent) return;
      if (e.data?.type !== 'lujax:artifact') return;
      const html = e.data?.html;
      if (!html) return;
      document.open();
      document.write(html);
      document.close();
    });
  </script>
</body>
</html>`;

export function artifactFrameRoute(req: Request, res: Response) {
  res.setHeader('Content-Security-Policy',
    "sandbox allow-scripts allow-forms allow-modals allow-popups allow-pointer-lock; " +
    "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; " +
    "connect-src 'none'; " +
    "frame-ancestors 'self'"
  );
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(HTML);
}
