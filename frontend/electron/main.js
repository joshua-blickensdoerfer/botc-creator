"use strict";
exports.__esModule = true;
var electron_1 = require("electron");
var createMainWindow = function () {
    var mainWindow = new electron_1.BrowserWindow({
        width: electron_1.screen.getPrimaryDisplay().workArea.width,
        height: electron_1.screen.getPrimaryDisplay().workArea.height,
        show: false,
        backgroundColor: 'white',
        webPreferences: {
            nodeIntegration: false
        }
    });
    var startURL = 'http://localhost:3000';
    mainWindow.loadURL(startURL);
    mainWindow.once('ready-to-show', function () { return mainWindow.show(); });
};
electron_1.app.whenReady().then(function () {
    createMainWindow();
    electron_1.app.on('activate', function () {
        if (!electron_1.BrowserWindow.getAllWindows().length) {
            createMainWindow();
        }
    });
});
electron_1.app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
