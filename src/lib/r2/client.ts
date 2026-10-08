import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  CompletedPart,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let cachedR2Client: S3Client | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getR2Client(): S3Client {
  if (cachedR2Client) return cachedR2Client;

  const accountId = requiredEnv('R2_ACCOUNT_ID');

  cachedR2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnv('R2_SECRET_ACCESS_KEY'),
    },
  });

  return cachedR2Client;
}

export function getR2BucketName(): string {
  return requiredEnv('R2_BUCKET_NAME');
}

/**
 * Chốt object key vào đúng prefix của project. Mọi key đi ra khỏi hàm này
 * đều đã được kiểm tra, không nhận key do client tự nghĩ ra.
 */
export function assertProjectKey(key: unknown, projectId: string): string {
  if (typeof key !== 'string' || !key.startsWith(`projects/${projectId}/`) || key.includes('..')) {
    throw new Error(`Object key outside project scope: ${String(key)}`);
  }
  return key;
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
 * 8. Xóa object thật trên R2 khi bản ghi bị gỡ, tránh rác chiếm dung lượng
 */
export async function deleteObject(key: string): Promise<void> {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
    })
  );
}
