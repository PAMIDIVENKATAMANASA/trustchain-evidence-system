import React, { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { getAuthHeaders } from '../utils/auth'
import './Dashboard.css'

const OfficerDashboard = ({ user, onLogout }) => {
  const [evidence, setEvidence] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    file: null,
    description: '',
    gpsLatitude: '',
    gpsLongitude: ''
  })

  useEffect(() => {
    fetchEvidence()
  }, [])

  const fetchEvidence = async () => {
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
    }
  }

  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      file: e.target.files[0]
    })
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            gpsLatitude: position.coords.latitude.toString(),
            gpsLongitude: position.coords.longitude.toString()
          })
          toast.success('GPS coordinates captured')
        },
        (error) => {
          toast.error('Could not get GPS coordinates')
        }
      )
    } else {
      toast.error('Geolocation not supported')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.file) {
      toast.error('Please select a file')
      return
    }

    setUploading(true)
    const uploadFormData = new FormData()
    uploadFormData.append('file', formData.file)
    uploadFormData.append('description', formData.description)
    uploadFormData.append('gpsLatitude', formData.gpsLatitude)
    uploadFormData.append('gpsLongitude', formData.gpsLongitude)

    try {
      const token = localStorage.getItem('trustchain_token')
      const response = await fetch('http://localhost:5000/api/evidence/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadFormData
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Evidence uploaded and sealed successfully!')
        setFormData({
          file: null,
          description: '',
          gpsLatitude: '',
          gpsLongitude: ''
        })
        document.getElementById('file-input').value = ''
        fetchEvidence()
      } else {
        toast.error(data.message || 'Upload failed')
      }
    } catch (error) {
      toast.error('Network error. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Officer Dashboard</h1>
          <p>Welcome, {user.name}</p>
        </div>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </header>

      <div className="dashboard-content">
        <div className="upload-section">
          <h2>Upload Evidence</h2>
          <form onSubmit={handleSubmit} className="upload-form">
            <div className="form-group">
              <label>Evidence File</label>
              <input
                id="file-input"
                type="file"
                onChange={handleFileChange}
                // Accept any file type: images, videos, audio, PDFs, text, documents, etc.
                accept="*/*"
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                placeholder="Enter evidence description..."
              />
            </div>
            <div className="form-group">
              <label>GPS Coordinates</label>
              <div className="gps-group">
                <input
                  type="number"
                  name="gpsLatitude"
                  value={formData.gpsLatitude}
                  onChange={handleInputChange}
                  placeholder="Latitude"
                  step="any"
                />
                <input
                  type="number"
                  name="gpsLongitude"
                  value={formData.gpsLongitude}
                  onChange={handleInputChange}
                  placeholder="Longitude"
                  step="any"
                />
                <button type="button" onClick={getCurrentLocation} className="gps-btn">
                  Get Current Location
                </button>
              </div>
            </div>
            <button type="submit" disabled={uploading} className="submit-btn">
              {uploading ? 'Uploading...' : 'Upload & Seal Evidence'}
            </button>
          </form>
        </div>

        <div className="evidence-section">
          <h2>My Evidence Records</h2>
          {evidence.length === 0 ? (
            <p className="no-data">No evidence uploaded yet</p>
          ) : (
            <div className="evidence-list">
              {evidence.map((item) => (
                <div key={item._id} className="evidence-card">
                  <h3>{item.fileName}</h3>
                  <p><strong>Evidence ID:</strong> {item.evidenceId}</p>
                  <p><strong>Type:</strong> {item.fileType}</p>
                  <p><strong>Size:</strong> {(item.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                  <p><strong>IPFS Hash:</strong> <code className="hash">{item.ipfsHash}</code></p>
                  <p><strong>Blockchain Hash:</strong> <code className="hash">{item.blockchainHash}</code></p>
                  <p><strong>Status:</strong> <span className={`status ${item.status}`}>{item.status}</span></p>
                  <p><strong>Uploaded:</strong> {new Date(item.timestamp).toLocaleString()}</p>
                  {item.description && <p><strong>Description:</strong> {item.description}</p>}
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
      </div>
    </div>
  )
}

export default OfficerDashboard

