const crypto = require('crypto')

// Pinata API configuration
const PINATA_API_KEY = process.env.PINATA_API_KEY || ''
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY || ''
const PINATA_JWT = process.env.PINATA_JWT || ''

// Upload file to IPFS via Pinata
async function uploadToIPFS(fileBuffer, fileName) {
  try {
    if (!PINATA_JWT && !PINATA_API_KEY) {
      throw new Error('Pinata credentials not configured. Set PINATA_JWT or PINATA_API_KEY/PINATA_SECRET_KEY in .env')
    }

    // Use dynamic import for node-fetch (ESM module)
    const FormData = require('form-data')
    const formData = new FormData()

    // Add file buffer as a stream-like object
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: 'application/octet-stream',
    })

    // Add pinata metadata
    const metadata = JSON.stringify({ name: fileName })
    formData.append('pinataMetadata', metadata)

    const headers = {
      ...formData.getHeaders(),
    }

    // Prefer JWT auth, fall back to API key pair
    if (PINATA_JWT) {
      headers['Authorization'] = `Bearer ${PINATA_JWT}`
    } else {
      headers['pinata_api_key'] = PINATA_API_KEY
      headers['pinata_secret_api_key'] = PINATA_SECRET_KEY
    }

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Pinata upload failed (${response.status}): ${errorText}`)
    }

    const result = await response.json()
    const cid = result.IpfsHash

    console.log(`✅ File uploaded to IPFS via Pinata: ${cid}`)

    return {
      success: true,
      cid,
      path: fileName,
      size: result.PinSize,
    }
  } catch (error) {
    console.error('Error uploading to IPFS via Pinata:', error)
    throw error
  }
}

// Download file from IPFS via public gateway
async function downloadFromIPFS(cid) {
  try {
    // Try Pinata dedicated gateway first, fallback to public gateway
    const gatewayUrls = [
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
    ]

    let lastError = null
    for (const url of gatewayUrls) {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(30000), // 30 second timeout
        })

        if (!response.ok) {
          throw new Error(`Gateway returned ${response.status}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        const fileBuffer = Buffer.from(arrayBuffer)

        console.log(`✅ File downloaded from IPFS: ${cid} via ${url}`)

        return {
          success: true,
          buffer: fileBuffer,
        }
      } catch (gatewayError) {
        console.warn(`⚠️ Gateway ${url} failed: ${gatewayError.message}`)
        lastError = gatewayError
      }
    }

    throw new Error(`All IPFS gateways failed for CID ${cid}: ${lastError?.message}`)
  } catch (error) {
    console.error('Error downloading from IPFS:', error)
    throw error
  }
}

// Pin file to IPFS (no-op for Pinata since files are auto-pinned on upload)
async function pinFile(cid) {
  // Pinata automatically pins files when uploaded via their API
  console.log(`✅ File ${cid} is already pinned on Pinata`)
  return { success: true, cid }
}

// Calculate SHA-256 hash of file buffer (used for blockchain integrity)
function calculateFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

// Get public gateway URL for a CID
function getPublicGatewayURL(cid) {
  return `https://gateway.pinata.cloud/ipfs/${cid}`
}

module.exports = {
  uploadToIPFS,
  downloadFromIPFS,
  calculateFileHash,
  getPublicGatewayURL,
  pinFile,
}
