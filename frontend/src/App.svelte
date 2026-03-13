<script lang="ts">
  import { onMount } from "svelte";
  import { dashboard } from "./lib/ws";

  onMount(() => dashboard.connect());

  // Keep last 30 readings for the sparkline
  let history: number[] = [];
  $: if ($dashboard) {
    history = [...history.slice(-29), $dashboard.temperature];
  }
</script>

<main>
  <header>
    <h1>Qt + Svelte Dashboard</h1>
    <span class="badge" class:online={$dashboard?.timestamp}>
      {$dashboard ? "online" : "connecting…"}
    </span>
  </header>

  {#if $dashboard}
    <div class="grid">
      <div class="card">
        <span class="label">Temperature</span>
        <span class="value">{$dashboard.temperature.toFixed(1)}<small>°C</small></span>
      </div>
      <div class="card">
        <span class="label">Pressure</span>
        <span class="value">{$dashboard.pressure.toFixed(3)}<small>bar</small></span>
      </div>
      <div class="card">
        <span class="label">RPM</span>
        <span class="value">{$dashboard.rpm}<small>rpm</small></span>
      </div>
    </div>

    <!-- SVG sparkline of the last 30 temperature readings -->
    <div class="card full">
      <span class="label">Temperature history</span>
      <svg viewBox="0 0 300 60" preserveAspectRatio="none">
        <polyline
          points={history
            .map((v, i) => `${(i / 29) * 300},${60 - ((v - 18) / 14) * 60}`)
            .join(" ")}
          fill="none"
          stroke="var(--accent)"
          stroke-width="2"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  {:else}
    <p class="waiting">Aguardando conexão com o backend Qt…</p>
  {/if}
</main>

<style>
  main {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
  }

  header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 1.4rem;
    font-weight: 600;
  }

  .badge {
    padding: 0.2rem 0.7rem;
    border-radius: 999px;
    font-size: 0.75rem;
    background: var(--border);
    color: var(--muted);
  }

  .badge.online {
    background: #14532d;
    color: #4ade80;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .card.full {
    width: 100%;
  }

  .label {
    font-size: 0.75rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text);
  }

  .value small {
    font-size: 1rem;
    font-weight: 400;
    color: var(--muted);
    margin-left: 0.25rem;
  }

  svg {
    width: 100%;
    height: 60px;
    margin-top: 0.5rem;
  }

  .waiting {
    color: var(--muted);
    margin-top: 2rem;
  }
</style>
