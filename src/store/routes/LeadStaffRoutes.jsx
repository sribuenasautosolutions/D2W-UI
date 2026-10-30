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
        <Route path="/sales/leads" element={<DashboardLayout><LeadList /></DashboardLayout>} />
        <Route path="/sales/leads/:id" element={<DashboardLayout><LeadDetails /></DashboardLayout>} />
        {["SALESPERSON", "PROCUREMENT"].includes(role) && (
          <Route path="/sales/leads/new" element={
            <ProtectedRoute allowedRoles={["SALESPERSON", "PROCUREMENT"]}>
              <DashboardLayout><LeadCreate /></DashboardLayout>
            </ProtectedRoute>
          } />
        )}
        <Route path="*" element={<Navigate to={`${base}/sales/leads`} replace />} />
      </Routes>
    </Suspense>
  );
}
