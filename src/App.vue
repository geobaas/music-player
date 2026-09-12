<script setup lang="ts">
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { listen } from "@tauri-apps/api/event";
import { usePlayerStore } from "./stores/player";
import Sidebar from "./components/Sidebar.vue";
import TrackList from "./components/TrackList.vue";
import PlayerBar from "./components/PlayerBar.vue";

interface MiniControlPayload {
  action: "playPause" | "next" | "prev";
}

const player = usePlayerStore();
const { accentColor } = storeToRefs(player);

onMounted(async () => {
  await player.init();

  await listen<MiniControlPayload>("player-control", ({ payload }) => {
    if (payload.action === "playPause") {
      if (player.isPlaying) void player.pause();
      else if (player.currentTrack) void player.resume();
    } else if (payload.action === "next") {
      void player.playNext();
    } else if (payload.action === "prev") {
      void player.playPrevious();
    }
  });

  await listen("player-request-state", () => {
    player.broadcastState();
    player.broadcastProgress();
  });
});

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
