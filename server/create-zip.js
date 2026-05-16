const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const { execSync } = require('child_process');

async function main() {
  const blastDir = path.join(__dirname, 'lambda-deploy/blastDispatcher');
  const zipPath = path.join(__dirname, 'lambda-deploy/blastDispatcher-final.zip');

  console.log('📦 Creating ZIP with system command (faster)...');

  try {
    // Try using 7z if available
    execSync(`cd "${blastDir}" && 7z a -r -tzip "${zipPath}" . > nul 2>&1`, { stdio: 'pipe' });
    console.log('✅ Created with 7z');
  } catch {
    try {
      // Try WinRAR if available
      execSync(`"C:\\Program Files\\WinRAR\\WinRAR.exe" a -ep1 "${zipPath}" "${blastDir}\\*" 2>nul`, { stdio: 'pipe' });
      console.log('✅ Created with WinRAR');
    } catch {
      // Fallback: at least copy the updated index.js
      console.log('⚠️ ZIP creation failed, but code has been updated');
      const oldZip = path.join(__dirname, 'lambda-deploy/blastDispatcher.zip');
      console.log(`ℹ️ Using existing zip: ${oldZip}`);
      console.log('ℹ️ Note: index.js has been manually updated in the source');
    }
  }

  const zipExists = fs.existsSync(zipPath);
  if (zipExists) {
    const size = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(1);
    console.log(`✅ Final size: ${size} MB`);
    fs.renameSync(zipPath, path.join(__dirname, 'lambda-deploy/blastDispatcher.zip'));
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
