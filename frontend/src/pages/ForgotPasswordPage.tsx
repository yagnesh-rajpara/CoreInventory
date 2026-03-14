import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'

// ── Password-strength helper ───────────────────────────────────────────
function getPasswordStrength(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  if (score <= 2) return { label: 'Weak', color: '#ef4444', pct: 25 }
  if (score <= 4) return { label: 'Fair', color: '#f59e0b', pct: 55 }
  if (score === 5) return { label: 'Good', color: '#3b82f6', pct: 80 }
  return { label: 'Strong', color: '#22c55e', pct: 100 }
}

// ── Mask email: jo***@gmail.com ────────────────────────────────────────
function maskEmail(email: string) {
  const [user, domain] = email.split('@')
  if (!domain) return email
  const visible = user.slice(0, 2)
  return `${visible}${'•'.repeat(Math.max(user.length - 2, 3))}@${domain}`
}

type Step = 'email' | 'otp' | 'reset' | 'success'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  // ── State ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Resend OTP countdown
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((v) => v - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  // ── Step 1: Request OTP ───────────────────────────────────────────────
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/forgot-password', { email })
      setStep('otp')
      setResendCooldown(60)
    } catch (err: any) {
      setError(getErrorMessage(err, 'Something went wrong. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  // ── Resend OTP ────────────────────────────────────────────────────────
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/forgot-password', { email })
      setResendCooldown(60)
      setOtp('')
    } catch {
      setError('Failed to resend code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Verify OTP ────────────────────────────────────────────────
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) { setError('Please enter a valid 6-digit code'); return }
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp })
      setResetToken(data.reset_token)
      setStep('reset')
    } catch (err: any) {
      setError(getErrorMessage(err, 'Verification failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: Reset Password ────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return }
    if (!/[A-Z]/.test(newPassword)) { setError('Password must contain an uppercase letter'); return }
    if (!/\d/.test(newPassword)) { setError('Password must contain a number'); return }
    if (!/[^a-zA-Z0-9]/.test(newPassword)) { setError('Password must contain a special character'); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/reset-password', { email, reset_token: resetToken, new_password: newPassword })
      setStep('success')
    } catch (err: any) {
      setError(getErrorMessage(err, 'Password reset failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  // ── Progress indicator ────────────────────────────────────────────────
  const steps = [
    { key: 'email', label: 'Email' },
    { key: 'otp', label: 'Verify' },
    { key: 'reset', label: 'Reset' },
  ] as const
  const currentIndex = step === 'success' ? 3 : steps.findIndex((s) => s.key === step)

  const strength = getPasswordStrength(newPassword)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md animate-fade-in">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white text-xl font-bold mb-4 shadow-lg shadow-blue-600/30">CI</div>
          <h1 className="text-3xl font-bold text-white">Reset Password</h1>
          <p className="text-blue-300/70 mt-1">CoreInventory Security</p>
        </div>

        {/* Progress Bar */}
        {step !== 'success' && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-all duration-300 ${
                  i < currentIndex
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                    : i === currentIndex
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-4 ring-blue-600/20'
                    : 'bg-white/10 text-white/40'
                }`}>
                  {i < currentIndex ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${i <= currentIndex ? 'text-blue-200' : 'text-white/30'}`}>{s.label}</span>
                {i < steps.length - 1 && (
                  <div className={`w-8 h-0.5 rounded-full transition-colors duration-300 ${i < currentIndex ? 'bg-green-500' : 'bg-white/10'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">

          {/* Error Alert */}
          {error && (
            <div className="mb-5 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 animate-fade-in flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}

          {/* ─────────── STEP 1: Enter Email ─────────── */}
          {step === 'email' && (
            <form onSubmit={handleRequestOTP} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Forgot your password?</h2>
                <p className="text-sm text-blue-300/60 mb-6">Enter the email address associated with your account and we'll send you a verification code.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1.5">Email Address</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/30 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>
              <button
                id="btn-send-otp"
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 disabled:opacity-50 transition-all duration-200"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Sending...
                  </span>
                ) : 'Send Verification Code'}
              </button>
            </form>
          )}

          {/* ─────────── STEP 2: Verify OTP ─────────── */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Enter verification code</h2>
                <p className="text-sm text-blue-300/60 mb-1">
                  We've sent a 6-digit code to
                </p>
                <p className="text-sm text-blue-300 font-medium mb-6">{maskEmail(email)}</p>
              </div>

              {/* OTP Input */}
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1.5">Verification Code</label>
                <input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-white text-center text-2xl font-mono tracking-[0.5em] placeholder-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  placeholder="• • • • • •"
                  autoFocus
                />
              </div>

              <button
                id="btn-verify-otp"
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 disabled:opacity-50 transition-all duration-200"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Verifying...
                  </span>
                ) : 'Verify Code'}
              </button>

              {/* Resend button with countdown */}
              <div className="text-center">
                {resendCooldown > 0 ? (
                  <p className="text-xs text-blue-300/40">
                    Resend code in <span className="text-blue-400 font-semibold">{resendCooldown}s</span>
                  </p>
                ) : (
                  <button
                    id="btn-resend-otp"
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:opacity-50"
                  >
                    Didn't receive the code? Resend
                  </button>
                )}
              </div>
            </form>
          )}

          {/* ─────────── STEP 3: New Password ─────────── */}
          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Set new password</h2>
                <p className="text-sm text-blue-300/60 mb-6">Create a strong password for your account.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1.5">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/30 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                />
                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="mt-2 space-y-1 animate-fade-in">
                    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${strength.pct}%`, backgroundColor: strength.color }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-medium" style={{ color: strength.color }}>{strength.label}</p>
                      <div className="flex gap-1.5 text-[10px] text-blue-300/40">
                        <span className={/[A-Z]/.test(newPassword) ? 'text-green-400' : ''}>A-Z</span>
                        <span className={/[a-z]/.test(newPassword) ? 'text-green-400' : ''}>a-z</span>
                        <span className={/\d/.test(newPassword) ? 'text-green-400' : ''}>0-9</span>
                        <span className={/[^a-zA-Z0-9]/.test(newPassword) ? 'text-green-400' : ''}>!@#</span>
                        <span className={newPassword.length >= 8 ? 'text-green-400' : ''}>8+</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1.5">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/30 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-400 animate-fade-in">Passwords do not match</p>
                )}
                {confirmPassword && newPassword === confirmPassword && (
                  <p className="mt-1.5 text-xs text-green-400 animate-fade-in">✓ Passwords match</p>
                )}
              </div>

              <button
                id="btn-reset-password"
                type="submit"
                disabled={loading || newPassword !== confirmPassword || newPassword.length < 8}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 disabled:opacity-50 transition-all duration-200"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Resetting...
                  </span>
                ) : 'Reset Password'}
              </button>
            </form>
          )}

          {/* ─────────── STEP 4: Success ─────────── */}
          {step === 'success' && (
            <div className="text-center py-4 animate-fade-in">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 mb-5">
                <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Password Reset!</h2>
              <p className="text-sm text-blue-300/60 mb-6">Your password has been successfully updated. You can now sign in with your new credentials.</p>
              <button
                id="btn-back-to-login"
                onClick={() => navigate('/login')}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all duration-200"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {/* Back to login link (shown on non-success steps) */}
          {step !== 'success' && (
            <p className="text-center text-sm text-blue-300/50 mt-6">
              Remember your password?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
