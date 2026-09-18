<script lang="ts">
  import grab from "grab-url";

  // Demo API returns a fixed list regardless of query; this shows the
  // reactive loading/error pattern, not a real search backend.
  // grab puts the parsed body on `data`, so that is what the list reads.
  let searchResults = $state<{
    data: Array<{ id: number; title: string; price: number }>;
    isLoading: boolean;
    error: string | null;
  }>({
    data: [],
    isLoading: false,
    error: null,
  });

  async function searchProducts(query: string) {
    await grab("https://fakestoreapi.com/products/category/electronics", {
      response: searchResults,
      query,
    });
  }
</script>

<main>
  <h1>Search Products</h1>
  <input
    type="text"
    oninput={(e) => searchProducts((e.target as HTMLInputElement).value)}
    placeholder="Search products..."
  />

  {#if searchResults.isLoading}
    <div class="loading">Searching...</div>
  {:else if searchResults.error}
    <div class="error">{searchResults.error}</div>
  {:else if searchResults.data}
    <div class="results">
      {#each searchResults.data as product}
        <div class="product-card">
          <h3>{product.title}</h3>
          <p>${product.price}</p>
        </div>
      {/each}
    </div>
  {/if}
</main>

<style>
  main {
    font-family: system-ui, sans-serif;
    max-width: 480px;
    margin: 3rem auto;
  }
  .error {
    color: #b91c1c;
  }
  .product-card {
    padding: 0.5rem 0;
    border-bottom: 1px solid #e5e5e5;
  }
</style>
