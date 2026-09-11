<script setup lang="ts">
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { usePlayerStore } from "./stores/player";
import Sidebar from "./components/Sidebar.vue";
import TrackList from "./components/TrackList.vue";
import PlayerBar from "./components/PlayerBar.vue";

const player = usePlayerStore();
const { accentColor } = storeToRefs(player);
onMounted(() => player.init());

const rootStyle = computed(() => {
  if (!accentColor.value) return {};
  return {
    background: `radial-gradient(120% 100% at 50% 0%, ${accentColor.value}33 0%, transparent 55%), color-mix(in srgb, ${accentColor.value} 20%, #0a0a0a 80%)`,
  };
});
</script>

<template>
  <div
    class="flex h-screen w-screen flex-col overflow-hidden bg-neutral-950 text-neutral-100 transition-[background] duration-700"
    :style="rootStyle"
  >
    <div class="flex flex-1 overflow-hidden">
      <Sidebar />
      <TrackList />
    </div>
    <PlayerBar />
  </div>
</template>
