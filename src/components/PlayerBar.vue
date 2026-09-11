<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Shuffle,
  ListMusic,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-vue-next";
import { usePlayerStore } from "../stores/player";

const player = usePlayerStore();
const { activePlaylist, currentTrack, currentCover, accentColor, isPlaying, isShuffle, error } =
  storeToRefs(player);

const showQueue = ref(false);

const barStyle = computed(() => {
  if (!accentColor.value) return {};
  return {
    background: `linear-gradient(90deg, ${accentColor.value}40, rgba(10,10,10,0.85) 70%), rgba(10,10,10,0.85)`,
  };
});
</script>

<template>
  <footer
    class="relative flex h-20 shrink-0 items-center justify-between border-t border-white/5 bg-neutral-950/80 px-6 transition-[background] duration-700"
    :style="barStyle"
  >
    <!-- Queue panel -->
    <div
      v-if="showQueue"
      class="absolute bottom-full right-4 mb-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-white/10 bg-neutral-900 shadow-xl"
    >
      <div class="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <p class="text-sm font-semibold text-neutral-100">Cola: {{ activePlaylist?.name }}</p>
        <button @click="showQueue = false" class="text-neutral-500 hover:text-neutral-200">
          <X :size="16" />
        </button>
      </div>
      <ul class="divide-y divide-white/5">
        <li
          v-for="(track, index) in activePlaylist?.tracks ?? []"
          :key="track.id"
          class="flex items-center gap-2 px-4 py-2 text-sm"
          :class="currentTrack?.id === track.id ? 'text-emerald-400' : 'text-neutral-300'"
        >
          <span class="flex-1 truncate">{{ track.name }}</span>
          <button
            :disabled="index === 0"
            @click="player.reorderTracks(index, index - 1)"
            class="text-neutral-500 hover:text-neutral-100 disabled:opacity-20"
          >
            <ArrowUp :size="14" />
          </button>
          <button
            :disabled="index === (activePlaylist?.tracks.length ?? 1) - 1"
            @click="player.reorderTracks(index, index + 1)"
            class="text-neutral-500 hover:text-neutral-100 disabled:opacity-20"
          >
            <ArrowDown :size="14" />
          </button>
        </li>
      </ul>
    </div>

    <!-- Now playing -->
    <div class="flex w-72 items-center gap-3 truncate">
      <div class="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-neutral-700 bg-neutral-800 shadow-inner">
        <img
          v-if="currentCover"
          :src="currentCover"
          alt=""
          class="h-full w-full animate-spin-slow object-cover"
          :style="{ animationPlayState: isPlaying ? 'running' : 'paused' }"
        />
        <div
          v-else
          class="flex h-full w-full animate-spin-slow items-center justify-center bg-gradient-to-br from-neutral-700 to-neutral-900"
          :style="{ animationPlayState: isPlaying ? 'running' : 'paused' }"
        >
          <span class="h-2 w-2 rounded-full bg-neutral-500"></span>
        </div>
        <div class="pointer-events-none absolute inset-0 rounded-full ring-2 ring-black/40"></div>
      </div>
      <div class="min-w-0 flex-1 truncate">
        <p class="truncate text-sm text-neutral-100">{{ currentTrack?.name ?? "Nada reproduciéndose" }}</p>
        <p v-if="currentTrack?.artist" class="truncate text-xs text-neutral-400">{{ currentTrack.artist }}</p>
        <p v-if="error" class="truncate text-xs text-red-400">{{ error }}</p>
      </div>

      <!-- Equalizer effect -->
      <div
        v-if="currentTrack"
        class="flex h-4 shrink-0 items-end gap-0.5"
        :style="{ color: accentColor || '#34d399' }"
      >
        <span
          class="w-0.5 rounded-full bg-current animate-eq1"
          :style="{ animationPlayState: isPlaying ? 'running' : 'paused' }"
        ></span>
        <span
          class="w-0.5 rounded-full bg-current animate-eq2"
          :style="{ animationPlayState: isPlaying ? 'running' : 'paused' }"
        ></span>
        <span
          class="w-0.5 rounded-full bg-current animate-eq3"
          :style="{ animationPlayState: isPlaying ? 'running' : 'paused' }"
        ></span>
      </div>
    </div>

    <!-- Transport controls -->
    <div class="flex items-center gap-5">
      <button
        @click="player.toggleShuffle"
        :class="isShuffle ? 'text-emerald-400' : 'text-neutral-400 hover:text-neutral-100'"
      >
        <Shuffle :size="18" />
      </button>

      <button
        :disabled="!activePlaylist?.tracks.length"
        @click="player.playPrevious"
        class="text-neutral-300 hover:text-neutral-100 disabled:opacity-30"
      >
        <SkipBack :size="20" :fill="'currentColor'" />
      </button>

      <button
        v-if="currentTrack"
        @click="isPlaying ? player.pause() : player.resume()"
        class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition hover:scale-105"
      >
        <Pause v-if="isPlaying" :size="18" :fill="'currentColor'" />
        <Play v-else :size="18" :fill="'currentColor'" class="ml-0.5" />
      </button>

      <button
        :disabled="!activePlaylist?.tracks.length"
        @click="player.playNext"
        class="text-neutral-300 hover:text-neutral-100 disabled:opacity-30"
      >
        <SkipForward :size="20" :fill="'currentColor'" />
      </button>

      <button
        v-if="currentTrack"
        @click="player.stop"
        class="text-neutral-400 hover:text-neutral-100"
      >
        <Square :size="16" />
      </button>

      <button
        @click="showQueue = !showQueue"
        :class="showQueue ? 'text-emerald-400' : 'text-neutral-400 hover:text-neutral-100'"
      >
        <ListMusic :size="18" />
      </button>
    </div>

    <div class="w-72"></div>
  </footer>
</template>
