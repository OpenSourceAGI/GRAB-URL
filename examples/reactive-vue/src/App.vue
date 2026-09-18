<template>
  <main class="wrap">
    <h1>Search Users</h1>
    <input v-model="searchTerm" @input="searchUsers" placeholder="Search users..." />
    <div v-if="userResults.isLoading" class="loading">Loading users...</div>
    <div v-else-if="userResults.error" class="error">{{ userResults.error }}</div>
    <div v-else class="user-list">
      <div v-for="user in userResults.data" :key="user.id" class="user-card">
        {{ user.name }} — {{ user.email }}
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import grab from "grab-url";

// Demo API doesn't implement server-side filtering; this shows the reactive
// loading/error pattern, not a real search backend.
const searchTerm = ref("");
// grab puts the parsed body on `data`, so that is what the list reads.
const userResults = reactive<{
  data: Array<{ id: number; name: string; email: string }>;
  isLoading: boolean;
  error: string | null;
}>({
  data: [],
  isLoading: false,
  error: null,
});

const searchUsers = async () => {
  if (searchTerm.value.length < 2) return;

  await grab("https://jsonplaceholder.typicode.com/users", {
    response: userResults,
    query: searchTerm.value,
  });
};
</script>

<style scoped>
.wrap {
  font-family: system-ui, sans-serif;
  max-width: 480px;
  margin: 3rem auto;
}
.user-card {
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e5e5;
}
.error {
  color: #b91c1c;
}
</style>
