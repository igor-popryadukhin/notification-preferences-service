# Notification Preferences Service

Сервис управления предпочтениями уведомлений. Единый источник правды для принятия решений о том, какие типы уведомлений и по каким каналам можно отправлять пользователю.

## Быстрый старт

```bash
# 1. Установить зависимости
npm install

# 2. Запустить PostgreSQL
docker compose up -d

# 3. Применить миграции
npm run migrate

# 4. Запустить сервер
npm run dev
```

Сервер доступен на `http://localhost:3000`.  
Проверка: `curl http://localhost:3000/health` → `{"status":"ok"}`

## Запуск тестов

```bash
# Unit-тесты (без базы данных)
npm test

# Интеграционные тесты (требуют PostgreSQL)
docker compose up -d
npm run test:integration
```

## API

### GET /users/:userId/preferences

Получение эффективных предпочтений пользователя (слияние его настроек с дефолтами).

```bash
curl http://localhost:3000/users/user-1/preferences
```

Ответ:
```json
{
  "userId": "user-1",
  "preferences": [
    { "notificationType": "marketing", "channel": "email", "allowed": true, "source": "default" },
    { "notificationType": "marketing", "channel": "sms", "allowed": true, "source": "default" }
  ],
  "quietHours": null
}
```

### POST /users/:userId/preferences

Изменение предпочтений и/или quiet hours. Идемпотентно (ON CONFLICT upsert).

```bash
# Включение/выключение типа по каналу
curl -X POST http://localhost:3000/users/user-1/preferences \
  -H 'Content-Type: application/json' \
  -d '{"preferences": [{"notificationType": "marketing", "channel": "email", "allowed": false}]}'

# Настройка quiet hours
curl -X POST http://localhost:3000/users/user-1/preferences \
  -H 'Content-Type: application/json' \
  -d '{"quietHours": {"startTime": "22:00", "endTime": "08:00", "timezone": "Europe/Moscow", "enabled": true}}'
```

### POST /evaluate

Проверка возможности отправки уведомления.

```bash
curl -X POST http://localhost:3000/evaluate \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "user-1",
    "notificationType": "marketing",
    "channel": "email",
    "region": "EU",
    "datetime": "2026-05-21T21:30:00Z"
  }'
```

Ответ:
```json
{ "decision": "allow" }
```
или:
```json
{ "decision": "deny", "reason": "blocked_by_global_policy" }
```

## Архитектура

```
src/
├── domain/              # Чистая бизнес-логика (нет I/O)
│   ├── types.ts         # Доменные типы: Preference, Decision, QuietHours, GlobalPolicy
│   ├── constants.ts     # Перечисления: NOTIFICATION_TYPES, CHANNELS
│   ├── evaluate.ts      # Правила оценки: политики → quiet hours → настройки → дефолты → allow
│   └── merge.ts         # Слияние пользовательских и дефолтных настроек
├── infrastructure/      # Инфраструктура
│   ├── database/        # pg Pool, миграции, раннер
│   └── repositories/    # Доступ к данным (4 репозитория)
├── api/                 # HTTP-слой
│   ├── routes/          # Роуты Express
│   ├── schemas/         # Zod-валидация
│   └── middleware/       # Валидация и обработка ошибок
└── index.ts             # Entry point
```

### Приоритет правил оценки (evaluate)

1. **Глобальные политики** — hard block (например, запрет типа/канала в регионе)
2. **Quiet hours** — блокировка marketing, пропуск transactional/security
3. **Пользовательские настройки** — переопределяют дефолты
4. **Дефолтные настройки** — базовый уровень
5. **Fallback** — allow (если ничего не настроено)

### Ключевые решения

- **Чистые функции в domain/** — evaluate() и merge() не делают I/O, полностью тестируются без моков
- **Raw SQL без ORM** — полный контроль над запросами, прозрачные ON CONFLICT upsert'ы
- **Таймзоны через Intl.DateTimeFormat** — встроенный в Node.js 24 API, без внешних библиотек
- **Idempotency** — все мутации через ON CONFLICT DO UPDATE
- **Zod для валидации** — строгие проверки на границе API с понятными сообщениями об ошибках

## Переменные окружения

| Переменная | По умолчанию | Описание |
|-----------|-------------|----------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/notification_prefs` | URL подключения к PostgreSQL |
| `PORT` | `3000` | HTTP-порт |
| `LOG_LEVEL` | `info` | Уровень логирования (pino) |

См. `.env.example`.

## Что добавил бы до продакшена

- **Кэширование глобальных политик** — сейчас загружаются при каждом evaluate, архитектура позволяет добавить кэш в один файл
- **Аудит решений** — сохранение истории всех allow/deny решений для аналитики
- **Метрики Prometheus** — счётчики evaluate-запросов (по решению, причине), гистограммы времени ответа
- **Rate limiting** — защита API через Express middleware
- **Graceful shutdown** — корректное закрытие pg Pool и HTTP-сервера по SIGTERM
- **Пагинация предпочтений** — если количество типов/каналов вырастет
- **Блокировка конкурентных миграций** — механизм lock'а через advisory lock в самом migrate.ts
- **Версионирование API** — префикс `/v1/` на все эндпоинты
- **Health check с проверкой БД** — сейчас `/health` статичен, стоит добавить `pool.query('SELECT 1')`
