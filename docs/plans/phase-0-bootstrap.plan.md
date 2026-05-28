# Plan: Phase 0 — Bootstrap (neuroedge-device repo)

## Summary
Bootstrap the `neuroedge-device` repository from scratch: `git init`, CMake + Conan 2 scaffold for the C++17 hot-path container (`ne-data-plane`), Python 3.11 scaffold for the management-plane containers (`ne-control-plane`, `ne-external`), Dockerfiles for all 4 functional + 1 broker containers, multi-arch CI on GitHub Actions building and pushing 5 images to ECR `:dev`, and pre-commit hooks for C++ + Python + Markdown. End state: `make build` produces 4 images locally; CI green on first push.

## User Story
As Sanjeev (solo edge AI engineer), I want a working monorepo scaffold with build automation and CI from day 1, so that every subsequent phase ships into a hardened structure with format/lint/build/scan gates already in place.

## Problem → Solution
**Current state:** `C:\Sanjeev_E\NeuroEdge Device\` is not a git repo. Only `.claude/` (agents + commands), `health_check/`, `scripts/hooks/`, and `docs/` (PRD + reference) exist. No source code, no build, no CI, no Docker.
**Desired state:** Git repo pushed to `cognizant/neuroedge-device`; `make build` produces 5 container images locally; CI green; pre-commit hooks active; ECR receives signed `:dev` images on push to main.

## Metadata
- **Complexity:** Large (multi-language scaffold, ~30 files, 2 build systems, 1 CI pipeline)
- **Source PRD:** [c:\Sanjeev_E\NeuroEdge Device\docs\PRD.md](../PRD.md)
- **PRD Phase:** Phase 0 — Bootstrap (Section 13, MVP)
- **Estimated Files:** ~32 new files, 0 modified
- **Estimated Duration:** 3 working days for Sanjeev solo

---

## UX Design

### Before
```
C:\Sanjeev_E\NeuroEdge Device\
├── .claude/           (agents, commands)
├── docs/              (PRD.md, reference/)
├── health_check/      (assets-installed checkers)
└── scripts/hooks/     (node-based pre-commit hooks)

[No source, no build, no CI, no git history]
```

### After
```
C:\Sanjeev_E\NeuroEdge Device\
├── .claude/                      (existing)
├── .github/workflows/            (NEW — CI)
│   └── build.yml
├── .gitignore                    (NEW)
├── .pre-commit-config.yaml       (NEW)
├── CMakeLists.txt                (NEW — top-level)
├── Makefile                      (NEW)
├── README.md                     (NEW — minimal)
├── conanfile.txt                 (NEW — top-level deps)
├── conan_profiles/               (NEW)
│   ├── x86-ubuntu2204
│   ├── jetson-l4t36              (stub)
│   ├── aim01-qrb5165             (stub)
│   ├── iq6-qcs6490               (stub)
│   └── rpi5-bookworm             (stub)
├── containers/                   (NEW — Dockerfiles)
│   ├── ne-data-plane/Dockerfile
│   ├── ne-control-plane/Dockerfile
│   ├── ne-external/Dockerfile
│   ├── ne-security/Dockerfile
│   └── ne-bus/Dockerfile
├── docker-compose.yaml           (NEW)
├── docs/                         (existing + this plan)
├── health_check/                 (existing)
├── infra/terraform/              (NEW — placeholder)
│   └── README.md
├── scripts/                      (existing + new entries)
│   ├── hooks/                    (existing)
│   ├── bootstrap_dev.sh          (NEW)
│   └── verify_build.sh           (NEW)
├── services/                     (NEW)
│   ├── ne-control-plane/         (Python)
│   │   ├── pyproject.toml
│   │   ├── ne_control_plane/__init__.py
│   │   └── ne_control_plane/app.py     # "hello world" FastAPI
│   ├── ne-external/              (Python)
│   │   ├── pyproject.toml
│   │   ├── ne_external/__init__.py
│   │   └── ne_external/app.py          # "hello world" FastAPI
│   └── ne-security/              (Python)
│       ├── pyproject.toml
│       ├── ne_security/__init__.py
│       └── ne_security/sentinel.py     # placeholder daemon
└── src/ne-data-plane/            (NEW — C++)
    ├── CMakeLists.txt
    ├── include/neuroedge/version.hpp
    └── main.cpp                       # "hello world" entry point

[git init, remote set, first commit pushed, CI green]
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Local dev | No build command | `make build` produces 5 images | Single canonical entry |
| Code formatting | None | Auto-formatted on commit | clang-format + ruff + prettier |
| Push to main | N/A (no repo) | CI builds + pushes 5 multi-arch images to ECR `:dev` | Multi-arch via buildx + QEMU |
| Pre-commit | None | clang-format + cpplint + ruff + secret scan | Hooks already exist in `scripts/hooks/` — wire them in |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | [docs/PRD.md](../PRD.md) | all | Source of truth for scope + acceptance |
| P0 | [docs/reference/device_system_design_approach.md](../reference/device_system_design_approach.md) | §3.2, §10 | Container layout + AWS conventions |
| P0 | [C:\Sanjeev_E\NeuroEdge Web\CLAUDE.md](../../../NeuroEdge%20Web/CLAUDE.md) | "Publishing Shared Contracts Package" section | How Web publishes the contract package that this repo consumes |
| P1 | [C:\Sanjeev_E\NeuroEdge Device\scripts\hooks\](../../scripts/hooks/) | all 5 .js files | Existing pre-commit hooks — must be wired, not recreated |
| P1 | [C:\Sanjeev_E\NeuroEdge Web\Makefile](../../../NeuroEdge%20Web/Makefile) | sections labeled "build", "lint" | Mirror the Makefile target naming for consistency across Web + Device |
| P2 | [C:\Sanjeev_E\NeuroEdge Web\.github\workflows\](../../../NeuroEdge%20Web/.github/workflows/) | if exists | Reuse GitHub Actions patterns from Web side |
| P2 | [C:\Sanjeev_E\NeuroEdge Web\docker-compose.yml](../../../NeuroEdge%20Web/docker-compose.yml) | all | Service naming conventions to mirror |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| Conan 2 profiles | https://docs.conan.io/2/reference/config_files/profiles.html | Profiles per (arch, compiler, libc); use `[settings]` + `[options]` + `[buildenv]` |
| CMake + Conan integration | https://docs.conan.io/2/integrations/cmake.html | Use `CMakePresets.json` + Conan's `CMakeToolchain` generator |
| Docker buildx multi-arch | https://docs.docker.com/build/building/multi-platform/ | Need `qemu-user-static` registered + buildx builder created |
| ECR authentication in CI | https://docs.aws.amazon.com/AmazonECR/latest/userguide/getting-started-cli.html | Use OIDC role from GitHub Actions, NOT long-lived AWS keys |
| GitHub Actions OIDC → AWS | https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services | Sanjeev to provision IAM identity provider once via CloudBoost |
| EMQX in Docker | https://www.emqx.com/en/docs/dashboard/introduction.html | Official image `emqx/emqx:5.x`; ports 1883 (MQTT), 8083 (WS), 18083 (UI) |

---

## Patterns to Mirror

### NAMING_CONVENTION (Python services)
```
# SOURCE: NeuroEdge Web — src/neuroedge_design_usecase/, src/neuroedge_device_capability/
# Pattern: snake_case package names with `neuroedge_` prefix in Web; on Device use `ne_` short prefix matching container name
# Module dir name = container name with hyphen→underscore

services/ne-control-plane/ne_control_plane/__init__.py
services/ne-external/ne_external/__init__.py
services/ne-security/ne_security/__init__.py
```

### NAMING_CONVENTION (C++)
```
// SOURCE: Standard modern C++ + NeuroEdge contract style
// Pattern: snake_case files, PascalCase classes, snake_case methods, ALL_CAPS macros only for guards
// Namespace: neuroedge::data_plane

src/ne-data-plane/include/neuroedge/version.hpp   // header
src/ne-data-plane/main.cpp                        // entry
```

### ERROR_HANDLING (Python services scaffold)
```python
# SOURCE: Mirror NeuroEdge Web (uses Python's standard exception classes + logging)
# Pattern: explicit exception types, propagate to caller, log at boundary

from fastapi import HTTPException
import logging

log = logging.getLogger(__name__)

@app.get("/healthz")
def healthz():
    try:
        return {"status": "ok"}
    except Exception as e:
        log.exception("healthz failed")
        raise HTTPException(status_code=500, detail=str(e))
```

### LOGGING_PATTERN (Python)
```python
# SOURCE: NeuroEdge Web standard library logging via getLogger(__name__)
import logging
log = logging.getLogger(__name__)
# Phase 0 uses stdlib logging; Phase 2 will swap to structlog for JSON output
```

### LOGGING_PATTERN (C++)
```cpp
// SOURCE: New for Device; chosen library spdlog (will be added in Phase 1)
// Phase 0 placeholder: std::cerr + std::cout only.
#include <iostream>
std::cout << "ne-data-plane v" << NEUROEDGE_VERSION << " starting\n";
```

### TEST_STRUCTURE (Python — Phase 0 minimum)
```python
# SOURCE: NeuroEdge Web — pytest convention
# Pattern: tests/ at service root, test_<module>.py, pytest fixtures in conftest.py

# services/ne-control-plane/tests/test_smoke.py
from fastapi.testclient import TestClient
from ne_control_plane.app import app

def test_healthz():
    client = TestClient(app)
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
```

### TEST_STRUCTURE (C++ — Phase 0 minimum)
```cmake
# SOURCE: New — Catch2 v3 chosen (Conan-installable, no fixture boilerplate)
# Pattern: tests/test_*.cpp + CMake target test_<component>

add_executable(test_version tests/test_version.cpp)
target_link_libraries(test_version PRIVATE Catch2::Catch2WithMain)
add_test(NAME test_version COMMAND test_version)
```

### MAKE_TARGETS (mirror Web's Makefile structure)
```makefile
# SOURCE: NeuroEdge Web Makefile
# Pattern: phony targets, short verb-first names, .PHONY: declared once at top

.PHONY: build build-cpp build-py build-images lint format test clean help

help:
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk -F ':.*?## ' '{printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: build-cpp build-py build-images  ## Build everything (C++, Python, Docker images)
```

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `.gitignore` | CREATE | Git hygiene from commit 1 |
| `.pre-commit-config.yaml` | CREATE | Pre-commit framework config |
| `.github/workflows/build.yml` | CREATE | CI pipeline |
| `CMakeLists.txt` | CREATE | Top-level C++ build entry |
| `Makefile` | CREATE | Canonical task runner |
| `README.md` | CREATE | Repo entry point — minimal |
| `conanfile.txt` | CREATE | C++ deps (Phase 0: just gtest/Catch2 + spdlog placeholder) |
| `conan_profiles/x86-ubuntu2204` | CREATE | Default dev profile |
| `conan_profiles/jetson-l4t36` | CREATE (stub) | Phase 4 fills in |
| `conan_profiles/aim01-qrb5165` | CREATE (stub) | Phase 5 fills in |
| `conan_profiles/iq6-qcs6490` | CREATE (stub) | Phase 8 fills in |
| `conan_profiles/rpi5-bookworm` | CREATE (stub) | Phase 7 fills in |
| `containers/ne-data-plane/Dockerfile` | CREATE | C++17 multi-arch image |
| `containers/ne-control-plane/Dockerfile` | CREATE | Python 3.11 FastAPI image |
| `containers/ne-external/Dockerfile` | CREATE | Python 3.11 FastAPI image |
| `containers/ne-security/Dockerfile` | CREATE | Python 3.11 sentinel placeholder |
| `containers/ne-bus/Dockerfile` | CREATE | EMQX official base + config |
| `containers/ne-bus/emqx.conf` | CREATE | Minimal EMQX config (listener + ACL placeholder) |
| `docker-compose.yaml` | CREATE | Local orchestration |
| `infra/terraform/README.md` | CREATE | Placeholder for Phase 3 |
| `scripts/bootstrap_dev.sh` | CREATE | One-shot dev environment setup |
| `scripts/verify_build.sh` | CREATE | `make build` verification used by CI + locally |
| `services/ne-control-plane/pyproject.toml` | CREATE | Python service pkg metadata |
| `services/ne-control-plane/ne_control_plane/__init__.py` | CREATE | Package init |
| `services/ne-control-plane/ne_control_plane/app.py` | CREATE | FastAPI hello-world with /healthz |
| `services/ne-control-plane/tests/test_smoke.py` | CREATE | Smoke test |
| `services/ne-external/pyproject.toml` | CREATE | (same as above) |
| `services/ne-external/ne_external/__init__.py` | CREATE | |
| `services/ne-external/ne_external/app.py` | CREATE | |
| `services/ne-external/tests/test_smoke.py` | CREATE | |
| `services/ne-security/pyproject.toml` | CREATE | |
| `services/ne-security/ne_security/__init__.py` | CREATE | |
| `services/ne-security/ne_security/sentinel.py` | CREATE | Placeholder daemon — just logs heartbeat |
| `services/ne-security/tests/test_smoke.py` | CREATE | |
| `src/ne-data-plane/CMakeLists.txt` | CREATE | C++ subproject build |
| `src/ne-data-plane/include/neuroedge/version.hpp` | CREATE | Version header |
| `src/ne-data-plane/main.cpp` | CREATE | "hello world" entry — exits 0, prints version |
| `src/ne-data-plane/tests/test_version.cpp` | CREATE | Catch2 version test |

## NOT Building

- No actual sensor code (`ISensor` ABC) — that's Phase 1.
- No actual inference backend (`IInferenceBackend` ABC) — that's Phase 1.
- No MQTT publishing yet — EMQX just runs; no clients connect.
- No mTLS between containers — Phase 2.
- No actual Terraform resources — placeholder README only; Phase 3.
- No model artifacts in volume — Phase 1.
- No real Jetson / Qualcomm / RPi support — stub Conan profiles only; concrete in Phases 4/5/7.
- No SBOM / cosign / image signing yet — Phase 6.
- No release tagging / semver beyond `:dev` — Phase 5.
- No documentation expansion (README is minimal pointer to PRD).

---

## Step-by-Step Tasks

### Task 0 — Prereq checks (Sanjeev runs once locally)
- **ACTION:** Verify host has required tooling.
- **IMPLEMENT:**
  ```bash
  cd "/c/Sanjeev_E/NeuroEdge Device"
  command -v git && git --version           # ≥ 2.40
  command -v docker && docker --version     # ≥ 24
  docker buildx version                     # buildx present
  command -v python3 && python3 --version   # 3.11+
  command -v cmake && cmake --version       # ≥ 3.22
  command -v conan && conan --version       # ≥ 2.0   (install if missing: pipx install conan)
  command -v pre-commit && pre-commit --V   # install if missing: pipx install pre-commit
  command -v aws && aws --version           # AWS CLI v2
  ```
- **GOTCHA:** Windows: this entire plan assumes Git Bash or WSL2. `docker buildx` may need `docker desktop` settings → Features in development → enable "Use containerd for pulling and storing images" for full multi-arch support. On WSL2 + Docker Desktop the integration is automatic. **Verify before Task 5.**
- **VALIDATE:** All commands return versions; nothing missing. If any tool absent, install before proceeding.

### Task 1 — Initialize git repo
- **ACTION:** Initialize git and configure remote.
- **IMPLEMENT:**
  ```bash
  cd "/c/Sanjeev_E/NeuroEdge Device"
  git init -b main
  git config user.name "Sanjeev Kumar"
  git config user.email "sanjeev.kumar@cognizant.com"

  # AFTER Sanjeev creates the GitHub remote cognizant/neuroedge-device:
  git remote add origin https://github.com/cognizant/neuroedge-device.git
  ```
- **GOTCHA:** Do NOT push yet. We push at the end after first green build.
- **VALIDATE:** `git status` runs; `git remote -v` shows origin (once remote exists).

### Task 2 — Create `.gitignore`
- **ACTION:** Block build artifacts, Python caches, Conan cache, secrets.
- **IMPLEMENT:** Write `.gitignore` with:
  ```
  # OS
  .DS_Store
  Thumbs.db

  # Editors / IDEs
  .vscode/
  .idea/
  *.swp

  # C++ build
  build/
  cmake-build-*/
  CMakeUserPresets.json
  conan_install/
  CMakeCache.txt
  CMakeFiles/

  # Python
  __pycache__/
  *.py[cod]
  *.egg-info/
  .pytest_cache/
  .ruff_cache/
  .mypy_cache/
  .venv/
  venv/
  dist/
  build/

  # Secrets / local config
  .env
  .env.*
  !.env.example
  *.pem
  *.key
  *.crt

  # Docker
  .docker/

  # AWS local
  .aws-credentials

  # Claude / agentic local state (keep settings.json shared; settings.local.json local-only)
  .claude/settings.local.json
  .claude/state/
  ```
- **MIRROR:** NAMING_CONVENTION
- **GOTCHA:** `.claude/settings.local.json` blocked because it holds API keys per CLAUDE.md.
- **VALIDATE:** `git status` does NOT show `build/`, `__pycache__/`, or `.claude/settings.local.json`.

### Task 3 — Create `README.md`
- **ACTION:** Minimal README pointing to PRD + design doc.
- **IMPLEMENT:**
  ```markdown
  # NeuroEdge Device

  On-device runtime for the NeuroEdge cloud-agnostic Edge AI MLOps platform.
  Sibling to [NeuroEdge Web](../NeuroEdge%20Web).

  ## Status: Phase 0 — Bootstrap

  See:
  - [Product Requirements (PRD)](docs/PRD.md)
  - [System Design Approach](docs/reference/device_system_design_approach.md)
  - [Phase 0 plan](docs/plans/phase-0-bootstrap.plan.md)

  ## Quick start (after Phase 0)

  ```bash
  ./scripts/bootstrap_dev.sh    # one-time setup
  make build                    # builds all 5 containers locally
  make test                     # runs all tests
  docker compose up             # starts the 5-container stack
  ```

  ## Container layout

  | Container | Language | Role |
  |---|---|---|
  | `ne-data-plane` | C++17 | Sensors + inference + post-proc (hot path) |
  | `ne-control-plane` | Python 3.11 | Command, config, metadata, rules, scheduler |
  | `ne-external` | Python 3.11 | Local UI, OTA agent, cloud agent, API caller |
  | `ne-security` | Python 3.11 + off-the-shelf | Wazuh agent, audit shipper, hardening daemon |
  | `ne-bus` | EMQX | MQTT broker (inter-container + device↔cloud) |

  ## License

  Internal Cognizant project — license TBD.
  ```
- **VALIDATE:** Renders correctly on GitHub once pushed.

### Task 4 — Top-level `Makefile`
- **ACTION:** Single entry point for build, lint, test, format, clean.
- **MIRROR:** MAKE_TARGETS pattern from NeuroEdge Web.
- **IMPLEMENT:**
  ```makefile
  # NeuroEdge Device — top-level Makefile

  SHELL := /usr/bin/env bash
  .DEFAULT_GOAL := help
  .PHONY: help bootstrap build build-cpp build-py build-images test test-cpp test-py lint format clean ci-local

  IMAGE_PREFIX ?= neuroedge-device
  TAG          ?= dev
  PLATFORMS    ?= linux/amd64,linux/arm64
  CONAN_PROFILE ?= x86-ubuntu2204

  help: ## Show this help
  	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk -F ':.*?## ' '{printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

  bootstrap: ## Run one-time dev environment setup
  	bash scripts/bootstrap_dev.sh

  build: build-cpp build-py build-images ## Build everything

  build-cpp: ## Build C++ ne-data-plane
  	conan install . --profile=conan_profiles/$(CONAN_PROFILE) --output-folder=build --build=missing
  	cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE=build/conan_toolchain.cmake -DCMAKE_BUILD_TYPE=Release
  	cmake --build build -j

  build-py: ## Install Python services in editable mode for dev
  	pip install -e ./services/ne-control-plane
  	pip install -e ./services/ne-external
  	pip install -e ./services/ne-security

  build-images: ## Build 5 container images locally (single-arch, host)
  	docker build -t $(IMAGE_PREFIX)-data-plane:$(TAG)    -f containers/ne-data-plane/Dockerfile    .
  	docker build -t $(IMAGE_PREFIX)-control-plane:$(TAG) -f containers/ne-control-plane/Dockerfile .
  	docker build -t $(IMAGE_PREFIX)-external:$(TAG)      -f containers/ne-external/Dockerfile      .
  	docker build -t $(IMAGE_PREFIX)-security:$(TAG)      -f containers/ne-security/Dockerfile      .
  	docker build -t $(IMAGE_PREFIX)-bus:$(TAG)           -f containers/ne-bus/Dockerfile           .

  build-images-multiarch: ## Build multi-arch images (CI use)
  	docker buildx create --use --name nedevice 2>/dev/null || true
  	for c in ne-data-plane ne-control-plane ne-external ne-security ne-bus; do \
  	  docker buildx build --platform=$(PLATFORMS) -t $(IMAGE_PREFIX)-$$c:$(TAG) -f containers/$$c/Dockerfile --push .; \
  	done

  test: test-cpp test-py ## Run all tests

  test-cpp: ## Run C++ tests
  	cd build && ctest --output-on-failure

  test-py: ## Run Python tests
  	pytest services/ne-control-plane/tests -q
  	pytest services/ne-external/tests -q
  	pytest services/ne-security/tests -q

  lint: ## Lint everything
  	pre-commit run --all-files

  format: ## Format everything
  	pre-commit run --all-files clang-format ruff-format prettier || true

  clean: ## Remove build artifacts
  	rm -rf build/ conan_install/
  	find . -type d -name __pycache__ -exec rm -rf {} +
  	find . -type d -name .pytest_cache -exec rm -rf {} +

  ci-local: bootstrap build test lint ## Mimic CI locally
  	@echo "CI-local passed"
  ```
- **GOTCHA:** Windows + Git Bash: `find` may behave oddly; `clean` works in Git Bash but not in cmd.exe. Document Git Bash as required.
- **VALIDATE:** `make help` lists all targets with descriptions.

### Task 5 — Create `scripts/bootstrap_dev.sh`
- **ACTION:** One-shot dev environment setup.
- **IMPLEMENT:**
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  echo "==> NeuroEdge Device bootstrap"

  # 1. Conan profile detect if not already done
  if [ ! -f "$HOME/.conan2/profiles/default" ]; then
    conan profile detect --force
  fi

  # 2. Install pre-commit hooks
  pre-commit install

  # 3. Verify Docker buildx
  docker buildx ls | grep -q nedevice || docker buildx create --name nedevice --use

  # 4. Register QEMU for multi-arch (no-op if already done)
  docker run --privileged --rm tonistiigi/binfmt --install all

  # 5. Verify AWS CLI present (warn only — IAM may not be ready yet)
  if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo "WARN: AWS CLI not authenticated. ECR push will fail until CloudBoost IAM ready."
  fi

  echo "==> Bootstrap complete"
  ```
- **GOTCHA:** `chmod +x scripts/bootstrap_dev.sh` after creating; on Windows this is recorded in the index via `git update-index --chmod=+x`.
- **VALIDATE:** Running it on a fresh machine completes without prompts beyond conan profile detection.

### Task 6 — `.pre-commit-config.yaml`
- **ACTION:** Wire pre-commit framework with existing `scripts/hooks/*.js` Node hooks + standard formatters.
- **IMPLEMENT:**
  ```yaml
  # .pre-commit-config.yaml
  repos:
    - repo: https://github.com/pre-commit/pre-commit-hooks
      rev: v4.6.0
      hooks:
        - id: trailing-whitespace
        - id: end-of-file-fixer
        - id: check-yaml
        - id: check-added-large-files
          args: ["--maxkb=2048"]
        - id: detect-private-key

    - repo: https://github.com/pre-commit/mirrors-clang-format
      rev: v18.1.8
      hooks:
        - id: clang-format
          types_or: [c, c++, cuda]

    - repo: https://github.com/astral-sh/ruff-pre-commit
      rev: v0.5.0
      hooks:
        - id: ruff
          args: [--fix]
        - id: ruff-format

    - repo: https://github.com/pre-commit/mirrors-prettier
      rev: v3.1.0
      hooks:
        - id: prettier
          types_or: [yaml, json, markdown]

    # Wire the existing NeuroEdge agentic hooks
    - repo: local
      hooks:
        - id: neuroedge-pre-commit-quality
          name: NeuroEdge pre-commit quality (lint/secret/console.log)
          entry: node scripts/hooks/pre-commit-quality.js
          language: system
          stages: [commit]
  ```
- **MIRROR:** Existing scripts/hooks/ — wire them, don't recreate.
- **GOTCHA:** The Node hooks at `scripts/hooks/*.js` are wired via the harness PostToolUse / PreToolUse hooks per `.claude/settings.json`, NOT via pre-commit. But `pre-commit-quality.js` runs at git-commit time so we register it as a local pre-commit hook too — belt and suspenders.
- **VALIDATE:** `pre-commit run --all-files` runs all configured hooks; first run may modify files (auto-fix), then re-run is clean.

### Task 7 — Conan top-level + profiles
- **ACTION:** Create `conanfile.txt` + 5 profile files.
- **IMPLEMENT:**

  `conanfile.txt` (Phase 0 — minimal):
  ```ini
  [requires]
  catch2/3.5.4
  spdlog/1.14.1

  [generators]
  CMakeDeps
  CMakeToolchain

  [layout]
  cmake_layout
  ```

  `conan_profiles/x86-ubuntu2204`:
  ```ini
  [settings]
  arch=x86_64
  build_type=Release
  compiler=gcc
  compiler.cppstd=17
  compiler.libcxx=libstdc++11
  compiler.version=11
  os=Linux

  [conf]
  tools.cmake.cmaketoolchain:generator=Unix Makefiles
  ```

  `conan_profiles/jetson-l4t36` (stub — full impl in Phase 4):
  ```ini
  # STUB — Phase 4 will fill in concrete settings for L4T R36.x (Ubuntu 22.04, gcc 11, aarch64)
  # See: docs/PRD.md Phase 4
  [settings]
  arch=armv8
  build_type=Release
  compiler=gcc
  compiler.cppstd=17
  compiler.libcxx=libstdc++11
  compiler.version=11
  os=Linux
  ```

  `conan_profiles/aim01-qrb5165` (stub — Phase 5):
  ```ini
  # STUB — Phase 5 will fill in concrete settings for Qualcomm AIM-01 (QRB5165, Yocto-based, aarch64)
  [settings]
  arch=armv8
  build_type=Release
  compiler=gcc
  compiler.cppstd=17
  compiler.libcxx=libstdc++11
  compiler.version=11
  os=Linux
  ```

  `conan_profiles/iq6-qcs6490` (stub — Phase 8):
  ```ini
  # STUB — Phase 8 will fill in concrete settings for Qualcomm IQ-6 / QCS6490 industrial IoT
  [settings]
  arch=armv8
  build_type=Release
  compiler=gcc
  compiler.cppstd=17
  compiler.libcxx=libstdc++11
  compiler.version=11
  os=Linux
  ```

  `conan_profiles/rpi5-bookworm` (stub — Phase 7):
  ```ini
  # STUB — Phase 7 will fill in concrete settings for Raspberry Pi 5 (Debian 12 Bookworm, aarch64)
  [settings]
  arch=armv8
  build_type=Release
  compiler=gcc
  compiler.cppstd=17
  compiler.libcxx=libstdc++11
  compiler.version=12
  os=Linux
  ```
- **GOTCHA:** Conan 2 changed profile format from Conan 1 — must use `[settings]` not `[settings_target]` and explicit `compiler.cppstd=17`.
- **VALIDATE:** `conan install . --profile=conan_profiles/x86-ubuntu2204 --output-folder=build --build=missing` succeeds.

### Task 8 — Top-level `CMakeLists.txt`
- **ACTION:** Define project and add `ne-data-plane` subdirectory.
- **IMPLEMENT:**
  ```cmake
  cmake_minimum_required(VERSION 3.22)
  project(neuroedge_device
    VERSION 0.1.0
    DESCRIPTION "NeuroEdge on-device runtime"
    LANGUAGES CXX
  )

  set(CMAKE_CXX_STANDARD 17)
  set(CMAKE_CXX_STANDARD_REQUIRED ON)
  set(CMAKE_CXX_EXTENSIONS OFF)

  if(MSVC)
    add_compile_options(/W4 /permissive-)
  else()
    add_compile_options(-Wall -Wextra -Wpedantic -Werror)
  endif()

  find_package(Catch2 3 REQUIRED)
  find_package(spdlog REQUIRED)

  enable_testing()

  add_subdirectory(src/ne-data-plane)
  ```
- **GOTCHA:** `-Werror` will catch every warning — fine for clean Phase 0 hello-world; revisit if vendor SDKs emit warnings in Phase 4.
- **VALIDATE:** `cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE=build/conan_toolchain.cmake` configures with no errors.

### Task 9 — `src/ne-data-plane/CMakeLists.txt`
- **ACTION:** Sub-CMake for ne-data-plane binary + test.
- **IMPLEMENT:**
  ```cmake
  set(NE_DP_VERSION "${PROJECT_VERSION}")
  configure_file(include/neuroedge/version.hpp.in
                 ${CMAKE_CURRENT_BINARY_DIR}/include/neuroedge/version.hpp @ONLY)

  add_executable(ne-data-plane main.cpp)
  target_include_directories(ne-data-plane
    PRIVATE include ${CMAKE_CURRENT_BINARY_DIR}/include
  )
  target_link_libraries(ne-data-plane PRIVATE spdlog::spdlog)

  # Tests
  add_executable(test_version tests/test_version.cpp)
  target_include_directories(test_version
    PRIVATE include ${CMAKE_CURRENT_BINARY_DIR}/include
  )
  target_link_libraries(test_version PRIVATE Catch2::Catch2WithMain)
  add_test(NAME test_version COMMAND test_version)
  ```
- **GOTCHA:** `version.hpp.in` template approach so CMake stamps the version at configure-time.
- **VALIDATE:** `cmake --build build -j` produces `build/src/ne-data-plane/ne-data-plane` binary and `test_version` binary.

### Task 10 — `src/ne-data-plane/include/neuroedge/version.hpp.in` + `main.cpp` + test
- **MIRROR:** NAMING_CONVENTION (C++)
- **IMPLEMENT:**

  `src/ne-data-plane/include/neuroedge/version.hpp.in`:
  ```cpp
  #pragma once

  namespace neuroedge {

  constexpr const char* NEUROEDGE_VERSION = "@NE_DP_VERSION@";

  }  // namespace neuroedge
  ```

  `src/ne-data-plane/main.cpp`:
  ```cpp
  #include "neuroedge/version.hpp"
  #include <spdlog/spdlog.h>
  #include <iostream>

  int main() {
    spdlog::info("ne-data-plane starting, version {}", neuroedge::NEUROEDGE_VERSION);
    std::cout << "ne-data-plane v" << neuroedge::NEUROEDGE_VERSION << " ready\n";
    return 0;
  }
  ```

  `src/ne-data-plane/tests/test_version.cpp`:
  ```cpp
  #include "neuroedge/version.hpp"
  #include <catch2/catch_test_macros.hpp>
  #include <string>

  TEST_CASE("Version string is non-empty", "[version]") {
    REQUIRE(std::string(neuroedge::NEUROEDGE_VERSION).size() > 0);
  }
  ```
- **VALIDATE:** `ctest --output-on-failure` in `build/` shows test passing.

### Task 11 — Python service skeletons (3 services, same shape)
- **MIRROR:** NAMING_CONVENTION (Python services), TEST_STRUCTURE (Python)
- **IMPLEMENT:**

  `services/ne-control-plane/pyproject.toml`:
  ```toml
  [project]
  name = "ne-control-plane"
  version = "0.1.0"
  description = "NeuroEdge Device — Control Plane"
  authors = [{ name = "Sanjeev Kumar", email = "sanjeev.kumar@cognizant.com" }]
  requires-python = ">=3.11"
  dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "structlog>=24.1",
  ]

  [project.optional-dependencies]
  test = ["pytest>=8", "httpx>=0.27"]

  [build-system]
  requires = ["setuptools>=68"]
  build-backend = "setuptools.build_meta"

  [tool.ruff]
  line-length = 100
  target-version = "py311"
  ```

  `services/ne-control-plane/ne_control_plane/__init__.py`:
  ```python
  __version__ = "0.1.0"
  ```

  `services/ne-control-plane/ne_control_plane/app.py`:
  ```python
  import logging
  from fastapi import FastAPI

  log = logging.getLogger(__name__)
  app = FastAPI(title="ne-control-plane", version="0.1.0")

  @app.get("/healthz")
  def healthz():
      return {"status": "ok", "service": "ne-control-plane"}
  ```

  `services/ne-control-plane/tests/test_smoke.py`:
  ```python
  from fastapi.testclient import TestClient
  from ne_control_plane.app import app

  def test_healthz():
      client = TestClient(app)
      r = client.get("/healthz")
      assert r.status_code == 200
      assert r.json() == {"status": "ok", "service": "ne-control-plane"}
  ```

  **Repeat the same shape** for `services/ne-external/` (substituting `ne_external` and service name) and `services/ne-security/` (substituting `ne_security`; the entry point is `sentinel.py` with a placeholder daemon — not FastAPI; smoke test just imports the module).

  `services/ne-security/ne_security/sentinel.py`:
  ```python
  import logging
  import time

  log = logging.getLogger(__name__)

  def main():
      log.info("ne-security sentinel starting")
      while True:
          log.info("heartbeat")
          time.sleep(60)

  if __name__ == "__main__":
      logging.basicConfig(level=logging.INFO)
      main()
  ```

- **VALIDATE:** `pip install -e ./services/ne-control-plane` succeeds; `pytest services/ne-control-plane/tests -q` shows 1 passing test.

### Task 12 — Dockerfiles for all 5 containers
- **ACTION:** Multi-stage Dockerfiles, multi-arch ready (no hardcoded amd64).
- **MIRROR:** Web's docker patterns where shared.
- **IMPLEMENT:**

  `containers/ne-data-plane/Dockerfile`:
  ```dockerfile
  # syntax=docker/dockerfile:1.7
  ARG BUILDER_IMAGE=ubuntu:22.04
  ARG RUNTIME_IMAGE=ubuntu:22.04

  FROM ${BUILDER_IMAGE} AS builder
  ENV DEBIAN_FRONTEND=noninteractive
  RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential cmake python3 python3-pip git ca-certificates pkg-config \
      && rm -rf /var/lib/apt/lists/*
  RUN pip install --no-cache-dir conan==2.7.1 && conan profile detect

  WORKDIR /work
  COPY conanfile.txt CMakeLists.txt ./
  COPY conan_profiles/ ./conan_profiles/
  COPY src/ ./src/
  RUN conan install . --profile=conan_profiles/x86-ubuntu2204 --output-folder=build --build=missing
  RUN cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE=build/conan_toolchain.cmake -DCMAKE_BUILD_TYPE=Release
  RUN cmake --build build -j

  FROM ${RUNTIME_IMAGE} AS runtime
  ENV DEBIAN_FRONTEND=noninteractive
  RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates libstdc++6 \
      && rm -rf /var/lib/apt/lists/*
  COPY --from=builder /work/build/src/ne-data-plane/ne-data-plane /usr/local/bin/ne-data-plane
  USER 10001:10001
  ENTRYPOINT ["/usr/local/bin/ne-data-plane"]
  ```

  `containers/ne-control-plane/Dockerfile`:
  ```dockerfile
  # syntax=docker/dockerfile:1.7
  FROM python:3.11-slim AS base
  ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
  RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl \
      && rm -rf /var/lib/apt/lists/*

  WORKDIR /app
  COPY services/ne-control-plane/pyproject.toml ./
  COPY services/ne-control-plane/ne_control_plane/ ./ne_control_plane/
  RUN pip install --no-cache-dir -e .

  EXPOSE 8000
  USER 10001:10001
  ENTRYPOINT ["uvicorn", "ne_control_plane.app:app", "--host", "0.0.0.0", "--port", "8000"]
  ```

  `containers/ne-external/Dockerfile` — same shape as ne-control-plane but `ne_external` and port `8443` (placeholder, no TLS yet).

  `containers/ne-security/Dockerfile`:
  ```dockerfile
  # syntax=docker/dockerfile:1.7
  FROM python:3.11-slim AS base
  ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
  WORKDIR /app
  COPY services/ne-security/pyproject.toml ./
  COPY services/ne-security/ne_security/ ./ne_security/
  RUN pip install --no-cache-dir -e .
  USER 10001:10001
  ENTRYPOINT ["python", "-m", "ne_security.sentinel"]
  ```

  `containers/ne-bus/Dockerfile`:
  ```dockerfile
  # syntax=docker/dockerfile:1.7
  FROM emqx/emqx:5.7.2 AS base
  COPY containers/ne-bus/emqx.conf /opt/emqx/etc/emqx.conf
  EXPOSE 1883 8083 8084 18083
  # Default ENTRYPOINT inherited from base image
  ```

  `containers/ne-bus/emqx.conf`:
  ```
  # Minimal EMQX config for Phase 0
  # mTLS + ACL added in Phase 2
  listeners.tcp.default {
    bind = "0.0.0.0:1883"
    max_connections = 1024
  }
  dashboard {
    listeners.http {
      bind = 18083
    }
  }
  ```
- **GOTCHA:** All containers run as UID 10001 (non-root). EMQX official image already does this. Verify mounts will be writable; if not, drop UID requirement on `ne-data-plane` until volume design lands in Phase 1.
- **VALIDATE:** `make build-images` produces 5 images locally. `docker image ls | grep neuroedge-device` shows them.

### Task 13 — `docker-compose.yaml`
- **ACTION:** Local orchestration of all 5 containers; Phase 0 has them running but not yet talking.
- **IMPLEMENT:**
  ```yaml
  # docker-compose.yaml — Phase 0 hello-world stack
  # No mTLS yet, no actual inter-container traffic, no volumes mounted.

  services:
    ne-bus:
      image: neuroedge-device-bus:dev
      ports:
        - "1883:1883"
        - "18083:18083"
      networks: [neuroedge]

    ne-data-plane:
      image: neuroedge-device-data-plane:dev
      depends_on: [ne-bus]
      networks: [neuroedge]
      # Phase 0: container starts, prints version, exits. Set restart policy off.
      restart: "no"

    ne-control-plane:
      image: neuroedge-device-control-plane:dev
      depends_on: [ne-bus]
      ports:
        - "8000:8000"
      networks: [neuroedge]

    ne-external:
      image: neuroedge-device-external:dev
      depends_on: [ne-control-plane]
      ports:
        - "8443:8443"
      networks: [neuroedge]

    ne-security:
      image: neuroedge-device-security:dev
      depends_on: [ne-bus]
      networks: [neuroedge]
      restart: unless-stopped

  networks:
    neuroedge:
      driver: bridge
  ```
- **GOTCHA:** `ne-data-plane` in Phase 0 just prints "ready" and exits 0 — this is expected. Phase 1 turns it into a long-running process.
- **VALIDATE:** `docker compose up` shows ne-bus dashboard at `http://localhost:18083` (admin/public), `ne-control-plane` at `http://localhost:8000/healthz` returns `{"status":"ok"}`.

### Task 14 — `infra/terraform/README.md` (placeholder)
- **ACTION:** Stub for Phase 3 — just signals intent.
- **IMPLEMENT:**
  ```markdown
  # Terraform — NeuroEdge Device infrastructure

  **Status:** Placeholder. Phase 3 of the PRD fills this directory.

  Will contain:
  - `ecr.tf` — ECR repositories for the 5 image streams
  - `s3.tf` — buckets for artifacts, results, qemu images
  - `iot.tf` — AWS IoT Core thing types + topic policies
  - `iam.tf` — least-privilege role `NeuroEdgeDeviceProvisioning`
  - `cloudwatch.tf` — log group + alarms

  AWS region: us-west-2. Account: 975050071275 (Cognizant CloudBoost).
  IAM may need to be provisioned via CloudBoost portal first time (cloudboost_account_operator role lacks `iam:CreateRole`).

  See [PRD §10](../../docs/PRD.md) and [design doc §10](../../docs/reference/device_system_design_approach.md).
  ```
- **VALIDATE:** File exists; no Terraform code yet — intentional.

### Task 15 — GitHub Actions CI workflow
- **ACTION:** `.github/workflows/build.yml` builds and tests on PR, builds + pushes multi-arch to ECR on push to main.
- **IMPLEMENT:**
  ```yaml
  name: build

  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]

  permissions:
    contents: read
    id-token: write   # for AWS OIDC

  env:
    AWS_REGION: us-west-2
    AWS_ACCOUNT: "975050071275"
    IMAGE_PREFIX: neuroedge-device

  jobs:
    lint:
      runs-on: ubuntu-22.04
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-python@v5
          with:
            python-version: "3.11"
        - run: pip install pre-commit
        - run: pre-commit run --all-files

    test-cpp:
      runs-on: ubuntu-22.04
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-python@v5
          with:
            python-version: "3.11"
        - run: |
            sudo apt-get update
            sudo apt-get install -y cmake build-essential
            pip install conan==2.7.1
            conan profile detect --force
        - run: |
            conan install . --profile=conan_profiles/x86-ubuntu2204 --output-folder=build --build=missing
            cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE=build/conan_toolchain.cmake -DCMAKE_BUILD_TYPE=Release
            cmake --build build -j
            cd build && ctest --output-on-failure

    test-py:
      runs-on: ubuntu-22.04
      strategy:
        matrix:
          service: [ne-control-plane, ne-external, ne-security]
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-python@v5
          with:
            python-version: "3.11"
        - run: |
            pip install -e ./services/${{ matrix.service }}
            pip install pytest httpx
            pytest services/${{ matrix.service }}/tests -q

    build-images:
      runs-on: ubuntu-22.04
      needs: [lint, test-cpp, test-py]
      strategy:
        matrix:
          container: [ne-data-plane, ne-control-plane, ne-external, ne-security, ne-bus]
      steps:
        - uses: actions/checkout@v4
        - name: Set up QEMU
          uses: docker/setup-qemu-action@v3
        - name: Set up Docker Buildx
          uses: docker/setup-buildx-action@v3
        # OIDC → ECR (only on push to main; PRs skip the AWS step)
        - name: Configure AWS credentials
          if: github.event_name == 'push'
          uses: aws-actions/configure-aws-credentials@v4
          with:
            role-to-assume: arn:aws:iam::${{ env.AWS_ACCOUNT }}:role/NeuroEdgeDeviceProvisioning
            aws-region: ${{ env.AWS_REGION }}
        - name: Login to ECR
          if: github.event_name == 'push'
          uses: aws-actions/amazon-ecr-login@v2
        - name: Build (and push on main) ${{ matrix.container }}
          uses: docker/build-push-action@v5
          with:
            context: .
            file: containers/${{ matrix.container }}/Dockerfile
            platforms: linux/amd64,linux/arm64
            push: ${{ github.event_name == 'push' }}
            tags: |
              ${{ env.AWS_ACCOUNT }}.dkr.ecr.${{ env.AWS_REGION }}.amazonaws.com/${{ env.IMAGE_PREFIX }}-${{ matrix.container }}:dev
            cache-from: type=gha
            cache-to: type=gha,mode=max
  ```
- **GOTCHA:** ECR push requires (a) the IAM role + identity provider provisioned (CloudBoost portal step, see PRD Open Question 1), (b) the ECR repositories already created — for Phase 0 acceptance the IAM/ECR are NOT yet provisioned, so the `build-images` job builds-without-push (PR path) is the gate. On main push the AWS steps will fail loudly until Phase 3 wires the infra — that's expected and documented.
- **VALIDATE:** Open a draft PR with these changes; `lint` + `test-cpp` + `test-py` + `build-images` (build-only path) all green.

### Task 16 — Wire the existing scripts/hooks/ into .claude/settings.json (if not already)
- **ACTION:** Verify the existing `.claude/settings.json` references the hooks. If not, add them.
- **IMPLEMENT:** Read `.claude/settings.json` and confirm there are entries calling `node scripts/hooks/pre-commit-quality.js`, `node scripts/hooks/post-edit-py-lint.js`, etc. If absent, add them under PreToolUse / PostToolUse sections. Do not duplicate hooks already provided by the agentic-assets plugin.
- **GOTCHA:** Per CLAUDE.md and the hooks table, most hooks are delegated via `${CLAUDE_PLUGIN_ROOT}` from the ECC plugin. The local `scripts/hooks/*.js` are project-specific fallbacks. Don't double-register.
- **VALIDATE:** `cat .claude/settings.json` shows wired hooks; making a test edit triggers `post-edit-py-lint.js` when applicable.

### Task 17 — `scripts/verify_build.sh`
- **ACTION:** Local + CI verification entry point.
- **IMPLEMENT:**
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  echo "==> verify_build: cpp"
  conan install . --profile=conan_profiles/x86-ubuntu2204 --output-folder=build --build=missing
  cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE=build/conan_toolchain.cmake -DCMAKE_BUILD_TYPE=Release
  cmake --build build -j
  (cd build && ctest --output-on-failure)

  echo "==> verify_build: python"
  for svc in ne-control-plane ne-external ne-security; do
    pip install -e ./services/$svc >/dev/null
    pytest services/$svc/tests -q
  done

  echo "==> verify_build: docker images"
  for c in ne-data-plane ne-control-plane ne-external ne-security ne-bus; do
    docker build -t neuroedge-device-$c:dev -f containers/$c/Dockerfile . >/dev/null
    docker image inspect neuroedge-device-$c:dev >/dev/null
    echo "  ✓ neuroedge-device-$c:dev"
  done

  echo "==> verify_build: PASS"
  ```
- **VALIDATE:** Running the script on a clean check-out produces "PASS" at the end.

### Task 18 — First commit + push
- **ACTION:** Stage everything, run quality gate, commit, push to origin/main.
- **IMPLEMENT:**
  ```bash
  cd "/c/Sanjeev_E/NeuroEdge Device"
  # Run /quality-gate via Claude or:
  make lint
  pre-commit run --all-files

  git add -A
  git status                       # sanity check before commit

  git commit -m "Phase 0: bootstrap neuroedge-device repo

  - CMake + Conan 2 scaffold for ne-data-plane (C++17)
  - Python 3.11 service skeletons: ne-control-plane, ne-external, ne-security
  - Dockerfiles for all 4 functional + 1 broker container
  - Multi-arch CI via GitHub Actions (buildx + QEMU)
  - Pre-commit hooks: clang-format, ruff, prettier, pre-commit-hooks
  - Conan profiles scaffolded (x86 concrete; Jetson/Qualcomm/RPi stubs)
  - Reference: docs/PRD.md (Phase 0), docs/reference/device_system_design_approach.md"

  git push -u origin main
  ```
- **GOTCHA:** First CI run will produce failures on the ECR push step if IAM not yet provisioned — expected. Document in commit message that this is known and Phase 3 fixes it. Build-only path remains green.
- **VALIDATE:** Push succeeds; GitHub Actions runs; lint + test-cpp + test-py + build-images (build-only) jobs all green.

### Task 19 — Trigger `code-reviewer` agent on bootstrap
- **ACTION:** Per CLAUDE.md mandatory dispatch rule "You completed implementing any feature or module → Use code-reviewer agent."
- **IMPLEMENT:** After Task 18 lands, invoke the `code-reviewer` agent on the diff. The agent will check the C++ files via `cpp-reviewer` and Python via `python-reviewer` as well.
- **VALIDATE:** Agent reports no critical issues; address any flagged before declaring Phase 0 done.

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| `test_version` (C++) | — | `NEUROEDGE_VERSION` non-empty | No |
| `test_smoke` (ne-control-plane) | GET `/healthz` | 200 + `{"status":"ok"}` | No |
| `test_smoke` (ne-external) | GET `/healthz` | 200 + `{"status":"ok"}` | No |
| `test_smoke` (ne-security) | import `ne_security.sentinel` | no import error | No |

### Edge Cases Checklist (Phase 0 is hello-world; minimal edges)
- [x] Build on clean machine via `scripts/bootstrap_dev.sh` then `make build` — must succeed.
- [x] Pre-commit auto-fix doesn't break CI (re-run after fix is clean).
- [x] Multi-arch build succeeds for both `linux/amd64` and `linux/arm64`.
- [x] CI runs on PR (no ECR push) and on main push (ECR push will fail until Phase 3 — that's documented).

---

## Validation Commands

### Static Analysis
```bash
pre-commit run --all-files
```
**EXPECT:** Zero diff after initial auto-fix pass; second run is a no-op.

### Unit Tests
```bash
make test
```
**EXPECT:** All C++ + Python tests pass.

### Full Build (local)
```bash
make build
docker image ls | grep neuroedge-device
```
**EXPECT:** 5 images present.

### CI Validation
```bash
git push origin main
# wait for CI; check status
gh run list --limit 1
gh run view --log
```
**EXPECT:** `lint`, `test-cpp`, `test-py` jobs green; `build-images` builds locally (no push) for PR path. For main push, build green; push step pending Phase 3 IAM setup.

### Local stack smoke
```bash
docker compose up
# in another shell:
curl http://localhost:8000/healthz       # → {"status":"ok","service":"ne-control-plane"}
curl http://localhost:8443/healthz       # → {"status":"ok","service":"ne-external"}
# EMQX dashboard: http://localhost:18083 (admin/public)
```
**EXPECT:** Both healthz responses return ok; EMQX dashboard reachable.

### Manual Validation
- [ ] `git log --oneline` shows single Phase 0 commit
- [ ] `git status` clean
- [ ] `make help` lists all targets
- [ ] `scripts/bootstrap_dev.sh` runs without prompts
- [ ] CI green on main
- [ ] PRD updated: Phase 0 status → `in-progress` (or → `complete` after acceptance)

---

## Acceptance Criteria
- [ ] Repo is a git repo, pushed to `cognizant/neuroedge-device` main branch
- [ ] `make build` produces 5 images locally (`neuroedge-device-{data-plane,control-plane,external,security,bus}:dev`)
- [ ] `make test` passes (4 tests minimum: 1 C++ + 3 Python smoke)
- [ ] `pre-commit run --all-files` clean
- [ ] CI green on the first push (build-only path; ECR push pending Phase 3)
- [ ] `docker compose up` starts the 5-container stack and healthz endpoints respond
- [ ] `code-reviewer` agent reports no critical issues

## Completion Checklist
- [ ] Code follows discovered patterns (Web side conventions where shared, new Device conventions documented)
- [ ] Error handling stubs in place (FastAPI HTTPException + Python logging)
- [ ] Logging follows codebase conventions (stdlib logging, structlog ready for Phase 2)
- [ ] Tests follow test patterns (pytest + Catch2 v3)
- [ ] No hardcoded values (versions in `pyproject.toml` + `version.hpp.in`)
- [ ] Documentation updated (README minimal; PRD Phase 0 status flipped)
- [ ] No unnecessary scope additions (no sensors, no inference backends, no MQTT clients yet)
- [ ] Self-contained — implementation can proceed end-to-end from this plan

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Conan 2 profile divergence between dev (Windows host) and CI (Linux) | Medium | Low | Pin `x86-ubuntu2204` profile in both; CI is canonical, dev profile mirrors |
| Multi-arch docker buildx fails on Sanjeev's Windows + Docker Desktop | Medium | Medium | `bootstrap_dev.sh` runs `tonistiigi/binfmt` registration; document Docker Desktop "Use containerd" toggle |
| Pre-commit auto-fix loops in CI (file modified by hook, re-runs forever) | Low | Low | All hooks are idempotent; verified before pushing |
| ECR push fails on main due to IAM not yet provisioned | High | Low | Expected. Documented in commit. Build-only path green. Phase 3 wires IAM. |
| `node scripts/hooks/*.js` not on PATH in dev shell | Low | Low | They invoke `node` which is on PATH; document Node 20+ requirement in README |
| CMake `-Werror` blocks vendor SDK warnings in Phase 4 | Low (future) | Medium | Wrap third-party headers with `SYSTEM` include flag when we add vendor deps |

## Notes

- **Why C++17 not C++20:** Older L4T BSPs (R35 and earlier) ship gcc 9 which has incomplete C++20. C++17 gives us `std::optional`, structured bindings, `if constexpr` — enough for the hot path. Reassess at Phase 8 when newer SoCs land.
- **Why Catch2 v3:** Header-only via Conan, no main() boilerplate, modern matchers. Alternative GoogleTest evaluated and rejected (extra setup, Bazel-leaning ergonomics).
- **Why spdlog:** Already on every list of "C++ libraries that just work"; supports structured fields without a JSON formatter dependency.
- **Why FastAPI over Flask for Python services:** Consistent with NeuroEdge Web; async-ready for Phase 2 MQTT integration.
- **Why no uv (yet):** Web side currently uses pip + setuptools; keep parity for v0.1. Reconsider when Web migrates.
- **Why one Makefile not per-service Makefiles:** Solo engineer + small surface. Re-evaluate at Phase 5 when 3 more languages might enter.
- **Why `--platform=linux/amd64,linux/arm64` only (no arm/v7):** No 32-bit targets in scope. RPi 5 is aarch64.
- **Status block expectation:** Every PR for Phase 0 work should announce delegated agents per CLAUDE.md (e.g., `[ NeuroEdge ]  cpp-reviewer` after C++ edits).

---

**Phase 0 confidence score:** 8/10 — high confidence on solo single-pass implementation. The two soft spots are (a) GitHub Actions OIDC → AWS IAM setup which is gated on CloudBoost portal, and (b) Windows + Docker Desktop multi-arch quirks. Both are documented and isolated to a single task each.

**Next step:** Run `/prp-implement docs/plans/phase-0-bootstrap.plan.md` to execute, OR proceed to generate the Phase 1 plan with `/prp-plan` (recommended — they can be drafted in parallel).
