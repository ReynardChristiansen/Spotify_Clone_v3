import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { usePlayer } from '../../context/PlayerContext';
import Sidebar, { MobileNav } from './Sidebar';
import TopBar from './TopBar';
import PlayerBar from './PlayerBar';
import HomePage from '../../pages/HomePage';
import SearchSongsPage from '../../pages/SearchSongsPage';
import SearchArtistsPage from '../../pages/SearchArtistsPage';
import ArtistPage from '../../pages/ArtistPage';
import LikedSongsPage from '../../pages/LikedSongsPage';

export default function AppLayout() {
  const location = useLocation();
  const { track } = usePlayer();

  return (
    // overflow-hidden: the shell never scrolls at document level (only main
    // does) — without it the player bar's fade-up transform pokes past the
    // viewport and flashes a document scrollbar
    <div className="flex h-full flex-col gap-2 overflow-hidden p-2">
      <div className="flex min-h-0 flex-1 gap-2">
        <Sidebar />

        {/* Main panel — its own rounded surface, like Spotify's desktop shell */}
        {/* Mobile bottom padding clears the nav, plus the floating player once a track loads */}
        <main
          className={`no-scrollbar relative flex-1 overflow-y-auto rounded-2xl bg-ink-900 lg:pb-10 ${
            track ? 'pb-44' : 'pb-24'
          }`}
        >
          <TopBar />
          <div key={location.pathname} className="animate-fade-up px-4 lg:px-8">
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchSongsPage />} />
              <Route path="/artists" element={<SearchArtistsPage />} />
              <Route path="/artists/:id" element={<ArtistPage />} />
              <Route path="/liked" element={<LikedSongsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* In normal flow on desktop, floating above the bottom nav on mobile */}
      <PlayerBar />
      <MobileNav />
    </div>
  );
}
