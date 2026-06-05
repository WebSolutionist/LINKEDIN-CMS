import { useState } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import ContentCalendarView from './components/ContentCalendarView';
import WritingRoomView from './components/WritingRoomView';
import PublishedTrackerView from './components/PublishedTrackerView';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedPost, setSelectedPost] = useState(null);

  const handleViewOnCalendar = () => setCurrentView('content-calendar');

  const handleNavigateToPost = (post) => {
    setSelectedPost(post || null);
    setCurrentView('writing-room');
  };

  const handleBackToCalendar = () => {
    setSelectedPost(null);
    setCurrentView('content-calendar');
  };

  const handleSidebarNav = (view) => {
    if (view !== 'writing-room') setSelectedPost(null);
    setCurrentView(view);
  };

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'content-calendar': return <ContentCalendarView onNavigateToPost={handleNavigateToPost} />;
      case 'writing-room':
        return (
          <WritingRoomView
            initialPost={selectedPost}
            onNavigateToCalendar={currentView === 'content-calendar' ? handleBackToCalendar : undefined}
          />
        );
      case 'published-tracker': return <PublishedTrackerView onViewOnCalendar={handleViewOnCalendar} />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden app-bg">
      <Sidebar currentView={currentView} setCurrentView={handleSidebarNav} />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
}
