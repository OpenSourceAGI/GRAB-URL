import { component$, useStore, useVisibleTask$ } from "@builder.io/qwik";
import grab from "grab-url";

type UserState = {
  name?: string;
  email?: string;
  isLoading?: boolean;
  error?: string;
};

export default component$(() => {
  // useStore returns a reactive proxy, so the writes grab makes to it are what
  // re-renders — the store goes into `response` the same way Vue's does.
  const user = useStore<UserState>({});

  useVisibleTask$(() => {
    grab("https://jsonplaceholder.typicode.com/users/1", { response: user });
  });

  return (
    <main style="font-family: system-ui, sans-serif; max-width: 480px; margin: 3rem auto">
      <h1>User Profile</h1>
      {user.isLoading && <div>Loading...</div>}
      {user.error && <div>Error: {user.error}</div>}
      {user.name && (
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
        </div>
      )}
    </main>
  );
});
