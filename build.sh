#!/usr/bin/env bash
# Bulletproof Render Build Script for EdgeIQ

# 1. Root Level Install
echo "--- INSTALLING ROOT DEPENDENCIES ---"
npm install --legacy-peer-deps

# 2. Backend Level Install
echo "--- INSTALLING BACKEND DEPENDENCIES ---"
cd backend
npm install --legacy-peer-deps
cd ..

# 3. Frontend Level Install (The most sensitive part)
echo "--- INSTALLING FRONTEND DEPENDENCIES ---"
cd frontend
npm install --legacy-peer-deps

# 4. Critical Dependency Fixes (CORS, CSS, Resolvers)
echo "--- APPLYING CRITICAL PATCHES ---"
npm install strip-json-comments@3.1.1 caniuse-lite@latest --save

# 5. Build Frontend
echo "--- BUILDING FRONTEND ---"
export CI=false
node node_modules/react-scripts/bin/react-scripts.js build

echo "--- BUILD COMPLETE ---"
