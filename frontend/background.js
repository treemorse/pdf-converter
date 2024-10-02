chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "convertPDF") {
    const byteCharacters = atob(message.base64File);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const file = new Blob([byteArray], { type: 'application/pdf' });

    const formData = new FormData();
    formData.append('file', file, message.filename);

    fetch('http://localhost:8080/convert', {
      method: 'POST',
      body: formData
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(error => { throw new Error(error.error); });
      }
      return response.blob();
    })
    .then(blob => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result.split(',')[1];
        sendResponse({ base64Data: base64Data, filename: message.filename.replace('.pdf', '.docx') });
      };
      reader.readAsDataURL(blob);
    })
    .catch(error => {
      console.error('Error:', error);
      sendResponse({ error: error.message });
    });

    return true;
  }
});
