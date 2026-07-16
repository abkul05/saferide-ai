const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for resolving .cjs files (required by modern Firebase SDK)
config.resolver.sourceExts.push('cjs');

module.exports = config;
