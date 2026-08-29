const { mkdirSync } = require("node:fs");
const { resolve } = require("node:path");

const appRoot = resolve(__dirname, "../app");
const typesDirectory = resolve(__dirname, "../.expo/types");

process.env.EXPO_ROUTER_APP_ROOT = appRoot;
mkdirSync(typesDirectory, { recursive: true });

const { regenerateDeclarations } = require("expo-router/build/typed-routes");

regenerateDeclarations(typesDirectory);
