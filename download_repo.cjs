const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

const url = 'https://codeload.github.com/viciowins-ai/jacare-do-corte/zip/refs/heads/master';
const zipFilePath = './repo.zip';

console.log('Downloading...');
https.get(url, (res) => {
  const fileStream = fs.createWriteStream(zipFilePath);
  res.pipe(fileStream);

  fileStream.on('finish', () => {
    fileStream.close();
    console.log('Download complete. Unzipping...');
    try {
      execSync(`npx -y extract-zip repo.zip ${process.cwd()}`);
      console.log('Unzipped.');
    } catch(err) {
      console.error(err);
    }
  });
}).on('error', (err) => {
  console.error('Error downloading:', err);
});
