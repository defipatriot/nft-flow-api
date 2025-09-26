const express = require('express');
const { takeSnapshot } = require('./snapshot.js'); // Import our function

const app = express();
const port = process.env.PORT || 3000;

// This is a secret key to prevent random people from running your script.
// CHOOSE YOUR OWN SIMPLE SECRET and put it here.
const SNAPSHOT_SECRET = 'Runsnap@DAO!'; 

app.get('/', (req, res) => {
  res.send('Hello from the NFT Flow API! The API is running.');
});

// This is our new secret URL for triggering the snapshot
app.get('/api/trigger-snapshot', async (req, res) => {
  // We check if the request includes the correct secret key
  if (req.query.secret !== SNAPSHOT_SECRET) {
    // If the secret is wrong, send an error
    return res.status(401).send('Unauthorized: Invalid secret key.');
  }

  // If the secret is correct, run the snapshot function
  console.log('Trigger received, running snapshot...');
  const result = await takeSnapshot();
  res.status(200).send(`Snapshot process finished: ${result}`);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});