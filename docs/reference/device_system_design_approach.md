# NeuroEdge Device — System Design Approach

**Status:** Approved design baseline
**Owner:** Sanjeev Kumar (sanjeev.kumar@cognizant.com)
**Last updated:** 2026-05-28
**Companion docs:** `device_edge_pipeline.md` (requirements), `EdgeX_Foundry.pdf`, `Neuro Ege Arch_Generic Open Sourcen.pdf`

---

## 1. Executive summary

NeuroEdge Device is the on-device runtime of the NeuroEdge cloud-agnostic Edge AI MLOps platform. It runs the model produced by the NeuroEdge Web side, ingests data from physical sensors, performs inference, post-processes results, and reports back to the cloud or local consumers. It targets multiple silicon families (NVIDIA, Qualcomm, AMD, Intel, Hailo, ARM-CPU-only) and multiple system OEMs (Dell, HP, Lenovo, Penguin, Inventec, Advantech).

**Top-level decisions (locked):**

| Topic | Decision |
|---|---|
| Repo | Separate `neuroedge-device` repo, sharing only `neuroedge_design_usecase` contracts with `neuroedge-web` |
| Primary language | C++17 (hot path) + Python 3.11 (management plane) |
| Pipeline strategy | Custom NeuroEdge pipeline with pluggable inference backends; GStreamer for video plumbing |
| Container layout | 4 functional + 1 broker = 5 containers, toggleable per use case |
| Message bus (device↔device, device↔cloud) | EMQX (MQTT 5 with mTLS) |
| Intra-container hot-path bus | ZeroMQ inproc (zero-copy) |
| OTA — NVIDIA | Mender (vendor-neutral) |
| OTA — Qualcomm | Qualcomm AI Hub device farm + SSH/Docker-compose target |
| OTA — RPi / generic | SSH/Docker-compose (rsync over Tailscale) |
| Local UI | FastAPI + HTMX (not Streamlit) |
| Cloud emulation | QEMU ARM64 (Tier-1) + g5.xlarge (Tier-2) + AI Hub farm (Tier-3) |
| AWS infra | Reuse `us-west-2`, CloudBoost acct `975050071275`; Terraform under `infra/terraform/` |

---

## 2. Foundational decisions and rationale

### 2.1 Repo separation
Web and Device have disjoint dependencies, build systems, CI matrices, and release cadences. A monorepo would force every device build to drag in PyTorch/MLflow tooling and vice versa. Shared contracts live in the `neuroedge_design_usecase` package, published as `neuroedge-contracts` on PyPI/git, with C++ headers auto-generated from JSON Schema in CI.

### 2.2 C++17 + Python (split-stack)
| Concern | Implementation |
|---|---|
| Camera capture, frame DMA, inference call, post-proc | **C++17** in `ne-data-plane` |
| Config service, command service, rule engine, OTA agent, metrics, UI | **Python 3.11** in `ne-control-plane`, `ne-external` |
| Containerization | All containers communicate over EMQX MQTT only |
| Toolchain | CMake + Conan 2 (per-target profiles: `jetson-l4t36`, `aim01-qrb5165`, `iq6-qcs6490`, `rpi5-bookworm`, `x86-ubuntu2204`) |

Rationale: C++ is mandatory at 25–60 FPS on power-constrained NPUs; Python is the right tool for everything that isn't per-frame. In-process Python embedding inside C++ was rejected — too fragile across libc/Python ABI variations on Jetson/Qualcomm BSPs.

### 2.3 Pipeline approach: custom + GStreamer
DeepStream is excluded as the primary path because it is NVIDIA-only and your target portfolio spans Qualcomm, AMD, Intel, Hailo. Custom pipeline uses GStreamer as a video transport (well-supported on every Linux SoC), with NeuroEdge plugins for inference, sensor adapters, and post-processing. On Jetson, DeepStream plugins can optionally drop into the GStreamer graph as an accelerator.

### 2.4 Shared contracts strategy
- `UseCase`, `ModelArtifact`, `OptimizationPackage`, `PipelineStatus` defined once in `neuroedge_design_usecase` (Pydantic + JSON Schema).
- Python side: import the package directly.
- C++ side: JSON Schema → `quicktype` → C++17 headers, regenerated in CI.

---

## 3. Architecture

### 3.1 Layered model (EdgeX-aligned)

| Layer | Responsibilities |
|---|---|
| **a. Device Services** | Sensors (RealSense, V4L2, generic camera), industrial bus (Modbus, OPC-UA), MQTT pull, REST pull, file replay (for emulation) |
| **b. Services** | Command, Config, Metadata, Rule Engine, Scheduler, Logging |
| **c. AI Inference** | Pluggable backends: TensorRT, ONNX Runtime, QNN, OpenVINO, Hailo, future |
| **d. External Interface** | Post-inference processor, Local UI, Cloud Agent, OTA Agent, REST/MQTT bridge, JSON/XML emitter |
| **e. Device Management** | Metrics (Prometheus), drift detection, container mgmt, local admin console |
| **f. Device Security** | Port hardening, IDS (Wazuh), audit log shipper, signed images, TPM-backed identity |

### 3.2 Container layout (4 functional + 1 broker)

```
+----------------------+    +---------------------+    +-----------------+
|   ne-data-plane      |    |  ne-control-plane   |    |  ne-external    |
|  (C++)               |    |  (Python/FastAPI)   |    |  (Python)       |
|                      |    |                     |    |                 |
|  • Device Services   |    |  • Command Svc      |    |  • Postproc     |
|  • AI Inference      |    |  • Config Svc       |    |  • Local UI     |
|  • Post-inference    |    |  • Metadata Svc     |    |  • Cloud Agent  |
|    core              |    |  • Rule Engine      |    |  • OTA Agent    |
|                      |    |  • Scheduler        |    |  • Ext API call |
|  ZMQ inproc inside   |    |  • Mgmt collector   |    |                 |
+----------+-----------+    +---------+-----------+    +--------+--------+
           |                          |                         |
           +-----------+--------------+-------------+-----------+
                       |                            |
                       v                            v
                 +-----------+               +-------------+
                 |  ne-bus   |               | ne-security |
                 |  (EMQX)   |               | (Wazuh agt) |
                 +-----------+               +-------------+
```

**Why 4+1 not 6:**
- Single-tenant trust boundary — no isolation benefit from per-layer containers.
- 8 GB RAM SKUs (Orin Nano, AIM-01) cannot afford 6+ container overhead (~30–80 MB per container at idle).
- Maintenance: 4 images to build/sign/scan, not 6.

**Service on/off control:** Each container exposes a process supervisor; sub-services (e.g., Streamlit UI inside `ne-external`) are toggled by feature flags in `config/services.yaml`. Whole containers can be disabled in `docker-compose.yaml` per use case profile.

### 3.3 Layer details

#### a. Device Services Layer (C++ in `ne-data-plane`)
Abstract base class:
```cpp
class ISensor {
public:
  virtual ~ISensor() = default;
  virtual bool open(const SensorConfig&) = 0;
  virtual std::optional<Frame> next() = 0;          // for vision
  virtual std::optional<Sample> nextSample() = 0;   // for TS
  virtual void close() = 0;
};
```
Concrete implementations:
- `RealSenseSensor` (librealsense2 C API, RGB + depth + alignment)
- `V4L2Sensor` (generic USB/CSI camera)
- `GStreamerSensor` (RTSP, file, GStreamer pipeline)
- `ModbusSensor` (libmodbus, industrial RTU/TCP)
- `OpcUaSensor` (open62541)
- `MqttPullSensor`
- `RestPullSensor`
- `FileReplaySensor` (essential for emulation)

Hot-plug via `config/sensors.yaml`. Frames flow into a Boost.Lockfree SPSC queue.

#### b. Services Layer (Python in `ne-control-plane`)
- **Command Service** — REST API: `/start`, `/stop`, `/reconfigure`, `/healthz`.
- **Config Service** — pushes config via MQTT `device/{id}/config/apply`.
- **Metadata Service** — SQLite on `/var/lib/neuroedge/metadata.db`.
- **Rule Engine** — `business-rules` library, evaluates post-inference events; rules YAML-defined per use case.
- **Scheduler** — APScheduler for periodic tasks (health pings, log rotation, metric flush).
- **Logging** — structlog → journald → OTLP exporter.

#### c. AI Inference Layer (C++ in `ne-data-plane`)
Abstract base class:
```cpp
class IInferenceBackend {
public:
  virtual ~IInferenceBackend() = default;
  virtual bool load(const ModelArtifact&) = 0;
  virtual InferenceResult infer(const Frame&) = 0;
  virtual void unload() = 0;
  virtual BackendCapabilities capabilities() const = 0;
};
```
Concrete implementations:
- `TensorRTBackend` (Jetson, x86+NV)
- `OnnxRuntimeBackend` (universal fallback; CPU + CUDA EP + DML EP)
- `QnnBackend` (Qualcomm AIM-01, IQ-6/8/9/10 series, RB-series)
- `OpenVINOBackend` (Intel CPU + iGPU + VPU)
- `HailoBackend` (Hailo-8 add-in cards on Intel-based OEM systems)
- `TfLiteBackend` (lightweight fallback for ARM CPUs with XNNPACK)

Factory: `BackendFactory::create(model_artifact.json)` reads the manifest from `/var/lib/neuroedge/models/` volume.

Model storage: Docker named volume `neuroedge-models` mounted RO into `ne-data-plane`. Atomic replace on weight-only OTA:
```
/var/lib/neuroedge/models/<use_case_id>/
  current -> v3/
  v1/
  v2/
  v3/
    model.onnx
    model.engine.jetson-l4t36  (cached engine, regenerated if cache miss)
    model.bin.qnn-htp
    manifest.json
```

#### d. External Interface Layer (Python in `ne-external`)
- **Post-inference processor** — Python plugin per use case; subscribes to MQTT `device/{id}/inference/result`; emits enriched JSON or XML.
- **Local UI** — FastAPI + HTMX + Tailwind + Alpine.js + SSE. Full design in §3.4. ~30 MB RSS, vs Streamlit ~200 MB.
- **Cloud Agent** — pushes telemetry to AWS IoT Core (MQTT) and bulk artifacts to S3.
- **OTA Agent** — see §6.
- **External API caller** — outbound integrations (ERP, MES, ServiceNow, Salesforce) via plugin.
- **JSON/XML emitter** — per-use-case schema; writes to local FS or POSTs to external endpoint.

#### e. Device Management Layer (Python in `ne-control-plane`)
- **Metrics** — Prometheus node_exporter + custom inference exporter (latency p50/p95/p99, FPS, dropped frames, backend warmup time, engine cache hits).
- **Model drift** — Kolmogorov-Smirnov stat on feature distribution vs `ModelArtifact.metadata.feature_stats`; alarm on `p < 0.01`.
- **AI metrics** — confidence histograms, class balance over time, per-class FPS, NMS suppression rate.
- **Local console** — `/admin` routes in the same FastAPI app.
- **Container mgmt** — docker-py REST endpoints with audit log.
- **Logs** — journald + Loki sidecar (optional, only on IQ-9/IQ-10 class).

#### f. Device Security Layer (`ne-security`)
1. `ufw` deny-by-default at host. Open: 22 (Tailscale only), 1883 (MQTT, localhost), 8443 (UI HTTPS).
2. **mTLS** end-to-end on EMQX.
3. **Read-only root FS** for `ne-data-plane`; writable volumes only.
4. **SBOM** generated at build (syft); uploaded with image.
5. **Vuln scan** at build (grype) + runtime weekly (trivy).
6. **Wazuh agent** reporting to central Wazuh manager on AWS.
7. **Secure boot + dm-verity** where SoC supports it (Jetson ✓, Qualcomm ✓, RPi 5 partial).
8. **TPM/PSA-backed device identity** (Jetson fTPM, Qualcomm QSEE, RPi 5 software-bound key).
9. **Signed Docker images** (cosign + Notation v2).
10. **Audit log shipper** to CloudWatch (summaries only, no PII).

### 3.4 Local UI Dashboard (`ne-external` web console)

The on-device dashboard is the operator's primary surface — live status, configuration, and admin actions — and a sales surface in OEM demos. It runs inside `ne-external` and is reachable at `https://<device>:8443/`.

#### 3.4.1 Stack
| Piece | Role | Footprint |
|---|---|---|
| **FastAPI + Jinja2** | HTTP server + server-rendered HTML fragments | ~25 MB RSS |
| **HTMX** (~14 KB, served from `/static`) | `hx-get`/`hx-post`/`hx-swap` for AJAX without a SPA | trivial |
| **HTMX SSE extension** | Live updates (detections, metrics, drift alarms) | uses HTTP |
| **Tailwind CSS** standalone binary | Utility styling, compiled at image build — no Node on device | 0 MB runtime |
| **Alpine.js** (~15 KB) | Small client-side reactivity (modals, dropdowns) | trivial |

Total container RSS ~30 MB. No Node toolchain on device; CSS built once at image build via the standalone Tailwind binary.

#### 3.4.2 Page map

| Route | Purpose | Phase |
|---|---|---|
| `/` | Live view: detections preview tile, FPS/latency/drift KPIs, sensor status, recent events | 2 |
| `/metrics` | Prometheus passthrough + 4 charts (FPS, latency, drops, drift) | 2 |
| `/sensors` | List sensors, toggle on/off, last frame thumbnail | 2 / 4 (real RealSense) |
| `/config` | View + edit YAML config with schema validation | 2 |
| `/admin` | Start/stop containers, view model version, manual OTA trigger | 5 |
| `/logs` | Tail journald via SSE | 2 |
| `/healthz` | Machine-readable JSON status | 0 (done) |
| `/auth` | OIDC or basic-auth login | 6 |
| `/grafana/` (reverse proxy) | Deep observability (only on IQ-9/IQ-10 class with Grafana sidecar) | 6 |

Every tile on `/` is an independent HTMX fragment with its own SSE channel — independent refresh cadence, no full-page reload, graceful degradation if one panel's data stops flowing.

#### 3.4.3 Frame preview ("the wow moment")

`JpegPreviewSink` (in `ne-data-plane`, C++) emits a downsampled JPEG with detection boxes drawn, at 1 fps, to MQTT topic `device/{id}/preview/jpeg`. `ne-external` proxies the latest JPEG to the dashboard via SSE.

- **Default:** on (compelling for ops + demos).
- **Configurable per use case** via Use Case YAML field `device.preview_enabled: bool`.
- **Cost:** ~5–10% extra CPU on Orin Nano at 25 fps. **Off by default for headless industrial deployments** where PII or bandwidth matters.

#### 3.4.4 Why this stack (not the alternatives)

| Option | Verdict | Reason |
|---|---|---|
| **Streamlit** | ❌ rejected | ~200 MB RSS; Tornado + WebSocket overhead; wrong shape for ops/admin UI |
| **Gradio** | ❌ rejected | Same heavy class; ML-demo-shaped |
| **NiceGUI** | ✅ runner-up | Python-only, ~80 MB RSS, Vue under the hood. Pick if team refuses HTMX |
| **React/Vue SPA** | ❌ rejected for v1 | Needs Node toolchain or pre-bundled assets; no user-visible benefit for read-mostly pages |
| **Plain HTML + REST polling** | ❌ rejected | Reinventing HTMX badly |
| **TUI / Cockpit** | ❌ out of scope | Useful for headless ops; wrong UX for OEM demos |
| **Grafana** | ✅ complementary | Used for metrics dashboards in Phase 6 at `/grafana/`; not the operator console |

#### 3.4.5 Container layout
```
containers/ne-external/
├── Dockerfile               # python:3.11-slim, ~150 MB total
└── (Tailwind CLI runs once at image build → static/tailwind.css)

services/ne-external/ne_external/
├── app.py                   # FastAPI, mounts routers
├── routes/                  # live.py, metrics.py, sensors.py, config.py, admin.py, logs.py
├── templates/               # Jinja2 partials targeted by HTMX hx-swap
└── static/                  # htmx.min.js, htmx-sse.min.js, alpine.min.js, tailwind.css
```

---

## 4. Message bus

### 4.1 Choice: EMQX + ZeroMQ inproc

| Use | Bus |
|---|---|
| Inside `ne-data-plane` (sensor → inference → postproc, per frame) | **ZeroMQ inproc**, zero-copy |
| Container ↔ container | **EMQX MQTT 5** with mTLS |
| Device ↔ cloud | **EMQX bridged to AWS IoT Core** |

### 4.2 Overhead on edge

| Platform | EMQX RSS idle | EMQX CPU at 1000 msg/s |
|---|---|---|
| Jetson Orin Nano 8 GB | ~80 MB | 1–2% |
| AIM-01 (QRB5165) | ~80 MB | 2–3% |
| IQ-6 (4 GB SKU) | ~70 MB | 3–5% |
| RPi 5 (8 GB) | ~80 MB | 2% |

Acceptable on all targets. Hot-path inference data does NOT go over MQTT — only metadata, control, and inference *results* (small JSON, ~1 kB/event).

### 4.3 Topic taxonomy
```
device/{id}/sensor/{name}/sample            # rare — only for debug
device/{id}/inference/result                # detections, classifications
device/{id}/inference/event                 # rule-engine-derived alert
device/{id}/telemetry/metric                # Prometheus passthrough
device/{id}/config/apply                    # control-plane → data-plane
device/{id}/model/reload                    # OTA weight-only hot reload
device/{id}/lifecycle/heartbeat
device/{id}/lifecycle/state
neuroedge/cloud/cmd/{cmd_id}                # cloud → device
neuroedge/cloud/ack/{cmd_id}                # device → cloud
```

---

## 5. Cloud emulation and end-to-end testing

### 5.1 Tiered test strategy

| Tier | Compute | Backend | Sensor | Coverage | Frequency |
|---|---|---|---|---|---|
| **Tier 0** | Dev laptop (x86) | OnnxRuntime CPU | FileReplay | Logic, plumbing | Every PR |
| **Tier 1** | QEMU ARM64 in CI | OnnxRuntime CPU | FileReplay | ARM portability | Every PR |
| **Tier 2** | AWS g5.xlarge | TensorRT | FileReplay | NV path realism | Nightly |
| **Tier 3** | Qualcomm AI Hub farm | QNN | Synthetic stream | QC path realism | Pre-release |
| **Tier 4** | Vendor loaner kit | Native | Real RealSense | Sensor + thermal + power | Pre-release |
| **Tier 5** | OEM-supplied unit | Native | Real industrial sensor | Final acceptance | Pre-ship to customer |

### 5.2 What QEMU emulates well vs poorly
**Well:**
- ARM64 user-space code, glibc/musl quirks
- File I/O, network, MQTT, Modbus over TCP
- ONNX Runtime CPU execution path
- OTA agent, Docker compose lifecycle

**Poorly / not at all:**
- TensorRT (no virtualized GPU)
- Jetson Multimedia API / libargus
- QNN Hexagon DSP
- Hardware secure boot / TPM flows
- USB device passthrough (workable but fragile for RealSense)

→ Use QEMU for everything that runs on the CPU; use cloud GPU or AI Hub farm for accelerator paths.

### 5.3 QEMU image build pipeline
- Base: Debian 12 ARM64 + cloud-init + Docker + Tailscale + neuroedge bootstrap
- Builder: `linuxkit` (declarative, reproducible) **or** `bdebstrap` + `genimage`
- Output: `.qcow2` + `.tar.gz`, stored in `s3://neuroedge-device-qemu-975050071275/`
- CI: GitHub Actions matrix per (arch, distro), weekly + on dispatch
- Smoke test: boot in QEMU, run `health-check`, exit 0 (gated)

---

## 6. OTA / device deployment

### 6.1 OOP design — `IDeployTarget`
```cpp
struct DeployReceipt {
  std::string deploy_id;
  std::string device_id;
  std::string artifact_version;
  std::chrono::system_clock::time_point ts;
  enum class Status { Pending, Applied, Failed, RolledBack } status;
  std::string error;
};

class IDeployTarget {
public:
  virtual ~IDeployTarget() = default;
  virtual DeployReceipt push(const ImageBundle&) = 0;
  virtual DeployReceipt rollback() = 0;
  virtual HealthReport health() = 0;
};
```

### 6.2 Concrete targets

| Target | Platform | Mechanism |
|---|---|---|
| `SshDockerComposeTarget` | Any Linux | rsync compose + `docker compose pull && up -d` over SSH/Tailscale |
| `MenderTarget` | NVIDIA Jetson (preferred), RPi | Mender server on AWS, Mender client on device |
| `QualcommAiHubTarget` | Qualcomm farm (testing) | AI Hub REST API: upload model, trigger benchmark, fetch artifacts |
| `BalenaTarget` | Future | Deferred per project memory |

### 6.3 Three change classes

| Class | Mechanism | Restart? |
|---|---|---|
| **config-only** | MQTT `device/{id}/config/apply` | No, in-process |
| **weights-only** | rsync new `.onnx`/`.engine`/`.bin` → MQTT `device/{id}/model/reload` | No, hot-swap in `ne-data-plane` (<5 s) |
| **image-change** | SSH push compose → `docker compose up -d` with health gate | Rolling restart, 60 s rollback |

### 6.4 NVIDIA OTA alternative
**Mender** is chosen (open-source, vendor-neutral). NVIDIA Fleet Command (managed) is the paid alternative — defer to post-MVP unless customer demands it.

---

## 7. Qualcomm platform strategy

### 7.1 Platform matrix

| SKU | SoC | RAM | NPU TOPS | AI Hub farm? | 4+1 layout |
|---|---|---|---|---|---|
| **AIM-01** | QRB5165 (Hexagon 698) | 8 GB | ~15 | ✅ Public | ✅ tight |
| **RB5** | QRB5165 | 8 GB | ~15 | ✅ Public | ✅ |
| **RB6** | QCS6490 | 8 GB | ~12 | ✅ Public | ✅ |
| **IQ-6 series** | QCS6490 class | 4–8 GB | ~12 | ❌ (need Qualcomm contact) | ✅ on 8 GB, collapse to 3 on 4 GB |
| **IQ-8** | (industrial mid) | 8–12 GB | ~30 | ❌ (early access) | ✅ Full |
| **IQ-9** | (industrial high) | 16+ GB | 50–75 | ❌ (early access) | ✅ Full + on-box observability |
| **IQ-10** | (industrial top) | 16+ GB | 75–100 | ❌ (early access) | ✅ Full + multi-model |

### 7.2 QNN integration
- Build container with QNN SDK (Qualcomm Software Center download, redistribution per license).
- Mount `--device /dev/dsp*` and `/lib/firmware/qcom`.
- Model compile path: ONNX → `qnn-onnx-converter` → Hexagon binary; cached in `/var/lib/neuroedge/models/<id>/model.bin.qnn-htp`.
- Containerize `libQnnHtp.so` + `libQnnSystem.so`; ~80 MB.

### 7.3 IQ-6 / IQ-8 / IQ-9 / IQ-10 status
Announced May 2025 for industrial IoT. **Not on public AI Hub farm as of 2026-05-28.** Action: Sanjeev's Qualcomm contact to negotiate:
1. Early-access dev kit (IQ-8 or IQ-10) — preferred
2. Private farm slot for IQ-6 — backup
3. Volume QNN runtime licensing terms for shipping to customers

### 7.4 AI Hub access (no Qualcomm help needed)
Self-signup at https://aihub.qualcomm.com/ using Qualcomm ID, Google, or GitHub. Free tier covers compilation + queued benchmarks on AIM-01/RB5/RB6/8550 HDK/8650 HDK. Sufficient for MVP demo on Qualcomm path.

---

## 8. MVP without physical devices

### 8.1 Strategy
Deliver a demo-quality MVP with **zero owned hardware** using five surrogate tiers:

| Tier | What it proves | How |
|---|---|---|
| **T0 — local x86** | Pipeline logic, plumbing, contracts | Docker Desktop, FileReplaySensor, ONNX-CPU |
| **T1 — cloud GPU as Jetson surrogate** | TRT path, NV performance shape | g5.xlarge with TensorRT, calibration table to Orin Nano |
| **T2 — Qualcomm AI Hub** | QNN path, AIM-01 real numbers | AI Hub farm, no hardware needed |
| **T3 — Arm Virtual Hardware** | RPi-class ARM perf shape | AWS-hosted Cortex-A virtualization |
| **T4 — vendor loaner kits** | Final demo on real hardware | NVIDIA Jetson Loan Program (4 wk, free); Qualcomm Innovators kit; Intel Edge AI dev kit |

### 8.2 Calibration tables
For each tier, capture a calibration table `cloud_perf × hardware_factor = device_perf`:

```yaml
# infra/calibration/jetson_orin_nano.yaml
reference_device: g5.xlarge with TensorRT
target_device: Jetson Orin Nano 8 GB
calibration_runs: 1000 frames, YOLOv8n @ 640x640, FP16
ratio_fps: 0.34          # Orin Nano gets ~34% of g5.xlarge FPS
ratio_latency_p50: 2.9
ratio_latency_p99: 3.4
confidence: high          # measured Apr 2026 on borrowed unit
last_measured: 2026-04-15
```

These get applied in demo dashboards so projected numbers are labeled and credible.

### 8.3 Demo storyline
1. **Open** — same Docker image on three cloud surrogates, identical pipeline, three target SKUs simulated.
2. **Highlight** — push a weights-only OTA from the web portal to the AI Hub farm device; show hot-reload live on stage.
3. **Close** — show the calibration table and projected on-device numbers; offer to schedule a "hardware-in-the-loop" follow-up with a borrowed unit.

### 8.4 Loaner programs (apply now)
- NVIDIA Jetson Loan Program — https://developer.nvidia.com/embedded/jetson-loaner-program
- Qualcomm Innovators Program — https://www.qualcomm.com/developer/innovators
- Intel Edge AI Reference Kit — https://www.intel.com/content/www/us/en/developer/topic-technology/edge-ai/reference-kits.html
- Hailo Developer Program — https://hailo.ai/developer-zone/

---

## 9. OEM strategy (Dell, HP, Lenovo, Penguin, Inventec, Advantech)

### 9.1 Positioning
NeuroEdge is the **silicon- and OEM-agnostic edge AI software stack**. OEMs bundle silicon into form factors; NeuroEdge runs identically on any of them. Cognizant sells NeuroEdge *to* OEMs as a co-marketed value-add ("Certified for NeuroEdge"), and *to* their end customers as the deployment platform.

### 9.2 Target OEM mapping

| OEM | Typical edge product | Silicon | NeuroEdge fit |
|---|---|---|---|
| **Dell** | NativeEdge platform, Edge Gateway 5200 | Intel Xeon-D, Atom; optional NV | OpenVINO + TRT backends |
| **HP** | Edgeline EL8000, Z by HP workstations | Intel Xeon-D, NV RTX | OpenVINO + TRT |
| **Lenovo** | ThinkEdge SE30, SE50, SE70 | SE30/50 Intel + Movidius; SE70 NV Orin | OpenVINO + TRT |
| **Penguin Computing** | Relion / Tundra edge | Intel + AMD + NV HGX | TRT + OpenVINO + ROCm (future) |
| **Inventec** | ODM custom | Spec-driven | NeuroEdge ports per spec |
| **Advantech** | UNO / ECU series | Intel + Hailo, Intel + Qualcomm modules | OpenVINO + Hailo + QNN |

### 9.3 OEM ask list (deliverables for OEM partnerships)
1. **Hardware Compatibility List (HCL)** — formally tested SKU x silicon x distro matrix.
2. **Pre-built container images** — per (silicon, distro), tested and signed.
3. **OEM device onboarding workbook** — step-by-step for field engineers, ~20 pages.
4. **Co-branded reference demos** — one per OEM, runs on their flagship edge SKU.
5. **Sales kit** — TCO calculator, ROI worksheets, sample customer wins.

### 9.4 Backend coverage roadmap implications
Folded into AI Inference layer for the OEM go-to-market:
- **OpenVINO** — promoted to first-tier (Dell, HP, Lenovo, Advantech all need it).
- **Hailo** — added to roadmap (Advantech, some Lenovo SKUs ship Hailo-8).
- **TRT + ONNX-CPU + QNN** — already in scope.
- **ROCm** (AMD) — added to backlog for Penguin co-eng.

---

## 10. AWS infrastructure provisioning

Reuse conventions from the Web project: `us-west-2`, CloudBoost account `975050071275`, role `cloudboost_account_operator`.

### 10.1 Resources (Terraform under `infra/terraform/`)
- ECR repo `neuroedge-device` with 5 image streams: `data-plane`, `control-plane`, `external`, `security`, `broker`.
- S3 buckets:
  - `neuroedge-device-artifacts-975050071275` — built images, SBOMs, signed manifests
  - `neuroedge-device-results-975050071275` — inference results from emulation runs
  - `neuroedge-device-qemu-975050071275` — QEMU image artifacts
  - reuse existing `neuroedge-artifacts-*` and `neuroedge-usecases-*` for models and use case YAMLs
- AWS IoT Core: thing type `neuroedge-device`, topics `neuroedge/+/telemetry`, `neuroedge/+/results`.
- IAM role `NeuroEdgeDeviceProvisioning` (least-privilege: ECR pull, S3 read models/write results, IoT publish).
- EC2 GPU `g5.xlarge` spot for nightly TRT smoke (Tier 2).
- Wazuh manager `t3.small` (~$15/mo).
- CloudWatch log group `/neuroedge/device/*`.

### 10.2 Workspaces
`dev` and `demo` Terraform workspaces; `prod` deferred to customer-environment-specific overlays.

### 10.3 IAM caveat
CloudBoost role may block `aws iam create-role` — provision IAM via CloudBoost portal first time; automate everything else.

---

## 11. Phase plan

Each phase ~2 working weeks solo, gated by acceptance criteria.

### Phase 0 — Bootstrap (3 days)
- `git init`, push to GitHub `cognizant/neuroedge-device` (Sanjeev creates remote).
- CMake + Conan scaffold; pre-commit (cpplint, clang-format, ruff).
- CI: builds x86_64 + ARM64 Docker images, pushes to ECR `:dev`.
- `architect` agent validates project layout.
- **Gate:** `make build` produces 4 images locally; CI green.

### Phase 1 — Shared contracts + data plane skeleton (2 weeks)
- Generate C++ headers from `neuroedge_design_usecase` JSON schemas.
- Implement `ISensor` + `FileReplaySensor` + `RealSenseSensor` stub.
- Implement `IInferenceBackend` + `OnnxRuntimeBackend` (CPU).
- ZMQ inproc bus; stdout sink for results.
- `cpp-reviewer` + `python-reviewer` agents on every PR.
- **Gate:** `ne-data-plane` runs on x86, replays sample video, emits YOLOv8n detections.

### Phase 2 — Control plane, message bus, local UI (2 weeks)
- `ne-control-plane`: FastAPI + SQLite + APScheduler.
- `ne-external`: FastAPI+HTMX device console + JSON uploader.
- EMQX broker container; mTLS between containers.
- Rule engine (Python) on inference events.
- **Gate:** Browser at `http://localhost:8443` shows live detections + metrics; services toggleable via API.

### Phase 3 — Cloud emulation E2E (1.5 weeks)
- Terraform: ECR, S3, IoT Core, IAM, CloudWatch.
- QEMU ARM64 image build pipeline.
- `g5.xlarge` nightly TRT smoke.
- Cloud Agent publishes to AWS IoT Core; results land in S3.
- **Gate:** Tag push → CI → QEMU boot → FileReplay use case → S3 results + CloudWatch telemetry. Zero manual steps.

### Phase 4 — Real Jetson + RealSense (2 weeks; surrogate-only if no kit yet)
- L4T base image; cross-compile or build on device.
- `TensorRTBackend` impl; engine cache in volume.
- `RealSenseSensor` full impl.
- nvpmodel + thermal in metrics.
- **Gate:** Jetson Orin Nano hits use-case-specified FPS on PPE use case. If no kit: g5.xlarge surrogate + calibration table; document gap.

### Phase 5 — OTA + multi-platform (2 weeks)
- `SshDockerComposeTarget` end-to-end (Tailscale).
- `MenderTarget` integration.
- `QnnBackend` skeleton + `QualcommAiHubTarget`.
- Three change classes wired end-to-end with rollback.
- **Gate:** Weights-only push from web portal hot-reloads device in <5 s.

### Phase 6 — Security + observability hardening (1.5 weeks)
- Read-only root FS, `ufw`, cosign image signing, SBOM (syft).
- Wazuh agent on device; manager on AWS.
- Prometheus + Grafana dashboards.
- **Gate:** `security-reviewer` + `silent-failure-hunter` agents pass; SBOM + scan in CI artifacts.

### Phase 7 — RPi 5 + Qualcomm AIM-01 finalization (2 weeks)
- RPi 5 ONNX-CPU path + thermal/wear adaptations.
- Qualcomm AIM-01 QNN path on AI Hub farm.
- **Gate:** All three target SKUs run PPE use case from same artifact bundle.

### Phase 8 — OEM-readiness + IQ-series + Hailo (3 weeks)
- OpenVINO backend impl.
- Hailo backend impl (needs dev kit or OEM-supplied Hailo-8 unit).
- IQ-series dev kit onboarding (when Qualcomm provides).
- HCL document v0.1.
- One OEM reference demo (likely Lenovo ThinkEdge SE70 — closest to existing Jetson path).
- **Gate:** HCL published; demo deck + workbook ready for OEM pitch.

---

## 12. Other edge concerns

1. **Time sync** — `chrony` to NTP; TRT timestamps + drift detection require it.
2. **Watchdog** — hardware on Jetson/Qualcomm; software on RPi.
3. **Power management** — Jetson `nvpmodel` profiles; Qualcomm power islands; declared in Use Case YAML.
4. **Storage wear** — `tmpfs` for hot logs on RPi (SD card wear); periodic flush to S3.
5. **PII / telemetry policy** — mask before shipping; documented in Use Case YAML.
6. **Zscaler restriction** (per user memory) — device must NEVER call HF/Roboflow at runtime; all models from S3.
7. **Camera udev rules** — librealsense2 needs them; document per OS.
8. **Orin Nano 8 GB memory pressure** — start at `max_batch_size=1`; profile before raising.
9. **Thermal** — capture `/sys/class/thermal/thermal_zone*/temp` in metrics on every SKU.
10. **Healthcare/PHI** — if a healthcare use case lands on device, mandatory `healthcare-reviewer` agent review.

---

## 13. Open items

| # | Item | Owner | Blocker for |
|---|---|---|---|
| 1 | GitHub repo `cognizant/neuroedge-device` creation | Sanjeev | Phase 0 |
| 2 | Qualcomm IQ-series farm/dev-kit access (IQ-6/8/9/10) | Sanjeev (Qualcomm connect) | Phase 8 |
| 3 | NVIDIA Jetson Loan Program application | Sanjeev | Phase 4 hardware acceptance |
| 4 | Wazuh manager hosting decision (AWS EC2 vs managed) | Sanjeev | Phase 6 |
| 5 | OEM partner shortlist for first co-marketed reference demo | Sanjeev | Phase 8 |
| 6 | QNN runtime redistribution license check with Qualcomm legal | Sanjeev | Customer ship |
| 7 | Mender server hosting (self-host vs Mender Hosted) | Sanjeev | Phase 5 |
| 8 | RealSense udev rules / Docker capabilities documentation | TBD | Phase 4 |

---

## 14. Appendices

### A. Decision log
| Date | Decision | Rationale |
|---|---|---|
| 2026-05-28 | Separate repo `neuroedge-device` | Disjoint deps/CI/cadence |
| 2026-05-28 | C++17 + Python split-stack | Per-frame perf + management ergonomics |
| 2026-05-28 | Implementation B (custom pipeline) | Multi-silicon requirement excludes DeepStream as primary |
| 2026-05-28 | 4+1 containers | RAM/maintenance tradeoff on 8 GB SKUs |
| 2026-05-28 | EMQX + ZeroMQ inproc | MQTT for cross-container, zero-copy for hot path |
| 2026-05-28 | Mender for NVIDIA OTA | Vendor-neutral, free, multi-platform |
| 2026-05-28 | FastAPI + HTMX + Tailwind + Alpine.js + SSE for device UI | 6× smaller footprint than Streamlit; server-driven; no Node on device; HTMX SSE fits live-tile UX (§3.4) |
| 2026-05-28 | JpegPreviewSink: live JPEG preview on dashboard, configurable per use case | Compelling for demos + ops; off by default for headless industrial (PII, bandwidth) |
| 2026-05-28 | OpenVINO promoted to first-tier backend | OEM coverage (Dell, HP, Lenovo, Advantech) |
| 2026-05-28 | Hailo backend added to roadmap | Advantech / Lenovo SE-series |

### B. Glossary
- **AI Hub** — Qualcomm cloud service for model compilation + on-device benchmarking
- **AIM-01** — Qualcomm AI on the Module 01, QRB5165-based
- **EdgeX Foundry** — Linux Foundation reference architecture for industrial edge
- **HCL** — Hardware Compatibility List
- **HTMX** — hypermedia HTML extensions for server-driven UI
- **IQ-6/8/9/10** — Qualcomm industrial IoT chip family (2025)
- **L4T** — Linux for Tegra, NVIDIA's Jetson OS distribution
- **Mender** — open-source OTA update framework
- **QNN** — Qualcomm Neural Network SDK
- **Wazuh** — open-source XDR/SIEM platform

### C. Related documents
- [device_edge_pipeline.md](device_edge_pipeline.md) — original requirements
- `EdgeX_Foundry.pdf` — architecture inspiration
- `Neuro Ege Arch_Generic Open Sourcen.pdf` — overall NeuroEdge architecture
- NeuroEdge Web `CLAUDE.md` — sibling repo context
- Memory: `project_neuroedge.md`, `project_aws_infra.md`, `feedback_zscaler_network.md`
