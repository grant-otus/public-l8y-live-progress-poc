import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ASSESSMENT_TITLE, STUDENTS } from '../fixtures/poc-data';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="landing">
      <h1>Live Progress POC</h1>
      <p class="subtitle">{{ assessmentTitle }}</p>

      <section class="role">
        <h2>Educator</h2>
        <p>Watch student progress update live as students take the assessment.</p>
        <a class="btn btn-primary" routerLink="/educator">Open Live Progress</a>
      </section>

      <section class="role">
        <h2>Students</h2>
        <p>Open as a student to take the assessment.</p>
        <ul class="student-list">
          <li *ngFor="let s of students">
            <a class="btn" [routerLink]="['/student', s.id]">{{ s.firstName }} {{ s.lastName }}</a>
          </li>
        </ul>
      </section>

      <p class="hint">
        Tip: open the educator view in one window and a student in another to see events flow.
      </p>
    </div>
  `,
  styles: [
    `
      .landing {
        max-width: 640px;
        margin: 48px auto;
        padding: 0 24px;
      }
      h1 {
        margin-bottom: 4px;
      }
      .subtitle {
        color: #5b6573;
        margin-top: 0;
      }
      .role {
        background: #fff;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 20px 24px;
        margin: 20px 0;
      }
      .role h2 {
        margin-top: 0;
      }
      .student-list {
        list-style: none;
        padding: 0;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .btn {
        display: inline-block;
        padding: 10px 16px;
        border-radius: 6px;
        border: 1px solid var(--color-border);
        background: #fff;
        color: var(--color-text);
        text-decoration: none;
        cursor: pointer;
        font-size: 14px;
      }
      .btn:hover {
        background: #eef1f5;
      }
      .btn-primary {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: #fff;
      }
      .btn-primary:hover {
        background: #1d4fd7;
      }
      .hint {
        color: #5b6573;
        font-size: 13px;
        margin-top: 28px;
      }
    `,
  ],
})
export class LandingComponent {
  readonly assessmentTitle = ASSESSMENT_TITLE;
  readonly students = STUDENTS;
}
