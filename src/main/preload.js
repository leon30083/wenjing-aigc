const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVersions: () => ({
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node
  }),
  getPlatform: () => process.platform
});
