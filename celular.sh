#!/data/data/com.termux/files/usr/bin/bash
# Roda o MeuTube no celular (Termux) e cria um link publico com Cloudflare Tunnel.
# Uso: bash celular.sh
cd "$(dirname "$0")"

# Uploads acima de ~100 MB sao bloqueados pelo Cloudflare gratis
export MAX_UPLOAD_MB=${MAX_UPLOAD_MB:-95}
export DATA_DIR=${DATA_DIR:-$HOME/meutube-dados}
export PORT=${PORT:-3000}

termux-wake-lock 2>/dev/null

# Para uma execucao anterior, se houver
[ -f "$HOME/.meutube.pid" ] && kill "$(cat "$HOME/.meutube.pid")" 2>/dev/null

node server.js > "$HOME/meutube.log" 2>&1 &
echo $! > "$HOME/.meutube.pid"
trap 'kill $(cat "$HOME/.meutube.pid") 2>/dev/null' EXIT
sleep 2
if ! kill -0 "$(cat "$HOME/.meutube.pid")" 2>/dev/null; then
  echo "O servidor nao iniciou. Veja o erro:"
  cat "$HOME/meutube.log"
  exit 1
fi
echo "MeuTube rodando em http://localhost:$PORT"
echo "Criando link publico (aguarde alguns segundos)..."

cloudflared tunnel --url "http://localhost:$PORT" 2>&1 | while read -r line; do
  url=$(echo "$line" | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com')
  if [ -n "$url" ]; then
    echo ""
    echo "=============================================="
    echo " Seu site esta no ar: $url"
    echo "=============================================="
    echo "(deixe o Termux aberto; Ctrl+C para parar)"
  fi
done
