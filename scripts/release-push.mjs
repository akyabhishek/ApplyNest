import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function run(command) {
  execSync(command, { stdio: 'inherit' })
}

function hasUncommittedChanges() {
  try {
    execSync('git diff --quiet && git diff --cached --quiet', { stdio: 'ignore' })
    return false
  } catch {
    return true
  }
}

const pkg = readJson('package.json')
const manifest = readJson('public/manifest.json')

if (pkg.version !== manifest.version) {
  console.error(
    `Version mismatch: package.json=${pkg.version} and public/manifest.json=${manifest.version}`
  )
  console.error('Update both files to the same version before releasing.')
  process.exit(1)
}

if (hasUncommittedChanges()) {
  console.error('Working tree is not clean. Commit or stash changes before releasing.')
  process.exit(1)
}

const tag = `v${manifest.version}`

try {
  execSync(`git rev-parse --verify ${tag}`, { stdio: 'ignore' })
  console.error(`Tag ${tag} already exists locally.`)
  process.exit(1)
} catch {
  // Tag does not exist locally.
}

console.log(`Creating release tag ${tag}`)
run(`git tag ${tag}`)
run('git push origin main')
run(`git push origin ${tag}`)

console.log(
  `Pushed ${tag}. GitHub Actions will publish a release with a downloadable extension ZIP.`
)
