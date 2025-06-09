import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <p *ngIf="!userInfo && !error">Processing authentication...</p>
      <div *ngIf="userInfo">
        <p>✅ Authenticated successfully!</p>
        <p>
          <strong>Email:</strong> {{ userInfo.email || 'Email not available' }}
        </p>
        <p>
          <strong>Name:</strong> {{ userInfo.name || 'Name not available' }}
        </p>
        <p>Calling your API...</p>
      </div>
      <p *ngIf="error" style="color: red;">❌ {{ error }}</p>

      <!-- Debug section -->
      <details *ngIf="debugInfo" style="margin-top: 20px;">
        <summary>🔍 Debug Info</summary>
        <div
          style="background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px;"
        >
          <h4>Fragment Details:</h4>
          <pre>{{ debugInfo.fragments | json }}</pre>
          <h4>Decoded Claims (if available):</h4>
          <pre>{{ debugInfo.decodedClaims | json }}</pre>
          <h4>User Info Extracted:</h4>
          <pre>{{ userInfo | json }}</pre>
        </div>
      </details>
    </div>
  `,
  styles: [
    `
      pre {
        background: #f8f9fa;
        padding: 10px;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 12px;
        max-height: 200px;
        overflow-y: auto;
      }
    `,
  ],
})
export class AuthCallbackComponent implements OnInit {
  userInfo: any = null;
  error: string | null = null;
  debugInfo: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    try {
      // Parse the URL fragments
      const fragmentDetails = this.extractFragmentDetails(window.location.href);

      if (fragmentDetails) {
        console.log('Fragment details:', fragmentDetails);

        // Try to decode the client_info to get user information
        this.tryDecodeUserInfo(fragmentDetails);

        this.makeApiCall(fragmentDetails);
      } else {
        this.error = 'No authentication data found in URL';
      }
    } catch (err: any) {
      console.error('Error processing authentication:', err);
      this.error = 'Failed to process authentication: ' + err.message;
    }
  }

  private extractFragmentDetails(url: string): any {
    console.log('URL:', url);
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

  private tryDecodeUserInfo(fragmentDetails: any): void {
    let decodedClaims: any = null;
    let clientInfoDecoded: any = null;
    let codeDecoded: any = null;
    let allAttempts: any = {};

    try {
      console.log('=== DEBUGGING USER INFO EXTRACTION ===');
      console.log('Available fragments:', Object.keys(fragmentDetails));

      // Try to decode client_info if available
      if (fragmentDetails.client_info) {
        try {
          console.log('Raw client_info:', fragmentDetails.client_info);
          const clientInfo = this.base64UrlDecode(fragmentDetails.client_info);
          clientInfoDecoded = JSON.parse(clientInfo);
          console.log('Decoded client_info:', clientInfoDecoded);
          allAttempts.clientInfo = clientInfoDecoded;

          // Extract user information from client_info
          if (clientInfoDecoded.email || clientInfoDecoded.preferred_username) {
            this.userInfo = {
              email:
                clientInfoDecoded.email ||
                clientInfoDecoded.preferred_username ||
                'Email not in client_info',
              name:
                clientInfoDecoded.name ||
                clientInfoDecoded.given_name ||
                'Name not in client_info',
              userId: clientInfoDecoded.uid || clientInfoDecoded.oid,
              tenantId: clientInfoDecoded.utid,
              source: 'client_info',
            };
            console.log('✅ Extracted user info from client_info');
          }
        } catch (e: any) {
          console.error('❌ Error decoding client_info:', e);
          allAttempts.clientInfoError = e.message;
        }
      }

      // Try to decode the code parameter - enhanced for compressed JWTs
      if (fragmentDetails.code && !this.userInfo) {
        try {
          console.log('Trying to decode code parameter...');
          console.log(
            'Raw code (first 100 chars):',
            fragmentDetails.code.substring(0, 100) + '...'
          );

          const codeParts = fragmentDetails.code.split('.');
          console.log('Code parts count:', codeParts.length);
          allAttempts.codePartsCount = codeParts.length;

          // Try to decode the header first
          if (codeParts.length >= 1) {
            try {
              const header = this.base64UrlDecode(codeParts[0]);
              const headerObj = JSON.parse(header);
              console.log('JWT Header:', headerObj);
              allAttempts.jwtHeader = headerObj;

              // Check if it's compressed
              if (headerObj.zip === 'Deflate') {
                console.log(
                  '⚠️ JWT payload is compressed with Deflate - cannot decode in browser without additional libraries'
                );
                allAttempts.compressionNote = 'Payload is Deflate compressed';

                // Since we can't decompress, let's try alternative approaches
                console.log(
                  '🔄 Trying alternative approach: calling backend API to handle token exchange'
                );

                // Set a flag to let the API handle the user info extraction
                this.userInfo = {
                  email: 'Will be extracted by backend API',
                  name: 'Will be extracted by backend API',
                  userId: fragmentDetails.state || 'Unknown',
                  source: 'backend_api',
                  note: 'JWT is compressed - backend will handle token exchange',
                };

                console.log('✅ Will let backend API handle compressed JWT');
                allAttempts.solution =
                  'Backend API will exchange compressed code for user tokens';
              }
            } catch (e: any) {
              console.error('❌ Error decoding JWT header:', e);
              allAttempts.headerError = e.message;
            }
          }

          // If not compressed or compression detection failed, try normal JWT decoding
          if (!this.userInfo && codeParts.length >= 2) {
            try {
              // Try different parts of the JWT in case the structure is different
              for (let i = 1; i < codeParts.length; i++) {
                try {
                  console.log(`Trying to decode JWT part ${i}...`);
                  const payload = this.base64UrlDecode(codeParts[i]);
                  const payloadObj = JSON.parse(payload);
                  console.log(`Decoded JWT part ${i}:`, payloadObj);
                  allAttempts[`jwtPart${i}`] = payloadObj;

                  // Check if this part contains user information
                  if (
                    payloadObj.email ||
                    payloadObj.upn ||
                    payloadObj.preferred_username ||
                    payloadObj.name
                  ) {
                    codeDecoded = payloadObj;

                    this.userInfo = {
                      email:
                        payloadObj.email ||
                        payloadObj.emails?.[0] ||
                        payloadObj['signInNames.emailAddress'] ||
                        payloadObj.upn ||
                        payloadObj.preferred_username ||
                        'Email not in JWT part ' + i,
                      name:
                        payloadObj.name ||
                        payloadObj.given_name ||
                        payloadObj.displayName ||
                        'Name not in JWT part ' + i,
                      displayName: payloadObj.displayName,
                      givenName: payloadObj.given_name,
                      surname: payloadObj.family_name,
                      userId: payloadObj.oid || payloadObj.sub,
                      source: `jwt_part_${i}`,
                    };
                    console.log(`✅ Extracted user info from JWT part ${i}`);
                    break;
                  }
                } catch (partError: any) {
                  console.log(
                    `❌ JWT part ${i} decode failed:`,
                    partError.message
                  );
                  allAttempts[`jwtPart${i}Error`] = partError.message;
                }
              }
            } catch (e: any) {
              console.error('❌ Error in JWT parts iteration:', e);
              allAttempts.jwtPartsError = e.message;
            }
          }
        } catch (e: any) {
          console.error('❌ Error processing code parameter:', e);
          allAttempts.codeProcessingError = e.message;
        }
      }

      // Store comprehensive debug information
      this.debugInfo = {
        fragments: fragmentDetails,
        decodedClientInfo: clientInfoDecoded,
        decodedCode: codeDecoded,
        allAttempts: allAttempts,
        extractionLog: [
          'Tried client_info: ' +
            (clientInfoDecoded ? '✅ Success' : '❌ Failed'),
          'Tried code JWT: ' + (codeDecoded ? '✅ Success' : '❌ Failed'),
          'Code is compressed: ' +
            (allAttempts.jwtHeader?.zip === 'Deflate' ? '✅ Yes' : '❌ No'),
          'Will use backend API: ' +
            (this.userInfo?.source === 'backend_api' ? '✅ Yes' : '❌ No'),
        ],
      };

      // If we still don't have user info, create a fallback
      if (!this.userInfo) {
        this.userInfo = {
          email: 'Backend API will extract from compressed JWT',
          name: 'Backend API will extract from compressed JWT',
          userId: fragmentDetails.state || 'Unknown',
          source: 'fallback_backend',
          availableFragments: Object.keys(fragmentDetails),
          note: 'Frontend cannot decompress Deflate-compressed JWT payload',
        };
        console.log('❌ Frontend extraction failed - backend API will handle');
      }

      // Store user info in localStorage for the home component
      localStorage.setItem('userInfo', JSON.stringify(this.userInfo));
      console.log('Final extracted user info:', this.userInfo);
      console.log('=== END DEBUGGING ===');
    } catch (e: any) {
      console.error('❌ Critical error in user info extraction:', e);
      this.userInfo = {
        email: 'Critical extraction error',
        name: 'Critical extraction error',
        userId: 'Error',
        error: e.message,
        source: 'error',
      };
      this.debugInfo = {
        fragments: fragmentDetails,
        criticalError: e.message,
        allAttempts: allAttempts,
      };
    }
  }

  private base64UrlDecode(str: string): string {
    // Convert base64url to base64
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    // Pad with '=' if needed
    while (str.length % 4) {
      str += '=';
    }
    // Decode base64
    return atob(str);
  }

  private makeApiCall(fragmentDetails: any): void {
    console.log('Fragment Details:', fragmentDetails);

    if (fragmentDetails.error) {
      console.error(
        'Error occurred while authenticating in azure b2c:',
        fragmentDetails.error
      );
      this.error = `Authentication error: ${fragmentDetails.error}`;
      return;
    }

    const apiUrl = 'http://localhost:3001/api/auth/callback/azure-ad-b2c';

    // Include fragments, extracted user info, and instructions for backend
    const params = {
      ...fragmentDetails,
      userInfo: JSON.stringify(this.userInfo),
      // Add flag to tell backend it needs to handle token exchange
      needsTokenExchange:
        this.userInfo?.source === 'backend_api' ||
        this.userInfo?.source === 'fallback_backend'
          ? 'true'
          : 'false',
      // Include debug info to help backend understand the situation
      frontendNote:
        this.userInfo?.source === 'backend_api'
          ? 'JWT payload is Deflate compressed - backend should exchange code for user tokens'
          : 'Frontend extracted user info successfully',
    };

    console.log('Making API call with enhanced payload:', params);

    this.http.get(apiUrl, { params }).subscribe(
      (response: any) => {
        console.log('API Response:', response);

        // Check if backend extracted user info
        if (response.userInfo) {
          console.log('✅ Backend extracted user info:', response.userInfo);

          // Update our user info with backend-extracted data
          this.userInfo = {
            ...this.userInfo,
            ...response.userInfo,
            source: 'backend_extracted',
          };

          // Update localStorage with backend-extracted info
          localStorage.setItem('userInfo', JSON.stringify(this.userInfo));
        }

        if (response.redirectUrl) {
          console.log('Redirecting to:', response.redirectUrl);
          // Give user time to see the authentication success message
          setTimeout(() => {
            window.location.href = response.redirectUrl;
          }, 2000);
        } else {
          console.log('Unexpected API Response:', response);
        }
      },
      (error) => {
        console.error('API Error:', error);
        this.error = 'API call failed: ' + error.message;
      }
    );
  }
}
