// Ported verbatim from
// fe/apps/otus-app/src/features/assessments/advanced/live-progress/live-progress.types.ts

export enum SessionStatus {
  NotStarted = 'not_started',
  Started = 'started',
  Paused = 'paused',
  Resumed = 'resumed',
  Submitted = 'submitted',
  Terminated = 'terminated',
  Suspended = 'suspended',
}

export interface LiveProgressUserState {
  id: string;
  name: string;
  sessionStatus: SessionStatus;
  currentItem: number | null;
  active: boolean | null;
}

export interface LiveProgressEvent {
  id: string;
  timestamp: string;
  actor: {
    objectType: 'Agent';
    account: {
      homePage: string;
      name: string;
    };
  };
  verb: {
    id: string;
    display: { 'en-US': string };
  };
  object: {
    id: string;
    objectType: 'Activity';
    definition?: {
      extensions?: {
        data?: number;
        metadata?: {
          item_number?: number;
          section_number?: number | null;
          question_numbers?: number[];
        };
      };
    };
  };
}
