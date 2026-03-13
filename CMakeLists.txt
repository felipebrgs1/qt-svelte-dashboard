cmake_minimum_required(VERSION 3.20)
project(QtSvelteDashboard)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_AUTOMOC ON)

# Place all executables directly under build/ (not build/backend/)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR})

find_package(Qt6 REQUIRED COMPONENTS Core WebChannel WebEngineWidgets Widgets Pdf)

# ── Option: skip npm/bun build when the Makefile already did it ───────────────
option(FRONTEND_ALREADY_BUILT
    "Skip frontend npm/bun build step (set by Makefile after running 'make frontend')"
    OFF)

set(FRONTEND_DIST ${CMAKE_SOURCE_DIR}/frontend/dist)

if(NOT FRONTEND_ALREADY_BUILT)
    # Prefer bun over npm when available
    find_program(PKG_MANAGER NAMES bun npm REQUIRED
        DOC "JavaScript package manager (bun or npm)")

    message(STATUS "Frontend package manager: ${PKG_MANAGER}")

    add_custom_target(frontend_build ALL
        COMMAND ${PKG_MANAGER} install
        COMMAND ${PKG_MANAGER} run build
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}/frontend
        BYPRODUCTS ${FRONTEND_DIST}
        COMMENT "Building Svelte/Vite frontend with ${PKG_MANAGER}..."
    )
endif()

add_subdirectory(backend)

if(NOT FRONTEND_ALREADY_BUILT)
    add_dependencies(dashboard frontend_build)
endif()
