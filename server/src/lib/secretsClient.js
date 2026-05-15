const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-2' });

async function getSecret(secretName) {
  try {
    const res = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
    if (res.SecretString) {
      return JSON.parse(res.SecretString);
    }
    throw new Error('SecretString not found in response');
  } catch (err) {
    console.error(`❌ Failed to fetch secret "${secretName}":`, err.message);
    throw err;
  }
}

module.exports = { getSecret };
