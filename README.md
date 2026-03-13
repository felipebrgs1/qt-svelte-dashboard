# Qt + Svelte Dashboard

Desktop app combining a **C++/Qt** backend with a **Svelte + Vite** frontend,
communicating over WebSocket. Qt renders the UI via `QWebEngineView` (Chromium
embedded), so the frontend is plain web code that also runs in a browser during
development.

```
┌─────────────────────────────────────────────────────┐
│                Qt Application Window                │
│  ┌───────────────────────────────────────────────┐  │
│  │          QWebEngineView (Chromium)            │  │
│  │                                               │  │
│  │          Svelte UI  ◄──── WebSocket ────►     │  │
│  │        localhost:5173 (dev)                   │  │
│  │        frontend/index.html (prod)             │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  QWebSocketServer :8080  ←→  JSON push / commands   │
└─────────────────────────────────────────────────────┘
```

---

## Dependencies

| Tool | Minimum version | Notes |
|------|----------------|-------|
| CMake | 3.20 | |
| GCC / Clang | C++17 | |
| Qt 6 | 6.2 | `Core` `Widgets` `WebSockets` `WebEngineWidgets` |
| Bun **or** npm | any | Bun detected first; npm used as fallback |

> **Arch / Manjaro**
> ```
> sudo pacman -S cmake qt6-base qt6-websockets qt6-webengine bun
> ```
>
> **Ubuntu 24.04**
> ```
> sudo apt install cmake build-essential qt6-base-dev \
>     libqt6websockets6-dev libqt6webenginewidgets6-dev qt6-webengine-dev
> curl -fsSL https://bun.sh/install | bash
> ```

---

## Quick start

```bash
make build   # installs JS deps, builds Svelte, compiles Qt binary
make run     # runs build/dashboard  (auto-builds if missing)
```

---

## Makefile reference

```
make help          # list all targets (default)

make build         # ★ full build: frontend + Qt backend
make run           # launch the app  (builds first if needed)
make dev           # dev mode — hot-reload (see below)

make frontend      # Vite production build  →  frontend/dist/
make frontend-dev  # Vite dev server only   →  http://localhost:5173
make setup         # bun/npm install only

make configure     # cmake configure only  (production)
make build-backend # compile Qt only  (frontend must already be built)

make check-deps    # verify cmake, bun/npm, g++, Qt6

make clean         # remove build/
make clean-all     # remove build/ + frontend/dist/ + node_modules/
```

Override the CMake build type:

```bash
make build BUILD_TYPE=Debug
```

---

## Dev mode (hot-reload)

`make dev` compiles the Qt backend, starts the Vite dev server in the
background, then launches Qt pointing at `http://localhost:5173`.
Edit any `.svelte` file and the UI updates instantly — no recompile needed.

```
┌──────────────┐   ws://localhost:8080   ┌────────────────────┐
│  Qt backend  │ ──────────────────────► │  Vite dev server   │
│  (C++ / Qt)  │ ◄────────────────────── │  localhost:5173    │
└──────────────┘       JSON data         └────────────────────┘
```

The `DASHBOARD_DEV_URL` environment variable controls which URL Qt loads.
You can also point it at any address manually:

```bash
DASHBOARD_DEV_URL=http://192.168.1.10:5173 ./build/dashboard
```

---

## Project structure

```
qt-svelte-dashboard/
├── Makefile                    # build orchestration (start here)
├── CMakeLists.txt              # root: finds Qt, wires frontend → backend
├── cmake/
│   └── CopyFrontend.cmake      # POST_BUILD script — copies dist/ safely
│                               # (no-op when dist/ doesn't exist)
├── backend/
│   ├── CMakeLists.txt
│   ├── main.cpp                # QApplication + QWebEngineView
│   │                           # honours DASHBOARD_DEV_URL env var
│   └── server.h                # QWebSocketServer + data push timer
└── frontend/
    ├── src/
    │   ├── app.css             # global reset + CSS custom properties
    │   ├── main.ts             # Svelte entry point
    │   ├── App.svelte          # dashboard layout + sparkline chart
    │   └── lib/
    │       └── ws.ts           # reactive WebSocket store (auto-reconnects)
    ├── index.html
    ├── vite.config.ts          # base="./" for QWebEngineView file:// loading
    ├── tsconfig.json
    └── package.json
```

---

## Adding real data

Edit `backend/server.h` → `pushData()`. Replace the random values with your
actual source (sensor, database, file, etc.):

```cpp
void pushData() {
    QJsonObject payload;
    payload["timestamp"]   = QDateTime::currentSecsSinceEpoch();
    payload["temperature"] = readSensor();   // ← your code here
    payload["pressure"]    = readPressure();
    payload["rpm"]         = readRPM();

    QString json = QJsonDocument(payload).toJson(QJsonDocument::Compact);
    for (QWebSocket *client : m_clients)
        client->sendTextMessage(json);
}
```

To send commands from the UI back to C++, call `dashboard.send({ ... })` in
any `.svelte` file and parse the JSON inside `DashboardServer::onMessage()`.

---

## Data flow

```
C++ pushData()  →  QWebSocketServer :8080  →  JSON  →  ws.ts store  →  Svelte UI
                                           ←  JSON commands (buttons, filters)
```
