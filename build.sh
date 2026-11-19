#!/usr/bin/env sh
# Rebuilds public/app.js from src/. React, react-dom and lucide-react stay external: index.html loads them.
set -e
cd "$(dirname "$0")"
NODE_ENV=production bun build src/main.jsx --production \
  --external react --external react-dom --external lucide-react \
  --outfile public/app.js
echo "Built public/app.js"
