NeuroEdge has 2 parts – (1) Web Portal and (2) Edge Device 
Need to keep the 2 paths separate as both are independent. Trained and optimized model based on edge device capability and profiling is ready to download on edge device. 
Evaluate and suggest whether we should create a separate repo. We will need to include relevant NeuroEdge agents, plugins, skills etc to assist development with Claude code. Suggest if we should create a separate folder under project root or start a new project all together. We will need to copy NeuroEdge assets (agents, skills etc. if we start new project.
Plan for implementation of the Requirements below purely for Edge device using NeuroEdge agents, plugins, skills, hooks as applicable
1.	Device OS would be mostly Linux. Review C++ and Python comparison for implementation. Go for C++ as the performance could be a bottleneck later
2.	Evaluate the below options for implementing pipeline
Implementation A: Nvidia SDK (DeepStream/Metropolis) — full vendor stack, fast time-to-market, video-centric use cases 
Implementation B: NeuroEdge custom pipeline (EdgeX-based) — runs on ALL hardware including Nvidia, with pluggable inference backends: TensorRT when on Nvidia GPU, ONNX Runtime everywhere else
3.	Refer to Edge X foundry architecture. Arch can have following layers – 
a.	Device Services Layer – Sensors, Industrial Bus, Cameras, MQTT, API and custom pull (Through Object oriented programming – Interface and concrete implementation)
b.	Services layer –  Command, Config, Metadata, rule engine, scheduling, logging, (Both core and support services as per edge X)
c.	AI Inference Layer -  AI Models (ML or LLM) Inference – Models can vary (Object detection, Segmentation, Image recognition, Time series, Anomoly detection) – Follow OOP – interface and concrete implementation design.
Model itself can be on volume \ file system so as to be available even of container restarts
d.	External Interface  Layer – Post inference processing, Local  UI (Streamlit or suggest best suitable), device agent to connect to Cloud, OTA Agent, call external API and upload inference results in JSON / XML format
e.	Device management layer – Collect device performance metrics, AI related metrices – inference time, model performance, model drift etc, local management console, container management and logs
f.	Device security layer – Port hardening, cyber attack detection, suggest from industry best practices
Evaluate that all above layers can be different Docker containers or should we combine in more logical groups. Actual services can be turned ON / OFF based on the use case requirements. We can use AWS S3 for image storage and ECR for container registry
Evaluate message bus (e.g. PAHO MQTT client) so that all layers / services can talk to each other. Review the overhead and performance challenges on the edge device and suggest best alternative
4.	Need to test complete end to end pipeline on cloud (VM with Docker images pulled from ECR). Need Device emulated on the cloud. Evaluate QEMU for functional testing 
a.	Device services layer need simulated (file data upload, Live data from API, sample data that was used to train the model available on cloud, may be S3- It is another dependency on NeuroEdge web portal))
b.	Docker container to run model inference. Model itself can be on volume \ storage so that it persists even when the docker container dies or restart
c.	Post Processing docker – show results options for External interface layer options above
5.	Once functional testing is done, we will need below options
a.	OTA download / SSH push (Docker compose) to edge device – OOP implementation
b.	Connect with Qualcomm AI Dveice Hub to test on farm actual device
c.	Suggest a good alternative for Nvidia platforms
6.	Build QEMU image for device emulation
7.	Create scripts to provision the infrastructure / PaaS on AWS. 
8.	Suggest any other aspect related to edge devices
Plan in phase wise implementation approach. Ask any question
