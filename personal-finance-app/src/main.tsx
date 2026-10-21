import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AppDataProvider } from './data/AppDataContext'
import { AuthGate } from './data/AuthGate'
import { Ledger } from './pages/Ledger'
import { Overview } from './pages/Overview'
import { PlannedPage } from './pages/Planned'
import { Reports } from './pages/Reports'
import { Wallets } from './pages/Wallets'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <AppDataProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Overview />} />
              <Route path="so-ghi" element={<Ledger />} />
              <Route path="vi" element={<Wallets />} />
              <Route path="du-chi" element={<PlannedPage />} />
              {/* old address of screen ④, kept for bookmarks */}
              <Route path="khoan-co-dinh" element={<Navigate to="/du-chi" replace />} />
              <Route path="bao-cao" element={<Reports />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppDataProvider>
    </AuthGate>
  </StrictMode>,
)
