import { useState } from 'react'
import './App.css'

function App() {
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Operations Controller')
  const [error, setError] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [emergency, setEmergency] = useState(false)
const [reoptimized, setReoptimized] = useState(false)
const [analyzing, setAnalyzing] = useState(false)
 const [assetAnalyzed, setAssetAnalyzed] = useState(false)
const [analyzingAsset, setAnalyzingAsset] = useState(false)
const [scenario, setScenario] = useState(null)
  const [backendScenario, setBackendScenario] = useState(null)
  const [backendResult, setBackendResult] = useState(null)
  const [backendLoading, setBackendLoading] = useState(false)
  const [backendError, setBackendError] = useState('')
  const [planOpen, setPlanOpen] = useState(false)
  const [workCompleted, setWorkCompleted] = useState(false)

  const runBackend = async (scenarioName = 'baseline') => {
    setBackendLoading(true)
    setBackendError('')
    const configuredBase = import.meta.env.VITE_API_BASE
    const apiBases = configuredBase ? [configuredBase] : ['http://localhost:8000', 'http://localhost:8010']
    let lastError = null
    for (const apiBase of apiBases) {
      try {
        const scenarioResponse = await fetch(`${apiBase}/api/scenario?scenario_name=${scenarioName}`)
        if (!scenarioResponse.ok) throw new Error(`Scenario API returned ${scenarioResponse.status}`)
        const loadedScenario = await scenarioResponse.json()
        const resultResponse = await fetch(`${apiBase}/api/optimize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario_name: scenarioName })
        })
        if (!resultResponse.ok) throw new Error(`Optimizer API returned ${resultResponse.status}`)
        setBackendScenario(loadedScenario)
        setBackendResult(await resultResponse.json())
        return
      } catch (apiError) {
        lastError = apiError
      }
    }
    setBackendError(`${lastError?.message || 'Unable to reach the scheduler'}. Start server.py on port 8000 or 8010.`)
    setBackendLoading(false)
  }

const scenarioData = {
  machine: {
    score: 87,
    priority: "CRITICAL PRIORITY",
    affected: 5,
    delay: "12 MIN",
    severity: "CRITICAL",
    asset: "M-02",
    impact: "HIGH",
    reason:
      "Critical machine failure creates an emergency maintenance requirement, consumes crew availability and threatens downstream train movement,",
recovery: {
  title: "Emergency Machine Recovery Plan",
  action1: "Deploy backup maintenance unit to M-02",
  action2: "Reassign Crew C-04 for immediate inspection",
  action3: "Create temporary Track B maintenance window",
  action4: "Prioritize Train T204 through alternate scheduling",
  delayReduction: "12 MIN → 4 MIN",
  confidence: "91%"
}  
    },

  train: {
    score: 74,
    priority: "HIGH PRIORITY",
    affected: 7,
    delay: "30 MIN",
    severity: "HIGH",
    asset: "T204",
    impact: "HIGH",
    reason:
      "The delayed train creates downstream scheduling conflicts, increases congestion and affects dependent track allocation.",
      recovery: {
  title: "Schedule Recovery Plan",
  action1: "Prioritize delayed Train T204 through the next available slot",
  action2: "Hold conflicting departures for controlled resequencing",
  action3: "Reallocate platform and track availability",
  action4: "Optimize downstream timetable automatically",
  delayReduction: "30 MIN → 11 MIN",
  confidence: "88%"
}
  },

  weather: {
    score: 61,
    priority: "ELEVATED PRIORITY",
    affected: 9,
    delay: "18 MIN",
    severity: "MEDIUM",
    asset: "SECTOR B",
    impact: "MEDIUM",
    reason:
      "Heavy rainfall reduces safe operating speeds and may restrict maintenance access across multiple dependent railway operations.",
      recovery: {
  title: "Weather Resilience Plan",
  action1: "Apply dynamic speed restrictions to affected sectors",
  action2: "Increase inspection frequency for vulnerable tracks",
  action3: "Pre-position maintenance crews near high-risk zones",
  action4: "Continuously re-evaluate weather and sensor conditions",
  delayReduction: "18 MIN → 8 MIN",
  confidence: "84%"
}
  },

  crew: {
    score: 79,
    priority: "HIGH PRIORITY",
    affected: 4,
    delay: "25 MIN",
    severity: "HIGH",
    asset: "CREW C-02",
    impact: "HIGH",
    reason:
      "Loss of the assigned maintenance crew delays emergency intervention and forces AI-driven resource reassignment.",
      recovery: {
  title: "Resource Reallocation Plan",
  action1: "Identify nearest available qualified maintenance crew",
  action2: "Automatically reroute Crew C-04 to the affected asset",
  action3: "Reschedule non-critical maintenance jobs",
  action4: "Prioritize emergency intervention for M-02",
  delayReduction: "25 MIN → 9 MIN",
  confidence: "90%"
}
  },

  track: {
    score: 94,
    priority: "CRITICAL PRIORITY",
    affected: 11,
    delay: "45 MIN",
    severity: "CRITICAL",
    asset: "TRACK B",
    impact: "CRITICAL",
    reason:
      "Track blockage creates the largest blast radius, forcing rerouting and causing cascading timetable conflicts across the network.",
      recovery: {
  title: "Network Rerouting Plan",
  action1: "Reroute dependent trains through alternate track paths",
  action2: "Resequence high-priority train movements",
  action3: "Reserve emergency maintenance access window",
  action4: "Continuously optimize the timetable as Track B recovers",
  delayReduction: "45 MIN → 16 MIN",
  confidence: "94%"
}
  }
}
const activeScenario = scenario
  ? scenarioData[scenario]
  : scenarioData.machine
const handleLogin = (e) => {
    e.preventDefault()

    if (
      (employeeId === 'ADMIN01' ||
        employeeId === 'MAINT01' ||
        employeeId === 'OPS01') &&
      password === 'railguard'
    ) {
      setError('')
      setLoggedIn(true)
      runBackend('baseline')
    } else {
      setError('Invalid Employee ID or Password')
    }
  }

  if (loggedIn) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <div>
            <h1>RAILGUARD <span>AI</span></h1>
            <p>INTELLIGENT RAILWAY MAINTENANCE COMMAND CENTER</p>
          </div>
<div className="live-demo-badge">
  <span className="demo-live-dot"></span>
  LIVE DEMO MODE
</div>
          <div className="user-section">
            <div>
              <strong>{role}</strong>
              <p>EMPLOYEE: {employeeId}</p>
            </div>

            <div className="online-status">
              <span>●</span> SYSTEM ONLINE
            </div>
          </div>
        </header>

        <main className="dashboard-content">
          <section className="welcome-section">
            <div>
              <p className="eyebrow">LIVE OPERATIONS</p>
              <h2>Good Evening, {role}</h2>
              <p>
                Railway network monitoring and maintenance intelligence
                system is operating normally.
              </p>
            </div>

            <div className="status-actions">
  <div className={emergency ? "network-status emergency-status" : "network-status"}>
    <span className="status-dot"></span>
    {emergency ? "NETWORK DISRUPTION DETECTED" : "NETWORK STATUS: OPTIMAL"}
  </div>

<div className="demo-actions">
  {!assetAnalyzed && !analyzingAsset && (
    <button
      className="asset-analysis-button"
      onClick={() => {
        setAnalyzingAsset(true)

        setTimeout(() => {
          setAnalyzingAsset(false)
          setAssetAnalyzed(true)
        }, 3000)
      }}
    >
      🧪 RUN LIVE ASSET ANALYSIS
    </button>
  )}

  {analyzingAsset && (
    <button className="asset-analysis-button analyzing" disabled>
      🧠 ANALYZING SENSOR DATA...
    </button>
  )}

  {assetAnalyzed && !emergency && (
    <button
      className="emergency-button"
      onClick={() => {
        setEmergency(true)
        runBackend('track_failure')
        setReoptimized(false)
        setAnalyzing(false)
      }}
    >
      🚨 ESCALATE TO NETWORK IMPACT
    </button>
  )}

  {emergency && (
    <button
      className="reset-button"
      onClick={() => {
        setEmergency(false)
        setReoptimized(false)
        setAnalyzing(false)
        setAssetAnalyzed(false)
        setAnalyzingAsset(false)
        setScenario(null)
        setBackendResult(null)
        setBackendError('')
      }}
    >
      ↻ RESET DEMO
    </button>
  )}
</div>
</div>
</section>

<section className="asset-diagnostic backend-panel">
  <div className="diagnostic-header">
    <div>
      <p className="eyebrow">RAILSYNC BACKEND · LIVE OPTIMIZER</p>
      <h2>Operational Scheduling State</h2>
      <p className="sub">Real timetable, crew, maintenance, rake and traffic-aware rerouting data.</p>
    </div>
    <button className="asset-analysis-button" onClick={() => runBackend('baseline')} disabled={backendLoading}>
      {backendLoading ? '⟳ OPTIMIZING...' : '↻ REFRESH OPTIMIZATION'}
    </button>
  </div>
  <div className="scenario-grid backend-scenarios">
    <button className="scenario-card" onClick={() => runBackend('no_maintenance')} disabled={backendLoading}><strong>No maintenance</strong><small>Prove timetable and crew planning still run</small></button>
    <button className="scenario-card" onClick={() => runBackend('track_failure')} disabled={backendLoading}><strong>Track-B failure</strong><small>Traffic-aware alternate-route search</small></button>
    <button className="scenario-card" onClick={() => runBackend('blocked_alternate')} disabled={backendLoading}><strong>Blocked alternate</strong><small>Halted train forces manual review</small></button>
    <button className="scenario-card" onClick={() => runBackend('condition_alert')} disabled={backendLoading}><strong>Condition alert</strong><small>Generate urgent rake inspection</small></button>
    <button className="scenario-card" onClick={() => runBackend('back_to_back_critical')} disabled={backendLoading}><strong>Two critical alerts</strong><small>Sequence alerts and escalate impossible cases</small></button>
  </div>
  {backendError && <p className="error">{backendError}</p>}
  {backendResult && (
    <>
      <div className="sensor-grid">
        <div className="sensor-card"><span>TRAINS</span><strong>{backendScenario?.train_operations?.length ?? '—'}</strong><small>Timetable movements loaded</small></div>
        <div className="sensor-card"><span>SAFE JOBS</span><strong>{backendResult.metrics?.scheduled_jobs ?? 0}</strong><small>Maintenance slots assigned</small></div>
        <div className="sensor-card"><span>CREW COVERAGE</span><strong>{backendResult.metrics?.crew_covered_duties ?? 0}</strong><small>{backendResult.metrics?.crew_uncovered_duties ?? 0} manual review</small></div>
        <div className="sensor-card"><span>REROUTED</span><strong>{backendResult.metrics?.rerouted_trains ?? 0}</strong><small>Traffic checks applied</small></div>
      </div>
      <div className="ai-explanation">
        <div className="explanation-icon">🧠</div>
        <div><p className="eyebrow">EXPLAINABLE DECISION TRACE</p><h3>{backendScenario?.scenario_description || 'Baseline operating plan'}</h3>
          <p>{backendResult.train_plan?.filter(t => t.status !== 'on_plan').map(t => `${t.service}: ${t.reason}`).join(' · ') || 'No train disruption. Maintenance was placed around timetable occupancy, engineering windows and eligible crew.'}</p>
        </div>
      </div>
      {planOpen && <div className="ai-explanation">
        <div className="explanation-icon">🤖</div>
        <div><p className="eyebrow">AI MAINTENANCE PLAN · CONTROLLER ACTION</p>
          <h3>{workCompleted ? 'Work completed and acknowledged' : 'Recommended intervention sequence'}</h3>
          <p>{workCompleted ? 'The controller confirmed completion. The alert should be cleared only after inspection evidence and supervisor approval.' : (backendResult.decision_trace?.[0]?.reason || 'The optimizer is waiting for a safe maintenance decision.')}</p>
          <p><strong>Next steps:</strong> verify the asset, perform the scheduled job, attach inspection evidence, then confirm completion.</p>
          {!workCompleted && <button className="asset-analysis-button" onClick={() => setWorkCompleted(true)}>✓ MARK WORK COMPLETE</button>}
          {workCompleted && <span className="maintenance-required">✓ COMPLETED BY CONTROLLER</span>}
        </div>
      </div>}
      <div className="backend-job-list">
        {(backendResult.decision_trace || []).map(decision => <div className={`feed-item ${decision.status === 'manual_review' ? 'warning' : ''}`} key={decision.job_id}><span className="feed-time">{decision.start?.slice(11, 16) || 'REVIEW'}</span><p><strong>{decision.job_id} · {decision.status === 'scheduled' ? 'SCHEDULED' : 'MANUAL REVIEW'}</strong> — {decision.reason}<br/><small>{decision.checks.join(' · ')} · predicted {decision.predicted_duration_minutes} min</small><br/><button className="asset-analysis-button" onClick={() => { setPlanOpen(true); setWorkCompleted(false) }}>{decision.status === 'manual_review' ? 'OPEN MANUAL REVIEW' : 'OPEN AI PLAN'}</button></p></div>)}
      </div>
    </>
  )}
</section>
{analyzingAsset && (
  <section className="asset-diagnostic scanning">
    <div className="diagnostic-header">
      <div>
        <p className="eyebrow">LIVE ML PIPELINE</p>
        <h2>Analyzing Current Asset State</h2>
      </div>

      <div className="analysis-status">
        <span className="scan-dot"></span>
        PROCESSING LIVE SENSOR DATA
      </div>
    </div>

    <div className="sensor-grid">
      <div className="sensor-card">
        <span>RAIL WEAR</span>
        <strong>10.33 mm</strong>
        <small>Critical threshold exceeded</small>
      </div>

      <div className="sensor-card">
        <span>BEARING TEMPERATURE</span>
        <strong>93.43°C</strong>
        <small>Abnormal thermal condition</small>
      </div>

      <div className="sensor-card">
        <span>CLASSIFICATION ENGINE</span>
        <strong>SCANNING...</strong>
        <small>Failure detection model active</small>
      </div>

      <div className="sensor-card">
        <span>HEALTH ENGINE</span>
        <strong>CALCULATING...</strong>
        <small>Predicting asset health index</small>
      </div>
    </div>
  </section>
)}

{assetAnalyzed && (
  <section className="asset-diagnostic danger-diagnostic">
    <div className="diagnostic-header">
      <div>
        <p className="eyebrow">RAILGUARD AI · LIVE DIAGNOSTIC</p>
        <h2>Critical Asset Condition Detected</h2>
      </div>

      <div className="maintenance-required">
        🚨 MAINTENANCE REQUIRED
      </div>
    </div>

    <div className="sensor-grid">
      <div className="sensor-card danger">
        <span>RAIL WEAR</span>
        <strong>10.33 mm</strong>
        <small>Extreme wear detected</small>
      </div>

      <div className="sensor-card danger">
        <span>BEARING TEMPERATURE</span>
        <strong>93.43°C</strong>
        <small>Excessive thermal condition</small>
      </div>

      <div className="sensor-card">
        <span>ML CLASSIFICATION</span>
        <strong className="danger-text">MAINTENANCE REQUIRED</strong>
        <small>High-recall failure detection</small>
      </div>

      <div className="sensor-card">
        <span>PREDICTED HEALTH INDEX</span>
        <strong>78.75</strong>
        <small>Regression output · indicative estimate</small>
      </div>
    </div>

    <div className="ai-explanation">
      <div className="explanation-icon">🧠</div>

      <div>
        <p className="eyebrow">RAILGUARD AI EXPLANATION</p>

        <h3>Why was this asset flagged?</h3>

        <p>
          The classification engine detected a maintenance-required state.
          Critical rail wear of <strong>10.33 mm</strong> combined with an
          excessive bearing temperature of <strong>93.43°C</strong> indicates
          a potentially dangerous operating condition. Immediate inspection
          is recommended before the condition escalates into a network-level
          disruption.
        </p>
      </div>
    </div>
  </section>
)}
{assetAnalyzed && (
  <section className="priority-intelligence">

    <div className="priority-header">
      <div>
        <p className="eyebrow">RAILGUARD AI · PRIORITY INTELLIGENCE</p>
        <h2>Dynamic Criticality Assessment</h2>
      </div>

      <div className="critical-badge">
        {activeScenario.priority}
      </div>
    </div>

    <div className="criticality-layout">

      <div className="criticality-main">
        <div className="criticality-score">
          <div className="score-circle">
            <strong>{activeScenario.score}</strong>
            <span>/100</span>
          </div>

          <div className="score-info">
            <p>ASSET CRITICALITY SCORE</p>
            <h3>{activeScenario.asset}</h3>
            <span>Immediate intervention recommended</span>
          </div>
        </div>

        <div className="score-bar">
          <div
  className="score-fill"
  style={{ width: `${activeScenario.score}%` }}
></div>
        </div>

        <div className="score-factors">
          <div>
            <span>SAFETY RISK</span>
            <strong>HIGH</strong>
          </div>

          <div>
            <span>NETWORK IMPACT</span>
            <strong>HIGH</strong>
          </div>

          <div>
            <span>ASSET CONDITION</span>
            <strong>CRITICAL</strong>
          </div>

          <div>
            <span>TRAFFIC EXPOSURE</span>
            <strong>HIGH</strong>
          </div>
        </div>
      </div>


      <div className="priority-queue">

        <div className="queue-title">
          <span>⚡</span>
          <div>
            <p>SMART PRIORITY QUEUE</p>
            <small>AI-ranked intervention order</small>
          </div>
        </div>

        <div className="queue-item active-priority">
          <span className="queue-rank">01</span>

          <div className="queue-asset">
            <strong>🔴 M-02</strong>
            <small>Critical sensor anomaly</small>
          </div>

          <span className="queue-score critical-score">87</span>
        </div>

        <div className="queue-item">
          <span className="queue-rank">02</span>

          <div className="queue-asset">
            <strong>🟠 TRACK B</strong>
            <small>High network dependency</small>
          </div>

          <span className="queue-score high-score">72</span>
        </div>

        <div className="queue-item">
          <span className="queue-rank">03</span>

          <div className="queue-asset">
            <strong>🟡 M-07</strong>
            <small>Maintenance approaching</small>
          </div>

          <span className="queue-score medium-score">48</span>
        </div>

        <div className="queue-item">
          <span className="queue-rank">04</span>

          <div className="queue-asset">
            <strong>🟢 M-01</strong>
            <small>Normal operating range</small>
          </div>

          <span className="queue-score low-score">12</span>
        </div>

      </div>

    </div>

    <div className="priority-ai-reason">
      <span>🧠</span>
      <p>
        <strong>Why is M-02 ranked #1?</strong>
        The priority engine combines safety risk, sensor anomalies,
        asset condition, network dependency and traffic exposure.
        M-02 has the highest combined disruption score and is therefore
        prioritized for immediate intervention.
      </p>
    </div>

  </section>
)}
{assetAnalyzed && (
  <section className="blast-radius-panel">

    <div className="blast-header">
      <div>
        <p className="eyebrow">RAILGUARD AI · RIPPLE EFFECT ENGINE</p>
        <h2>Live Dependency & Blast Radius Analysis</h2>
        <p className="blast-subtitle">
          Tracing how the detected asset risk propagates through railway operations.
        </p>
      </div>

      <div className="blast-status">
        <span className="blast-pulse"></span>
        5 ENTITIES AT RISK
      </div>
    </div>

    <div className="dependency-chain">

      <div className="dependency-node failure-node">
        <div className="node-icon">🚨</div>
        <div>
          <span>ORIGIN EVENT</span>
          <strong>M-02</strong>
          <small>Critical asset anomaly</small>
        </div>
      </div>

      <div className="dependency-arrow">
        <span>↓</span>
        <small>maintenance required</small>
      </div>

      <div className="dependency-node">
        <div className="node-icon">🔧</div>
        <div>
          <span>DEPENDENCY 01</span>
          <strong>JOB M14</strong>
          <small>Emergency maintenance job</small>
        </div>
      </div>

      <div className="dependency-arrow">
        <span>↓</span>
        <small>resource allocation</small>
      </div>

      <div className="dependency-node">
        <div className="node-icon">👷</div>
        <div>
          <span>DEPENDENCY 02</span>
          <strong>CREW C-02</strong>
          <small>Maintenance crew reassigned</small>
        </div>
      </div>

      <div className="dependency-arrow">
        <span>↓</span>
        <small>track access required</small>
      </div>

      <div className="dependency-node track-node">
        <div className="node-icon">🛤️</div>
        <div>
          <span>DEPENDENCY 03</span>
          <strong>TRACK B</strong>
          <small>Maintenance window conflict</small>
        </div>
      </div>

      <div className="dependency-arrow">
        <span>↓</span>
        <small>schedule disruption</small>
      </div>

      <div className="dependency-node train-node">
        <div className="node-icon">🚆</div>
        <div>
          <span>DEPENDENCY 04</span>
          <strong>T204</strong>
          <small>Predicted delay: 12 minutes</small>
        </div>
      </div>

    </div>

    <div className="blast-metrics">

      <div className="blast-metric">
        <span>AFFECTED ENTITIES</span>
        <strong>{activeScenario.affected}</strong>
      </div>

      <div className="blast-metric">
        <span>NETWORK CRITICALITY</span>
        <strong className="metric-danger">
  {activeScenario.score}/100
</strong>
      </div>

      <div className="blast-metric">
        <span>PREDICTED DELAY</span>
        <strong>{activeScenario.delay}</strong>
      </div>

      <div className="blast-metric">
        <span>DISRUPTION SEVERITY</span>
        <strong className="metric-danger">
  {activeScenario.severity}
</strong>
      </div>

    </div>

    <div className="blast-ai-summary">
      <span>🧠</span>

      <div>
        <p className="eyebrow">AI IMPACT SUMMARY</p>
        <p>
          
  {activeScenario.reason}

        </p>
      </div>
    </div>

  </section>
)}

{assetAnalyzed && (
  <section className="recovery-panel">

    <div className="recovery-header">
      <div>
        <p className="eyebrow">RAILGUARD AI · RECOVERY ENGINE</p>
        <h2>AI-Generated Recovery Strategy</h2>
        <p>
          Recommended operational response based on the current disruption scenario.
        </p>
      </div>

      <div className="recovery-status">
        <span className="recovery-dot"></span>
        AI PLAN READY
      </div>
    </div>

    <div className="recovery-main">

      <div className="recovery-plan">

        <div className="recovery-plan-title">
          <div className="recovery-icon">🤖</div>

          <div>
            <span>RECOMMENDED STRATEGY</span>
            <h3>{activeScenario.recovery.title}</h3>
          </div>
        </div>

        <div className="recovery-actions">

          <div className="recovery-action">
            <span>01</span>
            <p>{activeScenario.recovery.action1}</p>
          </div>

          <div className="recovery-action">
            <span>02</span>
            <p>{activeScenario.recovery.action2}</p>
          </div>

          <div className="recovery-action">
            <span>03</span>
            <p>{activeScenario.recovery.action3}</p>
          </div>

          <div className="recovery-action">
            <span>04</span>
            <p>{activeScenario.recovery.action4}</p>
          </div>

        </div>

      </div>


      <div className="recovery-impact">

        <p className="eyebrow">PROJECTED RECOVERY</p>

        <div className="impact-metric">
          <span>DELAY REDUCTION</span>
          <strong>{activeScenario.recovery.delayReduction}</strong>
        </div>

        <div className="impact-metric">
          <span>AI CONFIDENCE</span>
          <strong>{activeScenario.recovery.confidence}</strong>
        </div>

        <div className="impact-metric">
          <span>PRIORITY LEVEL</span>
          <strong>{activeScenario.priority}</strong>
        </div>

        <div className="recovery-message">
          🧠 The AI recovery engine has evaluated the disruption,
          available resources and network dependencies to generate
          the recommended intervention sequence.
        </div>

      </div>

    </div>

  </section>
)}
{assetAnalyzed && (
  <section className="decision-timeline-panel">

    <div className="decision-timeline-header">
      <div>
        <p className="eyebrow">RAILGUARD AI · EXPLAINABLE DECISION TRACE</p>
        <h2>How RailGuard Reached This Decision</h2>
        <p>
          A transparent step-by-step trace from raw sensor anomaly to the
          recommended recovery strategy.
        </p>
      </div>

      <div className="trace-status">
        <span className="trace-dot"></span>
        DECISION TRACE COMPLETE
      </div>
    </div>

    <div className="decision-timeline">

      <div className="timeline-step">
        <div className="timeline-marker">01</div>

        <div className="timeline-content">
          <span className="timeline-label">LIVE SENSOR INPUT</span>
          <h3>Asset anomaly detected</h3>
          <p>
            Rail wear and bearing temperature readings exceeded safe
            operating thresholds.
          </p>

          <div className="timeline-tag danger-tag">
            SENSOR ANOMALY
          </div>
        </div>
      </div>


      <div className="timeline-step">
        <div className="timeline-marker">02</div>

        <div className="timeline-content">
          <span className="timeline-label">ML CLASSIFICATION ENGINE</span>
          <h3>Maintenance required</h3>
          <p>
            The failure detection model classified the current asset state
            as requiring immediate maintenance attention.
          </p>

          <div className="timeline-tag warning-tag">
            FAILURE RISK DETECTED
          </div>
        </div>
      </div>


      <div className="timeline-step">
        <div className="timeline-marker">03</div>

        <div className="timeline-content">
          <span className="timeline-label">CRITICALITY ENGINE</span>
          <h3>
            Network risk scored at {activeScenario.score}/100
          </h3>

          <p>
            RailGuard evaluated operational importance, disruption potential,
            asset dependency and failure severity.
          </p>

          <div className="timeline-tag critical-tag">
            {activeScenario.priority}
          </div>
        </div>
      </div>


      <div className="timeline-step">
        <div className="timeline-marker">04</div>

        <div className="timeline-content">
          <span className="timeline-label">RIPPLE EFFECT ENGINE</span>
          <h3>
            {activeScenario.affected} entities predicted to be affected
          </h3>

          <p>
            The dependency engine traced the potential disruption through
            crews, maintenance jobs, track access and train operations.
          </p>

          <div className="timeline-tag info-tag">
            {activeScenario.delay} PROJECTED DELAY
          </div>
        </div>
      </div>


      <div className="timeline-step">
        <div className="timeline-marker">05</div>

        <div className="timeline-content">
          <span className="timeline-label">SCENARIO INTELLIGENCE</span>
          <h3>
            {scenario
              ? `${activeScenario.asset} disruption simulated`
              : "Baseline disruption scenario evaluated"}
          </h3>

          <p>
            RailGuard compared the current network state with the selected
            disruption scenario to estimate downstream consequences.
          </p>

          <div className="timeline-tag simulation-tag">
            {scenario ? "SIMULATION ACTIVE" : "BASELINE ANALYSIS"}
          </div>
        </div>
      </div>


      <div className="timeline-step final-decision-step">
        <div className="timeline-marker ai-marker">AI</div>

        <div className="timeline-content">
          <span className="timeline-label">AI RECOVERY ENGINE</span>

          <h3>{activeScenario.recovery.title}</h3>

          <p>
            RailGuard generated a prioritized intervention sequence and
            predicts a reduction in operational delay from the current
            disruption level.
          </p>

          <div className="timeline-tag success-tag">
            {activeScenario.recovery.delayReduction}
          </div>
        </div>
      </div>

    </div>

  </section>
)}
{/* WHAT-IF SIMULATOR */}

{assetAnalyzed && !emergency && (
  <section className="whatif-panel">
    <div className="whatif-header">
      <div>
        <p className="eyebrow">RAILGUARD AI · WHAT-IF SIMULATOR</p>
        <h2>Simulate a Network Disruption</h2>
        <p>
          Test potential disruptions and predict their operational impact
          before they escalate.
        </p>
      </div>

      <div className="simulation-status">
        {scenario ? "SCENARIO ACTIVE" : "AWAITING SIMULATION"}
      </div>
    </div>

    <div className="scenario-grid">

      <button
        className={`scenario-card ${scenario === "machine" ? "selected" : ""}`}
        onClick={() => setScenario("machine")}
      >
        <span className="scenario-icon">🚜</span>
        <strong>Machine Failure</strong>
        <small>Critical maintenance machine unavailable</small>
      </button>

      <button
        className={`scenario-card ${scenario === "train" ? "selected" : ""}`}
        onClick={() => setScenario("train")}
      >
        <span className="scenario-icon">🚆</span>
        <strong>Train Delay</strong>
        <small>Simulate a 30-minute schedule delay</small>
      </button>

      <button
        className={`scenario-card ${scenario === "weather" ? "selected" : ""}`}
        onClick={() => setScenario("weather")}
      >
        <span className="scenario-icon">🌧️</span>
        <strong>Heavy Rain</strong>
        <small>Reduced speed and track accessibility</small>
      </button>

      <button
        className={`scenario-card ${scenario === "crew" ? "selected" : ""}`}
        onClick={() => setScenario("crew")}
      >
        <span className="scenario-icon">👷</span>
        <strong>Crew Unavailable</strong>
        <small>Maintenance crew suddenly unavailable</small>
      </button>

      <button
        className={`scenario-card ${scenario === "track" ? "selected" : ""}`}
        onClick={() => { setScenario("track"); runBackend("track_failure") }}
      >
        <span className="scenario-icon">🛤️</span>
        <strong>Track Blockage</strong>
        <small>Temporary closure of Track B</small>
      </button>

    </div>

    {scenario && (
      <div className="scenario-result">

        <div className="scenario-result-icon">
          🔮
        </div>

        <div>
          <p className="eyebrow">SIMULATION RESULT</p>

          <h3>
            {scenario === "machine" && "Machine Failure Scenario"}
            {scenario === "train" && "Train Delay Scenario"}
            {scenario === "weather" && "Heavy Rain Scenario"}
            {scenario === "crew" && "Crew Unavailability Scenario"}
            {scenario === "track" && "Track Blockage Scenario"}
          </h3>

          <p>
            {scenario === "machine" &&
              "M-02 failure increases maintenance demand and creates resource allocation conflicts."}

            {scenario === "train" &&
              "A 30-minute delay creates downstream scheduling conflicts and increases network congestion."}

            {scenario === "weather" &&
              "Heavy rainfall reduces safe operating speeds and may restrict maintenance access to affected sectors."}

            {scenario === "crew" &&
              "Crew unavailability delays emergency maintenance and requires alternative resource assignment."}

            {scenario === "track" &&
              "Track B blockage forces rerouting and creates cascading timetable conflicts for dependent trains."}
          </p>
        </div>

        <div className="scenario-impact">
          <span>AI IMPACT</span>

          <strong>
            {scenario === "machine" && "HIGH"}
            {scenario === "train" && "HIGH"}
            {scenario === "weather" && "MEDIUM"}
            {scenario === "crew" && "HIGH"}
            {scenario === "track" && "CRITICAL"}
          </strong>
        </div>

      </div>
    )}

  </section>
)}

        {emergency && !reoptimized && (
  <section className="emergency-alert">
    <div className="alert-icon">⚠</div>

    <div className="alert-content">
      <p className="eyebrow">CRITICAL EVENT DETECTED</p>
      <h2>Machine M-02 Failure Detected</h2>
      <p>
        AI Ripple-Effect Engine is analysing the impact across
        maintenance, crews, trains and track availability.
      </p>
    </div>

    <button
  className="analyze-button"
  onClick={() => {
    setAnalyzing(true)

    setTimeout(() => {
      setAnalyzing(false)
      setReoptimized(true)
    }, 5000)
  }}
>
  ANALYZE & RE-OPTIMIZE →
</button>
  </section>
)}
{analyzing && (
  <section className="ai-analysis">
    <div className="analysis-header">
      <div className="ai-spinner"></div>

      <div>
        <p className="eyebrow">RAILGUARD AI ENGINE</p>
        <h2>Analyzing Network Disruption...</h2>
      </div>
    </div>

    <div className="analysis-steps">
      <div className="analysis-step">
        <span>✓</span>
        Scanning railway assets and machine availability
      </div>

      <div className="analysis-step">
        <span>✓</span>
        Detecting crew and maintenance conflicts
      </div>

      <div className="analysis-step">
        <span>✓</span>
        Calculating ripple effect across Train T204
      </div>

      <div className="analysis-step">
        <span>✓</span>
        Searching compatible replacement machines
      </div>

      <div className="analysis-step active-analysis">
        <span>◌</span>
        Optimizing 3,482 possible maintenance schedules...
      </div>
    </div>

    <div className="analysis-progress">
      <div className="analysis-progress-bar"></div>
    </div>
  </section>
)}
{reoptimized && (
  <section className="reoptimized-alert">
    <div className="success-icon">✓</div>

    <div>
      <p className="eyebrow">AI AUTONOMOUS RESPONSE</p>
      <h2>AUTONOMOUS RE-OPTIMIZATION COMPLETE</h2>
      <p>
        Machine M-05 and Crew C-03 have been assigned.
        Maintenance schedule automatically rebuilt with minimal
        passenger disruption.
      </p>
    </div>
  </section>
)}  
{reoptimized && (
  <section className="impact-comparison">
    <div className="impact-comparison-header">
      <div>
        <p className="eyebrow">MEASURABLE AI IMPACT</p>
        <h2>Before vs After RAILGUARD AI</h2>
      </div>

      <div className="ai-impact-badge">
        ✦ OPTIMIZATION COMPLETE
      </div>
    </div>

    <div className="impact-grid">

      <div className="impact-card">
        <div className="impact-icon">🚆</div>
        <p>TRAIN DELAY</p>

        <div className="impact-values">
          <span className="before-value">12 min</span>
          <span className="impact-arrow">→</span>
          <strong>5 min</strong>
        </div>

        <small>58% disruption reduction</small>
      </div>

      <div className="impact-card">
        <div className="impact-icon">⚠</div>
        <p>RESOURCE CONFLICTS</p>

        <div className="impact-values">
          <span className="before-value">1</span>
          <span className="impact-arrow">→</span>
          <strong>0</strong>
        </div>

        <small>Conflict automatically resolved</small>
      </div>

      <div className="impact-card">
        <div className="impact-icon">🚜</div>
        <p>MACHINE STATUS</p>

        <div className="impact-values">
          <span className="before-value">FAILED</span>
          <span className="impact-arrow">→</span>
          <strong>M-05 ✓</strong>
        </div>

        <small>Compatible replacement assigned</small>
      </div>

      <div className="impact-card">
        <div className="impact-icon">⚡</div>
        <p>REPLANNING TIME</p>

        <div className="impact-values">
          <span className="before-value">MANUAL</span>
          <span className="impact-arrow">→</span>
          <strong>5 SEC</strong>
        </div>

        <small>Autonomous schedule rebuild</small>
      </div>

    </div>
  </section>
)}
          <section className="stats-grid">
            <div className="stat-card">
              <p>ACTIVE TRAINS</p>
              <h3>{backendScenario?.train_operations?.length ?? 3}</h3>
              <span>{backendResult?.metrics?.rerouted_trains ? `${backendResult.metrics.rerouted_trains} rerouted by optimizer` : 'All operating normally'}</span>
            </div>

            <div className="stat-card">
              <p>MAINTENANCE JOBS</p>
              <h3>{backendResult?.metrics?.scheduled_jobs ?? 3}</h3>
              <span>
  {reoptimized
    ? 'Conflict resolved automatically ✓'
    : '1 critical priority'}
</span>
            </div>

            <div className="stat-card">
              <p>AVAILABLE CREWS</p>
              <h3>3</h3>
              <span>Ready for deployment</span>
            </div>

            <div className="stat-card danger-card">
              <p>NETWORK RISK</p>
              <h3>HIGH</h3>
              <span>Track T-07 requires attention</span>
            </div>
          </section>
{emergency && (
  <section className="ripple-panel">
    <div className="ripple-header">
      <div>
        <p className="eyebrow">AI RIPPLE-EFFECT ANALYSIS</p>
        <h2>
          {reoptimized
            ? 'Disruption Contained & Plan Rebuilt'
            : 'Failure Impact Propagation'}
        </h2>
      </div>

      <span className={reoptimized ? 'resolved-badge' : 'impact-badge'}>
        {reoptimized ? '✓ RESOLVED' : '4 SYSTEMS IMPACTED'}
      </span>
    </div>

    <div className="ripple-flow">

      <div className={reoptimized ? 'ripple-node resolved' : 'ripple-node failed'}>
        <span className="ripple-icon">🚜</span>
        <div>
          <strong>Machine M-02</strong>
          <small>
            {reoptimized ? 'Replaced by M-05' : 'FAILURE DETECTED'}
          </small>
        </div>
      </div>

      <div className="ripple-arrow">→</div>

      <div className={reoptimized ? 'ripple-node resolved' : 'ripple-node impacted'}>
        <span className="ripple-icon">🔧</span>
        <div>
          <strong>Job M14</strong>
          <small>
            {reoptimized ? 'Schedule rebuilt' : 'MAINTENANCE DELAY'}
          </small>
        </div>
      </div>

      <div className="ripple-arrow">→</div>

      <div className={reoptimized ? 'ripple-node resolved' : 'ripple-node impacted'}>
        <span className="ripple-icon">👷</span>
        <div>
          <strong>Crew C-02</strong>
          <small>
            {reoptimized ? 'C-03 auto-assigned' : 'RESOURCE CONFLICT'}
          </small>
        </div>
      </div>

      <div className="ripple-arrow">→</div>

      <div className={reoptimized ? 'ripple-node resolved' : 'ripple-node impacted'}>
        <span className="ripple-icon">🚆</span>
        <div>
          <strong>Train T204</strong>
          <small>
            {reoptimized ? 'Delay reduced to 5 min' : '12 MIN DELAY RISK'}
          </small>
        </div>
      </div>

    </div>

    {reoptimized && (
      <div className="ai-decision">
        <span>✦</span>
        <p>
          <strong>AI Decision:</strong> Machine M-05 was selected because it
          is the nearest available compatible machine. Crew C-03 was assigned
          to eliminate the resource conflict and reduce projected passenger
          disruption from <strong>12 minutes to 5 minutes.</strong>
        </p>
      </div>
    )}
  </section>
)}
          <section className="command-grid">
            <div className="command-card railway-map">
              <div className="card-header">
                <div>
                  <p className="eyebrow">LIVE DIGITAL TWIN</p>
                  <h3>Railway Network</h3>
                </div>

                <span className="live-badge">● LIVE</span>
              </div>

            <div className="map-area">

  <div className="map-controls">
    <button>+</button>
    <button>−</button>
    <button>⌾</button>
  </div>

  <div className="rail-line rail-a-b"></div>
  <div className="rail-line rail-b-c"></div>
  <div className="rail-line rail-a-c"></div>
  <div className="rail-line rail-c-d"></div>
  <div className="rail-line rail-d-risk"></div>
  <div className="rail-line rail-risk-e danger-track"></div>
  <div className="rail-line rail-c-f"></div>
  <div className="rail-line rail-f-g"></div>
  <div className="rail-line rail-e-g"></div>

  <span className="signal signal-1"></span>
  <span className="signal signal-2"></span>
  <span className="signal signal-3"></span>
  <span className="signal signal-4"></span>
  <span className="signal signal-5"></span>

  <div className="station station-a">
    <span>A</span>
    <p>ALPHA JN</p>
  </div>

  <div className="station station-b">
    <span>B</span>
    <p>BRAVO JN</p>
  </div>

  <div className="station station-c">
    <span>C</span>
    <p>CHARLIE JN</p>
  </div>

  <div className="station station-d">
    <span>D</span>
    <p>DELTA JN</p>
  </div>

  <div className="station station-e">
    <span>E</span>
    <p>ECHO JN</p>
  </div>

  <div className="station station-f">
    <span>F</span>
    <p>FOXTROT JN</p>
  </div>

  <div className="station station-g">
    <span>G</span>
    <p>GOLF JN</p>
  </div>

  <div className="train train-1">
    <span>🚆</span>
    <strong>T101</strong>
  </div>

  <div className="train train-2">
    <span>🚆</span>
    <strong>T204</strong>
  </div>

  <div className="train train-3">
    <span>🚆</span>
    <strong>T305</strong>
  </div>

  <div className="risk-node">
    <b>⚠</b>
    <span>T-07</span>
  </div>

</div>

<div className="map-legend"></div>

              <div className="map-legend">
                <span><i className="green"></i> Operational</span>
                <span><i className="blue"></i> Active Train</span>
                <span><i className="red"></i> High Risk</span>
              </div>
            </div>

            <div className="command-card intelligence-card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">AI ASSET INTELLIGENCE</p>
                  <h3>{backendResult?.risk_summary?.asset || 'Network baseline'}</h3>
                </div>

                <span className="risk-badge">{backendResult?.risk_summary?.severity || 'RISK'} RISK</span>
              </div>

              <div className="risk-score">
                <div className="score-circle">
                  <strong>{backendResult?.risk_summary?.score ?? 0}%</strong>
                  <span>RISK</span>
                </div>

                <div className="risk-details">
                  <p><span>Active alerts</span> <strong>{backendResult?.risk_summary?.active_alerts ?? 0}</strong></p>
                  <p><span>Vibration</span> <strong>HIGH</strong></p>
                  <p><span>Risk basis</span> <strong>{backendResult?.risk_summary?.basis || 'Backend'}</strong></p>
                </div>
              </div>

              <div className="ai-recommendation">
                <span>✦</span>
                <p>
                  Backend risk assessment: <strong>{backendResult?.risk_summary?.severity || 'Normal'}</strong> condition alert requires controller review.
                </p>
              </div>

              <button className="primary-action" onClick={() => { setPlanOpen(true); setTimeout(() => document.querySelector('.backend-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }}>
                VIEW MAINTENANCE PLAN →
              </button>
            </div>
          </section>

          <section className="bottom-grid">
            <div className="command-card">
              <p className="eyebrow">CURRENT MAINTENANCE</p>
              <h3>Job M14 — Critical Track Repair</h3>

              <div className="job-info">
                <p>🛤 Track: <strong>T-07</strong></p>
                <p>
  🚜 Machine:{' '}
  <strong className={reoptimized ? 'updated-value' : ''}>
    {reoptimized ? 'M-05 ✓' : 'M-02'}
  </strong>
</p>
                <p>
  👷 Crew:{' '}
  <strong className={reoptimized ? 'updated-value' : ''}>
    {reoptimized ? 'C-03 ✓' : 'C-02'}
  </strong>
</p>
                <p>
  ⏱ Schedule:{' '}
  <strong className={reoptimized ? 'updated-value' : ''}>
    {reoptimized ? '14:40 – 15:15 ✓' : '14:30 – 15:10'}
  </strong>
</p>
              </div>
            </div>

            <div className="command-card system-feed">
              <p className="eyebrow">LIVE SYSTEM FEED</p>

              <div className="feed-item">
                <span className="feed-time">14:02</span>
                <p>Train T101 entered Track T-01</p>
              </div>

              <div className="feed-item">
                <span className="feed-time">14:08</span>
                <p>AI detected abnormal wear on T-07</p>
              </div>

              <div className="feed-item warning">
                <span className="feed-time">14:12</span>
                <p>Maintenance Job M14 prioritized</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="background-grid"></div>

      <div className="login-container">
        <div className="logo-section">
          <div className="train-icon">🚂</div>
          <h1>RAILGUARD <span>AI</span></h1>
          <p>INTELLIGENT RAILWAY MAINTENANCE COMMAND CENTER</p>
        </div>

        <div className="login-card">
          <h2>Secure Access</h2>
          <p className="subtitle">Authorized Railway Personnel Only</p>

          <form onSubmit={handleLogin}>
            <label>Employee ID</label>

            <input
              type="text"
              placeholder="Enter Employee ID"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            />

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label>Access Role</label>

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option>Operations Controller</option>
              <option>Maintenance Manager</option>
              <option>Railway Administrator</option>
            </select>

            {error && <p className="error">{error}</p>}

            <button type="submit">
              ACCESS COMMAND CENTER →
            </button>
          </form>

          <div className="security-status">
            <span>●</span> SECURE RAILWAY NETWORK
          </div>
        </div>

        <div className="system-info">
          RAILGUARD AI v1.0 | SYSTEM STATUS: ONLINE
        </div>
      </div>
    </div>
  )
}

export default App