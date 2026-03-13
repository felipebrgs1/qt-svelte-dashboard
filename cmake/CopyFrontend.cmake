# CopyFrontend.cmake
# Called as a POST_BUILD script via cmake -P.
# Copies frontend/dist → target binary dir only when the dist folder exists.
# This makes the build safe in dev mode (where Vite serves the frontend).
#
# Expected variables (passed with -D):
#   FRONTEND_DIST  — absolute path to frontend/dist
#   TARGET_DIR     — absolute path to <binary_dir>/frontend

if(NOT DEFINED FRONTEND_DIST OR NOT DEFINED TARGET_DIR)
    message(FATAL_ERROR "CopyFrontend.cmake requires -DFRONTEND_DIST=... -DTARGET_DIR=...")
endif()

if(EXISTS "${FRONTEND_DIST}" AND IS_DIRECTORY "${FRONTEND_DIST}")
    message(STATUS "Copying frontend/dist → ${TARGET_DIR}")
    file(MAKE_DIRECTORY "${TARGET_DIR}")
    file(COPY "${FRONTEND_DIST}/" DESTINATION "${TARGET_DIR}")
    message(STATUS "Frontend assets copied successfully.")
else()
    message(STATUS "frontend/dist not found — skipping copy (dev mode or not built yet).")
    message(STATUS "  Expected: ${FRONTEND_DIST}")
    message(STATUS "  Run 'make frontend' or 'make build' to generate it.")
endif()
