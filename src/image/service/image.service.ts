import multer from 'multer';
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
// S3StorageService - AWS S3 버킷에 저장 (추후 전환용)
// multer-s3 패키지 설치 및 AWS 환경변수 설정 후 활성화
// npm install multer-s3 @aws-sdk/client-s3
//
// TODO: S3 전환 시 보안 강화 항목
//
// [1] 매직 바이트 검사 추가 (mimetype 위조 방지)
//   - mimetype은 클라이언트가 헤더에 직접 설정하는 값이라 위조 가능
//   - file-type 패키지로 파일 시그니처(매직 바이트)를 검사해 실제 이미지 여부 확인
//   - multer-s3는 memoryStorage 방식으로 동작해 file.buffer 접근 가능 → 검사 붙이기 용이
//   - npm install file-type
//
// [2] S3 버킷 private 설정 + Presigned URL 방식 적용
//   - 버킷을 public으로 열면 URL만 알면 누구나 접근 가능 → 사적인 이미지 노출 위험
//   - 버킷은 private으로 설정하고, 클라이언트가 이미지 요청 시 서버에서 임시 URL 발급
//   - import { GetObjectCommand } from '@aws-sdk/client-s3';
//   - import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
//   - const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket, Key }), { expiresIn: 3600 });
// -------------------------------------------------------------------
export class S3StorageService implements StorageService {
  getStorage(): multer.StorageEngine {
    // TODO: S3 전환 시 아래 주석 해제 후 LocalStorageService 대신 사용
    //
    // import multerS3 from 'multer-s3';
    // import { S3Client } from '@aws-sdk/client-s3';
    //
    // const s3 = new S3Client({ region: process.env.AWS_REGION });
    //
    // const today = new Date().toISOString().split('T')[0];
    // return multerS3({
    //   s3,
    //   bucket: process.env.S3_BUCKET_NAME!,
    //   key: (_req, file, cb) => {
    //     const ext = path.extname(file.originalname);
    //     // 날짜 prefix로 저장 - 스케줄러가 날짜별 조회 가능하도록
    //     // 예: images/2026-07-11/uuid.jpg
    //     cb(null, `images/${today}/${uuidv4()}${ext}`);
    //   },
    // });

    throw new Error('S3StorageService는 아직 설정되지 않았습니다.');
  }

  getFileUrl(file: Express.Multer.File): string {
    // multer-s3는 업로드 완료 후 file.location에 S3 URL을 담아줌
    return (file as Express.Multer.File & { location: string }).location;
  }
}

// -------------------------------------------------------------------
// ImageService - 컨트롤러가 직접 호출하는 서비스
// storage 구현체만 교체하면 로컬 ↔ S3 전환 완료
// -------------------------------------------------------------------
export class ImageService {
  // S3 전환 시: new LocalStorageService() → new S3StorageService()
  private readonly storage: StorageService = new LocalStorageService();

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

  // 업로드된 파일의 URL 반환 - 컨트롤러에서 호출
  async uploadImage(file: Express.Multer.File): Promise<string> {
    try {
      return this.storage.getFileUrl(file);
    } catch {
      throw new PhotoUploadFailedError();
    }
  }
}
