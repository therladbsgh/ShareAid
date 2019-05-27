const { BrowserWindow, ipcMain, session } = require('electron');
const axios = require('axios');
const FB = require('fb');
const fs = require('fs');
const rax = require('retry-axios');

var Env = JSON.parse(fs.readFileSync(`${__dirname}/../env.json`));

function onCheckInitialSetup(mainWindow) {
  ipcMain.on('check-initial-setup', (event, arg) => {
    mainWindow.webContents.send('check-initial-setup-result', {result: Env.initial_setup});
  });
}

async function onRunAnalysisDaemon(mainWindow) {
  ipcMain.on('run-analysis-daemon', async function (event, arg) {
    const interceptorId = rax.attach();
    axios({
      url: `${Env.server_address}/run-analyzer-daemon`,
      method: 'post',
      raxConfig: {
        retry: 3,
        noResponseRetries: 3,
        retryDelay: 1000,
        httpMethodsToRetry: ['POST'],
      }
    }).then((res) => {
      console.log("Daemon POST request completed successfully.");
    }).catch((err) => {
      console.log("Error encountered in server: onCheckInitialSetup");
    });
  });
}

function onFetchData(mainWindow) {
  ipcMain.on('fetch-data', (event, arg) => {
    const interceptorId = rax.attach();
    axios({
      url: `${Env.server_address}/fetch-data`,
      method: 'get',
      raxConfig: {
        retry: 3,
        noResponseRetries: 3,
        retryDelay: 1000,
        httpMethodsToRetry: ['GET'],
      }
    }).then((res) => {
      mainWindow.webContents.send('fetch-data-result', res.data);
      console.log("Data GET request completed successfully.");
    }).catch((err) => {
      console.log("Error encountered in server: onFetchData");
    });
  });
}

module.exports = {
  onCheckInitialSetup: onCheckInitialSetup,
  onRunAnalysisDaemon: onRunAnalysisDaemon,
  onFetchData: onFetchData
}
