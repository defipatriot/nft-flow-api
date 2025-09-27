const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Configuration ---
const METADATA_URL = "https://cdn.jsdelivr.net/gh/defipatriot/nft-metadata/all_nfts_metadata.json";
const STATUS_DATA_URL = "https://deving.zone/en/nfts/alliance_daos.json";
const UPDATE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// --- In-Memory Cache ---
let apiCache = {
    allNfts: [],
    marketActivity: {
        bbl: { sold: [], listed: [] },
        boost: { sold: [], listed: [] }
    },
    keyMetrics: {
        daodaoStaked: 0,
        enterpriseStaked: 0,
        daodaoChange24h: 0,
        enterpriseChange24h: 0
    },
    lastUpdated: null,
    history: [] 
};

// --- Middleware ---
// This allows requests from other websites, like your dashboard.
app.use(cors());

// --- Helper Functions ---
const shortenAddress = (address) => {
    if (!address || address.length < 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * The core function that fetches, processes, and analyzes data.
 */
async function updateCache() {
    console.log('Starting cache update process...');
    try {
        const [metaResponse, statusResponse] = await Promise.all([
            axios.get(METADATA_URL),
            axios.get(STATUS_DATA_URL)
        ]);

        const metadata = metaResponse.data;
        const statusData = statusResponse.data;

        if (!Array.isArray(metadata) || !statusData || !Array.isArray(statusData.nfts)) {
            throw new Error('Invalid data format received from upstream APIs.');
        }

        const previousState = apiCache.allNfts.length > 0 ? new Map(apiCache.allNfts.map(nft => [String(nft.id), nft])) : null;

        const statusMap = new Map(statusData.nfts.map(nft => [String(nft.id), nft]));
        const mergedNfts = metadata.map(nft => {
            const status = statusMap.get(String(nft.id));
            return status ? { ...nft, ...status } : nft;
        });

        const currentState = new Map(mergedNfts.map(nft => [String(nft.id), nft]));
        
        const newMarketActivity = {
            bbl: { sold: [], listed: [] },
            boost: { sold: [], listed: [] }
        };

        if (previousState) {
            currentState.forEach((newNft, id) => {
                const oldNft = previousState.get(id);
                if (!oldNft) return; 

                const now = new Date().toISOString();

                if (oldNft.bbl && !newNft.bbl && oldNft.owner !== newNft.owner) {
                    newMarketActivity.bbl.sold.push({
                        id: newNft.id,
                        broken: newNft.broken,
                        date: now,
                        seller: oldNft.owner,
                        buyer: newNft.owner
                    });
                }
                if (!oldNft.bbl && newNft.bbl) {
                    newMarketActivity.bbl.listed.push({
                        id: newNft.id,
                        broken: newNft.broken,
                        date: now,
                        lister: newNft.owner
                    });
                }
                if (oldNft.boost && !newNft.boost && oldNft.owner !== newNft.owner) {
                    newMarketActivity.boost.sold.push({
                        id: newNft.id,
                        broken: newNft.broken,
                        date: now,
                        seller: oldNft.owner,
                        buyer: newNft.owner
                    });
                }
                if (!oldNft.boost && newNft.boost) {
                    newMarketActivity.boost.listed.push({
                        id: newNft.id,
                        broken: newNft.broken,
                        date: now,
                        lister: newNft.owner
                    });
                }
            });
        }
        
        const now = new Date();
        const currentSnapshot = {
            timestamp: now,
            daodaoStaked: mergedNfts.filter(n => n.daodao).length,
            enterpriseStaked: mergedNfts.filter(n => n.enterprise).length
        };
        
        apiCache.history.push(currentSnapshot);
        const twentyFourHoursAgo = now.getTime() - (24 * 60 * 60 * 1000);
        apiCache.history = apiCache.history.filter(snap => snap.timestamp.getTime() > twentyFourHoursAgo);
        
        const previousSnapshot = apiCache.history[0];
        
        apiCache.keyMetrics.daodaoStaked = currentSnapshot.daodaoStaked;
        apiCache.keyMetrics.enterpriseStaked = currentSnapshot.enterpriseStaked;
        apiCache.keyMetrics.daodaoChange24h = currentSnapshot.daodaoStaked - (previousSnapshot ? previousSnapshot.daodaoStaked : currentSnapshot.daodaoStaked);
        apiCache.keyMetrics.enterpriseChange24h = currentSnapshot.enterpriseStaked - (previousSnapshot ? previousSnapshot.enterpriseStaked : currentSnapshot.enterpriseStaked);

        apiCache.allNfts = mergedNfts;
        apiCache.marketActivity.bbl.sold = [...newMarketActivity.bbl.sold, ...apiCache.marketActivity.bbl.sold].slice(0, 2);
        apiCache.marketActivity.bbl.listed = [...newMarketActivity.bbl.listed, ...apiCache.marketActivity.bbl.listed].slice(0, 2);
        apiCache.marketActivity.boost.sold = [...newMarketActivity.boost.sold, ...apiCache.marketActivity.boost.sold].slice(0, 2);
        apiCache.marketActivity.boost.listed = [...newMarketActivity.boost.listed, ...apiCache.marketActivity.boost.listed].slice(0, 2);
        apiCache.lastUpdated = new Date().toISOString();

        console.log(`Cache updated successfully at ${apiCache.lastUpdated}.`);

    } catch (error) {
        console.error('Failed to update cache:', error.message);
    }
}


// --- API Endpoints ---

app.get('/', (req, res) => {
    res.send(`Alliance DAO NFT Flow API is running. Last updated: ${apiCache.lastUpdated || 'Never'}`);
});

app.get('/api/market-activity', (req, res) => {
    if (!apiCache.lastUpdated) {
        return res.status(503).json({ error: 'Data is not available yet. Please try again in a moment.' });
    }
    res.json(apiCache.marketActivity);
});

app.get('/api/key-metrics', (req, res) => {
     if (!apiCache.lastUpdated) {
        return res.status(503).json({ error: 'Data is not available yet. Please try again in a moment.' });
    }
    res.json(apiCache.keyMetrics);
});

app.get('/api/collection', (req, res) => {
    if (!apiCache.lastUpdated) {
        return res.status(503).json({ error: 'Data is not available yet. Please try again in a moment.' });
    }
    res.json({
        lastUpdated: apiCache.lastUpdated,
        nfts: apiCache.allNfts
    });
});


// --- Server Initialization ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    updateCache();
    setInterval(updateCache, UPDATE_INTERVAL_MS);
});
