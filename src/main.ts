import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import MiniPlayer from "./MiniPlayer.vue";
import "./style.css";

const isMini = new URLSearchParams(window.location.search).has("mini");

const app = createApp(isMini ? MiniPlayer : App);
app.use(createPinia());
app.mount("#app");
