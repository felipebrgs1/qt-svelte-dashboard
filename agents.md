# Qt + Svelte Dashboard — Agent Instructions

This document defines how AI coding agents should understand, navigate, and contribute to this project.

---

## Project Summary

A high-performance PDF Reader with integrated translation features. It uses **Qt 6 (C++)** for the desktop shell and **Svelte 5** for the modern user interface.

- **Backend**: C++ with Qt 6. Handles file I/O, networking, and window management.
- **Frontend**: Svelte 5 + Tailwind 4 + shadcn-svelte. Handles UI and PDF rendering via `pdf.js`.
- **Bridge**: Communication is handled via `QWebChannel` using a strictly typed contract.

---

## Repository Layout

```
qt-svelte-dashboard/
├── backend/                # Qt/C++ Source Code
├── frontend/               # Svelte 5 Web Application
├── middlend/               # Shared logic & Contracts (The "Bridge" source of truth)
│   ├── contract.ts         # tRPC-style API definition
│   └── README.md           # Bridge documentation
├── cmake/                  # CMake helper scripts
├── Makefile                # Main development entry point
└── agents.md               # This file
```

---

## Architecture Rules

### 1. Single Source of Truth
- The `middlend/contract.ts` file is the **only** place where the API between C++ and JS is defined.

### 2. Layer Separation
- **C++**: No UI logic. Only data processing and system access.
- **Svelte**: No direct file system access. Use the bridge.

### 3. Type Safety
- **No `any`**: The frontend must be 100% type-safe using the `QtBridge` interface from `@middlend/contract`.
- Use `Svelte 5 Runes` for reactivity.

---

## Development Workflow

### Adding a new Bridge feature:
1. Update `middlend/contract.ts` with the new method or signal.
2. Implement it in `backend/bridge.h/cpp`.
3. Use it in Svelte with the automagically updated types.

---

## What NOT to Do

- Do not bypass the `middlend` contract.
- Do not use `any` in the frontend.
- Do not modify `qwebchannel.js` unless fixing core bridge issues.
- Do not add raw CSS if Tailwind can be used.
