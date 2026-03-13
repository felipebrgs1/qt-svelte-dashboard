# ══════════════════════════════════════════════════════════════════════════════
#  Qt + Svelte Dashboard — Makefile
#  Usage: make help
# ══════════════════════════════════════════════════════════════════════════════

.DEFAULT_GOAL := help

.PHONY: all help check-deps setup frontend frontend-dev \
        configure build build-backend run dev clean clean-all

# ── Directories ───────────────────────────────────────────────────────────────
BUILD_DIR    := build
FRONTEND_DIR := frontend
# Binary lands at build/dashboard because CMakeLists sets
# CMAKE_RUNTIME_OUTPUT_DIRECTORY = CMAKE_BINARY_DIR
BIN          := $(BUILD_DIR)/dashboard

# ── Detect package manager: bun preferred, fallback to npm ───────────────────
PKG_MANAGER := $(shell command -v bun >/dev/null 2>&1 && echo bun || echo npm)
ifeq ($(PKG_MANAGER),bun)
  PKG_INSTALL := bun install
  PKG_RUN     := bun run
else
  PKG_INSTALL := npm install
  PKG_RUN     := npm run
endif

# ── Parallel jobs ─────────────────────────────────────────────────────────────
NPROC := $(shell nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)

# ── CMake build type (override: make build BUILD_TYPE=Debug) ──────────────────
BUILD_TYPE ?= Release

# ── ANSI colours ──────────────────────────────────────────────────────────────
C_RESET  := \033[0m
C_BOLD   := \033[1m
C_GREEN  := \033[0;32m
C_CYAN   := \033[0;36m
C_YELLOW := \033[1;33m
C_RED    := \033[0;31m

# ── Logging helpers (call without quoting the argument) ───────────────────────
# Usage: $(call log_ok,message)   — no surrounding quotes around message
log_ok    = @printf "$(C_GREEN) ✔  $(1)$(C_RESET)\n"
log_info  = @printf "$(C_CYAN) →  $(1)$(C_RESET)\n"
log_warn  = @printf "$(C_YELLOW) ⚠  $(1)$(C_RESET)\n"
log_error = @printf "$(C_RED) ✘  $(1)$(C_RESET)\n"
log_step  = @printf "\n$(C_BOLD)$(C_CYAN)── $(1)$(C_RESET)\n"

# ══════════════════════════════════════════════════════════════════════════════
##@ General

help: ## Show this help message
	@printf "\n$(C_BOLD)  Qt + Svelte Dashboard$(C_RESET)\n"
	@printf "  Package manager : $(C_CYAN)$(PKG_MANAGER)$(C_RESET)\n"
	@printf "  Build type      : $(C_CYAN)$(BUILD_TYPE)$(C_RESET)\n"
	@printf "  Binary output   : $(C_CYAN)$(BIN)$(C_RESET)\n"
	@printf "\n  $(C_BOLD)Usage:$(C_RESET) make $(C_CYAN)[target]$(C_RESET)  $(C_YELLOW)[VAR=value ...]$(C_RESET)\n\n"
	@grep -E '^(##@|[a-zA-Z_-]+:.*?## )' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "} \
	    /^##@/ { printf "\n$(C_BOLD)%s$(C_RESET)\n", substr($$0,4); next } \
	    { printf "  $(C_CYAN)%-18s$(C_RESET) %s\n", $$1, $$2 }'
	@printf "\n  $(C_YELLOW)Variables:$(C_RESET)\n"
	@printf "  $(C_CYAN)%-18s$(C_RESET) %s\n" "BUILD_TYPE" "Release (default) | Debug | RelWithDebInfo"
	@printf "\n"

all: build ## Alias for build

# ══════════════════════════════════════════════════════════════════════════════
##@ Validation

check-deps: ## Check all required build dependencies
	@printf "\n$(C_BOLD)$(C_CYAN)── Checking dependencies$(C_RESET)\n"
	@fail=0; \
	for cmd in cmake $(PKG_MANAGER) g++ pkg-config; do \
	  if command -v $$cmd >/dev/null 2>&1; then \
	    printf "  $(C_GREEN)✔$(C_RESET)  %-14s %s\n" "$$cmd" "$$($$cmd --version 2>&1 | head -1)"; \
	  else \
	    printf "  $(C_RED)✘$(C_RESET)  $$cmd  — not found\n"; \
	    fail=1; \
	  fi; \
	done; \
	if pkg-config --exists Qt6Core 2>/dev/null; then \
	  printf "  $(C_GREEN)✔$(C_RESET)  %-14s %s\n" "Qt6Core" "$$(pkg-config --modversion Qt6Core)"; \
	elif command -v qmake6 >/dev/null 2>&1; then \
	  printf "  $(C_GREEN)✔$(C_RESET)  %-14s %s\n" "Qt6" "(detected via qmake6)"; \
	else \
	  printf "  $(C_YELLOW)⚠$(C_RESET)  Qt6  — not detected via pkg-config or qmake6 (cmake will still try)\n"; \
	fi; \
	test $$fail -eq 0
	$(call log_ok,All required tools present)

# ══════════════════════════════════════════════════════════════════════════════
##@ Frontend

setup: ## Install frontend dependencies (bun/npm install)
	@printf "\n$(C_BOLD)$(C_CYAN)── Frontend — installing dependencies ($(PKG_MANAGER))$(C_RESET)\n"
	cd $(FRONTEND_DIR) && $(PKG_INSTALL)
	$(call log_ok,Dependencies installed)

frontend: setup ## Build Svelte/Vite frontend → frontend/dist/
	@printf "\n$(C_BOLD)$(C_CYAN)── Frontend — building with Vite$(C_RESET)\n"
	cd $(FRONTEND_DIR) && $(PKG_RUN) build
	$(call log_ok,Frontend built  →  frontend/dist/)

frontend-dev: setup ## Start Vite dev server with hot-reload on :5173
	@printf "\n$(C_BOLD)$(C_CYAN)── Frontend — dev server (Ctrl-C to stop)$(C_RESET)\n"
	$(call log_info,Open http://localhost:5173 in a browser)
	$(call log_info,Qt backend must also be running  (make run in another terminal))
	cd $(FRONTEND_DIR) && $(PKG_RUN) dev

# ══════════════════════════════════════════════════════════════════════════════
##@ Backend

configure: ## Configure CMake for production (frontend/dist will be copied)
	@printf "\n$(C_BOLD)$(C_CYAN)── CMake — configuring [$(BUILD_TYPE)]$(C_RESET)\n"
	cmake -B $(BUILD_DIR) -S . \
	  -DCMAKE_BUILD_TYPE=$(BUILD_TYPE) \
	  -DFRONTEND_ALREADY_BUILT=ON
	$(call log_ok,CMake configured  →  $(BUILD_DIR)/)

dev-configure: ## Configure CMake for dev mode (no frontend build or copy)
	@printf "\n$(C_BOLD)$(C_CYAN)── CMake — configuring [$(BUILD_TYPE) / dev mode]$(C_RESET)\n"
	cmake -B $(BUILD_DIR) -S . \
	  -DCMAKE_BUILD_TYPE=$(BUILD_TYPE) \
	  -DFRONTEND_ALREADY_BUILT=ON
	$(call log_ok,CMake configured for dev  →  $(BUILD_DIR)/)

build-backend: configure ## Compile Qt backend only (run 'make frontend' first)
	@if [ ! -d "$(FRONTEND_DIR)/dist" ]; then \
	  printf "$(C_RED) ✘  frontend/dist not found — run 'make frontend' first or use 'make build'$(C_RESET)\n"; \
	  exit 1; \
	fi
	@printf "\n$(C_BOLD)$(C_CYAN)── Backend — compiling ($(NPROC) jobs)$(C_RESET)\n"
	cmake --build $(BUILD_DIR) --parallel $(NPROC)
	$(call log_ok,Backend compiled  →  $(BIN))

# ══════════════════════════════════════════════════════════════════════════════
##@ Full Build

build: frontend build-backend ## ★ Build everything: frontend + Qt backend (start here)
	@printf "\n$(C_BOLD)$(C_GREEN)  ══════════════════════════════$(C_RESET)\n"
	@printf "$(C_BOLD)$(C_GREEN)   Build complete → $(BIN)$(C_RESET)\n"
	@printf "$(C_BOLD)$(C_GREEN)  ══════════════════════════════$(C_RESET)\n\n"

# ══════════════════════════════════════════════════════════════════════════════
##@ Run

run: ## Run the dashboard (auto-builds if binary is missing)
	@if [ ! -f "$(BIN)" ]; then \
	  printf "$(C_YELLOW) ⚠  Binary not found — running full build first...$(C_RESET)\n"; \
	  $(MAKE) --no-print-directory build; \
	fi
	@printf "\n$(C_BOLD)$(C_CYAN)── Launching Qt Dashboard$(C_RESET)\n"
	./$(BIN)

dev: dev-configure ## Dev mode: Qt loads frontend from Vite dev server (:5173)
	@printf "\n$(C_BOLD)$(C_CYAN)── Dev mode$(C_RESET)\n"
	@printf "  $(C_CYAN)1.$(C_RESET)  Compiles Qt backend\n"
	@printf "  $(C_CYAN)2.$(C_RESET)  Starts Vite dev server on http://localhost:5173 (background)\n"
	@printf "  $(C_CYAN)3.$(C_RESET)  Qt opens the Vite URL — hot-reload works!\n\n"
	$(call log_info,Compiling backend...)
	cmake --build $(BUILD_DIR) --parallel $(NPROC)
	$(call log_info,Starting Vite dev server in background...)
	cd $(FRONTEND_DIR) && $(PKG_RUN) dev &
	@sleep 2
	$(call log_info,Launching Qt  (DASHBOARD_DEV_URL=http://localhost:5173)...)
	DASHBOARD_DEV_URL=http://localhost:5173 ./$(BIN)

# ══════════════════════════════════════════════════════════════════════════════
##@ Cleanup

clean: ## Remove CMake build directory
	$(call log_info,Removing $(BUILD_DIR)/...)
	rm -rf $(BUILD_DIR)
	$(call log_ok,Build directory removed)

clean-all: clean ## Remove build/ + frontend/dist/ + node_modules/
	$(call log_info,Removing frontend/dist/ ...)
	rm -rf $(FRONTEND_DIR)/dist
	$(call log_info,Removing frontend/node_modules/ ...)
	rm -rf $(FRONTEND_DIR)/node_modules
	$(call log_ok,Full clean complete)
