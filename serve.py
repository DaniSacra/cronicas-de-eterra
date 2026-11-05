# Servidor local do jogo, sem cache (o navegador sempre baixa a versão mais nova).
# Uso: python3 serve.py   →  http://localhost:8000
import http.server, functools

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

http.server.ThreadingHTTPServer(('', 8000), functools.partial(NoCache, directory='.')).serve_forever()
