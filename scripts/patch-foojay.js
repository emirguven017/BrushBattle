const fs = require('fs');
const path = require('path');

// EAS iOS: Gradle yamaları yalnızca Android içindir; bulutta iOS build'de postinstall bazen kurulumu bozabiliyor.
if (process.env.EAS_BUILD_PLATFORM === 'ios') {
  console.log('patch-foojay: skipped on EAS iOS (Android-only)');
  process.exit(0);
}

const gradlePluginPath = path.join(__dirname, '..', 'node_modules', '@react-native', 'gradle-plugin');

// Patch 1: foojay-resolver-convention sürümünü güncelle
const settingsPath = path.join(gradlePluginPath, 'settings.gradle.kts');
try {
  if (fs.existsSync(settingsPath)) {
    let content = fs.readFileSync(settingsPath, 'utf8');
    // 1.0.0 requires Java 17+; 0.10.0 works with Java 8 and Gradle 8.13
    if (content.includes('foojay-resolver-convention").version("1.0.0")')) {
      content = content.replace(
        'foojay-resolver-convention").version("1.0.0")',
        'foojay-resolver-convention").version("0.10.0")'
      );
      fs.writeFileSync(settingsPath, content);
      console.log('✓ foojay-resolver-convention 0.10.0 patch applied (Java 8 compatible)');
    }
  }
} catch (e) {
  console.warn('patch-foojay:', e.message);
}

// Patch 2: Gradle 9.0.0 -> 8.13 (IBM_SEMERU Gradle 9'da kaldırıldı)
const wrapperPath = path.join(gradlePluginPath, 'gradle', 'wrapper', 'gradle-wrapper.properties');
try {
  if (fs.existsSync(wrapperPath)) {
    let content = fs.readFileSync(wrapperPath, 'utf8');
    if (content.includes('gradle-9.0.0-bin.zip')) {
      content = content.replace('gradle-9.0.0-bin.zip', 'gradle-8.13-bin.zip');
      fs.writeFileSync(wrapperPath, content);
      console.log('✓ Gradle wrapper 8.13 patch applied (fixes IBM_SEMERU error)');
    }
  }
} catch (e) {
  console.warn('patch-foojay:', e.message);
}
