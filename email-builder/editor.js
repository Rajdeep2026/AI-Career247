document.addEventListener('DOMContentLoaded', () => {
    const previewFrame = document.getElementById('previewFrame');
    
    // Core Elements
    const primaryColorInput = document.getElementById('colorPrimary');
    const bgMainColorInput = document.getElementById('colorMainBg');
    const btnColorInput = document.getElementById('colorBtn');
    const canvasBgColorInput = document.getElementById('colorCanvasBg');
    
    // AI Elements
    const aiPrompt = document.getElementById('aiPrompt');
    const btnGenerateAI = document.getElementById('btnGenerateAI');
    const aiStatus = document.getElementById('aiStatus');
    
    // Image Elements
    const imageEditorPanel = document.getElementById('imageEditorPanel');
    const imageSelectPrompt = document.getElementById('imageSelectPrompt');
    const imageSrcInput = document.getElementById('imageSrcInput');
    const btnUpdateImage = document.getElementById('btnUpdateImage');
    let selectedImageElement = null;

    // Initialize Editor once the iframe loads
    previewFrame.addEventListener('load', () => {
        const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
        
        // 1. Make all text elements editable
        const textElements = iframeDoc.querySelectorAll('h1, h2, h3, h4, p, a, span, div');
        textElements.forEach(el => {
            // Only make it editable if it contains actual text directly, to avoid breaking layouts
            if (el.children.length === 0 && el.textContent.trim().length > 0) {
                el.setAttribute('contenteditable', 'true');
                el.style.outline = 'none';
                
                // Add hover effect to indicate editability
                el.addEventListener('mouseenter', e => {
                    e.target.style.boxShadow = '0 0 0 1px dashed rgba(248, 203, 69, 0.5)';
                });
                el.addEventListener('mouseleave', e => {
                    e.target.style.boxShadow = 'none';
                });
            }
        });

        // 2. Setup Image Selection
        const images = iframeDoc.querySelectorAll('img');
        images.forEach(img => {
            img.style.cursor = 'pointer';
            
            img.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Deselect previous
                if (selectedImageElement) {
                    selectedImageElement.style.outline = 'none';
                }
                
                // Select new
                selectedImageElement = e.target;
                selectedImageElement.style.outline = '2px solid #F8CB45';
                
                // Update UI Sidebar
                imageSelectPrompt.style.display = 'none';
                imageEditorPanel.style.display = 'block';
                imageSrcInput.value = selectedImageElement.src;
            });
            
            // Hover effect for images to indicate interactivity
            img.addEventListener('mouseenter', e => {
                 if (e.target !== selectedImageElement) {
                     e.target.style.outline = '2px dashed rgba(248, 203, 69, 0.5)';
                 }
            });
            img.addEventListener('mouseleave', e => {
                 if (e.target !== selectedImageElement) {
                     e.target.style.outline = 'none';
                 }
            });
        });
        
        // Setup Placeholder chips
        document.querySelectorAll('.chip').forEach(chip => {
             chip.addEventListener('click', (e) => {
                 const url = e.target.getAttribute('data-url');
                 imageSrcInput.value = url;
                 if (selectedImageElement) {
                     selectedImageElement.src = url;
                 }
             });
        });

        // Update image button listener
        btnUpdateImage.addEventListener('click', () => {
            if (selectedImageElement && imageSrcInput.value.trim() !== '') {
                selectedImageElement.src = imageSrcInput.value;
            }
        });

        // 3. Setup Color Pickers
        const applyColor = (targetSelector, property, color) => {
             // We need to apply this to elements inside the iframe
             const els = iframeDoc.querySelectorAll(targetSelector);
             els.forEach(el => {
                 el.style.setProperty(property, color, 'important');
             });
        };

        primaryColorInput.addEventListener('input', (e) => {
            applyColor('.bg-primary', 'background-color', e.target.value);
            applyColor('.color-primary', 'color', e.target.value);
            // Specifically update borders of product containers if needed
            applyColor('.product-border', 'border-color', e.target.value);
        });

        bgMainColorInput.addEventListener('input', (e) => {
            iframeDoc.body.style.setProperty('background-color', e.target.value, 'important');
        });
        
        canvasBgColorInput.addEventListener('input', (e) => {
            applyColor('.wrapper', 'background-color', e.target.value);
        });

        btnColorInput.addEventListener('input', (e) => {
             // Target buttons that aren't specifically the yellow ones
            applyColor('.btn:not(.btn-yellow)', 'background-color', e.target.value);
        });
    });

    // --- AI Integration ---
    btnGenerateAI.addEventListener('click', async () => {
        const theme = aiPrompt.value.trim();
        if (!theme) {
            aiStatus.textContent = 'Please enter a campaign theme.';
            aiStatus.className = 'status-msg error';
            return;
        }

        btnGenerateAI.disabled = true;
        btnGenerateAI.textContent = 'Generating with Ollama...';
        aiStatus.textContent = '';
        
        const promptParams = `
        You are an expert marketing copywriter for Blinkit, India's fastest grocery delivery app.
        Tone: energetic, direct, simple, exciting.
        Theme: "${theme}"
        Return EXACTLY this JSON format and nothing else.
        { "hero_headline": "Max 6 words", "body_copy": "Max 2 sentences", "cta_text": "2-3 words" }
        `;

        try {
            // Note: This relies on Ollama running locally with CORS enabled
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'qwen2:0.5b',
                    prompt: promptParams,
                    stream: false,
                    format: 'json'
                })
            });

            if (!response.ok) throw new Error('API Request Failed');

            const data = await response.json();
            const content = JSON.parse(data.response);
            
            // Inject into iframe
            const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
            
            // Best effort selector targeting based on the original template structure
            const headline = iframeDoc.querySelector('h2');
            if (headline && content.hero_headline) headline.textContent = content.hero_headline;
            
            const bodyCopy = iframeDoc.querySelector('p'); // targets the first P, the body copy
            if (bodyCopy && content.body_copy) bodyCopy.textContent = content.body_copy;
            
            const mainCta = iframeDoc.querySelector('.btn:not(.btn-yellow)');
            if (mainCta && content.cta_text) mainCta.textContent = content.cta_text;

            aiStatus.textContent = 'Successfully generated text!';
            aiStatus.className = 'status-msg success';

        } catch (error) {
            console.error(error);
            aiStatus.innerHTML = `Error connecting to Ollama.<br>Ensure it's running with CORS enabled:<br><code style="background:#333;padding:2px;border-radius:3px;">OLLAMA_ORIGINS="*" ollama serve</code>`;
            aiStatus.className = 'status-msg error';
        } finally {
            btnGenerateAI.disabled = false;
            btnGenerateAI.textContent = 'Generate Writing';
        }
    });

    // --- Export Logic ---
    document.getElementById('btnExport').addEventListener('click', () => {
        const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
        
        // Clone the document so we can clean it without ruining the live preview
        const clonedBody = iframeDoc.body.cloneNode(true);
        
        // Clean up editor artifacts before export
        clonedBody.querySelectorAll('[contenteditable]').forEach(el => {
            el.removeAttribute('contenteditable');
            el.style.outline = '';
            el.style.boxShadow = '';
        });
        
        clonedBody.querySelectorAll('img').forEach(img => {
            img.style.cursor = '';
            img.style.outline = '';
        });

        // Reconstruct full HTML
        const htmlPrefix = `<!DOCTYPE html>\n<html lang="en">\n<head>\n${iframeDoc.head.innerHTML}\n</head>\n`;
        const htmlSuffix = `\n</html>`;
        
        // Create full string
        let fullHtml = htmlPrefix + clonedBody.outerHTML + htmlSuffix;
        
        // Create download link
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'blinkit_custom_campaign.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});
