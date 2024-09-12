"use client";

import React, { useState, useEffect } from 'react';
import { Song } from 'reactronica';
import PlaybackControls from './components/PlaybackControls';
import Track from './components/Track';
import 'nes.css/css/nes.min.css';
import './css/app.css'; // Custom app styles


const HomePage = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mounted, setMounted] = useState(false); // Ensure that React only runs this after mount

  useEffect(() => {
    setMounted(true); // Indicate that the client-side is ready
  }, []);

  // Prevent server-side mismatch by rendering Song only after mounted
  if (!mounted) return null;

  return (
    <div className="App nes-container with-title is-centered">
      <p className="title">Modular Drum Sequencer</p>
      <PlaybackControls isPlaying={isPlaying} setIsPlaying={setIsPlaying} />

      <Song isPlaying={isPlaying} bpm={120}>
        <div className="tracks">
          <Track name="Kick" initialSample="/samples/bass-drums/Bass-Drums-001.wav" />
          <Track name="Snare" initialSample="/samples/snares/Snares-001.wav" />
          <Track name="Hi-Hat" initialSample="/samples/hi-hats/Hi-Hats-001.wav" />
          <Track name="Bass" initialSample="/samples/bass-drums/Bass-Drums-002.wav" />
        </div>
      </Song>
    </div>
  );
};

export default HomePage;