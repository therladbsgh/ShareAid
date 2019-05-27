const authController = require('./authenticate.js');
const dataController = require('./data.js');

function setupIpcMain(mainWindow) {
  authController.onFbAuthenticate(mainWindow);
  authController.onFbCheckAuth(mainWindow);

  dataController.onCheckInitialSetup(mainWindow);
  dataController.onRunAnalysisDaemon(mainWindow);
  dataController.onFetchData(mainWindow);
}

module.exports = {
  setupIpcMain: setupIpcMain
}
