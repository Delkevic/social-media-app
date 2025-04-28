import React, { useState } from 'react';
import { LifeBuoy, MessageSquarePlus, HelpCircle, FileText, Loader2, AlertTriangle, ChevronDown, Check } from 'lucide-react';
import api from '../../../services/api'; // Import the api service
import { toast } from 'react-hot-toast'; // Import toast for notifications

// Yardımcı Bileşenler (Diğer ayarlardan)
const SettingsSection = ({ title, icon: Icon, children, noPadding = false }) => (
  // Gölge efekti ve noPadding seçeneği eklendi
  <div className={`mb-8 rounded-xl bg-black/50 border border-[#0affd9]/10 backdrop-blur-sm shadow-[0_4px_14px_rgba(10,255,217,0.08)] ${noPadding ? '' : 'p-6'}`}>
    {title && (
      <h3 className={`text-lg font-semibold flex items-center text-[#0affd9] ${noPadding ? 'p-6 pb-4 border-b border-[#0affd9]/10' : 'mb-4'}`}>
        {Icon && <Icon size={20} className="mr-2 opacity-80" />} 
        {title}
      </h3>
    )}
    <div className={noPadding ? '' : 'space-y-4'}>
      {children}
    </div>
  </div>
);

const StyledButton = ({ children, onClick, disabled, variant = 'primary', loading = false, className = '' }) => {
  const baseStyle = "px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center";
  const primaryStyle = "bg-[#0affd9] text-black hover:bg-[#0affd9]/80";
  const secondaryStyle = "bg-black/60 border border-[#0affd9]/30 text-[#0affd9] hover:bg-[#0affd9]/10";
  const dangerStyle = "bg-red-800/30 border border-red-600/50 text-red-400 hover:bg-red-700/40";
  
  let variantStyle = primaryStyle;
  if (variant === 'secondary') variantStyle = secondaryStyle;
  if (variant === 'danger') variantStyle = dangerStyle;

  // Sınıfları diziye ekleyip join ile birleştirme
  const classList = [baseStyle, variantStyle, className].filter(Boolean).join(' ');

  return (
    <button onClick={onClick} disabled={disabled || loading} className={classList}>
      {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
      {children}
    </button>
  );
};

const StyledRadio = ({ name, value, checked, onChange, disabled, label }) => (
  <label className="flex items-center cursor-pointer">
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="w-4 h-4 text-[#0affd9] bg-black/60 border-[#0affd9]/30 focus:ring-[#0affd9]/50 focus:ring-2"
    />
    <span className="ms-2 text-sm text-gray-300">{label}</span>
  </label>
);

const StyledInput = (props) => (
  <input 
    {...props}
    className={`w-full px-3 py-2 rounded-lg bg-black/60 border border-[#0affd9]/30 text-white focus:border-[#0affd9] focus:ring-1 focus:ring-[#0affd9]/50 outline-none ${props.className || ''}`}
  />
);

const StyledTextarea = (props) => (
  <textarea 
    {...props}
    className={`w-full px-3 py-2 rounded-lg bg-black/60 border border-[#0affd9]/30 text-white focus:border-[#0affd9] focus:ring-1 focus:ring-[#0affd9]/50 outline-none ${props.className || ''}`}
  />
);

const RatingSelector = ({ rating, setRating, disabled }) => (
  <div className="flex space-x-2 sm:space-x-4">
    {[1, 2, 3, 4, 5].map((value) => (
      <label key={value} className="flex flex-col items-center cursor-pointer group">
        <input
          type="radio"
          name="rating"
          value={value}
          checked={rating === value}
          onChange={() => setRating(value)}
          className="sr-only"
          disabled={disabled}
        />
        <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border transition-all duration-200 
          ${rating === value 
            ? 'bg-[#0affd9]/30 border-[#0affd9] text-[#0affd9]' 
            : 'bg-black/60 border-[#0affd9]/30 text-gray-400 group-hover:border-[#0affd9]/50'
          }`}>
          {value}
        </div>
        <span className={`mt-1 text-[10px] sm:text-xs transition-colors duration-200 
          ${rating === value ? 'text-[#0affd9]' : 'text-gray-400 group-hover:text-gray-300'}
        `}>
          {value === 1 ? 'Kötü' : 
            value === 2 ? 'Orta' : 
            value === 3 ? 'İyi' : 
            value === 4 ? 'Çok İyi' : 'Mükemmel'}
        </span>
      </label>
    ))}
  </div>
);

const SupportFeedbackSettings = () => {
  // State değişkenleri
  const [feedbackType, setFeedbackType] = useState('hata');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false); // Add submitting state

  // SSS bölümü için göster/gizle state'i
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Form gönderme işlemi
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackSubject.trim()) {
      toast.error('Lütfen bir konu başlığı girin.');
      return;
    }
    
    if (!feedbackText.trim()) {
      toast.error('Lütfen geri bildiriminizi yazın.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.support.submitFeedback({
        type: feedbackType,
        subject: feedbackSubject,
        message: feedbackText,
        rating: rating
      });

      if (response.success) {
        setFeedbackSubject('');
        setFeedbackText(''); // Formu sıfırla
        setRating(5); // Derecelemeyi de sıfırla
        toast.success('Geri bildiriminiz için teşekkür ederiz! En kısa sürede incelenecektir.');
      } else {
        toast.error(`Geri bildirim gönderilemedi: ${response.message}`);
      }
    } catch (error) {
      console.error('Geri bildirim gönderme hatası:', error);
      toast.error('Geri bildirim gönderilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
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
          <LifeBuoy className="mr-2 text-[#0affd9]" />
          Destek ve Geri Bildirim
        </h2>
      </div>
      
      {/* Sorun Bildir / Öneri Gönder */}
      <SettingsSection title="Sorun Bildir / Öneri Gönder" icon={MessageSquarePlus}>
        <form onSubmit={handleSubmitFeedback} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Geri Bildirim Türü</label>
            <div className="flex flex-wrap gap-4">
              <StyledRadio 
                name="feedbackType"
                value="hata"
                checked={feedbackType === 'hata'}
                onChange={(e) => setFeedbackType(e.target.value)}
                disabled={isSubmitting}
                label="Sorun Bildir"
              />
              <StyledRadio 
                name="feedbackType"
                value="öneri"
                checked={feedbackType === 'öneri'}
                onChange={(e) => setFeedbackType(e.target.value)}
                disabled={isSubmitting}
                label="Öneri Gönder"
              />
              <StyledRadio 
                name="feedbackType"
                value="iyileştirme"
                checked={feedbackType === 'iyileştirme'}
                onChange={(e) => setFeedbackType(e.target.value)}
                disabled={isSubmitting}
                label="İyileştirme Öner"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="feedbackSubject" className="block text-sm font-medium text-gray-300 mb-1">
              Konu
            </label>
            <StyledInput
              type="text"
              id="feedbackSubject"
              value={feedbackSubject}
              onChange={(e) => setFeedbackSubject(e.target.value)}
              placeholder="Konu başlığı giriniz"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label htmlFor="feedbackText" className="block text-sm font-medium text-gray-300 mb-1">
              {feedbackType === 'hata' ? 'Sorunu Açıklayın' : 
               feedbackType === 'öneri' ? 'Önerinizi Açıklayın' : 'İyileştirme Fikrinizi Açıklayın'}
            </label>
            <StyledTextarea
              id="feedbackText"
              rows="4"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={feedbackType === 'hata' 
                ? 'Lütfen karşılaştığınız sorunu detaylı bir şekilde açıklayın...' 
                : feedbackType === 'öneri'
                ? 'Lütfen önerinizi detaylı bir şekilde açıklayın...'
                : 'Lütfen iyileştirme fikrinizi detaylı bir şekilde açıklayın...'}
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Deneyiminizi Değerlendirin
            </label>
            <RatingSelector rating={rating} setRating={setRating} disabled={isSubmitting} />
          </div>
          
          <div className="pt-2 flex justify-end">
            <StyledButton type="submit" disabled={isSubmitting} loading={isSubmitting}>
              Gönder
            </StyledButton>
          </div>
        </form>
      </SettingsSection>
      
      {/* Sıkça Sorulan Sorular */}
      <SettingsSection title="Sıkça Sorulan Sorular" icon={HelpCircle} noPadding>
        <div className="divide-y divide-[#0affd9]/20">
          {faqs.map((faq) => (
            <div key={faq.id} className="overflow-hidden">
              <button
                className="w-full text-left p-4 flex justify-between items-center hover:bg-black/20 transition-colors"
                onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
              >
                <span className="text-sm font-medium text-gray-300">{faq.question}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-[#0affd9]/70 transition-transform duration-300 ${expandedFaq === faq.id ? 'transform rotate-180' : ''}`} 
                />
              </button>
              {expandedFaq === faq.id && (
                <div className="px-4 pb-4 pt-2 bg-black/20">
                  <p className="text-xs text-gray-400 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </SettingsSection>
      
      {/* Topluluk Kuralları */}
      <SettingsSection title="Topluluk Kuralları" icon={FileText}>
        <ul className="space-y-2">
          {communityGuidelines.map((rule, index) => (
            <li key={index} className="flex items-start">
              <Check size={16} className="mr-2 mt-0.5 text-[#0affd9] flex-shrink-0" />
              <span className="text-sm text-gray-400">{rule}</span>
            </li>
          ))}
        </ul>
      </SettingsSection>
    </div>
  );
};

export default SupportFeedbackSettings;