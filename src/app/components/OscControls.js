"use client";

import React, { useEffect, useState, useCallback } from 'react';
import OSC from 'osc-js';

// Add onOscCommand and onOscPortReady props
const OscControls = ({ onOscCommand, onOscPortReady }) => { 
  // State for WebSocket client (for both sending and receiving via a bridge)
  const [oscPort, setOscPort] = useState(null);
  const [wsServerUrl, setWsServerUrl] = useState('ws://localhost:8080'); // Default WebSocket bridge URL
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [receivedMessages, setReceivedMessages] = useState([]);

  // State for sending messages
  const [oscSendAddress, setOscSendAddress] = useState('/test/browser');
  const [oscSendArgument, setOscSendArgument] = useState('Hello from browser via WebSocket!');
  const [oscSendStatus, setOscSendStatus] = useState('');

  const connectWebSocket = useCallback(() => {
    if (oscPort) {
      console.log("Closing existing OSC WebSocket port...");
      oscPort.close();
    }

    console.log(`Attempting to connect to WebSocket bridge at: ${wsServerUrl}`);
    setConnectionStatus('Connecting...');
    
    const newOscPort = new OSC.WebSocketPort({
      url: wsServerUrl,
      metadata: true // To get type tags
    });

    newOscPort.on('open', () => {
      setConnectionStatus('Connected to WebSocket Bridge');
      console.log('OSC WebSocketPort opened.');
      setOscSendStatus(''); // Clear previous send status
      if (onOscPortReady) {
        // Pass the send function and status to the parent
        onOscPortReady(newOscPort.send.bind(newOscPort), 'connected');
      }
    });

    newOscPort.on('message', (oscMessage) => {
      console.log('OSC Message Received:', oscMessage);
      setReceivedMessages(prevMessages => [
        { ...oscMessage, time: new Date().toLocaleTimeString() },
        ...prevMessages.slice(0, 4) // Keep last 5 messages
      ]);

      // Parse and handle specific OSC commands
      if (onOscCommand) {
        const { address, args } = oscMessage;
        // Track trigger: /track/{trackIndex}/trigger
        const triggerMatch = address.match(/^\/track\/(\d+)\/trigger$/);
        if (triggerMatch) {
          const trackIndex = parseInt(triggerMatch[1], 10);
          onOscCommand('triggerTrack', { trackIndex });
          return; // Message handled
        }

        // Track volume: /track/{trackIndex}/volume (float arg 0.0-1.0)
        const volumeMatch = address.match(/^\/track\/(\d+)\/volume$/);
        if (volumeMatch && args && args.length > 0 && (typeof args[0] === 'number' || args[0].type === 'f')) {
          const trackIndex = parseInt(volumeMatch[1], 10);
          const volumeValue = typeof args[0] === 'number' ? args[0] : args[0].value;
          if (volumeValue >= 0.0 && volumeValue <= 1.0) {
            onOscCommand('setTrackVolume', { trackIndex, volume: volumeValue });
          } else {
            console.warn(`OSC: Received /track/${trackIndex}/volume with out-of-range value: ${volumeValue}`);
          }
          return; // Message handled
        }
        
        // Sequencer play: /sequencer/play
        if (address === '/sequencer/play') {
          onOscCommand('playSequencer');
          return; // Message handled
        }

        // Sequencer stop: /sequencer/stop
        if (address === '/sequencer/stop') {
          onOscCommand('stopSequencer');
          return; // Message handled
        }

        // Sequencer BPM: /sequencer/bpm (float arg)
        if (address === '/sequencer/bpm' && args && args.length > 0 && (typeof args[0] === 'number' || args[0].type === 'f')) {
          const bpmValue = typeof args[0] === 'number' ? args[0] : args[0].value;
          if (bpmValue > 0) { // Basic validation for BPM
            onOscCommand('setBpm', { bpm: bpmValue });
          } else {
            console.warn(`OSC: Received /sequencer/bpm with invalid value: ${bpmValue}`);
          }
          return; // Message handled
        }
      }
    });

    newOscPort.on('error', (error) => {
      setConnectionStatus(`Error: ${error.message}`);
      console.error('OSC WebSocketPort Error:', error);
      if (onOscPortReady) {
        onOscPortReady(null, 'error');
      }
    });

    newOscPort.on('close', () => {
      setConnectionStatus('Disconnected');
      console.log('OSC WebSocketPort closed.');
      if (onOscPortReady) {
        onOscPortReady(null, 'disconnected');
      }
      // Optionally try to reconnect or require manual reconnect
    });

    try {
      newOscPort.open();
      setOscPort(newOscPort);
    } catch (err) {
        console.error("Error opening OSC WebSocketPort: ", err);
        setConnectionStatus(`Failed to open: ${err.message}`);
        setOscPort(null);
    }

  }, [wsServerUrl, oscPort]); // oscPort is included to manage existing connections

  const disconnectWebSocket = () => {
    if (oscPort) {
      oscPort.close(); // This will trigger the 'close' event listener
      setOscPort(null); // Ensure it's cleared so connect can re-init
      // setConnectionStatus('Disconnected'); // Already handled by 'close' listener
      console.log("Manually disconnected from WebSocket bridge.");
    }
  };
  
  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (oscPort) {
        console.log("Cleaning up OSC WebSocket port on component unmount.");
        // oscPort.close(); // This would trigger onOscPortReady(null, 'disconnected')
        // If we want to inform parent about unmount-triggered close:
        if (onOscPortReady && oscPort.socket && oscPort.socket.readyState === WebSocket.OPEN) {
             // onOscPortReady(null, 'disconnected'); // Already handled by 'close' listener if .close() is called
        }
        oscPort.close(); // Ensure it's closed
      }
    };
  }, [oscPort, onOscPortReady]); // Added onOscPortReady to dependencies

  const handleSendMessage = () => {
    if (!oscPort || !oscPort.socket || oscPort.socket.readyState !== WebSocket.OPEN) {
      setOscSendStatus('Error: Not connected to WebSocket bridge.');
      console.error('Cannot send OSC message, not connected.');
      return;
    }

    try {
      const message = {
        address: oscSendAddress,
        args: [
          { type: 's', value: oscSendArgument } // Assuming string arg for simplicity
        ]
        // osc-js infers typeTags if not provided and args are simple
      };
      oscPort.send(message);
      setOscSendStatus(`Sent: ${oscSendAddress} ${oscSendArgument}`);
      console.log('OSC Message Sent:', message);
    } catch (error) {
      setOscSendStatus(`Error sending: ${error.message}`);
      console.error('Error sending OSC message:', error);
    }
  };

  return (
    <div className="osc-controls-container nes-container with-title">
      <p className="title">OSC Controls (via WebSocket Bridge)</p>
      
      <div className="nes-container is-dark with-title">
        <p className="title">Connection</p>
        <p className="nes-text is-disabled">
          Connects to an external OSC-to-WebSocket bridge (e.g., <a href="https://github.com/colinbdclark/node-osc-web" target="_blank" rel="noopener noreferrer">node-osc-web</a> running locally).
        </p>
        <div className="nes-field">
          <label htmlFor="wsServerUrl">WebSocket Bridge URL:</label>
          <input 
            type="text" 
            id="wsServerUrl" 
            className="nes-input" 
            value={wsServerUrl} 
            onChange={(e) => setWsServerUrl(e.target.value)}
            disabled={connectionStatus === 'Connecting...' || connectionStatus === 'Connected to WebSocket Bridge'}
          />
        </div>
        {connectionStatus !== 'Connected to WebSocket Bridge' && connectionStatus !== 'Connecting...' && (
            <button type="button" className="nes-btn is-primary" onClick={connectWebSocket}>Connect</button>
        )}
        {(connectionStatus === 'Connected to WebSocket Bridge' || connectionStatus === 'Connecting...') && (
            <button type="button" className="nes-btn is-error" onClick={disconnectWebSocket} disabled={!oscPort}>Disconnect</button>
        )}
        <p>Status: <span className={connectionStatus.startsWith('Error') || connectionStatus === 'Disconnected' ? "nes-text is-error" : "nes-text is-success"}>{connectionStatus}</span></p>
      </div>

      <div className="nes-container is-dark with-title">
        <p className="title">Send OSC Message</p>
        <div className="nes-field">
          <label htmlFor="oscSendAddress">Address:</label>
          <input type="text" id="oscSendAddress" className="nes-input" value={oscSendAddress} onChange={(e) => setOscSendAddress(e.target.value)} />
        </div>
        <div className="nes-field">
          <label htmlFor="oscSendArgument">Argument (string):</label>
          <input type="text" id="oscSendArgument" className="nes-input" value={oscSendArgument} onChange={(e) => setOscSendArgument(e.target.value)} />
        </div>
        <button type="button" className="nes-btn is-success" onClick={handleSendMessage} disabled={!oscPort || connectionStatus !== 'Connected to WebSocket Bridge'}>Send Message</button>
        {oscSendStatus && <p>Send Status: {oscSendStatus}</p>}
      </div>

      <div className="nes-container is-dark with-title">
        <p className="title">Received OSC Messages (Last 5)</p>
        {receivedMessages.length === 0 ? (
          <p>No messages received yet.</p>
        ) : (
          <ul className="nes-list is-disc">
            {receivedMessages.map((msg, index) => (
              <li key={index}>
                <strong>{msg.time} - Address:</strong> {msg.address} <br />
                <strong>Args:</strong> {JSON.stringify(msg.args)} <br />
                (Type Tags: {msg.types || 'N/A'})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default OscControls;
