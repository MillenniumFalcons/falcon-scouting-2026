// TimerButton.jsx
import { useRef, useEffect, useState } from 'react';

export default function TimerButton({ label, value, onUpdate, registerTimerFn }) {
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const isRunningRef = useRef(false);

  // Local state for UI responsiveness
  const [displayValue, setDisplayValue] = useState(value);

  // Sync display value if parent value changes externally
  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const startTimer = () => {
    if (isRunningRef.current) return;
    
    isRunningRef.current = true;
    startTimeRef.current = Date.now();
    
    intervalRef.current = setInterval(() => {
      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
      // Update local display only, NOT parent state every 100ms
      setDisplayValue(parseFloat(elapsedSeconds.toFixed(1)));
    }, 100);
  };

  const stopTimer = () => {
    if (!isRunningRef.current) return;
    
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    isRunningRef.current = false;
    
    // Update parent state with final value when done
    onUpdate(parseFloat(displayValue.toFixed(1)));
  };

  useEffect(() => {
    if (registerTimerFn) {
      registerTimerFn({ start: startTimer, stop: stopTimer });
    }
    // Cleanup interval on unmount
    return () => {
        if(intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [registerTimerFn]);

  return (
    <div 
      onMouseDown={startTimer} 
      onMouseUp={stopTimer}
      onMouseLeave={stopTimer}
      onTouchStart={startTimer}
      onTouchEnd={stopTimer}
      className="w-full h-full flex flex-col items-center justify-center select-none"
    >
      <span className="block-label" style={{fontSize: '0.9rem', color: 'white'}}>{label}</span>
      <span className="text-3xl font-mono text-white">{displayValue.toFixed(1)}s</span>
    </div>
  );
}