import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import Layout from '@/components/Layout'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import DashboardPage from '@/pages/DashboardPage'
import ProductsPage from '@/pages/ProductsPage'
import WarehousesPage from '@/pages/WarehousesPage'
import ReceiptsPage from '@/pages/ReceiptsPage'
import DeliveriesPage from '@/pages/DeliveriesPage'
import TransfersPage from '@/pages/TransfersPage'
import AdjustmentsPage from '@/pages/AdjustmentsPage'
import MoveHistoryPage from '@/pages/MoveHistoryPage'
import ProfilePage from '@/pages/ProfilePage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated)()
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/warehouses" element={<WarehousesPage />} />
                <Route path="/receipts" element={<ReceiptsPage />} />
                <Route path="/deliveries" element={<DeliveriesPage />} />
                <Route path="/transfers" element={<TransfersPage />} />
                <Route path="/adjustments" element={<AdjustmentsPage />} />
                <Route path="/moves" element={<MoveHistoryPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}
