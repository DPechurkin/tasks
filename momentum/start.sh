#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/.momentum_port"

# Читаем или запрашиваем порт
if [ -f "$CONFIG_FILE" ]; then
  PORT=$(cat "$CONFIG_FILE" | tr -d '[:space:]')
  echo "Используется порт $PORT (из .momentum_port)"
else
  echo ""
  echo "  Momentum — локальный планировщик"
  echo "  ================================"
  echo ""
  read -p "  На каком порту запустить? [3030]: " PORT
  PORT="${PORT:-3030}"

  # Проверяем что это число
  if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1024 ] || [ "$PORT" -gt 65535 ]; then
    echo "  Некорректный порт. Используется 3030."
    PORT=3030
  fi

  echo "$PORT" > "$CONFIG_FILE"
  echo "  Порт $PORT сохранён в .momentum_port"
fi

echo ""
echo "  Сборка и запуск (может занять несколько минут при первом запуске)..."
echo ""

cd "$SCRIPT_DIR"
MOMENTUM_PORT=$PORT docker compose up -d --build

echo ""
echo "  ✓ Momentum запущен: http://localhost:$PORT"
echo ""
echo "  Остановить:  ./stop.sh"
echo "  Сменить порт: удалите .momentum_port и запустите снова"
