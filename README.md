# Leveraging WebSockets for a Synchronous Collaborative Coding Environment in an Educational Framework
## 1. Overview
This project is a real-time, distributed Integrated Development Environment (IDE) built for collaborative programming and secure remote code execution. It allows multiple users to edit the same codebase simultaneously with zero-latency synchronization, chat in real-time, and compile/execute untrusted code safely within isolated Docker sandboxes.

## 2. Architectural Topology
The system is divided into highly specialized, decoupled micro-layers:

* **Frontend (Client Layer):** Built with React, Vite, and Monaco Editor and styled using TailwindCSS. State synchronization is handled by Yjs library.
* **Gateway:** Nginx reverse proxy handling SSL termination and strict CORS preflight routing.
* **Application Layer (API & WebSockets):** An Express.js and Socket.IO backend. 
* **State & Persistence:**
  * **MongoDB:** Persistent storage for user accounts, session metadata, and historical execution logs.
  * **Redis:** In-memory message broker (Pub/Sub) required to synchronize Socket.IO events and Yjs document updates across the isolated Node.js processes.
* **Execution Engine:** A dedicated layer running a native Docker daemon (via WSL2 native kernel). It receives raw code, spins up ephemeral, language-specific containers, executes the code, returns the standard output/error, and instantly destroys the container to prevent malicious system access.

## 3. Prerequisites
To run this system locally, the host machine **must** have the following installed:

* **OS:** Ubuntu 22.04+ (Native or via WSL2 with Linux kernel integrations enabled).
* **Node.js:** v20.0.0 or higher.
* **Docker:** Docker Engine must be running and accessible to the user group executing the backend.
* **Redis Server:** Must be running locally on port 6379.
* **PM2:** Installed globally (`npm install -g pm2`) for cluster management.
* **Nginx:** For handling reverse proxy which is run locally on port 80.

## 4. Configuration Matrix (.env)
The system requires strict environment variable definitions to bridge the hybrid-cloud gap.

**Application Layer (`application-layer/.env`):**
```env
# Must point to the secure Ngrok HTTPS tunnel
VITE_API_URL=https://<your-ngrok-url>.ngrok-free.dev/api/v1
# Must use the secure WebSocket protocol (wss://)
VITE_WS_URL=wss://<your-ngrok-url>.ngrok-free.dev
