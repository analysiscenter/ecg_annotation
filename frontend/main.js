const {app, BrowserWindow} = require('electron')
const path = require('path')
const url = require('url')

let win

function createWindow () {
  win = new BrowserWindow({width: 1000, height: 600, icon: path.join(__dirname, '/public/logo.png')})

  win.loadURL(url.format({
    pathname: path.join(__dirname, 'dist/index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // win.webContents.openDevTools()

  win.on('closed', () => {
    win = null
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('ready', createWindow)

app.on('browser-window-created', function (e, window) {
  window.setMenu(null)
})

app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})
