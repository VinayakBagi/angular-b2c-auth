import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-auth-callback',
  template: `<p>Authenticated successfully</p>`,
})
export class AuthCallbackComponent implements OnInit {
  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const fragmentDetails = this.extractFragmentDetails(window.location.href);
    if (fragmentDetails) {
      this.makeApiCall(fragmentDetails);
    }
  }

  private extractFragmentDetails(url: string): any {
    const fragment = url.split('#')[1];
    if (!fragment) {
      console.error('No fragment found in the URL');
      return null;
    }

    const params = new URLSearchParams(fragment);
    const details: Record<string, any> = {};
    params.forEach((value, key) => {
      details[key] = value;
    });

    return details;
  }

  private makeApiCall(fragmentDetails: any): void {
    console.log('Fragment Details:', fragmentDetails);
    const apiUrl = 'http://localhost:3001/api/auth/callback/azure-ad-b2c';

    this.http.get(apiUrl, { params: fragmentDetails }).subscribe(
      (response: any) => {
        if (response.redirectUrl) {
          console.log('Redirecting to:', response.redirectUrl);
          window.location.href = response.redirectUrl;
        } else {
          console.log('Unexpected API Response:', response);
        }
      },
      (error) => {
        console.error('API Error:', error);
      }
    );
  }
}
