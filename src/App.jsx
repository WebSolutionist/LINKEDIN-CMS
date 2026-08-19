import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import WritingRoomView from './components/WritingRoomView';
import ContentCalendarView from './components/ContentCalendarView';
import PublishedTrackerView from './components/PublishedTrackerView';
import WarRoomView from './components/WarRoomView';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [pendingRecommendation, setPendingRecommendation] = useState(null);

  const handleWriteRecommendation = (rec) => {
    setPendingRecommendation(rec);
    setCurrentView('writing-room');
  };

  const handleClearRecommendation = () => {
    setPendingRecommendation(null);
  };

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView onWriteRecommendation={handleWriteRecommendation} />;
      case 'writing-room':
        return (
          <WritingRoomView
            pendingRecommendation={pendingRecommendation}
            onClearRecommendation={handleClearRecommendation}
          />
        );
      case 'calendar':
        return <ContentCalendarView />;
      case 'published-tracker':
        return <PublishedTrackerView />;
      case 'war-room':
        return <WarRoomView />;
      default:
        return <DashboardView onWriteRecommendation={handleWriteRecommendation} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[--bg-primary]">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[--bg-primary] relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_-15%,rgba(0,180,216,0.04),rgba(255,255,255,0))] pointer-events-none" />

        <div className="flex-1 flex flex-col h-full overflow-hidden z-10">
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
}
