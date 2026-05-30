import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import DashboardPage from './pages/DashboardPage'
import PayslipsPage from './pages/PayslipsPage'
import PayslipDetailPage from './pages/PayslipDetailPage'
import AnnualSummaryPage from './pages/AnnualSummaryPage'
import UploadPage from './pages/UploadPage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="payslips" element={<PayslipsPage />} />
          <Route path="payslips/:id" element={<PayslipDetailPage />} />
          <Route path="annual" element={<AnnualSummaryPage />} />
          <Route path="upload" element={<UploadPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
