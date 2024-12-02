const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    const urls = fs.readFileSync('urls.txt', 'utf-8').split('\n').filter(Boolean);

    let browser = await puppeteer.launch();
    let page = await browser.newPage();

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(`Visiting URL: ${url}`);
        const jsFiles = new Map();

        try {
            // Set up interception to block unnecessary resources
            await page.setRequestInterception(true);
            page.on('request', request => {
    	// Define the resources to block (like images, fonts, etc.)
    const blockedResources = ['image', 'stylesheet', 'font'];

    // Check if the request has already been handled
    if (!request.isInterceptResolutionHandled()) {
        if (blockedResources.includes(request.resourceType())) {
            // Abort unwanted resources
            request.abort();
        } else {
            // Continue allowed requests
            request.continue();
        }
    }
});


            page.on('response', async response => {
                const requestUrl = response.url();
                if (requestUrl.endsWith('.js')) {
                    try {
                        const jsContent = await response.text();
                        const fileName = path.basename(requestUrl.split('?')[0]);
                        jsFiles.set(fileName, jsContent);
                    } catch (err) {
                        console.error(`Failed to fetch JS file from ${requestUrl}:`, err.message);
                    }
                }
            });

            await page.goto(url, { waitUntil: 'domcontentloaded' });

            const folderName = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '_');
            const folderPath = path.join(__dirname, folderName);
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }

            for (const [fileName, content] of jsFiles) {
                const filePath = path.join(folderPath, fileName);
                fs.writeFileSync(filePath, content, 'utf-8');
                console.log(`Saved JS file: ${filePath}`);
            }
            jsFiles.clear();
        } catch (err) {
            console.error(`Error processing URL ${url}:`, err.message);
        }

        // Restart browser periodically
        if (i % 50 === 0) {
            await browser.close();
            browser = await puppeteer.launch();
            page = await browser.newPage();
        }
    }

    await browser.close();
    console.log('Done!');
})();
