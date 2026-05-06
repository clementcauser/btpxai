#!/usr/bin/env node
// Charge .env.test puis démarre next dev — utilisé par le script test:ci
const path = require("path")
const root = path.resolve(__dirname, "..")

require("dotenv").config({ path: path.join(root, ".env.test") })

const { spawn } = require("child_process")
const next = path.join(root, "node_modules", ".bin", "next")
const child = spawn(next, ["dev"], { stdio: "inherit", env: process.env, cwd: root })

process.on("SIGTERM", () => child.kill("SIGTERM"))
process.on("SIGINT", () => child.kill("SIGINT"))
child.on("close", (code) => process.exit(code ?? 0))
