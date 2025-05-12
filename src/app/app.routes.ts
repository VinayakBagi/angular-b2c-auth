import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { MsalGuard, MsalService } from '@azure/msal-angular';
import { Component } from '@angular/core';
import { AuthCallbackComponent } from './auth-callback/auth-callback.component';

@Component({
  standalone: true,
  selector: 'app-login-failed',
  template: `<h1>Login Failed</h1>
    <p>Please try again.</p>`,
})
export class LoginFailedComponent {}

@Component({
  standalone: true,
  selector: 'app-dashboard',
  template: `<h1>Dashboard</h1>
    <p>Welcome to the dashboard!</p>
    <button (click)="logout()">Logout</button>`,
})
export class DashboardComponent {
  constructor(private msal: MsalService) {
    const acc = this.msal.instance.getAllAccounts();
  }
  ngOnInit() {
    if (window.location.hash) {
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search
      );
    }
  }
  logout() {
    if (window.location.hash) {
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search
      );
    }

    this.msal.instance
      .handleRedirectPromise()
      .then(() => {
        this.msal.logoutRedirect();
      })
      .catch((err) => {
        console.error('Error during logout:', err);
      });
  }
}

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    // canActivate: [MsalGuard],
  },
  {
    path: 'login-failed',
    component: LoginFailedComponent,
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
  },
  {
    path: 'api/auth/callback/azure-ad-b2c',
    component: AuthCallbackComponent,
  },
];
