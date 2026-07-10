// GET /api/v1/estimate/:proposal_id/time - 샵 견적 예약 가능 시간 조회 성공 시 Response
export interface ProposalTimeItemResponse {
  timeId: number;
  proposalDatetime: Date | null;
  isSelected: boolean | null;
}

export interface ProposalTimeResponse {
  proposalId: number;
  times: ProposalTimeItemResponse[];
}
