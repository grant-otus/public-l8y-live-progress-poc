import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { LearnosityService } from '../services/learnosity.service';
import { SessionStatus, LiveProgressUserState, LiveProgressEvent } from './live-progress.types';
import {
  ACTIVITY_ID,
  ASSESSMENT_TITLE,
  STUDENTS,
  TEACHER_USER_ID,
  learnosityUserId,
} from '../fixtures/poc-data';

/**
 * Educator Live Progress view. Ported from
 * fe/apps/otus-app/src/features/assessments/advanced/live-progress/live-progress.component.ts
 *
 * Differences from Otus:
 * - No ActivatedRoute assignment id, no AssessmentClient, no Reports API.
 *   The user list is built from the shared fixture instead of a GetAssignment DTO.
 * - Only the Events API is initialized (Reports API init is intentionally omitted).
 * The event-handling logic (initEventsApi, handleEventsApiEvent, updateStudent*)
 * is kept faithful to the original.
 */
@Component({
  selector: 'app-live-progress',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './live-progress.component.html',
  styleUrls: ['./live-progress.component.css'],
})
export class LiveProgressComponent implements OnInit, OnDestroy {
  isLoading = true;
  errorMessage: string | null = null;
  assessmentTitle: string | null = ASSESSMENT_TITLE;
  users: LiveProgressUserState[] = [];
  activityId: string | null = ACTIVITY_ID;

  // All Learnosity user ids whose events the educator observes (students + teacher).
  private eventUserIds: string[] = [];

  // Mirrors the Otus `reportsApiUsers` list; here only used to build the Events API
  // subscription (the Reports API itself is not initialized in this POC).
  private subscribedUsers: { id: string; activity_id: string | null }[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private readonly learnosityService: LearnosityService,
    private readonly ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.loadFixtureData();
    this.initEventsApi();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Replaces Otus loadAssignmentData(): builds the user list from the fixture
  // rather than from a GetAssignment DTO.
  private loadFixtureData(): void {
    this.users = STUDENTS.map((s) => {
      const l8yUserId = learnosityUserId(s.id);
      this.eventUserIds.push(l8yUserId);
      this.subscribedUsers.push({ id: l8yUserId, activity_id: this.activityId });

      return {
        id: l8yUserId,
        name: `${s.firstName} ${s.lastName}`.trim(),
        sessionStatus: SessionStatus.NotStarted,
        currentItem: null,
        active: null,
      };
    });

    this.eventUserIds.push(TEACHER_USER_ID);
  }

  // ---- pill rendering helpers (verbatim from Otus) -----------------------

  statusToPillClass(status: SessionStatus): string {
    switch (status) {
      case SessionStatus.NotStarted:
        return 'pill-neutral';
      case SessionStatus.Started:
      case SessionStatus.Resumed:
        return 'pill-info';
      case SessionStatus.Paused:
        return 'pill-notice';
      case SessionStatus.Submitted:
        return 'pill-positive';
      case SessionStatus.Terminated:
      case SessionStatus.Suspended:
        return 'pill-negative';
      default:
        return 'pill-neutral';
    }
  }

  statusToLabel(status: SessionStatus): string {
    switch (status) {
      case SessionStatus.NotStarted:
        return 'Not Started';
      case SessionStatus.Started:
      case SessionStatus.Resumed:
        return 'In Progress';
      case SessionStatus.Paused:
        return 'Paused';
      case SessionStatus.Submitted:
        return 'Submitted';
      case SessionStatus.Terminated:
      case SessionStatus.Suspended:
        return 'Ended';
      default:
        console.warn('Received unknown session status:', status);
        return 'Unknown';
    }
  }

  // ---- Events API (faithful to Otus initEventsApi) -----------------------

  initEventsApi(): void {
    this.learnosityService.loadEventsApi(async () => {
      this.isLoading = false;
      try {
        // Fetch the { user_id: hash } map from the backend (secret stays server-side).
        // Per Learnosity support the Events API also accepts plain user_id strings;
        // we use the documented hashed `users` map for parity with their docs.
        const users = await this.learnosityService.getEventsUsers(this.eventUserIds);
        const initRequest = {
          users,
          user_id: TEACHER_USER_ID,
        };
        this.learnosityService.initEventsApi(initRequest, {
          readyListener: () => {
            console.log('Learnosity Events API initialized successfully.');
            const events = this.subscribedUsers.map((u) => {
              return {
                kind: 'assess_logging',
                user_id: u.id,
                activity_id: this.activityId,
              };
            });
            this.learnosityService.learnosityEventsApp.on(events, (event: any) =>
              this.handleEventsApiEvent(event),
            );
          },
          errorListener: (error: unknown) => {
            console.log('Learnosity Events API errorListener triggered');
            console.dir(error, { depth: null });
            this.errorMessage = 'Failed to initialize the Events API. See console for details.';
          },
        });
      } catch (err) {
        console.error('Failed to fetch Events API users from backend:', err);
        this.errorMessage = 'Failed to initialize the Events API. See console for details.';
      }
    });
  }

  private handleEventsApiEvent(event: any): void {
    console.log('Received Events API event with ' + event.events.length + ' inner events');
    console.dir(event, { depth: null });
    const handleEvent = (innerEvent: any) => {
      const payloadId = innerEvent?.Payload?.payload?.id;
      const studentId = innerEvent?.Payload?.user_id;
      if (!studentId) {
        console.warn('event without studentId');
        console.dir(innerEvent, { depth: null });
      }
      const innerPayload = innerEvent?.Payload?.payload;
      const verb = innerPayload?.verb?.display?.['en-US'];
      if (!verb) {
        console.warn('event without verb');
        console.dir(innerEvent, { depth: null });
      }
      console.log('Handling event for studentId:', studentId, ' verb:', verb, ' payloadId:', payloadId);
      if (studentId && verb) {
        switch (verb) {
          case 'focused': {
            this.updateStudentActiveStatus(studentId, true);
            break;
          }
          case 'unfocused': {
            this.updateStudentActiveStatus(studentId, false);
            break;
          }
          case 'exited': {
            console.warn('EXITED EVENT HANDLED!');
            break;
          }
          case 'progressed': {
            const objectDefinition = innerPayload?.object?.definition;
            const itemNumber = objectDefinition?.extensions?.metadata?.item_number;
            if (!itemNumber) {
              console.warn('progressed event without item number');
              console.dir(innerEvent, { depth: null });
              break;
            }
            this.updateStudentCurrentItem(studentId, itemNumber);
            break;
          }
          case 'started': {
            this.updateStudentSessionStatus(studentId, SessionStatus.Started);
            break;
          }
          case 'saved': {
            // autosave fires every 6 seconds, nothing to do.
            break;
          }
          case 'paused': {
            this.updateStudentSessionStatus(studentId, SessionStatus.Paused);
            break;
          }
          case 'resumed': {
            this.updateStudentSessionStatus(studentId, SessionStatus.Resumed);
            break;
          }
          case 'submitted': {
            this.updateStudentSessionStatus(studentId, SessionStatus.Submitted);
            break;
          }
          default: {
            console.log('Unhandled event verb: ', verb);
          }
        }
      }
    };

    // Events arrive from outside Angular's zone; run handling inside it so the
    // table re-renders.
    this.ngZone.run(() => {
      for (const innerEvent of event.events) {
        handleEvent(innerEvent);
      }
    });
  }

  private updateStudentSessionStatus(studentId: string, status: SessionStatus): void {
    const userIndex = this.users.findIndex((u) => u.id === studentId);
    if (userIndex !== -1) {
      this.users[userIndex] = { ...this.users[userIndex], sessionStatus: status };
    }
  }

  private updateStudentActiveStatus(studentId: string, active: boolean): void {
    const userIndex = this.users.findIndex((u) => u.id === studentId);
    if (userIndex !== -1) {
      this.users[userIndex] = { ...this.users[userIndex], active };
    }
  }

  private updateStudentCurrentItem(studentId: string, currentItem: number): void {
    const userIndex = this.users.findIndex((u) => u.id === studentId);
    if (userIndex !== -1) {
      this.users[userIndex] = { ...this.users[userIndex], currentItem };
    }
  }

  logUserData(): void {
    console.log('Current user data:');
    console.dir(this.users, { depth: null });
  }
}
