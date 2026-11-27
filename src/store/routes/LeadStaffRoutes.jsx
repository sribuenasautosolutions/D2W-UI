import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../../auth/ProtectedRoute";
import DashboardLayout from "../../owner/layouts/DashboardLayout";

const LeadList = lazy(() => import("../../owner/components/leads/LeadList"));
const LeadDetails = lazy(() => import("../../owner/components/leads/LeadDetails"));
const LeadCreate = lazy(() => import("../../owner/components/leads/LeadCreate"));

export default function LeadStaffRoutes({ role }) {
  const base = role === "SALESPERSON" ? "/salesperson" : "/procurement";
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <Routes>
        <Route path="/" element={<Navigate to={`${base}/sales/leads`} replace />} />
        <Route path="/dashboard" element={<Navigate to={`${base}/sales/leads`} replace />} />
        <Route
          path="/sales/leads"
          element={
            <ProtectedRoute requiredPermissions={["LEADS.VIEW", "LEADS.PROCUREMENT"]}>
              <DashboardLayout>
                <Suspense fallback={<div className="ref-kanban-empty-wrap" style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}><strong>Loading leads module...</strong></div>}>
                  <LeadList />
                </Suspense>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales/leads/:id"
          element={
            <ProtectedRoute requiredPermissions={["LEADS.VIEW", "LEADS.PROCUREMENT"]}>
              <DashboardLayout><LeadDetails /></DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales/leads/new"
          element={
            <ProtectedRoute requiredPermissions={["LEADS.CREATE"]}>
              <DashboardLayout><LeadCreate /></DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={`${base}/sales/leads`} replace />} />
      </Routes>
    </Suspense>
  );
}
