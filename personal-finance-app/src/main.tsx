import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AppDataProvider } from './data/AppDataContext'
import { Ledger } from './pages/Ledger'
import { Overview } from './pages/Overview'
import { RecurringPage } from './pages/Recurring'
import { Reports } from './pages/Reports'
import { Wallets } from './pages/Wallets'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppDataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="so-ghi" element={<Ledger />} />
            <Route path="vi" element={<Wallets />} />
            <Route path="khoan-co-dinh" element={<RecurringPage />} />
            <Route path="bao-cao" element={<Reports />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppDataProvider>
  </StrictMode>,
)
