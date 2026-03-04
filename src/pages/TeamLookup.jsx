import { useState, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const COLORS = [
  { main: '#60a5fa', light: '#93c5fd', bg: 'rgba(96, 165, 250, 0.1)' },
  { main: '#f87171', light: '#fca5a5', bg: 'rgba(248, 113, 113, 0.1)' },
  { main: '#4ade80', light: '#86efac', bg: 'rgba(74, 222, 128, 0.1)' },
  { main: '#c084fc', light: '#d8b4fe', bg: 'rgba(192, 132, 252, 0.1)' }
];

export default function TeamLookup({ selectedTeam, allMatchData, allPitData }) {
  const [showH2H, setShowH2H] = useState(false);
  const [searchTeam, setSearchTeam] = useState('');
  const [teamStack, setTeamStack] = useState([]);
  const [showMatches, setShowMatches] = useState(false);
  const [showPit, setShowPit] = useState(false);

  const calculateStats = (matches, pit) => {
    if (!matches.length) return null;
    const cap = pit ? Number(pit.hopperCap || 0) : 0;
    const processed = matches.map(m => {
      const autoH = Number(m.autoHopper || 0);
      const teleH = Number(m.teleHopper || 0);
      const feedH = Number(m.feedHopper || 0);
      const acc = Number(m.accuracy || 100) / 100;
      const preload = (m.autoPreload === "true" || m.autoPreload === true) ? 8 : 0;
      const autoScored = (autoH * cap) + preload;
      const teleScored = (teleH * cap);
      const teleFed = (feedH * cap);
      const totalHandled = autoScored + teleScored + teleFed;
      const shootTime = Number(m.autoShootTime || 0) + Number(m.teleShootTime || 0);

      return {
        match: m.matchNum,
        autoScored,
        autoAdj: autoScored * acc,
        teleScored,
        teleAdj: teleScored * acc,
        fed: teleFed,
        scored: autoScored + teleScored,
        adjScored: (autoScored + teleScored) * acc,
        total: totalHandled,
        bps: shootTime > 0 ? (totalHandled / shootTime) : 0,
        climb: m.climbLevel === "None" ? 0 : parseInt(String(m.climbLevel).replace('L', '')),
        defense: Number(m.defenseTime || 0),
        oof: Number(m.oofTime || 0),
        notes: m.notes || "-",
        role: m.role || "Unknown",
        raw: m
      };
    });

    const getMedian = (arr) => {
      if (!arr.length) return "N/A";
      const s = [...arr].sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)];
    };

    const count = matches.length;
    const avgPieces = processed.reduce((a, b) => a + b.total, 0) / count;
    const stdDev = Math.sqrt(processed.map(m => Math.pow(m.total - avgPieces, 2)).reduce((a, b) => a + b, 0) / count);
    const cv = avgPieces > 0 ? (stdDev / avgPieces) : 0;
    const avgOof = processed.reduce((a, b) => a + b.oof, 0) / count;
    const avgDef = processed.reduce((a, b) => a + b.defense, 0) / count;
    const stabilityScore = Math.max(0, 50 - (cv * 50));
    const reliabilityScore = Math.max(0, 50 - (avgOof * 2) - (avgDef * 0.5));

    const roles = processed.map(m => m.role);
    const roleFreq = roles.reduce((acc, r) => ({ ...acc, [r]: (acc[r] || 0) + 1 }), {});
    const commonRole = Object.keys(roleFreq).reduce((a, b) => roleFreq[a] > roleFreq[b] ? a : b);

    return {
      processed,
      pit,
      teamNum: matches[0].teamNum,
      teamName: pit?.teamName || "???",
      consistency: (stabilityScore + reliabilityScore).toFixed(0) + "%",
      avgPieces: avgPieces.toFixed(1),
      avgScored: (processed.reduce((a, b) => a + b.scored, 0) / count).toFixed(1),
      avgAdjScored: (processed.reduce((a, b) => a + b.adjScored, 0) / count).toFixed(1),
      avgAutoScored: (processed.reduce((a, b) => a + b.autoScored, 0) / count).toFixed(1),
      avgAutoAdj: (processed.reduce((a, b) => a + b.autoAdj, 0) / count).toFixed(1),
      avgTeleScored: (processed.reduce((a, b) => a + b.teleScored, 0) / count).toFixed(1),
      avgTeleAdj: (processed.reduce((a, b) => a + b.teleAdj, 0) / count).toFixed(1),
      avgTeleFed: (processed.reduce((a, b) => a + b.fed, 0) / count).toFixed(1),
      avgBps: (processed.reduce((a, b) => a + b.bps, 0) / count).toFixed(2),
      avgDefense: avgDef.toFixed(1),
      avgOof: avgOof.toFixed(1),
      avgClimb: (processed.reduce((a, b) => a + b.climb, 0) / count).toFixed(1),
      commonRole,
      medSpeed: getMedian(matches.map(m => m.driveSpeed)),
      medDriver: getMedian(matches.map(m => m.driverRating)),
    };
  };

  const handleSearch = useCallback((teamNum) => {
    if (!teamNum || allMatchData.length === 0) return;
    if (teamStack.find(t => String(t.teamNum) === String(teamNum))) return;
    const matches = allMatchData.filter(m => String(m.teamNum) === String(teamNum));
    const pit = allPitData.find(p => String(p.teamNum) === String(teamNum));
    const result = calculateStats(matches, pit);
    if (result) {
      setTeamStack(prev => [...prev, result]);
      setSearchTeam('');
    }
  }, [allMatchData, allPitData, teamStack]);

  useEffect(() => {
    if (selectedTeam && allMatchData.length > 0) handleSearch(selectedTeam);
  }, [selectedTeam, allMatchData, handleSearch]);

const getOverlayData = (key, options = {}) => {
    const maxLen = Math.max(...teamStack.map(t => t.processed.length), 0);
    return {
      labels: Array.from({ length: maxLen }, (_, i) => `M${i + 1}`),
      datasets: teamStack.flatMap((team, i) => {
        const datasets = [];
        const color = COLORS[i % COLORS.length];
        
        datasets.push({
          label: `T${team.teamNum} ${key}`,
          data: team.processed.map(m => m[key]),
          borderColor: color.main,
          backgroundColor: color.bg,
          tension: options.stepped ? 0 : 0.3,
          stepped: options.stepped || false,
          pointRadius: 3,
          fill: true
        });

        // Add OOF Time specifically when defense is requested
        if (key === 'defense') {
          datasets.push({
            label: `T${team.teamNum} OOF`,
            data: team.processed.map(m => m.oof),
            borderColor: '#ef4444', // Red for OOF
            borderDash: [2, 2],
            tension: 0.3,
            pointRadius: 2
          });
        }

        if (options.useAdj) {
          const adjKey = key === 'autoScored' ? 'autoAdj' : (key === 'teleScored' ? 'teleAdj' : 'adjScored');
          datasets.push({
            label: `T${team.teamNum} Adj`,
            data: team.processed.map(m => m[adjKey]),
            borderColor: color.light,
            borderDash: [5, 5],
            tension: 0.3,
            pointRadius: 0
          });
        }
        return datasets;
      })
    };
  };

  const renderH2H = () => {
    if (teamStack.length < 2) return null;
    const t1 = teamStack[0];
    const t2 = teamStack[1];
    const categories = [
      { label: "Consistency", key: "consistency", higherIsBetter: true },
      { label: "Avg Pieces", key: "avgPieces", higherIsBetter: true },
      { label: "BPS (Speed)", key: "avgBps", higherIsBetter: true },
      { label: "Auto Efficiency", key: "avgAutoScored", higherIsBetter: true },
      { label: "Reliability (Oof)", key: "avgOof", higherIsBetter: false },
    ];
    let t1S = 0; let t2S = 0;
    const res = categories.map(c => {
      const v1 = parseFloat(t1[c.key]); const v2 = parseFloat(t2[c.key]);
      const t1W = c.higherIsBetter ? v1 > v2 : v1 < v2;
      if (v1 !== v2) t1W ? t1S++ : t2S++;
      return { ...c, v1, v2, t1W, tie: v1 === v2 };
    });
    return (
      <div className="h2h-container">
          <div className="h2h-scoreboard">
            <div className="h2h-team-panel">
              <div className="h2h-team-number text-blue-400">{t1.teamNum}</div>
              <div className="h2h-team-name">{t1.teamName}</div>
            </div>
            <div className="h2h-score-display">
              <div className="h2h-score-label">HEAD-TO-HEAD</div>
              <div className="h2h-score-nums">{t1S} - {t2S}</div>
            </div>
            <div className="h2h-team-panel">
              <div className="h2h-team-number text-red-400">{t2.teamNum}</div>
              <div className="h2h-team-name">{t2.teamName}</div>
            </div>
          </div>
          <div className="h2h-data-table">
            {res.map(r => (
              <div key={r.label} className="h2h-metric-row">
                <span className={`metric-val-a ${r.t1W && !r.tie ? "better-val" : ""}`}>
                  {r.v1}{r.key === 'consistency' ? '%' : ''}
                </span>
                <span className="metric-label">{r.label}</span>
                <span className={`metric-val-b ${!r.t1W && !r.tie ? "better-val" : ""}`}>
                  {r.v2}{r.key === 'consistency' ? '%' : ''}
                </span>
              </div>
            ))}
          </div>
      </div>
    );
  };

  return (
    <div className="scouting-container">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-center text-4xl font-black uppercase text-gray-400 mb-6 tracking-tighter">TEAM <span className="lookup-title text-white">LOOKUP</span></h1>

        <div className="bg-panel mb-4 p-4 border border-gray-700 rounded-2xl shadow-2xl">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              className="lookup-input flex-1 text-sm bg-black/40 border-gray-600 focus:border-blue-500 rounded-xl"
              placeholder="Enter Team Number..."
              value={searchTeam}
              onChange={(e) => setSearchTeam(e.target.value)}
            />
            <button onClick={() => handleSearch(searchTeam)} className="panel-button bg-white text-black px-8 font-black rounded-xl hover:scale-105 transition-transform">ADD</button>
            {teamStack.length >= 2 && (
              <button onClick={() => setShowH2H(!showH2H)} className={`panel-button px-6 font-bold rounded-xl ${showH2H ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400'}`}>H2H</button>
            )}
            <button onClick={() => {setTeamStack([]); setShowH2H(false);}} className="clear-button text-[10px] opacity-40 hover:opacity-100">RESET ALL</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {teamStack.map((t, i) => (
              <div key={t.teamNum} className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border border-white/5" style={{ backgroundColor: COLORS[i % COLORS.length].bg, color: COLORS[i % COLORS.length].main }}>
                {t.teamNum} <button onClick={() => setTeamStack(teamStack.filter(x => x.teamNum !== t.teamNum))} className="ml-2 hover:text-white">✕</button>
              </div>
            ))}
          </div>
        </div>

        {teamStack.length > 0 ? (
          <>
            {showH2H && teamStack.length >= 2 ? renderH2H() : (
              <div className="data-table-container mb-8">
                <div className="bg-[#111] w-full overflow-x-auto p-4 border border-gray-800 rounded-[2rem] shadow-2xl">
                  <table className="w-full text-center border-separate border-spacing-y-1.5 text-[11px]">
                    <thead>
                      <tr className="text-gray-500 font-black uppercase tracking-[0.2em]">
                        <th className="pb-4 text-left pl-6">Team</th>
                        <th className="pb-4">BPS</th>
                        <th className="pb-4 text-blue-400">Total (Adj)</th>
                        <th className="pb-4 text-emerald-400">Auto (Adj)</th>
                        <th className="pb-4 text-green-400">Tele (Adj)</th>
                        <th className="pb-4 text-yellow-500">Fed</th>
                        <th className="pb-4 text-red-500">OOF</th>
                        <th className="pb-4 text-orange-500">Def</th>
                        <th className="pb-4 text-indigo-400">Climb</th>
                        <th className="pb-4">Role</th>
                        <th className="pb-4 text-purple-400">Con.</th>
                      </tr>
                    </thead>
                    <tbody className="font-bold">
                      {teamStack.map((t, i) => (
                        <tr key={t.teamNum} className="bg-white/[0.03] hover:bg-white/[0.08] transition-all group">
                          <td className="p-4 text-left pl-6 rounded-l-2xl flex items-center gap-4">
                            <div className="w-1 h-8 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ backgroundColor: COLORS[i % COLORS.length].main }} />
                            <span className="text-xl font-black italic tracking-tighter">{t.teamNum}</span>
                          </td>
                          <td className="p-4 text-gray-400 font-mono">{t.avgBps}</td>
                          <td className="p-4 text-blue-400 font-black text-sm">{t.avgScored} <span className="text-[9px] opacity-40 font-medium">({t.avgAdjScored})</span></td>
                          <td className="p-4 text-emerald-400 font-black text-sm">{t.avgAutoScored} <span className="text-[9px] opacity-40 font-medium">({t.avgAutoAdj})</span></td>
                          <td className="p-4 text-green-400 font-black text-sm">{t.avgTeleScored} <span className="text-[9px] opacity-40 font-medium">({t.avgTeleAdj})</span></td>
                          <td className="p-4 text-yellow-500/80">{t.avgTeleFed}</td>
                          <td className="p-4 text-red-400/80">{t.avgOof}s</td>
                          <td className="p-4 text-orange-400/80">{t.avgDefense}s</td>
                          <td className="p-4 text-indigo-300 font-mono italic">L{t.avgClimb}</td>
                          <td className="p-4 uppercase text-[8px] tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">{t.commonRole}</td>
                          <td className="p-4 rounded-r-2xl text-purple-400 font-black bg-purple-400/10 shadow-inner">{t.consistency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="graph-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <GraphCard title="Auto Scoring">
                <Line options={standardOptions} data={getOverlayData('autoScored', { useAdj: true })} />
              </GraphCard>
              <GraphCard title="Tele Scoring">
                <Line options={standardOptions} data={getOverlayData('teleScored', { useAdj: true })} />
              </GraphCard>
              <GraphCard title="Total Pieces">
                <Line options={standardOptions} data={getOverlayData('total', { useAdj: true })} />
              </GraphCard>
              <GraphCard title="Climb Progress">
                <Line options={climbOptions} data={getOverlayData('climb', { stepped: true })} />
              </GraphCard>
              <GraphCard title="Defense & OOF Time">
                <Line options={standardOptions} data={getOverlayData('defense')} />
              </GraphCard>
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-gray-600 text-[9px] tracking-[0.4em] uppercase text-center mt-12 mb-4">Data Inspect: Team {teamStack[teamStack.length-1].teamNum}</h3>
              
              <CollapsibleTable title="Pit Scouting Specs" isOpen={showPit} setOpen={setShowPit}>
                 <table className="w-full text-left text-xs text-white">
                   <tbody>
                      {Object.entries(teamStack[teamStack.length-1].pit || {}).map(([k, v]) => !['robotImage', 'autoImage'].includes(k) && (
                        <tr key={k} className="border-b border-gray-800 last:border-0">
                          <td className="p-3 bg-white/[0.02] font-bold text-gray-500 w-1/3 uppercase text-[9px] tracking-widest">{k}</td>
                          <td className="p-3 font-mono text-gray-200">{String(v)}</td>
                        </tr>
                      ))}
                   </tbody>
                 </table>
              </CollapsibleTable>

              <CollapsibleTable title="Match History Breakdown" isOpen={showMatches} setOpen={setShowMatches}>
                  <div className="max-h-[500px] overflow-y-auto overflow-x-auto rounded-xl border border-gray-800 custom-scrollbar shadow-inner bg-[#080808]">
                     <table className="w-full text-left text-[11px] border-collapse relative">
                       <thead className="bg-[#151515] text-gray-500 uppercase sticky top-0 z-20 shadow-md">
                         <tr>
                            {Object.keys(teamStack[teamStack.length-1].processed[0].raw).map(k => (
                              <th key={k} className="p-4 border-b border-gray-800 font-black tracking-widest whitespace-nowrap">{k}</th>
                            ))}
                            
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-800/50">
                         {teamStack[teamStack.length-1].processed.map((m, i) => (
                           <tr key={i} className="hover:bg-white/[0.04] transition-colors group">
                             {Object.values(m.raw).map((v, idx) => (
                               <td key={idx} className="p-4 text-gray-400 font-mono whitespace-nowrap">{String(v)}</td>
                             ))}
                             <td className="p-4 bg-yellow-500/[0.02] min-w-[350px] leading-relaxed sticky right-0 z-10 backdrop-blur-md shadow-[-10px_0_15px_rgba(0,0,0,0.5)] border-l border-gray-800/50">
                               
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                  </div>
              </CollapsibleTable>
            </div>
          </>
        ) : (
          <div className="h-80 flex flex-col items-center justify-center text-gray-700 border-2 border-dashed border-gray-800 rounded-[3rem] bg-[#111] animate-pulse">
            <p className="text-sm font-black tracking-[0.3em] uppercase opacity-30">Waiting for query...</p>
          </div>
        )}
      </div>
    </div>
  );
}

const standardOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: { 
        beginAtZero: true, 
        grid: { color: 'rgba(255,255,255,0.05)' }, 
        ticks: { color: '#555', font: { size: 9, weight: 'bold' } } 
    },
    x: { 
        grid: { display: false }, 
        ticks: { color: '#555', font: { size: 9, weight: 'bold' } } 
    }
  },
  plugins: { 
    legend: { 
        display: true, 
        position: 'bottom', 
        labels: { boxWidth: 6, usePointStyle: true, font: { size: 8, weight: '900' }, color: '#666', padding: 15 } 
    } 
  }
};

const climbOptions = {
  ...standardOptions,
  scales: {
    y: { 
        min: 0, 
        max: 4, 
        grid: { color: 'rgba(255,255,255,0.05)' }, 
        ticks: { stepSize: 1, color: '#555', font: { size: 9, weight: 'bold' }, callback: (v) => v === 0 ? 'None' : `L${v}` } 
    },
    x: { grid: { display: false }, ticks: { color: '#555', font: { size: 9, weight: 'bold' } } }
  }
};

const GraphCard = ({ title, children }) => (
  <div className="graph-card flex flex-col h-[280px] bg-[#111] p-6 border border-gray-800 rounded-3xl shadow-xl hover:border-gray-600 transition-colors group">
    <h3 className="font-black text-gray-600 mb-6 uppercase text-[9px] tracking-[0.3em] text-center group-hover:text-gray-400 transition-colors">{title}</h3>
    <div className="flex-1 min-h-0">
        {children}
    </div>
  </div>
);

const CollapsibleTable = ({ title, children, isOpen, setOpen }) => (
  <div className="bg-[#111] overflow-hidden border border-gray-800 rounded-2xl transition-all shadow-lg">
    <button onClick={() => setOpen(!isOpen)} className="panel-button w-full flex justify-between items-center p-5 font-black uppercase tracking-[0.2em] text-[10px] transition-all hover:bg-white/[0.02]">
      <span className={isOpen ? 'text-white' : 'text-gray-500'}>{title}</span>
      <span className={`text-xl transition-transform duration-300 ${isOpen ? 'rotate-45 text-red-500' : 'text-blue-500'}`}>+</span>
    </button>
    {isOpen && <div className="p-6 bg-black/40 border-t border-gray-800/50 animate-in fade-in slide-in-from-top-2">{children}</div>}
  </div>
);