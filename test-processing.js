const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testProcessing() {
    console.log('🧪 Testing Credit Card Processor with example files...');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000 
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Listen for console messages and errors
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`❌ Browser Error: ${msg.text()}`);
        } else {
            console.log(`🖥️  Browser: ${msg.text()}`);
        }
    });
    
    // Listen for network requests
    page.on('response', response => {
        if (response.url().includes('/api/') && !response.ok()) {
            console.log(`🌐 API Error: ${response.status()} ${response.url()}`);
        }
    });
    
    try {
        console.log('📂 Navigating to application...');
        await page.goto('http://localhost:3000', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        // Wait for app to load
        await page.waitForTimeout(3000);
        
        console.log('🆕 Creating new session...');
        // Try to find the new session button more specifically
        const newSessionBtn = page.locator('button[title="Create new session."]');
        if (await newSessionBtn.count() > 0) {
            await newSessionBtn.click();
        } else {
            console.log('Looking for alternative new session button...');
            await page.locator('h3:text("New Session")').click();
        }
        
        await page.waitForTimeout(2000);
        
        console.log('📁 Uploading CAR file...');
        // Upload CAR file
        const carUpload = page.locator('input[type="file"]').first();
        await carUpload.setInputFiles('tests/example-reports/Cardholder+Activity+Report+General--March 2025.pdf');
        
        await page.waitForTimeout(2000);
        
        console.log('📁 Uploading Receipt file...');
        // Upload Receipt file  
        const receiptUpload = page.locator('input[type="file"]').nth(1);
        await receiptUpload.setInputFiles('tests/example-reports/Receipt_Images_Report-Jackie_09-30-2022 (3).pdf');
        
        await page.waitForTimeout(3000);
        
        console.log('🚀 Starting processing...');
        
        // Take screenshot before starting processing
        await page.screenshot({ path: 'before-processing.png', fullPage: true });
        console.log('📸 Screenshot saved before processing');
        
        // Wait for file uploads to complete
        await page.waitForTimeout(5000);
        
        // Look for Start Processing button with multiple selectors
        console.log('🔍 First, clicking Upload Files to upload the files...');
        const uploadBtn = page.locator('button:has-text("Upload Files")');
        if (await uploadBtn.count() > 0) {
            await uploadBtn.click();
            console.log('✅ Clicked Upload Files button');
            await page.waitForTimeout(5000);
        }
        
        // Wait for uploads to complete and button to change
        console.log('⏳ Waiting for uploads to complete...');
        await page.waitForTimeout(10000);
        
        console.log('🔍 Looking for Start Processing button...');
        const startSelectors = [
            'button:has-text("Start Processing")',
            'button:has-text("Process")', 
            'button[type="submit"]',
            'button:text-matches(".*Process.*", "i")',
            '.btn:has-text("Start")',
            'input[type="submit"][value*="Process"]',
            'button:has-text("Upload Files")' // In case it's still showing as upload
        ];
        
        let startBtn = null;
        for (const selector of startSelectors) {
            const btn = page.locator(selector);
            if (await btn.count() > 0) {
                console.log(`✅ Found button with selector: ${selector}`);
                startBtn = btn.first();
                break;
            }
        }
        
        if (!startBtn) {
            console.log('❌ No Start Processing button found. Taking final screenshot...');
            await page.screenshot({ path: 'no-start-button-final.png', fullPage: true });
            
            // Log all button text on page for debugging
            const allButtons = await page.locator('button').allTextContents();
            console.log('🔍 All buttons on page after upload:', allButtons);
            
            throw new Error('Could not find Start Processing button after upload');
        }
        
        await startBtn.click();
        
        console.log('⏳ Monitoring processing for 60 seconds...');
        
        // Monitor progress for 60 seconds
        let progressChecks = 0;
        const maxChecks = 30; // 60 seconds / 2 seconds per check
        
        while (progressChecks < maxChecks) {
            await page.waitForTimeout(2000);
            progressChecks++;
            
            // Check for progress indicators
            const progressText = await page.locator('text=/Processing|progress|%|complete|error/i').allTextContents();
            const currentProgress = progressText.join(' ');
            
            console.log(`📊 Progress Check ${progressChecks}: ${currentProgress}`);
            
            // Take screenshot every 10 checks
            if (progressChecks % 10 === 0) {
                await page.screenshot({ path: `processing-${progressChecks}.png`, fullPage: true });
                console.log(`📸 Screenshot saved: processing-${progressChecks}.png`);
            }
            
            // Check if processing completed or failed
            if (currentProgress.includes('completed') || currentProgress.includes('100%')) {
                console.log('✅ Processing completed!');
                break;
            } else if (currentProgress.includes('error') || currentProgress.includes('failed')) {
                console.log('❌ Processing failed!');
                await page.screenshot({ path: 'processing-error.png', fullPage: true });
                break;
            } else if (currentProgress.match(/\d+%/)) {
                const percentMatch = currentProgress.match(/(\d+)%/);
                if (percentMatch) {
                    const percent = parseInt(percentMatch[1]);
                    console.log(`🎯 Processing at ${percent}%`);
                    if (percent >= 1) {
                        console.log('✅ SUCCESS: Processing reached at least 1%!');
                        await page.screenshot({ path: 'processing-success.png', fullPage: true });
                        break;
                    }
                }
            }
        }
        
        await page.screenshot({ path: 'final-state.png', fullPage: true });
        console.log('📸 Final screenshot saved');
        
    } catch (error) {
        console.error('❌ Error during test:', error.message);
        await page.screenshot({ path: 'test-error.png', fullPage: true });
    }
    
    await browser.close();
}

// Run with proper error handling for Windows
testProcessing().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});