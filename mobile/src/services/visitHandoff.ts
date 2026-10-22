export interface PendingVisit {
  conversationId?: string;
  aiSummary: string;
  reason: string;
  urgency?: 'green' | 'yellow' | 'orange' | 'red';
}

let pending: PendingVisit | null = null;

export function setPendingVisit(visit: PendingVisit): void {
  pending = visit;
}

export function takePendingVisit(): PendingVisit | null {
  const visit = pending;
  pending = null;
  return visit;
}
