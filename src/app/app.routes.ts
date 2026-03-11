import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage)
  },
  {
    path: 'learning-path',
    loadComponent: () => import('./pages/learning-path/learning-path.page').then(m => m.LearningPathPage)
  },
  {
    path: 'practice',
    loadComponent: () => import('./pages/practice/practice.page').then(m => m.PracticePage)
  },
  {
    path: 'scale-builder',
    loadComponent: () => import('./pages/scale-builder/scale-builder.page').then(m => m.ScaleBuilderPage)
  },
  {
    path: 'timed-challenge',
    loadComponent: () => import('./pages/timed-challenge/timed-challenge.page').then(m => m.TimedChallengePage)
  },
  {
    path: 'worksheet-challenge',
    loadComponent: () => import('./pages/worksheet-challenge/worksheet-challenge.page').then(m => m.WorksheetChallengePage)
  },
  {
    path: 'blitz-mode',
    loadComponent: () => import('./pages/blitz-mode/blitz-mode.page').then(m => m.BlitzModePage)
  },
  {
    path: 'exam',
    loadComponent: () => import('./pages/exam/exam.page').then(m => m.ExamPage)
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage)
  },
];
