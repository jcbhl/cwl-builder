import { app, BrowserWindow, dialog, ipcMain, IpcMainInvokeEvent, OpenDialogOptions, SaveDialogOptions } from 'electron';

// This allows TypeScript to pick up the magic constant that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    fullscreen: true,
    webPreferences: {
      // FIXME(jcbhl): because we do not load remote content as of now in the render process,
      // it should be safe to enable node APIS within the render process. Once the render
      // process starts making external calls, we should instead use the Electron RPC layer.
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("showOpenDialog", async () => {
  const options: OpenDialogOptions = { title: "asdf" , properties: ['openDirectory']};
  const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow()!, options);
  
  if(result.filePaths.length > 1){
    throw new Error("found multiple file paths");
  }
  else if(result.canceled){
    return;
  }

  return result.filePaths;
});

ipcMain.handle("showSaveDialog", async (event: IpcMainInvokeEvent, s: string | undefined) => {
  const options: SaveDialogOptions = {title: "save workflow", defaultPath: s};
  const result = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow()!, options);
  
  if(result.canceled){
    return;
  }

  return result.filePath;
});
