export interface ProposalTimeItem {
  id: number;
  proposalDateTime: string;
  isSelected: boolean;
}

export interface ProposalTimeListResponse {
  estimateResponseId: number;
  proposalTimes: ProposalTimeItem[];
}
