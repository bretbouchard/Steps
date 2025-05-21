"use client";

import React, { useState, useEffect } from "react";
import { Song } from "reactronica";
import Track from "./components/Track";
import BpmControls from "./components/BpmControls";  
import PlaybackControls from "./components/PlaybackControls";
import StepCountControl from "./components/StepCountControl";  // Import StepCountControl
import MidiControls from "./components/MidiControls"; // Import MidiControls
import OscControls from "./components/OscControls"; // Import OscControls
import LinkSyncControls from "./components/LinkSyncControls"; // Import LinkSyncControls
import 'nes.css/css/nes.min.css'; 
import './css/app.css';

const HomePage = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [stepCount, setStepCount] = useState(16);  // Control the number of steps
  const [tracks, setTracks] = useState([]);  // Dynamic list of tracks
  // Each track object will now also store its volume and a trigger timestamp for MIDI play
  // e.g., { id, sectionName, sectionSamples, volume, midiTriggerTime }

  const [sampleFiles, setSampleFiles] = useState(null);  // State to hold the sample files
  const [sampleFilesError, setSampleFilesError] = useState(null); // For errors related to sampleFiles.json
  const [isLoadingSamples, setIsLoadingSamples] = useState(true); // To show loading state
  const [selectedMidiOutputDevice, setSelectedMidiOutputDevice] = useState(null); // For MIDI output
  const [sendOscMessageFunction, setSendOscMessageFunction] = useState(null); // For sending OSC messages
  const [linkStatus, setLinkStatus] = useState({ isEnabled: false, numPeers: 0, linkBpm: 120 }); // For Ableton Link status

  const DEFAULT_TRACK_VOLUME_DB = -6; // Default volume in dB for tracks

  // Function to validate the structure of sampleFiles.json
  const validateSampleFiles = (data) => {
    if (typeof data !== 'object' || data === null) {
      return "Sample library is not a valid object.";
    }
    for (const category in data) {
      if (typeof category !== 'string') {
        return "Sample category names must be strings.";
      }
      if (!Array.isArray(data[category])) {
        return `Category ${category} is not a valid list of samples.`;
      }
      for (const sample of data[category]) {
        if (typeof sample !== 'object' || sample === null || !sample.name || !sample.path) {
          return `Invalid sample structure in category ${category}. Each sample must have a name and path.`;
        }
        if (typeof sample.name !== 'string' || typeof sample.path !== 'string') {
          return `Invalid sample name or path type in category ${category}. Both must be strings.`;
        }
      }
    }
    return null; // No error
  };

  // Fetch the sampleFiles.json when the component mounts
  useEffect(() => {
    const fetchSampleFiles = async () => {
      setIsLoadingSamples(true);
      setSampleFilesError(null);
      try {
        const response = await fetch("/samples/sampleFiles.json");  // Fetch the file from the public folder
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} - Failed to fetch sample files.`);
        }
        const data = await response.json();

        const validationError = validateSampleFiles(data);
        if (validationError) {
          throw new Error(validationError);
        }
        
        setSampleFiles(data);  // Set the loaded data in the state
      } catch (error) {
        console.error("Error fetching or validating sample files:", error);
        setSampleFilesError(error.message || "An unknown error occurred while loading samples.");
        setSampleFiles(null); // Ensure no stale data is used
      } finally {
        setIsLoadingSamples(false);
      }
    };

    fetchSampleFiles();
  }, []);

  // Initialize with 4 tracks once sample files are loaded and valid
  useEffect(() => {
    if (sampleFiles && !sampleFilesError) { // Only initialize if sampleFiles is loaded and there's no error
      const initialTracksData = Object.keys(sampleFiles).slice(0, 4).map((section, index) => ({
        id: index,
        sectionName: section.charAt(0).toUpperCase() + section.slice(1),  // Capitalize section name
        sectionSamples: sampleFiles[section],  // Pass the list of samples for that section
        volume: DEFAULT_TRACK_VOLUME_DB, // Initialize volume
        midiTriggerTime: null, // For triggering sample via MIDI
      }));
      setTracks(initialTracksData);
    }
  }, [sampleFiles, sampleFilesError]); // Added sampleFilesError dependency

  // Add a new track from the next available section, cycling through the sample sections
  const addTrack = () => {
    if (!sampleFiles || sampleFilesError) {
      console.warn("Cannot add track: sample files are not loaded or are invalid.");
      return;
    }
    const sectionKeys = Object.keys(sampleFiles);
    if (sectionKeys.length === 0) {
      console.warn("Cannot add track: no sample categories available.");
      return;
    }
    const nextSectionIndex = tracks.length % sectionKeys.length;

    const newTrackData = {
      id: tracks.length,
      sectionName: sectionKeys[nextSectionIndex].charAt(0).toUpperCase() + sectionKeys[nextSectionIndex].slice(1),
      sectionSamples: sampleFiles[sectionKeys[nextSectionIndex]],
      volume: DEFAULT_TRACK_VOLUME_DB,
      midiTriggerTime: null,
    };
    setTracks([...tracks, newTrackData]);
  };

  const removeTrack = (id) => {
    setTracks(tracks.filter((track) => track.id !== id));
  };

  // Callback for MIDI Output device selection from MidiControls
  const handleMidiOutputSelected = (device) => {
    setSelectedMidiOutputDevice(device);
    console.log("HomePage: Selected MIDI Output Device", device ? device.name : 'None');
  };

  // Callback for MIDI Note On events
  const handleMidiNoteOn = (note, velocity, channel) => {
    console.log(`HomePage received Note On: Note ${note}, Velocity ${velocity}, Channel ${channel}`);
    // Map MIDI notes C4 (60) to D#4 (63) to tracks 0-3
    const trackIdToTrigger = note - 60;

    if (trackIdToTrigger >= 0 && trackIdToTrigger < tracks.length) {
      setTracks(prevTracks =>
        prevTracks.map(track =>
          track.id === trackIdToTrigger
            ? { ...track, midiTriggerTime: Date.now() } // Update timestamp to trigger sample
            : track
        )
      );
    }
  };

  // Callback for OSC commands from OscControls.js
  const handleOscCommand = (command, payload) => {
    console.log(`HomePage received OSC Command: ${command}`, payload);
    switch (command) {
      case 'triggerTrack':
        if (payload.trackIndex >= 0 && payload.trackIndex < tracks.length) {
          setTracks(prevTracks =>
            prevTracks.map(track =>
              track.id === payload.trackIndex
                ? { ...track, midiTriggerTime: Date.now() } // Re-use midiTriggerTime for OSC trigger
                : track
            )
          );
          console.log(`OSC: Triggered Track ${payload.trackIndex}`);
        }
        break;
      case 'setTrackVolume':
        if (payload.trackIndex >= 0 && payload.trackIndex < tracks.length && payload.volume >= 0.0 && payload.volume <= 1.0) {
          // Scale 0.0-1.0 to dB range (-30dB to 0dB)
          const minDb = -30;
          const maxDb = 0;
          const scaledVolume = payload.volume * (maxDb - minDb) + minDb;
          updateTrackVolume(payload.trackIndex, scaledVolume);
          console.log(`OSC: Set Track ${payload.trackIndex} Volume to ${payload.volume} (Scaled: ${scaledVolume}dB)`);
        }
        break;
      case 'playSequencer':
        setIsPlaying(true);
        console.log("OSC: Play Sequencer");
        break;
      case 'stopSequencer':
        setIsPlaying(false);
        console.log("OSC: Stop Sequencer");
        break;
      case 'setBpm':
        if (payload.bpm > 0) { // Add validation as needed
          setBpm(payload.bpm);
          console.log(`OSC: Set BPM to ${payload.bpm}`);
        }
        break;
      default:
        console.warn(`Unknown OSC command: ${command}`);
    }
  };

  // Callback for MIDI Control Change events
  const handleMidiControlChange = (controllerNumber, controllerValue, channel) => {
    console.log(`HomePage received CC: Controller ${controllerNumber}, Value ${controllerValue}, Channel ${channel}`);
    // CC 7 (Main Volume) on channels 1-4 controls tracks 0-3
    if (controllerNumber === 7 && channel >= 1 && channel <= 4) {
      const trackIdToControl = channel - 1;
      if (trackIdToControl < tracks.length) {
        // Scale MIDI 0-127 to dB range, e.g., -60dB to 0dB
        // A common mapping: 0 = -60dB, 127 = 0dB.
        // Let's use -30dB to 0dB as in the Knob component for consistency.
        const minDb = -30;
        const maxDb = 0;
        const scaledVolume = (controllerValue / 127) * (maxDb - minDb) + minDb;

        setTracks(prevTracks =>
          prevTracks.map(track =>
            track.id === trackIdToControl
              ? { ...track, volume: scaledVolume }
              : track
          )
        );
      }
    }
  };
  
  // Function to update a specific track's volume (e.g., from Knob)
  const updateTrackVolume = (trackId, newVolume) => {
    setTracks(prevTracks =>
      prevTracks.map(track =>
        track.id === trackId ? { ...track, volume: newVolume } : track
      )
    );
  };

  // Callback for track step play events (from Track.js)
  const handleTrackStepPlay = (trackId, step, stepIndex, sampleName) => {
    // console.log(`HomePage: Track ${trackId} played step ${stepIndex} (Sample: ${sampleName})`, step);
    
    // MIDI Output
    if (selectedMidiOutputDevice && step) { // Step is active (not null)
      const noteNumber = 60 + trackId; // Track 0 = Note 60 (C4), Track 1 = Note 61, etc.
      const velocity = 100; // Fixed velocity for now
      const channel = 0; // MIDI Channel 1 (0-indexed)

      // Note On message: [status, note, velocity]
      // Status byte: 0x90 for Note On on channel 1
      const noteOnMessage = [0x90 + channel, noteNumber, velocity];
      selectedMidiOutputDevice.send(noteOnMessage);
      console.log(`Sent MIDI Note On: Ch ${channel+1}, Note ${noteNumber}, Vel ${velocity} to ${selectedMidiOutputDevice.name} for Track ${trackId}`);

      // Note Off message: [status, note, velocity (0 for Note Off)]
      // Status byte: 0x80 for Note Off on channel 1
      const noteOffMessage = [0x80 + channel, noteNumber, 0];
      const noteDuration = 150; // ms

      setTimeout(() => {
        selectedMidiOutputDevice.send(noteOffMessage);
        console.log(`Sent MIDI Note Off: Ch ${channel+1}, Note ${noteNumber} to ${selectedMidiOutputDevice.name} for Track ${trackId} after ${noteDuration}ms`);
      }, noteDuration);
    }

    // OSC Output for track step play
    if (sendOscMessageFunction && step) {
      const address = `/sequencer/track/${trackId}/played`;
      try {
        sendOscMessageFunction({ address }); // No arguments needed for this message
        console.log(`Sent OSC: ${address}`);
      } catch (error) {
        console.error(`Error sending OSC for track play: ${address}`, error);
      }
    }
  };

  // Callback for OSC port readiness from OscControls.js
  const handleOscPortReady = (sendFunc, status) => {
    if (status === 'connected' && sendFunc) {
      setSendOscMessageFunction(() => sendFunc); // Use functional update for stability
      console.log("HomePage: OSC Send function received and ready.");
    } else {
      setSendOscMessageFunction(null);
      console.log(`HomePage: OSC Send function removed or port status: ${status}`);
    }
  };

  // Effect for sending OSC when isPlaying changes
  useEffect(() => {
    if (sendOscMessageFunction) {
      const address = '/sequencer/isPlaying';
      const args = [{ type: 'i', value: isPlaying ? 1 : 0 }];
      try {
        sendOscMessageFunction({ address, args });
        console.log(`Sent OSC: ${address} ${isPlaying ? 1 : 0}`);
      } catch (error) {
        console.error(`Error sending OSC for isPlaying: ${address}`, error);
      }
    }
  }, [isPlaying, sendOscMessageFunction]);

  // Effect for sending OSC when bpm changes
  useEffect(() => {
    if (sendOscMessageFunction) {
      const address = '/sequencer/bpm';
      // Ensure BPM is a float, as per osc-js requirements for 'f' type
      const bpmFloat = parseFloat(bpm.toFixed(2)); 
      const args = [{ type: 'f', value: bpmFloat }];
      try {
        sendOscMessageFunction({ address, args });
        console.log(`Sent OSC: ${address} ${bpmFloat}`);
      } catch (error) {
        console.error(`Error sending OSC for bpm: ${address}`, error);
      }
    }
  }, [bpm, sendOscMessageFunction]);

  // --- Ableton Link Callbacks ---
  const handleLinkStatusChange = useCallback((status) => {
    console.log("HomePage: Link Status Change", status);
    setLinkStatus(prevStatus => ({ ...prevStatus, ...status }));
    if (status.isEnabled && status.linkBpm) {
        // If Link is enabled and provides a BPM, app should follow
        if (Math.abs(bpm - status.linkBpm) > 0.1) { // Avoid small floating point loops
             setBpm(parseFloat(status.linkBpm.toFixed(2)));
        }
    }
  }, [bpm]); // Added bpm to dependencies

  const handleLinkTempoChange = useCallback((newLinkBpm) => {
    console.log(`HomePage: Link Tempo Changed to ${newLinkBpm}`);
    if (linkStatus.isEnabled) { // Only update app BPM if Link is enabled
        if (Math.abs(bpm - newLinkBpm) > 0.1) {
            setBpm(parseFloat(newLinkBpm.toFixed(2)));
        }
    }
  }, [linkStatus.isEnabled, bpm]); // Added bpm to dependencies

  const handleLinkPlayStateChange = useCallback((newIsPlaying) => {
    console.log(`HomePage: Link Play State Changed to ${newIsPlaying}`);
    if (linkStatus.isEnabled) { // Only update app play state if Link is enabled
      if (isPlaying !== newIsPlaying) {
        setIsPlaying(newIsPlaying);
      }
    }
  }, [linkStatus.isEnabled, isPlaying]); // Added isPlaying


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

        {/* Only show Add Track button if samples are loaded successfully */}
        {sampleFiles && !sampleFilesError && !isLoadingSamples && (
          <div className="track-controls">
            <button onClick={addTrack} className="nes-btn is-primary">
              Add Track
            </button>
          </div>
        )}
      </header>

      {/* Display Loading State or Error Message */}
      {isLoadingSamples && <p className="nes-text is-primary">Loading sample library...</p>}
      
      {sampleFilesError && (
        <div className="nes-container is-error with-title is-centered">
          <p className="title">Error</p>
          <p>{sampleFilesError} Please try refreshing the page.</p>
        </div>
      )}

      {/* Song with Tracks - Only render if samples loaded successfully */}
      {!isLoadingSamples && !sampleFilesError && sampleFiles && (
        <Song isPlaying={isPlaying} bpm={bpm}>
          {tracks.map((trackData) => (
            <div key={trackData.id}>
              <Track
                trackId={trackData.id} // Pass trackId for volume updates
                sectionName={trackData.sectionName}
                sectionSamples={trackData.sectionSamples}
                allSampleFiles={sampleFiles}
                stepCount={stepCount}
                volume={trackData.volume} // Pass volume from state
                onVolumeChange={(newVolume) => updateTrackVolume(trackData.id, newVolume)} // For Knob updates
                midiTriggerTime={trackData.midiTriggerTime} // Pass MIDI trigger time
                onTrackStepPlay={handleTrackStepPlay} // Pass the new callback
              />
              <div className="remove-track">
                <button onClick={() => removeTrack(trackData.id)} className="remove-track">Remove Track</button>
              </div>
            </div>
          ))}
        </Song>
      )}

      {/* MIDI Controls Area */}
      <div className="midi-controls-area">
        <MidiControls 
          onNoteOn={handleMidiNoteOn}
          onControlChange={handleMidiControlChange}
          onMidiOutputSelected={handleMidiOutputSelected} // Pass the new callback
          isPlaying={isPlaying} // Pass isPlaying state for MIDI Clock
          bpm={bpm}             // Pass bpm state for MIDI Clock
        />
      </div>

      {/* OSC Controls Area */}
      <div className="osc-controls-area">
        <OscControls 
          onOscCommand={handleOscCommand} 
          onOscPortReady={handleOscPortReady} 
        />
      </div>

      {/* Ableton Link Controls Area */}
      <div className="link-sync-controls-area">
        <LinkSyncControls
          appIsPlaying={isPlaying}
          appBpm={bpm}
          onLinkStatusChange={handleLinkStatusChange}
          onLinkTempoChange={handleLinkTempoChange}
          onLinkPlayStateChange={handleLinkPlayStateChange}
        />
      </div>
    </div>
  );
};

export default HomePage;