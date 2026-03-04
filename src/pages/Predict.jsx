import { useState } from 'react';

export default function PredictorPage({ allMatchData, allPitData }) {
  const [redAlliance, setRedAlliance] = useState([]);
  const [blueAlliance, setBlueAlliance] = useState([]);
  const [inputTeam, setInputTeam] = useState('');
  const [activeSide, setActiveSide] = useState('red');

  const getTeamMetrics = (teamNum) => {
    const matches = allMatchData.filter(m => String(m.teamNum) === String(teamNum));
    const pit = allPitData.find(p => String(p.teamNum) === String(teamNum));
    
    if (!matches || matches.length === 0) return null;

    // Use the robust capacity lookup from your working Leaderboard/Lookup logic
    const cap = pit ? Number(pit.hopperCap || pit.capacity || pit.HopperCap || 0) : 0;
    
    const processed = matches.map(m => {
      const acc = Number(m.accuracy || 100) / 100;
      const preload = (m.autoPreload === "true" || m.autoPreload === true) ? 8 : 0;
      
      const rawAuto = (Number(m.autoHopper || 0) * cap) + preload;
      const rawTele = (Number(m.teleHopper || 0) * cap);
      const rawFed = (Number(m.feedHopper || 0) * cap);
      const climb = m.climbLevel === "None" ? 0 : parseInt(String(m.climbLevel).replace('L', '')) || 0;

      return { 
        rawAuto, 
        adjAuto: rawAuto * acc, 
        rawTele, 
        adjTele: rawTele * acc, 
        fed: rawFed, 
        climb, 
        rawTotal: rawAuto + rawTele,
        adjTotal: (rawAuto + rawTele) * acc 
      };
    });

    const count = processed.length;
    const avgRawTotal = processed.reduce((a, b) => a + b.rawTotal, 0) / count;
    const avgAdjTotal = processed.reduce((a, b) => a + b.adjTotal, 0) / count;
    
    // Consistency calculation based on raw performance variance
    const variance = processed.reduce((a, b) => a + Math.pow(b.rawTotal - avgRawTotal, 2), 0) / count;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0.6, 1 - (stdDev / (avgRawTotal || 1) * 0.3));

    return {
      teamNum,
      avgRawAuto: processed.reduce((a, b) => a + b.rawAuto, 0) / count,
      avgAdjAuto: processed.reduce((a, b) => a + b.adjAuto, 0) / count,
      avgRawTele: processed.reduce((a, b) => a + b.rawTele, 0) / count,
      avgAdjTele: processed.reduce((a, b) => a + b.adjTele, 0) / count,
      avgFed: processed.reduce((a, b) => a + b.fed, 0) / count,
      avgClimb: processed.reduce((a, b) => a + b.climb, 0) / count,
      stdDev,
      consistency,
      rawTotal: avgRawTotal,
      adjTotal: avgAdjTotal
    };
  };

  const addTeam = () => {
    const metrics = getTeamMetrics(inputTeam);
    if (!metrics) {
        alert("No data found for team " + inputTeam);
        return;
    }
    if (activeSide === 'red' && redAlliance.length < 3) {
      setRedAlliance([...redAlliance, metrics]);
    } else if (activeSide === 'blue' && blueAlliance.length < 3) {
      setBlueAlliance([...blueAlliance, metrics]);
    }
    setInputTeam('');
  };

  const getAllianceStats = (alliance) => {
    if (alliance.length === 0) return { autoRaw: 0, autoAdj: 0, teleRaw: 0, teleAdj: 0, climb: 0, totalRaw: 0, totalAdj: 0, sigma: 0 };
    return {
      autoRaw: alliance.reduce((a, b) => a + b.avgRawAuto, 0),
      autoAdj: alliance.reduce((a, b) => a + b.avgAdjAuto, 0),
      teleRaw: alliance.reduce((a, b) => a + b.avgRawTele, 0),
      teleAdj: alliance.reduce((a, b) => a + b.avgAdjTele, 0),
      climb: alliance.reduce((a, b) => a + b.avgClimb, 0),
      totalRaw: alliance.reduce((a, b) => a + b.rawTotal, 0),
      totalAdj: alliance.reduce((a, b) => a + b.adjTotal, 0),
      sigma: Math.sqrt(alliance.reduce((a, b) => a + Math.pow(b.stdDev, 2), 0)) || 1
    };
  };

  const redStats = getAllianceStats(redAlliance);
  const blueStats = getAllianceStats(blueAlliance);

  // Win Probability Logic (Z-Score)
  const diff = redStats.totalAdj - blueStats.totalAdj;
  const combinedSigma = Math.sqrt(Math.pow(redStats.sigma, 2) + Math.pow(blueStats.sigma, 2)) || 1;
  const zScore = diff / combinedSigma;
  
  // Normal CDF approximation for win chance
  const winProb = 1 / (1 + Math.pow(Math.E, -0.07056 * Math.pow(zScore, 3) - 1.5976 * zScore));
  const redWinChance = (redAlliance.length > 0 && blueAlliance.length > 0) ? (winProb * 100).toFixed(1) : 50;

  return (
    <div className="predictor-page">
      <h1 style={{textAlign: 'center', fontSize: '2.5rem', marginBottom: '1.5rem', fontWeight: 900, color: 'white'}}>
        MATCH <span style={{color: '#ef4444'}}>PREDICTOR</span>
      </h1>
      
      <div className="controls-panel">
        <div style={{display: 'flex', gap: '0.5rem', background: '#262626', padding: '0.25rem', borderRadius: '0.75rem'}}>
            <button onClick={() => setActiveSide('red')} style={{background: activeSide === 'red' ? '#991b1b' : 'transparent', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer'}}>RED</button>
            <button onClick={() => setActiveSide('blue')} style={{background: activeSide === 'blue' ? '#1e40af' : 'transparent', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer'}}>BLUE</button>
        </div>

        <input 
          className="team-input"
          placeholder={`Add Team to ${activeSide.toUpperCase()}...`}
          value={inputTeam}
          onChange={(e) => setInputTeam(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTeam()}
        />
        <button onClick={addTeam} className="add-btn">Add</button>
        <button onClick={() => {setRedAlliance([]); setBlueAlliance([]);}} style={{background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontWeight: 'bold'}}>Reset</button>
      </div>

      {/* Win Probability Header */}
      {redAlliance.length > 0 && blueAlliance.length > 0 && (
          <div style={{textAlign: 'center', marginBottom: '2rem', background: '#171717', padding: '1rem', borderRadius: '1rem', border: '1px solid #333'}}>
              <p style={{fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '2px'}}>Win Probability</p>
              <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', marginTop: '0.5rem'}}>
                  <span style={{color: '#ef4444', fontWeight: 900, fontSize: '1.5rem'}}>{redWinChance}%</span>
                  <div style={{width: '200px', height: '10px', background: '#333', borderRadius: '5px', overflow: 'hidden', display: 'flex'}}>
                      <div style={{width: `${redWinChance}%`, background: '#ef4444', height: '100%'}}></div>
                      <div style={{width: `${100 - redWinChance}%`, background: '#3b82f6', height: '100%'}}></div>
                  </div>
                  <span style={{color: '#3b82f6', fontWeight: 900, fontSize: '1.5rem'}}>{(100 - redWinChance).toFixed(1)}%</span>
              </div>
          </div>
      )}

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem'}}>
        <AllianceTable title="Red Alliance" color="red" stats={redStats} teams={redAlliance} />
        <AllianceTable title="Blue Alliance" color="blue" stats={blueStats} teams={blueAlliance} />
      </div>
    </div>
  );
}

function AllianceTable({ title, color, stats, teams }) {
    const isRed = color === 'red';
    const titleClass = isRed ? 'alliance-title-red' : 'alliance-title-blue';

    return (
        <div className="alliance-card">
            <h3 className={titleClass}>{title}</h3>
            
            <table className="data-table">
                <thead>
                    <tr style={{fontSize: '0.65rem', color: '#666'}}>
                        <th style={{textAlign: 'left'}}>TEAM</th>
                        <th>CONS.</th>
                        <th>AUTO (ADJ)</th>
                        <th>TELE (ADJ)</th>
                        <th>TOTAL (ADJ)</th>
                    </tr>
                </thead>
                <tbody style={{fontSize: '0.85rem'}}>
                    {teams.map(t => (
                        <tr key={t.teamNum} style={{borderBottom: '1px solid #262626'}}>
                            <td className="team-num" style={{padding: '0.5rem 0'}}>T{t.teamNum}</td>
                            <td style={{textAlign: 'center'}}>{(t.consistency * 100).toFixed(0)}%</td>
                            <td style={{textAlign: 'center'}}>{t.avgRawAuto.toFixed(1)} <span style={{fontSize: '0.7rem', opacity: 0.5}}>({t.avgAdjAuto.toFixed(1)})</span></td>
                            <td style={{textAlign: 'center'}}>{t.avgRawTele.toFixed(1)} <span style={{fontSize: '0.7rem', opacity: 0.5}}>({t.avgAdjTele.toFixed(1)})</span></td>
                            <td style={{textAlign: 'center', fontWeight: 900}}>{t.rawTotal.toFixed(1)} <span style={{fontSize: '0.7rem', opacity: 0.5}}>({t.adjTotal.toFixed(1)})</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            <div style={{marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '1rem'}}>
                <div>
                    <p style={{fontSize: '0.6rem', color: '#888', textTransform: 'uppercase'}}>Auto Expected</p>
                    <p style={{fontSize: '1.1rem', fontWeight: 800, color: 'white'}}>{stats.autoAdj.toFixed(1)}</p>
                </div>
                <div>
                    <p style={{fontSize: '0.6rem', color: '#888', textTransform: 'uppercase'}}>Teleop Expected</p>
                    <p style={{fontSize: '1.1rem', fontWeight: 800, color: 'white'}}>{stats.teleAdj.toFixed(1)}</p>
                </div>
                <div>
                    <p style={{fontSize: '0.6rem', color: '#888', textTransform: 'uppercase'}}>Endgame Avg</p>
                    <p style={{fontSize: '1.1rem', fontWeight: 800, color: '#a855f7'}}>L{stats.climb.toFixed(1)}</p>
                </div>
                <div>
                    <p style={{fontSize: '0.6rem', color: '#888', textTransform: 'uppercase'}}>Alliance Total</p>
                    <p style={{fontSize: '1.4rem', fontWeight: 900, color: isRed ? '#ef4444' : '#3b82f6'}}>{stats.totalAdj.toFixed(1)}</p>
                </div>
            </div>
        </div>
    );
}