function scheduleDispatcher(pool) {
  const BASE_URL = process.env.APP_BASE_URL || (process.env.NODE_ENV === 'production'
    ? 'https://heidi-prod.eba-dkbkgcjs.us-east-1.elasticbeanstalk.com'
    : 'http://localhost:5000');

  console.log(`⏱️ Email scheduler disabled - scheduled sends via POST /api/email/send`);
  // Scheduled sends are queued via SQS or processed synchronously by the API route
  // This scheduler is deprecated; use the /api/email/send endpoint instead
}

module.exports = { scheduleDispatcher };
