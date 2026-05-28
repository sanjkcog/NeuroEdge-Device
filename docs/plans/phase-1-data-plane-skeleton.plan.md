# Plan: Phase 1 — Shared Contracts + Data Plane Skeleton

## Summary
Land the first vertical slice of `ne-data-plane`: generate C++17 headers from the Web side's `neuroedge_design_usecase` JSON schemas; implement the `ISensor` abstraction with a real `FileReplaySensor` + stub `RealSenseSensor`; implement the `IInferenceBackend` abstraction with a real `OnnxRuntimeBackend` (CPU); wire a ZeroMQ inproc bus carrying `Frame → InferenceResult`; emit results to stdout. End state: `docker run neuroedge-device-data-plane:dev` replays a sample YOLOv8n video file from disk and prints detection JSON for every frame.

## User Story
As Sanjeev (or any Cognizant Edge AI engineer), I want the data-plane container to actually consume a `ModelArtifact` produced by NeuroEdge Web and emit detections on a stream from a `FileReplaySensor`, so I can verify the end-to-end contract works on x86 before adding real cameras or accelerator backends.

## Problem → Solution
**Current state (after Phase 0):** `ne-data-plane` prints "hello world" and exits. No sensors, no inference, no contracts wired in.
**Desired state:** `ne-data-plane` reads a YOLOv8n ONNX `ModelArtifact` and a sample video, runs ONNX Runtime CPU inference, and emits detection JSON to stdout (later: MQTT, in Phase 2).

## Metadata
- **Complexity:** Large (3 ABCs + 2 concrete sensor classes + 1 concrete backend + bus + main loop + 8 unit tests + contract codegen — ~25 new files)
- **Source PRD:** [docs/PRD.md](../PRD.md)
- **PRD Phase:** Phase 1 — Shared contracts + data plane skeleton (Section 13, MVP)
- **Estimated Files:** ~25 new files (mostly C++), 2 modified (Makefile, conanfile.txt)
- **Estimated Duration:** 2 weeks for Sanjeev solo
- **Depends on:** Phase 0 complete (build system + CI + Docker scaffold)

---

## UX Design

### Before (after Phase 0)
```
$ docker run --rm neuroedge-device-data-plane:dev
ne-data-plane v0.1.0 ready
$ echo $?
0
```

### After (Phase 1 done)
```
$ docker run --rm \
    -v /sample/video.mp4:/data/input.mp4:ro \
    -v /sample/model_artifact.json:/data/model.json:ro \
    -v /sample/yolov8n.onnx:/data/yolov8n.onnx:ro \
    neuroedge-device-data-plane:dev \
    --sensor-config /etc/neuroedge/sensors.yaml \
    --model /data/model.json

[2026-06-10 14:23:01.123] [info] ne-data-plane v0.2.0 starting
[2026-06-10 14:23:01.156] [info] loading model: yolov8n.onnx (ONNX Runtime, CPU EP)
[2026-06-10 14:23:01.412] [info] sensor opened: FileReplay /data/input.mp4 (640x480 @ 30fps)
[2026-06-10 14:23:01.413] [info] inference loop started
{"frame_id": 1, "ts": "2026-06-10T14:23:01.467Z", "detections": [{"class":"person","conf":0.91,"bbox":[120,80,300,420]}]}
{"frame_id": 2, "ts": "2026-06-10T14:23:01.500Z", "detections": [{"class":"person","conf":0.93,"bbox":[122,81,302,420]}]}
...
[2026-06-10 14:23:08.123] [info] end of stream, shutting down
[2026-06-10 14:23:08.130] [info] processed 213 frames; avg latency 32.1 ms; avg FPS 31.0
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Container lifecycle | exits immediately | runs until end-of-stream or SIGTERM | New SIGTERM handler |
| Required volumes | none | model file, video file, sensor config | Documented in README |
| Stdout | "hello" line | JSON detections per frame + summary | Format frozen for Phase 2 MQTT |
| CLI args | none | `--sensor-config`, `--model`, `--log-level` | minimal — full CLI in Phase 2 |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | [docs/PRD.md §9c](../PRD.md) | "AI Inference Layer" | Backend contract definition |
| P0 | [docs/reference/device_system_design_approach.md §3.3.c](../reference/device_system_design_approach.md) | AI Inference Layer | Backend ABC signature + factory pattern |
| P0 | [NeuroEdge Web — src/neuroedge_design_usecase/model_artifact.py](../../../NeuroEdge%20Web/src/neuroedge_design_usecase/model_artifact.py) | all | Source of `ModelArtifact` Python truth — C++ headers must match |
| P0 | [NeuroEdge Web — src/neuroedge_design_usecase/use_case.py](../../../NeuroEdge%20Web/src/neuroedge_design_usecase/use_case.py) | all | `UseCase` contract |
| P0 | [NeuroEdge Web — src/neuroedge_design_usecase/schemas/use_case_schema.json](../../../NeuroEdge%20Web/src/neuroedge_design_usecase/schemas/use_case_schema.json) | all | JSON Schema → C++ codegen input |
| P1 | [NeuroEdge Web — src/neuroedge_model_profiler/backends/onnx_backend.py](../../../NeuroEdge%20Web/src/neuroedge_model_profiler/backends/onnx_backend.py) | all | Reference ONNX runtime usage (Python — C++ mirrors structure) |
| P1 | [NeuroEdge Web — src/neuroedge_model_profiler/backends/yolo_backend.py](../../../NeuroEdge%20Web/src/neuroedge_model_profiler/backends/yolo_backend.py) | all | YOLO-specific pre/post for NMS |
| P1 | [NeuroEdge Web — src/neuroedge_model_profiler/model_benchmark.py](../../../NeuroEdge%20Web/src/neuroedge_model_profiler/model_benchmark.py) | all | ABC pattern to mirror in C++ |
| P2 | [docs/plans/phase-0-bootstrap.plan.md](phase-0-bootstrap.plan.md) | "Patterns to Mirror" | Naming, build, error handling conventions established in Phase 0 |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| ONNX Runtime C++ API | https://onnxruntime.ai/docs/api/c/ | Use `Ort::Session` + `Ort::Value`; CPU EP default; thread tuning via `SessionOptions` |
| ONNX Runtime conan recipe | https://conan.io/center/recipes/onnxruntime | Package: `onnxruntime/1.18.0` |
| OpenCV C++ for video read | https://docs.opencv.org/4.x/d8/dfe/classcv_1_1VideoCapture.html | `cv::VideoCapture` reads MP4/AVI; frame format BGR |
| OpenCV conan recipe | https://conan.io/center/recipes/opencv | `opencv/4.10.0` |
| ZeroMQ inproc transport | https://zeromq.org/socket-api/#inproc | Lockless, fastest; shared-context required |
| cppzmq C++ bindings | https://github.com/zeromq/cppzmq | Header-only wrapper; conan: `cppzmq/4.10.0` |
| quicktype JSON Schema → C++ | https://github.com/glideapps/quicktype | `quicktype --lang cpp --src schema.json --out file.hpp` |
| nlohmann::json | https://github.com/nlohmann/json | C++ JSON; conan: `nlohmann_json/3.11.3` |
| YOLOv8 ONNX I/O shape | https://docs.ultralytics.com/modes/export/#arguments | Input `[1,3,640,640]` fp32 NCHW; output `[1,84,8400]` |

---

## Patterns to Mirror

### ABC_PATTERN (C++ — ABC + factory)
```cpp
// SOURCE: design_doc §3.3 (AI Inference Layer)
// Pattern: virtual destructor + pure virtual interface + concrete factory function

namespace neuroedge::inference {

class IInferenceBackend {
public:
  virtual ~IInferenceBackend() = default;
  virtual bool load(const contracts::ModelArtifact& artifact) = 0;
  virtual InferenceResult infer(const sensor::Frame& frame) = 0;
  virtual void unload() = 0;
  virtual BackendCapabilities capabilities() const = 0;
};

std::unique_ptr<IInferenceBackend>
make_backend(const contracts::ModelArtifact& artifact);

}  // namespace neuroedge::inference
```

### NAMING_CONVENTION (extended)
```cpp
// SOURCE: Phase 0 established this; extending here
// File names: snake_case (sensor_interface.hpp, file_replay_sensor.cpp)
// Class names: PascalCase (FileReplaySensor, IInferenceBackend)
// Methods: snake_case (open, next, infer, build_manifest)
// Member vars: trailing underscore (cap_, session_)
// Constants: UPPER_SNAKE (DEFAULT_BATCH_SIZE)
// Macros: NEUROEDGE_ prefix; reserve for header guards only
```

### CONTRACT_CODEGEN (Python schema → C++ header)
```python
# SOURCE: This pattern lands in Phase 1 — no prior art on Device side
# Pipeline: Pydantic model → JSON Schema → quicktype → C++ struct + nlohmann::json deserializer

# In NeuroEdge Web (run on contract bump):
python -m neuroedge_design_usecase.contracts_export --out schemas/

# In NeuroEdge Device (run at Phase 1 + on every Web bump):
quicktype \
  --lang cpp \
  --src ../NeuroEdge\ Web/src/neuroedge_design_usecase/schemas/use_case_schema.json \
  --out src/ne-data-plane/include/neuroedge/contracts/use_case.hpp \
  --namespace neuroedge::contracts

# Result: nlohmann::json-compatible structs that round-trip with the Python source.
```

### ERROR_HANDLING (C++)
```cpp
// SOURCE: New for Device — chosen exception hierarchy + std::optional for expected-empty
// Pattern: domain exceptions inherit from std::runtime_error; recoverable misses use std::optional

namespace neuroedge::sensor {

class SensorError : public std::runtime_error {
public:
  using std::runtime_error::runtime_error;
};

class SensorNotFoundError : public SensorError { /* ... */ };
class SensorReadError    : public SensorError { /* ... */ };

}  // namespace neuroedge::sensor

// Usage:
std::optional<Frame> ISensor::next();  // empty optional = no more frames (end of stream)
// throw SensorReadError("decoder failed at frame 213");  // actual error
```

### LOGGING_PATTERN (C++ — spdlog)
```cpp
// SOURCE: established in Phase 0; extended with structured fields
#include <spdlog/spdlog.h>
spdlog::info("frame {} processed in {} ms", frame.id, elapsed.count());
spdlog::warn("sensor {} dropped {} frames in last 1s", sensor_name, drop_count);
spdlog::error("inference failed: {}", e.what());
```

### TEST_STRUCTURE (C++ — Catch2 v3)
```cpp
// SOURCE: Phase 0 established test_version pattern
// Pattern: one test executable per component, TEST_CASE names "[<component>]"

#include <catch2/catch_test_macros.hpp>
#include "neuroedge/sensor/file_replay_sensor.hpp"

TEST_CASE("FileReplaySensor opens valid MP4", "[sensor][file_replay]") {
  neuroedge::sensor::FileReplaySensor s;
  REQUIRE(s.open({"tests/fixtures/3frame_sample.mp4"}));
  auto f = s.next();
  REQUIRE(f.has_value());
  REQUIRE(f->width == 640);
  REQUIRE(f->height == 480);
}
```

---

## Files to Change

### CREATE — Contract codegen pipeline
| File | Description |
|---|---|
| `scripts/regen_contracts.sh` | Runs quicktype to regenerate C++ headers from Web schemas |
| `src/ne-data-plane/include/neuroedge/contracts/use_case.hpp` | Generated from use_case_schema.json |
| `src/ne-data-plane/include/neuroedge/contracts/model_artifact.hpp` | Generated (need Web to emit JSON Schema first; see Open Question) |
| `src/ne-data-plane/include/neuroedge/contracts/README.md` | "Do not edit by hand — regenerated by scripts/regen_contracts.sh" |

### CREATE — Sensor layer
| File | Description |
|---|---|
| `src/ne-data-plane/include/neuroedge/sensor/frame.hpp` | `Frame` struct + `Sample` for TS |
| `src/ne-data-plane/include/neuroedge/sensor/sensor_interface.hpp` | `ISensor` ABC |
| `src/ne-data-plane/include/neuroedge/sensor/sensor_config.hpp` | `SensorConfig` struct |
| `src/ne-data-plane/include/neuroedge/sensor/sensor_errors.hpp` | Exception hierarchy |
| `src/ne-data-plane/include/neuroedge/sensor/file_replay_sensor.hpp` | Declaration |
| `src/ne-data-plane/src/sensor/file_replay_sensor.cpp` | Full impl using OpenCV cv::VideoCapture |
| `src/ne-data-plane/include/neuroedge/sensor/realsense_sensor.hpp` | Declaration (stub) |
| `src/ne-data-plane/src/sensor/realsense_sensor.cpp` | Stub — open() returns false with "not implemented" log |
| `src/ne-data-plane/include/neuroedge/sensor/sensor_factory.hpp` | Factory `make_sensor(SensorConfig)` |
| `src/ne-data-plane/src/sensor/sensor_factory.cpp` | Factory dispatch on `config.type` |

### CREATE — Inference layer
| File | Description |
|---|---|
| `src/ne-data-plane/include/neuroedge/inference/inference_result.hpp` | `InferenceResult` + `Detection` structs |
| `src/ne-data-plane/include/neuroedge/inference/backend_interface.hpp` | `IInferenceBackend` ABC + capabilities |
| `src/ne-data-plane/include/neuroedge/inference/backend_factory.hpp` | Factory declaration |
| `src/ne-data-plane/src/inference/backend_factory.cpp` | Dispatch on `artifact.metadata.preferred_backend` |
| `src/ne-data-plane/include/neuroedge/inference/onnx_runtime_backend.hpp` | Declaration |
| `src/ne-data-plane/src/inference/onnx_runtime_backend.cpp` | Full impl — load .onnx, infer, BGR→RGB→fp32 NCHW preproc, YOLO post (NMS) |

### CREATE — Bus (ZeroMQ inproc)
| File | Description |
|---|---|
| `src/ne-data-plane/include/neuroedge/bus/zmq_inproc_bus.hpp` | `ZmqInprocBus` — pub/sub on inproc:// |
| `src/ne-data-plane/src/bus/zmq_inproc_bus.cpp` | Impl using cppzmq |
| `src/ne-data-plane/include/neuroedge/bus/bus_topics.hpp` | Topic constants (`FRAMES`, `INFERENCE_RESULTS`) |

### CREATE — Sinks
| File | Description |
|---|---|
| `src/ne-data-plane/include/neuroedge/sink/stdout_json_sink.hpp` | Consume `InferenceResult` → JSON to stdout |
| `src/ne-data-plane/src/sink/stdout_json_sink.cpp` | Impl using nlohmann::json |

### MODIFY — Main loop
| File | Description |
|---|---|
| `src/ne-data-plane/main.cpp` | Wire sensor → bus → backend → sink; SIGTERM-aware loop |

### MODIFY — CLI argument parsing
| File | Description |
|---|---|
| `src/ne-data-plane/include/neuroedge/cli.hpp` | `--sensor-config`, `--model`, `--log-level` |
| `src/ne-data-plane/src/cli.cpp` | Impl using `CLI11` |

### CREATE — Tests
| File | Description |
|---|---|
| `src/ne-data-plane/tests/test_file_replay_sensor.cpp` | Opens fixture MP4, reads N frames, hits EOF |
| `src/ne-data-plane/tests/test_realsense_sensor_stub.cpp` | open() returns false, error captured |
| `src/ne-data-plane/tests/test_onnx_backend.cpp` | Load fixture .onnx (yolov8n_tiny.onnx) + run inference on solid-color frame |
| `src/ne-data-plane/tests/test_zmq_inproc_bus.cpp` | Publish + subscribe round-trip |
| `src/ne-data-plane/tests/test_contracts_roundtrip.cpp` | Load fixture model_artifact.json, verify fields match Python source |
| `src/ne-data-plane/tests/fixtures/` (directory) | 3-frame MP4, yolov8n tiny ONNX, sample model_artifact.json, sample use_case.yaml |

### MODIFY — Build / deps
| File | Description |
|---|---|
| `conanfile.txt` | Add: `onnxruntime/1.18.0`, `opencv/4.10.0`, `cppzmq/4.10.0`, `nlohmann_json/3.11.3`, `cli11/2.4.2` |
| `src/ne-data-plane/CMakeLists.txt` | Add new source files + link new deps |
| `containers/ne-data-plane/Dockerfile` | Add OpenCV runtime libs to runtime stage |
| `Makefile` | Add `regen-contracts` target |

### MODIFY — CI
| File | Description |
|---|---|
| `.github/workflows/build.yml` | Add fixture download step (small ONNX + sample MP4 from Web's `data/` or new S3 fixture bucket) |

## NOT Building

- **Real `RealSenseSensor`** — stub only. Full impl Phase 4.
- **Other backends** (TensorRT, QNN, OpenVINO, Hailo, TfLite) — Phase 4/5/7/8.
- **Industrial bus sensors** (Modbus, OPC-UA) — Phase 1 stretch or v1 (Phase 5/6).
- **MQTT publishing** — Phase 2.
- **Multi-batch inference** — `max_batch_size=1` hard-coded.
- **Tracker / temporal post-processing** — Phase 4 stretch.
- **Engine cache** for TRT/QNN — Phase 4/5 (no NV/QC backend yet).
- **Model hot-reload** — Phase 5.
- **Power/thermal awareness** — Phase 4.
- **Streamlit / FastAPI changes** to ne-external — Phase 2.
- **No SBOM / signing changes** beyond what Phase 0 already does.

---

## Step-by-Step Tasks

### Task 1 — Web side: emit JSON Schema for ModelArtifact
- **ACTION:** Add a one-shot script in NeuroEdge Web that exports `ModelArtifact` Pydantic model → JSON Schema. (Currently only `UseCase` has a JSON Schema.)
- **IMPLEMENT:** In NeuroEdge Web, add `src/neuroedge_design_usecase/contracts_export.py`:
  ```python
  from .use_case import UseCase
  from .model_artifact import ModelArtifact
  from .capability_manifest import CapabilityManifest
  from .pipeline_status import PipelineStatus
  import json
  from pathlib import Path

  CONTRACTS = {
      "use_case": UseCase,
      "model_artifact": ModelArtifact,
      "capability_manifest": CapabilityManifest,
      "pipeline_status": PipelineStatus,
  }

  def main():
      out = Path(__file__).parent / "schemas"
      out.mkdir(exist_ok=True)
      for name, cls in CONTRACTS.items():
          schema_path = out / f"{name}_schema.json"
          schema_path.write_text(json.dumps(cls.model_json_schema(), indent=2))
          print(f"wrote {schema_path}")

  if __name__ == "__main__":
      main()
  ```
- **MIRROR:** Same package as existing `use_case_schema.json` location.
- **GOTCHA:** Some Web models may not be Pydantic — verify before assuming `.model_json_schema()` works. Convert dataclass-based ones to Pydantic v2 if needed.
- **VALIDATE:** In Web repo: `python -m neuroedge_design_usecase.contracts_export` produces 4 JSON Schema files. Commit + publish new `neuroedge-contracts` package version.

### Task 2 — Device side: contract regen script
- **ACTION:** Wrapper script that invokes quicktype against the Web schemas folder.
- **IMPLEMENT:** `scripts/regen_contracts.sh`:
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  # Assumes NeuroEdge Web is checked out as a sibling directory
  WEB_REPO="${NEUROEDGE_WEB_PATH:-../NeuroEdge Web}"
  SCHEMAS="${WEB_REPO}/src/neuroedge_design_usecase/schemas"
  OUT_DIR="src/ne-data-plane/include/neuroedge/contracts"

  if ! command -v quicktype >/dev/null; then
    echo "quicktype not found. Install: npm i -g quicktype"
    exit 1
  fi

  mkdir -p "$OUT_DIR"

  for schema in "$SCHEMAS"/*_schema.json; do
    name=$(basename "$schema" _schema.json)
    out="$OUT_DIR/${name}.hpp"
    echo "Generating $out from $schema"
    quicktype \
      --lang cpp \
      --src "$schema" \
      --top-level "${name^}" \
      --namespace "neuroedge::contracts::${name}" \
      --out "$out"
  done

  echo "Done. Run 'make build' to verify."
  ```
- **GOTCHA:** quicktype's C++ output uses `nlohmann::json` — must be in conanfile. Also requires Node 18+.
- **VALIDATE:** `bash scripts/regen_contracts.sh` produces 4 `.hpp` files under `src/ne-data-plane/include/neuroedge/contracts/`.

### Task 3 — Add new deps to conanfile.txt
- **ACTION:** Add C++ dependencies.
- **IMPLEMENT:** Append to `conanfile.txt`:
  ```ini
  onnxruntime/1.18.0
  opencv/4.10.0
  cppzmq/4.10.0
  nlohmann_json/3.11.3
  cli11/2.4.2
  ```
- **GOTCHA:** OpenCV pulls big tree; first conan install on a fresh cache takes ~10 minutes. ONNX Runtime conan recipe may need build-from-source on ARM64 — check before Phase 4 cross-compile.
- **VALIDATE:** `conan install . --profile=conan_profiles/x86-ubuntu2204 --output-folder=build --build=missing` succeeds.

### Task 4 — Define `Frame` and `Sample` data structures
- **ACTION:** Lightweight data types passed through the bus.
- **IMPLEMENT:** `src/ne-data-plane/include/neuroedge/sensor/frame.hpp`:
  ```cpp
  #pragma once
  #include <cstdint>
  #include <chrono>
  #include <vector>
  #include <opencv2/core/mat.hpp>

  namespace neuroedge::sensor {

  enum class PixelFormat { BGR8, RGB8, GRAY8, DEPTH_U16 };

  struct Frame {
    uint64_t id;
    std::chrono::system_clock::time_point ts;
    int width;
    int height;
    PixelFormat format;
    cv::Mat data;       // shares ownership; cheap to pass
    std::string source; // sensor name
  };

  struct Sample {
    uint64_t id;
    std::chrono::system_clock::time_point ts;
    std::vector<float> values;
    std::string source;
  };

  }  // namespace neuroedge::sensor
  ```
- **MIRROR:** NAMING_CONVENTION
- **GOTCHA:** `cv::Mat` is shallow-copyable but not thread-safe to mutate concurrently — document and use const& everywhere downstream.
- **VALIDATE:** Compiles standalone.

### Task 5 — `ISensor` ABC + errors + config
- **ACTION:** Abstract sensor interface.
- **MIRROR:** ABC_PATTERN, ERROR_HANDLING
- **IMPLEMENT:**

  `src/ne-data-plane/include/neuroedge/sensor/sensor_errors.hpp`:
  ```cpp
  #pragma once
  #include <stdexcept>

  namespace neuroedge::sensor {
  class SensorError : public std::runtime_error { using std::runtime_error::runtime_error; };
  class SensorNotFoundError : public SensorError { using SensorError::SensorError; };
  class SensorReadError : public SensorError { using SensorError::SensorError; };
  class SensorOpenError : public SensorError { using SensorError::SensorError; };
  }
  ```

  `src/ne-data-plane/include/neuroedge/sensor/sensor_config.hpp`:
  ```cpp
  #pragma once
  #include <string>
  #include <map>

  namespace neuroedge::sensor {
  struct SensorConfig {
    std::string name;
    std::string type;              // "file_replay", "realsense", ...
    std::map<std::string, std::string> params;
  };
  }
  ```

  `src/ne-data-plane/include/neuroedge/sensor/sensor_interface.hpp`:
  ```cpp
  #pragma once
  #include "frame.hpp"
  #include "sensor_config.hpp"
  #include <optional>
  #include <string>

  namespace neuroedge::sensor {
  class ISensor {
  public:
    virtual ~ISensor() = default;
    virtual bool open(const SensorConfig& cfg) = 0;
    virtual std::optional<Frame> next() = 0;       // empty optional = EOS
    virtual std::optional<Sample> next_sample() { return std::nullopt; }
    virtual void close() = 0;
    virtual std::string name() const = 0;
    virtual bool is_open() const = 0;
  };
  }
  ```
- **VALIDATE:** Header-only; compiles.

### Task 6 — `FileReplaySensor` full impl
- **ACTION:** Read MP4/AVI via OpenCV; respect requested FPS.
- **IMPLEMENT:** `src/ne-data-plane/src/sensor/file_replay_sensor.cpp`:
  - `open(cfg)`: read `cfg.params["path"]`, `cfg.params["fps"]` (optional, default native); call `cap_.open(path)`. Throw `SensorOpenError` on failure.
  - `next()`: read frame; if `cap_.grab() == false`, return empty optional (end of stream). Sleep to honor target FPS. Build `Frame` with BGR8 + monotonic id.
  - `close()`: `cap_.release()`.
- **MIRROR:** NAMING_CONVENTION, ERROR_HANDLING, LOGGING_PATTERN
- **GOTCHA:** OpenCV's BGR is the default; if a downstream backend wants RGB, convert at the backend (don't double-pay).
- **VALIDATE:** Test `test_file_replay_sensor.cpp` opens `tests/fixtures/3frame_sample.mp4`, reads 3 frames, hits EOS.

### Task 7 — `RealSenseSensor` stub
- **ACTION:** Declaration + body throws `SensorOpenError("not implemented — Phase 4")`.
- **IMPLEMENT:** Mostly empty file; documents that Phase 4 fills in with librealsense2.
- **VALIDATE:** Test `test_realsense_sensor_stub.cpp` verifies `open()` returns false with error captured.

### Task 8 — `SensorFactory`
- **ACTION:** Map `cfg.type` → concrete sensor.
- **IMPLEMENT:**
  ```cpp
  std::unique_ptr<ISensor> make_sensor(const SensorConfig& cfg) {
    if (cfg.type == "file_replay") return std::make_unique<FileReplaySensor>();
    if (cfg.type == "realsense")   return std::make_unique<RealSenseSensor>();
    throw SensorNotFoundError("unknown sensor type: " + cfg.type);
  }
  ```
- **VALIDATE:** Factory unit test covers both branches + unknown type.

### Task 9 — `InferenceResult` + `Detection` data structures
- **IMPLEMENT:** `src/ne-data-plane/include/neuroedge/inference/inference_result.hpp`:
  ```cpp
  #pragma once
  #include <chrono>
  #include <vector>
  #include <string>

  namespace neuroedge::inference {

  struct BoundingBox {
    float x1, y1, x2, y2;  // top-left + bottom-right, pixel coords
  };

  struct Detection {
    std::string class_name;
    int class_id;
    float confidence;
    BoundingBox bbox;
  };

  struct InferenceResult {
    uint64_t frame_id;
    std::chrono::system_clock::time_point ts;
    std::chrono::milliseconds latency;
    std::vector<Detection> detections;
    std::string model_id;
    std::string backend;
  };

  }
  ```

### Task 10 — `IInferenceBackend` ABC
- **ACTION:** Abstract backend interface.
- **MIRROR:** ABC_PATTERN
- **IMPLEMENT:** As in pattern at top, with `BackendCapabilities` struct exposing `{ supports_fp16, supports_int8, max_batch_size, device_type }`.

### Task 11 — `OnnxRuntimeBackend` full impl
- **ACTION:** CPU-only ONNX Runtime backend; YOLOv8 input/output handling.
- **IMPLEMENT:** `src/ne-data-plane/src/inference/onnx_runtime_backend.cpp`:
  - `load(artifact)`: read `artifact.weights_uri` (local path), construct `Ort::Session` with CPU EP; record input/output names + shapes from session.
  - `infer(frame)`:
    1. Resize frame to model input size (640x640 for YOLOv8n), letterbox keep aspect ratio.
    2. BGR → RGB; normalize to [0,1] fp32; HWC → NCHW.
    3. Run session.
    4. Output `[1,84,8400]`: split into boxes + class confidences; apply confidence threshold 0.25, IoU NMS 0.45.
    5. Return `InferenceResult` with class names from `artifact.metadata.class_names`.
- **MIRROR:** [src/neuroedge_model_profiler/backends/onnx_backend.py](../../../NeuroEdge%20Web/src/neuroedge_model_profiler/backends/onnx_backend.py) (Python reference for the inference loop) and [src/neuroedge_model_profiler/backends/yolo_backend.py](../../../NeuroEdge%20Web/src/neuroedge_model_profiler/backends/yolo_backend.py) (YOLO-specific NMS).
- **GOTCHA:**
  - ONNX Runtime sessions are thread-safe for inference but expensive to construct — load once at startup.
  - `Ort::Value` lifecycle: input buffer must outlive the `Run()` call.
  - YOLOv8 ONNX export shape changed between Ultralytics 8.0 / 8.1 — confirm against the version of yolov8n.onnx in fixtures (record version in test).
- **VALIDATE:** `test_onnx_backend.cpp` loads `tests/fixtures/yolov8n.onnx` + a synthetic solid-color frame; asserts at least 0 detections (no crash); asserts result.backend == "onnxruntime".

### Task 12 — `BackendFactory`
- **ACTION:** Pick backend from `ModelArtifact.metadata.preferred_backend`.
- **IMPLEMENT:** Phase 1 — only `OnnxRuntimeBackend`. Default to it if preferred_backend is empty.
- **VALIDATE:** Factory test covers "onnxruntime" + "tensorrt" (returns nullptr or fallback to ONNX with warning).

### Task 13 — ZeroMQ inproc bus
- **ACTION:** Publish frames to one topic, subscribe inference results to another, in a shared context.
- **IMPLEMENT:** `ZmqInprocBus` wraps a `zmq::context_t` + helper `publish(topic, payload)` + `subscribe(topic)` returning a `zmq::socket_t`. Use `inproc://neuroedge`.
- **GOTCHA:**
  - `inproc://` requires bind BEFORE connect (subscriber side must be set up first; or use `XPUB`/`XSUB` proxy).
  - For Phase 1, single producer + single consumer + same process — keep it simple with `zmq::socket_type::pair`.
  - Serialization: for in-process, pass pointers via `std::shared_ptr` over a `std::queue` + condition_variable instead of ZMQ — if ZMQ inproc adds ceremony without payoff, drop it. **Re-evaluate at Task 13 review; defer ZMQ to Phase 2 if it overcomplicates the hot path.**
- **VALIDATE:** `test_zmq_inproc_bus.cpp` publishes 5 messages; subscriber receives all 5 in order.

### Task 14 — `StdoutJsonSink`
- **ACTION:** Serialize `InferenceResult` to JSON line on stdout.
- **IMPLEMENT:** Use `nlohmann::json` to format; one JSON object per line; flush after each write.
- **VALIDATE:** `test_stdout_sink.cpp` redirects stdout to a stream and verifies JSON shape.

### Task 15 — CLI parsing
- **ACTION:** Replace Phase 0 main.cpp with CLI11-based arg parsing.
- **IMPLEMENT:**
  ```cpp
  #include <CLI/CLI.hpp>

  int main(int argc, char** argv) {
    CLI::App app{"NeuroEdge ne-data-plane"};
    std::string sensor_config_path;
    std::string model_path;
    std::string log_level = "info";

    app.add_option("-s,--sensor-config", sensor_config_path, "Path to sensor config YAML")->required();
    app.add_option("-m,--model", model_path, "Path to ModelArtifact JSON")->required();
    app.add_option("--log-level", log_level, "trace|debug|info|warn|error");
    CLI11_PARSE(app, argc, argv);

    // ... wire bus, sensor, backend, sink
  }
  ```
- **VALIDATE:** `--help` prints; missing required args produces a clear error.

### Task 16 — Main loop wiring
- **ACTION:** Top-level glue.
- **IMPLEMENT:** `main.cpp` after CLI parse:
  ```cpp
  // 1. Load sensor config + create sensor (factory)
  // 2. Load model artifact JSON + create backend (factory)
  // 3. Open sensor; if !open → fatal
  // 4. Loop:
  //    while (running && (auto frame = sensor->next())):
  //      auto result = backend->infer(*frame);
  //      sink.write(result);
  // 5. Install SIGTERM handler → set running=false
  // 6. Log summary on exit
  ```
- **MIRROR:** Use `spdlog` everywhere; pattern from existing main.cpp from Phase 0.
- **GOTCHA:** Long-running loop must yield via `std::this_thread::sleep_for` if sensor doesn't enforce FPS internally — `FileReplaySensor` does, but document for future sensors.
- **VALIDATE:** End-to-end manual run (see UX After section).

### Task 17 — Test fixtures
- **ACTION:** Lock in small reproducible fixtures.
- **IMPLEMENT:** `src/ne-data-plane/tests/fixtures/`:
  - `3frame_sample.mp4` — 3-frame solid-color video (640x480, 30 fps), ~10 KB. Generate via OpenCV writer or `ffmpeg`.
  - `yolov8n.onnx` — the smallest YOLOv8n ONNX. From `C:\Sanjeev_E\NeuroEdge Web\yolov8n.pt` exported via ultralytics or pulled from Web's existing `data/output/` if any. Cap size ≤ 15 MB; check in via git-lfs.
  - `model_artifact.json` — points to local `yolov8n.onnx`, with class_names populated for COCO 80.
  - `use_case.yaml` — minimal PPE detection use case from Web's `use_cases/ppe_shopfloor_jetson.yaml` (copy).
- **GOTCHA:** Git LFS or skip binary commit and download in CI. Recommendation: commit MP4 (tiny) inline; download ONNX from S3 fixture bucket in CI (and locally via Makefile `make fixtures` target).
- **VALIDATE:** Tests pass with fixtures present.

### Task 18 — Update Dockerfile (runtime libs)
- **ACTION:** Add OpenCV + ONNX Runtime shared libs to runtime stage.
- **IMPLEMENT:** In `containers/ne-data-plane/Dockerfile`, runtime stage:
  ```dockerfile
  RUN apt-get update && apt-get install -y --no-install-recommends \
      libstdc++6 libgl1 libgomp1 libsm6 libxext6 \
      && rm -rf /var/lib/apt/lists/*
  COPY --from=builder /work/build/conan_install/ /usr/local/onnxrt/
  ENV LD_LIBRARY_PATH=/usr/local/onnxrt/lib:$LD_LIBRARY_PATH
  ```
- **GOTCHA:** ONNX Runtime ships its libs in conan package's `lib/` dir; copy explicitly. Alternative: link statically — bigger binary but simpler deploy.
- **VALIDATE:** `docker run` doesn't error on missing `.so`.

### Task 19 — Update Makefile
- **ACTION:** Add `regen-contracts` and `fixtures` targets.
- **IMPLEMENT:**
  ```makefile
  regen-contracts: ## Regenerate C++ contract headers from Web schemas
  	bash scripts/regen_contracts.sh

  fixtures: ## Download test fixtures from S3
  	mkdir -p src/ne-data-plane/tests/fixtures
  	aws s3 cp s3://neuroedge-device-fixtures/yolov8n.onnx src/ne-data-plane/tests/fixtures/yolov8n.onnx
  	# 3frame_sample.mp4 + model_artifact.json + use_case.yaml are git-tracked
  ```

### Task 20 — CI integration
- **ACTION:** Add `make fixtures` step to CI workflow; gate `test-cpp` on it.
- **IMPLEMENT:** In `.github/workflows/build.yml`, `test-cpp` job, add a step after checkout:
  ```yaml
  - name: Configure AWS for fixtures
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::975050071275:role/NeuroEdgeDeviceProvisioning
      aws-region: us-west-2
  - name: Download fixtures
    run: make fixtures
  ```
- **GOTCHA:** Fixtures step depends on IAM role from PRD Open Question 1; until that lands, commit a smaller yolov8n.onnx via git-lfs as fallback. Document the conditional.

### Task 21 — Trigger reviewers
- **ACTION:** Per CLAUDE.md mandatory rules:
  - C++ edits → `cpp-reviewer` agent
  - Python edits (Web side contracts_export.py) → `python-reviewer` agent
  - Implementation complete → `code-reviewer` agent
- **VALIDATE:** All agents report no critical issues; address findings.

### Task 22 — Update PRD
- **ACTION:** Mark Phase 1 status in PRD table from `pending` → `in-progress`; add link to this plan in the "PRP Plan" column.

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output |
|---|---|---|
| `test_file_replay_sensor::opens_valid_mp4` | 3-frame fixture MP4 | open() = true; 3 frames read; 4th = empty |
| `test_file_replay_sensor::missing_file` | `/no/such/path.mp4` | open() = false; `SensorOpenError` |
| `test_file_replay_sensor::respects_fps` | 30 fps file, requested 10 fps | inter-frame interval ≥ 100ms |
| `test_realsense_sensor_stub::open_returns_false` | valid SensorConfig | open() = false with not-implemented log |
| `test_sensor_factory::known_types` | type="file_replay" / "realsense" | concrete pointer returned |
| `test_sensor_factory::unknown_type` | type="bogus" | throws `SensorNotFoundError` |
| `test_onnx_backend::load_yolov8n` | yolov8n.onnx fixture | load = true; capabilities populated |
| `test_onnx_backend::infer_solid_color` | solid color 640x480 frame | InferenceResult returned, no crash |
| `test_zmq_inproc_bus::roundtrip` | 5 pub messages | 5 sub messages received in order |
| `test_stdout_sink::json_shape` | sample InferenceResult | output parses as JSON, has frame_id + detections array |
| `test_contracts_roundtrip::model_artifact` | fixture model_artifact.json | parses; required fields populated |

### Edge Cases Checklist
- [ ] FileReplaySensor on corrupt MP4 — throws `SensorReadError` mid-stream
- [ ] OnnxRuntimeBackend with mismatched input shape — clear error message
- [ ] Empty detection result (no objects above confidence threshold) — sink emits `"detections": []`
- [ ] SIGTERM during inference — clean shutdown within 2 seconds
- [ ] Model file not found — main exits 1 with clear log
- [ ] Sensor config YAML malformed — main exits 1 with clear log
- [ ] Memory: 1000-frame run via valgrind shows no leak (run on host, not in container, Phase 1 stretch)

---

## Validation Commands

### Static Analysis
```bash
pre-commit run --all-files
```
**EXPECT:** Clean (or auto-fix once and clean on re-run).

### Unit Tests
```bash
make test
```
**EXPECT:** All ~11 tests pass.

### End-to-End Smoke
```bash
# Build
make build

# Prep fixtures (if not already)
make fixtures

# Run end-to-end
docker run --rm \
  -v $(pwd)/src/ne-data-plane/tests/fixtures:/data:ro \
  neuroedge-device-data-plane:dev \
  --sensor-config /data/sensors.yaml \
  --model /data/model_artifact.json \
  --log-level info \
  | head -20
```
**EXPECT:** First lines are spdlog startup messages; subsequent lines are JSON `{"frame_id":...}` objects.

### Manual Checks
- [ ] `gh run view` shows green build on push
- [ ] `docker image ls | grep neuroedge-device-data-plane` shows :dev image
- [ ] Image size: < 800 MB
- [ ] Cold startup: model loads in < 30 s
- [ ] At least 5 FPS sustained on a typical dev laptop (x86, ONNX CPU EP)

---

## Acceptance Criteria
- [ ] `ne-data-plane` container runs end-to-end on x86 with fixture inputs
- [ ] Emits JSON detection records to stdout
- [ ] All unit tests pass (≥ 11)
- [ ] Image size < 800 MB
- [ ] CI green
- [ ] PRD Phase 1 row marked `complete`; Phase 2 unblocked
- [ ] `cpp-reviewer` agent + `code-reviewer` agent both pass

## Completion Checklist
- [ ] All C++ files follow established naming + namespace conventions
- [ ] `nlohmann::json` used consistently (no manual JSON string assembly)
- [ ] No `using namespace std;` in headers
- [ ] All public APIs have brief doxygen-style comments
- [ ] `RealSenseSensor` stub explicitly logs "Phase 4 will implement"
- [ ] Contract headers regenerated in CI (not committed pre-regen)
- [ ] No TODO comments without an issue link

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| ONNX Runtime conan recipe broken on ARM64 | Medium | Medium | Build conan recipe locally as fallback; defer ARM64 image build if needed (Phase 4 cross-compile blocked) |
| OpenCV bloats image > 800 MB | Medium | Low | Use opencv-core+imgproc+imgcodecs only; strip imgproc-extras; alternative: minimal in-house BGR decoder using FFmpeg directly |
| YOLOv8 ONNX output shape changes between fixture and runtime | Low | Medium | Pin ultralytics version in Web; assert shape in test_onnx_backend |
| ZMQ inproc adds complexity with no Phase 1 payoff | Medium | Low | Documented bailout: drop to std::queue in same process if Task 13 review flags overengineering |
| Web side schema export breaks because some models aren't Pydantic v2 | Medium | Low | Convert as needed in Web repo; small isolated change |
| Test fixtures bloat repo via git-lfs | Medium | Low | Move large ONNX fixture to S3; small MP4 stays in-tree |
| C++ codegen via quicktype produces verbose ugly headers | Medium | Low | Acceptable — headers are read-only generated artifact, never hand-edited |

## Notes

- **Why ONNX Runtime first, not TensorRT:** TensorRT requires NVIDIA hardware; ONNX Runtime CPU EP runs everywhere x86, gives us the Phase 1 hello-world. Phase 4 adds TRT for Jetson.
- **Why YOLOv8n specifically:** Already trained + exported by NeuroEdge Web (`yolov8n.pt` in root). Smallest model, fastest iteration.
- **Why CLI11 not boost::program_options:** Header-only, simpler, no boost dependency drag. Already conan-packaged.
- **Why nlohmann::json not rapidjson:** Hugely better ergonomics; conan-packaged; quicktype's C++ output already targets it.
- **Why we may defer ZMQ inproc to Phase 2:** In a single-process binary, std::queue + condition_variable is simpler than ZMQ's inproc transport. ZMQ's real value shows when we split sensor and inference into separate threads with backpressure. Decision at Task 13 review.
- **Why FileReplaySensor is full-featured (not stub) but RealSenseSensor is stub:** FileReplay is critical for cloud emulation (Phase 3) and CI testing. RealSense needs hardware; defer to Phase 4 when the loaner Jetson + camera arrive.
- **Why we generate C++ contracts from Python (not maintain by hand):** Single source of truth, automatic update on Web bumps, eliminates drift bugs. Cost: codegen step in CI.

---

**Phase 1 confidence score:** 7/10 — moderate. The risky surfaces are (a) ONNX Runtime conan package on ARM64 (relevant for Phase 4 prep, not Phase 1 gate), and (b) YOLOv8 output handling variation across ultralytics versions. Both have explicit mitigation. Everything else is paved.

**Next step:** Run `/prp-implement docs/plans/phase-1-data-plane-skeleton.plan.md` to execute, OR review both Phase 0 + Phase 1 plans before kickoff.
