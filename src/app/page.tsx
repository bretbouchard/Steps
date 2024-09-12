"use client";

import React, { useState, useEffect } from "react";
import { Song } from "reactronica";
import Track from "./components/Track";
import BpmControls from "./components/BpmControls";  
import PlaybackControls from "./components/PlaybackControls";
import StepCountControl from "./components/StepCountControl";  // Import StepCountControl
import 'nes.css/css/nes.min.css'; 
import './css/app.css';

const HomePage = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [stepCount, setStepCount] = useState(16);  // Control the number of steps
  const [tracks, setTracks] = useState([]);  // Dynamic list of tracks
  const [sampleFiles, setSampleFiles] = useState(null);  // State to hold the sample files

  // Fetch the sampleFiles.json when the component mounts
  useEffect(() => {
    const fetchSampleFiles = async () => {
      try {
        const response = await fetch("/samples/sampleFiles.json");  // Fetch the file from the public folder
        if (!response.ok) {
          throw new Error("Failed to fetch sample files.");
        }
        const data = await response.json();
        setSampleFiles(data);  // Set the loaded data in the state
      } catch (error) {
        console.error("Error fetching sample files:", error);
      }
    };

    fetchSampleFiles();
  }, []);

  // Initialize with 4 tracks once sample files are loaded
  useEffect(() => {
    if (sampleFiles) {
      const initialTracks = Object.keys(sampleFiles).slice(0, 4).map((section, index) => ({
        id: index,
        sectionName: section.charAt(0).toUpperCase() + section.slice(1),  // Capitalize section name
        sectionSamples: sampleFiles[section],  // Pass the list of samples for that section
      }));
      setTracks(initialTracks);
    }
  }, [sampleFiles]);

  // Add a new track from the next available section, cycling through the sample sections
  const addTrack = () => {
    const sectionKeys = Object.keys(sampleFiles);
    const nextSectionIndex = tracks.length % sectionKeys.length;  // Use modulus to cycle through sections

    const newTrack = {
      id: tracks.length,  // Unique id for each new track
      sectionName: sectionKeys[nextSectionIndex].charAt(0).toUpperCase() + sectionKeys[nextSectionIndex].slice(1),  // Capitalize section name
      sectionSamples: sampleFiles[sectionKeys[nextSectionIndex]],  // Get samples for the section
    };

    setTracks([...tracks, newTrack]);  // Add the new track
  };

  // Remove a track by its id
  const removeTrack = (id) => {
    setTracks(tracks.filter((track) => track.id !== id));
  };

  return (
    <div className="App nes-container with-title is-centered">
      <p className="title">Steps - Simple Step Sequencer</p>

      <header>
        <PlaybackControls isPlaying={isPlaying} setIsPlaying={setIsPlaying} />

        <div className="bpm-controls">
          <BpmControls bpm={bpm} setBpm={setBpm} />
        </div>

        <div className="step-controls">
          <StepCountControl stepCount={stepCount} setStepCount={setStepCount} /> {/* Add StepCountControl */}
        </div>

        {sampleFiles && (
          <div className="track-controls">
            <button onClick={addTrack} className="nes-btn is-primary">
              Add Track
            </button>
          </div>
        )}
      </header>

      {/* Song with Tracks */}
      <Song isPlaying={isPlaying} bpm={bpm}>
        {tracks.map((track) => (
          <div key={track.id}>
            <Track
              sectionName={track.sectionName}  // Pass the section name (e.g., "Bass Drums")
              sectionSamples={track.sectionSamples}  // Pass the samples for the section
              allSampleFiles={sampleFiles}  // Pass all sample files to allow selecting samples from any section
              stepCount={stepCount}  // Pass the dynamic step count
            />
            <div className="remove-track">
              <button onClick={() => removeTrack(track.id)} className="remove-track">Remove Track</button>
            </div>
          </div>
        ))}
      </Song>
    </div>
  );
};

export default HomePage;