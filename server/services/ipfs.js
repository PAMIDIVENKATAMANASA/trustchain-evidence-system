const crypto = require('crypto')
const FormData = require('form-data')
const https = require('https')

// Pinata API configuration
const PINATA_API_KEY = process.env.PINATA_API_KEY || ''
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY || ''
const PINATA_JWT = process.env.PINATA_JWT || ''

// Upload file to IPFS via Pinata (using Node.js https module for max compatibility)
async function uploadToIPFS(fileBuffer, fileName) {
  try {
    if (!PINATA_JWT && !PINATA_API_KEY) {
      throw new Error('Pinata credentials not configured. Set PINATA_JWT or PINATA_API_KEY/PINATA_SECRET_KEY in .env')
    }

    const formData = new FormData()

    // Add file buffer
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: 'application/octet-stream',
    })

    // Add pinata metadata
    const metadata = JSON.stringify({ name: fileName })
    formData.append('pinataMetadata', metadata)

    // Build headers
    const headers = {
      ...formData.getHeaders(),
    }

    if (PINATA_JWT) {
      headers['Authorization'] = `Bearer ${PINATA_JWT}`
    } else {
      headers['pinata_api_key'] = PINATA_API_KEY
      headers['pinata_secret_api_key'] = PINATA_SECRET_KEY
    }

    // Use Node.js https module (works on all Node versions, compatible with form-data streams)
    const result = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.pinata.cloud',
          path: '/pinning/pinFileToIPFS',
          method: 'POST',
          headers: headers,
          timeout: 60000,
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => { data += chunk })
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(data))
              } catch (e) {
                reject(new Error(`Pinata returned invalid JSON: ${data}`))
              }
            } else {
              reject(new Error(`Pinata upload failed (${res.statusCode}): ${data}`))
            }
          })
        }
      )

      req.on('error', (err) => reject(new Error(`Pinata request failed: ${err.message}`)))
      req.on('timeout', () => { req.destroy(); reject(new Error('Pinata upload timed out')) })

      // Pipe form-data stream into the request
      formData.pipe(req)
    })

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
    const gatewayUrls = [
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
    ]

    let lastError = null
    for (const url of gatewayUrls) {
      try {
        const result = await new Promise((resolve, reject) => {
          https.get(url, { timeout: 30000 }, (res) => {
            // Handle redirects (3xx)
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              https.get(res.headers.location, { timeout: 30000 }, (redirectRes) => {
                if (redirectRes.statusCode !== 200) {
                  reject(new Error(`Gateway returned ${redirectRes.statusCode} after redirect`))
                  return
                }
                const chunks = []
                redirectRes.on('data', (chunk) => chunks.push(chunk))
                redirectRes.on('end', () => resolve(Buffer.concat(chunks)))
                redirectRes.on('error', reject)
              }).on('error', reject)
              return
            }

            if (res.statusCode !== 200) {
              reject(new Error(`Gateway returned ${res.statusCode}`))
              return
            }
            const chunks = []
            res.on('data', (chunk) => chunks.push(chunk))
            res.on('end', () => resolve(Buffer.concat(chunks)))
            res.on('error', reject)
          }).on('error', reject).on('timeout', function () { this.destroy(); reject(new Error('Timeout')) })
        })

        console.log(`✅ File downloaded from IPFS: ${cid} via ${url}`)
        return { success: true, buffer: result }
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
