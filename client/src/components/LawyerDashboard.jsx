import React, { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { getAuthHeaders } from '../utils/auth'
import './Dashboard.css'

const LawyerDashboard = ({ user, onLogout }) => {
  const [evidence, setEvidence] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedEvidence, setSelectedEvidence] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    fetchEvidence()
  }, [])

  const fetchEvidence = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:5000/api/evidence', {
        headers: getAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        setEvidence(data.evidence)
      }
    } catch (error) {
      console.error('Error fetching evidence:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async (evidenceId, analysisType) => {
    setAnalyzing(true)
    setAnalysisResult(null)
    try {
      const response = await fetch(`http://localhost:5000/api/ai/analyze/${evidenceId}`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ analysisType })
      })

      const data = await response.json()

      if (response.ok) {
        setAnalysisResult(data)
        toast.success('Analysis completed')
      } else {
        toast.error(data.message || 'Analysis failed')
      }
    } catch (error) {
      toast.error('Network error during analysis')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleViewFile = async (evidenceId, fileName, fileType) => {
    try {
      const token = localStorage.getItem('trustchain_token')
      const response = await fetch(`http://localhost:5000/api/evidence/${evidenceId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to download file')
      }

      // Get file blob
      const blob = await response.blob()
      
      // Create object URL
      const url = window.URL.createObjectURL(blob)
      
      // Check if it's an image or PDF that can be viewed in browser
      const isViewable = fileType.startsWith('image/') || fileType === 'application/pdf'
      
      if (isViewable) {
        // Open in new tab for viewing
        window.open(url, '_blank')
        toast.success('File opened in new tab')
      } else {
        // Download the file
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
          <h1>Lawyer Dashboard</h1>
          <p>Welcome, {user.name} - Evidence Review Access</p>
        </div>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </header>

      <div className="dashboard-content">
        <div className="evidence-section">
          <h2>Evidence Records (Read-Only)</h2>
          {loading ? (
            <p>Loading evidence...</p>
          ) : evidence.length === 0 ? (
            <p className="no-data">No evidence records found</p>
          ) : (
            <div className="evidence-list">
              {evidence.map((item) => (
                <div key={item._id} className="evidence-card">
                  <h3>{item.fileName}</h3>
                  <div className="evidence-info">
                    <p><strong>Evidence ID:</strong> {item.evidenceId}</p>
                    <p><strong>Collector:</strong> {item.collectorName}</p>
                    <p><strong>Type:</strong> {item.fileType}</p>
                    <p><strong>Size:</strong> {(item.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                    <p><strong>IPFS Hash:</strong> <code className="hash">{item.ipfsHash}</code></p>
                    {item.blockchainHash && (
                      <p><strong>Blockchain Hash:</strong> <code className="hash">{item.blockchainHash}</code></p>
                    )}
                    <p><strong>Status:</strong> 
                      <span className={`status ${item.status}`}>
                        {item.status === 'verified' ? '✅ Verified' : 
                         item.status === 'tampered' ? '❌ Tampered' : 
                         '🔒 Sealed'}
                      </span>
                    </p>
                    <p><strong>Uploaded:</strong> {new Date(item.timestamp).toLocaleString()}</p>
                    {item.description && <p><strong>Description:</strong> {item.description}</p>}
                  </div>
                  <div className="action-buttons">
                    {item.fileType.startsWith('audio/') && (
                      <button
                        onClick={() => handleAnalyze(item.evidenceId, 'transcribe')}
                        disabled={analyzing}
                        className="analyze-btn"
                      >
                        Transcribe Audio
                      </button>
                    )}
                    {item.fileType.startsWith('video/') && (
                      <button
                        onClick={() => handleAnalyze(item.evidenceId, 'blur')}
                        disabled={analyzing}
                        className="analyze-btn"
                      >
                        Analyze Video
                      </button>
                    )}
                    {item.fileType.startsWith('image/') && (
                      <button
                        onClick={() => handleAnalyze(item.evidenceId, 'object-detection')}
                        disabled={analyzing}
                        className="analyze-btn"
                      >
                        Detect Objects
                      </button>
                    )}
                    <button
                      onClick={() => handleAnalyze(item.evidenceId, 'general')}
                      disabled={analyzing}
                      className="analyze-btn"
                    >
                      General Analysis
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
                          href={`https://ipfs.io/ipfs/${item.ipfsHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ipfs-link"
                        >
                          📦 View on IPFS
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {analysisResult && (
          <div className="analysis-section">
            <h2>AI Analysis Result</h2>
            <div className="analysis-card">
              <pre>{JSON.stringify(analysisResult, null, 2)}</pre>
              <button onClick={() => setAnalysisResult(null)} className="close-btn">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LawyerDashboard

