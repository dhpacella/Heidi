const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const client = new S3Client({ region: process.env.AWS_REGION || 'us-east-2' });
const BUCKET = process.env.S3_BUCKET || 'heidi-voter-dashboard';

async function uploadFile(key, body, contentType = 'application/octet-stream') {
  try {
    await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType
    }));
    return key;
  } catch (err) {
    console.error(`❌ S3 upload failed for key "${key}":`, err.message);
    throw err;
  }
}

async function getPresignedUrl(key, expiresIn = 3600) {
  try {
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn }
    );
    return url;
  } catch (err) {
    console.error(`❌ Failed to generate presigned URL for key "${key}":`, err.message);
    throw err;
  }
}

module.exports = { uploadFile, getPresignedUrl, BUCKET };
