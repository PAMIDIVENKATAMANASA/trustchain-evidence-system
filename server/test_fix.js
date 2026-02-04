const { ethers } = require("ethers");

async function run() {
    console.log("Ethers version:", ethers.version);
    const providerUrl = "https://rpc.sepolia.org";

    // Correct way to set timeout in Ethers v6
    const fetchReq = new ethers.FetchRequest(providerUrl);
    fetchReq.timeout = 60000; // 60 seconds

    const provider = new ethers.JsonRpcProvider(fetchReq, {
        name: "sepolia",
        chainId: 11155111,
    }, {
        staticNetwork: true,
        batchMaxCount: 1,
    });

    try {
        console.log("Attempting to get block number (with fix)...");
        const block = await provider.getBlockNumber();
        console.log("Block number:", block);
        console.log("Success!");
    } catch (e) {
        console.error("Caught error:");
        console.error(e);
    }
}

run();
