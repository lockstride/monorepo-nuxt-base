<script setup lang="ts">
// This fetch now goes to the Nuxt server, which will proxy it to the API
const { data, pending, error } = await useFetch("/api/hello-world", {
  lazy: true,
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">Web App (SPA)</h1>
    <p class="mb-2">Fetching message from the backend API...</p>
    <div
      class="p-4 border rounded-md bg-gray-50 dark:bg-gray-800 min-h-[100px]"
    >
      <p v-if="pending">Loading...</p>
      <p v-else-if="error" class="text-red-500">Error: {{ error?.message }}</p>
      <pre v-else>{{ data }}</pre>
    </div>
  </div>
</template>
