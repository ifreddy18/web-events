// Usage (dev database only):
//   pnpm auth:create-admin --email you@example.com --name "Your Name"
// The password is read from a hidden prompt, or from ADMIN_PASSWORD for non-interactive use.
import { createInterface } from "node:readline"
import { parseArgs } from "node:util"
import { createUserWithPassword } from "../src/server/auth/provision.ts"

const { values } = parseArgs({ options: { email: { type: "string" }, name: { type: "string" } } })
if (!values.email || !values.name) {
  console.error('Usage: pnpm auth:create-admin --email <email> --name "<name>"')
  process.exit(2)
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput
    ;(rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s) => {
      if (s.startsWith(question)) write.call(rl, s)
    }
    rl.question(question, (answer) => {
      rl.close()
      process.stdout.write("\n")
      resolve(answer)
    })
  })
}

const password = process.env.ADMIN_PASSWORD ?? (await promptHidden("Password (min 12 chars): "))

try {
  const user = await createUserWithPassword({ email: values.email, name: values.name, password, role: "admin" })
  console.log(`Created administrator ${user.email} (id ${user.id}).`)
  process.exit(0)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
