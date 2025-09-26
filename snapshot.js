const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const API_URL = 'https://deving.zone/en/nfts/alliance_daos.json';
const SAVE_PATH = '/var/data';

async function takeSnapshot() {
  console.log('Snapshot function triggered...');
  try {
    console.log(`Fetching data from ${API_URL}...`);
    const response = await axios.get(API_URL);
    const data = response.data;
    console.log(`Successfully fetched data.`);

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const filename = `snapshot-${year}-${month}-${day}.json`;
    console.log(`Generated filename: ${filename}`);

    const fullPath = path.join(SAVE_PATH, filename);
    console.log(`Saving snapshot to: ${fullPath}`);
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
    console.log('✅ Snapshot saved successfully!');
    return "Snapshot saved successfully!"; // Return success message
  } catch (error) {
    console.error('❌ Error taking snapshot:', error);
    return "Error taking snapshot."; // Return error message
  }
}

// Export the function so other files can use it
module.exports = { takeSnapshot };