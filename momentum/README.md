# Momentum

Локальный планировщик задач: идеи → планы → расписание.

## Требования

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose

## Запуск

**Linux / Mac:**
```bash
./start.sh
```

**Windows:**
```
start.bat
```

При первом запуске спросит порт (по умолчанию `3030`), сохранит в `.momentum_port` и запустит сборку.  
Открыть: **http://localhost:3030** (или указанный вами порт).

## Остановка

```bash
./stop.sh   # Linux/Mac
stop.bat    # Windows
```

## Смена порта

Удалите файл `.momentum_port` и запустите снова — снова спросит порт.

## Данные

SQLite-база хранится в Docker volume `momentum_momentum_data` — при остановке и перезапуске данные сохраняются.
