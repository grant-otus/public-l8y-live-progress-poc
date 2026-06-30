import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { LiveProgressComponent } from './educator/live-progress.component';
import { LearnosityAssessComponent } from './student/learnosity-assess.component';

export const APP_ROUTES: Routes = [
  { path: '', component: LandingComponent },
  { path: 'educator', component: LiveProgressComponent },
  { path: 'student/:userId', component: LearnosityAssessComponent },
  { path: '**', redirectTo: '' },
];
