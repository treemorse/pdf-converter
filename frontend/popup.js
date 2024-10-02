document.getElementById('convertButton').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    const urlInput = document.getElementById('urlInput');
    const file = fileInput.files[0];
  
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64File = reader.result.split(',')[1];
  
        chrome.runtime.sendMessage({
          action: 'convertPDF',
          base64File: base64File,
          filename: file.name
        }, (response) => {
          if (response && response.base64Data) {
            const byteCharacters = atob(response.base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = response.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          } else {
            console.error('Failed to receive blob response:', response);
          }
        });
      };
      reader.readAsDataURL(file);
    } else if (urlInput.value) {
      fetch(urlInput.value)
        .then(response => response.blob())
        .then(blob => {
          const file = new File([blob], "downloaded.pdf", { type: "application/pdf" });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64File = reader.result.split(',')[1];
  
            chrome.runtime.sendMessage({
              action: 'convertPDF',
              base64File: base64File,
              filename: file.name
            }, (response) => {
              if (response && response.base64Data) {
                const byteCharacters = atob(response.base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = response.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              } else {
                console.error('Failed to receive blob response:', response);
              }
            });
          };
          reader.readAsDataURL(file);
        })
        .catch(error => console.error('Error fetching PDF:', error));
    } else {
      alert('Please select a file or enter a URL.');
    }
  });
  