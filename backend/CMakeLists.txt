cmake_minimum_required(VERSION 3.20)

# ── Frontend dist path (built by parent CMakeLists or Makefile) ───────────────
set(FRONTEND_DIST ${CMAKE_SOURCE_DIR}/frontend/dist)

# ── Dashboard executable ──────────────────────────────────────────────────────
qt_add_executable(dashboard
    main.cpp
    bridge.h
    bridge.cpp
    pdfscheme.h
    pdfscheme.cpp
)

target_link_libraries(dashboard PRIVATE
    Qt6::Core
    Qt6::WebChannel
    Qt6::WebEngineWidgets
    Qt6::Widgets
    Qt6::Pdf
    Qt6::WebEngineCore
)

# Ensure C++17 is used (inherits from parent but explicit is safer)
target_compile_features(dashboard PRIVATE cxx_std_17)

# ── Conditionally copy frontend/dist after build ──────────────────────────────
# Uses cmake/CopyFrontend.cmake which silently skips the copy when
# frontend/dist does not exist (e.g. in dev mode where Vite serves the UI).
add_custom_command(TARGET dashboard POST_BUILD
    COMMAND ${CMAKE_COMMAND}
        -DFRONTEND_DIST=${FRONTEND_DIST}
        -DTARGET_DIR=$<TARGET_FILE_DIR:dashboard>/frontend
        -P ${CMAKE_SOURCE_DIR}/cmake/CopyFrontend.cmake
    COMMENT "Deploying frontend assets (skipped if dist/ absent)..."
    VERBATIM
)
