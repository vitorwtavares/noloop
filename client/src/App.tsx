import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import AuthGuard from './components/auth/AuthGuard'
import Layout from './components/layout/Layout'
import QuickCopy from './pages/QuickCopy'
import CoverLetter from './pages/CoverLetter'
import AnswerBank from './pages/AnswerBank'
import ApplicationTracker from './pages/ApplicationTracker'
import Scanner from './pages/Scanner'
import Settings from './pages/Settings'
import { AccountSettings } from './components/settings/AccountSettings'
import { BillingSettings } from './components/settings/BillingSettings'
import { UpgradeProvider } from './components/billing/UpgradeProvider'
import LandingPage from './pages/landing/LandingPage'
import RedirectToApp from './pages/landing/RedirectToApp'
import PrivacyPolicy from './pages/landing/legal/PrivacyPolicy'
import TermsOfService from './pages/landing/legal/TermsOfService'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import NotFound from './pages/NotFound'
import { Toaster } from './components/ui/sonner'
import { TooltipProvider } from './components/ui/tooltip'

const isLandingSite = import.meta.env.VITE_SITE === 'landing'

export default function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <UpgradeProvider>
          <Routes>
            {isLandingSite ? (
              <>
                <Route path="/" element={<LandingPage />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="*" element={<RedirectToApp />} />
              </>
            ) : (
              <>
                <Route path="/sign-in" element={<SignIn />} />
                <Route path="/sign-up" element={<SignUp />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route element={<AuthGuard />}>
                  <Route
                    path="/"
                    element={<Navigate to="/quick-copy" replace />}
                  />
                  <Route element={<Layout />}>
                    <Route path="/quick-copy" element={<QuickCopy />} />
                    <Route path="/cover-letter" element={<CoverLetter />} />
                    <Route path="/answer-bank" element={<AnswerBank />} />
                    <Route path="/tracker" element={<ApplicationTracker />} />
                    <Route path="/scanner" element={<Scanner />} />
                    <Route path="/settings" element={<Settings />}>
                      <Route
                        index
                        element={<Navigate to="account" replace />}
                      />
                      <Route path="account" element={<AccountSettings />} />
                      <Route path="billing" element={<BillingSettings />} />
                    </Route>
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </>
            )}
          </Routes>
          <Toaster />
        </UpgradeProvider>
      </BrowserRouter>
    </TooltipProvider>
  )
}
