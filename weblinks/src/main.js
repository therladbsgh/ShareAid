const { app, BrowserWindow, ipcMain, session, Menu, Tray } = require('electron');
const fs = require('fs');
const FB = require('fb');
const { PythonShell } = require('python-shell');
const path = require('path')
const url = require('url')

const controller = require('./controller');

// Initialize server
const options = {
    scriptPath: path.join(__dirname, 'server'),
    pythonOptions: ['-u'],
};

const pyshell = new PythonShell('server.py', options);

pyshell.end((err) => {
  if (err) {
    console.log(err);
  }
});

pyshell.on('message', (message) => {
    console.log(message);
});

const python_process = pyshell.childProcess;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let tray

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720
    })

    // and load the index.html of the app.
    // mainWindow.loadURL(url.format({
    //     pathname: path.join(__dirname, 'index.html'),
    //     protocol: 'file:',
    //     slashes: true
    // }))
    mainWindow.loadURL('http://localhost:3000')

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('close', function (event) {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        if(!app.isQuiting){
            event.preventDefault();
            mainWindow.hide();
        }
    })

    controller.setupIpcMain(mainWindow);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    createWindow();
    tray = new Tray(path.join(__dirname, 'files/tray.png'));
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show Window', click() {
            mainWindow.show();
            mainWindow.webContents.send('refresh-data');
        }},
        { label: 'Quit', click() {
            app.isQuiting = true;
            app.quit();
        }},
    ])
    tray.setToolTip('This is my application.')
    tray.setContextMenu(contextMenu)
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        // app.quit()
    }
})

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
})

app.on('will-quit', function () {
    python_process.kill('SIGINT');
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

