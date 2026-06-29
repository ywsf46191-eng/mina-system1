const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'نظام إدارة العيادة',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Allow Firebase to work (needs web storage access)
      partition: 'persist:clinic',
    },
    // RTL-friendly window
    titleBarStyle: 'default',
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links in browser, not Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
