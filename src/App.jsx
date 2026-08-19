import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import ContentCalendarView from './components/ContentCalendarView';
import WritingRoomView from './components/WritingRoomView';
import PublishedTrackerView from './components/PublishedTrackerView';
import WarRoomView from './components/WarRoomView';
import { viewTransition } from './utils/animations';

const viewOrder = ['dashboard', 'content-calendar', 'writing-room', 'published-tracker', 'war-room'];

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedPost, setSelectedPost] = useState(null);
  const lastView = useRef('dashboard');

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
    lastView.current = currentView;
    setCurrentView(view);
  };

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView onNavigateToPost={handleNavigateToPost} />;
      case 'content-calendar': return <ContentCalendarView onNavigateToPost={handleNavigateToPost} />;
      case 'writing-room':
        return (
          <WritingRoomView
            initialPost={selectedPost}
            onNavigateToCalendar={currentView === 'content-calendar' ? handleBackToCalendar : undefined}
          />
        );
      case 'published-tracker': return <PublishedTrackerView onViewOnCalendar={handleViewOnCalendar} />;
      case 'war-room': return <WarRoomView />;
      default: return <DashboardView />;
    }
  };

  const navDirection = (viewOrder.indexOf(currentView) - viewOrder.indexOf(lastView.current)) || 1;
  const vt = viewTransition(navDirection);

  return (
    <div className="flex h-screen w-screen overflow-hidden app-bg">
      <Sidebar currentView={currentView} setCurrentView={handleSidebarNav} />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative pb-16 lg:pb-0">
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={vt.initial}
              animate={vt.animate}
              exit={vt.exit}
              transition={vt.transition}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
