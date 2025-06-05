// Gemini API Servisi - Post açıklamalarını analiz eder

export const generateGeminiResponseForPost = async (
  base64Image,
  postContent
) => {
  try {
    console.log("Gemini API'ye sorgu gönderiliyor...");

    // Gemini API key ve endpoint (kullanıcı ekleyecek)
    const GEMINI_API_KEY = "AIzaSyBPFmAUVFRmo60znc42dmSbAFL8-FTso60"; // TODO: Kullanıcı tarafından doldurulacak
    const GEMINI_API_URL =
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent";

    // API anahtarı yoksa uyarı dön
    if (!GEMINI_API_KEY) {
      console.warn(
        "Gemini API anahtarı tanımlanmamış. Lütfen gemini-service.js dosyasına API anahtarını ekleyin."
      );
      return {
        success: false,
        message: "API anahtarı tanımlanmamış",
        data: null,
      };
    }

    // Base64 görüntüsünü formatlama (veri URL'sinden data kısmını çıkarma)
    let formattedBase64 = base64Image;
    if (base64Image.includes("base64,")) {
      formattedBase64 = base64Image.split("base64,")[1];
    }

    // Gemini istek gövdesi
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `Aşağıda bir sosyal medya gönderisinin içeriği yer alıyor. Gönderi, bir görsel ve bir açıklamadan oluşmaktadır. Senin görevin, bu gönderinin bütünsel anlamını analiz ederek, gönderiyi en iyi şekilde tanımlayan **6 adet tek kelimelik etiket** üretmektir.

                      Bu etiketler iki gruba ayrılır:
                      1. **Birincil Etiketler** (4 adet): Gönderinin konusu, tarzı veya teması hakkında fikir veren etiketlerdir. (örneğin: Mizah, Eğitim, Spor, Tatil, Absürt)
                      2. **Yardımcı Etiketler** (2 adet): Gönderide bulunan ögeleri tamamlayıcı şekilde tanımlar. (örneğin: İnsan, Çocuk, Hayvan, Gece, İç mekan)

                      Kurallar:
                      - Etiketler kısa, tek kelimelik ve içerikle alakalı olmalı.
                      - Çok genel ya da anlamsız etiketlerden kaçın. ("şey", "durum" gibi.)
                      - Sadece virgülle ayrılmış şekilde **karışık sırada** 6 etiket ver. Açıklama ya da başlık yazma.
                      - 6 etiketin 4'ü birincil, 2'si yardımcı etiket olmalı.
                      - Birincil etiketler ilk 4 olacak, yardımcı etiketler son 2 olacak.

                      Örnek çıktı formatı: Mizah, İnsan, Absürt, Gece, Fotoğraf, Doğa

                      İçerik: "${postContent || 'İçeriksiz gönderi'}""
                      `,
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: formattedBase64,
              },
            },
          ],
        },
      ],
      generation_config: {
        temperature: 0.4,
        max_output_tokens: 100,
      },
    };

    // Gemini API'ye istek
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // Yanıt kontrolü
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API yanıt hatası:", response.status, errorText);
      return {
        success: false,
        message: `Gemini API hata kodu: ${response.status}`,
        data: null,
      };
    }

    const responseData = await response.json();
    console.log("Gemini API yanıtı:", responseData);

    // Yanıtı işle
    if (
      responseData &&
      responseData.candidates &&
      responseData.candidates.length > 0
    ) {
      const content = responseData.candidates[0].content;
      if (content && content.parts && content.parts.length > 0) {
        const tagsText = content.parts[0].text;
        // Etiketleri virgül ile ayırarak dizi haline getir ve boşlukları temizle
        const tags = tagsText
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
          
        // Sonuçları döndür
        return {
          success: true,
          message: "Etiketler başarıyla oluşturuldu",
          data: tags,
        };
      }
    }
    
    // Yanıt geçerli formatta değilse
    return {
      success: false,
      message: "API yanıtı beklenen formatta değil",
      data: null,
    };
    
  } catch (error) {
    console.error("Gemini API hatası:", error);
    return {
      success: false,
      message:
        "Gemini API ile iletişim kurulurken bir hata oluştu: " + error.message,
      data: null,
    };
  }
};

// Sohbet için ayrı bir Gemini yanıtı oluşturma fonksiyonu
export const generateChatResponse = async (userMessage) => {
  try {
    console.log("Gemini Chat API'ye sorgu gönderiliyor...");

    // Gemini API key ve endpoint
    const GEMINI_API_KEY = "AIzaSyBPFmAUVFRmo60znc42dmSbAFL8-FTso60";
    const GEMINI_API_URL =
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent";

    // API anahtarı kontrolü
    if (!GEMINI_API_KEY) {
      return {
        success: false,
        message: "API anahtarı tanımlanmamış",
        data: "API anahtarı eksik olduğu için yanıt üretilemiyor.",
      };
    }

    // İstek gövdesi
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: userMessage,
            },
          ],
        },
      ],
      generation_config: {
        temperature: 0.7,
        max_output_tokens: 800,
      },
    };

    // Gemini API'ye istek
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // Yanıt kontrolü
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Gemini Chat API yanıt hatası:",
        response.status,
        errorText
      );
      return {
        success: false,
        message: `Gemini API hata kodu: ${response.status}`,
        data: "Üzgünüm, şu anda yanıt üretemiyorum.",
      };
    }

    const responseData = await response.json();
    console.log("Gemini Chat API yanıtı:", responseData);

    // Yanıtı işle
    if (
      responseData &&
      responseData.candidates &&
      responseData.candidates.length > 0
    ) {
      const content = responseData.candidates[0].content;
      if (content && content.parts && content.parts.length > 0) {
        const responseText = content.parts[0].text;
        return {
          success: true,
          message: "Yanıt başarıyla oluşturuldu",
          data: responseText,
        };
      }
    }

    return {
      success: false,
      message: "Gemini yanıtı beklenen formatta değil",
      data: "Üzgünüm, yanıtınızı işlerken bir sorun oluştu.",
    };
  } catch (error) {
    console.error("Gemini Chat API hatası:", error);
    return {
      success: false,
      message: "Gemini API ile iletişim kurulurken bir hata oluştu",
      data: "Üzgünüm, bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
    };
  }
};
