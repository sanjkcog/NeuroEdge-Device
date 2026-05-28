# NeuroEdge Device — Product Requirements Document

**Status:** DRAFT (architecture-locked, scope-locked) — needs validation against first OEM customer
**Author:** Sanjeev Kumar (sanjeev.kumar@cognizant.com)
**Created:** 2026-05-28
**Source design doc:** [device_system_design_approach.md](../reference/device_system_design_approach.md)
**Sibling project:** NeuroEdge Web (`C:\Sanjeev_E\NeuroEdge Web`)
**Audience:** Sanjeev (solo eng + chief architect) and future contributors

> Cite section numbers like *§3.2* refer to `device_system_design_approach.md` — this PRD does not restate that content.

---

## 1. Problem Statement

Cognizant developers building edge AI solutions for industrial and healthcare customers must repeatedly hand-craft device runtimes for each silicon family (NVIDIA Jetson, Qualcomm AIM-01/IQ series, Intel, AMD, Hailo) and each OEM form factor (Dell, HP, Lenovo, Penguin, Inventec, Advantech). The result is months of duplicated work per engagement, no reusable OTA flow, no consistent observability, and no security baseline.

NeuroEdge Web produces optimized models and benchmark manifests; **NeuroEdge Device is the missing on-device runtime that turns that output into a deployable, observable, OTA-updatable container stack on any supported silicon, on any supported OEM box, behind any supported sensor.**

The cost of not solving it: every Cognizant industrial AI engagement either ships glue code that dies with the project, or stalls waiting for a custom integration. NeuroEdge Device is the bet that one runtime can serve all of them.

---

## 2. Evidence

- Existing NeuroEdge Web side built a benchmark dispatcher, model training pipeline, and `ModelArtifact` contract assuming **a runtime would consume them** — that runtime does not exist yet. Contract is dangling.
- User stated explicit OEM go-to-market intent: Dell, HP, Lenovo, Penguin, Inventec, Advantech (2026-05-28). None will adopt without a HCL + reference stack.
- Target customers (industrial, healthcare) require: OTA without site visits, drift detection MTTD < 1 hour, SBOM + signed images, no PII leakage. Off-the-shelf platforms (Balena, AWS Greengrass, Azure IoT Edge) lock to one cloud or one billing model — disqualifying for cloud-agnostic mandate.
- Reference use case PPE detection: blocked on device runtime today, despite trained model already produced by NeuroEdge Web.
- *Assumption needing validation:* OEM partners will co-market once HCL + reference demo exist. Validation method = Phase 8 outreach to one OEM (Lenovo first, closest silicon match).

---

## 3. Proposed Solution

A multi-container Linux runtime (4 functional + 1 message broker, see *§3.2*) running on any of: NVIDIA Jetson, Qualcomm AIM-01 / RB5 / RB6 / IQ-6 / IQ-8 / IQ-9 / IQ-10, Intel x86 (with OpenVINO), AMD x86, Hailo-8 in Intel boxes, RPi 5, and OEM industrial PCs.

- **C++17** for the hot path (sensors, inference, post-proc) and **Python 3.11** for the management plane (config, rule engine, OTA, UI, metrics).
- **Pluggable inference backends** (TensorRT, ONNX Runtime, QNN, OpenVINO, Hailo, TfLite) selected at runtime from the `ModelArtifact` shipped by NeuroEdge Web.
- **EMQX MQTT 5** for inter-container and device↔cloud messaging; **ZeroMQ inproc** inside `ne-data-plane` for zero-copy hot-path frames.
- **OTA via Mender** (NVIDIA-leaning, but vendor-neutral); fallback SSH/Docker-compose path for all platforms.
- **Five-tier cloud emulation strategy** (*§5.1*) so an MVP demo is achievable with **zero physical devices** owned.
- **AWS-hosted** test and orchestration infra (us-west-2, CloudBoost acct 975050071275); Terraform under `infra/terraform/`.

Why custom over DeepStream-as-primary: DeepStream excludes Qualcomm, AMD, Intel-no-NV, Hailo, and pure CPU. The target portfolio rules it out as the primary path. GStreamer (the substrate DeepStream is built on) remains the video plumbing layer.

---

## 4. Key Hypothesis

> **We believe** that a containerized, silicon-agnostic edge runtime with pluggable inference backends and a vendor-neutral OTA mechanism **will eliminate** the per-engagement bespoke-runtime work for Cognizant industrial AI delivery teams **and** unlock co-marketed OEM partnerships **for** field engineers and OEM ISV programs.
>
> **We'll know we're right when** (a) one Cognizant team uses NeuroEdge Device end-to-end without writing C++ glue for sensors or inference, (b) one OEM (target: Lenovo ThinkEdge SE70) certifies the stack on their box, and (c) the same `ModelArtifact` from NeuroEdge Web deploys identically across at least three silicon families.

---

## 5. What We're NOT Building

| Out of scope | Why |
|---|---|
| **Windows / macOS device targets** | Industrial edge is overwhelmingly Linux; effort doesn't pay for itself |
| **Model training on device** | NeuroEdge Web owns training; device only does inference |
| **DeepStream as the primary pipeline** | Excludes Qualcomm, AMD, Intel-no-NV, Hailo |
| **Streamlit on device** | 6× heavier than FastAPI+HTMX; web portal already covers rich UI |
| **AWS Greengrass / Azure IoT Edge / Balena (v1)** | Cloud-agnostic mandate; Balena deferred per existing project memory |
| **Multi-tenant device sharing** | Single-tenant trust boundary assumed |
| **Federated learning** | Out of scope for MVP and v1; reconsider for v2 |
| **In-process Python embedding in C++** | Rejected — fragile across L4T / Qualcomm BSP libc/Python ABIs |
| **NVIDIA Fleet Command (paid)** | Mender chosen — vendor-neutral and free |
| **Healthcare PHI handling features in v1** | Will trigger `healthcare-reviewer` agent when a healthcare use case lands |

---

## 6. Success Metrics

| Metric | Target | How measured |
|---|---|---|
| **Inference FPS (PPE on Jetson Orin Nano 8 GB)** | ≥ use-case-spec'd FPS (25 FPS baseline) | On-device benchmark in `ne-data-plane`, recorded to MLflow |
| **Inference FPS (PPE on AIM-01 via AI Hub)** | ≥ 20 FPS (projected) | Qualcomm AI Hub benchmark report |
| **Inference FPS (PPE on RPi 5 ONNX-CPU)** | ≥ 8 FPS | On-device benchmark |
| **OTA — weights-only hot reload latency** | < 5 seconds (no container restart) | OTA agent trace, MQTT `device/{id}/model/reload` ack |
| **OTA — full image swap with rollback** | < 60 seconds, automatic rollback on failed health check | Mender deployment log |
| **Drift detection MTTD** | < 1 hour after distribution shifts ≥ 2σ | KS-stat alarm vs `ModelArtifact.metadata.feature_stats` |
| **Container startup time (cold)** | `ne-data-plane` < 8 s; whole stack < 25 s | `docker compose up` instrumentation |
| **Image size — `ne-data-plane`** | < 800 MB (with TRT) / < 400 MB (ONNX-only) | CI image scan |
| **SBOM + signed image coverage** | 100% of shipped images | cosign verify in CI |
| **Vuln scan — critical CVE count** | 0 at release | grype/trivy in CI |
| **Cloud emulation E2E (Phase 3 gate)** | Tag push → results in S3 + telemetry in CloudWatch with zero manual steps | GitHub Actions workflow status |
| **Silicon families covered by same artifact** | ≥ 3 at v1, ≥ 5 at v2 | Manifest test matrix |
| **OEM HCL entries certified** | ≥ 1 at v2 (Lenovo target) | OEM partner sign-off |

---

## 7. Users & Personas

### Primary User: Cognizant Edge AI Engineer (Sanjeev's role + future team)
- **Context:** Building per-customer industrial AI POCs on tight timelines, often without owning the target hardware until demo day.
- **Trigger:** New customer engagement requires "model X on device Y, OTA-able, observable, secure."
- **Today:** Writes bespoke glue per engagement; reuse near zero across projects.
- **Success state:** Picks a NeuroEdge Web-produced `ModelArtifact`, picks a target platform, runs one command, gets a deployable container bundle. Updates over OTA without site visit.

### Secondary User: OEM Solution Architect (Dell / HP / Lenovo / Penguin / Inventec / Advantech)
- **Context:** Bundles edge boxes into customer solutions; needs validated AI stack ISV partners.
- **Trigger:** Customer asks "what AI software runs on your edge box?"
- **Today:** Custom-builds with vendor SDKs per opportunity; no portable answer.
- **Success state:** Cites NeuroEdge as a certified stack on their HCL; co-marketed reference demo available.

### Tertiary User: Customer Field Engineer (post-deploy)
- **Context:** Operates the deployed system on customer site; rarely has cloud access.
- **Trigger:** Model degrades or hardware faults.
- **Success state:** Local UI shows status, metrics, drift alarms; remote OTA from Cognizant fixes most issues without a truck roll.

### Non-Users (explicitly out of scope)
- **Pure cloud-only ML teams** — NeuroEdge Web serves them, not Device.
- **Hobbyist / education users** — RPi-only, no industrial requirements; not the ICP.
- **One-shot Kaggle-style ML practitioners** — no MLOps need.

### Job to Be Done
**When** I'm onboarding a new industrial AI engagement with a fixed silicon target, **I want to** ship the NeuroEdge Web-produced model to that device with OTA, observability, drift detection, and security baked in, **so I can** focus engagement time on the customer's domain logic — not on rebuilding the runtime.

---

## 8. Core Capabilities (MoSCoW)

### MUST (MVP — Phases 0–3)
| # | Capability | Rationale |
|---|---|---|
| M1 | Repo bootstrap, CMake+Conan build, CI image build to ECR | Nothing ships without it |
| M2 | C++17 sensor ABC + `FileReplaySensor` + `RealSenseSensor` stub | Hot path foundation; FileReplay unlocks cloud emulation |
| M3 | C++17 inference backend ABC + `OnnxRuntimeBackend` (CPU) | Universal fallback proves the contract |
| M4 | EMQX broker container + mTLS between containers | All later layers depend on this |
| M5 | `ne-control-plane` FastAPI + SQLite + APScheduler | Command/config/metadata |
| M6 | `ne-external` FastAPI+HTMX local UI + JSON emitter + Cloud Agent | Operator visibility + cloud bridge |
| M7 | Terraform: ECR, S3, IoT Core, IAM, CloudWatch in us-west-2 | Cloud emulation infra |
| M8 | QEMU ARM64 image build pipeline + nightly TRT smoke on g5.xlarge | Tier-1 + Tier-2 of 5-tier strategy |
| M9 | `ModelArtifact` contract C++ headers generated from Web's JSON Schema | Cross-repo contract |
| M10 | Reference use case wiring: PPE detection through full stack | Validates everything together |

### SHOULD (v1 — Phases 4–7)
| # | Capability | Rationale |
|---|---|---|
| S1 | `TensorRTBackend` on real Jetson | NVIDIA-side perf realism |
| S2 | `QnnBackend` validated on Qualcomm AI Hub farm | Qualcomm coverage |
| S3 | `OnnxRuntimeBackend` (ARM CPU) on RPi 5 with thermal + wear adaptations | Pi coverage |
| S4 | `MenderTarget` + `SshDockerComposeTarget` + 3-class change support | OTA real |
| S5 | Rule engine (Python) consuming inference events | Use-case-level alerting |
| S6 | Security hardening: cosign signing, SBOM (syft), Wazuh agent + manager | Customer ship requirement |
| S7 | Drift detection (KS-stat) wired with alarming | Differentiation vs raw container stacks |
| S8 | Prometheus + Grafana dashboards | Operator surface |

### COULD (v2 — Phase 8+)
| # | Capability | Rationale |
|---|---|---|
| C1 | `OpenVINOBackend` (Intel CPU + iGPU + VPU) | OEM coverage (Dell, HP, Lenovo Intel SKUs) |
| C2 | `HailoBackend` (Hailo-8 in Intel boxes) | Advantech, Lenovo selected SKUs |
| C3 | IQ-series (IQ-6/8/9/10) onboarding | Future Qualcomm industrial line |
| C4 | HCL document v0.1 + OEM device onboarding workbook | OEM partnership artifact |
| C5 | One co-marketed OEM reference demo (Lenovo ThinkEdge SE70 first) | Validation of OEM hypothesis |
| C6 | `TfLiteBackend` with XNNPACK | Ultra-low-end ARM coverage |

### WON'T (deferred / out of scope)
- `BalenaTarget`, NVIDIA Fleet Command, Windows/macOS targets, on-device training, federated learning, multi-tenant device sharing, ROCm AMD backend (backlog for Penguin co-eng).

---

## 9. Functional Requirements (by EdgeX layer)

References to *§3.3* of the design doc for full detail; this section is the requirements-level summary.

### 9.a Device Services Layer (`ne-data-plane`, C++)
- **FR-9a-1:** `ISensor` ABC with at least `FileReplaySensor`, `RealSenseSensor`, `V4L2Sensor` concrete implementations at MVP.
- **FR-9a-2:** Industrial bus support (`ModbusSensor` via libmodbus, `OpcUaSensor` via open62541) by v1.
- **FR-9a-3:** All sensors emit `Frame` (vision) or `Sample` (time-series) onto a Boost.Lockfree SPSC queue.
- **FR-9a-4:** Sensors are hot-pluggable via `config/sensors.yaml` — no recompile.
- **FR-9a-5:** Per-sensor failure isolation: one sensor crash must not bring down the data plane.

### 9.b Services Layer (`ne-control-plane`, Python)
- **FR-9b-1:** REST API for Command Service: `/start`, `/stop`, `/reconfigure`, `/healthz`, `/metrics`.
- **FR-9b-2:** Config Service pushes config to data plane via MQTT `device/{id}/config/apply`; must be idempotent.
- **FR-9b-3:** Metadata Service persists to SQLite `/var/lib/neuroedge/metadata.db`; survives container restart via volume.
- **FR-9b-4:** Rule Engine (Python `business-rules` library) evaluates post-inference events; rules YAML-defined per use case.
- **FR-9b-5:** Scheduler (APScheduler) runs periodic tasks (health pings, metric flush, log rotation).
- **FR-9b-6:** Structured JSON logs to journald + OTLP export.

### 9.c AI Inference Layer (`ne-data-plane`, C++)
- **FR-9c-1:** `IInferenceBackend` ABC with `load(ModelArtifact)`, `infer(Frame)`, `unload()`, `capabilities()`.
- **FR-9c-2:** Concrete implementations at MVP: `OnnxRuntimeBackend`. At v1: `+TensorRTBackend`, `+QnnBackend`. At v2: `+OpenVINOBackend`, `+HailoBackend`, `+TfLiteBackend`.
- **FR-9c-3:** `BackendFactory` selects backend at runtime from `ModelArtifact.metadata.preferred_backend`.
- **FR-9c-4:** Models live on named Docker volume `neuroedge-models` mounted RO into `ne-data-plane`.
- **FR-9c-5:** Atomic model replacement on weights-only OTA — `current → vN/` symlink swap.
- **FR-9c-6:** Backend warmup must complete within 30 s on any supported target.

### 9.d External Interface Layer (`ne-external`, Python)
- **FR-9d-1:** Post-inference processor — Python plugin per use case; subscribes to MQTT `device/{id}/inference/result`.
- **FR-9d-2:** Local UI dashboard — FastAPI + HTMX + Tailwind + Alpine.js + SSE; HTTPS on 8443; routes `/`, `/metrics`, `/sensors`, `/config`, `/admin`, `/logs`, `/auth`, `/grafana/` (reverse proxy on IQ-9/IQ-10 class). Every tile is an independent HTMX SSE fragment. See [design doc §3.4](../reference/device_system_design_approach.md).
- **FR-9d-2a:** Frame preview — `JpegPreviewSink` in `ne-data-plane` emits 1 fps downsampled JPEG with drawn boxes to MQTT `device/{id}/preview/jpeg`; dashboard renders via SSE. Configurable per use case via `device.preview_enabled` in Use Case YAML; default OFF for headless industrial, default ON for demos.
- **FR-9d-3:** Cloud Agent pushes telemetry to AWS IoT Core (MQTT) and bulk artifacts to S3.
- **FR-9d-4:** OTA Agent implements `IDeployTarget` interface (*§6.1*); MVP: `SshDockerComposeTarget`; v1: `+MenderTarget`, `+QualcommAiHubTarget`.
- **FR-9d-5:** JSON/XML emitter per-use-case schema; writes to local FS or POSTs to external endpoint.

### 9.e Device Management Layer (in `ne-control-plane`, Python)
- **FR-9e-1:** Prometheus node_exporter + custom inference exporter (latency p50/p95/p99, FPS, drops, warmup, engine cache hits).
- **FR-9e-2:** Model drift — KS-stat on feature distributions vs `ModelArtifact.metadata.feature_stats`; alarm on `p < 0.01`.
- **FR-9e-3:** AI metrics — confidence histograms, class balance over time, NMS suppression rate.
- **FR-9e-4:** Local console — `/admin` routes in `ne-external` FastAPI app.
- **FR-9e-5:** Container management endpoints via docker-py with audit log.

### 9.f Device Security Layer (`ne-security`)
- **FR-9f-1:** `ufw` deny-by-default; only 22 (Tailscale), 1883 (MQTT localhost), 8443 (UI HTTPS) open.
- **FR-9f-2:** mTLS end-to-end on EMQX.
- **FR-9f-3:** Read-only root FS for `ne-data-plane`; writable volumes only for `/var/lib/neuroedge`.
- **FR-9f-4:** SBOM (syft) + vuln scan (grype) at build; runtime scan (trivy) weekly.
- **FR-9f-5:** Wazuh agent reporting to central Wazuh manager on AWS.
- **FR-9f-6:** Secure boot + dm-verity where SoC supports; TPM/PSA-backed device identity.
- **FR-9f-7:** Signed Docker images via cosign + Notation v2; verify before run.
- **FR-9f-8:** Audit log shipper to CloudWatch (summaries only — no PII).

---

## 10. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Hot-path frame loop: < 5 ms overhead end-to-end excluding inference. ZMQ inproc, zero-copy `zmq_msg_init_data`. No allocations in steady state. |
| **Availability** | Per-container restart-on-failure with exponential backoff. Whole-stack uptime target ≥ 99.5% over rolling 30 days (excluding planned OTA). |
| **Resource budget** | On 8 GB RAM SKUs (Orin Nano, AIM-01): total RSS ≤ 4 GB, leaving 4 GB for OS + model engine + buffers. |
| **Footprint** | `ne-data-plane` image ≤ 800 MB (with TRT) / ≤ 400 MB (ONNX-only). Other containers ≤ 200 MB each. |
| **Portability** | Same Docker image runs on x86_64 + ARM64 (multi-arch). Same `ModelArtifact` deploys across all supported silicon. |
| **Security posture** | OWASP IoT Top 10 addressed; SBOM published; zero critical CVEs at release. |
| **Observability** | Every container exposes `/metrics` (Prometheus format) and `/healthz`. Inference results carry correlation IDs. |
| **OTA reliability** | Image-class OTA must roll back automatically within 60 s on failed health check. No bricked devices. |
| **Privacy** | No PII in telemetry by default; per-use-case masking declared in Use Case YAML. |
| **Time sync** | `chrony` to NTP; drift detection + TRT timestamps require it. |
| **Power** | Jetson `nvpmodel` envelope declarable in Use Case YAML; thermal throttling captured in metrics. |
| **Internationalization** | Local UI English-only at v1; structure leaves room for future locales. |

---

## 11. Dependencies

### External
- **NeuroEdge Web** — must publish `neuroedge-contracts` package + JSON Schemas as the contract source of truth.
- **AWS** — us-west-2, CloudBoost acct 975050071275; IAM creation may need CloudBoost portal (per project memory).
- **GitHub** — `cognizant/neuroedge-device` repo creation by Sanjeev.
- **Qualcomm AI Hub** — self-signup sufficient for MVP; Qualcomm contact needed for IQ-series farm/dev-kit access.
- **NVIDIA Jetson Loan Program** — physical Jetson Orin Nano kit for Phase 4 acceptance.
- **Mender** — open-source server self-hosted on AWS for v1.
- **Conan Center** — third-party C++ deps.
- **Vendor SDKs** (license-permitting): TensorRT, QNN, OpenVINO, Hailo, librealsense2.

### Internal
- `neuroedge_design_usecase` contracts (Web repo) — already pip-publishable.
- `agentic-assets` Claude Code skills, agents, hooks (already installed in Device repo).

---

## 12. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Qualcomm IQ-series early access blocked | Medium | High (delays Phase 8) | Use AIM-01/RB5 on public AI Hub farm as bridge; escalate via Sanjeev's Qualcomm contact |
| No physical Jetson kit for Phase 4 | Medium | Medium | g5.xlarge surrogate + calibration table; apply to Jetson Loan Program now |
| QNN runtime redistribution license restrictions | Medium | High (blocks customer ship) | Engage Qualcomm legal early; budget for commercial license |
| CloudBoost IAM denies `aws iam create-role` | Known | Low | Document workaround — provision IAM via CloudBoost portal first |
| EMQX latency on Orin Nano 8 GB exceeds budget under load | Low | Medium | Benchmark in Phase 2 gate; fall back to Mosquitto if EMQX too heavy |
| Cross-compile to L4T toolchain non-trivial | Medium | Medium | Build natively on borrowed Jetson; document Docker-buildx cross-compile path as Phase 4 stretch |
| Zscaler corp-net blocks HF / Roboflow at runtime (per memory) | Known | Low | Architecture already mandates all models flow through S3 — verify in CI |
| OEM partnerships slip — no validation of OEM hypothesis | Medium | High | Phase 8 outreach pinned to Lenovo first (closest silicon match) before broader push |
| C++17 toolchain divergence (older L4T BSPs ship gcc 9) | Low | Medium | Conan profiles pin compiler version per target; gcc 9 + C++17 is compatible |
| Wazuh manager hosting cost creep | Low | Low | Start `t3.small`, scale only if real noise |

---

## 13. Phased Scope

### MVP (Phases 0–3) — Validates the runtime hypothesis on x86 + cloud only

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|---|---|---|---|---|---|
| 0 | Bootstrap | git+CMake+Conan+CI scaffold; 4 image streams to ECR `:dev` | pending | - | - | [phase-0-bootstrap.plan.md](../plans/phase-0-bootstrap.plan.md) |
| 1 | Shared contracts + data plane skeleton | C++ header gen from JSON Schema; `ISensor` + `FileReplaySensor` + `RealSenseSensor` stub; `IInferenceBackend` + `OnnxRuntimeBackend` (CPU); ZMQ inproc | pending | - | 0 | [phase-1-data-plane-skeleton.plan.md](../plans/phase-1-data-plane-skeleton.plan.md) |
| 2 | Control plane + bus + UI | `ne-control-plane` + `ne-external`; EMQX with mTLS; rule engine; local UI | pending | - | 1 | TBD |
| 3 | Cloud emulation E2E | Terraform (ECR/S3/IoT/IAM/CloudWatch); QEMU ARM64 build pipeline; nightly TRT smoke on g5.xlarge | pending | - | 2 | TBD |

### v1 (Phases 4–7) — Real silicon coverage + OTA + security hardening

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|---|---|---|---|---|---|
| 4 | Real Jetson + RealSense | L4T base image; `TensorRTBackend`; full `RealSenseSensor`; nvpmodel + thermal in metrics | pending | - | 3 | TBD |
| 5 | OTA + multi-platform | `SshDockerComposeTarget`; `MenderTarget`; `QnnBackend` + `QualcommAiHubTarget`; 3-class change support with rollback | pending | with 6 | 4 | TBD |
| 6 | Security + observability | Read-only FS; cosign signing; SBOM (syft); Wazuh agent+manager; Prometheus + Grafana dashboards | pending | with 5 | 4 | TBD |
| 7 | RPi 5 + Qualcomm AIM-01 final | RPi 5 ONNX-CPU + thermal/wear; Qualcomm AIM-01 QNN on AI Hub farm | pending | - | 5, 6 | TBD |

### v2 (Phase 8+) — OEM readiness + extended silicon

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|---|---|---|---|---|---|
| 8 | OEM readiness + IQ + Hailo | `OpenVINOBackend`; `HailoBackend`; Qualcomm IQ-series onboarding; HCL v0.1; one co-marketed Lenovo demo | pending | - | 7 | TBD |

### Parallelism Notes
- Phase 5 (OTA) and Phase 6 (security + observability) **can run in parallel** because they touch disjoint surfaces — OTA agent vs supply-chain + observability infra. Both depend on Phase 4 (real Jetson hardware).
- Phase 8 is intentionally serial after Phase 7 — OEM pitch should not start until all three reference silicon families (NV, QC, RPi) are proven.

---

## 14. User Flow — Critical Path (MVP)

```
Web Portal           NeuroEdge Web                NeuroEdge Device                 Demo/Customer
   |                       |                            |                                |
   | use case YAML         |                            |                                |
   |---------------------> | train + optimize           |                                |
   |                       |--------------------------->| ModelArtifact (S3 + JSON)      |
   |                       |                            |                                |
   |                       |                            | docker compose up              |
   |                       |                            | (4+1 containers)               |
   |                       |                            |                                |
   |                       |                            | FileReplaySensor reads S3 clip |
   |                       |                            | OnnxRuntime CPU inference      |
   |                       |                            | Postproc → JSON               |
   |                       |                            | Cloud Agent → S3 results       |
   |                       |                            | Local UI shows live detections |
   |                       |                            |                                |
   |                       |                            | (later) weights-only OTA       |
   |                       |                            | hot reload < 5 s               |
   |                       |                            |                                |
   |                       |                            |--------------------------------> demo viewer
   |                       |                            |                                |
```

---

## 15. Technical Approach

**Feasibility:** HIGH for MVP (Phases 0–3, x86 + cloud only); MEDIUM for v1 (Phases 4–7, real hardware + OTA); MEDIUM-LOW for v2 (Phase 8, OEM dependencies outside our control).

**Architecture pointers:** see `device_system_design_approach.md` *§3* (architecture), *§4* (message bus), *§5* (emulation), *§6* (OTA), *§7* (Qualcomm), *§8* (no-device MVP), *§9* (OEM), *§10* (AWS), *§11* (phase plan).

**Implementation Contract (ECC-style summary):**
- **Actors** — Cognizant Edge AI Engineer, OEM Solution Architect, Customer Field Engineer.
- **Surfaces** — Local UI (HTTPS:8443), Cloud Agent (MQTT to AWS IoT Core), OTA endpoint (SSH + Mender), REST API (`ne-control-plane:8000`).
- **States** — `bootstrapping → idle → running → degraded → updating → rolled_back → failed`. State transitions emitted to MQTT `device/{id}/lifecycle/state`.
- **Inputs** — `UseCase` YAML, `ModelArtifact` JSON + weights file, sensor config YAML, rule YAML.
- **Outputs** — Inference results (JSON/XML), telemetry (Prometheus), audit log (CloudWatch), drift alarms (MQTT).
- **Data implications** — SQLite for metadata; named volumes for model storage; `tmpfs` for hot logs on flash-wear-sensitive devices.

---

## 16. Decisions Log

See `device_system_design_approach.md` §14.A. Key decisions reproduced for quick reference:

| Decision | Choice | Rationale |
|---|---|---|
| Repo structure | Separate `neuroedge-device` | Disjoint deps/CI/cadence vs Web |
| Primary language split | C++17 (hot) + Python 3.11 (mgmt) | Per-frame perf + management ergonomics |
| Pipeline strategy | Custom + GStreamer (NOT DeepStream primary) | Multi-silicon requirement |
| Container layout | 4 functional + 1 broker | RAM/maintenance on 8 GB SKUs |
| Messaging | EMQX MQTT 5 + ZMQ inproc | Cross-container vs zero-copy hot path |
| NVIDIA OTA | Mender | Vendor-neutral, free |
| Device UI | FastAPI + HTMX + Tailwind + Alpine.js + SSE | 6× smaller than Streamlit; server-driven; no Node on device |
| Frame preview on dashboard | `JpegPreviewSink`, configurable per use case (default off in industrial, on in demos) | Compelling demo asset without PII/bandwidth cost on headless deployments |
| First-tier backends | TRT, ONNX, QNN, OpenVINO | OEM coverage demand |
| C++ standard | C++17 | L4T BSP compatibility |
| Reference use case | PPE detection | Symmetric with Web side |

---

## 17. Open Questions

- [ ] GitHub remote `cognizant/neuroedge-device` — created? **Owner:** Sanjeev. **Blocks:** Phase 0.
- [ ] Qualcomm IQ-series (IQ-6/8/9/10) farm or dev-kit access — Qualcomm contact engaged? **Owner:** Sanjeev. **Blocks:** Phase 8.
- [ ] NVIDIA Jetson Loan Program application status. **Owner:** Sanjeev. **Blocks:** Phase 4 hardware acceptance gate.
- [ ] Wazuh manager hosting decision — self-host EC2 vs Wazuh Cloud. **Owner:** Sanjeev. **Blocks:** Phase 6.
- [ ] OEM partner shortlist for first co-marketed demo — Lenovo confirmed first? **Owner:** Sanjeev. **Blocks:** Phase 8.
- [ ] QNN runtime redistribution license — Qualcomm legal engagement. **Owner:** Sanjeev. **Blocks:** Customer ship.
- [ ] Mender server hosting — self-host vs Mender Hosted. **Owner:** Sanjeev. **Blocks:** Phase 5.
- [ ] RealSense udev rules + Docker capability documentation. **Owner:** TBD. **Blocks:** Phase 4.

---

## 18. Validation Status

| Section | Status |
|---|---|
| Problem Statement | Validated — restates a known pain pattern in Cognizant industrial AI delivery |
| User Research | Assumption — needs validation through Phase 8 OEM outreach |
| Technical Feasibility | Assessed — high for MVP, medium for v1, medium-low for v2 OEM dependencies |
| Success Metrics | Defined — needs refinement against first real customer engagement |
| Risk Catalogue | Drafted — needs re-review after Phase 3 gate |

---

## 19. Recommended Next Steps

1. **Resolve open questions 1, 3, 4** (GitHub repo, Jetson loan, Wazuh hosting) — these unblock Phases 0, 4, 6 respectively.
2. Run `/prp-plan PRD.md` for Phase 0 to generate the Phase 0 implementation plan.
3. Then run `/prp-plan PRD.md` for Phase 1 (can be started in parallel with Sanjeev finalizing repo creation).
4. Phase 0 + Phase 1 deliver enough to demo "model runs on x86 with FileReplay" in ~2.5 weeks of solo work.

---

*Generated: 2026-05-28*
*Status: DRAFT — architecture-locked, scope-locked, validation pending against first real OEM customer.*
