.PHONY: build up down logs restart test test-backend test-frontend test-e2e dev clean rebuild install

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

restart:
	docker-compose restart

dev-backend:
	cd backend && npm run dev

dev-frontend:
	cd frontend && npm run dev

dev:
	cd backend && PORT=3001 DB_PATH=$(PWD)/data/dev.db npm run dev &
	cd frontend && npm run dev

test-backend:
	cd backend && npx vitest run

test-frontend:
	cd frontend && npx vitest run

test-e2e:
	npx playwright test

test:
	$(MAKE) test-backend && $(MAKE) test-frontend

install:
	cd backend && npm install
	cd frontend && npm install

clean:
	docker-compose down -v
	rm -rf backend/dist backend/node_modules frontend/node_modules

rebuild:
	$(MAKE) clean
	$(MAKE) install
	$(MAKE) build
