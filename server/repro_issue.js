const { ethers } = require("ethers");

async function run() {
    console.log("Ethers version:", ethers.version);
    const providerUrl = "https://rpc.sepolia.org"; // Public RPC
    const provider = new ethers.JsonRpcProvider(providerUrl, {
        name: "sepolia",
        chainId: 11155111,
    }, {
        staticNetwork: true,
        batchMaxCount: 1,
    });

    // The buggy override
    provider._getConnection = function () {
        if (!this._connection) {
            this._connection = {
                url: providerUrl,
                timeout: 60000,
            };
        }
        return this._connection;
    };

    try {
        console.log("Attempting to get block number...");
        const block = await provider.getBlockNumber();
        console.log("Block number:", block);
    } catch (e) {
        console.error("Caught expected error:");
        console.error(e);
    }
}

run();
