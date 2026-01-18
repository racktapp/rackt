const { getDefaultConfig } = require("expo/metro-config");
const { withExpoRouter } = require("expo-router/metro");

module.exports = withExpoRouter(getDefaultConfig(__dirname));
