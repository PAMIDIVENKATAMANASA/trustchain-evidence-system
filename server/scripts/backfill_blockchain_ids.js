/**
 * One-time backfill script: matches each MongoDB evidence record to its correct
 * on-chain slot by comparing the stored fileHash → keccak256 against each
 * blockchain slot's stored hash.
 *
 * Run: node server/scripts/backfill_blockchain_ids.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// ------- Load contract -------
const deploymentPath = path.join(__dirname, "../../blockchain/deployment.json");
const artifactPath = path.join(
    __dirname,
    "../../blockchain/artifacts/contracts/ChainOfCustody.sol/ChainOfCustody.json"
);

if (!fs.existsSync(deploymentPath) || !fs.existsSync(artifactPath)) {
    console.error("❌ Missing deployment.json or compiled artifact. Run 'npx hardhat compile' first.");
    process.exit(1);
}

const { contractAddress } = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
const { abi } = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

// ------- Load Evidence model -------
const evidenceSchema = new mongoose.Schema(
    {
        evidenceId: Number,
        blockchainEvidenceId: { type: Number, default: null },
        fileHash: { type: String, default: "" },
        blockchainHash: { type: String },
        fileName: String,
    },
    { strict: false }
);
const Evidence = mongoose.model("Evidence", evidenceSchema);

async function main() {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(
        process.env.BLOCKCHAIN_RPC_URL,
        { name: "sepolia", chainId: 11155111 },
        { staticNetwork: true }
    );
    const contract = new ethers.Contract(contractAddress, abi, provider);

    // Get total number of on-chain evidence entries
    const count = Number(await contract.getEvidenceCount());
    console.log(`📦 On-chain evidence count: ${count}`);

    // Build a map: keccak256(fileHash) → chainSlotId
    const chainMap = new Map(); // bytes32 hash → slot id
    for (let i = 1; i <= count; i++) {
        const [hash] = await contract.getOriginalHash(i);
        chainMap.set(hash.toLowerCase(), i);
        console.log(`  Slot ${i}: ${hash}`);
    }

    // Now patch each MongoDB record
    const records = await Evidence.find({});
    let updated = 0;

    for (const rec of records) {
        if (rec.blockchainEvidenceId != null) {
            console.log(`⏭  evidenceId=${rec.evidenceId} already has blockchainEvidenceId=${rec.blockchainEvidenceId}`);
            continue;
        }

        if (!rec.fileHash) {
            console.warn(`⚠️  evidenceId=${rec.evidenceId} (${rec.fileName}) has no fileHash — cannot backfill`);
            continue;
        }

        const hashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(rec.fileHash)).toLowerCase();
        const slotId = chainMap.get(hashBytes32);

        if (slotId != null) {
            rec.blockchainEvidenceId = slotId;
            await rec.save();
            console.log(`✅ evidenceId=${rec.evidenceId} → blockchainEvidenceId=${slotId}`);
            updated++;
        } else {
            console.warn(`❌ evidenceId=${rec.evidenceId} (${rec.fileName}) — no matching on-chain hash found`);
        }
    }

    console.log(`\n✅ Done. Patched ${updated} record(s).`);
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
});
