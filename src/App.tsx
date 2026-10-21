import { Navigate, Outlet, Route, Routes } from "react-router";
import { BottomNav } from "./components/BottomNav";
import { FindDinner } from "./pages/FindDinner";
import { RecipeLibrary } from "./pages/RecipeLibrary";
import { Profiles } from "./pages/Profiles";
import { RecipeDetails } from "./pages/RecipeDetails";

function AppLayout() {
  return (
    <div className="app-shell">
      <header className="top-header">
        <span className="brand-symbol" aria-hidden="true">✳</span>
        <span className="brand-name">dinner engine</span>
        <span className="header-note">your kitchen companion</span>
      </header>
      <main className="main-content" id="main-content">
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
