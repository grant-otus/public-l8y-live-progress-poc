/**
 * Single source of truth shared by the educator and student views.
 *
 * Keeping student user ids, the activity id, and the item list in one place
 * guarantees the ids the student's Items API reports against line up with the
 * user list the educator's Events API subscribes to — otherwise events won't
 * correlate in the Live Progress table.
 *
 * In the real Otus app these values come from `AssessmentClient.getAssignment`
 * (the GetAssignmentResponseDTO) and `LearnosityService.getAssessmentItems`.
 * Here they are hard-coded.
 */

// Dummy but consistent identifiers used to build the Learnosity activity/course ids.
export const ASSIGNMENT_ID = 1;
export const CLASS_ID = 88888;

// In Otus: `demo_activity_${assignment.id}` / `demo_course_${class_id}`.
export const ACTIVITY_ID = `demo_activity_${ASSIGNMENT_ID}`;
export const COURSE_ID = `demo_course_${CLASS_ID}`;

export const ASSESSMENT_TITLE = 'Assignment';

// The educator user that subscribes to the Events API stream.
export const TEACHER_USER_ID = 'otus-teacher-0';

export interface PocStudent {
  id: number;
  firstName: string;
  lastName: string;
}

// Dummy roster. Learnosity user id is derived as `otus-student-${id}` (matching Otus).
export const STUDENTS: PocStudent[] = [
  { id: 101, firstName: 'John', lastName: 'Smith' },
  { id: 102, firstName: 'Jane', lastName: 'Doe' },
  { id: 103, firstName: 'Alex', lastName: 'Johnson' },
];

export interface PocItem {
  reference: string;
  organisation_id: number | null;
}

// Real Learnosity item references signed with the dev consumer key. In Otus these
// come from AssessmentItemModel.itemId / itembankId (0/internal -> null).
export const ITEMS: PocItem[] = [
  { reference: 'ca1c9e3b-1f6c-42bc-a7c4-477e92f6cb4b', organisation_id: null },
  { reference: '8edbbbc3-eef5-4168-a234-6fed3222c6bc', organisation_id: null },
  { reference: '75206074-0a44-49a3-8895-d23027ccf2d3', organisation_id: null },
];

/** Learnosity user id for a given student id (mirrors learnosity-assess.component.ts). */
export function learnosityUserId(studentId: number | string): string {
  return `otus-student-${studentId}`;
}

// Note: user-id hashing for the Events API is performed server-side (see the
// backend POST /events-users endpoint). The secret never reaches the browser, so
// there is no hashing helper or consumer secret in the frontend.
