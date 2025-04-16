import React, { useState } from 'react';
import { LifeBuoy, MessageSquarePlus, HelpCircle, FileText } from 'lucide-react';

const SupportFeedbackSettings = () => {
  // State değişkenleri
  const [feedbackType, setFeedbackType] = useState('issue');
  const [feedbackText, setFeedbackText] = useState('');
  
  // SSS bölümü için göster/gizle state'i
  const [expandedFaq, setExpandedFaq] = useState(null);
  
  // Form gönderme işlemi
  const handleSubmitFeedback = (e) => {
    e.preventDefault();
    console.log('Gönderilen geri bildirim:', { type: feedbackType, text: feedbackText });
    // API isteği burada yapılacak
    
    // Formu sıfırla
    setFeedbackText('');
    alert('Geri bildiriminiz için teşekkür ederiz! En kısa sürede incelenecektir.');
  };
  
  // Sık sorulan sorular (örnek veri)
  const faqs = [
    { 
      id: 1, 
      question: 'Şifremi nasıl sıfırlayabilirim?', 
      answer: 'Şifrenizi sıfırlamak için giriş sayfasındaki "Şifremi Unuttum" bağlantısına tıklayın. E-posta adresinizi girin ve size gönderilen bağlantı ile şifrenizi sıfırlayabilirsiniz.' 
    },
    { 
      id: 2, 
      question: 'Hesabımı nasıl silebilirim?', 
      answer: 'Hesabınızı silmek için Ayarlar > Hesap Ayarları bölümüne gidin ve "Hesabımı Sil" seçeneğine tıklayın. Hesabınızı silmeden önce verilerinizi indirmenizi öneririz.' 
    },
    { 
      id: 3, 
      question: 'Engellediğim birini nasıl engellenmişler listesinden çıkarırım?', 
      answer: 'Ayarlar > Gizlilik Ayarları > Engellenen Kullanıcılar bölümüne gidin. Engelini kaldırmak istediğiniz kullanıcının yanındaki "Engeli Kaldır" düğmesine tıklayın.' 
    },
    { 
      id: 4, 
      question: 'İçeriklerimi kimler görebilir?', 
      answer: 'Hesabınız herkese açıksa, içeriklerinizi herkes görebilir. Gizli hesap ayarını açarsanız, yalnızca onayladığınız takipçiler içeriklerinizi görebilir. Gizlilik ayarlarınızı Ayarlar > Gizlilik Ayarları bölümünden düzenleyebilirsiniz.' 
    },
    { 
      id: 5, 
      question: 'Bildirimler neden çalışmıyor?', 
      answer: 'Bildirimlerin çalışmamasının birkaç nedeni olabilir: 1) Tarayıcı bildirimlerine izin vermemiş olabilirsiniz, 2) Uygulama içinde bildirimleri kapatmış olabilirsiniz, 3) Cihazınızın bildirim ayarları kapalı olabilir. Ayarlar > Bildirim Ayarları bölümünden kontrol edebilirsiniz.' 
    },
  ];
  
  // Topluluk kuralları (örnek veri)
  const communityGuidelines = [
    'Diğer kullanıcılara saygılı olun, nefret söylemi ve taciz içeren paylaşımlar yapmayın.',
    'Herhangi bir tür yasa dışı içerik paylaşmayın.',
    'Başkalarının telif haklı içeriklerini izinsiz paylaşmayın.',
    'Diğer kullanıcıların kişisel bilgilerini izinsiz paylaşmayın.',
    'Spam veya yanıltıcı içerik paylaşmayın.',
    'Sahte hesaplar oluşturmayın veya başka kullanıcıları taklit etmeyin.',
    'Platforma veya diğer kullanıcılara zarar verecek yazılımlar veya kodlar paylaşmayın.',
  ];
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-200 flex items-center">
          <LifeBuoy className="mr-2 text-blue-400" />
          Destek ve Geri Bildirim
        </h2>
      </div>
      
      <section className="space-y-6">
        {/* Sorun Bildir / Öneri Gönder */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <MessageSquarePlus className="mr-2 h-4 w-4 text-blue-400" /> 
            Sorun Bildir / Öneri Gönder
          </h3>
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Geri Bildirim Türü</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="feedbackType"
                    value="issue"
                    checked={feedbackType === 'issue'}
                    onChange={() => setFeedbackType('issue')}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                  />
                  <span className="ms-2 text-sm text-gray-300">Sorun Bildir</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="feedbackType"
                    value="suggestion"
                    checked={feedbackType === 'suggestion'}
                    onChange={() => setFeedbackType('suggestion')}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                  />
                  <span className="ms-2 text-sm text-gray-300">Öneri Gönder</span>
                </label>
              </div>
            </div>
            
            <div>
              <label htmlFor="feedbackText" className="block text-sm font-medium text-gray-200 mb-2">
                {feedbackType === 'issue' ? 'Sorunu açıklayın' : 'Önerinizi açıklayın'}
              </label>
              <textarea
                id="feedbackText"
                rows="4"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="w-full p-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder={feedbackType === 'issue' 
                  ? 'Lütfen karşılaştığınız sorunu detaylı bir şekilde açıklayın...' 
                  : 'Lütfen önerinizi detaylı bir şekilde açıklayın...'}
                required
              ></textarea>
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Gönder
            </button>
          </form>
        </div>
        
        {/* Sıkça Sorulan Sorular */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <HelpCircle className="mr-2 h-4 w-4 text-blue-400" /> 
            Sıkça Sorulan Sorular
          </h3>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div key={faq.id} className="border border-gray-700 rounded-lg overflow-hidden">
                <button
                  className="w-full text-left p-3 bg-gray-700/30 flex justify-between items-center"
                  onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                >
                  <span className="text-sm font-medium text-gray-200">{faq.question}</span>
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedFaq === faq.id ? 'transform rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                {expandedFaq === faq.id && (
                  <div className="p-3 bg-gray-800/50 text-sm text-gray-300">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Topluluk Kuralları */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <FileText className="mr-2 h-4 w-4 text-blue-400" /> 
            Topluluk Kuralları
          </h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-400 mb-3">
              Platformumuzda güvenli ve saygılı bir ortam oluşturmak için lütfen aşağıdaki kurallara uyun:
            </p>
            <ul className="list-disc list-inside space-y-2">
              {communityGuidelines.map((rule, index) => (
                <li key={index} className="text-sm text-gray-300">{rule}</li>
              ))}
            </ul>
            <p className="text-sm text-gray-400 mt-4">
              Bu kuralları ihlal eden içerikler kaldırılabilir ve hesabınız geçici veya kalıcı olarak askıya alınabilir.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SupportFeedbackSettings; 