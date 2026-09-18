import { useEffect, useState } from "preact/hooks";
import grab from "grab-url";

type UserState = Partial<{
  name: string;
  email: string;
  isLoading: boolean;
  error: string;
}>;

export default function App() {
  const [userState, setUserState] = useState<UserState>({});

  useEffect(() => {
    // Same shape as the React example — preact/hooks' setter takes the
    // loading/error/data states grab hands it.
    grab("https://jsonplaceholder.typicode.com/users/1", {
      response: setUserState,
    });
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 480, margin: "3rem auto" }}>
      <h1>User Profile</h1>
      {userState.isLoading && <div>Loading...</div>}
      {userState.error && <div>Error: {userState.error}</div>}
      {userState.name && (
        <div>
          <h2>{userState.name}</h2>
          <p>{userState.email}</p>
        </div>
      )}
    </main>
  );
}
