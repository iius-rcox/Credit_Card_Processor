const { test, expect } = require('@playwright/test');

test.describe('GUI Structure Analysis', () => {
  test('Analyze Current Application GUI Structure', async ({ page }) => {
    console.log('=== Starting GUI Structure Analysis ===');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for application to initialize
    await page.waitForTimeout(3000);

    // Get basic page structure
    const pageTitle = await page.title();
    console.log(`Page Title: ${pageTitle}`);

    // Analyze main layout elements
    const bodyContent = await page.locator('body').innerHTML();
    console.log(`Body has content: ${bodyContent.length > 0}`);

    // Find all app containers (fixing the duplicate issue)
    const appContainers = await page.locator('[id="app"]').all();
    console.log(`Found ${appContainers.length} elements with id="app"`);

    // Use the last app container (actual Vue app)
    const appContainer = page.locator('[id="app"]').last();
    const appContent = await appContainer.textContent();
    console.log(`App container has content: ${appContent.length > 0}`);
    
    if (appContent.length > 0) {
      console.log(`App content preview: ${appContent.substring(0, 200)}...`);
    }

    // Analyze header structure
    const headers = await page.locator('header').all();
    console.log(`Found ${headers.length} header elements`);
    
    if (headers.length > 0) {
      const headerText = await headers[0].textContent();
      console.log(`Header content: "${headerText}"`);
    }

    // Analyze main content
    const mainElements = await page.locator('main, #main-content').all();
    console.log(`Found ${mainElements.length} main content elements`);

    // Analyze component structure
    const vueComponents = await page.locator('[data-v-]').all();
    console.log(`Found ${vueComponents.length} Vue components`);

    // Analyze interactive elements
    const buttons = await page.locator('button:visible').all();
    const inputs = await page.locator('input:visible').all();
    const links = await page.locator('a:visible').all();

    console.log(`Interactive elements:`);
    console.log(`  - Buttons: ${buttons.length}`);
    console.log(`  - Inputs: ${inputs.length}`);
    console.log(`  - Links: ${links.length}`);

    // Get button texts
    for (let i = 0; i < Math.min(5, buttons.length); i++) {
      const buttonText = await buttons[i].textContent();
      console.log(`  Button ${i + 1}: "${buttonText}"`);
    }

    // Analyze file upload interface
    const fileInputs = await page.locator('input[type="file"]').all();
    const uploadElements = await page.locator('[class*="upload"], [data-testid*="upload"]').all();
    console.log(`File upload elements:`);
    console.log(`  - File inputs: ${fileInputs.length}`);
    console.log(`  - Upload components: ${uploadElements.length}`);

    // Analyze responsive elements
    const responsiveClasses = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const responsivePatterns = ['mobile', 'tablet', 'desktop', 'sm:', 'md:', 'lg:', 'xl:'];
      const responsiveElements = [];
      
      allElements.forEach(el => {
        const className = el.className || '';
        const hasResponsive = responsivePatterns.some(pattern => 
          className.includes(pattern)
        );
        if (hasResponsive) {
          responsiveElements.push(className);
        }
      });
      
      return responsiveElements.slice(0, 10); // First 10 examples
    });

    console.log(`Responsive design classes found: ${responsiveClasses.length}`);
    responsiveClasses.forEach((className, i) => {
      console.log(`  ${i + 1}: ${className}`);
    });

    // Analyze layout structure
    const layoutInfo = await page.evaluate(() => {
      const body = document.body;
      const computed = window.getComputedStyle(body);
      const app = document.querySelector('[id="app"]:last-of-type');
      
      return {
        bodyBackground: computed.backgroundColor,
        bodyDisplay: computed.display,
        appExists: !!app,
        appClasses: app ? app.className : 'N/A'
      };
    });

    console.log(`Layout information:`);
    console.log(`  - Body background: ${layoutInfo.bodyBackground}`);
    console.log(`  - Body display: ${layoutInfo.bodyDisplay}`);
    console.log(`  - App exists: ${layoutInfo.appExists}`);
    console.log(`  - App classes: ${layoutInfo.appClasses}`);

    // Take screenshot for visual analysis
    await page.screenshot({ 
      path: 'test-results/gui-analysis-desktop.png',
      fullPage: true 
    });

    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'test-results/gui-analysis-mobile.png',
      fullPage: true 
    });

    // Test tablet layout
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'test-results/gui-analysis-tablet.png',
      fullPage: true 
    });

    console.log('=== GUI Structure Analysis Complete ===');
    console.log('Screenshots saved to test-results/');
  });

  test('Identify UI/UX Improvement Opportunities', async ({ page }) => {
    console.log('=== Starting UI/UX Improvement Analysis ===');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Analyze current workflow
    const workflowElements = await page.evaluate(() => {
      const elements = {
        sessionSetup: document.querySelectorAll('[class*="session"], [data-testid*="session"]').length,
        fileUpload: document.querySelectorAll('input[type="file"], [class*="upload"]').length,
        processing: document.querySelectorAll('[class*="progress"], [class*="processing"]').length,
        results: document.querySelectorAll('[class*="result"], [class*="summary"]').length,
        navigation: document.querySelectorAll('nav, [role="navigation"], [class*="nav"]').length
      };
      return elements;
    });

    console.log('Current Workflow Elements:');
    Object.entries(workflowElements).forEach(([key, value]) => {
      console.log(`  ${key}: ${value} elements`);
    });

    // Analyze visual hierarchy
    const headingStructure = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      return headings.map(h => ({
        level: h.tagName,
        text: h.textContent.slice(0, 50),
        visible: h.offsetHeight > 0
      }));
    });

    console.log('Heading Structure:');
    headingStructure.forEach((heading, i) => {
      console.log(`  ${i + 1}. ${heading.level}: "${heading.text}" (visible: ${heading.visible})`);
    });

    // Analyze spacing and layout
    const layoutAnalysis = await page.evaluate(() => {
      const containers = Array.from(document.querySelectorAll('.container, .content, .card, .section'));
      const spacing = containers.slice(0, 5).map(el => {
        const computed = window.getComputedStyle(el);
        return {
          className: el.className,
          padding: computed.padding,
          margin: computed.margin,
          width: computed.width,
          display: computed.display
        };
      });
      return spacing;
    });

    console.log('Layout Analysis (first 5 containers):');
    layoutAnalysis.forEach((layout, i) => {
      console.log(`  ${i + 1}. ${layout.className}:`);
      console.log(`     Padding: ${layout.padding}`);
      console.log(`     Margin: ${layout.margin}`);
      console.log(`     Display: ${layout.display}`);
    });

    // Analyze color scheme and theming
    const colorAnalysis = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*')).slice(0, 20);
      const colors = new Set();
      const backgrounds = new Set();
      
      elements.forEach(el => {
        const computed = window.getComputedStyle(el);
        const color = computed.color;
        const background = computed.backgroundColor;
        
        if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'rgb(0, 0, 0)') {
          colors.add(color);
        }
        if (background && background !== 'rgba(0, 0, 0, 0)' && background !== 'rgb(255, 255, 255)') {
          backgrounds.add(background);
        }
      });
      
      return {
        uniqueColors: Array.from(colors).slice(0, 10),
        uniqueBackgrounds: Array.from(backgrounds).slice(0, 10)
      };
    });

    console.log('Color Scheme Analysis:');
    console.log('  Text colors:', colorAnalysis.uniqueColors);
    console.log('  Background colors:', colorAnalysis.uniqueBackgrounds);

    console.log('=== UI/UX Improvement Analysis Complete ===');
  });
});