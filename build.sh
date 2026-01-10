#!/bin/bash
echo "Building..."
npx vite build public --outDir ../dist --emptyOutDir

echo "Copying assets..."
cp -r public/assets/* dist/assets/

echo "Previewing..."
npx vite preview --outDir dist