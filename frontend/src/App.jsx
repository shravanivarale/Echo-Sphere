import { useState, useCallback } from 'react';
import Setup from './pages/Setup';
import InterviewRoom from './pages/InterviewRoom';
import Report from './pages/Report';

const VIEWS = { SETUP: 'setup', INTERVIEW: 'interview', REPORT: 'report' };

function App() {
  const [view, setView] = useState(VIEWS.SETUP);
  const [session, setSession] = useState(null);
  const [report, setReport] = useState(null);

  const handleSessionCreated = useCallback((sessionData) => {
    setSession(sessionData);
    setView(VIEWS.INTERVIEW);
  }, []);

  const handleSessionEnd = useCallback((reportData) => {
    setReport(reportData);
    setView(VIEWS.REPORT);
  }, []);

  const handleRestart = useCallback(() => {
    setSession(null);
    setReport(null);
    setView(VIEWS.SETUP);
  }, []);

  if (view === VIEWS.INTERVIEW && session) {
    return <InterviewRoom session={session} onSessionEnd={handleSessionEnd} />;
  }

  if (view === VIEWS.REPORT && report) {
    return <Report report={report} session={session} onRestart={handleRestart} />;
  }

  return (
    <div className="app-container">
      <Setup onSessionCreated={handleSessionCreated} />
    </div>
  );
}

export default App;
