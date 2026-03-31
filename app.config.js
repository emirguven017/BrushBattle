module.exports = {
  expo: {
    name: "Brush Timer",
    slug: "brush-battle",
    scheme: "brushbattle",
    plugins: ["expo-video"],
    extra: {
      eas: {
        projectId: "2f09e0ad-65cc-4aa3-806f-6536c9ef5535",
      },
    },
    ios: {
      bundleIdentifier: "com.brushbattle",
    },
    android: {
      package: "com.brushbattle",
    },
  },
};
