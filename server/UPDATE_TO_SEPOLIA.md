# Quick Guide: Update Server to Use Sepolia

## ⚠️ Important: Stop Using Local Hardhat Node

**Problem:** You're running `npx hardhat node` which creates a LOCAL blockchain. Transactions on local blockchain don't appear on Etherscan.

**Solution:** Use Sepolia testnet instead.

---

## 🚀 Quick Fix (3 Steps)

### Step 1: Update server/.env

Edit `server/.env` file:

```bash
# Change this:
# BLOCKCHAIN_RPC_URL=http://localhost:8545

# To this (Sepolia):
BLOCKCHAIN_RPC_URL=https://rpc.sepolia.org

# Or use your Infura URL:
# BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/7131a74d24af420298d28095445bef38

# Keep your private key:
PRIVATE_KEY=0x6f1c58178a7ec68531d13b950a58a7d6c553633759fd9f53310be3982398ee67
```

### Step 2: Stop Hardhat Node

**Stop running:**
```bash
npx hardhat node
```

**You don't need this anymore!** Sepolia is a public testnet, no local node needed.

### Step 3: Restart Server

```bash
cd server
npm start
```

---

## ✅ Verify It's Working

### Test 1: Upload Evidence

1. Upload a file via your app
2. Check response - should include:
   - `etherscanUrl`: Link to Sepolia Etherscan
   - `network`: "sepolia"

### Test 2: Check Transaction on Etherscan

1. Copy `etherscanUrl` from response
2. Open in browser
3. Should show transaction on Sepolia Etherscan ✅

---

## 📋 Before vs After

### Before (Localhost):
- ❌ Transaction hash: `0x...` (local only)
- ❌ Not on Etherscan
- ❌ Only visible on your computer

### After (Sepolia):
- ✅ Transaction hash: `0x...` (on Sepolia)
- ✅ Visible on Etherscan
- ✅ Accessible from anywhere
- ✅ Etherscan link included in response

---

## 🔍 Check Your Current Setup

**Check what RPC URL you're using:**
```bash
cd server
grep BLOCKCHAIN_RPC_URL .env
```

**If it shows `localhost:8545` → Change it to Sepolia!**

---

**Update your `.env` file and restart server - that's it!** 🎯

