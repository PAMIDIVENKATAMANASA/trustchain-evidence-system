const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load contract ABI and address
let contractABI = null;
let contractAddress = null;

// Initialize contract info from deployment
function loadContractInfo() {
  try {
    const deploymentPath = path.join(__dirname, "../../blockchain/deployment.json");
    if (fs.existsSync(deploymentPath)) {
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
      contractAddress = deployment.contractAddress;
    }

    // Load ABI from compiled contract
    const artifactPath = path.join(
      __dirname,
      "../../blockchain/artifacts/contracts/ChainOfCustody.sol/ChainOfCustody.json"
    );
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      contractABI = artifact.abi;
    }
  } catch (error) {
    console.error("Error loading contract info:", error);
  }
}

// Initialize on module load
loadContractInfo();

// Get provider (Sepolia testnet by default, or use environment variable)
// --- Start of FIX for server/services/blockchain.js ---

// Get provider (Sepolia testnet by default, or use environment variable)
function getProvider() {
  const providerUrl = process.env.BLOCKCHAIN_RPC_URL || "https://rpc.sepolia.org";

  // Detect network from URL (for logging/Etherscan links)
  const isSepolia = providerUrl.includes("sepolia") || providerUrl.includes("11155111");
  const isLocalhost = providerUrl.includes("localhost") || providerUrl.includes("127.0.0.1");

  // *** THE FIX IS BELOW: Correctly passing URL and configuration options ***
  
  // 1. Define the network details
  const network = {
    name: "sepolia",
    chainId: 11155111,
  };

  // 2. Define the provider options, including the timeout
  const providerOptions = {
    staticNetwork: true, // Prevent network detection (faster)
    batchMaxCount: 1, // Disable batching for reliability
    // Pass the request configuration to the Provider's options
    // This correctly applies the timeout to the underlying fetch calls
    request: {
        timeout: 60000 // 60 seconds
    }
  };

  // 3. Create provider using the URL, Network details, and Options
  const provider = new ethers.JsonRpcProvider(providerUrl, network, providerOptions);

  // Store network info for Etherscan links (your original logic)
  provider._networkInfo = {
    isSepolia,
    isLocalhost,
    url: providerUrl
  };

  return provider;
}

// --- End of FIX for server/services/blockchain.js ---

// Get signer from private key
function getSigner() {
  const privateKey = process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat default
  const provider = getProvider();
  return new ethers.Wallet(privateKey, provider);
}

// Get signer address (helper for routes)
async function getSignerAddress() {
  const signer = getSigner();
  return signer.address;
}

// Get contract instance
function getContract() {
  if (!contractABI || !contractAddress) {
    loadContractInfo();
  }

  if (!contractABI || !contractAddress) {
    throw new Error("Contract not deployed. Please deploy the contract first.");
  }

  const signer = getSigner();
  return new ethers.Contract(contractAddress, contractABI, signer);
}

// Add evidence to blockchain
// hashBytes32 should be the file hash (SHA256 converted to bytes32 via keccak256)
async function addEvidence(hashBytes32, collectorAddress) {
  try {
    // Test provider connection first
    // *** FIX 1: Changed 'const' to 'let' for provider ***
    let provider = getProvider();
    try {
      await provider.getBlockNumber();
    } catch (providerError) {
      throw new Error(`Cannot connect to blockchain RPC: ${providerError.message}. Check BLOCKCHAIN_RPC_URL in server/.env`);
    }

    const contract = getContract();

    // Send transaction with increased timeout
    const tx = await contract.addEvidence(hashBytes32, collectorAddress);

    // Wait for transaction with timeout
    const receipt = await Promise.race([
      tx.wait(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Transaction timeout - network may be slow")), 120000) // 2 minutes
      )
    ]);

    // Get the evidence ID from events in the receipt
    const event = receipt.logs
      .map((log) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "EvidenceAdded");

    // Get network info for Etherscan link
    provider = getProvider(); // SAFE now that 'provider' is 'let'
    
    // *** FIX 2: Changed 'const' to 'let' for networkInfo ***
    let networkInfo = provider._networkInfo || {}; 

    // Generate Etherscan URL if on Sepolia
    let etherscanUrl = null;
    if (networkInfo.isSepolia) {
      etherscanUrl = `https://sepolia.etherscan.io/tx/${tx.hash}`;
    }

    if (event) {
      return {
        success: true,
        evidenceId: event.args.evidenceId.toString(),
        transactionHash: tx.hash,
        etherscanUrl: etherscanUrl,
        network: networkInfo.isSepolia ? "sepolia" : networkInfo.isLocalhost ? "localhost" : "unknown",
      };
    }

    // Fallback: get the latest evidence count
    const count = await contract.getEvidenceCount();
    provider = getProvider(); // SAFE now that 'provider' is 'let'
    networkInfo = provider._networkInfo || {}; // SAFE now that 'networkInfo' is 'let'

    etherscanUrl = null;
    if (networkInfo.isSepolia) {
      etherscanUrl = `https://sepolia.etherscan.io/tx/${tx.hash}`;
    }

    return {
      success: true,
      evidenceId: count.toString(),
      transactionHash: tx.hash,
      etherscanUrl: etherscanUrl,
      network: networkInfo.isSepolia ? "sepolia" : networkInfo.isLocalhost ? "localhost" : "unknown",
    };
  } catch (error) {
    console.error("Error adding evidence to blockchain:", error);
    throw error;
  }
}

// Get original hash from blockchain
async function getOriginalHash(evidenceId) {
  try {
    const contract = getContract();
    const result = await contract.getOriginalHash(evidenceId);

    return {
      hash: result.hash,
      collector: result.collector,
      timestamp: result.timestamp.toString(),
      exists: result.exists,
    };
  } catch (error) {
    console.error("Error getting original hash from blockchain:", error);
    throw error;
  }
}
// Check if address is judge
async function isJudge(address) {
  try {
    const contract = getContract();
    return await contract.isJudge(address);
  } catch (error) {
    console.error("Error checking judge status:", error);
    return false;
  }
}

// Check if address is lawyer
async function isLawyer(address) {
  try {
    const contract = getContract();
    return await contract.isLawyer(address);
  } catch (error) {
    console.error("Error checking lawyer status:", error);
    return false;
  }
}

module.exports = {
  addEvidence,
  getOriginalHash,
  isJudge,
  isLawyer,
  getProvider,
  getContract,
  loadContractInfo,
  getSignerAddress,
};