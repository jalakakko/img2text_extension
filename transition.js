chrome.runtime.onMessage.addListener((request, sender, response) => {
    console.log(request);
    Tesseract.recognize( request.url, 'eng',)
    .then(({ data: { text } }) => {  
        alert("Copied text to clipboard: \n" + text);
        navigator.clipboard.writeText(text);   
    }); 
});

