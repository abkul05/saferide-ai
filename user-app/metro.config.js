const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for resolving .cjs files (required by modern Firebase SDK)
config.resolver.sourceExts.push('cjs');

// Opt-out of the unstable package exports feature to fix Firebase Auth initialization errors
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
