import React from 'react';
import { Knob as RotaryKnob } from 'react-rotary-knob';
import * as skins from 'react-rotary-knob-skin-pack';

const Knob = ({ label, value, setValue, min, max }) => {
  const handleChange = (newValue) => {
    setValue(Math.min(Math.max(newValue, min), max)); // Clamp value within min and max
  };

  return (
    <div className="knob-container">
      <label>{label}</label>
      <RotaryKnob
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
        skin={skins.s16}  
        unlockDistance={100}  
        style={{ width: '80px', height: '80px' }}
      />
    </div>
  );
};

export default Knob;