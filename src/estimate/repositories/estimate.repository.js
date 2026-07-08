import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const estimateRepository = {
  create: async (data) => {
    const { images, ...estimateData } = data;

    return await prisma.estimateRequest.create({
      data: {
        ...estimateData,
        startDate: new Date(estimateData.startDate),
        endDate: new Date(estimateData.endDate),
        // TODO: 로그인 구현 후 토큰에서 userId 추출하여 교체
        userId: 1n,
        images: {
          create: images.map((url) => ({ imageUrl: url })),
        },
      },
      include: {
        images: true,
      },
    });
  },
};
