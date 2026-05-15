const { SSMClient, GetParametersCommand, PutParameterCommand } = require('@aws-sdk/client-ssm');

const client = new SSMClient({ region: process.env.AWS_REGION || 'us-east-2' });

async function getParameters(names) {
  try {
    const res = await client.send(new GetParametersCommand({ Names: names, WithDecryption: true }));
    const params = Object.fromEntries(res.Parameters.map(p => [p.Name.split('/').pop(), p.Value]));
    return params;
  } catch (err) {
    console.error('❌ Failed to fetch SSM parameters:', err.message);
    throw err;
  }
}

async function setParameter(name, value, secure = false) {
  try {
    await client.send(new PutParameterCommand({
      Name: name,
      Value: value,
      Type: secure ? 'SecureString' : 'String',
      Overwrite: true
    }));
  } catch (err) {
    console.error(`❌ Failed to set SSM parameter ${name}:`, err.message);
    throw err;
  }
}

module.exports = { getParameters, setParameter };
