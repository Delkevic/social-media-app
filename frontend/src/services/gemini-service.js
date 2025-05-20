// Gemini API Servisi - Post açıklamalarını analiz eder

export const generateGeminiResponseForPost = async (base64Image, postContent) => {
  try {
    console.log("Gemini API'ye sorgu gönderiliyor...");

    // Gemini API key ve endpoint (kullanıcı ekleyecek)
    const GEMINI_API_KEY = 'AIzaSyBPFmAUVFRmo60znc42dmSbAFL8-FTso60'; // TODO: Kullanıcı tarafından doldurulacak
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';

    // API anahtarı yoksa uyarı dön
    if (!GEMINI_API_KEY) {
      console.warn("Gemini API anahtarı tanımlanmamış. Lütfen gemini-service.js dosyasına API anahtarını ekleyin.");
      return {
        success: false,
        message: "API anahtarı tanımlanmamış",
        data: null
      };
    }

    // Base64 görüntüsünü formatlama (veri URL'sinden data kısmını çıkarma)
    let formattedBase64 = base64Image;
    if (base64Image.includes('base64,')) {
      formattedBase64 = base64Image.split('base64,')[1];
    }

    // Gemini istek gövdesi
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `Bu sosyal medya gönderisinin içeriği hakkında 5 tane etiket ver. 
              Bu etiketler gördüğün şeyi açıklayan tek kelimeden oluşan etiketler olacak. 
              Sadece etiketleri döndür. Başka açıklama veya giriş yapmadan, doğrudan virgülle 
              ayrılmış etiketleri yaz. Format örneği: Araba, İnsan, Manzara, Spor, Teknoloji
              insan gibi içerikle ilgili olmayan etiketleri verme. Daha spesifik, postu açıklayan etiketler ver.
              İçerik: "${postContent || 'İçeriksiz gönderi'}"`  
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: formattedBase64
              }
            }
          ]
        }
      ],
      generation_config: {
        temperature: 0.4,
        max_output_tokens: 100
      }
    };

    // Gemini API'ye istek
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // Yanıt kontrolü
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API hatası:', errorData);
      throw new Error(`Gemini API hatası: ${response.status} ${response.statusText}`);
    }

    // Yanıtı işle
    const responseData = await response.json();
    console.log('Gemini API yanıtı:', responseData);

    // Yanıt metnini çıkar
    const geminiText = responseData.candidates[0]?.content?.parts[0]?.text || 'Gemini yanıtı alınamadı';

    return {
      success: true,
      message: "Gemini yanıtı başarıyla alındı",
      data: geminiText
    };
  } catch (error) {
    console.error('Gemini API hatası:', error);
    return {
      success: false,
      message: `Gemini API çağrısında hata: ${error.message}`,
      data: null
    };
  }
};

// Gemini AI Chat için yanıt oluşturma fonksiyonu
export const generateChatResponse = async (message, conversationHistory = []) => {
  try {
    console.log("Gemini Chat API'ye sorgu gönderiliyor...");

    // Gemini API key ve endpoint
    const GEMINI_API_KEY = 'AIzaSyBPFmAUVFRmo60znc42dmSbAFL8-FTso60';
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';

    // API anahtarı yoksa uyarı dön
    if (!GEMINI_API_KEY) {
      console.warn("Gemini API anahtarı tanımlanmamış.");
      return {
        success: false,
        message: "API anahtarı tanımlanmamış",
        data: null
      };
    }

    // Konuşma geçmişini ve kullanıcının son mesajını içeren istek gövdesi
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: message }]
        }
      ],
      generation_config: {
        temperature: 0.7,
        max_output_tokens: 1024,
        topP: 0.8,
        topK: 40
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };
    
    // Gemini API'ye istek gönderme
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    // Yanıt kontrolü
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini Chat API hatası:', errorData);
      throw new Error(`Gemini Chat API hatası: ${response.status} ${response.statusText}`);
    }
    
    // Yanıtı işle
    const responseData = await response.json();
    console.log('Gemini Chat API yanıtı:', responseData);
    
    // Yanıt metnini çıkar
    const geminiText = responseData.candidates[0]?.content?.parts[0]?.text || 'Gemini yanıtı alınamadı';
    
    return {
      success: true,
      message: "Gemini Chat yanıtı başarıyla alındı",
      data: geminiText
    };
    
  } catch (error) {
    console.error('Gemini Chat API hatası:', error);
    return {
      success: false,
      message: `Gemini Chat API çağrısında hata: ${error.message}`,
      data: null
    };
  }
};
