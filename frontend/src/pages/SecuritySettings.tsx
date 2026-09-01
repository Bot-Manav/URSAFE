import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Lock,
  Copy,
  Check,
  Smartphone,
  Shield,
  Loader2,
  AlertCircle,
  FileCode2
} from 'lucide-react'
import { apiClient } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { RoleBadge } from '../components/RoleBadge'

export default function SecuritySettings() {
  const { user } = useAuth()
  const [mfaSetup, setMfaSetup] = useState<{ qrCodeUri: string; manualCode: string } | null>(null)
  const [mfaConfirmCode, setMfaConfirmCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)

  async function handleStartMfa() {
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const { data } = await apiClient.post('/api/auth/setup-mfa')
      setMfaSetup(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not initiate MFA setup.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmMfa(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      await apiClient.post('/api/auth/confirm-mfa', { code: mfaConfirmCode })
      setSuccess('Two-Factor Authentication (TOTP) has been successfully verified & enabled!')
      setMfaSetup(null)
      setMfaConfirmCode('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid 6-digit TOTP code. Please check and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyKey = () => {
    if (mfaSetup?.manualCode) {
      navigator.clipboard.writeText(mfaSetup.manualCode)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Security & Access Controls
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
          Configure Two-Factor Authentication (TOTP), review encryption standards, and inspect account security.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <ShieldAlert size={18} />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <ShieldCheck size={18} />
          <div>{success}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* 2FA Configuration Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Smartphone size={18} className="text-primary" />
              <span>Two-Factor Authentication (TOTP)</span>
            </h3>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Protect your evidentiary access with an authenticator app (Google Authenticator, Microsoft Authenticator, or Authy).
          </p>

          {!mfaSetup ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '1.25rem',
                }}
              >
                <Shield size={24} style={{ color: 'var(--primary)' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    Standard TOTP Protection
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Time-based 6-digit one-time passcodes generated on your device
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStartMfa}
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Generating Security Key...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    <span>Set up Authenticator App (2FA)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <form onSubmit={handleConfirmMfa} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                1. Scan this QR code with your authenticator app:
              </p>

              <div
                style={{
                  display: 'inline-block',
                  padding: '0.85rem',
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '1rem',
                }}
              >
                <QRCodeSVG value={mfaSetup.qrCodeUri} size={170} />
              </div>

              {mfaSetup.manualCode && (
                <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    Or enter manual secret key:
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <code
                      style={{
                        flex: 1,
                        padding: '0.4rem 0.6rem',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.82rem',
                      }}
                    >
                      {mfaSetup.manualCode}
                    </code>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopyKey}>
                      {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label" htmlFor="mfaCode">
                  2. Enter 6-Digit Code to Confirm:
                </label>
                <input
                  id="mfaCode"
                  type="text"
                  required
                  placeholder="000000"
                  maxLength={6}
                  pattern="\d{6}"
                  className="form-input"
                  style={{
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.2rem',
                    letterSpacing: '0.2em',
                  }}
                  value={mfaConfirmCode}
                  onChange={(e) => setMfaConfirmCode(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMfaSetup(null)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || mfaConfirmCode.length !== 6}
                  style={{ flex: 1 }}
                >
                  {loading ? 'Verifying...' : 'Enable 2FA'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Cryptographic Standards Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Lock size={18} className="text-primary" />
              <span>Vault Cryptographic Standards</span>
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div className="stat-icon primary" style={{ width: '36px', height: '36px' }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>AES-256-GCM Encryption</strong>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                  All uploaded evidentiary files are encrypted at rest with random IVs and 128-bit authentication tags.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div className="stat-icon success" style={{ width: '36px', height: '36px' }}>
                <FileCode2 size={18} />
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>SHA-256 Integrity Verification</strong>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                  Pre-computed cryptographic hashes are re-validated on every download to detect byte-level tampering.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div className="stat-icon warning" style={{ width: '36px', height: '36px' }}>
                <KeyRound size={18} />
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>OWASP BOLA Access Defense</strong>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                  Per-case authorization tables are checked on every request, blocking unauthorized horizontal access.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
