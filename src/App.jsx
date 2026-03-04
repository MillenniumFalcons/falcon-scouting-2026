import { HashRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom'; // Changed to HashRouter
import { useState, useEffect } from 'react';
import DataCollection from './pages/DataCollection';
import PitScouting from './pages/PitScouting';
import TeamLookup from './pages/TeamLookup';
import Leaderboard from './pages/Leaderboard';
import Predict from './pages/Predict';
import './index.css';

function AppContent() {
  const navigate = useNavigate();
  const [teamToLookup, setTeamToLookup] = useState('');
  
  // Centralized Data State
  const [allMatchData, setAllMatchData] = useState([]);
  const [allPitData, setAllPitData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Global Fetch Logic
  useEffect(() => {
    const fetchData = async () => {
      const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyOdqsqqrj8SLK9sU15BZbAhdFMdOHOSqVD48ufRYKSuiD4GaGBnnVLwDZiJuMR2C2A/exec";
      try {
        setIsLoading(true);
        const response = await fetch(SCRIPT_URL);
        const json = await response.json();
        setAllMatchData(json.matchData || []);
        setAllPitData(json.pitData || []);
      } catch (e) { 
        console.error("Fetch error", e); 
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleJumpToTeam = (teamNum) => {
    setTeamToLookup(teamNum); 
    navigate('/lookup');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-blue-900 text-white font-black">
        <div className="animate-bounce text-4xl mb-4">⚙️</div>
        <p className="tracking-widest uppercase text-sm">Syncing Match Data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-900 text-white p-4 flex gap-4 overflow-x-auto shadow-lg sticky top-0 z-50">
        <Link to="/" className="font-bold hover:text-blue-200 transition">Data</Link>
        <Link to="/pit" className="font-bold hover:text-blue-200 transition">Pit</Link>
        <Link to="/lookup" className="font-bold hover:text-blue-200 transition">Lookup</Link>
        <Link to="/leaderboard" className="font-bold hover:text-blue-200 transition">Analysis</Link>
        <Link to="/predict" className="font-bold hover:text-blue-200 transition">Predict</Link>
      </nav>

      <div className="p-2">
        <Routes>
          <Route path="/" element={<DataCollection />} />
          <Route path="/pit" element={<PitScouting />} />
          
          <Route 
            path="/lookup" 
            element={<TeamLookup selectedTeam={teamToLookup} allMatchData={allMatchData} allPitData={allPitData} />} 
          />
          
          <Route 
            path="/leaderboard" 
            element={<Leaderboard onTeamClick={handleJumpToTeam} allMatchData={allMatchData} allPitData={allPitData} />} 
          />
          
          <Route 
            path="/predict" 
            element={<Predict allMatchData={allMatchData} allPitData={allPitData} />} 
          />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}