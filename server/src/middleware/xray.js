const AWSXRay = require('aws-xray-sdk-core');
const { captureHTTPsGlobal } = require('aws-xray-sdk-core');
const https = require('https');

// Only enable X-Ray in production
if (process.env.NODE_ENV === 'production') {
  try {
    captureHTTPsGlobal(https, true);
    AWSXRay.config([AWSXRay.plugins.EC2Plugin, AWSXRay.plugins.ElasticBeanstalkPlugin]);
    console.log('✅ X-Ray distributed tracing enabled');
  } catch (err) {
    console.warn('⚠️ Failed to initialize X-Ray:', err.message);
  }
}

const xrayMiddleware = AWSXRay.express;

module.exports = { xrayMiddleware, AWSXRay };
