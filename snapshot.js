// Import the tools we need
const fs = require('fs').promises; // For interacting with the file system
const path = require('path');     // For working with file paths
const axios = require('axios');   // For making the API request

// --- Configuration ---
// The corrected API URL you provided
const API_URL = 'https://deving.zone/en/nfts/alliance_daos.json';
// The path to our persistent disk on Render
const SAVE_PATH = '/var/data';
// --------------------

// The main function that will run our script
async function takeSnapshot() {
  console.log('Starting snapshot...');
  try {
    // 1. Fetch the data from the API
    console.log(`Fetching data from ${API_URL}...`);
    const response = await axios.get(API_URL);
    const data = response.data;
    console.log(`Successfully fetched data.`);

    // 2. Create a filename based on the current date
    const today = new new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const filename = `snapshot-${year}-${month}-${day}.json`;
    console.log(`Generated filename: ${filename}`);

    // 3. Create the full path to the save location
    const fullPath = path.join(SAVE_PATH, filename);
    console.log(`Saving snapshot to: ${fullPath}`);

    // 4. Save the data to the file
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
    console.log('✅ Snapshot saved successfully!');

  } catch (error) {
    console.error('❌ Error taking snapshot:');
    console.error(error);
  }
}

// Run the main function
takeSnapshot();