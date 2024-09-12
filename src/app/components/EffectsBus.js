import React from 'react';
import Knob from './Knob'; // Assuming you have a Knob component

const EffectsBus = ({ reverb, setReverb, delay, setDelay }) => {
  return (
    <div className="effects-bus">
      <h3>Effects Bus</h3>
      <Knob label="Reverb" value={reverb} onChange={setReverb} />
      <Knob label="Delay" value={delay} onChange={setDelay} />
    </div>
  );
};

export default EffectsBus;