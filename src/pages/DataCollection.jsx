// DataCollection.jsx
import { useState, useEffect, useRef } from 'react';
import TimerButton from '../components/TimerButton'; 
import '../index.css';

const INITIAL_FORM_DATA = {
  matchNum: '', alliance: 'Red', scouterName: '', robotPos: '1', teamNum: '',
  autoPreload: false, autoHopper: 0, autoClimb: false,
  intakeOutpost: false, intakeDepot: false, intakeNeutral: false,
  autoShootTime: 0, teleHopper: 0, teleShootTime: 0,
  climbLevel: 'None', feedHopper: 0, defenseTime: 0, oofTime: 0,
  accuracy: 100, notes: '', robotRole: 'Flex', driverRating: 5, climbSpeed: 0
};

// --- MOVE EditItem OUTSIDE TO FIX INPUT DESELECTING ---
const EditItem = ({ label, field, formData, updateField, type = "text", options = null, slider = null }) => (
  <div className="edit-box">
    <label>{label}</label>
    {options ? (
      <select value={formData[field]} onChange={e => updateField(field, e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : slider ? (
      <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
        <input type="range" min={slider.min} max={slider.max} step={slider.step || 1} value={formData[field]} onChange={e => updateField(field, Number(e.target.value))} />
        <span style={{fontWeight: 'bold', width: '30px', textAlign: 'center'}}>{formData[field]}</span>
      </div>
    ) : (
      <input type={type} value={formData[field]} onChange={e => 
        updateField(field, type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value)
      } />
    )}
  </div>
);

export default function DataCollection() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const timerRefs = useRef({}); 

  const updateField = (field, valueOrFn) => {
    setFormData(prev => {
      const newValue = typeof valueOrFn === 'function' ? valueOrFn(prev[field]) : valueOrFn;
      return { ...prev, [field]: newValue };
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const key = e.key.toLowerCase();
      
      const timerKeyMap = {
        't': step === 2 ? 'autoShoot' : 'teleShoot',
        'x': 'oofTime',
        'd': 'defenseTime'
      };

      if (timerKeyMap[key] && timerRefs.current[timerKeyMap[key]]) {
        timerRefs.current[timerKeyMap[key]].start();
      }

      if (step === 2) {
        if (key === 'c') updateField('autoClimb', !formData.autoClimb);
        if (key === 'n') updateField('intakeNeutral', !formData.intakeNeutral);
        if (key === 'd') updateField('intakeDepot', !formData.intakeDepot);
        if (key === 'o') updateField('intakeOutpost', !formData.intakeOutpost);
        if (key === 's') updateField('autoHopper', prev => prev + 1);
        if (key === 'p') updateField('autoPreload', !formData.autoPreload);
      }
      
      if (step === 3) {
        if (key === 'f') updateField('feedHopper', prev => prev + 1);
        if (key === 's') updateField('teleHopper', prev => prev + 1);
        if (key === 'c') {
          const levels = ['None', 'L1', 'L2', 'L3'];
          const nextIdx = (levels.indexOf(formData.climbLevel) + 1) % levels.length;
          updateField('climbLevel', levels[nextIdx]);
        }
      }
    };

    const handleKeyUp = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        const key = e.key.toLowerCase();
        const timerKeyMap = { 
            't': step === 2 ? 'autoShoot' : 'teleShoot', 
            'x': 'oofTime', 
            'd': 'defenseTime' 
        };

        if (timerKeyMap[key] && timerRefs.current[timerKeyMap[key]]) {
            timerRefs.current[timerKeyMap[key]].stop();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    }
  }, [step, formData]); 

  const handleSubmit = async () => {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyOdqsqqrj8SLK9sU15BZbAhdFMdOHOSqVD48ufRYKSuiD4GaGBnnVLwDZiJuMR2C2A/exec";
    try {
      await fetch(SCRIPT_URL, {
        method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({...formData, formType: 'match'}),
      });
      alert("Submitted!");
      setFormData(INITIAL_FORM_DATA);
      setStep(1);
    } catch (error) { alert("Submission failed."); }
  };

  return (
    <div className="scouting-container">
      <div className="form-content">
        {step === 1 && <Page1 formData={formData} updateField={updateField} />}
        {step === 2 && <Page2 formData={formData} updateField={updateField} timerRefs={timerRefs} />}
        {step === 3 && <Page3 formData={formData} updateField={updateField} timerRefs={timerRefs} />}
        {step === 4 && <Page4 formData={formData} updateField={updateField} />}
      </div>
      <div className="form-nav">
        {step > 1 && <button onClick={() => setStep(step - 1)} className="btn-nav btn-grey">Back</button>}
        {step < 4 ? (
          <button onClick={() => setStep(step + 1)} className="btn-nav btn-red" style={{marginLeft: 'auto'}}>Next</button>
        ) : (
          <button className="btn-nav btn-submit" style={{marginLeft: 'auto'}} onClick={handleSubmit}>Submit</button>
        )}
      </div>
    </div>
  );
}

function Page1({ formData, updateField }) {
  return (
    <div className="stack">
      <h1 className="huge-title" style={{textAlign: 'left', color: 'white'}}>
        FALCON <span style={{color: '#8b0000'}}>Scouting</span>
      </h1>
      <input type="text" placeholder="Scout Name" className="flat-input" value={formData.scouterName} onChange={(e) => updateField('scouterName', e.target.value)} />
      <input type="text" placeholder="Team Number" className="flat-input" value={formData.teamNum} onChange={(e) => updateField('teamNum', e.target.value)} />
      <input type="text" placeholder="Match Number" className="flat-input" value={formData.matchNum} onChange={(e) => updateField('matchNum', e.target.value)} />
      <div style={{display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px'}}>
        <label style={{fontWeight: 900, color: '#8b0000'}}>Team Color</label>
        <button onClick={() => updateField('alliance', formData.alliance === 'Red' ? 'Blue' : 'Red')} style={{background: formData.alliance === 'Red' ? '#8b0000' : '#004488', width: '60px', height: '30px', borderRadius: '15px', border: 'none'}} />
      </div>
      <div className="heavy-grid-3">
        {['1', '2', '3'].map(num => (
          <div key={num} className={`big-block ${formData.robotPos === num ? 'active' : ''}`} onClick={() => updateField('robotPos', num)}>
            {num === '1' ? 'ONE' : num === '2' ? 'TWO' : 'THREE'}
          </div>
        ))}
      </div>
    </div>
  );
}

function Page2({ formData, updateField, timerRefs }) {
  return (
    <div>
      <h1 className="huge-title"><span>AU</span>TO</h1>
      <div className="heavy-grid">
        <div className={`big-block ${formData.autoClimb ? 'active' : ''}`} onClick={() => updateField('autoClimb', !formData.autoClimb)}>
          <span className="block-label">CLIMBED</span>
          <span className="start-label">C</span>
          <span className="corner-label">{formData.autoClimb ? "TRUE" : "FALSE"}</span>
        </div>
        <div className="heavy-list">
          {[
            {label: 'NEUTRAL', field: 'intakeNeutral', key: 'N'},
            {label: 'DEPOT', field: 'intakeDepot', key: 'D'},
            {label: 'OUTPOST', field: 'intakeOutpost', key: 'O'}
          ].map(item => (
            <div key={item.field} className={`list-row ${formData[item.field] ? 'active' : ''}`} onClick={() => updateField(item.field, !formData[item.field])}>
              <span className="start-label-inline" style={{color: '#888', marginRight: '10px'}}>{item.key}</span>
              <span>{item.label}</span>
              <span className="val-large">{formData[item.field] ? "1" : "0"}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="heavy-grid-equal">
        <div className="heavy-grid-equal" style={{margin: 0}}>
           <div className="big-block" onClick={() => updateField('autoHopper', prev => prev + 1)}>
             <span className="block-label" style={{fontSize: '1rem'}}>SCORE</span>
             <span className="start-label">S</span>
             <span className="corner-label">{formData.autoHopper}</span>
           </div>
           <div className={`big-block ${formData.autoPreload ? 'active' : ''}`} onClick={() => updateField('autoPreload', !formData.autoPreload)}>
             <span className="block-label" style={{fontSize: '1rem'}}>PRELOAD</span>
             <span className="start-label">P</span>
             <span className="corner-label">{formData.autoPreload ? "1" : "0"}</span>
           </div>
        </div>
        <div className="big-block timer-container">
          <div className="timer-wrapper">
            <TimerButton 
              label="SHOOT TIME" 
              value={formData.autoShootTime} 
              // --- ADDITIVE FIX ---
              onUpdate={(newDuration) => updateField('autoShootTime', prev => prev + newDuration)} 
              registerTimerFn={(fns) => timerRefs.current['autoShoot'] = fns} 
            />
            <span className="start-label">T</span>
            <span className="corner-label">{formData.autoShootTime.toFixed(1)}s</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Page3({ formData, updateField, timerRefs }) {
  return (
    <div>
      <h1 className="huge-title"><span>TELE</span>OP</h1>
      
      <div className="teleop-grid">
        <div className="teleop-left">
            <div className="big-block timer-container">
                <div className="timer-wrapper">
                <TimerButton 
                    label="SHOOT TIME" 
                    value={formData.teleShootTime} 
                    // --- ADDITIVE FIX ---
                    onUpdate={(newDuration) => updateField('teleShootTime', prev => prev + newDuration)} 
                    registerTimerFn={(fns) => timerRefs.current['teleShoot'] = fns} 
                />
                <span className="start-label">T</span>
                <span className="corner-label">{formData.teleShootTime.toFixed(1)}s</span>
                </div>
            </div>
            
            <div className="teleop-sub-grid">
                <div className="big-block timer-container">
                    <div className="timer-wrapper">
                    <TimerButton 
                        label="OOF TIME" 
                        value={formData.oofTime} 
                        // --- ADDITIVE FIX ---
                        onUpdate={(newDuration) => updateField('oofTime', prev => prev + newDuration)} 
                        registerTimerFn={(fns) => timerRefs.current['oofTime'] = fns} 
                    />
                    <span className="start-label">X</span>
                    <span className="corner-label">{formData.oofTime.toFixed(1)}s</span>
                    </div>
                </div>
                <div className="big-block timer-container">
                    <div className="timer-wrapper">
                    <TimerButton 
                        label="DEF TIME" 
                        value={formData.defenseTime} 
                        // --- ADDITIVE FIX ---
                        onUpdate={(newDuration) => updateField('defenseTime', prev => prev + newDuration)} 
                        registerTimerFn={(fns) => timerRefs.current['defenseTime'] = fns} 
                    />
                    <span className="start-label">D</span>
                    <span className="corner-label">{formData.defenseTime.toFixed(1)}s</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="teleop-right">
            <div className="big-block" onClick={() => updateField('feedHopper', prev => prev + 1)}>
                <span className="block-label" style={{fontSize: '0.9rem'}}>FEED</span>
                <span className="start-label">F</span>
                <span className="corner-label">{formData.feedHopper}</span>
            </div>
            <div className="big-block" onClick={() => updateField('teleHopper', prev => prev + 1)}>
                <span className="block-label" style={{fontSize: '0.9rem'}}>SCORE</span>
                <span className="start-label">S</span>
                <span className="corner-label">{formData.teleHopper}</span>
            </div>
            
            <div className={`big-block ${formData.climbLevel !== 'None' ? 'active' : ''}`} onClick={() => {
                const levels = ['None', 'L1', 'L2', 'L3'];
                const nextIdx = (levels.indexOf(formData.climbLevel) + 1) % levels.length;
                updateField('climbLevel', levels[nextIdx]);
            }}>
                <span className="block-label">CLIMB</span>
                <span className="start-label">C</span>
                <span className="corner-label">{formData.climbLevel}</span>
            </div>
        </div>
      </div>
    </div>
  );
}

function Page4({ formData, updateField }) {
  return (
    <div className="stack" style={{ paddingBottom: '40px' }}>
      <h1 className="huge-title" style={{color: 'white'}}>EDITS</h1>
      <p style={{textAlign: 'center', color: '#8b0000', fontWeight: 'bold', marginTop: '-20px'}}>Full Recap</p>
      
      <div className="edit-grid">
        <EditItem label="Alliance" field="alliance" formData={formData} updateField={updateField} options={['Red', 'Blue']} />
        <EditItem label="Robot Position" field="robotPos" formData={formData} updateField={updateField} options={['1', '2', '3']} />
        <EditItem label="Robot Role" field="robotRole" formData={formData} updateField={updateField} options={['Flex', 'Cleanup', 'Feeder', 'Defense']} />
        <EditItem label="Climb Level" field="climbLevel" formData={formData} updateField={updateField} options={['None', 'L1', 'L2', 'L3']} />
        
        {['autoClimb', 'autoPreload', 'intakeNeutral', 'intakeDepot', 'intakeOutpost'].map(field => (
            <EditItem key={field} label={field} field={field} formData={formData} updateField={updateField} options={['true', 'false']} />
        ))}

        <EditItem label="Accuracy (0-100)" field="accuracy" formData={formData} updateField={updateField} slider={{min: 0, max: 100}} />
        <EditItem label="Driver Rating (0-10)" field="driverRating" formData={formData} updateField={updateField} slider={{min: 0, max: 10}} />
        
        {['scouterName', 'teamNum', 'matchNum', 'autoShootTime', 'teleHopper', 'feedHopper', 'teleShootTime', 'defenseTime', 'oofTime', 'climbSpeed'].map(field => (
          <EditItem key={field} label={field} field={field} formData={formData} updateField={updateField} type={field.includes('Time') || field.includes('Hopper') || field.includes('Speed') ? "number" : "text"} />
        ))}
      </div>
      
      <div className="edit-box" style={{ marginTop: '10px' }}>
        <label>Notes</label>
        <textarea className="flat-input" style={{ height: '60px' }} value={formData.notes} onChange={e => updateField('notes', e.target.value)} />
      </div>
    </div>
  );
}