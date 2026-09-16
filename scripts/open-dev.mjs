import { exec } from 'node:child_process'

const url = 'http://localhost:5173'
const command = process.platform === 'win32'
  ? `start "" "${url}"`
  : process.platform === 'darwin'
    ? `open "${url}"`
    : `xdg-open "${url}"`

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let ready = false
for (let attempt = 0; attempt < 50; attempt += 1) {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    if (response.ok) {
      ready = true
      break
    }
  } catch {
    // Сервер ещё запускается.
  }

  await sleep(100)
}

if (!ready) {
  console.error(`Dev-сервер не стал доступен по адресу ${url}`)
  process.exit(1)
}

exec(command, (error) => {
  if (error) {
    console.error(`Не удалось автоматически открыть ${url}: ${error.message}`)
    process.exitCode = 1
  }
})
