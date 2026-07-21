import fs from 'fs'

const path = 'C:\\Users\\riosm\\.gemini\\antigravity-ide\\brain\\a7dab4d5-e8e2-4d33-a3f2-aa14ce7e49c1\\.system_generated\\logs\\transcript.jsonl'
const content = fs.readFileSync(path, 'utf8')
const lines = content.split('\n')

for (const line of lines) {
  if (!line.trim()) continue
  try {
    const obj = JSON.parse(line)
    if (obj.tool_calls && JSON.stringify(obj.tool_calls).includes('capture_browser_console_logs')) {
      console.log('--- CALL ---')
      console.log(obj.tool_calls)
    }
    if (obj.type === 'TOOL_RESPONSE' && obj.content && obj.content.includes('text')) {
      // Print the output of the tool if it looks like console logs
      if (obj.content.includes('timestamp') || obj.content.includes('console')) {
        console.log('--- RESPONSE ---')
        console.log(obj.content)
      }
    }
  } catch (err) {
    // Ignore parse errors
  }
}
