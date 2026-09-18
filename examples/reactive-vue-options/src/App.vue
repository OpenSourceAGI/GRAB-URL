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

<script lang="ts">
import { defineComponent } from "vue";
import grab from "grab-url";

// The Options API equivalent of the `<script setup>` example: whatever `data()`
// returns is already reactive, so `this.userResults` can be handed to grab as-is
// and its isLoading/error/data writes re-render the template.
export default defineComponent({
  data() {
    return {
      searchTerm: "",
      // grab puts the parsed body on `data`, so that is what the list reads.
      userResults: {
        data: [] as Array<{ id: number; name: string; email: string }>,
        isLoading: false,
        error: null as string | null,
      },
    };
  },
  methods: {
    async searchUsers() {
      if (this.searchTerm.length < 2) return;

      // Demo API doesn't implement server-side filtering; this shows the
      // reactive loading/error pattern, not a real search backend.
      await grab("https://jsonplaceholder.typicode.com/users", {
        response: this.userResults,
        query: this.searchTerm,
      });
    },
  },
});
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
