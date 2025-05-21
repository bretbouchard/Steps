"use client";

import React,  { useEffect, useState, useCallback } from 'react'; // Added useCallback

// Accept onNoteOn, onControlChange, onMidiOutputSelected, isPlaying, and bpm callbacks/props
const MidiControls = ({ 
  onNoteOn, 
  onControlChange, 
  onMidiOutputSelected,
  isPlaying, // Added prop for MIDI clock
  bpm,       // Added prop for MIDI clock
}) => {
  const [midiAccess, setMidiAccess] = useState(null);
  const [midiError, setMidiError] = useState(null);
  const [midiInputs, setMidiInputs] = useState([]);
  const [midiOutputs, setMidiOutputs] = useState([]); // For storing output devices
  const [selectedMidiOutputId, setSelectedMidiOutputId] = useState(''); // ID of the selected output
  const [selectedMidiOutputDevice, setSelectedMidiOutputDevice] = useState(null); // Store the actual device object

  // MIDI Clock state
  const [midiClockIntervalId, setMidiClockIntervalId] = useState(null);

  // Program Change state
  const [programChangeValue, setProgramChangeValue] = useState(0);
  const [programChangeStatus, setProgramChangeStatus] = useState('');

  // Sysex state
  const [sysexInput, setSysexInput] = useState('F0 41 10 00 00 7F F7'); // Example Sysex
  const [sysexSendStatus, setSysexSendStatus] = useState('');
  const [receivedSysexMessages, setReceivedSysexMessages] = useState([]);
  const [sysexEnabled, setSysexEnabled] = useState(false);


  // Wrapped handleMidiMessage in useCallback to stabilize its reference for useEffect
  const handleMidiMessage = useCallback((message) => {
    const data = message.data; // Uint8Array

    // Check for Sysex message (starts with 0xF0)
    if (data && data.length > 0 && data[0] === 0xF0) {
      const sysexArray = Array.from(data); 
      const hexString = sysexArray.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      console.log('Received Sysex Message:', hexString);
      setReceivedSysexMessages(prev => [{ data: hexString, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 2)]); // Keep last 3
      return; 
    }

    // Standard MIDI message parsing (non-Sysex)
    const command = data[0] >> 4; 
    const channel = (data[0] & 0x0f) + 1; 
    let note, velocity, controllerNumber, controllerValue;

    switch (command) {
      case 9: // Note On
        note = data[1];
        velocity = data[2];
        if (velocity > 0) {
          if (onNoteOn) onNoteOn(note, velocity, channel);
        } else {
          // Note On with velocity 0 is often treated as Note Off
        }
        break;
      case 8: // Note Off
        note = data[1];
        velocity = data[2]; 
        break;
      case 11: // Control Change (CC)
        controllerNumber = data[1];
        controllerValue = data[2];
        if (onControlChange) onControlChange(controllerNumber, controllerValue, channel);
        break;
      default:
        break;
    }
  }, [onNoteOn, onControlChange]); // Dependencies for useCallback

  // Wrapped handleStateChange in useCallback
  const handleStateChange = useCallback((event) => {
    if (!midiAccess) return;
    console.log('MIDI state changed:', event.port.name, event.port.type, event.port.state);

    const currentInputs = [];
    midiAccess.inputs.forEach(input => currentInputs.push(input));
    setMidiInputs(currentInputs);
    currentInputs.forEach(input => {
      if (input.onmidimessage !== handleMidiMessage) { // Check if listener needs to be (re)set
        input.onmidimessage = handleMidiMessage;
        console.log(`(Re-)Attached MIDI message listener to input: ${input.name}`);
      }
    });

    const currentOutputs = [];
    midiAccess.outputs.forEach(output => currentOutputs.push(output));
    setMidiOutputs(currentOutputs);

    if (selectedMidiOutputId && !currentOutputs.find(o => o.id === selectedMidiOutputId)) {
      console.log(`Selected MIDI output disconnected: ${selectedMidiOutputId}`);
      setSelectedMidiOutputId('');
      setSelectedMidiOutputDevice(null); // Clear the device object
      if (onMidiOutputSelected) {
        onMidiOutputSelected(null);
      }
    }
    
    let currentError = null;
    if (currentInputs.length === 0 && currentOutputs.length === 0) {
        currentError = "No MIDI input or output devices found.";
    } else if (currentInputs.length === 0) {
        currentError = "No MIDI input devices found.";
    } else if (currentOutputs.length === 0) {
        currentError = "No MIDI output devices found.";
    }
    
    if (currentError || (midiError && (midiError.includes("No MIDI input devices found") || midiError.includes("No MIDI output devices found")))) {
         setMidiError(currentError);
    } else if (!currentError && midiError) { // If devices are found now, clear old error
         setMidiError(null);
    }

  }, [midiAccess, selectedMidiOutputId, onMidiOutputSelected, handleMidiMessage, midiError]); // Added handleMidiMessage and midiError


  useEffect(() => {
    const initializeMidi = async () => {
      if (navigator.requestMIDIAccess) {
        try {
          const access = await navigator.requestMIDIAccess({ sysex: true }); 
          console.log("MIDI Access Granted (Sysex requested).");
          setMidiAccess(access);
          setSysexEnabled(true); 
          setMidiError(null); // Clear any previous errors

          // Initial population of devices
          handleStateChange({port: {name: "Initial Scan", type: "scan", state: "connected"}}); // Simulate a state change to populate

          access.onstatechange = handleStateChange;

        } catch (error) {
          console.error("MIDI Access Denied/Error:", error);
          if (error.name === "SecurityError" || error.name === "InvalidAccessError") {
            setMidiError(`Sysex permission denied or feature not supported: ${error.message}`);
          } else {
            setMidiError(`Failed to get MIDI access: ${error.message}.`);
          }
          setMidiAccess(null);
          setSysexEnabled(false);
        }
      } else {
        console.warn("Web MIDI API not supported in this browser.");
        setMidiError("Web MIDI API is not supported in this browser.");
        setSysexEnabled(false);
      }
    };

    initializeMidi();

    return () => {
      if (midiAccess) {
        midiAccess.inputs.forEach(input => { input.onmidimessage = null; });
        if (midiAccess.onstatechange) midiAccess.onstatechange = null; // Check if it was set
        console.log("Cleaned up MIDI listeners.");
      }
      if (midiClockIntervalId) { // Ensure clock is cleared on unmount
        clearInterval(midiClockIntervalId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, []); // Run once on mount; handleStateChange and handleMidiMessage are stable due to useCallback

  
  // Handle selection of MIDI output
  const handleOutputSelect = (event) => {
    const newOutputId = event.target.value;
    setSelectedMidiOutputId(newOutputId);
    const device = midiOutputs.find(o => o.id === newOutputId) || null;
    setSelectedMidiOutputDevice(device); 
    if (onMidiOutputSelected) {
      onMidiOutputSelected(device);
      console.log("Selected MIDI Output:", device ? device.name : 'None');
    }
  };

  // Effect for MIDI Clock
  useEffect(() => {
    // Clear previous interval if it exists
    if (midiClockIntervalId) {
      clearInterval(midiClockIntervalId);
      setMidiClockIntervalId(null);
    }

    if (isPlaying && selectedMidiOutputDevice && bpm > 0) {
      const intervalMilliseconds = (60 * 1000) / (bpm * 24); 
      const newIntervalId = setInterval(() => {
        selectedMidiOutputDevice.send([0xF8]); 
      }, intervalMilliseconds);
      setMidiClockIntervalId(newIntervalId);
    }
    // Cleanup function for this effect
    return () => {
      if (midiClockIntervalId) { // Use the current value from state for cleanup
        clearInterval(midiClockIntervalId);
      }
    };
  }, [isPlaying, bpm, selectedMidiOutputDevice, midiClockIntervalId]); // Added midiClockIntervalId to deps for cleanup


  const handleSendProgramChange = () => {
    if (!selectedMidiOutputDevice) {
      setProgramChangeStatus("Error: No MIDI output selected.");
      return;
    }
    const pcValue = parseInt(programChangeValue, 10);
    if (isNaN(pcValue) || pcValue < 0 || pcValue > 127) {
      setProgramChangeStatus("Error: Program Change value must be 0-127.");
      return;
    }

    const channel = 0; 
    const programChangeMessage = [0xC0 + channel, pcValue];
    
    try {
      selectedMidiOutputDevice.send(programChangeMessage);
      const statusMsg = `Sent Program Change ${pcValue} on Ch ${channel + 1} to ${selectedMidiOutputDevice.name}`;
      console.log(statusMsg);
      setProgramChangeStatus(statusMsg);
      setTimeout(() => setProgramChangeStatus(''), 3000); 
    } catch (error) {
      console.error("Error sending Program Change:", error);
      setProgramChangeStatus(`Error: ${error.message}`);
    }
  };

  const handleSendSysex = () => {
    if (!selectedMidiOutputDevice) {
      setSysexSendStatus("Error: No MIDI output selected.");
      return;
    }
    if (!sysexEnabled) {
      setSysexSendStatus("Error: Sysex permission not granted or not supported by the browser/device.");
      console.warn("Attempted to send Sysex, but sysexEnabled is false.");
      return;
    }

    const hexBytes = sysexInput.trim().split(/\s+/);
    let byteArray;
    try {
        byteArray = hexBytes.map(hex => {
            const byte = parseInt(hex, 16);
            if (isNaN(byte) || byte < 0 || byte > 0xFF) { 
                throw new Error("Invalid hex byte: " + hex);
            }
            return byte;
        });
    } catch (error) {
        setSysexSendStatus(`Error: Invalid Sysex hex string. ${error.message}`);
        return;
    }
    
    if (byteArray.length === 0 || byteArray[0] !== 0xF0 || byteArray[byteArray.length - 1] !== 0xF7) {
      setSysexSendStatus("Error: Sysex message must start with F0, end with F7, and contain valid hex bytes.");
      return;
    }

    try {
      selectedMidiOutputDevice.send(byteArray);
      const statusMsg = `Sent Sysex: ${sysexInput} to ${selectedMidiOutputDevice.name}`;
      console.log(statusMsg);
      setSysexSendStatus(statusMsg);
      setTimeout(() => setSysexSendStatus(''), 3000); 
    } catch (error) {
      console.error("Error sending Sysex:", error);
      setSysexSendStatus(`Error sending Sysex: ${error.message}. Make sure Sysex is enabled by the browser.`);
    }
  };

  return (
    <div className="midi-controls-container nes-container with-title">
      <p className="title">MIDI I/O Controls</p>
      {midiError && (
        <div className="nes-container is-error">
          <p>{midiError}</p>
        </div>
      )}
      
      {!midiError && midiAccess && midiInputs.length === 0 && !midiError?.includes("input") && (
        <div className="nes-container is-warning">
          <p>MIDI Access granted, but no input devices found. Connect a device to use MIDI input.</p>
        </div>
      )}
      {!midiError && midiInputs.length > 0 && (
        <div className="nes-container is-success midi-input-status">
          <p>Listening for MIDI input on:</p>
          <ul>
            {midiInputs.map(input => (
              <li key={input.id}>{input.name} (State: {input.state})</li>
            ))}
          </ul>
        </div>
      )}

      {midiAccess && (
        <div className="nes-container is-dark with-title midi-output-controls">
            <p className="title">MIDI Output</p>
            <div className="nes-field midi-output-selector">
              <label htmlFor="midiOutputSelect">Select Output Device:</label>
              <div className="nes-select">
                <select id="midiOutputSelect" value={selectedMidiOutputId} onChange={handleOutputSelect}>
                  <option value="">-- Select MIDI Output --</option>
                  {midiOutputs.map(output => (
                    <option key={output.id} value={output.id}>
                      {output.name} (State: {output.state})
                    </option>
                  ))}
                </select>
              </div>
              {midiOutputs.length === 0 && !midiError?.includes("output") && <p className="nes-text is-disabled">No MIDI output devices found.</p>}
            </div>

            <div className="nes-field program-change-sender" style={{ marginTop: '1rem' }}>
              <label htmlFor="programChangeInput">Program Change (0-127) Ch 1:</label>
              <input 
                type="number" 
                id="programChangeInput" 
                className="nes-input"
                value={programChangeValue}
                onChange={(e) => setProgramChangeValue(e.target.value)}
                min="0"
                max="127"
              />
              <button 
                type="button" 
                className="nes-btn is-primary" 
                onClick={handleSendProgramChange}
                disabled={!selectedMidiOutputDevice}
                style={{ marginLeft: '1rem' }}
              >
                Send PC
              </button>
              {programChangeStatus && <p style={{ marginTop: '0.5rem' }} className="nes-text is-small">{programChangeStatus}</p>}
            </div>

            <div className="nes-field sysex-sender" style={{ marginTop: '1rem' }}>
              <label htmlFor="sysexInput">Sysex (hex, e.g., F0 ... F7):</label>
              <textarea 
                id="sysexInput" 
                className="nes-textarea"
                value={sysexInput}
                onChange={(e) => setSysexInput(e.target.value)}
                rows="2"
                placeholder="F0 41 10 00 00 7F F7"
              />
              <button 
                type="button" 
                className="nes-btn is-warning" 
                onClick={handleSendSysex}
                disabled={!selectedMidiOutputDevice || !sysexEnabled}
                style={{ marginTop: '0.5rem' }}
              >
                Send Sysex
              </button>
              {!sysexEnabled && midiAccess && <p className="nes-text is-disabled is-small" style={{marginTop: '0.5rem'}}>Sysex permission not explicitly enabled or granted by the browser.</p>}
              {sysexSendStatus && <p style={{ marginTop: '0.5rem' }} className="nes-text is-small">{sysexSendStatus}</p>}
            </div>
        </div>
      )}

      {midiAccess && sysexEnabled && (
        <div className="nes-container is-dark with-title received-sysex-display" style={{marginTop: '1rem'}}>
            <p className="title">Received Sysex (Last 3)</p>
            {receivedSysexMessages.length === 0 && <p className="nes-text is-disabled is-small">No Sysex messages received recently.</p>}
            <ul className="nes-list is-disc">
                {receivedSysexMessages.map((msg, index) => (
                    <li key={index}>
                        <strong>{msg.time}:</strong> {msg.data}
                    </li>
                ))}
            </ul>
        </div>
      )}
    </div>
  );
};

export default MidiControls;
