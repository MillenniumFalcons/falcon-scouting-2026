import { useState, useMemo } from 'react';
import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend, Title, CategoryScale
} from 'chart.js';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, Title, CategoryScale);

const generateDistinctColor = (index, totalTeams) => {
  const hue = (index * 360) / (totalTeams || 1);
  return `hsl(${hue}, 90%, 65%)`;
};

export default function Leaderboard({ onTeamClick, allMatchData = [], allPitData = [] }) {
  const [view, setView] = useState('table');
  const [sortConfig, setSortConfig] = useState({ key: 'avgPieces', direction: 'desc' });
  const [axes, setAxes] = useState({ x: 'avgPieces', y: 'avgAutoScored' });

  const teamStats = useMemo(() => {
    if (!allMatchData || allMatchData.length === 0) return [];

    const teamNums = [...new Set(allMatchData.map(m => String(m.teamNum || m.team || '')))]
      .filter(t => t !== '' && t !== 'undefined');
    
    return teamNums.map((tNum, index) => {
      const matches = allMatchData.filter(m => String(m.teamNum || m.team) === tNum);
      
      // Match the lookup logic: Find pit data with robust key checking
      const pit = allPitData.find(p => String(p.teamNum || p.team || p.Team) === tNum);
      
      // Exact logic from TeamLookup: pit ? Number(pit.hopperCap || 0) : 0
      // Note: If you want it to default to 1 to avoid zeroing out, use: (Number(pit?.hopperCap) || 1)
      const cap = pit ? Number(pit.hopperCap || pit.capacity || pit.HopperCap || 0) : 0;

      const processed = matches.map(m => {
        // Exact variable mapping from your working Lookup code
        const autoH = Number(m.autoHopper || 0);
        const teleH = Number(m.teleHopper || 0);
        const feedH = Number(m.feedHopper || 0);
        
        // Exact accuracy and preload logic
        const acc = Number(m.accuracy || 100) / 100;
        const preload = (m.autoPreload === "true" || m.autoPreload === true) ? 8 : 0;
        
        // Scored Calculation (Matches TeamLookup exactly)
        const autoScored = (autoH * cap) + preload;
        const teleScored = (teleH * cap);
        const teleFed = (feedH * cap);
        
        const totalHandled = autoScored + teleScored + teleFed;
        const shootTime = Number(m.autoShootTime || 0) + Number(m.teleShootTime || 0);

        return {
          autoScored,
          autoAdj: autoScored * acc,
          teleScored,
          teleAdj: teleScored * acc,
          fed: teleFed,
          scored: autoScored + teleScored,
          adjScored: (autoScored + teleScored) * acc,
          total: totalHandled,
          bps: shootTime > 0 ? (totalHandled / shootTime) : 0,
          climb: m.climbLevel === "None" ? 0 : parseInt(String(m.climbLevel).replace('L', '') || 0),
          defense: Number(m.defenseTime || 0),
          oof: Number(m.oofTime || 0),
          role: m.role || "Unknown"
        };
      });

      const count = processed.length;
      if (count === 0) return null;

      // Averaging Logic
      const getAvg = (key) => processed.reduce((a, b) => a + (b[key] || 0), 0) / count;
      
      const avgTotal = getAvg('total'); 
      const stdDev = Math.sqrt(processed.map(m => Math.pow(m.total - avgTotal, 2)).reduce((a, b) => a + b, 0) / count);
      const cv = avgTotal > 0 ? (stdDev / avgTotal) : 0;
      
      const stability = Math.max(0, 50 - (cv * 50));
      const reliability = Math.max(0, 50 - (getAvg('oof') * 2) - (getAvg('defense') * 0.5));

      return {
        team: tNum,
        role: processed[0]?.role || "Unknown",
        avgBps: Number(getAvg('bps').toFixed(2)),
        avgPieces: Number(avgTotal.toFixed(1)), // "Total Pieces" in lookup logic
        avgScored: Number(getAvg('scored').toFixed(1)),
        avgAdjScored: Number(getAvg('adjScored').toFixed(1)),
        avgAutoScored: Number(getAvg('autoScored').toFixed(1)),
        avgAutoAdj: Number(getAvg('autoAdj').toFixed(1)),
        avgTeleScored: Number(getAvg('teleScored').toFixed(1)),
        avgTeleAdj: Number(getAvg('teleAdj').toFixed(1)),
        avgFed: Number(getAvg('fed').toFixed(1)),
        avgClimb: Number(getAvg('climb').toFixed(1)),
        avgDef: Number(getAvg('defense').toFixed(1)),
        avgOof: Number(getAvg('oof').toFixed(1)),
        consistency: Math.round(stability + reliability),
        color: generateDistinctColor(index, teamNums.length)
      };
    }).filter(Boolean);
  }, [allMatchData, allPitData]);

  // ... (Sorting and Rendering logic remains same as previous Leaderboard)

  // ... (Rest of the component logic for sorting and rendering remains the same)
  // Sorting logic
  const sortedTeams = useMemo(() => {
    const items = [...teamStats];
    if (!sortConfig.key) return items;
    return items.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === 'team' || typeof aVal === 'number') {
        return sortConfig.direction === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
      }
      return sortConfig.direction === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }, [teamStats, sortConfig]);

  const toggleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>TEAM <span style={{color: '#b91c1c'}}>RANKINGS</span></h1>
      
      <div style={styles.toggleContainer}>
        <button 
          onClick={() => setView('table')} 
          style={{...styles.toggleBtn, ...(view === 'table' ? styles.toggleActive : {})}}
        >Table</button>
        <button 
          onClick={() => setView('graph')} 
          style={{...styles.toggleBtn, ...(view === 'graph' ? styles.toggleActive : {})}}
        >Graph</button>
      </div>

      {view === 'table' ? (
        <div style={styles.tableWrapper}>
          {sortedTeams.length > 0 ? (
            <table style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  <SortHeader label="Team" k="team" conf={sortConfig} onClick={toggleSort} />
                  <SortHeader label="Role" k="role" conf={sortConfig} onClick={toggleSort} />
                  <SortHeader label="BPS" k="avgBps" conf={sortConfig} onClick={toggleSort} />
                  <SortHeader label="Total" k="avgPieces" conf={sortConfig} onClick={toggleSort} />
                  <SortHeader label="Auto(Adj)" k="avgAutoAdj" conf={sortConfig} onClick={toggleSort} />
                  <SortHeader label="Tele(Adj)" k="avgTeleAdj" conf={sortConfig} onClick={toggleSort} />
                  <SortHeader label="Fed" k="avgFed" conf={sortConfig} onClick={toggleSort} />
                  <SortHeader label="Climb" k="avgClimb" conf={sortConfig} onClick={toggleSort} />
                  <SortHeader label="Def" k="avgDef" conf={sortConfig} onClick={toggleSort} />
                  <SortHeader label="Consist." k="consistency" conf={sortConfig} onClick={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedTeams.map(t => (
                  <tr key={t.team} style={styles.tr}>
                    <td style={styles.td}>
                      <button onClick={() => onTeamClick?.(t.team)} style={{...styles.teamLink, color: t.color}}>
                        T{t.team}
                      </button>
                    </td>
                    <td style={{...styles.td, color: '#666', fontSize: '10px'}}>{t.role}</td>
                    <td style={{...styles.td, color: '#888', fontFamily: 'monospace'}}>{t.avgBps}</td>
                    <td style={{...styles.td, color: '#ef4444', fontWeight: '900', background: 'rgba(255,255,255,0.03)'}}>{t.avgPieces}</td>
                    <td style={{...styles.td, color: '#34d399'}}>{t.avgAutoScored} <span style={styles.adj}>({t.avgAutoAdj})</span></td>
                    <td style={{...styles.td, color: '#4ade80'}}>{t.avgTeleScored} <span style={styles.adj}>({t.avgTeleAdj})</span></td>
                    <td style={{...styles.td, color: '#fb923c'}}>{t.avgFed}</td>
                    <td style={{...styles.td, color: '#818cf8'}}>L{t.avgClimb}</td>
                    <td style={{...styles.td, color: '#f87171'}}>{t.avgDef}s</td>
                    <td style={{...styles.td, color: '#c084fc'}}>{t.consistency}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{padding: '40px', textAlign: 'center', color: '#666'}}>No data available to display.</div>
          )}
        </div>
      ) : (
        <div style={styles.graphSection}>
          <div style={styles.axisControls}>
            <AxisControl label="X-Axis" val={axes.x} set={(v) => setAxes(p => ({...p, x: v}))} />
            <AxisControl label="Y-Axis" val={axes.y} set={(v) => setAxes(p => ({...p, y: v}))} />
          </div>
          <div style={styles.chartBox}>
            <Scatter 
              options={graphOptions} 
              data={{ 
                datasets: sortedTeams.map(t => ({ 
                  label: `Team ${t.team}`, 
                  data: [{ x: t[axes.x], y: t[axes.y] }], 
                  backgroundColor: t.color, 
                  pointRadius: 8
                })) 
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

const SortHeader = ({ label, k, conf, onClick }) => (
  <th onClick={() => onClick(k)} style={styles.th}>
    {label} <span style={{fontSize: '8px', color: '#b91c1c'}}>{conf.key === k ? (conf.direction === 'desc' ? '▼' : '▲') : ''}</span>
  </th>
);

const AxisControl = ({ label, val, set }) => (
  <div style={{flex: 1}}>
    <label style={styles.axisLabel}>{label}</label>
    <select value={val} onChange={(e) => set(e.target.value)} style={styles.select}>
      <option value="avgPieces">Total Scored</option>
      <option value="avgBps">BPS (Speed)</option>
      <option value="avgAutoAdj">Auto (Adjusted)</option>
      <option value="avgTeleAdj">Tele (Adjusted)</option>
      <option value="avgClimb">Climb Level</option>
      <option value="avgDef">Defense Time</option>
      <option value="consistency">Consistency %</option>
    </select>
  </div>
);

const styles = {
  container: { padding: '20px', backgroundColor: '#0a0a0a', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' },
  title: { textAlign: 'center', fontSize: '32px', fontWeight: '900', fontStyle: 'italic', margin: '0 0 20px 0' },
  toggleContainer: { display: 'flex', justifyContent: 'center', gap: '5px', background: '#1a1a1a', padding: '5px', borderRadius: '50px', width: 'fit-content', margin: '0 auto 30px' },
  toggleBtn: { background: 'transparent', border: 'none', color: '#888', padding: '10px 25px', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' },
  toggleActive: { background: '#b91c1c', color: 'white' },
  tableWrapper: { overflowX: 'auto', borderRadius: '12px', border: '1px solid #333', background: '#111' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '11px' },
  theadRow: { background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid #333' },
  th: { padding: '15px', cursor: 'pointer', textAlign: 'center', color: '#888', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #222' },
  td: { padding: '12px', textAlign: 'center' },
  teamLink: { background: 'none', border: 'none', fontWeight: '900', cursor: 'pointer', fontSize: '13px' },
  adj: { fontSize: '9px', opacity: 0.4 },
  graphSection: { height: '600px', display: 'flex', flexDirection: 'column' },
  axisControls: { display: 'flex', gap: '20px', background: '#1a1a1a', padding: '15px', borderRadius: '12px', marginBottom: '20px' },
  axisLabel: { display: 'block', fontSize: '10px', color: '#666', fontWeight: 'bold', marginBottom: '5px', textTransform: 'uppercase' },
  select: { width: '100%', background: '#0a0a0a', border: '1px solid #333', color: 'white', padding: '8px', borderRadius: '6px' },
  chartBox: { flex: 1, background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px' }
};

const graphOptions = {
  responsive: true, maintainAspectRatio: false,
  scales: {
    x: { grid: { color: '#222' }, ticks: { color: '#666' } },
    y: { grid: { color: '#222' }, ticks: { color: '#666' } }
  },
  plugins: { legend: { display: false } }
};