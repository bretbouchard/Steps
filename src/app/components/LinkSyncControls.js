"use client";

import React, { useState, useEffect, useCallback } from 'react';

// Placeholder for a potential Ableton Link library object
// In a real scenario, this would be imported from the Link library
// e.g., import Link from 'some-ableton-link-wasm-library';
let mockLinkInstance = null; 

const LinkSyncControls = ({
  // Props from HomePage
  appIsPlaying,
  appBpm,
  onLinkStatusChange, // (status: { isEnabled, numPeers, linkBpm }) => void
  onLinkTempoChange,  // (newBpm) => void (called by Link to update app)
  onLinkPlayStateChange, // (newIsPlaying) => void (called by Link to update app)
}) => {
  const [isLinkEnabled, setIsLinkEnabled] = useState(false);
  const [linkBpm, setLinkBpm] = useState(120);
  const [numPeers, setNumPeers] = useState(0);
  const [linkPlayStopSignal, setLinkPlayStopSignal] = useState(null); // {isPlaying, time}
  const [error, setError] = useState(null);

  // --- Mock Link Library Interaction ---
  // This section simulates what a real Link library might do.
  
  const mockInitializeLink = useCallback(async () => {
    setError(null);
    if (!isLinkEnabled) {
      if (mockLinkInstance) {
        console.log("Mock Link: Disabling and cleaning up.");
        // mockLinkInstance.stop(); // Or similar cleanup
        if (mockLinkInstance.tempoUpdateInterval) clearInterval(mockLinkInstance.tempoUpdateInterval);
        if (mockLinkInstance.peerUpdateInterval) clearInterval(mockLinkInstance.peerUpdateInterval);
        mockLinkInstance = null;
        setNumPeers(0);
        if (onLinkStatusChange) onLinkStatusChange({ isEnabled: false, numPeers: 0, linkBpm });
      }
      return;
    }

    console.log("Mock Link: Initializing...");
    try {
      // Simulate Wasm loading and AudioContext setup
      // const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      // mockLinkInstance = new Link(audioContext); // Hypothetical instantiation
      
      // Simulate successful initialization
      await new Promise(resolve => setTimeout(resolve, 500)); 
      mockLinkInstance = {
        // Mocked API
        getTempo: () => linkBpm,
        setTempo: (newTempo) => {
          setLinkBpm(newTempo);
          console.log(`Mock Link: Tempo set to ${newTempo} by app.`);
          // In a real library, this would propagate to other Link peers.
        },
        getNumPeers: () => numPeers,
        onTempoChanged: (callback) => { mockLinkInstance._tempoChangedCallback = callback; },
        onNumPeersChanged: (callback) => { mockLinkInstance._numPeersChangedCallback = callback; },
        onStartStopChanged: (callback) => { mockLinkInstance._startStopChangedCallback = callback; }, // Hypothetical
        enable: (flag) => { console.log(`Mock Link: Enabled -> ${flag}`); },
        startPlaying: () => {
            console.log("Mock Link: Start playing signaled to Link session.");
            // Simulate Link telling app to start
            if (mockLinkInstance._startStopChangedCallback) mockLinkInstance._startStopChangedCallback(true);
        },
        stopPlaying: () => {
            console.log("Mock Link: Stop playing signaled to Link session.");
            // Simulate Link telling app to stop
            if (mockLinkInstance._startStopChangedCallback) mockLinkInstance._startStopChangedCallback(false);
        },
        // Internal mock properties
        _tempoChangedCallback: null,
        _numPeersChangedCallback: null,
        _startStopChangedCallback: null,
      };

      mockLinkInstance.enable(true);

      // Simulate Link callbacks
      mockLinkInstance.onTempoChanged((newTempo) => {
        console.log(`Mock Link: Tempo changed in session to ${newTempo}`);
        setLinkBpm(newTempo);
        if (onLinkTempoChange) onLinkTempoChange(newTempo);
      });
      
      mockLinkInstance.onNumPeersChanged((newNumPeers) => {
        console.log(`Mock Link: Num peers changed to ${newNumPeers}`);
        setNumPeers(newNumPeers);
      });

      mockLinkInstance.onStartStopChanged((newIsPlaying) => {
        console.log(`Mock Link: Start/stop changed in session to ${newIsPlaying}`);
        if (onLinkPlayStateChange) onLinkPlayStateChange(newIsPlaying);
      });

      // Simulate peer changes and tempo drift for demonstration
      mockLinkInstance.peerUpdateInterval = setInterval(() => {
        const newPeers = Math.floor(Math.random() * 3);
        if (mockLinkInstance && mockLinkInstance._numPeersChangedCallback) mockLinkInstance._numPeersChangedCallback(newPeers);
      }, 5000);
      
      // mockLinkInstance.tempoUpdateInterval = setInterval(() => {
      //   const newTempo = 120 + Math.floor(Math.random() * 5 - 2.5);
      //   if (mockLinkInstance && mockLinkInstance._tempoChangedCallback) mockLinkInstance._tempoChangedCallback(newTempo);
      // }, 8000);


      console.log("Mock Link: Initialized successfully.");
      if (onLinkStatusChange) onLinkStatusChange({ isEnabled: true, numPeers, linkBpm });

    } catch (err) {
      console.error("Mock Link: Initialization failed.", err);
      setError("Failed to initialize Link (mock).");
      setIsLinkEnabled(false);
      if (onLinkStatusChange) onLinkStatusChange({ isEnabled: false, numPeers: 0, linkBpm: appBpm, error: err.message });
      mockLinkInstance = null;
    }
  }, [isLinkEnabled, linkBpm, numPeers, onLinkStatusChange, onLinkTempoChange, onLinkPlayStateChange, appBpm]); // Added appBpm

  useEffect(() => {
    mockInitializeLink();
    return () => { // Cleanup on unmount or when isLinkEnabled changes before re-init
        if (mockLinkInstance) {
            console.log("Mock Link: Cleaning up intervals from useEffect unmount/re-run.");
            if (mockLinkInstance.tempoUpdateInterval) clearInterval(mockLinkInstance.tempoUpdateInterval);
            if (mockLinkInstance.peerUpdateInterval) clearInterval(mockLinkInstance.peerUpdateInterval);
            // Potentially call mockLinkInstance.stop() or disable here if applicable
        }
    };
  }, [mockInitializeLink]); // isLinkEnabled change is handled by mockInitializeLink itself

  // Effect to sync app BPM to Link (if Link is enabled and its BPM changes)
  // This is handled by the onTempoChanged callback from Link via onLinkTempoChange prop

  // Effect to sync Link BPM to app (if Link is enabled and app BPM changes)
  useEffect(() => {
    if (isLinkEnabled && mockLinkInstance && appBpm !== linkBpm) {
      console.log(`Mock Link: App BPM changed to ${appBpm}, updating Link.`);
      mockLinkInstance.setTempo(appBpm);
      // Link's onTempoChanged callback will update linkBpm state if successful
    }
  }, [appBpm, isLinkEnabled, linkBpm]);

  // Effect to sync app play state to Link
  useEffect(() => {
    if (isLinkEnabled && mockLinkInstance) {
      if (appIsPlaying) {
        // This would typically involve more complex phase synchronization logic
        // For now, just signal start to Link.
        console.log("Mock Link: App is playing, ensuring Link session is playing.");
        mockLinkInstance.startPlaying(); 
      } else {
        console.log("Mock Link: App is stopped, ensuring Link session is stopped.");
        mockLinkInstance.stopPlaying();
      }
    }
  }, [appIsPlaying, isLinkEnabled]);


  const handleToggleLink = () => {
    setIsLinkEnabled(prev => !prev);
  };

  // --- Actual UI ---
  return (
    <div className="link-sync-controls-container nes-container with-title">
      <p className="title">Ableton Link Sync</p>
      <button 
        type="button" 
        className={`nes-btn ${isLinkEnabled ? 'is-error' : 'is-success'}`}
        onClick={handleToggleLink}
      >
        {isLinkEnabled ? 'Disable Link' : 'Enable Link'}
      </button>
      
      {error && <p className="nes-text is-error">Error: {error}</p>}
      
      {isLinkEnabled && !error && (
        <div className="link-status">
          <p>Status: <span className="nes-text is-success">Enabled</span></p>
          <p>Peers: <span className="nes-text is-primary">{numPeers}</span></p>
          <p>Link BPM: <span className="nes-text is-primary">{linkBpm.toFixed(2)}</span></p>
        </div>
      )}
      {!isLinkEnabled && !error && <p>Status: Disabled</p>}

      <p className="nes-text is-disabled" style={{fontSize: '0.8em', marginTop: '15px', border: '1px dashed #ccc', padding: '10px'}}>
        <strong>Developer Note:</strong><br/>
        Ableton Link integration is currently conceptual/simulated due to the lack of a readily available, browser-focused WebAssembly library. 
        Full functionality (actual network synchronization with Ableton Link peers) is pending future development and the availability of a suitable library. 
        The UI elements above demonstrate intended interactions.
      </p>
    </div>
  );
};

export default LinkSyncControls;
