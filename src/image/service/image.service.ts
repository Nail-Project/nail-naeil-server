import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PhotoUploadFailedError } from '../../common/errors/common.error';
import { InvalidImageTypeError } from '../error/image.error';

// ─── 매직 바이트 검사 ───────────────────────────────────────────────────────────
// 클라이언트가 Content-Type 헤더를 임의로 위조할 수 있으므로
// MIME 타입 검사만으로는 비이미지 파일의 업로드를 막을 수 없다.
// 파일의 첫 바이트(파일 시그니처)로 실제 이미지 여부를 검증한다.
//
// 지원 형식:
// · JPEG : FF D8 FF
// · PNG  : 89 50 4E 47 0D 0A 1A 0A
// · GIF  : 47 49 46 38 (GIF8)
// · WebP : 52 49 46 46 ?? ?? ?? ?? 57 45 42 50 (RIFF....WEBP)
function hasValidImageSignature(buffer: Buffer): boolean {
  if (buffer.length < 3) return false;
  const b = buffer;

  // JPEG
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true;
  // PNG
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return true;
  // GIF
  if (b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return true;
  // WebP (RIFF....WEBP)
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return true;

  return false;
}

// ─── ImageService ─────────────────────────────────────────────────────────────
// multer는 memoryStorage로 파일을 버퍼에 받고,
// uploadImages()에서 매직 바이트 검증 후 AWS SDK로 직접 S3에 업로드한다.
//
// multer-s3 스트리밍 방식에서 변경한 이유:
// 스트리밍 중에는 파일 전체 버퍼가 확보되기 전에 S3로 전송이 시작되므로
// 매직 바이트를 검사하고 업로드를 취소하는 것이 안전하지 않다.
// memoryStorage로 먼저 버퍼에 받으면 검증 후 S3 업로드 여부를 결정할 수 있다.
export class ImageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor() {
    this.region = process.env.AWS_REGION ?? 'ap-northeast-2';
    this.bucket = process.env.S3_BUCKET_NAME ?? '';
    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  // multer 미들웨어 생성 - image.route.ts에서 호출해 라우터에 등록
  // memoryStorage: 버퍼로 받아 uploadImages()에서 매직 바이트 검사 후 S3에 업로드
  getMulter(): multer.Multer {
    return multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 제한
      fileFilter: (_req, file, cb) => {
        // 1차 검사: MIME 타입 (빠른 사전 필터)
        if (!file.mimetype.startsWith('image/')) {
          return cb(new InvalidImageTypeError());
        }
        cb(null, true);
      },
    });
  }

  // 업로드된 파일의 매직 바이트를 검사하고 S3에 저장 후 URL 목록 반환
  // 파일 순서를 보장하여 반환한다.
  async uploadImages(files: Express.Multer.File[]): Promise<string[]> {
    const today = new Date().toISOString().split('T')[0];
    const urls: string[] = [];

    for (const file of files) {
      // 2차 검사: 매직 바이트 (MIME 타입 위조 방지)
      if (!hasValidImageSignature(file.buffer)) {
        throw new InvalidImageTypeError();
      }

      const ext = path.extname(file.originalname);
      const key = `images/${today}/${uuidv4()}${ext}`;

      try {
        await this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          }),
        );
      } catch {
        throw new PhotoUploadFailedError();
      }

      // scheduler의 URL 형식과 일치: https://{bucket}.s3.{region}.amazonaws.com/{key}
      urls.push(`https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`);
    }

    return urls;
  }
}
