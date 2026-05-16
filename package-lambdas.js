#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

const baseDir = path.join(__dirname, 'server', 'lambda-deploy');
const functions = ['emailEventProcessor', 'gpsProcessor', 'blastDispatcher', 'lighthouseAudit', 'sesEventProcessor'];

async function packageFunction(funcName) {
  const funcDir = path.join(baseDir, funcName);
  const zipPath = path.join(baseDir, `${funcName}.zip`);

  console.log(`📦 ${funcName}...`);

  // npm install
  try {
    execSync('npm install --production', { cwd: funcDir, stdio: 'pipe' });
  } catch (e) {
    console.log(`   ℹ️  npm install status: ${e.message.split('\n')[0]}`);
  }

  // Create zip
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 6 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const size = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(2);
      console.log(`✅ ${funcName} (${size} MB)\n`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(funcDir, false);
    archive.finalize();
  });
}

async function main() {
  console.log('\n📦 Packaging Lambda functions...\n');
  for (const func of functions) {
    try {
      await packageFunction(func);
    } catch (err) {
      console.error(`❌ Failed to package ${func}:`, err.message);
      process.exit(1);
    }
  }
  console.log('✅ All functions packaged successfully!\n');
}

main();
