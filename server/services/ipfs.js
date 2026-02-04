const { create } = require('ipfs-http-client')
const crypto = require('crypto')

// Initialize IPFS client (compatible with ipfs-http-client v57.x)
let client = null

function getIPFSClient() {
  if (!client) {
    const url = process.env.IPFS_URL || 'http://localhost:5001'

    // For v57, we can pass a URL string
    // Add timeout configuration
    client = create({ 
      url,
      timeout: 30000, // 30 seconds timeout
    })
  }
  return client
}

// Pin file to IPFS (keeps it available on network)
async function pinFile(cid) {
  try {
    const ipfs = getIPFSClient()
    
    // Pin the file (recursive pin by default)
    await ipfs.pin.add(cid, { recursive: true })
    console.log(`✅ File pinned to IPFS: ${cid}`)
    
    // Also announce to DHT to make it discoverable
    try {
      await ipfs.dht.provide(cid)
      console.log(`✅ File announced to IPFS DHT: ${cid}`)
    } catch (dhtError) {
      console.warn(`⚠️  Could not announce to DHT: ${dhtError.message}`)
    }
    
    return { success: true, cid }
  } catch (error) {
    console.error('Error pinning file:', error)
    // Don't throw - pinning failure shouldn't break upload
    return { success: false, error: error.message }
  }
}

// Upload file to IPFS (any type)
async function uploadToIPFS(fileBuffer, fileName) {
  try {
    // Check if IPFS is accessible
    const ipfsUrl = process.env.IPFS_URL || 'http://localhost:5001'
    
    // Test IPFS connection first
    try {
      const testResponse = await fetch(`${ipfsUrl}/api/v0/version`, {
        method: 'POST',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      if (!testResponse.ok) {
        throw new Error(`IPFS API not responding: ${testResponse.status}`)
      }
    } catch (testError) {
      throw new Error(`IPFS daemon is not running or not accessible at ${ipfsUrl}. Please start IPFS: ipfs daemon`)
    }

    const ipfs = getIPFSClient()

    const result = await ipfs.add({
      path: fileName,
      content: fileBuffer,
    })

    const cid = result.cid.toString()

    // Automatically pin the file to keep it available on the network
    try {
      await pinFile(cid)
    } catch (pinError) {
      console.warn(`⚠️  Could not pin file ${cid}:`, pinError.message)
      // Continue even if pinning fails - file is still uploaded
    }

    return {
      success: true,
      cid,
      path: result.path,
      size: result.size,
    }
  } catch (error) {
    console.error('Error uploading to IPFS:', error)
    if (error.message.includes('IPFS daemon')) {
      throw new Error(`IPFS Error: ${error.message}. Make sure IPFS daemon is running: 'ipfs daemon'`)
    }
    throw error
  }
}

// Download file from IPFS
async function downloadFromIPFS(cid) {
  try {
    const ipfs = getIPFSClient()

    const chunks = []
    for await (const chunk of ipfs.cat(cid)) {
      chunks.push(chunk)
    }

    const fileBuffer = Buffer.concat(chunks)

    return {
      success: true,
      buffer: fileBuffer,
    }
  } catch (error) {
    console.error('Error downloading from IPFS:', error)
    throw error
  }
}

// Calculate SHA-256 hash of file buffer (used for blockchain integrity)
function calculateFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

// Get public gateway URL for a CID
function getPublicGatewayURL(cid) {
  const gatewayURL = process.env.IPFS_GATEWAY_URL || process.env.IPFS_GATEWAY_URL || 'http://localhost:8080'
  // Support both with and without trailing slash
  const baseURL = gatewayURL.endsWith('/') ? gatewayURL.slice(0, -1) : gatewayURL
  return `${baseURL}/ipfs/${cid}`
}

module.exports = {
  uploadToIPFS,
  downloadFromIPFS,
  calculateFileHash,
  getPublicGatewayURL,
  pinFile,
}
