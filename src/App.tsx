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
        <span className="brand-symbol" aria-hidden="true">✳</span>
        <span className="brand-name">Find Dinner</span>
        <span className="header-note">your kitchen companion</span>
      </header>
      <main ref={mainRef} className="main-content" id="main-content">
        <Outlet />
      </main>
      <BottomNav />
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
        <Route path="/recipes/:recipeId" element={<RecipeDetails />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
