import { exec } from 'node:child_process'

const url = 'http://localhost:5173'
const command = process.platform === 'win32'
  ? `start "" "${url}"`
  : process.platform === 'darwin'
    ? `open "${url}"`
    : `xdg-open "${url}"`

const timer = setTimeout(() => {
  exec(command, (error) => {
    if (error) {
      console.error(`Не удалось автоматически открыть ${url}: ${error.message}`)
      process.exitCode = 1
    }
  })
}, 500)

timer.unref()
