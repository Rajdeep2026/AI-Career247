const fs = require('fs');
const path = require('path');

// Configuration
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'qwen2:0.5b'; // Confirmed model from your system
const TEMPLATE_PATH = path.join(__dirname, 'template.html');
const OUTPUT_PATH = path.join(__dirname, 'campaign_ready.html');

// Set the theme or campaign goal here
const CAMPAIGN_THEME = process.argv[2] || "Weekend grocery shopping rush with a special discount";

// The prompt for Ollama
const prompt = `
You are an expert marketing copywriter for Blinkit, India's fastest grocery delivery app.
Blinkit's tone is energetic, direct, simple, and exciting.

Write marketing copy for an email campaign with the following theme: "${CAMPAIGN_THEME}"

You MUST output your response in EXACTLY the following JSON format. Do not include any other text, markdown formatting, or introductory phrases. Return ONLY valid JSON block.

{
    "hero_headline": "A short, punchy headline (max 6 words).",
    "body_copy": "A persuasive sub-headline or short body text detailing the offer/value (max 2 sentences).",
    "cta_text": "A strong, 2-3 word call to action button text (avoid default 'Click Here', use 'Order Now', 'Grab Deal' etc)."
}
`;

async function generateEmailCopy() {
    console.log(`Generating copy for theme: "${CAMPAIGN_THEME}"...`);
    
    try {
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                prompt: prompt,
                stream: false,
                format: 'json'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Parse the generated JSON response
        const generatedContent = JSON.parse(data.response);
        
        console.log('\n--- Generated Content ---');
        console.log(generatedContent);
        console.log('-------------------------\n');

        // Compile the template
        compileTemplate(generatedContent);

    } catch (error) {
        console.error('Error communicating with Ollama:', error.message);
        console.log('\nPlease make sure your Ollama instance is running.');
    }
}

function compileTemplate(content) {
    console.log('Reading template...');
    
    fs.readFile(TEMPLATE_PATH, 'utf8', (err, html) => {
        if (err) {
            console.error('Error reading template.html:', err);
            return;
        }

        console.log('Replacing placeholders...');
        let finalHtml = html;
        
        // Replace variables
        finalHtml = finalHtml.replace(/\{\{hero_headline\}\}/g, content.hero_headline || 'Groceries in 10 Minutes');
        finalHtml = finalHtml.replace(/\{\{body_copy\}\}/g, content.body_copy || 'Get everything you need delivered straight to your door.');
        finalHtml = finalHtml.replace(/\{\{cta_text\}\}/g, content.cta_text || 'Order Now');

        // Write output
        fs.writeFile(OUTPUT_PATH, finalHtml, 'utf8', (err) => {
            if (err) {
                console.error('Error writing campaign_ready.html:', err);
            } else {
                console.log(`\nSuccess! Email generated and saved to: ${OUTPUT_PATH}`);
                console.log('You can now open campaign_ready.html in your browser to preview.');
            }
        });
    });
}

// Execute
generateEmailCopy();
