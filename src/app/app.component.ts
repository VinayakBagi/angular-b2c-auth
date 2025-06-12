import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class AppComponent {
  ngOnInit(): void {
    const hash = window.location.hash;
    const state = hash.match(/state=([^&]+)/)?.[1];

    if (state === 'store') {
      window.location.hash = '#/store';
    }

    // Optional cleanup
    if (hash.includes('code=')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
}
