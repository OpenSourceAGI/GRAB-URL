import { Component, signal } from "@angular/core";
import grab from "grab-url";

type UserState = {
  name?: string;
  email?: string;
  isLoading?: boolean;
  error?: string;
};

@Component({
  selector: "app-root",
  standalone: true,
  template: `
    <main class="wrap">
      <h1>User Profile</h1>
      @if (user().isLoading) {
        <div>Loading...</div>
      }
      @if (user().error) {
        <div class="error">Error: {{ user().error }}</div>
      }
      @if (user().name) {
        <div>
          <h2>{{ user().name }}</h2>
          <p>{{ user().email }}</p>
        </div>
      }
    </main>
  `,
  styles: [
    `
      .wrap {
        font-family: system-ui, sans-serif;
        max-width: 480px;
        margin: 3rem auto;
      }
      .error {
        color: #b91c1c;
      }
    `,
  ],
})
export class AppComponent {
  user = signal<UserState>({});

  constructor() {
    // grab calls `response` with a new object for each state it reaches, which
    // is exactly what a signal wants — set it and the template re-renders.
    grab("https://jsonplaceholder.typicode.com/users/1", {
      response: (next: UserState) => this.user.set({ ...next }),
    });
  }
}
