# ============================================================
# ENE — Makefile de comandos de desarrollo
# Uso: make <comando>
# ============================================================

.PHONY: up down restart logs logs-db ps db-shell reset-db migrate studio seed help

BOLD  := \033[1m
GREEN := \033[32m
RESET := \033[0m

## Levantar todos los servicios en background
up:
	@echo "$(BOLD)→ Levantando servicios ENE...$(RESET)"
	docker compose up -d
	@echo "$(GREEN)✓ Servicios activos:$(RESET)"
	@echo "  PostgreSQL  → localhost:5434"
	@echo "  pgAdmin     → http://localhost:5051"
	@echo "  API         → http://localhost:3011"
	@echo "  Web         → pendiente de scaffold (ver ene-web/README.md)"
	@echo "  Swagger     → http://localhost:3011/docs"

## Detener todos los servicios
down:
	@echo "$(BOLD)→ Deteniendo servicios ENE...$(RESET)"
	docker compose down

## Reiniciar servicios
restart:
	docker compose restart

## Ver logs en tiempo real (Ctrl+C para salir)
logs:
	docker compose logs -f

## Ver logs solo de postgres
logs-db:
	docker compose logs -f postgres

## Ver estado de contenedores
ps:
	docker compose ps

## Abrir shell psql en la base de datos
db-shell:
	docker compose exec postgres psql -U ene_user -d ene_db

## Destruir volúmenes y recrear base de datos limpia (borra todos los datos)
reset-db:
	@echo "$(BOLD)Esto borrará TODOS los datos. Ctrl+C para cancelar...$(RESET)"
	@sleep 3
	docker compose down -v
	docker compose up -d postgres
	@echo "$(GREEN)✓ Base de datos reiniciada$(RESET)"

## Ejecutar migraciones Prisma
migrate:
	cd ene-api && npx prisma migrate dev

## Abrir Prisma Studio
studio:
	cd ene-api && npx prisma studio

## Cargar datos semilla
seed:
	cd ene-api && npm run db:seed

## Ver este menú de ayuda
help:
	@echo ""
	@echo "$(BOLD)ENE — Comandos disponibles$(RESET)"
	@echo ""
	@grep -E '^## .*' Makefile | sed 's/## /  /'
	@echo ""
