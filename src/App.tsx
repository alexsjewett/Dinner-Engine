import { useLayoutEffect, useRef } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { BottomNav } from "./components/BottomNav";
import { FindDinner } from "./pages/FindDinner";
import { RecipeLibrary } from "./pages/RecipeLibrary";
import { Profiles } from "./pages/Profiles";
import { RecipeDetails } from "./pages/RecipeDetails";

function AppLayout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // Routes have independent reading positions. Recipe details must start at top.
  useLayoutEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <header className="top-header">
        <span className="brand-symbol" aria-hidden="true">
          <svg
            width="25"
            height="25"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12.5h16c0 4.3-3.6 7.5-8 7.5s-8-3.2-8-7.5Z" />
            <path d="M3 12.5h18" />
            <path d="M8.5 3.5c-1.8 1.7 1.8 2.7 0 4.4" />
            <path d="M13 3.5c-1.8 1.7 1.8 2.7 0 4.4" />
            <path d="M17.5 5c-1.3 1.3-1.3 2.1 0 3.3" />
          </svg>
        </span>
        <span className="brand-name">Kitchen Companion</span>
      </header>
      <main ref={mainRef} className="main-content" id="main-content">
        <Outlet />
      </main>
      <footer className="bottom-nav-shell">
        <BottomNav />
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<FindDinner />} />
        <Route path="/library" element={<RecipeLibrary />} />
        <Route path="/profiles" element={<Profiles />} />
        <Route path="/recipes/imported/:recipeId" element={<RecipeDetails imported />} />
        <Route path="/recipes/:recipeId" element={<Navigate to="/library" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
