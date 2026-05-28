# NeuroEdge Device — EPICs & User Stories

**Source:** [PRD.md](PRD.md)  
**Author:** Sanjeev Kumar (sanjeev.kumar@cognizant.com)  
**Created:** 2026-05-28  
**Status:** Draft — ready for sprint planning  

> Personas used:  
> - **Edge Eng** = Cognizant Edge AI Engineer (primary)  
> - **Field Eng** = Customer Field Engineer (tertiary)  
> - **OEM Arch** = OEM Solution Architect (secondary)  

---

## EPIC INDEX

| ID | Epic | Phase | MoSCoW | Status |
|----|------|-------|--------|--------|
| EP-01 | [Repo Bootstrap & CI Infrastructure](#ep-01) | 0 | MUST | pending |
| EP-02 | [Shared Contracts & Data Plane Foundation](#ep-02) | 1 | MUST | pending |
| EP-03 | [Control Plane, Message Bus & Local UI](#ep-03) | 2 | MUST | pending |
| EP-04 | [Cloud Emulation & E2E Integration](#ep-04) | 3 | MUST | pending |
| EP-05 | [Real Jetson Hardware & TensorRT](#ep-05) | 4 | SHOULD | pending |
| EP-06 | [OTA Updates & Multi-Platform](#ep-06) | 5 | SHOULD | pending |
| EP-07 | [Security Hardening & Observability](#ep-07) | 6 | SHOULD | pending |
| EP-08 | [RPi 5 & Qualcomm AIM-01 Finalization](#ep-08) | 7 | SHOULD | pending |
| EP-09 | [OEM Readiness & Extended Silicon](#ep-09) | 8 | COULD | pending |

---

## EP-01 — Repo Bootstrap & CI Infrastructure {#ep-01}

**Phase:** 0 (MVP)  
**Goal:** Establish the git repo, build system, container scaffolding, and CI pipeline so every subsequent phase has a green baseline to build on.  
**Phase 0 Plan:** [phase-0-bootstrap.plan.md](plans/phase-0-bootstrap.plan.md)

### US-01-01 — Repo & Build Scaffold

> **As an** Edge Eng,  
> **I want** a GitHub repo with CMake + Conan build system and per-target Conan profiles,  
> **so that** I can build C++17 code reliably across x86_64, ARM64, and future silicon targets without per-platform guesswork.

**Acceptance Criteria:**
- [ ] `cognizant/neuroedge-device` repo created and pushed
- [ ] `CMakeLists.txt` at root builds `ne-data-plane` stub with `-std=c++17`
- [ ] `conanfile.txt` lists core C++ deps (Boost, ZMQ, ONNX Runtime, spdlog, nlohmann-json)
- [ ] Conan profiles in `conan_profiles/` for: `x86_64-linux-gcc12`, `arm64-linux-gcc11`, `jetson-l4t-gcc9`
- [ ] `cmake --preset x86` produces a passing stub build with no warnings
- [ ] `README.md` includes build-from-scratch instructions for a new dev

---

### US-01-02 — Multi-Container Docker Scaffold

> **As an** Edge Eng,  
> **I want** Docker Compose bringing up all five containers (`ne-data-plane`, `ne-control-plane`, `ne-external`, `ne-security`, `ne-bus`) from stub images,  
> **so that** the container topology is locked and later phases fill in functionality without restructuring.

**Acceptance Criteria:**
- [ ] `docker compose up` starts all five containers without errors
- [ ] Each container has a `Dockerfile` under `containers/<name>/Dockerfile`
- [ ] Each container exposes `/healthz` returning HTTP 200 (stub response is fine)
- [ ] Containers communicate over an internal Docker network `neuroedge-net`
- [ ] Named volumes declared: `neuroedge-models`, `neuroedge-data`, `neuroedge-logs`

---

### US-01-03 — CI Pipeline to ECR

> **As an** Edge Eng,  
> **I want** a GitHub Actions workflow that builds all four functional images and pushes them to ECR on every push to `main`,  
> **so that** every commit produces deployable, versioned artifacts automatically.

**Acceptance Criteria:**
- [ ] `.github/workflows/build.yml` triggers on push to `main` and on PRs
- [ ] Workflow builds `ne-data-plane` (x86_64), `ne-control-plane`, `ne-external`, `ne-security` images
- [ ] Images are pushed to ECR `neuroedge/` repository with `:dev` tag
- [ ] Build fails fast on compiler errors or test failures — no silent greens
- [ ] Workflow runs `grype` image scan; fails on critical CVEs
- [ ] Build time < 10 min on a `ubuntu-latest` runner for all four images combined

---

### US-01-04 — Makefile Developer Interface

> **As an** Edge Eng,  
> **I want** a top-level `Makefile` with well-named targets covering the common dev loop,  
> **so that** I don't need to memorize long Docker or CMake commands.

**Acceptance Criteria:**
- [ ] `make build` — builds all containers locally
- [ ] `make up` / `make down` — starts / stops the full stack
- [ ] `make evaluate MODEL=<m> PLATFORM=<p>` — delegates to model profiler
- [ ] `make health-check` — runs health check suite
- [ ] `make lint` — runs ruff (Python) + clang-tidy (C++)
- [ ] `make help` — prints all targets with one-line descriptions

---

## EP-02 — Shared Contracts & Data Plane Foundation {#ep-02}

**Phase:** 1 (MVP)  
**Goal:** Establish the C++ runtime contract (sensor ABC, inference ABC) and the first real implementations (FileReplaySensor, OnnxRuntimeBackend CPU) connected via ZeroMQ inproc.  
**Phase 1 Plan:** [phase-1-data-plane-skeleton.plan.md](plans/phase-1-data-plane-skeleton.plan.md)

### US-02-01 — ModelArtifact C++ Contract Headers

> **As an** Edge Eng,  
> **I want** C++ header files generated from NeuroEdge Web's `model_artifact.json` schema,  
> **so that** the device runtime and the web training pipeline stay in sync through a single source of truth.

**Acceptance Criteria:**
- [ ] `scripts/gen_contracts.py` reads `ModelArtifact` JSON Schema from `neuroedge-contracts` pip package
- [ ] Generates `include/neuroedge/contracts/model_artifact.hpp` with typed C++ struct and nlohmann-json deserializer
- [ ] Generated headers round-trip test: serialize → deserialize → assert fields equal
- [ ] CI step runs `gen_contracts.py` and fails if generated output differs from committed headers (drift guard)
- [ ] `UseCase`, `CapabilityManifest`, `PipelineStatus` schemas also covered

---

### US-02-02 — Sensor ABC & FileReplaySensor

> **As an** Edge Eng,  
> **I want** a `ISensor` C++ abstract class and a `FileReplaySensor` concrete implementation that replays frames from an MP4/image directory,  
> **so that** I can run the full inference pipeline in CI and cloud emulation without any physical camera.

**Acceptance Criteria:**
- [ ] `ISensor` ABC defined in `include/neuroedge/sensors/i_sensor.hpp` with `open()`, `read_frame()`, `close()`, `name()` pure virtuals
- [ ] `Frame` struct carries: raw buffer ptr, width, height, pixel_format, timestamp_ns, sensor_id
- [ ] `FileReplaySensor` reads from local FS path or S3 URI; loops by default; configurable FPS cap
- [ ] Sensor failure on missing file raises `SensorException`; does NOT crash the process (FR-9a-5)
- [ ] Unit tests cover: normal replay, end-of-file loop, missing-file exception, metadata fields
- [ ] `RealSenseSensor` stub compiles with librealsense2 header (returns empty frames until Phase 4)

---

### US-02-03 — Inference Backend ABC & OnnxRuntimeBackend

> **As an** Edge Eng,  
> **I want** an `IInferenceBackend` ABC and a CPU ONNX Runtime implementation that loads a `ModelArtifact` and runs inference on `Frame` objects,  
> **so that** the data plane can run real model inference on x86 without any accelerator hardware.

**Acceptance Criteria:**
- [ ] `IInferenceBackend` ABC with `load(ModelArtifact)`, `infer(Frame) → InferenceResult`, `unload()`, `capabilities() → BackendCaps` (FR-9c-1)
- [ ] `OnnxRuntimeBackend` loads `.onnx` model from `ModelArtifact.weights_uri` (local or S3)
- [ ] Inference runs on ONNX Runtime CPU EP; returns bounding boxes + confidence scores
- [ ] Backend warmup completes within 30 s (FR-9c-6); emits structured log on completion
- [ ] `BackendFactory` selects `OnnxRuntimeBackend` when `preferred_backend = "onnx"` (FR-9c-3)
- [ ] Unit tests: load YOLO ONNX stub → infer dummy frame → assert result shape

---

### US-02-04 — ZeroMQ Inproc Frame Pipeline

> **As an** Edge Eng,  
> **I want** a ZeroMQ PUSH/PULL inproc pipeline connecting the sensor thread to the inference thread inside `ne-data-plane`,  
> **so that** frame passing is zero-copy and sub-millisecond within the hot path.

**Acceptance Criteria:**
- [ ] Sensor thread pushes `Frame` onto `zmq_inproc://frames` with `zmq_msg_init_data` (zero-copy)
- [ ] Inference thread pulls from the same socket; no heap allocation per frame in steady state
- [ ] Pipeline handles back-pressure: drops oldest frame (configurable) when inference is slower than sensor
- [ ] Latency measurement: sensor→inference handoff < 0.5 ms on x86 dev machine (measured in unit test)
- [ ] Integration test: FileReplaySensor → ZMQ → OnnxRuntimeBackend → InferenceResult; asserts ≥ 1 result in 5 s

---

## EP-03 — Control Plane, Message Bus & Local UI {#ep-03}

**Phase:** 2 (MVP)  
**Goal:** Wire up the management surface — EMQX broker with mTLS, FastAPI control plane (command/config/metadata), local UI dashboard, and Python rule engine.

### US-03-01 — EMQX Broker with mTLS

> **As an** Edge Eng,  
> **I want** the EMQX broker container running with mTLS configured for all container-to-container connections,  
> **so that** all inter-container messaging is authenticated and encrypted from day one.

**Acceptance Criteria:**
- [ ] `ne-bus` runs EMQX 5.x with TLS listeners on port 8883
- [ ] Each container holds its own client cert; CA cert issued by a local CA in `ne-security`
- [ ] Containers can publish/subscribe to `device/{id}/inference/result` and `device/{id}/config/apply`
- [ ] `ne-bus` exposes EMQX Dashboard on port 18083 (internal network only)
- [ ] mTLS test: attempt connection without cert → connection refused
- [ ] Latency under load: 100 msg/s throughput ≥ achieved on Orin Nano 8 GB (EMQX vs Mosquitto benchmark)

---

### US-03-02 — Control Plane REST API

> **As an** Edge Eng,  
> **I want** a `ne-control-plane` FastAPI service with start/stop/reconfigure/healthz endpoints,  
> **so that** I can programmatically manage the runtime without SSHing into the device.

**Acceptance Criteria:**
- [ ] `POST /start` — loads use case YAML and starts data plane inference loop
- [ ] `POST /stop` — gracefully stops inference; data plane drains queue
- [ ] `POST /reconfigure` — pushes updated config to data plane via MQTT `device/{id}/config/apply` (idempotent, FR-9b-2)
- [ ] `GET /healthz` — returns JSON `{status: "ok"|"degraded", containers: {...}}`
- [ ] `GET /metrics` — Prometheus-format metrics (FR-9e-1)
- [ ] SQLite `metadata.db` on named volume; survives container restart (FR-9b-3)
- [ ] Structured JSON logs to stdout (captured by journald) + OTLP export endpoint (FR-9b-6)
- [ ] OpenAPI spec auto-generated at `/docs`

---

### US-03-03 — Local UI Dashboard (FastAPI + HTMX)

> **As a** Field Eng,  
> **I want** a web dashboard on port 8443 (HTTPS) showing live inference status, sensor health, drift alarms, and system metrics,  
> **so that** I can monitor the deployed system without cloud access or installing any software.

**Acceptance Criteria:**
- [ ] `ne-external` serves HTTPS on port 8443 with self-signed cert (configurable CA cert for production)
- [ ] Routes: `/` (overview), `/metrics`, `/sensors`, `/config`, `/admin`, `/logs` — each as independent HTMX SSE fragment (FR-9d-2)
- [ ] Overview tile: current FPS, inference confidence histogram (last 60 s), system CPU/RAM
- [ ] Sensors tile: per-sensor status (running / error / disconnected), last frame timestamp
- [ ] Live frame preview tile: 1 FPS downsampled JPEG with bounding boxes from MQTT `device/{id}/preview/jpeg` (FR-9d-2a); default OFF for headless, ON for demos (configurable in Use Case YAML)
- [ ] Config tile: editable use case YAML (read-only view at MVP, write in v1 admin)
- [ ] Logs tile: last 100 log lines, auto-scroll via SSE
- [ ] Page reload or SSE reconnect works within 5 s of network blip

---

### US-03-04 — Python Rule Engine

> **As an** Edge Eng,  
> **I want** a Python rule engine that evaluates post-inference events against YAML-defined business rules,  
> **so that** customer-specific alerting logic (e.g. "alert if no-helmet detected 3× in 10 s") can be declared without code changes.

**Acceptance Criteria:**
- [ ] Rule engine uses `business-rules` library; rules loaded from `config/rules.yaml` in the use case bundle
- [ ] Subscribes to MQTT `device/{id}/inference/result`; evaluates each result against active rules
- [ ] Rule actions: MQTT publish, webhook POST, log entry
- [ ] Rules hot-reloaded on MQTT `device/{id}/config/apply` — no container restart needed
- [ ] Sample rule: `if class == "no_helmet" AND confidence > 0.8 AND count_in_window(60s) >= 3 → alert`
- [ ] Unit tests: rule fires correctly, rule does not fire below threshold, hot-reload propagates new rule

---

## EP-04 — Cloud Emulation & E2E Integration {#ep-04}

**Phase:** 3 (MVP)  
**Goal:** Prove the full stack works end-to-end on cloud infra — Terraform-provisioned AWS resources, QEMU ARM64 builds, nightly TRT smoke on g5.xlarge, and the reference PPE use case running without any physical hardware.

### US-04-01 — Terraform AWS Infrastructure

> **As an** Edge Eng,  
> **I want** Terraform scripts that provision all required AWS resources in us-west-2 from scratch,  
> **so that** the cloud emulation environment is reproducible and version-controlled.

**Acceptance Criteria:**
- [ ] Terraform in `infra/terraform/` provisions: ECR repos, S3 bucket (`neuroedge-artifacts`), IoT Core policy + thing type, CloudWatch log group, IAM roles
- [ ] `terraform apply` is idempotent; `terraform plan` produces zero diff after apply
- [ ] IAM roles follow least-privilege; no `*` actions on sensitive resources
- [ ] Terraform state stored in S3 with DynamoDB locking (CloudBoost account 975050071275)
- [ ] `make infra-up` / `make infra-down` wraps apply/destroy with confirmation prompt
- [ ] Known risk documented: `aws iam create-role` may require CloudBoost portal — see README workaround

---

### US-04-02 — QEMU ARM64 Build Pipeline

> **As an** Edge Eng,  
> **I want** a GitHub Actions job that cross-compiles `ne-data-plane` for ARM64 using QEMU and Docker Buildx,  
> **so that** ARM64 build failures are caught in CI before physical hardware is available.

**Acceptance Criteria:**
- [ ] `.github/workflows/arm64-build.yml` builds `ne-data-plane` with `--platform linux/arm64` via Docker Buildx + QEMU
- [ ] Build uses the `arm64-linux-gcc11` Conan profile
- [ ] Built image runs the stub integration test under QEMU emulation
- [ ] Build completes within 25 minutes (QEMU budget)
- [ ] Nightly schedule — not on every PR (cost control)

---

### US-04-03 — Nightly TRT Smoke Test on g5.xlarge

> **As an** Edge Eng,  
> **I want** a nightly GitHub Actions workflow that spins up a `g5.xlarge` EC2 instance, runs the TensorRT smoke test on a YOLOv8n ONNX model, and tears down the instance,  
> **so that** TensorRT compatibility is validated weekly without owning a GPU workstation.

**Acceptance Criteria:**
- [ ] Workflow launches `g5.xlarge` spot instance (us-west-2) via AWS CLI; terminates on completion or timeout
- [ ] Runs `ne-data-plane` with `TensorRTBackend` (stub) on a 5-frame FileReplaySensor clip
- [ ] Emits inference FPS + latency p95 to CloudWatch metric `NeuroEdge/SmokeTest`
- [ ] Fails the workflow if: instance fails to start, inference result count < 5, or latency p95 > 200 ms
- [ ] Monthly cost estimate < $5 (documented in workflow comment)

---

### US-04-04 — Reference PPE Use Case E2E

> **As an** Edge Eng,  
> **I want** the PPE detection use case running end-to-end through the full stack (sensor → inference → postproc → cloud → UI),  
> **so that** I can demo "model runs on x86 with FileReplay" to stakeholders with zero physical hardware.

**Acceptance Criteria:**
- [ ] `use_cases/ppe_shopfloor_jetson.yaml` loaded from NeuroEdge Web repo (shared contract)
- [ ] `FileReplaySensor` replays a 30-second PPE sample clip from S3
- [ ] `OnnxRuntimeBackend` runs YOLOv8n ONNX model; inference results appear on local UI dashboard
- [ ] Cloud Agent pushes inference results to S3 bucket `neuroedge-artifacts/results/{device-id}/`
- [ ] Telemetry visible in CloudWatch with metric `NeuroEdge/InferenceFPS`
- [ ] Drift detection baseline established from PPE sample clip feature stats
- [ ] Full E2E test passes in GitHub Actions with zero manual steps (Phase 3 gate metric, §6)

---

## EP-05 — Real Jetson Hardware & TensorRT {#ep-05}

**Phase:** 4 (v1)  
**Goal:** Replace the ONNX CPU stub with real TensorRT acceleration on physical Jetson Orin Nano hardware, including the full RealSense camera integration and power/thermal instrumentation.

### US-05-01 — Jetson L4T Base Image

> **As an** Edge Eng,  
> **I want** `ne-data-plane` built from a JetPack L4T base image with TensorRT libraries included,  
> **so that** the container runs natively on Jetson without manual library installation.

**Acceptance Criteria:**
- [ ] `containers/ne-data-plane/Dockerfile.jetson` uses `nvcr.io/nvidia/l4t-tensorrt` base
- [ ] Conan profile `jetson-l4t-gcc9` correctly resolves all C++ deps against L4T sysroot
- [ ] Container starts on Jetson Orin Nano (JetPack 5.x) and passes `/healthz`
- [ ] `nvpmodel` power mode is readable and writable via container entrypoint env var
- [ ] NVIDIA runtime (`--runtime nvidia`) declared in `docker-compose.jetson.yml`

---

### US-05-02 — TensorRT Inference Backend

> **As an** Edge Eng,  
> **I want** a `TensorRTBackend` that loads a TRT engine from `ModelArtifact` and achieves ≥ 25 FPS on Jetson Orin Nano for YOLOv8n,  
> **so that** the PPE use case meets its performance target on real hardware.

**Acceptance Criteria:**
- [ ] `TensorRTBackend` implements `IInferenceBackend`; builds TRT engine on first run, caches to `neuroedge-models/engines/`
- [ ] Engine cache hit on subsequent startups (warmup < 5 s when cached, FR-9c-6)
- [ ] Achieves ≥ 25 FPS on Orin Nano 8 GB with YOLOv8n at 640×640 (§6 success metric)
- [ ] FPS and latency p50/p95/p99 emitted to Prometheus `/metrics`
- [ ] Atomic model replacement: `current → vN/` symlink swap without data-plane restart (FR-9c-5)
- [ ] Falls back to `OnnxRuntimeBackend` if TRT engine build fails, with structured warning log

---

### US-05-03 — Full RealSense D4xx Sensor Integration

> **As an** Edge Eng,  
> **I want** `RealSenseSensor` to read depth + RGB streams from an Intel RealSense D4xx camera at the configured FPS,  
> **so that** the PPE use case runs with the reference sensor stack.

**Acceptance Criteria:**
- [ ] `RealSenseSensor` uses librealsense2 C++ API; produces `Frame` with RGB channel at configured FPS
- [ ] Depth channel optionally included in `Frame.depth_buffer` when `use_depth: true` in Use Case YAML
- [ ] udev rules documented in `docs/hardware/realsense-udev.md`; `--device` Docker flag documented
- [ ] Sensor reconnects automatically after USB disconnect (FR-9a-5)
- [ ] FPS throttling: sensor never exceeds `use_case.target_fps` to avoid unnecessary inference load
- [ ] Integration test on physical Jetson: start sensor → read 100 frames → assert no drops

---

### US-05-04 — Jetson Power & Thermal Metrics

> **As a** Field Eng,  
> **I want** the local UI dashboard to show Jetson power mode, GPU temperature, and thermal throttling events,  
> **so that** I can monitor hardware health without SSH access.

**Acceptance Criteria:**
- [ ] `ne-control-plane` reads `nvpmodel` active profile and tegra_stats; exports to Prometheus
- [ ] Custom metrics: `neuroedge_jetson_gpu_temp_celsius`, `neuroedge_jetson_power_mw`, `neuroedge_jetson_throttle_events_total`
- [ ] Dashboard `/metrics` tile shows GPU temp + power draw via SSE
- [ ] Thermal throttle event triggers a structured WARN log + MQTT publish to `device/{id}/hw/throttle`
- [ ] nvpmodel target envelope declarable in Use Case YAML (per §10 NFR)

---

## EP-06 — OTA Updates & Multi-Platform {#ep-06}

**Phase:** 5 (v1) — can run parallel with EP-07  
**Goal:** Ship reliable OTA updates (weights-only hot reload AND full image swap with rollback) and bring Qualcomm QNN validation online.

### US-06-01 — Weights-Only OTA Hot Reload

> **As an** Edge Eng,  
> **I want** to push a new model weights file over MQTT and have `ne-data-plane` swap it in under 5 seconds without restarting the container,  
> **so that** model updates happen without a site visit or service interruption.

**Acceptance Criteria:**
- [ ] OTA Agent in `ne-external` downloads new weights to `neuroedge-models/vN/` on MQTT `device/{id}/model/update` message
- [ ] After download, publishes `device/{id}/model/reload` to trigger `ne-data-plane` symlink swap
- [ ] Data plane swaps `current → vN/` atomically; inference continues without dropping the frame stream
- [ ] Full reload (download + swap + warmup) < 5 seconds on 100 Mbps link (§6 success metric)
- [ ] OTA Agent publishes `device/{id}/model/reload/ack` with new version + first inference latency
- [ ] Rollback: if new backend warmup fails, reverts to previous version and logs error

---

### US-06-02 — Full Image OTA with Rollback (SSH / Docker Compose)

> **As an** Edge Eng,  
> **I want** to deploy a complete updated container image stack over SSH with automatic rollback if the health check fails,  
> **so that** I can update the full runtime without risking a bricked device.

**Acceptance Criteria:**
- [ ] `SshDockerComposeTarget` implements `IDeployTarget`; pulls new images, runs `docker compose up -d`, waits for `/healthz`
- [ ] Automatic rollback triggers within 60 s if any container fails `/healthz` after update (§6 NFR)
- [ ] Rollback restores previous `docker-compose.yml` and image tags; confirms `/healthz` passes
- [ ] Deployment log streamed to CloudWatch during update
- [ ] 3-class OTA change support: weights-only, service-only (Python containers), full-stack
- [ ] Dry-run mode: `--dry-run` simulates deployment without pulling images

---

### US-06-03 — Mender OTA Target

> **As an** Edge Eng,  
> **I want** a `MenderTarget` OTA implementation that uses the Mender server for artifact deployment and rollback management,  
> **so that** Jetson deployments get vendor-neutral, battle-tested OTA with automatic rollback on boot failure.

**Acceptance Criteria:**
- [ ] `MenderTarget` implements `IDeployTarget`; uploads artifact to self-hosted Mender server on AWS
- [ ] Mender server deployed via Terraform (`infra/terraform/mender/`)
- [ ] Successful deployment: Mender marks device `installed`; `/healthz` passes within 60 s
- [ ] Failed deployment: Mender triggers automatic rollback; device reboots to previous known-good artifact
- [ ] Mender server URL configurable via environment variable; fallback to `SshDockerComposeTarget` if Mender unreachable

---

### US-06-04 — Qualcomm QNN Backend (AI Hub)

> **As an** Edge Eng,  
> **I want** a `QnnBackend` that runs YOLOv8n inference on Qualcomm AI Hub farm and reports ≥ 20 FPS,  
> **so that** Qualcomm AIM-01 coverage is validated without owning physical hardware.

**Acceptance Criteria:**
- [ ] `QnnBackend` implements `IInferenceBackend`; compiles model via `qai-hub` Python SDK
- [ ] `QualcommAiHubTarget` OTA deployment pushes compiled model to AI Hub device farm
- [ ] Achieves ≥ 20 FPS on AIM-01 profile in AI Hub benchmark (§6 success metric)
- [ ] QNN runtime license compliance documented; redistribution risk flagged per §12 risk register
- [ ] Falls back to `OnnxRuntimeBackend` with warning if QNN compilation fails

---

## EP-07 — Security Hardening & Observability {#ep-07}

**Phase:** 6 (v1) — can run parallel with EP-06  
**Goal:** Harden the container stack for customer-facing deployments: read-only filesystems, SBOM, cosign image signing, Wazuh IDS, and Prometheus/Grafana dashboards.

### US-07-01 — Container Security Hardening

> **As an** Edge Eng,  
> **I want** `ne-data-plane` running with a read-only root filesystem and minimal capabilities,  
> **so that** a compromised inference process cannot modify system files or escalate privileges.

**Acceptance Criteria:**
- [ ] `ne-data-plane` `docker-compose.yml` declares `read_only: true`; writable bind mounts only for `/var/lib/neuroedge` and `/tmp`
- [ ] `cap_drop: ALL` with only `CAP_NET_BIND_SERVICE` re-added where required
- [ ] `no-new-privileges: true` on all containers
- [ ] `ufw` deny-by-default; only ports 22 (Tailscale), 1883 (MQTT localhost), 8443 (UI HTTPS) open (FR-9f-1)
- [ ] CI test: `docker inspect` assertions on security config pass in every build

---

### US-07-02 — SBOM Generation & Vulnerability Scanning

> **As an** Edge Eng,  
> **I want** SBOM generated for every image and a vulnerability scan run in CI that blocks on critical CVEs,  
> **so that** I can prove to OEM and enterprise customers that the software supply chain is clean.

**Acceptance Criteria:**
- [ ] CI runs `syft` on each image; SBOM saved as `sbom-<image>.spdx.json` in build artifacts (FR-9f-4)
- [ ] CI runs `grype` on each image; fails build on any critical CVE (FR-9f-4)
- [ ] Weekly scheduled `trivy` scan on ECR images; results posted to CloudWatch and GitHub Issues (FR-9f-4)
- [ ] SBOM artifacts attached to every GitHub Release
- [ ] `make sbom` target runs syft + grype locally for dev-time checks

---

### US-07-03 — Signed Docker Images (cosign)

> **As an** Edge Eng,  
> **I want** all shipped Docker images signed with cosign and verified before runtime pull,  
> **so that** a tampered image is rejected before it can run on a customer device.

**Acceptance Criteria:**
- [ ] CI signs each pushed image with `cosign sign` using a KMS-backed key in AWS KMS
- [ ] `ne-security` container runs `cosign verify` on each image before `docker pull` completes
- [ ] Signature verification failure → container fails to start, event published to MQTT `device/{id}/security/alert`
- [ ] 100% of shipped images signed at release (§6 success metric)
- [ ] Key rotation procedure documented in `docs/operations/cosign-key-rotation.md`

---

### US-07-04 — Wazuh IDS Agent

> **As an** Edge Eng,  
> **I want** a Wazuh agent running on each device reporting security events to a central Wazuh manager on AWS,  
> **so that** anomalous file access, process spawning, or network connections are flagged centrally.

**Acceptance Criteria:**
- [ ] `ne-security` container runs `wazuh-agent`; connects to Wazuh manager at `WAZUH_MANAGER_URL`
- [ ] Wazuh manager deployed on AWS EC2 `t3.small` via Terraform (`infra/terraform/wazuh/`)
- [ ] Rules tuned for NeuroEdge: normal C++ inference process vs. unexpected shell spawns flagged
- [ ] Alert on: unexpected outbound connections, changes to `/var/lib/neuroedge/`, failed login attempts
- [ ] Summary-only events shipped to CloudWatch (no PII) per §10 privacy NFR (FR-9f-8)

---

### US-07-05 — Prometheus + Grafana Dashboards

> **As a** Field Eng,  
> **I want** a Grafana dashboard showing inference FPS, latency percentiles, drift score, and container health over time,  
> **so that** I can spot degradation trends before they become outages.

**Acceptance Criteria:**
- [ ] `ne-control-plane` custom exporter publishes: `neuroedge_inference_fps`, `neuroedge_inference_latency_seconds{quantile="0.5|0.95|0.99"}`, `neuroedge_drift_ks_stat`, `neuroedge_inference_drops_total` (FR-9e-1)
- [ ] Grafana provisioned via `infra/grafana/dashboards/neuroedge.json`; auto-loads on `docker compose up`
- [ ] Dashboard panels: FPS over time, latency heatmap, drift score threshold line, container restart count
- [ ] Alerting rule: `neuroedge_drift_ks_stat < 0.01` for 5 min → Grafana alert → PagerDuty/webhook
- [ ] Grafana accessible at `/grafana/` route in `ne-external` UI (reverse proxy, FR-9d-2)

---

### US-07-06 — Drift Detection Engine

> **As an** Edge Eng,  
> **I want** automatic KS-stat drift detection comparing live feature distributions to the `ModelArtifact` baseline,  
> **so that** I know within 1 hour if the production data distribution has shifted and the model needs retraining.

**Acceptance Criteria:**
- [ ] Drift detector in `ne-control-plane` accumulates feature histograms over a rolling 30-minute window
- [ ] KS-stat computed against `ModelArtifact.metadata.feature_stats` every 5 minutes
- [ ] Alarm fires when `p < 0.01` (FR-9e-2); publishes to MQTT `device/{id}/drift/alarm` + Prometheus gauge
- [ ] MTTD ≤ 1 hour after a 2σ distribution shift (§6 success metric)
- [ ] Baseline importable from new `ModelArtifact` after retraining, replacing old stats without restart

---

## EP-08 — RPi 5 & Qualcomm AIM-01 Finalization {#ep-08}

**Phase:** 7 (v1)  
**Goal:** Validate the runtime on the third and fourth silicon families to prove the "same ModelArtifact across ≥ 3 silicon" hypothesis.

### US-08-01 — RPi 5 ONNX-CPU Runtime

> **As an** Edge Eng,  
> **I want** the ONNX Runtime backend running on RPi 5 at ≥ 8 FPS for YOLOv8n,  
> **so that** customers with RPi-class devices can use NeuroEdge without a GPU accelerator.

**Acceptance Criteria:**
- [ ] `OnnxRuntimeBackend` runs on RPi 5 ARM Cortex-A76; achieves ≥ 8 FPS (§6 success metric)
- [ ] ARM NEON optimisation flags enabled in `conan_profiles/rpi5-arm64-gcc12`
- [ ] Thermal adaptation: throttle inference FPS target if CPU temp > 80°C, log event
- [ ] Flash wear mitigation: hot logs on `tmpfs`; `neuroedge-models` volume on SD card with write budgeting
- [ ] `docker-compose.rpi5.yml` includes memory limits respecting 8 GB RPi 5 budget

---

### US-08-02 — Qualcomm AIM-01 QNN Finalization

> **As an** Edge Eng,  
> **I want** the full `QnnBackend` validated end-to-end on physical Qualcomm AIM-01 hardware (or AI Hub farm),  
> **so that** Qualcomm coverage is production-ready, not just smoke-tested.

**Acceptance Criteria:**
- [ ] Full PPE use case runs end-to-end on AIM-01: RealSense → QNN inference → MQTT → UI
- [ ] QNN model compilation pipeline documented in `docs/hardware/qualcomm-aim01.md`
- [ ] Achieves ≥ 20 FPS sustained (30-minute run) with no memory leak (RSS stable ± 5%)
- [ ] OTA weights-only reload tested on AIM-01 hardware; < 5 s reload confirmed
- [ ] `CapabilityManifest` records AIM-01 benchmark results for NeuroEdge Web consumption

---

### US-08-03 — Silicon Family Matrix Test

> **As an** Edge Eng,  
> **I want** a test matrix CI job that proves the same `ModelArtifact` deploys identically across x86 (ONNX), Jetson (TRT), and RPi 5/AIM-01 (QNN/ONNX-ARM),  
> **so that** the core product hypothesis is verified and documented.

**Acceptance Criteria:**
- [ ] CI job `matrix-test.yml` runs the PPE use case on each platform stub (x86 CPU, QEMU ARM64, AI Hub)
- [ ] Same `model_artifact.json` used across all three runs; no platform-specific edits
- [ ] Asserts: inference result schema identical, FPS ≥ target per platform, drift baseline importable on all platforms
- [ ] Test matrix results published to `data/output/benchmarks/silicon_matrix_<date>.json`
- [ ] README badge: "Tested on: x86 ✓ | Jetson ✓ | RPi5 ✓ | AIM-01 ✓"

---

## EP-09 — OEM Readiness & Extended Silicon {#ep-09}

**Phase:** 8 (v2)  
**Goal:** Prepare the runtime for OEM partner certification — OpenVINO for Intel SKUs, Hailo-8 support, IQ-series onboarding, HCL documentation, and the first co-marketed Lenovo demo.

### US-09-01 — OpenVINO Inference Backend

> **As an** OEM Arch,  
> **I want** an `OpenVINOBackend` that runs inference on Intel CPU + iGPU + VPU,  
> **so that** Dell, HP, and Lenovo Intel-SKU boxes can run NeuroEdge without an NVIDIA add-in card.

**Acceptance Criteria:**
- [ ] `OpenVINOBackend` implements `IInferenceBackend`; uses OpenVINO IR format (auto-converted from ONNX)
- [ ] Backend selects best Intel device (CPU → iGPU → VPU) via OpenVINO `AUTO` device
- [ ] Achieves competitive FPS vs `OnnxRuntimeBackend` on Intel Core i5/i7 (benchmark in CI)
- [ ] `BackendFactory` selects `OpenVINOBackend` when `preferred_backend = "openvino"` or platform = Intel

---

### US-09-02 — Hailo-8 Backend

> **As an** OEM Arch,  
> **I want** a `HailoBackend` for Hailo-8 AI accelerator modules in Intel-based Advantech and Lenovo boxes,  
> **so that** customers can use the dedicated AI accelerator for maximum power efficiency.

**Acceptance Criteria:**
- [ ] `HailoBackend` compiles and loads a `.hef` model file (Hailo Dataflow Compiler output)
- [ ] HEF compilation step integrates with the `ModelArtifact` pipeline (new `weights_uri` type)
- [ ] Power draw vs FPS benchmark documented; Hailo typically > 10× efficiency over CPU
- [ ] Docker capability `--device /dev/hailo*` documented for container access

---

### US-09-03 — HCL Document & OEM Onboarding Workbook

> **As an** OEM Arch,  
> **I want** a Hardware Compatibility List document and a structured onboarding workbook,  
> **so that** OEM partners can self-certify their hardware and submit a pull request to add it to the HCL.

**Acceptance Criteria:**
- [ ] `docs/HCL.md` lists all certified platforms with: SoC, OS, JetPack/BSP version, backend, tested FPS, known limitations
- [ ] `docs/oem-onboarding-workbook.md` — step-by-step guide: Conan profile → Docker base image → backend selection → benchmark → CI gate
- [ ] HCL v0.1 contains at minimum: x86_64 (ONNX), Jetson Orin Nano (TRT), RPi 5 (ONNX-ARM), AIM-01 (QNN)
- [ ] Onboarding workbook tested with Lenovo ThinkEdge SE70 as the first third-party entry

---

### US-09-04 — Lenovo ThinkEdge SE70 Co-marketed Demo

> **As an** OEM Arch (Lenovo),  
> **I want** a validated NeuroEdge reference demo running on ThinkEdge SE70 with documented HCL certification,  
> **so that** I can cite NeuroEdge as a certified AI stack in Lenovo edge solution offerings.

**Acceptance Criteria:**
- [ ] PPE detection demo runs end-to-end on Lenovo ThinkEdge SE70 (Intel Core i5 + Hailo-8 or OpenVINO)
- [ ] Demo includes: local UI on port 8443, OTA update demonstration, drift alarm demonstration
- [ ] Lenovo SE70 added to HCL.md with sign-off from Lenovo contact
- [ ] Demo package: Docker Compose bundle + setup script deliverable in < 30 minutes on a fresh SE70
- [ ] OEM hypothesis validated: §4 Key Hypothesis outcome (a) + (b) + (c) documented

---

## Story Map — Phase Flow

```
EP-01  ──────────────────────────────────────────────────────────────────► EP-02
Bootstrap                                                                  Data Plane
                                                                               │
                                                                           EP-03
                                                                           Control + UI
                                                                               │
                                                                           EP-04
                                                                           Cloud Emulation
                                                                               │
                                                                           EP-05
                                                                           Jetson + TRT
                                                                          ┌────┤
                                                                      EP-06  EP-07
                                                                      OTA    Security
                                                                          └────┤
                                                                           EP-08
                                                                           RPi5 + AIM-01
                                                                               │
                                                                           EP-09
                                                                           OEM Readiness
```

---

## Open Questions (blocking stories)

| # | Question | Blocks | Owner |
|---|---|---|---|
| OQ-1 | `cognizant/neuroedge-device` GitHub repo created? | US-01-01, US-01-03 | Sanjeev |
| OQ-2 | Wazuh: self-host EC2 vs Wazuh Cloud? | US-07-04 | Sanjeev |
| OQ-3 | NVIDIA Jetson Loan Program application submitted? | EP-05 | Sanjeev |
| OQ-4 | QNN runtime redistribution license — legal engaged? | US-06-04, US-08-02 | Sanjeev |
| OQ-5 | Mender: self-host vs Mender Hosted? | US-06-03 | Sanjeev |
| OQ-6 | Lenovo ThinkEdge SE70 confirmed as first OEM target? | US-09-04 | Sanjeev |
| OQ-7 | RealSense udev rules + Docker capability — documented? | US-05-03 | TBD |

---

*Generated from PRD.md — 2026-05-28*
