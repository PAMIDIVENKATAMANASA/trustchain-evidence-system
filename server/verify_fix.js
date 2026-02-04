const { getProvider } = require("./services/blockchain");

async function run() {
    console.log("Verifying blockchain service...");
    const provider = getProvider();

    try {
        console.log("Provider configured. Attempting connection...");
        const block = await provider.getBlockNumber();
        console.log("Block number:", block);
    } catch (e) {
        if (e.message.includes("request.setHeader is not a function")) {
            console.error("FAIL: Error 'request.setHeader is not a function' still present!");
            process.exit(1);
        } else {
            console.log("PASS: 'request.setHeader' error is gone.");
            console.log("Caught expected network/RPC error:", e.shortMessage || e.message);
        }
    }
}

run();
