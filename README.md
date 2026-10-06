# Raw Crownz Records

React + Vite + TypeScript, FastAPI + SQLAlchemy, PostgreSQL. Аудио, обложки и аватары хранятся на диске в `storage`, в базе находятся только метаданные и пути.

## Запуск в Docker

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

Сайт: http://localhost:3001. API: http://localhost:3002. Swagger: http://localhost:3002/docs.

При обновлении существующей установки сохраните прежние параметры PostgreSQL в `.env`. Именованный том `postgres-data` и каталог `storage` используются как раньше. Не удаляйте том базы при обновлении.

## Админка

Откройте `/admin`. На первом запуске создаётся суперадмин `god-admin` с паролем из `GOD_ADMIN_PASSWORD`. В `.env.example` установлен запрошенный пароль `27042003!`. В базе сохраняется только хеш Argon2. Изменение переменной после создания аккаунта не сбрасывает пароль: новый пароль задаётся в разделе «Администраторы».

Суперадмин управляет артистами, всеми треками и альбомами, создаёт администраторов, меняет их пароли и привязку к артистам, удаляет аккаунты. Сначала создайте артиста, затем администратора с логином, паролем и привязкой к этому артисту.

Обычный администратор создаёт, редактирует и удаляет только треки и альбомы своего артиста. Профилями артистов и аккаунтами управляет суперадмин. Права проверяются сервером на каждом запросе. Трек можно включить только в альбом того же артиста.

Сессии действуют 12 часов; cookie имеет HttpOnly и SameSite=Strict. Выход, смена пароля, изменение аккаунта и его удаление отзывают соответствующие сессии. Для HTTPS установите `COOKIE_SECURE=true`, а для другого домена разработки добавьте его в `CORS_ORIGINS`.

## Локальная разработка

Python 3.13 и Node.js 22.

```powershell
Copy-Item .env.example .env
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements-dev.txt
.venv/Scripts/python -m uvicorn app.main:app --reload --port 3000
```

В другом терминале:

```powershell
cd frontend
npm ci
npm run dev
```

Без `DATABASE_URL` и `DB_HOST` локально используется SQLite в `backend/data/catalog.db`. Для существующей базы задайте `DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/rawcrownz` либо `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`. Vite проксирует `/api` и `/storage` на порт 3000.

## Проверки

```powershell
cd backend
.venv/Scripts/python -m pytest -q
cd ../frontend
npm run build
npm run lint
```

Тесты API используют отдельные временные базу и каталог файлов. Для PostgreSQL можно задать `RCT_TEST_DATABASE_URL`, указывающий только на отдельную тестовую базу: её таблицы пересоздаются между тестами.
