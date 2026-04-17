import React, { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'react-toastify'
import { getAuthHeaders } from '../utils/auth'
import './Dashboard.css'
import API_URL from '../config/api'

const JudgeDashboard = ({ user, onLogout }) => {
  const [evidence, setEvidence] = useState([])
  // initialLoading = true only on the very first fetch
  // Never set true again so the list never unmounts during background refreshes
  const [initialLoading, setInitialLoading] = useState(true)

  // useRef so mutations are instant — no stale-closure / batching issues
  const verifyingIdsRef = useRef(new Set())
  const [, forceUpdate] = useState(0)

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const startVerifying = useCallback((id) => {
    console.log(`%c[startVerifying] id=${id} type=${typeof id}`, 'color:orange')
    console.log('[startVerifying] ref BEFORE:', [...verifyingIdsRef.current])
    verifyingIdsRef.current.add(id)
    console.log('[startVerifying] ref AFTER:', [...verifyingIdsRef.current])
    forceUpdate((n) => n + 1)
  }, [])

  const stopVerifying = useCallback((id) => {
    console.log(`%c[stopVerifying] id=${id} type=${typeof id}`, 'color:green')
    console.log('[stopVerifying] ref BEFORE:', [...verifyingIdsRef.current])
    verifyingIdsRef.current.delete(id)
    console.log('[stopVerifying] ref AFTER:', [...verifyingIdsRef.current])
    forceUpdate((n) => n + 1)
  }, [])

  const isVerifying = (id) => {
    const result = verifyingIdsRef.current.has(id)
    if (verifyingIdsRef.current.size > 0) {
      console.log(`[isVerifying] id=${id} type=${typeof id} → ${result} | ref:`, [...verifyingIdsRef.current])
    }
    return result
  }
  // ─────────────────────────────────────────────────────────────────────────

  const fetchEvidence = useCallback(async ({ silent = false } = {}) => {
    console.log(`%c[fetchEvidence] silent=${silent}`, 'color:blue')
    if (!silent) setInitialLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/evidence`, {
        headers: getAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        console.log(
          `%c[fetchEvidence] ✅ ${data.evidence?.length} records`,
          'color:green',
          data.evidence?.map(e => ({ evidenceId: e.evidenceId, idType: typeof e.evidenceId, status: e.status }))
        )
        setEvidence(data.evidence)
      } else {
        console.error(`[fetchEvidence] ❌ HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('[fetchEvidence] ❌ Network error:', error)
    } finally {
      if (!silent) setInitialLoading(false)
    }
  }, [])

  useEffect(() => {
    console.log('%c[JudgeDashboard] MOUNTED — initial fetch', 'font-weight:bold')
    fetchEvidence({ silent: false })

    const onFocus = () => {
      console.log('[JudgeDashboard] window focused → silent refresh')
      fetchEvidence({ silent: true })
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        console.log('[JudgeDashboard] tab visible → silent refresh')
        fetchEvidence({ silent: true })
      }
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchEvidence])

  const handleVerify = async (evidenceId) => {
    console.log('%c\n========== handleVerify START ==========', 'font-weight:bold;color:purple')
    console.log(`[handleVerify] evidenceId=${evidenceId}  type=${typeof evidenceId}`)
    console.log('[handleVerify] current verifyingIds ref:', [...verifyingIdsRef.current])

    if (isVerifying(evidenceId)) {
      console.warn(`%c[handleVerify] ⚠️ ALREADY VERIFYING ${evidenceId} — RETURNING EARLY`, 'color:red')
      return
    }

    startVerifying(evidenceId)

    try {
      console.log(`[handleVerify] 📡 POST /api/verification/${evidenceId}`)
      const response = await fetch(`${API_URL}/api/verification/${evidenceId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      })

      const data = await response.json()
      console.log(`[handleVerify] response status=${response.status}`, data)

      if (response.ok) {
        if (data.isAuthentic) {
          toast.success(`✅ ${data.verificationResult}`)
        } else {
          toast.error(`❌ ${data.verificationResult}`)
        }
        console.log('[handleVerify] refreshing list (silent)...')
        await fetchEvidence({ silent: true })
        console.log('[handleVerify] list refreshed')
      } else {
        console.error('[handleVerify] ❌ API returned error:', data)
        toast.error(data.message || 'Verification failed')
      }
    } catch (error) {
      console.error('[handleVerify] ❌ Exception:', error)
      toast.error('Network error during verification')
    } finally {
      console.log(`%c[handleVerify] finally → stopVerifying(${evidenceId})`, 'color:green')
      stopVerifying(evidenceId)
      console.log('[handleVerify] ref after stop:', [...verifyingIdsRef.current])
      console.log('%c========== handleVerify END ==========\n', 'font-weight:bold;color:purple')
    }
  }

  // Log on every render
  console.log(`[RENDER] count=${evidence.length} initialLoading=${initialLoading} verifyingIds=[${[...verifyingIdsRef.current]}]`)

  const handleViewFile = async (evidenceId, fileName, fileType) => {
    try {
      const token = localStorage.getItem('trustchain_token')
      const response = await fetch(`${API_URL}/api/evidence/${evidenceId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('Failed to download file')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const isViewable = fileType.startsWith('image/') || fileType === 'application/pdf'

      if (isViewable) {
        window.open(url, '_blank')
        toast.success('File opened in new tab')
      } else {
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        toast.success('File downloaded')
      }
    } catch (error) {
      console.error('Error viewing file:', error)
      toast.error('Error viewing/downloading file')
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Judge Dashboard</h1>
          <p>Welcome, {user.name} - Full Access Verification Tool</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => {
              console.log('[Refresh button] clicked')
              fetchEvidence({ silent: true })
            }}
            className="gps-btn"
            title="Reload latest evidence from server"
          >
            🔄 Refresh
          </button>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="verification-section">
          <h2>Evidence Verification</h2>
          {initialLoading ? (
            <p>Loading evidence...</p>
          ) : evidence.length === 0 ? (
            <p className="no-data">No evidence records found</p>
          ) : (
            <div className="evidence-list">
              {evidence.map((item) => {
                const btnDisabled = isVerifying(item.evidenceId)
                // Log every card's button state on each render
                console.log(
                  `%c[RENDER card] evidenceId=${item.evidenceId} type=${typeof item.evidenceId} status=${item.status} btnDisabled=${btnDisabled}`,
                  btnDisabled ? 'color:red' : 'color:green'
                )
                return (
                  <div key={item._id} className="evidence-card">
                    <h3>{item.fileName}</h3>
                    <div className="evidence-info">
                      <p><strong>Evidence ID:</strong> {item.evidenceId}</p>
                      <p><strong>Collector:</strong> {item.collectorName}</p>
                      <p><strong>Type:</strong> {item.fileType}</p>
                      <p><strong>Size:</strong> {(item.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                      <p><strong>IPFS Hash:</strong> <code className="hash">{item.ipfsHash}</code></p>
                      <p><strong>Blockchain Hash:</strong> <code className="hash">{item.blockchainHash}</code></p>
                      <p><strong>Status:</strong>
                        <span className={`status ${item.status}`}>
                          {item.status === 'verified' ? '✅ Verified' :
                            item.status === 'tampered' ? '❌ Tampered' :
                              '🔒 Sealed'}
                        </span>
                      </p>
                      <p><strong>Uploaded:</strong> {new Date(item.timestamp).toLocaleString()}</p>
                      {item.gpsCoordinates?.latitude && (
                        <p><strong>Location:</strong> {item.gpsCoordinates.latitude}, {item.gpsCoordinates.longitude}</p>
                      )}
                    </div>
                    <div className="action-buttons">
                      <button
                        onClick={() => {
                          console.log(`%c[CLICK] Verify button clicked — evidenceId=${item.evidenceId}`, 'color:purple;font-weight:bold')
                          handleVerify(item.evidenceId)
                        }}
                        disabled={btnDisabled}
                        className="verify-btn"
                      >
                        {btnDisabled ? '⏳ Verifying...' : '🔍 Verify Integrity'}
                      </button>
                      <button
                        onClick={() => handleViewFile(item.evidenceId, item.fileName, item.fileType)}
                        className="view-btn"
                      >
                        📄 View/Download File
                      </button>
                    </div>
                    {item.blockchainHash && (
                      <div className="blockchain-links">
                        <a
                          href={`https://sepolia.etherscan.io/tx/${item.blockchainHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="etherscan-link"
                        >
                          🔗 View on Etherscan
                        </a>
                        {item.ipfsHash && (
                          <a
                            href={`https://gateway.pinata.cloud/ipfs/${item.ipfsHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ipfs-link"
                            title="Opens via Pinata IPFS gateway"
                          >
                            📦 View on IPFS
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default JudgeDashboard
