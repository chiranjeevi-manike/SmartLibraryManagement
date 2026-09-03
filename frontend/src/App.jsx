import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Register from "./pages/Register";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";
import Books from "./pages/Books";
import Issues from "./pages/Issues";
import Reservations from "./pages/Reservations";
import MemberDashboard from "./pages/MemberDashboard";
import LibrarianDashboard from "./pages/LibrarianDashboard";
import Notifications from "./pages/Notifications";
import Fines from "./pages/Fines";
import Reports from "./pages/Reports";
import Ratings from "./pages/Ratings";
import Recommendations from "./pages/Recommendations";
import Analytics from "./pages/Analytics";
import AuditLogs from "./pages/AuditLogs";
import Users from "./pages/Users";
import MyProfile from "./pages/MyProfile";
import SecurityDashboard from "./pages/SecurityDashboard";
import LibraryActivity from "./pages/LibraryActivity";
import DueMonitoring from "./pages/DueMonitoring";
import ReminderMonitoring from "./pages/ReminderMonitoring";
import InventoryMonitoring from "./pages/InventoryMonitoring";
import MemberRiskMonitoring from "./pages/MemberRiskMonitoring";
import SystemHealth from "./pages/SystemHealth";
import ReservationDemandMonitoring from "./pages/ReservationDemandMonitoring";
import FineMonitoring from "./pages/FineMonitoring";
import CirculationMonitoring from "./pages/CirculationMonitoring";
import CollectionDevelopmentMonitoring from "./pages/CollectionDevelopmentMonitoring";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";


function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login Page */}
        <Route
          path="/"
          element={<Login />}
        />
        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />
        

        <Route path="/register" element={<Register />} />

        {/* Pages using Sidebar Layout */}
        <Route element={<Layout />}>

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/librarian-dashboard"
            element={<LibrarianDashboard />}
/>

         


          <Route
            path="/member-dashboard"
            element={<MemberDashboard />}
          />

          <Route
            path="/books"
            element={<Books />}
          />

          <Route
            path="/issues"
            element={<Issues />}
          />

          <Route
            path="/reservations"
            element={<Reservations />}
          />

          <Route
            path="/fines"
            element={<Fines />}
          />

          <Route
            path="/notifications"
            element={<Notifications />}
          />


          <Route
            path="/my-profile"
            element={<MyProfile />}
          />

           <Route
            path="/change-password"
            element={<ChangePassword />}
          />

          <Route
            path="/reports"
            element={<Reports />}
          />

          <Route
            path="/ratings"
            element={<Ratings />}
          />

          <Route
            path="/recommendations"
          element={<Recommendations />}
          />

          <Route
            path="/analytics"
            element={<Analytics />}
          />

          <Route
            path="/audit-logs"
            element={<AuditLogs />}
          />

          <Route path="/users" element={<Users />} />

          <Route
            path="/security-dashboard"
            element={<SecurityDashboard />}
          />

          <Route
            path="/library-activity"
            element={<LibraryActivity />}
          />

          <Route
            path="/due-monitoring"
            element={<DueMonitoring />}
          />

          <Route
            path="/reminder-monitoring"
            element={<ReminderMonitoring />}
          />

          <Route
            path="/inventory-monitoring"
            element={<InventoryMonitoring />}
          />

          <Route
            path="/member-risk-monitoring"
            element={<MemberRiskMonitoring />}
          />

          <Route
            path="/system-health"
            element={<SystemHealth />}
          />

          <Route
            path="/reservation-demand-monitoring"
            element={<ReservationDemandMonitoring />}
          />

          <Route
            path="/fine-monitoring"
            element={<FineMonitoring />}
          />

          <Route
            path="/circulation-monitoring"
            element={<CirculationMonitoring />}
          />

          <Route
            path="/collection-development-monitoring"
            element={<CollectionDevelopmentMonitoring />}
          />

          <Route
            path="/executive-dashboard"
            element={<ExecutiveDashboard />}
          />

        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
