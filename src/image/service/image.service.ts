import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PhotoUploadFailedError } from '../../common/errors/common.error';

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
  private readonly uploadDir = 'uploads';
  private readonly baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';

  getStorage(): multer.StorageEngine {
    // uploads/ 폴더 없으면 자동 생성
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    return multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (_req, file, cb) => {
        // 원본 확장자 유지 + uuid로 파일명 충돌 방지
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
      },
    });
  }

  getFileUrl(file: Express.Multer.File): string {
    // diskStorage는 file.filename에 저장된 파일명이 담김
    return `${this.baseUrl}/uploads/${file.filename}`;
  }
}

// -------------------------------------------------------------------
// S3StorageService - AWS S3 버킷에 저장 (추후 전환용)
// multer-s3 패키지 설치 및 AWS 환경변수 설정 후 활성화
// npm install multer-s3 @aws-sdk/client-s3
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
    // return multerS3({
    //   s3,
    //   bucket: process.env.S3_BUCKET_NAME!,
    //   key: (_req, file, cb) => {
    //     const ext = path.extname(file.originalname);
    //     cb(null, `images/${uuidv4()}${ext}`);
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
        // 이미지 파일만 허용
        if (!file.mimetype.startsWith('image/')) {
          return cb(new Error('이미지 파일만 업로드할 수 있습니다.'));
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
