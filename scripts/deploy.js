import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('📦 Building project...');
execSync('npm run build', { stdio: 'inherit' });

const distDir = path.resolve('dist');
fs.writeFileSync(path.join(distDir, '.nojekyll'), '');

console.log('🚀 Pushing to gh-pages branch...');
const commands = [
  'git init',
  'git config user.name "dhamodharankkp-oss"',
  'git config user.email "dhamodharankkp-oss@users.noreply.github.com"',
  'git checkout -b gh-pages',
  'git add -A',
  'git commit -m "Deploy to GitHub Pages"',
  'git remote add origin https://github.com/dhamodharankkp-oss/convex-lens-webxr-tamil.git',
  'git push -f origin gh-pages'
];

try {
  execSync(commands.join(' && '), { cwd: distDir, stdio: 'inherit' });
  console.log('✓ Successfully deployed to GitHub Pages!');
} finally {
  fs.rmSync(path.join(distDir, '.git'), { recursive: true, force: true });
}
