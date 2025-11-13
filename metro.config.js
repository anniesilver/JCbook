const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude backend server and test folders from Metro bundler
config.resolver.blockList = [
  /backend-server\/.*/,
  /test-login-comparison\/.*/,
];

// Only watch relevant directories for changes
config.watchFolders = [__dirname];

module.exports = config;
