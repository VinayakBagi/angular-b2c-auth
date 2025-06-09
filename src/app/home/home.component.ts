import { Component, OnInit } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule],
  template: `
    <div class="home-container">
      <h1>Welcome</h1>

      <div *ngIf="!isLoggedIn">
        <button (click)="login()">Login</button>
      </div>

      <div *ngIf="isLoggedIn">
        <p><strong>Logged in as:</strong> {{ userInfo?.name || 'User' }}</p>
        <p>
          <strong>Email:</strong> {{ userInfo?.email || 'Email not available' }}
        </p>
        <button (click)="logout()">Logout</button>

        <!-- Debug info -->
        <details style="margin-top: 20px;">
          <summary>🔍 Debug Info</summary>
          <div
            style="background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px;"
          >
            <h4>User Info:</h4>
            <pre>{{ userInfo | json }}</pre>
          </div>
        </details>
      </div>
    </div>
  `,
  styles: [
    `
      .home-container {
        padding: 20px;
        max-width: 600px;
        margin: 0 auto;
      }

      button {
        background: #0078d4;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        margin: 5px;
      }

      button:hover {
        background: #106ebe;
      }

      pre {
        background: #f8f9fa;
        padding: 10px;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 12px;
      }
    `,
  ],
})
export class HomeComponent implements OnInit {
  isLoggedIn = false;
  userInfo: any = null;

  constructor(private msal: MsalService) {}

  ngOnInit(): void {
    // Check if user is already logged in from previous session
    this.checkExistingLogin();

    // DON'T call handleRedirectObservable() to avoid the token exchange error
    // We'll handle this manually in the AuthCallbackComponent
  }

  checkExistingLogin(): void {
    // Check localStorage for any existing user info from your API
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        this.userInfo = JSON.parse(storedUserInfo);
        this.isLoggedIn = true;
        console.log('Found existing user info:', this.userInfo);
      } catch (e) {
        console.error('Error parsing stored user info:', e);
        localStorage.removeItem('userInfo');
      }
    }

    // Also check if MSAL has any accounts (fallback)
    const accounts = this.msal.instance.getAllAccounts();
    if (accounts.length > 0 && !this.isLoggedIn) {
      const account = accounts[0];
      this.extractUserInfoFromAccount(account);
      this.isLoggedIn = true;
    }
  }

  extractUserInfoFromAccount(account: any): void {
    console.log('Account:', account);
    console.log('ID Token Claims:', account.idTokenClaims);

    // Extract email from various sources
    const email = this.getBestEmail(account);

    this.userInfo = {
      email: email,
      name:
        account.name ||
        account.idTokenClaims?.['name'] ||
        account.idTokenClaims?.['displayName'],
      displayName: account.idTokenClaims?.['displayName'],
      givenName: account.idTokenClaims?.['given_name'],
      surname: account.idTokenClaims?.['family_name'],
      userId: account.localAccountId,
    };

    // Store user info in localStorage for persistence
    localStorage.setItem('userInfo', JSON.stringify(this.userInfo));
    console.log('Extracted user info from account:', this.userInfo);
  }

  getBestEmail(account: any): string | undefined {
    const possibleEmailSources = [
      account.username,
      account.idTokenClaims?.['email'],
      account.idTokenClaims?.['emails']?.[0],
      account.idTokenClaims?.['signInNames.emailAddress'],
      account.idTokenClaims?.['upn'],
      account.idTokenClaims?.['preferred_username'],
    ];

    for (const email of possibleEmailSources) {
      if (email && this.isValidEmail(email)) {
        return email;
      }
    }

    return undefined;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  login() {
    // Clear any existing fragments to avoid confusion
    if (window.location.hash) {
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search
      );
    }

    // Use direct URL redirect instead of MSAL to avoid token exchange issues
    const clientId = 'be2cb096-043a-44e5-9b35-0c981042ab5c';
    const redirectUri = encodeURIComponent(
      'http://localhost:3000/api/auth/callback/azure-ad-b2c'
    );
    const authority =
      'https://chsb2corganization.b2clogin.com/chsb2corganization.onmicrosoft.com/B2C_1_SNJYA_VENDOR_DEV_SIGNIN';

    // Build the authorization URL manually
    const authUrl =
      `${authority}/oauth2/v2.0/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `redirect_uri=${redirectUri}&` +
      `response_mode=fragment&` +
      `scope=openid%20profile%20email&` +
      `state=${generateRandomState()}`;

    console.log('Redirecting to:', authUrl);
    window.location.href = authUrl;
  }

  logout() {
    // Clear stored user info
    localStorage.removeItem('userInfo');
    this.userInfo = null;
    this.isLoggedIn = false;

    // Clear MSAL accounts
    this.msal.instance.clearCache();

    // Redirect to B2C logout
    const authority =
      'https://chsb2corganization.b2clogin.com/chsb2corganization.onmicrosoft.com/B2C_1_SNJYA_VENDOR_DEV_SIGNIN';
    const logoutUrl = `${authority}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(
      'http://localhost:3000'
    )}`;
    window.location.href = logoutUrl;
  }
}

// Helper function to generate a random state parameter
function generateRandomState(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
