// src/app/home/home.component.ts
import { Component } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule],
  template: `
    <h1>Welcome</h1>
    <button (click)="login()">Login</button>
    <button (click)="logout()">Logout</button>
    <p *ngIf="user">Logged in as: {{ user.name }}</p>
  `,
})
export class HomeComponent {
  user: any;

  constructor(private msal: MsalService) {
    const acc = this.msal.instance.getAllAccounts();
    this.user = acc.length ? acc[0] : null;
  }

  login() {
    if (window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
    
    const msalInstance = this.msal.instance;
  
    msalInstance.handleRedirectPromise().then(() => {
      if (!msalInstance.getAllAccounts().length) {
        this.msal.loginRedirect();
      } else {
        console.log('User already logged in.');
      }
    }).catch((err) => {
      console.error('Error during login:', err);
    });
  }

  logout() {
    if (window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }

    this.msal.instance.handleRedirectPromise().then(() => {
      this.msal.logoutRedirect();
    }).catch((err) => {
      console.error('Error during logout:', err);
    });
  }
}
