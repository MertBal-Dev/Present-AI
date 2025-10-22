const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_BASE_URL 
  : 'http://localhost:5001/api';

export const generateContent = async (topic, modelName) => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-content`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, language: 'tr', modelName }), 
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || `HTTP hatası! Durum: ${response.status}`);
    }
    const data = await response.json();
    return data; 
  } catch (error) {
    console.error("API isteği hatası (generateContent):", error);
    throw error; 
  }
};

export const downloadPresentation = async (format, presentationData, theme) => {
    try {
        const endpoint = `${API_BASE_URL}/download-${format}`;
        const filename = `sunum.${format}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presentationData, theme }),
        });
        if (!response.ok) throw new Error(`Dosya indirilemedi: ${response.statusText}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error(`API isteği hatası (downloadPresentation - ${format}):`, error);
        throw error;
    }
};