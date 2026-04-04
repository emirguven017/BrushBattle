#!/bin/sh
set -e

echo "=== Xcode Cloud: ci_post_clone ==="

# Node.js kur (Xcode Cloud makinelerinde varsayilan olarak yok)
brew install node

# Proje kokune git
cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "--- npm ci ---"
npm ci

echo "--- pod install ---"
cd ios
pod install

echo "=== ci_post_clone tamamlandi ==="
