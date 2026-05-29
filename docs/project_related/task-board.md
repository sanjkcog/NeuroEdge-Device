# NeuroEdge Device — Task Board

**Source:** [epics-and-user-stories.md](epics-and-user-stories.md)
**Generated:** 2026-05-29
**Status:** Active — update task checkboxes as work completes

---

## Progress Summary

| EPIC | Stories | Tasks | ⬜ Pending | 🔄 In Progress | ✅ Done | Est. Hours |
|------|---------|-------|-----------|----------------|---------|------------|
| [EP-01 — Bootstrap & CI](#ep-01) | 4 | 20 | 20 | 0 | 0 | 26h |
| [EP-02 — Data Plane Foundation](#ep-02) | 4 | 20 | 20 | 0 | 0 | 38h |
| [EP-03 — Control Plane, Bus & UI](#ep-03) | 4 | 24 | 24 | 0 | 0 | 36h |
| [EP-04 — Cloud Emulation E2E](#ep-04) | 4 | 18 | 18 | 0 | 0 | 28h |
| [EP-05 — Jetson + TensorRT](#ep-05) | 4 | 20 | 20 | 0 | 0 | 30h |
| [EP-06 — OTA & Multi-Platform](#ep-06) | 4 | 17 | 17 | 0 | 0 | 33h |
| [EP-07 — Security & Observability](#ep-07) | 6 | 26 | 26 | 0 | 0 | 38h |
| [EP-08 — RPi5 & AIM-01](#ep-08) | 3 | 14 | 14 | 0 | 0 | 22h |
| [EP-09 — OEM Readiness](#ep-09) | 4 | 14 | 14 | 0 | 0 | 29h |
| **Total** | **37** | **173** | **173** | **0** | **0** | **280h** |

---

## How to Use This Board

- Check off tasks with `[x]` as you complete them
- `- [~]` = In Progress; `- [x]` = Done; `- [ ]` = Pending
- Update Progress Summary totals after each sprint
- Run `/stories-to-tasks --update` after adding new stories

---

## EP-01 — Repo Bootstrap & CI Infrastructure {#ep-01}

> **EPIC total:** 26h across 4 stories / 20 tasks  
> **Blocked by:** OQ-1 — GitHub repo creation — Owner: Sanjeev

### US-01-01 — Repo & Build Scaffold

> **Story total:** 8h across 6 tasks

- [ ] **TS-01-01-01** `(1h, infra)` Create GitHub repo `sanjkcog/NeuroEdge-Device` and push initial commit with this docs folder — **Done:** repo visible at github.com/sanjkcog/NeuroEdge-Device with `main` branch *(requires OQ-1 resolved)*
- [ ] **TS-01-01-02** `(2h, config, CMake)` Write root `CMakeLists.txt` with `-std=c++17` target for `ne-data-plane` stub — **Done:** `cmake --preset x86` exits 0 with no warnings ⊢ TS-01-01-01
- [ ] **TS-01-01-03** `(1h, config, Conan)` Write `conanfile.txt` with core C++ deps: Boost, ZMQ, ONNX Runtime, spdlog, nlohmann-json — **Done:** `conan install . --build=missing` resolves without errors ⊢ TS-01-01-02
- [ ] **TS-01-01-04** `(2h, config, Conan)` Create Conan profiles in `conan_profiles/` for `x86_64-linux-gcc12`, `arm64-linux-gcc11`, `jetson-l4t-gcc9` — **Done:** `conan profile list` shows all three profiles
- [ ] **TS-01-01-05** `(1h, config, CMake)` Add `CMakePresets.json` with `x86` preset referencing `x86_64-linux-gcc12` — **Done:** `cmake --preset x86` produces passing stub build ⊢ TS-01-01-03
- [ ] **TS-01-01-06** `(1h, docs)` Write `README.md` with clone → conan → cmake → docker compose build-from-scratch instructions — **Done:** README covers all steps from zero to running stack `[manual]`

---

### US-01-02 — Multi-Container Docker Scaffold

> **Story total:** 7h across 5 tasks

- [ ] **TS-01-02-01** `(2h, config, Docker)` Create `containers/` with 5 stub `Dockerfile`s: ne-data-plane, ne-control-plane, ne-external, ne-security, ne-bus — **Done:** each `docker build -f containers/<name>/Dockerfile .` exits 0
- [ ] **TS-01-02-02** `(2h, config, Docker)` Write `docker-compose.yml` with all 5 containers, `neuroedge-net` internal network, stub `/healthz` HTTP 200 handlers — **Done:** `docker compose up` starts all 5 containers without errors
- [ ] **TS-01-02-03** `(1h, test, Docker)` Verify each container exposes `/healthz` returning HTTP 200 — **Done:** `curl -s http://localhost:<port>/healthz` returns 200 for all 5 containers ⊢ TS-01-02-02
- [ ] **TS-01-02-04** `(1h, config, Docker)` Declare named volumes `neuroedge-models`, `neuroedge-data`, `neuroedge-logs` in `docker-compose.yml` — **Done:** `docker volume ls` shows all 3 named volumes after `docker compose up`
- [ ] **TS-01-02-05** `(1h, validate)` Verify inter-container network connectivity — **Done:** `docker exec ne-control-plane ping -c 1 ne-bus` succeeds `[manual]`

---

### US-01-03 — CI Pipeline to ECR

> **Story total:** 6h across 5 tasks  
> **Blocked by:** OQ-1 — GitHub repo creation — Owner: Sanjeev

- [ ] **TS-01-03-01** `(1h, infra, AWS)` Create ECR repository `neuroedge/` in us-west-2 — **Done:** `aws ecr describe-repositories --region us-west-2` shows `neuroedge/` repo ⊢ TS-01-01-01
- [ ] **TS-01-03-02** `(2h, config, CI)` Write `.github/workflows/build.yml`: triggers on push to `main` + PRs; builds all 4 images — **Done:** workflow run exits 0 in GitHub Actions ⊢ TS-01-01-01
- [ ] **TS-01-03-03** `(1h, config, CI)` Add ECR push step with `:dev` tag; fail fast on compiler error or test failure — **Done:** images visible in ECR with `:dev` tag after push to `main` ⊢ TS-01-03-01
- [ ] **TS-01-03-04** `(1h, config, CI)` Add `grype` image scan step that fails workflow on any critical CVE — **Done:** CI step fails when test image with known CVE is scanned ⊢ TS-01-03-02
- [ ] **TS-01-03-05** `(1h, validate, CI)` Verify all 4 images build in < 10 min on `ubuntu-latest` — **Done:** GitHub Actions run shows < 10 min elapsed `[manual]`

---

### US-01-04 — Makefile Developer Interface

> **Story total:** 5h across 4 tasks

- [ ] **TS-01-04-01** `(2h, config, Makefile)` Write top-level `Makefile` with `build`, `up`, `down`, `evaluate`, `health-check`, `lint`, `help` targets — **Done:** `make help` prints all targets with one-line descriptions
- [ ] **TS-01-04-02** `(1h, validate)` Verify `make build` and `make up` / `make down` work end-to-end — **Done:** `make up` starts all 5 containers; `make down` stops them cleanly ⊢ TS-01-04-01
- [ ] **TS-01-04-03** `(1h, validate)` Verify `make lint` runs ruff on Python + clang-tidy on C++ without errors — **Done:** `make lint` exits 0 on clean codebase ⊢ TS-01-04-01
- [ ] **TS-01-04-04** `(1h, validate)` Verify `make health-check` invokes health check suite — **Done:** `make health-check` exits 0 and prints PASS/WARN/FAIL per check ⊢ TS-01-04-01

---

## EP-02 — Shared Contracts & Data Plane Foundation {#ep-02}

> **EPIC total:** 38h across 4 stories / 20 tasks

### US-02-01 — ModelArtifact C++ Contract Headers

> **Story total:** 8h across 5 tasks

- [ ] **TS-02-01-01** `(2h, code, Python)` Write `scripts/gen_contracts.py` reading `ModelArtifact` JSON Schema from `neuroedge-contracts` pip package — **Done:** `python scripts/gen_contracts.py --dry-run` exits 0
- [ ] **TS-02-01-02** `(2h, code, C++)` Generate `include/neuroedge/contracts/model_artifact.hpp` with typed C++ struct + nlohmann-json deserializer — **Done:** `g++ -std=c++17 -c include/neuroedge/contracts/model_artifact.hpp` exits 0 ⊢ TS-02-01-01
- [ ] **TS-02-01-03** `(1h, code, C++)` Generate C++ headers for `UseCase`, `CapabilityManifest`, `PipelineStatus` schemas — **Done:** all 4 contract headers compile with no errors ⊢ TS-02-01-02
- [ ] **TS-02-01-04** `(2h, test, C++)` Write round-trip unit test: serialize → deserialize → assert fields equal — **Done:** `ctest --preset unit -R contracts` exits 0 ⊢ TS-02-01-03
- [ ] **TS-02-01-05** `(1h, config, CI)` Add CI step: run `gen_contracts.py`; fail if generated output differs from committed headers — **Done:** CI step reports "no drift" on clean run; fails on manual header edit ⊢ TS-02-01-04

---

### US-02-02 — Sensor ABC & FileReplaySensor

> **Story total:** 12h across 6 tasks

- [ ] **TS-02-02-01** `(2h, code, ne-data-plane)` Define `ISensor` ABC in `include/neuroedge/sensors/i_sensor.hpp` with pure virtuals + `Frame` struct — **Done:** header compiles `-std=c++17` with no warnings
- [ ] **TS-02-02-02** `(4h, code, ne-data-plane)` Implement `FileReplaySensor` in `src/sensors/file_replay_sensor.cpp`: reads local FS path, loops, configurable FPS cap — **Done:** `ctest --preset unit -R file_replay` exits 0 ⊢ TS-02-02-01
- [ ] **TS-02-02-03** `(1h, code, ne-data-plane)` Add `SensorException` on missing file; verify process does NOT crash (FR-9a-5) — **Done:** unit test: missing file raises `SensorException`; calling thread catches it; process continues ⊢ TS-02-02-02
- [ ] **TS-02-02-04** `(2h, code, ne-data-plane)` Add S3 URI support to `FileReplaySensor` (signed URL resolution) — **Done:** unit test with mock S3 path resolves and reads frames correctly
- [ ] **TS-02-02-05** `(1h, config, ne-data-plane)` Add `RealSenseSensor` stub: includes librealsense2 header, returns empty frames, compiles cleanly — **Done:** `cmake --preset x86` builds stub without errors ⊢ TS-02-02-01
- [ ] **TS-02-02-06** `(2h, test, ne-data-plane)` Write unit tests: normal replay, EOF loop, missing-file exception, metadata fields — **Done:** `ctest --preset unit -R sensor` exits 0 with 4+ test cases ⊢ TS-02-02-03

---

### US-02-03 — Inference Backend ABC & OnnxRuntimeBackend

> **Story total:** 10h across 5 tasks

- [ ] **TS-02-03-01** `(2h, code, ne-data-plane)` Define `IInferenceBackend` ABC with `load`, `infer`, `unload`, `capabilities` (FR-9c-1) in `include/neuroedge/backends/i_inference_backend.hpp` — **Done:** header compiles `-std=c++17`
- [ ] **TS-02-03-02** `(4h, code, ne-data-plane)` Implement `OnnxRuntimeBackend`: loads `.onnx` from `ModelArtifact.weights_uri`; CPU EP; returns bounding boxes + confidence — **Done:** `ctest --preset unit -R onnx_backend` exits 0 ⊢ TS-02-03-01
- [ ] **TS-02-03-03** `(1h, code, ne-data-plane)` Implement `BackendFactory` selecting `OnnxRuntimeBackend` when `preferred_backend = "onnx"` (FR-9c-3) — **Done:** factory unit test returns `OnnxRuntimeBackend` for onnx preference ⊢ TS-02-03-02
- [ ] **TS-02-03-04** `(1h, test, ne-data-plane)` Write warmup timing test: backend warmup completes in < 30 s (FR-9c-6) — **Done:** `ctest --preset unit -R warmup` exits 0; warmup < 30 s logged ⊢ TS-02-03-02
- [ ] **TS-02-03-05** `(2h, test, ne-data-plane)` Write unit tests: load YOLO ONNX stub → infer dummy frame → assert result shape — **Done:** `ctest --preset unit -R inference` exits 0 ⊢ TS-02-03-02

---

### US-02-04 — ZeroMQ Inproc Frame Pipeline

> **Story total:** 8h across 4 tasks

- [ ] **TS-02-04-01** `(2h, code, ne-data-plane)` Implement ZMQ PUSH/PULL inproc pipeline in `src/pipeline/frame_pipeline.cpp`: sensor thread pushes `Frame` with `zmq_msg_init_data` zero-copy — **Done:** no heap allocation per frame in steady state (verified with AddressSanitizer)
- [ ] **TS-02-04-02** `(2h, code, ne-data-plane)` Implement back-pressure: drop oldest frame when inference slower than sensor; configurable drop policy — **Done:** unit test verifies drop count increments under artificial slowdown ⊢ TS-02-04-01
- [ ] **TS-02-04-03** `(2h, test, ne-data-plane)` Write latency measurement test: sensor→inference handoff p95 < 0.5 ms on x86 dev machine — **Done:** `ctest --preset unit -R pipeline_latency` exits 0; p95 < 0.5 ms logged ⊢ TS-02-04-01
- [ ] **TS-02-04-04** `(2h, test, ne-data-plane)` Write integration test: FileReplaySensor → ZMQ → OnnxRuntimeBackend → InferenceResult; asserts ≥ 1 result in 5 s — **Done:** `ctest --preset integration -R e2e_pipeline` exits 0 ⊢ TS-02-04-02

---

## EP-03 — Control Plane, Message Bus & Local UI {#ep-03}

> **EPIC total:** 36h across 4 stories / 24 tasks

### US-03-01 — EMQX Broker with mTLS

> **Story total:** 8h across 5 tasks

- [ ] **TS-03-01-01** `(1h, config, ne-bus)` Configure `containers/ne-bus/emqx.conf` for EMQX 5.x with TLS listener on port 8883 — **Done:** `docker exec ne-bus emqx ctl status` shows broker running with TLS
- [ ] **TS-03-01-02** `(2h, config, ne-security)` Write `ne-security/scripts/gen_certs.sh`: generate CA cert + client certs for all 5 containers — **Done:** `openssl verify -CAfile ca.crt client-<name>.crt` exits 0 for each container cert ⊢ TS-03-01-01
- [ ] **TS-03-01-03** `(1h, config, Docker)` Mount client certs into each container via `docker-compose.yml` bind mounts — **Done:** `docker inspect ne-control-plane` shows cert volume mounted at `/certs/` ⊢ TS-03-01-02
- [ ] **TS-03-01-04** `(2h, test, ne-bus)` Write mTLS rejection test: connect without client cert → CONNACK reason code 135 (not authorized) — **Done:** `mosquitto_pub --cafile ca.crt` without `--cert` flag returns connection refused ⊢ TS-03-01-03
- [ ] **TS-03-01-05** `(2h, validate)` Benchmark 100 msg/s throughput on dev machine — **Done:** `emqtt_bench pub -c 1 -I 10 --count 1000` completes in < 10 s `[manual]`

---

### US-03-02 — Control Plane REST API

> **Story total:** 10h across 7 tasks

- [ ] **TS-03-02-01** `(1h, config, ne-control-plane)` Create FastAPI app skeleton in `services/ne-control-plane/app/main.py` with uvicorn entry point — **Done:** `uvicorn app.main:app` starts; `/docs` returns 200
- [ ] **TS-03-02-02** `(2h, code, ne-control-plane)` Implement `POST /start`, `POST /stop`; `/stop` drains inference queue — **Done:** `pytest tests/test_api.py::test_start_stop` exits 0 ⊢ TS-03-02-01
- [ ] **TS-03-02-03** `(1h, code, ne-control-plane)` Implement `POST /reconfigure`: publish to MQTT `device/{id}/config/apply` (idempotent, FR-9b-2) — **Done:** `pytest tests/test_api.py::test_reconfigure` exits 0; MQTT message published ⊢ TS-03-02-02
- [ ] **TS-03-02-04** `(1h, code, ne-control-plane)` Implement `GET /healthz` → `{status: "ok"|"degraded", containers: {...}}` — **Done:** `curl localhost:8000/healthz` returns HTTP 200 JSON ⊢ TS-03-02-01
- [ ] **TS-03-02-05** `(2h, code, ne-control-plane)` Implement `GET /metrics` Prometheus-format endpoint (FR-9e-1) — **Done:** `curl localhost:8000/metrics` returns valid Prometheus text format ⊢ TS-03-02-01
- [ ] **TS-03-02-06** `(2h, config, ne-control-plane)` Set up SQLAlchemy + SQLite `metadata.db` on named volume (FR-9b-3); configure structlog JSON + OTLP export (FR-9b-6) — **Done:** `docker compose down && docker compose up` — metadata persists; logs are JSON-structured ⊢ TS-03-02-01
- [ ] **TS-03-02-07** `(1h, test, ne-control-plane)` Write pytest tests covering all 6 endpoints — **Done:** `pytest tests/test_api.py -q` exits 0; all endpoints covered ⊢ TS-03-02-05

---

### US-03-03 — Local UI Dashboard (FastAPI + HTMX)

> **Story total:** 11h across 7 tasks

- [ ] **TS-03-03-01** `(2h, config, ne-external)` Set up FastAPI HTTPS on port 8443 with self-signed cert; configure Jinja2 template directory — **Done:** `curl -k https://localhost:8443/` returns HTML 200
- [ ] **TS-03-03-02** `(2h, code, ne-external)` Implement 6 SSE routes: `/`, `/metrics`, `/sensors`, `/config`, `/admin`, `/logs` as independent HTMX fragments (FR-9d-2) — **Done:** all routes return HTML with `Content-Type: text/event-stream` SSE ⊢ TS-03-03-01
- [ ] **TS-03-03-03** `(2h, code, ne-external)` Implement overview tile SSE: FPS, confidence histogram (60 s), CPU/RAM — **Done:** overview tile updates every 2 s in browser `[manual]` ⊢ TS-03-03-02
- [ ] **TS-03-03-04** `(1h, code, ne-external)` Implement sensors tile SSE: per-sensor status + last frame timestamp — **Done:** sensors tile shows running/error/disconnected per sensor `[manual]` ⊢ TS-03-03-02
- [ ] **TS-03-03-05** `(2h, code, ne-external)` Implement frame preview tile: subscribe to `device/{id}/preview/jpeg` MQTT; render 1 FPS JPEG via SSE (FR-9d-2a); configurable per Use Case YAML — **Done:** preview tile shows JPEG with bounding boxes in browser when enabled `[manual]` ⊢ TS-03-03-02
- [ ] **TS-03-03-06** `(1h, code, ne-external)` Implement logs tile SSE: last 100 log lines with auto-scroll — **Done:** logs tile streams new lines in real-time; reconnects within 5 s of network blip `[manual]` ⊢ TS-03-03-02
- [ ] **TS-03-03-07** `(1h, test, ne-external)` Write pytest tests for all 6 routes — **Done:** `pytest tests/test_ui.py -q` exits 0 ⊢ TS-03-03-02

---

### US-03-04 — Python Rule Engine

> **Story total:** 7h across 5 tasks

- [ ] **TS-03-04-01** `(1h, config, ne-control-plane)` Add `business-rules` dep; create `RuleEngine` skeleton in `services/ne-control-plane/app/rules/engine.py` — **Done:** `python -c "from app.rules.engine import RuleEngine"` exits 0
- [ ] **TS-03-04-02** `(2h, code, ne-control-plane)` Implement rule loading from `config/rules.yaml`; subscribe to MQTT `device/{id}/inference/result`; evaluate each result — **Done:** `pytest tests/test_rules.py::test_rule_fires` exits 0 ⊢ TS-03-04-01
- [ ] **TS-03-04-03** `(1h, code, ne-control-plane)` Implement 3 rule actions: MQTT publish, webhook POST, log entry — **Done:** `pytest tests/test_rules.py::test_rule_actions` exits 0 for all 3 action types ⊢ TS-03-04-02
- [ ] **TS-03-04-04** `(1h, code, ne-control-plane)` Implement hot-reload: rules reload on MQTT `device/{id}/config/apply` without container restart — **Done:** `pytest tests/test_rules.py::test_hot_reload` exits 0 ⊢ TS-03-04-02
- [ ] **TS-03-04-05** `(2h, test, ne-control-plane)` Write unit tests: fires correctly, does not fire below threshold, hot-reload propagates — **Done:** `pytest tests/test_rules.py -q` exits 0 with 3+ test cases ⊢ TS-03-04-04

---

## EP-04 — Cloud Emulation & E2E Integration {#ep-04}

> **EPIC total:** 28h across 4 stories / 18 tasks

### US-04-01 — Terraform AWS Infrastructure

> **Story total:** 8h across 5 tasks

- [ ] **TS-04-01-01** `(4h, infra, Terraform)` Write Terraform in `infra/terraform/`: ECR repos, S3 `neuroedge-artifacts`, IoT Core policy + thing type, CloudWatch log group, least-privilege IAM roles — **Done:** `terraform plan` shows planned resources with no errors
- [ ] **TS-04-01-02** `(1h, config, Terraform)` Configure S3 remote state backend with DynamoDB locking (CloudBoost acct 975050071275) — **Done:** `terraform init` succeeds with S3 backend ⊢ TS-04-01-01
- [ ] **TS-04-01-03** `(1h, validate, Terraform)` Verify `terraform apply` is idempotent — **Done:** `terraform plan` after `apply` shows "No changes" ⊢ TS-04-01-02
- [ ] **TS-04-01-04** `(1h, config, Makefile)` Add `make infra-up` / `make infra-down` targets with "Apply? [y/N]" confirmation prompt — **Done:** `make infra-up` prompts before executing ⊢ TS-04-01-01
- [ ] **TS-04-01-05** `(1h, docs)` Document `aws iam create-role` CloudBoost portal workaround in `infra/README.md` — **Done:** `infra/README.md` has CloudBoost IAM workaround section `[manual]`

---

### US-04-02 — QEMU ARM64 Build Pipeline

> **Story total:** 4h across 3 tasks

- [ ] **TS-04-02-01** `(2h, config, CI)` Write `.github/workflows/arm64-build.yml`: Docker Buildx + QEMU, `--platform linux/arm64`, `arm64-linux-gcc11` Conan profile, nightly schedule — **Done:** manual workflow trigger run exits 0
- [ ] **TS-04-02-02** `(1h, config, CI)` Add stub integration test that runs under QEMU emulation — **Done:** integration test step in workflow exits 0 under QEMU ⊢ TS-04-02-01
- [ ] **TS-04-02-03** `(1h, validate, CI)` Confirm workflow completes within 25-minute QEMU budget — **Done:** GitHub Actions run shows < 25 min elapsed `[manual]`

---

### US-04-03 — Nightly TRT Smoke Test on g5.xlarge

> **Story total:** 7h across 4 tasks

- [ ] **TS-04-03-01** `(4h, config, CI)` Write `.github/workflows/trt-smoke.yml`: launch g5.xlarge spot, run `ne-data-plane` with TRT stub on 5-frame FileReplaySensor clip, terminate instance on completion or timeout — **Done:** workflow run exits 0; instance terminated after run
- [ ] **TS-04-03-02** `(1h, config, CI)` Emit FPS + latency p95 to CloudWatch metric `NeuroEdge/SmokeTest` — **Done:** `aws cloudwatch get-metric-statistics` shows data after run ⊢ TS-04-03-01
- [ ] **TS-04-03-03** `(1h, config, CI)` Add failure conditions: instance start failure, result count < 5, latency p95 > 200 ms — **Done:** workflow fails when each condition is triggered ⊢ TS-04-03-02
- [ ] **TS-04-03-04** `(1h, docs)` Document monthly cost estimate < $5 in workflow comment — **Done:** `trt-smoke.yml` has `# Estimated cost: < $5/month` comment `[manual]`

---

### US-04-04 — Reference PPE Use Case E2E

> **Story total:** 9h across 6 tasks

- [ ] **TS-04-04-01** `(1h, config)` Copy and validate `use_cases/ppe_shopfloor_jetson.yaml` against `neuroedge-contracts` schema — **Done:** `python -c "from neuroedge_design_usecase import UseCase; UseCase.from_yaml('use_cases/ppe_shopfloor_jetson.yaml')"` exits 0
- [ ] **TS-04-04-02** `(2h, config, ne-data-plane)` Configure `FileReplaySensor` to replay 30-second PPE sample clip from S3 — **Done:** sensor reads 750 frames (30 s × 25 fps) without error ⊢ TS-04-04-01
- [ ] **TS-04-04-03** `(1h, config, ne-external)` Configure Cloud Agent to push inference results to S3 `neuroedge-artifacts/results/{device-id}/` — **Done:** `aws s3 ls s3://neuroedge-artifacts/results/` shows results after run ⊢ TS-04-04-02
- [ ] **TS-04-04-04** `(1h, config, ne-external)` Emit CloudWatch metric `NeuroEdge/InferenceFPS` during run — **Done:** `aws cloudwatch get-metric-statistics` shows `InferenceFPS` data ⊢ TS-04-04-03
- [ ] **TS-04-04-05** `(2h, config)` Establish drift detection baseline from PPE clip feature stats; write to `data/output/manifests/drift_baseline.json` — **Done:** baseline JSON file present after first run ⊢ TS-04-04-02
- [ ] **TS-04-04-06** `(2h, test, CI)` Write `.github/workflows/e2e-ppe.yml` full PPE E2E test: runs with zero manual steps (Phase 3 gate metric) — **Done:** workflow exits 0 in GitHub Actions ⊢ TS-04-04-05

---

## EP-05 — Real Jetson Hardware & TensorRT {#ep-05}

> **EPIC total:** 30h across 4 stories / 20 tasks  
> **Blocked by:** OQ-3 — NVIDIA Jetson Loan Program application — Owner: Sanjeev

### US-05-01 — Jetson L4T Base Image

> **Story total:** 7h across 5 tasks

- [ ] **TS-05-01-01** `(2h, config, ne-data-plane)` Write `containers/ne-data-plane/Dockerfile.jetson` from `nvcr.io/nvidia/l4t-tensorrt` base — **Done:** `docker build -f Dockerfile.jetson .` exits 0 on Jetson hardware `[manual]`
- [ ] **TS-05-01-02** `(2h, config, Conan)` Verify `jetson-l4t-gcc9` Conan profile resolves all C++ deps against L4T sysroot — **Done:** `conan install . --profile jetson-l4t-gcc9 --build=missing` exits 0 `[manual]`
- [ ] **TS-05-01-03** `(1h, config, Docker)` Write `docker-compose.jetson.yml` with `--runtime nvidia` and `NVIDIA_VISIBLE_DEVICES=all` — **Done:** `docker compose -f docker-compose.jetson.yml up ne-data-plane` exits 0 on Jetson
- [ ] **TS-05-01-04** `(1h, code, ne-control-plane)` Add nvpmodel power mode read/write via container entrypoint env var — **Done:** `docker run -e NVPMODEL=15W ne-data-plane:jetson` sets power mode correctly `[manual]`
- [ ] **TS-05-01-05** `(1h, validate)` Verify container starts on Jetson Orin Nano and passes `/healthz` — **Done:** `curl localhost:8080/healthz` returns 200 on Jetson `[manual]` ⊢ TS-05-01-03

---

### US-05-02 — TensorRT Inference Backend

> **Story total:** 10h across 6 tasks

- [ ] **TS-05-02-01** `(4h, code, ne-data-plane)` Implement `TensorRTBackend`: loads `ModelArtifact`, builds TRT engine on first run, caches to `neuroedge-models/engines/` — **Done:** `ctest --preset integration -R trt_build` exits 0 on Jetson `[manual]`
- [ ] **TS-05-02-02** `(2h, code, ne-data-plane)` Implement engine cache hit warmup < 5 s (FR-9c-6) — **Done:** `ctest --preset integration -R trt_warmup_cached` shows warmup < 5 s `[manual]` ⊢ TS-05-02-01
- [ ] **TS-05-02-03** `(1h, code, ne-data-plane)` Implement atomic `current → vN/` symlink swap without data-plane restart (FR-9c-5) — **Done:** swap completes while inference loop runs; no frame drops logged ⊢ TS-05-02-01
- [ ] **TS-05-02-04** `(1h, code, ne-control-plane)` Emit FPS + latency p50/p95/p99 to Prometheus `/metrics` — **Done:** `curl localhost:8000/metrics` shows `neuroedge_inference_fps` and `neuroedge_inference_latency_seconds` ⊢ TS-05-02-01
- [ ] **TS-05-02-05** `(1h, code, ne-data-plane)` Implement ONNX fallback if TRT engine build fails + structured warning log — **Done:** unit test: TRT unavailable → ONNX fallback; warning in structlog output ⊢ TS-05-02-01
- [ ] **TS-05-02-06** `(1h, validate)` Verify ≥ 25 FPS on Orin Nano 8 GB for YOLOv8n 640×640 (§6 success metric) — **Done:** `neuroedge_inference_fps` > 25 sustained during 30-minute run `[manual]`

---

### US-05-03 — Full RealSense D4xx Sensor Integration

> **Story total:** 8h across 5 tasks

- [ ] **TS-05-03-01** `(4h, code, ne-data-plane)` Implement `RealSenseSensor` via librealsense2 C++ API: RGB + optional depth channel at configured FPS — **Done:** `ctest --preset integration -R realsense_rgb` exits 0 with camera connected `[manual]`
- [ ] **TS-05-03-02** `(1h, code, ne-data-plane)` Add FPS throttling: sensor never exceeds `use_case.target_fps` (FR-9a-4) — **Done:** `ctest --preset unit -R fps_throttle` exits 0 ⊢ TS-05-03-01
- [ ] **TS-05-03-03** `(1h, code, ne-data-plane)` Add USB disconnect auto-reconnect (FR-9a-5) — **Done:** disconnect + reconnect camera; sensor resumes within 5 s without process restart `[manual]` ⊢ TS-05-03-01
- [ ] **TS-05-03-04** `(1h, docs)` Write `docs/hardware/realsense-udev.md` with udev rules + `--device` Docker flag docs — **Done:** `docs/hardware/realsense-udev.md` covers all RealSense setup steps `[manual]`
- [ ] **TS-05-03-05** `(1h, validate)` Integration test: start sensor → read 100 frames → assert no drops on physical Jetson — **Done:** `ctest --preset integration -R realsense_100frames` exits 0 `[manual]` ⊢ TS-05-03-01

---

### US-05-04 — Jetson Power & Thermal Metrics

> **Story total:** 5h across 4 tasks

- [ ] **TS-05-04-01** `(2h, code, ne-control-plane)` Implement nvpmodel + tegra_stats reader in `services/ne-control-plane/app/hw/jetson.py` — **Done:** `pytest tests/test_hw.py::test_jetson_metrics` exits 0 (mock tegra_stats on x86)
- [ ] **TS-05-04-02** `(1h, code, ne-control-plane)` Export `neuroedge_jetson_gpu_temp_celsius`, `neuroedge_jetson_power_mw`, `neuroedge_jetson_throttle_events_total` to Prometheus — **Done:** all 3 metrics appear in `GET /metrics` output ⊢ TS-05-04-01
- [ ] **TS-05-04-03** `(1h, code, ne-control-plane)` Publish throttle event to MQTT `device/{id}/hw/throttle` on thermal trigger — **Done:** `pytest tests/test_hw.py::test_throttle_event` exits 0 ⊢ TS-05-04-01
- [ ] **TS-05-04-04** `(1h, code, ne-external)` Add GPU temp + power draw SSE panel to `/metrics` tile in local UI — **Done:** metrics tile shows GPU temperature value in browser `[manual]` ⊢ TS-05-04-02

---

## EP-06 — OTA Updates & Multi-Platform {#ep-06}

> **EPIC total:** 33h across 4 stories / 17 tasks  
> **Parallel with EP-07**

### US-06-01 — Weights-Only OTA Hot Reload

> **Story total:** 8h across 6 tasks

- [ ] **TS-06-01-01** `(2h, code, ne-external)` Implement `OTAAgent`: subscribe to MQTT `device/{id}/model/update`; download weights to `neuroedge-models/vN/` — **Done:** `pytest tests/test_ota.py::test_download_weights` exits 0
- [ ] **TS-06-01-02** `(1h, code, ne-external)` After download, publish `device/{id}/model/reload` to trigger C++ symlink swap — **Done:** `pytest tests/test_ota.py::test_reload_trigger` exits 0 ⊢ TS-06-01-01
- [ ] **TS-06-01-03** `(1h, code, ne-data-plane)` Implement atomic `current → vN/` symlink swap in C++ on reload signal — **Done:** unit test: swap completes while inference runs; zero frame drops ⊢ TS-06-01-02
- [ ] **TS-06-01-04** `(1h, code, ne-external)` Implement rollback: warmup fail → revert to previous version + structured error log — **Done:** `pytest tests/test_ota.py::test_rollback` exits 0 ⊢ TS-06-01-03
- [ ] **TS-06-01-05** `(1h, code, ne-external)` Publish `device/{id}/model/reload/ack` with new version + first inference latency — **Done:** ACK MQTT message appears within 5 s of reload ⊢ TS-06-01-04
- [ ] **TS-06-01-06** `(2h, validate)` Verify full reload (download + swap + warmup) < 5 s on 100 Mbps link (§6 success metric) — **Done:** OTA agent trace shows < 5 s from `model/update` to `model/reload/ack` `[manual]`

---

### US-06-02 — Full Image OTA with Rollback (SSH)

> **Story total:** 8h across 4 tasks

- [ ] **TS-06-02-01** `(4h, code, ne-external)` Implement `SshDockerComposeTarget(IDeployTarget)` in `services/ne-external/app/ota/ssh_target.py`: SSH pull → `docker compose up -d` → wait `/healthz` — **Done:** `pytest tests/test_ota.py::test_ssh_deploy` exits 0 against test SSH container
- [ ] **TS-06-02-02** `(2h, code, ne-external)` Implement 60 s rollback on `/healthz` failure (§6 NFR); restore previous `docker-compose.yml` + image tags — **Done:** `pytest tests/test_ota.py::test_ssh_rollback` exits 0; rollback completes < 60 s ⊢ TS-06-02-01
- [ ] **TS-06-02-03** `(1h, code, ne-external)` Stream deployment log to CloudWatch during update — **Done:** CloudWatch log stream shows OTA events during deployment ⊢ TS-06-02-01
- [ ] **TS-06-02-04** `(1h, code, ne-external)` Implement `--dry-run` mode: simulate without pulling images — **Done:** `pytest tests/test_ota.py::test_dry_run` exits 0; no `docker pull` called ⊢ TS-06-02-01

---

### US-06-03 — Mender OTA Target

> **Story total:** 9h across 3 tasks  
> **Blocked by:** OQ-5 — Mender self-host vs hosted decision — Owner: Sanjeev

- [ ] **TS-06-03-01** `(4h, infra, Terraform)` Write `infra/terraform/mender/` module: EC2 self-hosted Mender server — **Done:** `terraform apply infra/terraform/mender/` exits 0; Mender UI accessible `[manual]`
- [ ] **TS-06-03-02** `(4h, code, ne-external)` Implement `MenderTarget(IDeployTarget)`: upload artifact, poll deployment status, report result — **Done:** `pytest tests/test_ota.py::test_mender_deploy` exits 0 against Mender test server ⊢ TS-06-03-01
- [ ] **TS-06-03-03** `(1h, code, ne-external)` Implement fallback to `SshDockerComposeTarget` if Mender unreachable — **Done:** `pytest tests/test_ota.py::test_mender_fallback` exits 0 ⊢ TS-06-03-02

---

### US-06-04 — Qualcomm QNN Backend (AI Hub)

> **Story total:** 8h across 4 tasks  
> **Blocked by:** OQ-4 — QNN redistribution license — Owner: Sanjeev

- [ ] **TS-06-04-01** `(4h, code, ne-data-plane)` Implement `QnnBackend(IInferenceBackend)`: compile model via `qai-hub` SDK (subprocess bridge); run inference on AIM-01 — **Done:** `pytest tests/test_qnn.py::test_compile` exits 0 against AI Hub API
- [ ] **TS-06-04-02** `(2h, code, ne-external)` Implement `QualcommAiHubTarget(IDeployTarget)`: push compiled model to AI Hub device farm — **Done:** `pytest tests/test_ota.py::test_qnn_deploy` exits 0 ⊢ TS-06-04-01
- [ ] **TS-06-04-03** `(1h, code, ne-data-plane)` Implement ONNX fallback if QNN compilation fails + structured warning — **Done:** unit test: QNN failure → ONNX fallback; warning logged ⊢ TS-06-04-01
- [ ] **TS-06-04-04** `(1h, docs)` Document QNN redistribution risk in `docs/legal/qnn-license.md` (§12 risk register) — **Done:** `docs/legal/qnn-license.md` exists with risk analysis `[manual]`

---

## EP-07 — Security Hardening & Observability {#ep-07}

> **EPIC total:** 38h across 6 stories / 26 tasks  
> **Parallel with EP-06**

### US-07-01 — Container Security Hardening

> **Story total:** 4h across 4 tasks

- [ ] **TS-07-01-01** `(1h, config, Docker)` Add `read_only: true` + writable bind mounts for `/var/lib/neuroedge` and `/tmp` on `ne-data-plane` — **Done:** `docker inspect ne-data-plane` shows `ReadonlyRootfs: true`
- [ ] **TS-07-01-02** `(1h, config, Docker)` Add `cap_drop: ALL` + `no-new-privileges: true` to all 5 containers in `docker-compose.yml` — **Done:** `docker inspect <name>` shows `CapDrop: ["ALL"]` and `NoNewPrivileges: true` for each
- [ ] **TS-07-01-03** `(1h, config, ne-security)` Configure `ufw` deny-by-default; allow ports 22, 1883, 8443 only (FR-9f-1) — **Done:** `ufw status verbose` shows deny-by-default + 3 allow rules `[manual]`
- [ ] **TS-07-01-04** `(1h, test, CI)` Add CI assertion step: `docker inspect` verifies all security config for all containers — **Done:** CI assertion step exits 0 on correct config; fails on missing `read_only` ⊢ TS-07-01-01

---

### US-07-02 — SBOM Generation & Vulnerability Scanning

> **Story total:** 5h across 5 tasks

- [ ] **TS-07-02-01** `(1h, config, CI)` Add `syft` step to CI: generate `sbom-<image>.spdx.json` for each image (FR-9f-4) — **Done:** SBOM files appear in GitHub Actions build artifacts
- [ ] **TS-07-02-02** `(1h, config, CI)` Add `grype` step to CI: fail build on any critical CVE (FR-9f-4) — **Done:** CI fails when test image with known critical CVE is scanned ⊢ TS-07-02-01
- [ ] **TS-07-02-03** `(1h, config, CI)` Add weekly scheduled `trivy` scan on ECR images; post results to CloudWatch + GitHub Issues (FR-9f-4) — **Done:** scheduled workflow runs; CloudWatch shows scan metric ⊢ TS-07-02-02
- [ ] **TS-07-02-04** `(1h, config, CI)` Attach SBOM files to every GitHub Release via release workflow — **Done:** GitHub Release assets include `sbom-*.spdx.json` ⊢ TS-07-02-01
- [ ] **TS-07-02-05** `(1h, config, Makefile)` Add `make sbom` target: runs syft + grype locally — **Done:** `make sbom` exits 0 and prints SBOM summary

---

### US-07-03 — Signed Docker Images (cosign)

> **Story total:** 6h across 4 tasks

- [ ] **TS-07-03-01** `(2h, config, CI)` Add `cosign sign` step to CI using AWS KMS-backed key; signs on every image push (FR-9f-7) — **Done:** `cosign verify --key awskms:///... <image>` exits 0 after CI push
- [ ] **TS-07-03-02** `(2h, code, ne-security)` Implement `cosign verify` pre-run check in `ne-security` container startup script — **Done:** container startup fails + logs error if verification fails ⊢ TS-07-03-01
- [ ] **TS-07-03-03** `(1h, code, ne-security)` Publish `device/{id}/security/alert` MQTT on verification failure — **Done:** `pytest tests/test_security.py::test_cosign_alert` exits 0 ⊢ TS-07-03-02
- [ ] **TS-07-03-04** `(1h, docs)` Write KMS key rotation procedure in `docs/operations/cosign-key-rotation.md` — **Done:** document exists with step-by-step rotation guide `[manual]`

---

### US-07-04 — Wazuh IDS Agent

> **Story total:** 8h across 4 tasks  
> **Blocked by:** OQ-2 — Wazuh self-host vs Wazuh Cloud — Owner: Sanjeev

- [ ] **TS-07-04-01** `(4h, infra, Terraform)` Write `infra/terraform/wazuh/` module: EC2 `t3.small` Wazuh manager — **Done:** `terraform apply infra/terraform/wazuh/` exits 0; Wazuh dashboard accessible `[manual]`
- [ ] **TS-07-04-02** `(2h, config, ne-security)` Configure `wazuh-agent` in `ne-security` container; connect to `WAZUH_MANAGER_URL` — **Done:** `docker logs ne-security` shows "Agent connected to manager" `[manual]` ⊢ TS-07-04-01
- [ ] **TS-07-04-03** `(1h, config, ne-security)` Write NeuroEdge-tuned Wazuh rules: flag unexpected shells, `/var/lib/neuroedge/` changes, failed logins — **Done:** test alert fires on simulated file change `[manual]` ⊢ TS-07-04-02
- [ ] **TS-07-04-04** `(1h, config, ne-security)` Configure CloudWatch log shipper: summary-only events, no PII (FR-9f-8) — **Done:** CloudWatch log group shows Wazuh events; no raw inference data present `[manual]` ⊢ TS-07-04-03

---

### US-07-05 — Prometheus + Grafana Dashboards

> **Story total:** 6h across 4 tasks

- [ ] **TS-07-05-01** `(2h, code, ne-control-plane)` Implement custom Prometheus exporter: `neuroedge_inference_fps`, `neuroedge_inference_latency_seconds{quantile}`, `neuroedge_drift_ks_stat`, `neuroedge_inference_drops_total` (FR-9e-1) — **Done:** all 4 metrics appear in `/metrics`
- [ ] **TS-07-05-02** `(2h, config, infra)` Create `infra/grafana/dashboards/neuroedge.json`: FPS, latency heatmap, drift score, restart count panels — **Done:** Grafana auto-loads dashboard on `docker compose up`; all 4 panels render `[manual]` ⊢ TS-07-05-01
- [ ] **TS-07-05-03** `(1h, config, infra)` Configure drift score alert rule: `neuroedge_drift_ks_stat < 0.01` for 5 min → PagerDuty/webhook — **Done:** alert fires in Grafana when KS stat threshold crossed `[manual]` ⊢ TS-07-05-02
- [ ] **TS-07-05-04** `(1h, config, ne-external)` Expose `/grafana/` reverse proxy route in `ne-external` FastAPI (FR-9d-2) — **Done:** `curl -k https://localhost:8443/grafana/` proxies to Grafana successfully ⊢ TS-07-05-02

---

### US-07-06 — Drift Detection Engine

> **Story total:** 9h across 5 tasks

- [ ] **TS-07-06-01** `(4h, code, ne-control-plane)` Implement `DriftDetector` in `app/analytics/drift.py`: accumulate feature histograms over 30-minute rolling window — **Done:** `pytest tests/test_drift.py::test_histogram_accumulation` exits 0
- [ ] **TS-07-06-02** `(2h, code, ne-control-plane)` Compute KS-stat every 5 minutes vs `ModelArtifact.metadata.feature_stats` (FR-9e-2) — **Done:** `pytest tests/test_drift.py::test_ks_stat` exits 0 with synthetic 2σ shift ⊢ TS-07-06-01
- [ ] **TS-07-06-03** `(1h, code, ne-control-plane)` Publish alarm to MQTT `device/{id}/drift/alarm` + Prometheus gauge when `p < 0.01` — **Done:** `pytest tests/test_drift.py::test_alarm_fires` exits 0 ⊢ TS-07-06-02
- [ ] **TS-07-06-04** `(1h, code, ne-control-plane)` Implement baseline import from new `ModelArtifact` without restart — **Done:** `pytest tests/test_drift.py::test_baseline_update` exits 0 ⊢ TS-07-06-03
- [ ] **TS-07-06-05** `(1h, validate)` Verify MTTD ≤ 1 hour after 2σ distribution shift (§6 success metric) — **Done:** synthetic shift test confirms alarm fires < 60 min after shift `[manual]` ⊢ TS-07-06-02

---

## EP-08 — RPi 5 & Qualcomm AIM-01 Finalization {#ep-08}

> **EPIC total:** 22h across 3 stories / 14 tasks

### US-08-01 — RPi 5 ONNX-CPU Runtime

> **Story total:** 7h across 5 tasks

- [ ] **TS-08-01-01** `(2h, config, Conan)` Create `conan_profiles/rpi5-arm64-gcc12` with ARM NEON optimization flags — **Done:** `conan install . --profile rpi5-arm64-gcc12` exits 0
- [ ] **TS-08-01-02** `(1h, config, Docker)` Write `docker-compose.rpi5.yml` with memory limits respecting 8 GB RPi 5 budget — **Done:** `docker compose -f docker-compose.rpi5.yml up` applies memory limits ⊢ TS-08-01-01
- [ ] **TS-08-01-03** `(2h, code, ne-data-plane)` Add thermal adaptation: throttle inference FPS if CPU temp > 80°C — **Done:** `pytest tests/test_hw.py::test_rpi_thermal_throttle` exits 0 (mock temp sensor)
- [ ] **TS-08-01-04** `(1h, config, Docker)` Configure `tmpfs` for hot logs; write-budget for `neuroedge-models` SD card volume — **Done:** `docker inspect ne-data-plane` shows `tmpfs` mount for logs ⊢ TS-08-01-02
- [ ] **TS-08-01-05** `(1h, validate)` Verify ≥ 8 FPS for YOLOv8n on RPi 5 (§6 success metric) — **Done:** `neuroedge_inference_fps` ≥ 8 sustained during 10-minute run `[manual]`

---

### US-08-02 — Qualcomm AIM-01 QNN Finalization

> **Story total:** 8h across 5 tasks  
> **Blocked by:** OQ-4 — QNN redistribution license — Owner: Sanjeev

- [ ] **TS-08-02-01** `(2h, validate)` Run full PPE use case end-to-end on AIM-01: RealSense → QNN → MQTT → UI — **Done:** all pipeline stages healthy in Grafana during 30-minute run `[manual]`
- [ ] **TS-08-02-02** `(2h, docs)` Write `docs/hardware/qualcomm-aim01.md`: QNN compilation pipeline, setup steps — **Done:** document exists with complete step-by-step guide `[manual]`
- [ ] **TS-08-02-03** `(1h, validate)` Verify ≥ 20 FPS sustained (30-min) + no memory leak (RSS ± 5%) (§6) — **Done:** 30-min run: FPS ≥ 20; RSS diff < 5% `[manual]` ⊢ TS-08-02-01
- [ ] **TS-08-02-04** `(1h, validate)` Verify OTA weights-only reload < 5 s on AIM-01 hardware (§6) — **Done:** OTA trace shows < 5 s reload on AIM-01 `[manual]`
- [ ] **TS-08-02-05** `(2h, code)` Write `CapabilityManifest` with AIM-01 benchmark results to `data/output/manifests/` — **Done:** `data/output/manifests/capability_manifest_aim01.json` written after benchmark run ⊢ TS-08-02-03

---

### US-08-03 — Silicon Family Matrix Test

> **Story total:** 7h across 4 tasks

- [ ] **TS-08-03-01** `(4h, config, CI)` Write `.github/workflows/matrix-test.yml`: runs PPE use case on x86 CPU, QEMU ARM64, AI Hub using same `model_artifact.json` — **Done:** workflow exits 0; all 3 platform runs pass
- [ ] **TS-08-03-02** `(1h, test, CI)` Add matrix assertions: result schema identical, FPS ≥ target, drift baseline importable across all platforms — **Done:** assertions step exits 0 ⊢ TS-08-03-01
- [ ] **TS-08-03-03** `(1h, config)` Publish results to `data/output/benchmarks/silicon_matrix_<date>.json` — **Done:** JSON file present after matrix test run ⊢ TS-08-03-01
- [ ] **TS-08-03-04** `(1h, docs)` Add README badge: "Tested on: x86 ✓ | Jetson ✓ | RPi5 ✓ | AIM-01 ✓" — **Done:** README badge shows all platforms after successful matrix run `[manual]` ⊢ TS-08-03-01

---

## EP-09 — OEM Readiness & Extended Silicon {#ep-09}

> **EPIC total:** 29h across 4 stories / 14 tasks

### US-09-01 — OpenVINO Inference Backend

> **Story total:** 6h across 3 tasks

- [ ] **TS-09-01-01** `(4h, code, ne-data-plane)` Implement `OpenVINOBackend(IInferenceBackend)` in `src/backends/openvino_backend.cpp`: ONNX → OpenVINO IR, use `AUTO` device — **Done:** `ctest --preset integration -R openvino_backend` exits 0 on Intel hardware `[manual]`
- [ ] **TS-09-01-02** `(1h, code, ne-data-plane)` Add `BackendFactory` selection for `preferred_backend = "openvino"` or `platform = Intel` — **Done:** factory unit test: Intel platform → `OpenVINOBackend` selected ⊢ TS-09-01-01
- [ ] **TS-09-01-03** `(1h, test, CI)` Run FPS benchmark vs `OnnxRuntimeBackend` on Intel Core i5/i7 in CI — **Done:** CI benchmark shows competitive FPS; results in `data/output/benchmarks/` ⊢ TS-09-01-01

---

### US-09-02 — Hailo-8 Backend

> **Story total:** 7h across 3 tasks

- [ ] **TS-09-02-01** `(4h, code, ne-data-plane)` Implement `HailoBackend(IInferenceBackend)`: compile `.hef` model via Hailo Dataflow Compiler, load via Hailo Runtime SDK — **Done:** `ctest --preset integration -R hailo_backend` exits 0 on Hailo-8 hardware `[manual]`
- [ ] **TS-09-02-02** `(2h, code)` Integrate HEF compilation into `ModelArtifact` pipeline as `weights_uri` type `hef://` — **Done:** `ModelArtifact` with `format=hef` accepted by `BackendFactory` ⊢ TS-09-02-01
- [ ] **TS-09-02-03** `(1h, docs)` Document `--device /dev/hailo*` Docker capability in `docs/hardware/hailo.md` — **Done:** `docs/hardware/hailo.md` has Docker capability and udev setup steps `[manual]`

---

### US-09-03 — HCL Document & OEM Onboarding Workbook

> **Story total:** 7h across 3 tasks

- [ ] **TS-09-03-01** `(2h, docs)` Write `docs/HCL.md` with x86_64 (ONNX), Jetson Orin Nano (TRT), RPi 5 (ONNX-ARM), AIM-01 (QNN) entries — **Done:** `docs/HCL.md` exists with 4 certified platform entries `[manual]`
- [ ] **TS-09-03-02** `(4h, docs)` Write `docs/oem-onboarding-workbook.md`: Conan profile → Dockerfile → backend → benchmark → CI gate — **Done:** workbook exists; Lenovo SE70 used as first worked example `[manual]`
- [ ] **TS-09-03-03** `(1h, validate)` Verify workbook steps work with Lenovo ThinkEdge SE70 — **Done:** SE70 added to HCL.md with benchmark results and sign-off `[manual]` ⊢ TS-09-03-02

---

### US-09-04 — Lenovo ThinkEdge SE70 Co-marketed Demo

> **Story total:** 9h across 5 tasks  
> **Blocked by:** OQ-6 — Lenovo SE70 confirmed as first OEM target — Owner: Sanjeev

- [ ] **TS-09-04-01** `(2h, validate)` Run PPE demo end-to-end on Lenovo ThinkEdge SE70 (OpenVINO or Hailo-8) — **Done:** PPE detection shows live results on local UI at port 8443 on SE70 `[manual]`
- [ ] **TS-09-04-02** `(2h, validate)` Demo OTA update + drift alarm on SE70 — **Done:** weights-only OTA < 5 s; drift alarm triggers in Grafana `[manual]` ⊢ TS-09-04-01
- [ ] **TS-09-04-03** `(1h, docs)` Add SE70 to HCL.md with Lenovo sign-off — **Done:** HCL.md shows SE70 entry with "Certified by: Lenovo" `[manual]`
- [ ] **TS-09-04-04** `(2h, config)` Package demo bundle: Docker Compose + `setup.sh` deliverable in < 30 min on fresh SE70 — **Done:** `./setup.sh` on fresh SE70 completes in < 30 minutes `[manual]`
- [ ] **TS-09-04-05** `(2h, docs)` Document OEM hypothesis validation outcomes (§4 a+b+c) in `docs/oem-validation/lenovo-se70.md` — **Done:** all 3 hypothesis outcomes verified and documented `[manual]` ⊢ TS-09-04-01

---

## Coverage Check

| Check | Result |
|---|---|
| All story ACs map to ≥ 1 task | ✓ |
| All tasks have a definition of done | ✓ |
| No task exceeds 8 hours | ✓ |
| No story exceeds 10 tasks | ✓ |
| Task ordering follows infra → code → test → security → docs → validate | ✓ |
| Blocking Open Questions noted on affected EPICs/stories | ✓ (OQ-1,2,3,4,5,6) |
| Hardware-only tasks marked `[manual]` | ✓ |
