import { estimateRepository } from '../repositories/estimate.repository.js';

export const estimateService = {
  createEstimate: async (dto) => {
    return await estimateRepository.create(dto);
  },
};
