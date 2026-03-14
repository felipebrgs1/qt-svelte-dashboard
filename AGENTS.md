# Qt + Svelte Dashboard — Agent Instructions

This document defines how AI coding agents should understand, navigate, and contribute to this project. It serves as the "Labyrinth Thread" to ensure continuity between sessions.

---

## 1. Project Summary & Tech Stack

A high-performance PDF Reader and Dashboard. It bridges the power of native C++ with the flexibility of a modern web UI.

### Core Stack:
- **packager** bun.
- **Backend (Shell)**: Qt 6.8+ (C++). Handles file system, PDF parsing via specialized libs (if applicable), and window management.
- **Frontend (UI)**: Svelte 5 (Runes) + Tailwind 4 + shadcn-svelte.
- **PDF Engine**: `pdf.js` for client-side rendering and annotation previews.
- **Communication**: `QWebChannel` via a strictly typed `middlend` contract.

---

## 2. Detailed Repository Layout

```text
qt-svelte-dashboard/
├── backend/                # Qt/C++ Source Code
│   ├── src/                # Implementation files (.cpp)
│   ├── include/            # Header files (.h)
│   ├── bridge/             # QtWebChannel implementation logic
│   └── main.cpp            # Application entry point & QWebEngine setup
├── frontend/               # Svelte 5 Web Application
│   ├── src/
│   │   ├── lib/            # Shared components and utilities
│   │   │   ├── components/ # Atomic UI (shadcn-svelte base)
│   │   │   ├── blocks/     # Complex UI sections (Sidebar, PDFViewer)
│   │   │   └── state/      # Global Svelte Runes ($state)
│   │   ├── routes/         # SvelteKit/Router pages
│   │   └── app.css         # Tailwind 4 entry point
│   └── static/             # Static assets (PDF.js worker, icons)
├── middlend/               # The "Source of Truth"
│   ├── contract.ts         # TypeScript interfaces for the Bridge
│   └── README.md           # Documentation for the Bridge API
├── cmake/                  # CMake helper scripts for Qt build
└── Makefile                # Unified commands (make dev, make build)
```

---

## 3. Architecture Rules & Guidelines

### A. Svelte 5 Runes (Mandatory)
- **Do not use `let` for reactivity.** Use `$state()`.
- **Prefer `$derived()`** over manual updates for computed values.
- **Use `$props()`** for component communication.
- **Encapsulate logic**: Keep complex state in `.svelte.ts` files using classes or functions returning runes.

### B. Tailwind 4 & UI
- **Utility First**: Use Tailwind classes for 99% of styling.
- **Theming**: Follow the `shadcn-svelte` pattern for consistent colors and spacing.
- **Consistency**: Before creating a new component, check `frontend/src/lib/components` to see if a base already exists.

### C. The Bridge (Qt <-> JS)
- **Contract First**: Any new feature requiring C++ data MUST start by updating `middlend/contract.ts`.
- **Asynchronous by Default**: All bridge calls return Promises. Handle loading/error states in the UI.

---

## 4. Breadcrumb Protocol (Inflection Points)

To "help the next agent" navigate the labyrinth, you must document **Inflection Points**—critical decision nodes that impact future development.

### When to leave a "Rastro" (Trail):
- When you implement a non-obvious workaround for `pdf.js` quirks.
- When you define a complex data transformation between C++ and JS.
- When you make a structural choice in the Svelte component hierarchy.

### The "Rastro" Format:
Add a comment block at the top of the relevant function or file:
```typescript
/**
 * [INFLECTION POINT]: <Short Title>
 * Context: Why X was chosen over Y (e.g., Performance vs. Complexity).
 * Caveat: What might break if this is changed?
 * Next Step: Recommended improvement for the next agent.
 */
```

---

## 5. Development Workflow

1.  **Search**: Grep for `[INFLECTION POINT]` in the directory you are about to modify.
2.  **Contract**: If the feature needs data, modify `middlend/contract.ts`.
3.  **Implement**: 
    - Update C++ `Bridge` classes in `backend/`.
    - Update Svelte components in `frontend/`.
4.  **Mark**: Leave your own Breadcrumb if you solved a complex problem.

---

## 6. What NOT to Do

- **No `any`**: The frontend must be 100% type-safe.
- **No Direct FS**: Svelte code must never try to access files directly (use the Bridge).
- **No Style Pollution**: Do not add raw `<style>` tags in Svelte unless Tailwind cannot solve it.
- **Don't Ghost**: Never finish a task without leaving a trail for the next agent if the logic is complex.
