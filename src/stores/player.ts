import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { load, type Store } from "@tauri-apps/plugin-store";
import { FastAverageColor } from "fast-average-color";

export interface MiniPlayerState {
  trackName: string;
  artist: string;
  cover: string;
  isPlaying: boolean;
  accentColor: string | null;
}

export type RepeatMode = "off" | "all" | "one";

export interface Track {
  id: string;
  path: string;
  name: string;
  artist?: string;
  /** Data URL (data:image/...;base64,...). Empty string means "checked, no cover". */
  cover?: string;
  duration?: number;
}

interface TrackMetadata {
  title: string | null;
  artist: string | null;
  cover: string | null;
  duration: number | null;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

interface PlayerState {
  playlists: Playlist[];
  activePlaylistId: string | null;
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  accentColor: string | null;
  error: string | null;
  position: number;
  duration: number;
}

const LIBRARY_PLAYLIST_ID = "library";
const REPEAT_MODES: RepeatMode[] = ["off", "all", "one"];
let store: Store | null = null;
let progressTimer: ReturnType<typeof setInterval> | null = null;
const fac = new FastAverageColor();

function fileNameFromPath(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

function defaultPlaylists(): Playlist[] {
  return [{ id: LIBRARY_PLAYLIST_ID, name: "Biblioteca", tracks: [] }];
}

export const usePlayerStore = defineStore("player", {
  state: (): PlayerState => ({
    playlists: defaultPlaylists(),
    activePlaylistId: LIBRARY_PLAYLIST_ID,
    currentTrack: null,
    isPlaying: false,
    isLoading: false,
    isShuffle: false,
    repeatMode: "off",
    accentColor: null,
    error: null,
    position: 0,
    duration: 0,
  }),

  getters: {
    activePlaylist(state): Playlist | undefined {
      return state.playlists.find((p) => p.id === state.activePlaylistId);
    },
    currentIndex(): number {
      if (!this.activePlaylist || !this.currentTrack) return -1;
      return this.activePlaylist.tracks.findIndex((t) => t.id === this.currentTrack!.id);
    },
    currentCover(): string | null {
      return this.currentTrack?.cover || null;
    },
  },

  actions: {
    broadcastState() {
      const state: MiniPlayerState = {
        trackName: this.currentTrack?.name ?? "Nada reproduciéndose",
        artist: this.currentTrack?.artist ?? "",
        cover: this.currentCover ?? "",
        isPlaying: this.isPlaying,
        accentColor: this.accentColor,
      };
      void emit("player-state", state);
    },

    broadcastProgress() {
      void emit("player-progress", { position: this.position, duration: this.duration });
    },

    async init() {
      store = await load("library.json", { autoSave: true });
      const saved = await store.get<Playlist[]>("playlists");
      this.playlists = saved && saved.length > 0 ? saved : defaultPlaylists();
      this.activePlaylistId = this.playlists[0]?.id ?? LIBRARY_PLAYLIST_ID;
    },

    async persist() {
      if (!store) return;
      await store.set("playlists", this.playlists);
    },

    createPlaylist(name: string) {
      const trimmed = name.trim();
      if (!trimmed) return;

      const playlist: Playlist = {
        id: crypto.randomUUID(),
        name: trimmed,
        tracks: [],
      };
      this.playlists.push(playlist);
      this.activePlaylistId = playlist.id;
      void this.persist();
    },

    deletePlaylist(id: string) {
      if (id === LIBRARY_PLAYLIST_ID) return;
      this.playlists = this.playlists.filter((p) => p.id !== id);
      if (this.activePlaylistId === id) {
        this.activePlaylistId = LIBRARY_PLAYLIST_ID;
      }
      void this.persist();
    },

    setActivePlaylist(id: string) {
      this.activePlaylistId = id;
    },

    async importTracks(targetPlaylistId?: string) {
      this.error = null;
      const selected = await open({
        multiple: true,
        filters: [{ name: "Audio", extensions: ["mp3", "wav", "flac", "ogg", "m4a"] }],
      });

      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];

      const playlistId = targetPlaylistId ?? this.activePlaylistId ?? LIBRARY_PLAYLIST_ID;
      const playlist = this.playlists.find((p) => p.id === playlistId);
      if (!playlist) return;

      for (const path of paths) {
        if (playlist.tracks.some((t) => t.path === path)) continue;
        playlist.tracks.push({ id: crypto.randomUUID(), path, name: fileNameFromPath(path) });
      }

      await this.persist();
    },

    moveTrackToPlaylist(trackId: string, fromPlaylistId: string, toPlaylistId: string) {
      if (fromPlaylistId === toPlaylistId) return;
      const from = this.playlists.find((p) => p.id === fromPlaylistId);
      const to = this.playlists.find((p) => p.id === toPlaylistId);
      if (!from || !to) return;

      const index = from.tracks.findIndex((t) => t.id === trackId);
      if (index === -1) return;

      const [track] = from.tracks.splice(index, 1);
      if (!to.tracks.some((t) => t.path === track.path)) {
        to.tracks.push(track);
      }
      void this.persist();
    },

    async playTrack(track: Track) {
      this.isLoading = true;
      this.error = null;
      try {
        await invoke("play_audio", { path: track.path });
        this.currentTrack = track;
        this.isPlaying = true;
        this.position = 0;
        this.duration = track.duration ?? 0;
        this.broadcastState();
        this.startProgressTracking();

        if (track.cover === undefined || track.duration === undefined) {
          void this.loadTrackMetadata(track);
        } else {
          void this.updateAccentColor();
        }
      } catch (err) {
        this.error = String(err);
        this.isPlaying = false;
      } finally {
        this.isLoading = false;
      }
    },

    async loadTrackMetadata(track: Track) {
      try {
        const meta = await invoke<TrackMetadata>("get_track_metadata", { path: track.path });
        track.cover = meta.cover ?? "";
        if (meta.title) track.name = meta.title;
        if (meta.artist) track.artist = meta.artist;
        track.duration = meta.duration ?? 0;
        if (this.currentTrack?.id === track.id) {
          this.duration = track.duration;
        }
        void this.persist();
      } catch {
        track.cover = "";
        track.duration = 0;
      } finally {
        if (this.currentTrack?.id === track.id) {
          void this.updateAccentColor();
        }
      }
    },

    startProgressTracking() {
      this.stopProgressTracking();
      progressTimer = setInterval(async () => {
        if (!this.currentTrack || !this.isPlaying) return;
        try {
          this.position = await invoke<number>("get_playback_position");
        } catch {
          return;
        }
        this.broadcastProgress();
        if (this.duration > 0 && this.position >= this.duration - 0.25) {
          this.stopProgressTracking();
          await this.handleTrackEnded();
        }
      }, 500);
    },

    stopProgressTracking() {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
    },

    async seekTo(seconds: number) {
      if (!this.currentTrack) return;
      const target = Math.max(0, Math.min(seconds, this.duration || seconds));
      await invoke("seek_audio", { seconds: target });
      this.position = target;
    },

    cycleRepeatMode() {
      const idx = REPEAT_MODES.indexOf(this.repeatMode);
      this.repeatMode = REPEAT_MODES[(idx + 1) % REPEAT_MODES.length];
    },

    async handleTrackEnded() {
      if (!this.currentTrack) return;

      if (this.repeatMode === "one") {
        await this.playTrack(this.currentTrack);
        return;
      }

      const tracks = this.activePlaylist?.tracks ?? [];
      const isLastTrack = !this.isShuffle && this.currentIndex === tracks.length - 1;

      if (this.repeatMode === "off" && isLastTrack) {
        await this.stop();
        return;
      }

      await this.playNext();
    },

    async updateAccentColor() {
      const cover = this.currentCover;
      if (!cover) {
        this.accentColor = null;
        return;
      }
      try {
        const result = await fac.getColorAsync(cover);
        this.accentColor = result.hex;
      } catch {
        this.accentColor = null;
      } finally {
        this.broadcastState();
      }
    },

    async pause() {
      await invoke("pause_audio");
      this.isPlaying = false;
      this.stopProgressTracking();
      this.broadcastState();
    },

    async resume() {
      await invoke("resume_audio");
      this.isPlaying = true;
      this.startProgressTracking();
      this.broadcastState();
    },

    async stop() {
      await invoke("stop_audio");
      this.isPlaying = false;
      this.currentTrack = null;
      this.accentColor = null;
      this.position = 0;
      this.duration = 0;
      this.stopProgressTracking();
      this.broadcastState();
    },

    toggleShuffle() {
      this.isShuffle = !this.isShuffle;
    },

    randomIndexExcluding(length: number, exclude: number): number {
      if (length <= 1) return 0;
      let index: number;
      do {
        index = Math.floor(Math.random() * length);
      } while (index === exclude);
      return index;
    },

    async playNext() {
      const tracks = this.activePlaylist?.tracks;
      if (!tracks || tracks.length === 0) return;

      const nextIndex = this.isShuffle
        ? this.randomIndexExcluding(tracks.length, this.currentIndex)
        : this.currentIndex === -1
          ? 0
          : (this.currentIndex + 1) % tracks.length;

      await this.playTrack(tracks[nextIndex]);
    },

    async playPrevious() {
      const tracks = this.activePlaylist?.tracks;
      if (!tracks || tracks.length === 0) return;

      const prevIndex = this.isShuffle
        ? this.randomIndexExcluding(tracks.length, this.currentIndex)
        : this.currentIndex <= 0
          ? tracks.length - 1
          : this.currentIndex - 1;

      await this.playTrack(tracks[prevIndex]);
    },

    reorderTracks(fromIndex: number, toIndex: number) {
      const tracks = this.activePlaylist?.tracks;
      if (!tracks || fromIndex === toIndex) return;
      if (fromIndex < 0 || fromIndex >= tracks.length) return;
      if (toIndex < 0 || toIndex >= tracks.length) return;

      const [track] = tracks.splice(fromIndex, 1);
      tracks.splice(toIndex, 0, track);
      void this.persist();
    },
  },
});
