use base64::{engine::general_purpose::STANDARD, Engine};
use cpal::traits::{DeviceTrait, HostTrait};
use lofty::file::TaggedFileExt;
use lofty::probe::Probe;
use lofty::tag::Accessor;
use rodio::{Decoder, OutputStream, Sink};
use serde::Serialize;
use std::fs::File;
use std::io::BufReader;
use std::sync::mpsc::{channel, Sender};
use std::thread;
use tauri::State;

#[derive(Serialize)]
pub struct TrackMetadata {
    title: Option<String>,
    artist: Option<String>,
    cover: Option<String>,
}

#[tauri::command]
fn get_track_metadata(path: String) -> Result<TrackMetadata, String> {
    let tagged_file = Probe::open(&path)
        .map_err(|e| format!("No se pudo abrir el archivo: {e}"))?
        .read()
        .map_err(|e| format!("No se pudo leer metadatos: {e}"))?;

    let tag = tagged_file.primary_tag().or_else(|| tagged_file.first_tag());

    let Some(tag) = tag else {
        return Ok(TrackMetadata { title: None, artist: None, cover: None });
    };

    let title = tag.title().map(|s| s.to_string());
    let artist = tag.artist().map(|s| s.to_string());
    let cover = tag.pictures().first().map(|picture| {
        let mime = picture
            .mime_type()
            .map(|m| m.as_str())
            .unwrap_or("image/jpeg");
        let encoded = STANDARD.encode(picture.data());
        format!("data:{mime};base64,{encoded}")
    });

    Ok(TrackMetadata { title, artist, cover })
}

enum AudioCommand {
    Play(String, Sender<Result<(), String>>),
    Pause,
    Resume,
    Stop,
}

pub struct AudioPlayer {
    sender: Sender<AudioCommand>,
}

impl AudioPlayer {
    fn new() -> Self {
        let (sender, receiver) = channel::<AudioCommand>();

        thread::spawn(move || {
            match cpal::default_host().default_output_device().and_then(|d| d.name().ok()) {
                Some(name) => eprintln!("[audio] Dispositivo de salida por defecto: {name}"),
                None => eprintln!("[audio] No se encontró ningún dispositivo de salida por defecto"),
            }

            let (_stream, stream_handle) =
                OutputStream::try_default().expect("No se pudo inicializar el dispositivo de audio");
            let mut sink: Option<Sink> = None;

            for command in receiver {
                match command {
                    AudioCommand::Play(path, reply) => {
                        if let Some(old_sink) = sink.take() {
                            old_sink.stop();
                        }

                        let result = File::open(&path)
                            .map_err(|e| format!("No se pudo abrir el archivo: {e}"))
                            .and_then(|file| {
                                Decoder::new(BufReader::new(file))
                                    .map_err(|e| format!("Formato de audio inválido: {e}"))
                            })
                            .and_then(|source| {
                                let new_sink = Sink::try_new(&stream_handle).map_err(|e| e.to_string())?;
                                new_sink.append(source);
                                new_sink.play();
                                sink = Some(new_sink);
                                Ok(())
                            });

                        let _ = reply.send(result);
                    }
                    AudioCommand::Pause => {
                        if let Some(s) = &sink {
                            s.pause();
                        }
                    }
                    AudioCommand::Resume => {
                        if let Some(s) = &sink {
                            s.play();
                        }
                    }
                    AudioCommand::Stop => {
                        if let Some(s) = sink.take() {
                            s.stop();
                        }
                    }
                }
            }
        });

        Self { sender }
    }

    fn send(&self, command: AudioCommand) -> Result<(), String> {
        self.sender.send(command).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn play_audio(path: String, state: State<AudioPlayer>) -> Result<(), String> {
    let (reply_tx, reply_rx) = channel();
    state.send(AudioCommand::Play(path, reply_tx))?;
    reply_rx.recv().map_err(|e| e.to_string())?
}

#[tauri::command]
fn pause_audio(state: State<AudioPlayer>) -> Result<(), String> {
    state.send(AudioCommand::Pause)
}

#[tauri::command]
fn resume_audio(state: State<AudioPlayer>) -> Result<(), String> {
    state.send(AudioCommand::Resume)
}

#[tauri::command]
fn stop_audio(state: State<AudioPlayer>) -> Result<(), String> {
    state.send(AudioCommand::Stop)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(AudioPlayer::new())
        .invoke_handler(tauri::generate_handler![
            play_audio,
            pause_audio,
            resume_audio,
            stop_audio,
            get_track_metadata
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
