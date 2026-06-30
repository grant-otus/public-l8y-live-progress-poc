import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LearnosityService } from '../services/learnosity.service';
import {
  ACTIVITY_ID,
  ASSESSMENT_TITLE,
  COURSE_ID,
  ITEMS,
  learnosityUserId,
  STUDENTS,
} from '../fixtures/poc-data';

/**
 * Student assessment-taking view. Heavily trimmed port of
 * fe/apps/otus-app/src/features/assessments/advanced/learnosity-assess.component.ts
 *
 * Differences from Otus: no Otus API calls (assignment/items/session lookups),
 * no Faro, no Unleash, no availability windows, no Respondus, no texthelp, no
 * countdown/timer. Items come from the shared fixture; the session is untimed.
 *
 * Stripped Otus config is preserved below as commented-out blocks (with a note on
 * why each is omitted) so this stays easy to diff against the Otus original.
 */
@Component({
  selector: 'app-learnosity-assess',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './learnosity-assess.component.html',
})
export class LearnosityAssessComponent implements OnInit, OnDestroy {
  @ViewChild('reportContainer', { static: true }) reportContainer!: ElementRef;

  sessionId!: string;
  learnosityUserId!: string;
  studentId!: string;
  studentName: string | null = null;

  assessmentInProgress = false;
  hasSubmitted = false;
  readyListenerFired = false;

  itemsToLoad: { id: string; reference: string; organisation_id: number | null }[] = [];

  readonly assessmentTitle = ASSESSMENT_TITLE;

  constructor(
    private readonly _learnosityService: LearnosityService,
    private readonly activatedRoute: ActivatedRoute,
    private readonly _router: Router,
    private readonly zone: NgZone,
  ) {}

  ngOnInit(): void {
    this.studentId = this.activatedRoute.snapshot.params['userId'];
    const student = STUDENTS.find((s) => String(s.id) === String(this.studentId));
    this.studentName = student ? `${student.firstName} ${student.lastName}` : 'no student name';
    // crypto.randomUUID replaces the Otus `uuid` v4() dependency.
    this.sessionId = crypto.randomUUID();
    this.learnosityUserId = learnosityUserId(this.studentId);

    this.loadItems();
  }

  ngOnDestroy(): void {
    // Reset the Items app so a re-entry starts clean (trimmed from Otus ngOnDestroy).
    const itemsApp = this._learnosityService.learnosityItemsApp;
    itemsApp?.reset?.();
    this._learnosityService.learnosityItemsApp = null;
  }

  // Publishes an `exited` event (consumed by the educator Live Progress view) and
  // returns to the landing page. Trimmed from Otus saveAndExit() — no Faro / loading
  // indicator / Otus session save.
  saveAndExit(): void {
    console.log('save and exit called');
    const settings = {
      success: () => {
        console.log('Leaving the assessment, publishing exited event!');
        const event = {
          xapi: false,
          events: [
            {
              kind: 'assess_logging',
              actor: this.learnosityUserId,
              verb: 'exited',
              object: {
                id: crypto.randomUUID(),
              },
            },
          ],
        };
        console.dir(event, { depth: null });
        const eventsApp = this._learnosityService.learnosityItemsApp.eventsApp();
        console.log('eventsApp');
        console.dir(eventsApp, { depth: null });
        const publishResult = eventsApp.publish(event);
        console.log('publishResult');
        console.dir(publishResult, { depth: null });
        // this._learnosityService.learnosityItemsApp.eventsApp().publish(event);
        // save() success is a Learnosity callback (outside Angular's zone).
        this.zone.run(() => this._router.navigate(['/']));
      },
      error: () => {
        console.error('Error saving assessment on exit.');
      },
    };
    this._learnosityService.learnosityItemsApp.assessApp().save(settings);
  }

  backToList(): void {
    this._router.navigate(['/']);
  }

  private loadItems(): void {
    this.reportContainer.nativeElement.innerHTML = '<div id="learnosity_assess"></div>';
    // No Otus getAssessmentItems call — items come straight from the fixture.
    this.itemsToLoad = ITEMS.map((item) => ({
      id: item.reference,
      reference: item.reference,
      organisation_id: item.organisation_id,
    }));
    this.loadAssess();
  }

  private getInitOptions(): any {
    const initOptions: any = {
      // Note: the Otus original also sets a top-level `events: true` here, but that is
      // not a documented Items API init field (the Otus code comments "not sure if this
      // is needed") and the Learnosity demos do not use it. It spins up a legacy events
      // bridge that triggers the cross-origin postMessage warning to events.learnosity.com.
      // Event emission is driven by `config.configuration.events` below instead.
      events: true, // re-enable to drive eventsApp.publish (https://help.learnosity.com/hc/en-us/articles/16461138036125-eventsApp-Methods-Items-API#:~:text=This%20method%20only%20works%20when%20the%20rendering_type%20initialization%20option%20is%20set%20to%20%22assess%22%20and%20also%20the%20events%20initialization%20option%20is%20set%20to%20true.)
      user_id: this.learnosityUserId, // required
      session_id: this.sessionId,
      items: this.itemsToLoad,
      rendering_type: 'assess',
      state: 'initial',
      type: 'submit_practice',
      activity_id: ACTIVITY_ID,
      name: 'Assessment - ' + this.assessmentTitle,
      course_id: COURSE_ID,
      config: {
        'ui-style': 'horizontal',
        ignore_question_attributes: ['shuffle_options'],
        configuration: {
          onsubmit_redirect_url: false,
          events: true, // enable events so they propagate to the Live Progress Report
        },
        navigation: {
          auto_save: {
            ui: true,
            save_interval_duration: 6,
          },
          scroll_to_top: { offset_top: '0px' },
        },
        questions_api_init_options: {
          captureOnResumeError: true,
        },
        // --- Omitted for the POC (kept for parity with the Otus original) -------
        // annotations: this.assignmentDetails?.allowAnnotations ?? false,
        //   -> annotations toolbar disabled; no assignment settings in the POC.
        regions: {
          'top-left': [{ type: 'title_element' }],
          'top-right': [
            { type: 'itemcount_element' },
            { type: 'timer_element' },
            {
              type: 'dropdown_element',
              buttons: [
                { type: 'accessibility_button' },
                { type: 'fullscreen_button' },
                { type: 'notepad_button' },
                { type: 'stickynote_add_button' },
                { type: 'stickynote_visibility_button' },
                { type: 'drawing_mode_button' },
                { type: 'drawing_visibility_button' },
              ],
            },
          ],
          right: [
            { type: 'verticaltoc_element' },
            { type: 'flagitem_button' },
            { type: 'masking_button' },
            // ...this.getCalculatorFeatureIfEnabled()
            //   -> calculator omitted; depends on Unleash flags + assignment type.
          ],
          'bottom-right': [{ type: 'next_button' }, { type: 'previous_button' }],
        },
      },
    };

    // --- Omitted for the POC (kept for parity with the Otus original) ----------
    // The student view is untimed, so no countdown / hard-submit on expiry:
    //
    // if (this.assignmentDetails?.timed && this.assignmentDetails.minutes) {
    //   initOptions.config.time = {
    //     max_time: this.assignmentDetails.minutes * 60,
    //     limit_type: 'hard',
    //     warning_time: 60,
    //     countdown: 10,
    //     show_time: true,
    //   };
    // }
    //
    // Randomized item order (needs a per-student seed) is also omitted:
    //
    // if (this.assignmentDetails?.randomize_questions) {
    //   const seed = String(this.assignmentId) + String(this.studentId);
    //   initOptions.config.configuration['shuffle_items'] = seed;
    // }

    return initOptions;
  }

  private loadAssess(): void {
    this._learnosityService.loadItemsApi(() => {
      const initOptions = this.getInitOptions();

      this._learnosityService.initItemsApi(
        initOptions,
        () => {
          console.log('ready listener callback invoked');
          this.readyListenerFired = true;

          const app = this._learnosityService.learnosityItemsApp;
          app.once('test:start', () => this.handleItemsApiEvent('test:start'));
          app.once('test:submit:success', () => this.handleItemsApiEvent('test:submit:success'));
          app.on('test:submit:error', () => this.handleItemsApiEvent('test:submit:error'));
          app.on('test:save:success', () => this.handleItemsApiEvent('test:save:success'));
          app.on('test:save:error', () => this.handleItemsApiEvent('test:save:error'));
          app.on('test:resume', () => this.handleItemsApiEvent('test:resume'));
          app.on('test:pause', () => this.handleItemsApiEvent('test:pause'));
          app.on('item:load', () => this.handleItemsApiEvent('item:load'));
          app.on('test:ready', () => this.handleItemsApiEvent('test:ready'));
        },
        (error: { code: number; msg: string; detail: string }) => {
          // https://help.learnosity.com/hc/en-us/articles/16458090530845-troubleshooting-Items-API
          console.error('Learnosity Items API Error', error);
          this.readyListenerFired = false;
        },
      );
    });
  }

  logData(): void {
    console.log('Logging assessment data');
    console.log('assessmentInProgress:', this.assessmentInProgress);
    console.log('hasSubmitted:', this.hasSubmitted);
    console.log('readyListenerFired:', this.readyListenerFired);
    console.log('sessionId:', this.sessionId);
    console.log('learnosityUserId:', this.learnosityUserId);
    console.log('studentId:', this.studentId);
    console.log('studentName:', this.studentName);
    console.log('itemsToLoad:', this.itemsToLoad);
  }

  private handleItemsApiEvent(eventName: string): void {
    this.zone.run(() => {
      console.log('Received Items API event:', eventName);
      switch (eventName) {
        case 'item:load':
          this.onItemLoad();
          break;
        case 'test:start':
          this.onTestStart();
          break;
        case 'test:resume':
          this.onResume();
          break;
        case 'test:pause':
          this.onPause();
          break;
        case 'test:submit:success':
          this.onSubmitSuccess();
          break;
        case 'test:submit:error':
          console.error('There was an error submitting the assessment.');
          break;
        case 'test:save:success':
          console.log('Assessment saved.');
          break;
        case 'test:save:error':
          console.error('There was an error saving your progress.');
          break;
        case 'test:ready':
          console.log('on test:ready');
          break;
        default:
          console.log('Unhandled Items API event:', eventName);
      }
    });
  }

  private onItemLoad(): void {
    console.log('onItemLoad');
    this.assessmentInProgress = true;
    this._learnosityService.learnosityItemsApp.questionsApp?.().renderMath?.();
  }

  private onTestStart(): void {
    console.log('Assessment started.');
    this.assessmentInProgress = true;
  }

  private onPause(): void {
    console.log('Assessment paused.');
  }

  private onResume(): void {
    console.log('Assessment resumed.');
    if (this.hasSubmitted) {
      this._router.navigate(['/']);
      return;
    }
    this.assessmentInProgress = true;
  }

  private onSubmitSuccess(): void {
    console.log('Assessment submitted successfully.');
    this.hasSubmitted = true;
    this._router.navigate(['/']);
  }
}
