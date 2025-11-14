const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude backend server and test folders from Metro bundler
config.resolver.blockList = [
  /backend-server\/.*/,
  /test-login-comparison\/.*/,
];

// Explicitly exclude backend-server from being watched
config.watchFolders = [__dirname];
config.resolver.sourceExts = ['js', 'json', 'ts', 'tsx', 'jsx'];

// Don't look for modules in backend-server
const originalNodeModulesPaths = config.resolver.nodeModulesPaths || [];
config.resolver.nodeModulesPaths = originalNodeModulesPaths.filter(
  p => !p.includes('backend-server')
);

module.exports = config;
