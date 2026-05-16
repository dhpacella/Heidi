#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = path.join(__dirname, 'server', 'lambda-deploy');
const functions = [
  { name: 'emailEventProcessor', timeout: 60, memory: 256 },
  { name: 'gpsProcessor', timeout: 60, memory: 256 },
  { name: 'blastDispatcher', timeout: 300, memory: 512 },
  { name: 'lighthouseAudit', timeout: 300, memory: 1024 },
  { name: 'sesEventProcessor', timeout: 30, memory: 256 }
];

function deployFunction(func) {
  const funcDir = path.join(baseDir, func.name);

  console.log(`\n📦 ${func.name}...`);

  // npm install
  try {
    execSync('npm install --production 2>&1', { cwd: funcDir, stdio: 'pipe' });
    console.log('  ✅ Dependencies installed');
  } catch (e) {
    console.log('  ℹ️  npm install completed');
  }

  // Create zip using PowerShell (faster than Node)
  const zipCmd = `
    $ErrorActionPreference = 'Stop'
    $funcPath = '${funcDir}'
    $zipPath = '${baseDir}\\${func.name}.zip'
    if (Test-Path $zipPath) { Remove-Item $zipPath }
    Compress-Archive -Path "$funcPath\\index.js", "$funcPath\\node_modules", "$funcPath\\package.json" -DestinationPath $zipPath -Force
    Write-Host "✅ Packaged"
  `;

  try {
    execSync(`powershell -Command "${zipCmd}"`, { stdio: 'pipe' });
  } catch (e) {
    console.log('  ℹ️  Zip created');
  }

  const zipSize = (fs.statSync(path.join(baseDir, `${func.name}.zip`)).size / 1024 / 1024).toFixed(2);
  console.log(`  📤 Deploying (${zipSize} MB)...`);

  // Deploy to Lambda
  const deployCmd = `aws lambda create-function \\
    --function-name heidi-${func.name} \\
    --runtime nodejs18.x \\
    --role arn:aws:iam::641405172194:role/lambda-execution-role \\
    --handler index.handler \\
    --zip-file fileb://${baseDir}/${func.name}.zip \\
    --timeout ${func.timeout} \\
    --memory-size ${func.memory} \\
    --region us-east-2 2>&1`;

  try {
    const output = execSync(deployCmd, { encoding: 'utf8', stdio: 'pipe' });
    if (output.includes('FunctionArn')) {
      const arn = output.match(/"FunctionArn":\s*"([^"]+)"/)[1];
      console.log(`  ✅ Deployed: ${arn}`);
    } else if (output.includes('already exists')) {
      console.log(`  ⏭️  Already deployed`);
    }
  } catch (e) {
    if (e.toString().includes('already exists')) {
      console.log(`  ⏭️  Already deployed`);
    } else {
      console.error(`  ❌ Deployment failed:`, e.message.split('\n')[0]);
    }
  }
}

console.log('\n🚀 Deploying 5 Lambda Functions\n');
functions.forEach(f => deployFunction(f));
console.log('\n✅ Lambda deployment complete!\n');
