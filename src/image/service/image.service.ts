import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PhotoUploadFailedError } from '../../common/errors/common.error';
import { InvalidImageTypeError } from '../error/image.error';

// -------------------------------------------------------------------
// StorageService 인터페이스 - 로컬/S3 공통 계약
// -------------------------------------------------------------------
export interface StorageService {
  // multer에 넘길 storage engine 반환
  getStorage(): multer.StorageEngine;
  // 업로드 완료된 file 객체에서 접근 URL 추출
  getFileUrl(file: Express.Multer.File): string;
}

// -------------------------------------------------------------------
// LocalStorageService - 로컬 서버 디스크에 저장
// uploads/ 폴더에 uuid 파일명으로 저장 후 서버 URL 반환
// -------------------------------------------------------------------
export class LocalStorageService implements StorageService {
  private readonly baseUploadDir = 'uploads';
  private readonly baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';

  // 오늘 날짜 기준 저장 폴더 경로 반환 (예: uploads/2026-07-11)
  private getDateDir(): string {
    const today = new Date().toISOString().split('T')[0];
    return `${this.baseUploadDir}/${today}`;
  }

  getStorage(): multer.StorageEngine {
    return multer.diskStorage({
      destination: (_req, _file, cb) => {
        // 날짜별 폴더 없으면 자동 생성 (예: uploads/2026-07-11/)
        const dateDir = this.getDateDir();
        if (!fs.existsSync(dateDir)) {
          fs.mkdirSync(dateDir, { recursive: true });
        }
        cb(null, dateDir);
      },
      filename: (_req, file, cb) => {
        // 원본 확장자 유지 + uuid로 파일명 충돌 방지
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
      },
    });
  }

  getFileUrl(file: Express.Multer.File): string {
    // multer가 저장 후 file.destination에 실제 저장된 경로를 담아줌
    // getDateDir()를 재호출하지 않아 자정 경계에서 경로 불일치 방지
    // 예: http://localhost:3000/uploads/2026-07-11/uuid.jpg
    return `${this.baseUrl}/${file.destination}/${file.filename}`;
  }
}

// -------------------------------------------------------------------
// S3StorageService - AWS S3 버킷에 저장
// 환경변수: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME
//
// TODO: 보안 강화 항목 (추후 적용)
//
// [1] 매직 바이트 검사 추가 (mimetype 위조 방지)
//   - mimetype은 클라이언트가 헤더에 직접 설정하는 값이라 위조 가능
//   - file-type 패키지로 파일 시그니처(매직 바이트)를 검사해 실제 이미지 여부 확인
//   - npm install file-type
//
// [2] Presigned URL 방식 적용
//   - 버킷은 private이므로 클라이언트가 이미지 요청 시 서버에서 임시 URL 발급 필요
//   - import { GetObjectCommand } from '@aws-sdk/client-s3';
//   - import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
//   - const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket, Key }), { expiresIn: 3600 });
// -------------------------------------------------------------------
export class S3StorageService implements StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION ?? 'ap-northeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
    });
    this.bucket = process.env.S3_BUCKET_NAME ?? '';
  }

  getStorage(): multer.StorageEngine {
    const today = new Date().toISOString().split('T')[0];

    return multerS3({
      s3: this.s3,
      bucket: this.bucket,
      // contentType은 클라이언트가 보낸 mimetype을 그대로 사용
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        // 날짜 prefix로 저장 (예: images/2026-08-01/uuid.jpg)
        // 이미지 정리 스케줄러가 날짜별로 조회할 수 있도록 구조화
        cb(null, `images/${today}/${uuidv4()}${ext}`);
      },
    });
  }

  getFileUrl(file: Express.Multer.File): string {
    // multer-s3는 업로드 완료 후 file.location에 S3 URL을 담아줌
    // 예: https://nail-naeil-images.s3.ap-northeast-2.amazonaws.com/images/2026-08-01/uuid.jpg
    return (file as Express.Multer.File & { location: string }).location;
  }
}

// -------------------------------------------------------------------
// ImageService - 컨트롤러가 직접 호출하는 서비스
// storage 구현체만 교체하면 로컬 ↔ S3 전환 완료
// -------------------------------------------------------------------
export class ImageService {
  private readonly storage: StorageService = new S3StorageService();

  // multer 미들웨어 생성 - image.route.ts에서 호출해 라우터에 등록
  getMulter(): multer.Multer {
    return multer({
      storage: this.storage.getStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 제한
      fileFilter: (_req, file, cb) => {
        // 이미지 파일만 허용 - InvalidImageTypeError로 던져 wrapMulter에서 instanceof로 판별
        if (!file.mimetype.startsWith('image/')) {
          return cb(new InvalidImageTypeError());
        }
        cb(null, true);
      },
    });
  }

  // 업로드된 파일들의 URL 목록 반환 - 컨트롤러에서 호출
  async uploadImages(files: Express.Multer.File[]): Promise<string[]> {
    try {
      return files.map((file) => this.storage.getFileUrl(file));
    } catch {
      throw new PhotoUploadFailedError();
    }
  }
}
