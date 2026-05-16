const https = require('https');
let AWSXRay = null;

try {
  AWSXRay = require('aws-xray-sdk-core');
  const { captureHTTPsGlobal } = AWSXRay;

  if (process.env.NODE_ENV === 'production' && process.env.AWS_LAMBDA_FUNCTION_NAME) {
    try {
      captureHTTPsGlobal(https, true);
      AWSXRay.config([AWSXRay.plugins.EC2Plugin, AWSXRay.plugins.ElasticBeanstalkPlugin]);
      console.log('✅ X-Ray distributed tracing enabled');
    } catch (err) {
      console.warn('⚠️ Failed to initialize X-Ray:', err.message);
    }
  }
} catch (err) {
  console.warn('⚠️ aws-xray-sdk-core not available, skipping X-Ray initialization');
}

// Stub middleware - either uses AWSXRay.express or dummy middleware
const xrayMiddleware = AWSXRay && AWSXRay.express ? AWSXRay.express : {
  openSegment: (name) => (req, res, next) => next(),
  closeSegment: () => (req, res, next) => next(),
};

module.exports = { xrayMiddleware, AWSXRay };
