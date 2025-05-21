"use client";

import React, { useState, useEffect } from "react";
import { Track as ReactronicaTrack, Instrument } from "reactronica";
// Replaced vulnerable rotary knob with our secure implementation
import SimpleKnob from "./SimpleKnob";
import SequencerSteps from "./SequencerSteps";
import SampleSelectionModal from "./SampleSelectionModal";  // Modal for selecting samples

const Track = ({
  trackId, // Added prop
  sectionName,
  sectionSamples,
  allSampleFiles,
  stepCount,
  volume: propVolume, // Renamed to avoid conflict with internal state if any; this is controlled by parent
  onVolumeChange,   // Added prop
  midiTriggerTime,  // Added prop
  onTrackStepPlay, // Added prop for reporting step plays to parent
}) => {
  // const [volume, setVolume] = useState(-6); // Volume now comes from props
  const [pitch, setPitch] = useState(0); // Pitch remains internal for now
  const [sample, setSample] = useState(sectionSamples[0]);  // Initialize with the first sample
  const [sampleError, setSampleError] = useState(null); // To store errors related to the current sample
  const [steps, setSteps] = useState(Array(stepCount).fill(false));  // Dynamically initialize based on stepCount
  const [currentStepIndex, setCurrentStepIndex] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);  // Modal visibility state
  const [playNoteRequest, setPlayNoteRequest] = useState(null); // For MIDI triggering

  // Effect to validate sample when it changes
  useEffect(() => {
    if (!sample || typeof sample.path !== 'string' || !sample.path.trim()) {
      setSampleError("Invalid sample path.");
      return;
    }

    setSampleError(null); // Clear previous errors
    const audio = new Audio(sample.path);
    
    const handleError = () => {
      setSampleError(`Error loading: ${sample.name}`);
      console.error(`Error loading audio file: ${sample.path}`);
    };

    const handleCanPlay = () => {
      // Sample loaded successfully, clear any error.
      // We might not need to do anything here if we optimistically clear errors.
      // However, if there was a previous error, this confirms it's now fine.
      setSampleError(null); 
    };

    audio.addEventListener('error', handleError);
    audio.addEventListener('canplaythrough', handleCanPlay);

    // Cleanup: remove event listeners when component unmounts or sample changes
    return () => {
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplaythrough', handleCanPlay);
      // It's good practice to also pause/reset the audio element if it's loading
      audio.src = ""; // Stop loading
    };
  }, [sample]);

  // Effect to handle MIDI note trigger
  useEffect(() => {
    if (midiTriggerTime) {
      // Use a unique ID for the note request to ensure Reactronica processes it even if the note is the same
      setPlayNoteRequest({ id: midiTriggerTime, notes: [{ name: "C3" }] }); 
      
      // Optional: Automatically clear the request after a short period
      // This helps if Reactronica doesn't clear playNotes itself or if you want to allow rapid retriggering.
      // const timer = setTimeout(() => setPlayNoteRequest(null), 50);
      // return () => clearTimeout(timer);
    }
  }, [midiTriggerTime]);

  // When playNoteRequest is processed by Reactronica (indicated by currentStepIndex changing perhaps, or just after setting)
  // we can clear it. For now, Reactronica's `playNotes` is fire-and-forget from our side.
  // If `playNotes` itself could return a promise or have a callback, that would be more robust.
  // A simple way: if `playNoteRequest` is set, and a step plays, clear it.
  useEffect(() => {
    if (playNoteRequest && currentStepIndex !== null) {
      // A step has played (either sequencer or MIDI triggered if it also highlights step)
      // This is an assumption that currentStepIndex change means played.
      // A more direct way would be preferred if available.
      // setPlayNoteRequest(null);
    }
  }, [currentStepIndex, playNoteRequest])


  // Update steps array when stepCount changes
  useEffect(() => {
    setSteps((prevSteps) => {
      const newSteps = Array(stepCount).fill(false);
      // Preserve the previous steps state if it's smaller than the new step count
      for (let i = 0; i < Math.min(prevSteps.length, stepCount); i++) {
        newSteps[i] = prevSteps[i];
      }
      return newSteps;
    });
  }, [stepCount]);

  const toggleStep = (index) => {
    setSteps((prevSteps) =>
      prevSteps.map((step, i) => (i === index ? !step : step))
    );
  };

  const playSample = () => {
    if (!sample || !sample.path) {
      setSampleError("No sample to play or path is invalid.");
      return;
    }
    setSampleError(null); // Clear previous error
    const audio = new Audio(sample.path);
    audio.play().catch(err => {
      setSampleError(`Preview failed: ${sample.name}`);
      console.error("Error playing preview:", err);
    });
  };

  return (
    <div className="trackWrapper nes-container with-title is-left">
      <p className="title">{sectionName}</p> {/* Display section name as the track title */}
      <div className="track">
        <div className="samples">
          {/* Display sample name from the JSON and potential error */}
          <div className="sample-display">
            <button 
              className={`nes-btn sampleName ${sampleError ? 'is-error' : ''}`} 
              onClick={playSample}
              title={sampleError || sample.name} // Show error in title on hover
            >
              {sample.name}
            </button>
            {sampleError && <p className="nes-text is-error sample-error-text">{sampleError}</p>}
          </div>
          {/* Folder button to open the modal */}
          <button className="nes-btn is-icon" onClick={() => setIsModalOpen(true)}>
            <img
              src="/icons/folder_24dp_000000_FILL0_wght400_GRAD0_opsz24.png"
              alt="Folder icon"
              style={{ width: "24px", height: "24px" }}
            />
          </button>

          {/* Modal for selecting samples */}
          {isModalOpen && (
            <SampleSelectionModal
              sampleFiles={allSampleFiles}  // Pass all sections and their samples
              onClose={() => setIsModalOpen(false)}
              onAssign={(newSample) => {
                setSampleError(null); // Clear any previous error on new assignment
                setSample(newSample);  // Update the sample with the selected one
                setIsModalOpen(false);  // Close the modal after selecting
              }}
            />
          )}
        </div>

        {/* Rotary Knobs for Volume and Pitch */}
        <div className="knobs">
          <div className="knob-wrapper">
            <SimpleKnob
              label="V"
              min={-30}
              max={0}
              value={propVolume} // Use propVolume for display
              setValue={(newVolume) => {
                if (onVolumeChange) {
                  onVolumeChange(newVolume); // Call parent handler
                }
              }}
              size={70}
            />
          </div>

          <div className="knob-wrapper">
            <SimpleKnob
              label="P"
              min={-12}
              max={12}
              value={pitch} // Pitch remains internal
              setValue={setPitch}
              size={70}
            />
          </div>
        </div>

        {/* SequencerSteps Component */}
        <SequencerSteps
          steps={steps}
          toggleStep={toggleStep}
          currentStepIndex={currentStepIndex}
        />

        {/* Reactronica Track */}
        <ReactronicaTrack
          steps={steps.map((active) => (active ? { name: "C3" } : null))}
          playNotes={playNoteRequest ? playNoteRequest.notes : null} // Use playNoteRequest here
          volume={propVolume} // Use propVolume for ReactronicaTrack
          pan={0} // Example: pan could also be controlled
          pitch={pitch} // Pass internal pitch state
          onStepPlay={(step, index) => {
            setCurrentStepIndex(index);
            if (playNoteRequest && step?.name === "C3") { // If a MIDI-triggered note (from MIDI input) just played
              setPlayNoteRequest(null); // Clear the request
            }
            // Report step play to parent for MIDI output
            if (onTrackStepPlay && step) { // only call if step is active
              onTrackStepPlay(trackId, step, index, sample ? sample.name : "Unknown Sample");
            }
          }}
          onLoad={() => {
            // This callback in reactronica's Instrument implies Tone.js has loaded the sample(s).
            // If our manual Audio check had an error, but this loads, it might mean
            // the context for reactronica/Tone.js is different or more permissive.
            // We can choose to clear our manual error here if reactronica reports success.
            // However, if sample.path itself is fundamentally broken, Tone.js will likely also fail (and log an error).
            // For now, if our manual check said it's bad, we'll keep that error unless this explicitly says it's good.
            // A more robust solution might involve deeper integration or specific error events from reactronica/Tone.js.
            console.log(`Reactronica loaded sample for track ${sectionName}: ${sample.name}`);
            // If we want to be optimistic and trust reactronica's load:
            // setSampleError(null); 
          }}
        >
          {/* Conditionally render instrument if sample path is considered valid by our initial check, 
              or let reactronica handle it and potentially log its own errors.
              If sampleError is set due to path validation, reactronica might also fail.
              If sampleError is set due to Audio API error, reactronica might still work or fail silently.
          */}
          <Instrument 
            type="sampler" 
            samples={{ C3: sample && !sampleError ? sample.path : "" }} // Avoid loading if path is known bad
            pitch={pitch} // Apply pitch to instrument directly if supported, or handle via playback options
          />
        </ReactronicaTrack>
      </div>
    </div>
  );
};

export default Track;