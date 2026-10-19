import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { Spinner } from "./components/UI";
import { RoleGuard } from "./auth/RoleGuard";
import Home from "./pages/Home";
import { AuthPage } from "./pages/Auth";
import Services from "./pages/Services";
import { CitizenDashboard } from "./pages/CitizenDashboard";
import Profile from "./pages/Profile";
import {
  MyRequests,
  RequestCreate,
  RequestDetails,
} from "./pages/RequestPages";
import "./styles.css";
const Admin = lazy(() => import("./pages/Admin"));

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="services" element={<Services />} />
            <Route path="login" element={<AuthPage />} />
            <Route path="register" element={<AuthPage register />} />
            <Route
              path="dashboard"
              element={
                <RoleGuard role="CITIZEN">
                  <CitizenDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="profile"
              element={
                <RoleGuard role="CITIZEN">
                  <Profile />
                </RoleGuard>
              }
            />
            <Route
              path="requests"
              element={
                <RoleGuard role="CITIZEN">
                  <MyRequests />
                </RoleGuard>
              }
            />
            <Route
              path="requests/new"
              element={
                <RoleGuard role="CITIZEN">
                  <RequestCreate />
                </RoleGuard>
              }
            />
            <Route
              path="requests/:id"
              element={
                <RoleGuard role="CITIZEN">
                  <RequestDetails />
                </RoleGuard>
              }
            />
            <Route
              path="admin"
              element={
                <RoleGuard role="ADMIN">
                  <Suspense
                    fallback={<Spinner label="Loading administration" />}
                  >
                    <Admin />
                  </Suspense>
                </RoleGuard>
              }
            />
            <Route
              path="admin/requests/:id"
              element={
                <RoleGuard role="ADMIN">
                  <RequestDetails admin />
                </RoleGuard>
              }
            />
            <Route
              path="*"
              element={
                <main className="page-wrap">
                  <h1>Page not found</h1>
                  <a href="/">Return home</a>
                </main>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
