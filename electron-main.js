const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function createWindow() {
  // Determine path to backend executable based on packaged status
  const isDev = !app.isPackaged;
  const backendExecutableName = 'run'; // Or 'run.exe' on Windows if needed
  let backendPath;

  if (isDev) {
    // In development, executable is in the project's dist folder
    backendPath = path.join(__dirname, 'dist', backendExecutableName);
  } else {
    // In production, executable is packaged as an extraResource
    // path.join(process.resourcesPath, 'run') might also work depending on builder config
    backendPath = path.join(app.getAppPath(), '..', backendExecutableName);
  }

  // Start the Python backend executable
  console.log(`Attempting to start backend at: ${backendPath}`);
  const spawnOptions = {
    env: {
      ...process.env, // Inherit existing env vars
      RUNNING_AS_PACKAGED: 'true' // Add our custom flag
    }
  };
  backendProcess = spawn(backendPath, [], spawnOptions); // Pass options

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend stdout: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend stderr: ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    // Optionally quit the app if the backend dies unexpectedly
    // if (code !== 0) {
    //   app.quit();
    // }
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend process:', err);
    // Quit the app if the backend fails to start
    app.quit();
  });


  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // Keep false for security
      contextIsolation: true, // Keep true for security
      // preload: path.join(__dirname, 'preload.js') // Optional: for secure IPC
    },
  });

  // Load the index.html of the app.
  // Adjust the path depending on whether running in dev or packaged mode
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'frontend/build/index.html')}`; // Corrected path
  console.log(`Loading frontend from: ${startUrl}`);
  mainWindow.loadURL(startUrl);

  // Open the DevTools (optional)
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('Attempting to kill backend process...');
  if (backendProcess) {
    backendProcess.kill();
    console.log('Backend process killed.');
  }
});

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});