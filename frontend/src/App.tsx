import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { ChatWindow } from './components/ChatWindow';
import { InboxList } from './components/InboxList';
import { LoginScreen } from './components/LoginScreen';
import { LockScreen } from './components/LockScreen';
import { SystemDashboard } from './components/SystemDashboard';
import { LiveIntercept } from './components/LiveIntercept';
import { MockScammerAPI } from './lib/MockScammerAPI';
import { HoneypotAgent } from './lib/HoneypotAgent';
import { IntelligenceService } from './lib/IntelligenceService';
import { IntelligenceReport } from './components/IntelligenceReport';
import { soundManager } from './lib/SoundManager';
import { GeoTracer } from './lib/GeoTracer';
import { Play, Database, Volume2, VolumeX, ShieldAlert, LogOut, CheckCircle, BarChart3, ScanEye } from 'lucide-react';
import { DeepfakeAnalyzer } from './components/DeepfakeAnalyzer';
import { ForensicsService } from './lib/ForensicsService';
import { MediaLogService } from './lib/MediaLogService';
import { Anonymizer } from './lib/Anonymizer';
import { CyberCellService } from './lib/CyberCellService';
import { useAuth } from './context/AuthContext';
import { useThreads } from './context/ThreadProvider';
import type { Message, Thread, CaseFile, Scenario } from './lib/types';
import './index.css';

const EvidenceLocker = lazy(() => import('./components/EvidenceLocker').then(module => ({ default: module.EvidenceLocker })));


function App() {
  const { threads, setThreads, clearThreads } = useThreads();
  const { isAuthenticated, logout } = useAuth();

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [showLocker, setShowLocker] = useState(false);
  const [showForensics, setShowForensics] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Auto-clear notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);





  const isMonitoringRef = useRef(false);
  const apiRef = useRef(new MockScammerAPI());
  const agentsRef = useRef<Map<string, HoneypotAgent>>(new Map());
  const scammerProgressRef = useRef<Map<string, number>>(new Map());

  // Ref to track threads state preventing stale closures in async recursive calls
  const threadsRef = useRef<Thread[]>([]);
  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  const startMonitoring = () => {
    if (isMonitoringRef.current) return;
    setIsMonitoring(true);
    isMonitoringRef.current = true;
    setThreads([]);
    agentsRef.current.clear();
    scammerProgressRef.current.clear();
    simulateIncomingTraffic();
  };

  const simulateIncomingTraffic = async () => {
    if (!isMonitoringRef.current) return;
    spawnThread();
    await new Promise(r => setTimeout(r, 1500));
    spawnThread();
    await new Promise(r => setTimeout(r, 2000));
    spawnThread();
  };

  // Botnet Simulation Mode
  const triggerBotnetMode = async () => {
    if (!isMonitoringRef.current) startMonitoring();

    // Generate 50 threats instantly
    const botnetBatch = apiRef.current.generateBatch(50);

    // Ingest them with a stagger effect for visual impact
    for (let i = 0; i < botnetBatch.length; i++) {
      spawnBotnetThread(botnetBatch[i]);
      if (i % 5 === 0) await new Promise(r => setTimeout(r, 100)); // Slight stagger
    }
    soundManager.playAlert(); // Major alert
  };

  const spawnBotnetThread = (scenario: Scenario) => {

    const threadId = scenario.id;
    const agent = new HoneypotAgent();
    agentsRef.current.set(threadId, agent);
    scammerProgressRef.current.set(threadId, 1); // Start tracking from next message (1)

    const newThread: Thread = {
      id: threadId,
      scenarioId: scenario.id,
      senderName: scenario.senderName,
      source: scenario.source,
      messages: [],
      classification: null,
      isIntercepted: scenario.type === 'scam', // Only intercept if it's actually a scam
      isScanning: false, // Skip scanning for botnet, assume detected if scam
      location: scenario.location,
      detectedLocation: GeoTracer.trace(scenario.location),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${scenario.senderName}`,
      isCompromised: false,
      isArchived: false
    };

    setThreads((prev: Thread[]) => [newThread, ...prev]); // Add to top


    // Inject initial message immediately and trigger AI flow (silent mode)
    const initialMsg = scenario.messages[0];
    handleIncomingMessage(threadId, initialMsg, 'scammer', scenario.senderName, scenario.id, scenario.attachments, true);
  };

  const spawnThread = () => {
    if (!isMonitoringRef.current) return;
    const scenario = apiRef.current.getRandomScenario();
    const threadId = Math.random().toString(36).substring(7);
    const agent = new HoneypotAgent();
    agentsRef.current.set(threadId, agent);
    scammerProgressRef.current.set(threadId, 1); // Start tracking from next message

    const newThread: Thread = {
      id: threadId,
      scenarioId: scenario.id,
      senderName: scenario.senderName,
      source: scenario.source,
      messages: [],
      classification: null,
      isIntercepted: false,
      isScanning: true,
      location: scenario.location,
      detectedLocation: GeoTracer.trace(scenario.location),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${scenario.senderName}`,
      isCompromised: false,
      isArchived: false
    };

    setThreads((prev: Thread[]) => [...prev, newThread]);

    // setSelectedThreadId(prev => prev || threadId); // Don't auto-select so user can see Dashboard

    const initialMsg = scenario.messages[0];
    handleIncomingMessage(threadId, initialMsg, 'scammer', scenario.senderName, scenario.id, scenario.attachments);
  };

  const handleIncomingMessage = async (
    threadId: string,
    content: string,
    sender: 'scammer' | 'agent' | 'system',
    senderName?: string,
    scenarioId?: string,
    attachments?: any[], // Using any[] for brevity in replacement, will map to MediaType properly
    silent: boolean = false
  ) => {
    const threadStateAtStart = threadsRef.current.find(t => t.id === threadId);
    if (threadStateAtStart?.isBlocked && sender !== 'system') return;

    addMessageToThread(threadId, {
      id: Math.random().toString(36),
      sender,
      senderName,
      content,
      timestamp: Date.now(),
      isRedacted: false,
      attachments
    });

    if (sender === 'scammer') {
      if (!silent) soundManager.playNotification();

      // AUTOMATED FORENSICS CHECK
      let isMediaMalicious = false;
      if (attachments && attachments.length > 0) {
        setNotification("🔍 AUTOMATED FORENSICS: Analyzing incoming media...");

        for (const attachment of attachments) {
          const result = await ForensicsService.analyzeAutomated(Anonymizer.sanitizeFilename(attachment.name), attachment.type);
          const isFake = result.recommendation.includes('Manipulated') || result.authenticityScore < 40;

          MediaLogService.addLog({
            id: `log-${Date.now()}-${Math.random()}`,
            senderId: Anonymizer.anonymize(threadId),
            senderName: Anonymizer.anonymize(senderName || 'Unknown'),
            mediaType: attachment.type,
            confidence: result.confidenceLevel,
            action: isFake ? 'BLOCKED' : 'STORED',
            timestamp: Date.now(),
            result
          });

          if (isFake) {
            isMediaMalicious = true;

            // 1. SECURE SHREDDING: Wipe the media URL immediately
            const originalName = attachment.name;
            attachment.url = ""; // Shredded: No trace left in memory
            attachment.isShredded = true;

            // 2. PRIVACY-FIRST REPORTING: Forward to Cyber Cell
            CyberCellService.autoReport({
              conversationId: threadId,
              classification: 'scam',
              timestamp: new Date().toISOString(),
              confidenceScore: result.authenticityScore,
              transcript: [], // Actual reporting logic should pull thread history if needed
              iocs: {
                urls: [],
                domains: [],
                paymentMethods: [],
                sensitiveDataRedacted: 0
              }
            });

            console.warn(`%c[Shredder] ☢️ AUTOMATED DESTRUCTION COMPLETE: ${originalName} has been shredded into a million pieces.`, 'color: #ef4444; font-weight: bold;');
            break;
          }
        }
      }

      if (isMediaMalicious) {
        setNotification("🚨 FORENSICS ALERT: DEEPFAKE DETECTED. TERMINATING CONNECTION.");
        soundManager.playAlert();

        setThreads((prev: Thread[]) => prev.map(t => t.id === threadId ? { ...t, isBlocked: true, classification: 'scam' } : t));

        addMessageToThread(threadId, {
          id: `block-auto-${Date.now()}`,
          sender: 'system',
          content: "🛡️ AUTOMATED DEFENSE: Deepfake/Synthetic media detected. Evidence preserved and forwarded to Cyber Cell. Sender has been permanently blocked.",
          timestamp: Date.now()
        });

        return; // HALT all further processing for this thread
      }

      // Allow slight processing delay (simulated)
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 500));

      // Retrieve (or recover) the agent
      let agent = agentsRef.current.get(threadId);
      if (!agent) {
        // Defensive: Recover agent if missing
        agent = new HoneypotAgent();
        agentsRef.current.set(threadId, agent);
      }

      const scenario = scenarioId ? apiRef.current.getScenario(scenarioId) : undefined;
      const relationalContext = scenario?.relationalContext;

      // Classify the incoming message
      const { classification, safeText, intent, score, isCompromised, autoReported, missionComplete, scamType, iocs } = agent.ingest(content, threadId, relationalContext);

      // Record in Intelligence Service if it's a scam
      if (classification === 'scam' || classification === 'likely_scam') {
        IntelligenceService.recordScam({
          type: scamType,
          senderName: senderName || 'Unknown Threat',
          conversationId: threadId,
          identifiers: iocs
        });
      }



      // Check interception status from current state + new classification
      // Check interception status from current state + new classification
      // CRITICAL FIX: Use threadsRef to get latest state, avoiding stale closures in recursive calls
      const threadState = threadsRef.current.find(t => t.id === threadId);
      const wasIntercepted = threadState?.isIntercepted || false;
      const isNewInterception = classification === 'scam' || classification === 'likely_scam';

      // Log the decision factors
      console.log(`[Thread ${threadId}] Processing message. ScenarioId: ${scenarioId}, Class: ${classification}, WasIntercepted: ${wasIntercepted}`);

      // Logic refined: Only reply if it's explicitly a scam (new or existing).
      // AND Only if the mission is not yet complete (Capture & Kill Policy)
      const shouldReply = (isNewInterception || wasIntercepted) && !missionComplete && !threadState?.isBlocked;
      console.log(`[Thread ${threadId}] Should Reply? ${shouldReply} (MissionComplete: ${missionComplete}, Blocked: ${threadState?.isBlocked})`);

      setThreads((prev: Thread[]) => prev.map((t: Thread) => {
        if (t.id !== threadId) return t;

        // Trigger alert sound if this is a new interception (and not silent)
        if (!t.isIntercepted && isNewInterception && !silent) {
          soundManager.playAlert();
        }

        return {
          ...t,
          classification,
          isIntercepted: shouldReply || (missionComplete && t.isIntercepted), // Maintain intercepted status even if blocked
          isScanning: false,
          isBlocked: missionComplete || t.isBlocked,
          persona: agent!.currentPersona, // Use non-null assertion or optional chaining
          intent,
          threatScore: score,
          isCompromised: isCompromised || t.isCompromised,
          autoReported: autoReported || t.autoReported, // Capture auto-reporting status
          messages: t.messages.map((m: Message, idx: number) => {
            if (idx === t.messages.length - 1 && m.sender === 'scammer') {
              return { ...m, content: safeText, isRedacted: safeText !== content };
            }
            return m;
          })
        };
      }));

      // If mission is complete, add a system notification message and block further interaction
      if (missionComplete && !threadState?.isBlocked) {
        addMessageToThread(threadId, {
          id: `block-${Date.now()}`,
          sender: 'system',
          content: "🛡️ INTELLIGENCE CAPTURED: All necessary credentials obtained. Connection terminated. Scammer has been blocked from further contact.",
          timestamp: Date.now()
        });
        soundManager.playSuccess();
        setNotification(`Mission Complete: Scammer blocked for ${senderName || 'Unknown'}`);
      }

      // Trigger Notification for Auto-Reporting
      if (autoReported && !threadState?.autoReported) {
        const isCompromise = isCompromised || threadState?.isCompromised;
        const alertPrefix = isCompromise ? "🚩 COMPROMISE ALERT" : "🚨 AUTO-REPORTED";
        const alertMsg = isCompromise
          ? `Known contact ${senderName || 'Unknown'} appears compromised. Behavior anomaly reported to Cyber Cell.`
          : `High threat detected from ${senderName || 'Unknown'}. Evidence securely transmitted to Cyber Cell.`;

        setNotification(`${alertPrefix}: ${alertMsg}`);
        soundManager.playSuccess();
      }



      // Generate AI Response if Thread is Active/Intercepted
      if (shouldReply) {
        // Force 'scam' classification for response generation if we are replying to a "benign" message in a scam thread
        const effectiveClassification = (classification === 'benign') ? 'scam' : classification;
        const response = agent.generateResponse(effectiveClassification, content);

        console.log(`[Thread ${threadId}] Generated AI response: "${response?.substring(0, 20)}..."`);

        if (response) {
          // AI types for 1-2 seconds
          await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
          handleIncomingMessage(threadId, response, 'agent', undefined, scenarioId, undefined, silent);

          if (scenarioId) {
            // Simulate scammer replying back to the bait
            // Determine next step
            const currentStep = scammerProgressRef.current.get(threadId) || 1;
            console.log(`[Thread ${threadId}] Fetching scammer reply for step ${currentStep}`);
            let reply = await apiRef.current.getReplyForScenario(scenarioId, currentStep);

            // Failsafe: If reply is null even with fallback logic, force a generic one
            if (!reply) {
              console.warn(`[Thread ${threadId}] API returned null reply! Forcing fallback.`);
              reply = "What did you say?";
            }

            if (reply) {
              // Increment step for next time
              scammerProgressRef.current.set(threadId, currentStep + 1);

              // Reduced delay to keep momentum
              await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));

              // RECURSION: This keeps the loop alive
              try {
                console.log(`[Loop] Scammer replying in thread ${threadId} (Scenario: ${scenarioId})`);
                handleIncomingMessage(threadId, reply, 'scammer', undefined, scenarioId, undefined, silent);
              } catch (e) {
                console.error("Recursion error:", e);
              }
            } else {
              console.error(`[Loop] Scammer WENT SILENT in thread ${threadId}. Reply was null.`);
            }
          }
        }
      }
    }
  };

  const addMessageToThread = (threadId: string, msg: Message) => {
    setThreads((prev: Thread[]) => prev.map((t: Thread) => {
      if (t.id === threadId) {
        return { ...t, messages: [...t.messages, msg] };
      }
      return t;
    }));
  };


  const getCaseFiles = (): CaseFile[] => {
    const cases: CaseFile[] = [];


    threads.forEach((thread: Thread) => {

      // Only create cases for active threats or scanned threads
      if (!thread.classification && !thread.isIntercepted) return;
      if (thread.classification === 'benign') return; // Optional: Hide safe threads

      const agent = agentsRef.current.get(thread.id);
      if (!agent) return;

      const report = agent.getReport(thread.id, thread.classification || 'likely_scam', thread.messages);

      const threatLevel = report.classification || thread.classification || 'likely_scam';
      const isReported = report.autoReported || thread.autoReported || threatLevel === 'scam';

      const data = {
        id: thread.id,
        scammerName: thread.senderName,
        platform: thread.source,
        status: thread.isArchived ? 'closed' : 'active',
        threatLevel,
        iocs: report.iocs,
        transcript: thread.messages,
        timestamp: new Date(report.timestamp).toLocaleDateString(),
        detectedLocation: thread.detectedLocation, // Map the traced location
        autoReported: isReported
      };

      console.log(`[App] Case Entry: ${data.id}, Reported: ${data.autoReported}`);
      cases.push(data as CaseFile);
    });

    return cases;
  };

  const selectedThread = threads.find(t => t.id === selectedThreadId);

  /* Lock Screen State */
  const [isLocked, setIsLocked] = useState(false);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }


  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <>
      {/* Global Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          background: '#059669',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderLeft: '4px solid #10b981',
          animation: 'slideIn 0.3s ease-out',
          maxWidth: '400px',
          fontSize: '0.9rem',
          fontWeight: 500
        }}>
          <CheckCircle size={20} />
          <span>{notification}</span>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', opacity: 0.7 }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="messenger-container">
        {/* Sidebar */}
        <div className="sidebar">
          <InboxList
            threads={threads.map((t: Thread) => ({
              id: t.id,
              senderName: t.senderName,
              source: t.source,
              lastMessage: t.messages[t.messages.length - 1]?.content || '',
              classification: t.classification,
              isIntercepted: t.isIntercepted,
              persona: t.persona,
              autoReported: t.autoReported,
              isCompromised: t.isCompromised,
              isBlocked: t.isBlocked
            }))}

            selectedThreadId={selectedThreadId}
            onSelectThread={(id) => {
              if (id === 'DASHBOARD_VIEW') {
                setSelectedThreadId(null);
              } else {
                setSelectedThreadId(id);
              }
            }}
            onBack={selectedThreadId ? () => setSelectedThreadId(null) : undefined}
          />

          {/* Control Footer */}
          <div className="control-footer">
            {!isMonitoring ? (
              <button onClick={startMonitoring} className="btn btn-primary">
                <Play size={16} /> <span className="btn-text">INITIALIZE SYSTEM</span>
              </button>
            ) : (
              <>

                <button onClick={() => { setShowLocker(!showLocker); setShowIntelligence(false); setShowForensics(false); }} className={`nav-btn ${showLocker ? 'active' : ''}`}>
                  <Database size={18} /> Intelligence Locker
                </button>
                <button onClick={() => { setShowForensics(!showForensics); setShowLocker(false); setShowIntelligence(false); }} className={`nav-btn ${showForensics ? 'active' : ''}`} style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                  <ScanEye size={18} /> Forensics Lab
                </button>
                <button onClick={() => { setShowIntelligence(!showIntelligence); setShowLocker(false); setShowForensics(false); }} className={`nav-btn ${showIntelligence ? 'active' : ''}`} style={{ borderColor: 'var(--status-info)', color: 'var(--status-info)' }}>
                  <BarChart3 size={18} /> Monitor Intelligence
                </button>
              </>
            )}
            <button
              onClick={() => setIsMuted(soundManager.toggleMute())}
              className={`btn btn-mute ${isMuted ? 'muted' : ''}`}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              {isMuted ? 'Unmute Audio' : 'Mute Audio'}
            </button>

            <button
              onClick={() => {
                logout();
                clearThreads();
                setSelectedThreadId(null);
                setIsMonitoring(false);
                isMonitoringRef.current = false;
              }}
              className="btn btn-logout"
              style={{ marginTop: 'auto', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
            >
              <LogOut size={16} /> <span className="btn-text">TERMINATE SESSION</span>
            </button>
          </div>
        </div>


        {/* Main Chat */}
        <div className="main-chat">
          {selectedThread ? (
            <>
              {/* Chat Header (Truecaller Style) */}
              <div
                className="chat-banner"
                data-status={
                  selectedThread.classification === 'scam' || selectedThread.classification === 'likely_scam'
                    ? 'scam'
                    : selectedThread.classification === 'benign'
                      ? 'safe'
                      : 'neutral'
                }
              >
                <div>
                  <div className="sender-name">{selectedThread.senderName}</div>
                  <div className="sender-source">{selectedThread.source}</div>
                </div>

                <div>
                  {selectedThread.isScanning && <span className="status-scanning">Scanning...</span>}
                  {selectedThread.classification === 'benign' && (
                    <span className="status-safe">✓ Verified Safe</span>
                  )}
                  {selectedThread.autoReported && (
                    <span className="status-reported" style={{
                      background: 'rgba(34, 197, 94, 0.2)',
                      color: '#4ade80',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      border: '1px solid #22c55e',
                      marginLeft: '10px',
                      boxShadow: '0 0 10px rgba(34, 197, 94, 0.3)'
                    }}>
                      AUTO-REPORTED TO CYBER CELL ✅
                    </span>
                  )}
                </div>
              </div>

              {/* Compromised Contact Alert Banner */}
              {selectedThread.isCompromised && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  borderBottom: '1px solid var(--status-danger)',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  animation: 'slideDown 0.3s ease-out'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fca5a5' }}>
                    <div style={{
                      background: 'var(--status-danger)',
                      color: 'white',
                      padding: '4px',
                      borderRadius: '4px'
                    }}>
                      <ShieldAlert size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--status-danger)' }}>
                        KNOWN CONTACT COMPROMISED
                      </div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                        Behavior anomaly detected for {selectedThread.senderName}.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLocker(true)}
                    className="btn-danger-glow"
                    style={{
                      background: 'var(--status-danger)',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    REPORT COMPROMISE
                  </button>
                </div>
              )}

              {/* Legacy Alert Removed - Replaced by LiveIntercept */}

              {/* Advanced Live Intercept Panel (Truecaller/Cyber Style) */}
              {selectedThread.isIntercepted && (
                <LiveIntercept
                  intent={selectedThread.intent || "ANALYZING..."}
                  threatScore={selectedThread.threatScore || 0}
                  isScanning={selectedThread.isScanning}
                  location={selectedThread.detectedLocation}
                  counterMeasure={
                    selectedThread.intent === "MONEY" ? "TRACE_PAYMENT" :
                      selectedThread.intent === "CODES" ? "INJECT_FAKE_OTP" :
                        selectedThread.intent === "URGENCY" ? "STALLING_PROTOCOL" :
                          "MONITORING"
                  }
                />
              )}

              {/* Chat View */}
              <div className="chat-viewport">
                <ChatWindow messages={selectedThread.messages} />
              </div>
            </>
          ) : (
            <SystemDashboard
              activeThreats={threads.filter(t => t.classification === 'scam' || t.classification === 'likely_scam').length}
              locations={threads
                .filter(t => (t.classification === 'scam' || t.classification === 'likely_scam') && t.detectedLocation)
                .map(t => t.detectedLocation!)
              }
              onSimulateAttack={triggerBotnetMode}
            />
          )}
        </div>
      </div >

      {
        showLocker && (
          <Suspense fallback={<div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Secure Module...</div>}>
            <EvidenceLocker cases={getCaseFiles()} onClose={() => setShowLocker(false)} />
          </Suspense>
        )
      }
      {
        showIntelligence && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(15, 23, 42, 0.95)', overflowY: 'auto' }}>
            <div style={{ maxWidth: '1000px', margin: '2rem auto', background: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
              <button
                onClick={() => setShowIntelligence(false)}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.5rem' }}
              >
                ×
              </button>
              <IntelligenceReport />
            </div>
          </div>
        )
      }
      {
        showForensics && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.98)', overflowY: 'auto' }}>
            <div style={{ maxWidth: '1200px', margin: '2rem auto', background: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', minHeight: '80vh', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
              <button
                onClick={() => setShowForensics(false)}
                style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.5rem', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
              >
                ×
              </button>
              <DeepfakeAnalyzer />
            </div>
          </div>
        )
      }
    </>
  );
}

export default App;
