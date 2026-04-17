const { ethers } = require("ethers");

// ─── Embedded Contract ABI and Address ───────────────────────────────────────
// Previously loaded from ../../blockchain/artifacts/... at runtime.
// Embedded here because Render only deploys server/ — the blockchain/ folder is absent.
const CONTRACT_ADDRESS = "0x3724EB94c9B96C6dB0A7A3253895995A6260C5bf";
const CONTRACT_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "evidenceId", type: "uint256" },
      { indexed: true, internalType: "bytes32", name: "hash", type: "bytes32" },
      { indexed: true, internalType: "address", name: "collector", type: "address" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "EvidenceAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "address", name: "judge", type: "address" }],
    name: "JudgeGranted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "address", name: "judge", type: "address" }],
    name: "JudgeRevoked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "address", name: "lawyer", type: "address" }],
    name: "LawyerGranted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "address", name: "lawyer", type: "address" }],
    name: "LawyerRevoked",
    type: "event",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "_hash", type: "bytes32" },
      { internalType: "address", name: "_collector", type: "address" },
    ],
    name: "addEvidence",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "evidenceCounter",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_evidenceId", type: "uint256" }],
    name: "evidenceExists",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "evidenceRecords",
    outputs: [
      { internalType: "bytes32", name: "hash", type: "bytes32" },
      { internalType: "address", name: "collector", type: "address" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
      { internalType: "bool", name: "exists", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getEvidenceCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_evidenceId", type: "uint256" }],
    name: "getOriginalHash",
    outputs: [
      { internalType: "bytes32", name: "hash", type: "bytes32" },
      { internalType: "address", name: "collector", type: "address" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
      { internalType: "bool", name: "exists", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_judge", type: "address" }],
    name: "grantJudge",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_lawyer", type: "address" }],
    name: "grantLawyer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_address", type: "address" }],
    name: "isJudge",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_address", type: "address" }],
    name: "isLawyer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "judges",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lawyers",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_judge", type: "address" }],
    name: "revokeJudge",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_lawyer", type: "address" }],
    name: "revokeLawyer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// ─── Provider & Signer ───────────────────────────────────────────────────────

function getProvider() {
  const providerUrl = process.env.BLOCKCHAIN_RPC_URL || "https://rpc.sepolia.org";

  const isSepolia = providerUrl.includes("sepolia") || providerUrl.includes("11155111");
  const isLocalhost = providerUrl.includes("localhost") || providerUrl.includes("127.0.0.1");

  const network = { name: "sepolia", chainId: 11155111 };
  const providerOptions = {
    staticNetwork: true,
    batchMaxCount: 1,
    request: { timeout: 60000 },
  };

  const provider = new ethers.JsonRpcProvider(providerUrl, network, providerOptions);

  provider._networkInfo = { isSepolia, isLocalhost, url: providerUrl };
  return provider;
}

function getSigner() {
  const privateKey =
    process.env.PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat default
  const provider = getProvider();
  return new ethers.Wallet(privateKey, provider);
}

async function getSignerAddress() {
  const signer = getSigner();
  return signer.address;
}

// ─── Contract Instance ─────────────────────────────────────────────────────

function getContract() {
  const signer = getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

// ─── Blockchain Operations ────────────────────────────────────────────────

async function addEvidence(hashBytes32, collectorAddress) {
  try {
    let provider = getProvider();
    try {
      await provider.getBlockNumber();
    } catch (providerError) {
      throw new Error(
        `Cannot connect to blockchain RPC: ${providerError.message}. Check BLOCKCHAIN_RPC_URL in server/.env`
      );
    }

    const contract = getContract();
    const tx = await contract.addEvidence(hashBytes32, collectorAddress);

    const receipt = await Promise.race([
      tx.wait(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Transaction timeout - network may be slow")), 120000)
      ),
    ]);

    const event = receipt.logs
      .map((log) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "EvidenceAdded");

    provider = getProvider();
    let networkInfo = provider._networkInfo || {};

    let etherscanUrl = null;
    if (networkInfo.isSepolia) {
      etherscanUrl = `https://sepolia.etherscan.io/tx/${tx.hash}`;
    }

    if (event) {
      return {
        success: true,
        evidenceId: event.args.evidenceId.toString(),
        transactionHash: tx.hash,
        etherscanUrl,
        network: networkInfo.isSepolia ? "sepolia" : networkInfo.isLocalhost ? "localhost" : "unknown",
      };
    }

    const count = await contract.getEvidenceCount();
    provider = getProvider();
    networkInfo = provider._networkInfo || {};

    etherscanUrl = null;
    if (networkInfo.isSepolia) {
      etherscanUrl = `https://sepolia.etherscan.io/tx/${tx.hash}`;
    }

    return {
      success: true,
      evidenceId: count.toString(),
      transactionHash: tx.hash,
      etherscanUrl,
      network: networkInfo.isSepolia ? "sepolia" : networkInfo.isLocalhost ? "localhost" : "unknown",
    };
  } catch (error) {
    console.error("Error adding evidence to blockchain:", error);
    throw error;
  }
}

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

async function isJudge(address) {
  try {
    const contract = getContract();
    return await contract.isJudge(address);
  } catch (error) {
    console.error("Error checking judge status:", error);
    return false;
  }
}

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
  getSignerAddress,
};