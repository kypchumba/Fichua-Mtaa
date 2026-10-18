import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { Spinner } from "./components/UI";
import Home from "./pages/Home";
import { AuthPage } from "./pages/Auth";
import Services from "./pages/Services";
import {
  MyRequests,
  RequestCreate,
  RequestDetails,
} from "./pages/RequestPages";
import "./styles.css";
const Admin = lazy(() => import("./pages/Admin"));

function Guard({ children, admin = false }) {
  const { user, checking } = useAuth();
  if (checking) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== "ADMIN")
    return <Navigate to="/requests" replace />;
  return children;
}
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
              path="requests"
              element={
                <Guard>
                  <MyRequests />
                </Guard>
              }
            />
            <Route
              path="requests/new"
              element={
                <Guard>
                  <RequestCreate />
                </Guard>
              }
            />
            <Route
              path="requests/:id"
              element={
                <Guard>
                  <RequestDetails />
                </Guard>
              }
            />
            <Route
              path="admin"
              element={
                <Guard admin>
                  <Suspense
                    fallback={<Spinner label="Loading administration" />}
                  >
                    <Admin />
                  </Suspense>
                </Guard>
              }
            />
            <Route
              path="admin/requests/:id"
              element={
                <Guard admin>
                  <RequestDetails admin />
                </Guard>
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
