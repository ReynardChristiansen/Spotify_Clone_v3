import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <div className="flex min-h-0 flex-1 gap-2">
        <Sidebar />

        {/* Main panel — its own rounded surface, like Spotify's desktop shell */}
        {/* scrollbar-gutter keeps the layout from shifting when results make the page scrollable */}
        <main className="relative flex-1 overflow-y-auto rounded-2xl bg-ink-900 pb-44 [scrollbar-gutter:stable] lg:pb-10">
          <TopBar />
          <div key={location.pathname} className="animate-fade-up px-4 lg:px-8">
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchSongsPage />} />
              <Route path="/artists" element={<SearchArtistsPage />} />
              <Route path="/artist/:id" element={<ArtistPage />} />
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
