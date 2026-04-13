import { execSync } from 'child_process'
import { readFileSync } from 'fs'

execSync('npm version patch --no-git-tag-version', { stdio: 'inherit' })
execSync('vite build', { stdio: 'inherit' })
execSync('gh-pages -d dist', { stdio: 'inherit' })

const version = JSON.parse(readFileSync('./package.json', 'utf-8')).version
execSync('git add package.json', { stdio: 'inherit' })
execSync(`git commit -m "chore: bump version to ${version}"`, { stdio: 'inherit' })
execSync('git push', { stdio: 'inherit' })
