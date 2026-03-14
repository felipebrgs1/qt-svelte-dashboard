# Qt + Svelte Dashboard — Agent Instructions

This document defines how AI coding agents should understand, navigate, and contribute to this project. It serves as the "Labyrinth Thread" to ensure continuity between sessions.

---

## 1. Project Summary & Tech Stack

A high-performance PDF Reader and Dashboard. It bridges the power of native C++ with the flexibility of a modern web UI.

### Core Stack:
- **Package Manager**: **Bun** (Mandatory). Do NOT use `npm` or `yarn`.
- **Backend (Shell)**: Qt 6.8+ (C++). Handles file system, PDF parsing, and window management.
- **Frontend (UI)**: Svelte 5 (Runes) + Tailwind 4 + shadcn-svelte.
- **Auto-imports**: Enabled via `unplugin-svelte-components`.
- **Communication**: `QWebChannel` via a strictly typed `middlend` contract.

---

## 2. Repository Layout

```text
qt-svelte-dashboard/
├── backend/                # Qt/C++ Source Code
├── frontend/               # Svelte 5 Web Application
│   ├── src/
│   │   ├── lib/            # Shared components and utilities
│   │   │   ├── components/ # UI Components (Auto-imported)
│   │   │   ├── blocks/     # UI Sections (Auto-imported)
│   │   │   └── state/      # Global Svelte Runes ($state)
│   └── components.d.ts     # Auto-generated type definitions
├── middlend/               # Bridge Source of Truth
└── Makefile                # Unified commands (use bun inside)
```

---

## 3. Architecture Rules & Guidelines

### A. Svelte 5 & Auto-imports (Crucial)
- **Automatic Components**: You do NOT need to import components from `src/lib/components`, `src/lib/components/ui`, or `src/lib/components/blocks`. Simply use them in the markup (e.g., `<Button>`, `<Sidebar>`, `<PdfViewer>`).
- **Namespace Exception**: Components using namespaces (like `Card.Root`) still require `import * as Card from "@/lib/components/ui/card"` to maintain IDE clarity and Svelte 5 compatibility.
- **Runes**: Use `$state`, `$derived`, and `$props`. Avoid legacy Svelte 4 syntax.

### B. Package Management
- Always use **Bun**.
- To add a dependency: `bun add <package>`.
- To run scripts: `bun run <script>`.

### C. The Bridge (Qt <-> JS)
- **Contract First**: Any new feature requiring C++ data MUST start by updating `middlend/contract.ts`.

---

## 4. Breadcrumb Protocol (Inflection Points)

To "help the next agent" navigate the labyrinth, you must document **Inflection Points**—critical decision nodes.

### The "Rastro" Format:
Add a comment block at the top of the relevant function or file:
```typescript
/**
 * [INFLECTION POINT]: <Short Title>
 * Context: Why X was chosen over Y.
 * Caveat: What might break if this is changed?
 * Next Step: Recommended improvement for the next agent.
 */
```

---

## 5. Development Workflow

1.  **Search**: Grep for `[INFLECTION POINT]` in the directory you are about to modify.
2.  **Clean Code**: Do not add manual imports for components located in the auto-import directories.
3.  **Implement**: Use Svelte 5 Runes.
4.  **Mark**: Leave your own Breadcrumb if you solved a complex problem.

---

## 6. What NOT to Do

- **No NPM**: Never run `npm install`. Use `bun`.
- **No Manual Component Imports**: Stop importing UI/Blocks components manually unless they use the namespace pattern.
- **No `any`**: The frontend must be 100% type-safe.
- **No Style Pollution**: Do not add raw `<style>` tags unless Tailwind cannot solve it.
- **Don't Ghost**: Never finish a task without leaving a trail for the next agent.