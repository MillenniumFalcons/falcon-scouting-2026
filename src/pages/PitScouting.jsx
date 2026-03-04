import { useState } from 'react';
import '../index.css'; 

const INITIAL_PIT_DATA = {
  teamNum: '',
  teamName: '',
  climb: 'None',
  progLanguage: '',
  driveType: 'Swerve',
  motorType: '',
  underTrench: 'No',
  overBump: 'No',
  shootDist: '',
  shootType: 'Single Static',
  indexerType: 'Gravity',
  hopperCap: '',
  visionSystem: '',
  robotImage: '',
  autoImage: ''
};

// --- FIX: Added closing brace for the function body ---
const EditItem = ({ label, field, value, updateField, type = "text", options = null }) => (
  <div className="edit-box">
    <label>{label}</label>
    {options ? (
      <select value={value} onChange={e => updateField(field, e.target.value)} className="bg-transparent text-white w-full">
        {options.map(o => <option key={o} value={o} className="text-black">{o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => updateField(field, e.target.value)} className="bg-transparent text-white w-full" />
    )}
  </div>
);
// -----------------------------------------------------

export default function PitScouting() {
  const [pitData, setPitData] = useState(INITIAL_PIT_DATA);

  const updateField = (field, value) => {
    setPitData(prev => ({ ...prev, [field]: value }));
  };

  const handleImage = (e, field) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      updateField(field, reader.result);
    };
    if (file) reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyOdqsqqrj8SLK9sU15BZbAhdFMdOHOSqVD48ufRYKSuiD4GaGBnnVLwDZiJuMR2C2A/exec"; 
    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({ ...pitData, formType: 'pit' }),
      });
      alert("Pit Data Submitted!");
      setPitData(INITIAL_PIT_DATA);
    } catch (error) {
      alert("Error submitting pit data.");
    }
  };

  return (
    <div className="scouting-container">
      <div className="form-content">
        <h1 className="huge-title">PIT <span>SCOUTING</span></h1>

        {/* General Info */}
        <div className="stack">
          {/* Changed to pit-grid */}
          <div className="pit-grid">
            <EditItem label="Team #" field="teamNum" value={pitData.teamNum} updateField={updateField} />
            <EditItem label="Team Name" field="teamName" value={pitData.teamName} updateField={updateField} />
            <EditItem label="Program Language" field="progLanguage" value={pitData.progLanguage} updateField={updateField} />
            <EditItem label="Climb" field="climb" value={pitData.climb} options={['None', 'L1', 'L2', 'L3']} updateField={updateField} />
          </div>
        </div>

        {/* Drivetrain */}
        <div className="stack mt-4">
          <h2 className="block-label" style={{color: '#aaa'}}>DRIVETRAIN</h2>
          {/* Changed to pit-grid */}
          <div className="pit-grid">
            <EditItem label="Drive Type" field="driveType" value={pitData.driveType} options={['Swerve', 'Tank', 'Mecanum', 'Other']} updateField={updateField} />
            <EditItem label="Motor Type" field="motorType" value={pitData.motorType} updateField={updateField} />
            <EditItem label="Under Trench?" field="underTrench" value={pitData.underTrench} options={['Yes', 'No']} updateField={updateField} />
            <EditItem label="Over Bump?" field="overBump" value={pitData.overBump} options={['Yes', 'No']} updateField={updateField} />
          </div>
        </div>

        {/* Mechanisms */}
        <div className="stack mt-4">
          <h2 className="block-label" style={{color: '#aaa'}}>SCORING & VISION</h2>
          {/* Changed to pit-grid */}
          <div className="pit-grid">
            <EditItem label="Shooting Distance" field="shootDist" value={pitData.shootDist} updateField={updateField} />
            <EditItem label="Shooter Type" field="shootType" value={pitData.shootType} options={['Turret', 'Single Static', 'Double', 'Triple', 'Multi Turret', 'Other']} updateField={updateField} />
            <EditItem label="Indexer Type" field="indexerType" value={pitData.indexerType} options={['Gravity', 'Hot Dog', 'Spindexer', 'Dye Rotor', 'Other']} updateField={updateField} />
            <EditItem label="Hopper Capacity" field="hopperCap" value={pitData.hopperCap} updateField={updateField} />
            <EditItem label="Vision System" field="visionSystem" value={pitData.visionSystem} updateField={updateField} />
          </div>
        </div>

        {/* Images */}
        <div className="stack mt-4">
          <h2 className="block-label" style={{color: '#aaa'}}>IMAGES</h2>
          <div className="pit-grid">
            {/* These boxes will now hold the file inputs correctly */}
            <div className="edit-box" style={{height: '180px'}}>
              <label>Robot Image</label>
              <input type="file" accept="image/*" onChange={(e) => handleImage(e, 'robotImage')} />
              {pitData.robotImage && <img src={pitData.robotImage} className="mt-2 rounded w-full h-20 object-contain bg-black" alt="Robot" />}
            </div>
            <div className="edit-box" style={{height: '180px'}}>
              <label>Auto Path</label>
              <input type="file" accept="image/*" onChange={(e) => handleImage(e, 'autoImage')} />
              {pitData.autoImage && <img src={pitData.autoImage} className="mt-2 rounded w-full h-20 object-contain bg-black" alt="Auto" />}
            </div>
          </div>
        </div>
      </div>

      <div className="form-nav">
        <button className="btn-nav btn-submit w-full" onClick={handleSubmit}>Submit Pit Data</button>
      </div>
    </div>
  );
}