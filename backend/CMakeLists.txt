cmake_minimum_required(VERSION 3.20)

# ── SQL Support ───────────────────────────────────────────────────────────────
find_package(Qt6 REQUIRED COMPONENTS Sql)

# ── Frontend dist path ────────────────────────────────────────────────────────
set(FRONTEND_DIST ${CMAKE_SOURCE_DIR}/frontend/dist)

# ── Resource Generation ───────────────────────────────────────────────────────
# We generate the .qrc file during configuration to embed all frontend assets.
set(RESOURCES_QRC ${CMAKE_CURRENT_BINARY_DIR}/frontend_generated.qrc)

if(NOT EXISTS ${FRONTEND_DIST}/index.html)
    message(FATAL_ERROR
        "\n FATAL ERROR: Frontend assets not found at ${FRONTEND_DIST}\n"
        " You must build the frontend first by running 'make frontend' or 'make build'.\n"
        " The binary requires these files to be embedded via Qt Resources (QRC).\n"
    )
endif()

# Collect all files in frontend/dist
file(GLOB_RECURSE FRONTEND_FILES RELATIVE ${FRONTEND_DIST} "${FRONTEND_DIST}/*")

# Start generating the QRC file content
set(QRC_CONTENT "<!DOCTYPE RCC><RCC version=\"1.0\">\n<qresource prefix=\"/\">\n")

foreach(FILE ${FRONTEND_FILES})
    if(NOT IS_DIRECTORY ${FRONTEND_DIST}/${FILE})
        # Map frontend/dist/file.ext to :/file.ext inside the binary
        string(APPEND QRC_CONTENT "    <file alias=\"${FILE}\">${FRONTEND_DIST}/${FILE}</file>\n")
    endif()
endforeach()

string(APPEND QRC_CONTENT "</qresource></RCC>\n")

# Write the QRC file
file(WRITE ${RESOURCES_QRC} "${QRC_CONTENT}")
message(STATUS "Successfully mapped frontend assets to: ${RESOURCES_QRC}")

# ── Dashboard executable ──────────────────────────────────────────────────────
# The generated .qrc file is added to the executable sources.
# Qt's AUTOMOC/AUTORCC will handle the compilation.
qt_add_executable(dashboard
    main.cpp
    bridge.h
    bridge.cpp
    pdfscheme.h
    pdfscheme.cpp
    ${RESOURCES_QRC}
)

target_link_libraries(dashboard PRIVATE
    Qt6::Core
    Qt6::WebChannel
    Qt6::WebEngineWidgets
    Qt6::Widgets
    Qt6::Pdf
    Qt6::WebEngineCore
    Qt6::Sql
)

# Ensure C++17
target_compile_features(dashboard PRIVATE cxx_std_17)

# ── POST_BUILD: Copy for local folder loading (backwards compatibility) ───────
add_custom_command(TARGET dashboard POST_BUILD
    COMMAND ${CMAKE_COMMAND}
        -DFRONTEND_DIST=${FRONTEND_DIST}
        -DTARGET_DIR=$<TARGET_FILE_DIR:dashboard>/frontend
        -P ${CMAKE_SOURCE_DIR}/cmake/CopyFrontend.cmake
    COMMENT "Deploying frontend assets to build folder for local development..."
    VERBATIM
)
