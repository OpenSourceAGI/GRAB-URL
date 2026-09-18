import { createMutable } from "solid-js/store";
import { onMount, Show } from "solid-js";
import grab from "grab-url";

type UserState = {
  name?: string;
  email?: string;
  isLoading?: boolean;
  error?: string;
};

export default function App() {
  // createMutable is a deep proxy, so the writes grab makes to this object are
  // the reactive updates — no setter, no signal to thread through.
  const user = createMutable<UserState>({});

  onMount(() => {
    grab("https://jsonplaceholder.typicode.com/users/1", { response: user });
  });

  return (
    <main style={{ "font-family": "system-ui, sans-serif", "max-width": "480px", margin: "3rem auto" }}>
      <h1>User Profile</h1>
      <Show when={user.isLoading}>
        <div>Loading...</div>
      </Show>
      <Show when={user.error}>
        <div>Error: {user.error}</div>
      </Show>
      <Show when={user.name}>
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
        </div>
      </Show>
    </main>
  );
}
