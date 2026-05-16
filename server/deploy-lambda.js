#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { LambdaClient, UpdateFunctionCodeCommand } = require('@aws-sdk/client-lambda');

const LAMBDA_FUNCTIONS = {
  blastDispatcher: 'heidi-blastDispatcher'
};

async function deployLambda() {
  try {
    const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-2' });

    for (const [fnName, awsFnName] of Object.entries(LAMBDA_FUNCTIONS)) {
      console.log(`\n📦 Deploying ${fnName}...`);

      const zipPath = path.join(__dirname, `lambda-deploy/${fnName}.zip`);

      // Read the zip file
      const zipBuffer = fs.readFileSync(zipPath);

      // Update Lambda function
      const command = new UpdateFunctionCodeCommand({
        FunctionName: awsFnName,
        ZipFile: zipBuffer
      });

      const response = await lambdaClient.send(command);
      console.log(`✅ ${fnName} deployed successfully`);
      console.log(`   CodeSha256: ${response.CodeSha256}`);
      console.log(`   LastModified: ${response.LastModified}`);
    }

    console.log('\n✅ All Lambda functions deployed successfully!');
  } catch (err) {
    console.error('❌ Deployment failed:', err.message);
    process.exit(1);
  }
}

async function rebuildZips() {
  try {
    console.log('🔨 Rebuilding Lambda deployment packages...\n');

    const blastPath = path.join(__dirname, 'lambda-deploy/blastDispatcher');
    const zipPath = path.join(__dirname, 'lambda-deploy/blastDispatcher.zip');

    // Remove old zip
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    // Create new zip (simple approach - zip the directory)
    console.log('📦 Creating blastDispatcher.zip...');
    execSync(`cd "${blastPath}" && zip -r "${zipPath}" . -x "node_modules/*" 2>/dev/null || true`);
    execSync(`cd "${blastPath}" && zip -r "${zipPath}" node_modules/ 2>/dev/null || true`);

    console.log(`✅ Zip created: ${zipPath}`);
  } catch (err) {
    console.error('❌ Rebuild failed:', err.message);
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 AWS Lambda Deployment\n');

  await rebuildZips();
  await deployLambda();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
