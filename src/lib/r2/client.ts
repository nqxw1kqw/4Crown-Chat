import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  CompletedPart,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let cachedR2Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (cachedR2Client) return cachedR2Client;

  const accountId = process.env.R2_ACCOUNT_ID || 'dummy-account-id';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || 'dummy-access-key';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || 'dummy-secret-key';

  cachedR2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return cachedR2Client;
}

export function getR2BucketName(): string {
  return process.env.R2_BUCKET_NAME || 'game-team-hub-bucket';
}

/**
 * 1. Khởi tạo Multipart Upload
 */
export async function createMultipartUpload(key: string, contentType: string) {
  const s3 = getR2Client();
  const bucket = getR2BucketName();

  const command = new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const response = await s3.send(command);
  if (!response.UploadId) {
    throw new Error('Failed to create multipart upload, missing UploadId');
  }

  return response.UploadId;
}

/**
 * 2. Cấp presigned URL cho từng Part (hạn 1 giờ)
 */
export async function getPresignedPartUrl(
  key: string,
  uploadId: string,
  partNumber: number,
  expiresInSeconds = 3600
): Promise<string> {
  const s3 = getR2Client();
  const bucket = getR2BucketName();

  const command = new UploadPartCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/**
 * 3. Hoàn tất Multipart Upload
 */
export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: CompletedPart[]
) {
  const s3 = getR2Client();
  const bucket = getR2BucketName();

  const command = new CompleteMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts,
    },
  });

  return await s3.send(command);
}

/**
 * 4. Hủy Multipart Upload
 */
export async function abortMultipartUpload(key: string, uploadId: string) {
  const s3 = getR2Client();
  const bucket = getR2BucketName();

  const command = new AbortMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
  });

  return await s3.send(command);
}

/**
 * 5. Cấp presigned GET URL cho Video Streaming (hạn 1 giờ)
 */
export async function getPresignedVideoGetUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const s3 = getR2Client();
  const bucket = getR2BucketName();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/**
 * 6. Cấp presigned GET URL để tải file về kèm filename attachment
 */
export async function getPresignedFileDownloadUrl(
  key: string,
  downloadFilename: string,
  expiresInSeconds = 3600
): Promise<string> {
  const s3 = getR2Client();
  const bucket = getR2BucketName();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(downloadFilename)}"`,
  });

  return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/**
 * 7. Cấp presigned PUT URL cho ảnh thumbnail đơn giản
 */
export async function getPresignedThumbnailPutUrl(
  key: string,
  contentType = 'image/jpeg',
  expiresInSeconds = 900
): Promise<string> {
  const s3 = getR2Client();
  const bucket = getR2BucketName();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/**
 * 8. Liệt kê danh sách các objects trong R2 bucket theo prefix
 */
export async function listR2Objects(prefix?: string) {
  const s3 = getR2Client();
  const bucket = getR2BucketName();

  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix || undefined,
  });

  const response = await s3.send(command);
  return response.Contents || [];
}

/**
 * 9. Xóa một object khỏi R2 bucket
 */
export async function deleteR2Object(key: string) {
  const s3 = getR2Client();
  const bucket = getR2BucketName();

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await s3.send(command);
}
