import React, { useState, useEffect } from 'react';
import { Lock, EyeOff, UserX, MicOff, Users, MessageCircle, Tag, Loader2, AlertTriangle } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-hot-toast';

const PrivacySettings = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Gizlilik durumu
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);

  // Yorum ve etiket kontrolleri
  const [commentPermission, setCommentPermission] = useState('all'); // all, followers, none
  const [tagPermission, setTagPermission] = useState('all'); // all, followers, none

  // Engellenen kullanıcılar (Boş başlatılıyor)
  const [blockedUsers] = useState([]);

  // Sessize alınan hesaplar (Boş başlatılıyor)
  const [mutedUsers] = useState([]);

  // Mevcut ayarları API'den çek
  useEffect(() => {
    const fetchPrivacySettings = () => {
      console.log("PrivacySettings useEffect: fetchPrivacySettings başlıyor...");
      setLoading(true);
      setError(null);

      if (user) {
        console.log("PrivacySettings useEffect: AuthContext'ten user alındı:", JSON.stringify(user));
        console.log("PrivacySettings useEffect: Alınan user.isPrivate değeri:", user.isPrivate);
        
        const initialIsPrivate = user.isPrivate === true;
        setIsPrivateAccount(initialIsPrivate);
        setCommentPermission(user.commentPermission || 'all');
        setTagPermission(user.tagPermission || 'all');
        
        console.log(`PrivacySettings useEffect: State başlatıldı, isPrivateAccount=${initialIsPrivate}`);
      } else {
        console.error("PrivacySettings useEffect: AuthContext'ten user alınamadı! (user null veya undefined)");
        setError("Kullanıcı bilgileri yüklenemedi. Lütfen tekrar giriş yapın.");
      }
      
      setLoading(false);
      console.log("PrivacySettings useEffect: fetchPrivacySettings bitti, setLoading(false).");
    };

    fetchPrivacySettings();
  }, [user]);

  // Ayarları kaydetme fonksiyonu
  const handleSaveChanges = async () => {
    console.log("handleSaveChanges fonksiyonu başladı!");
    console.log("Gönderilecek ayarlar:", {
      isPrivate: isPrivateAccount,
      commentPermission: commentPermission,
      tagPermission: tagPermission,
    });
    setSaving(true);
    setError(null);
    
    try {
      // Sadece gizlilik ayarını updatePrivacy ile güncelleyin
      const privacyResponse = await api.user.updatePrivacy(isPrivateAccount);
      console.log("Privacy API yanıtı:", JSON.stringify(privacyResponse));
      
      if (privacyResponse.success) {
        // Diğer ayarları updateProfile ile güncelleyin
        const settingsData = {
          "commentPermission": commentPermission,
          "tagPermission": tagPermission,
        };
        
        const profileResponse = await api.user.updateProfile(settingsData);
        console.log("Profile API yanıtı:", JSON.stringify(profileResponse));
        
        if (profileResponse.success) {
          toast.success('Gizlilik ayarları başarıyla kaydedildi!');
          
          if (profileResponse.data?.user) {
            const updatedUser = profileResponse.data.user;
            console.log("Güncellenmiş kullanıcı verisi:", JSON.stringify(updatedUser));
            console.log("Güncellenmiş gizlilik ayarı:", updatedUser.isPrivate);
            
            // State'i güncelleyelim
            setIsPrivateAccount(updatedUser.isPrivate === true); 
            setCommentPermission(updatedUser.commentPermission || 'all');
            setTagPermission(updatedUser.tagPermission || 'all');
            
            // AuthContext'teki kullanıcıyı ve depolamayı güncelle
            updateUser(updatedUser); 
          } else {
            console.warn("Kullanıcı verisi API yanıtında bulunamadı:", profileResponse);
          }
        } else {
          setError(profileResponse.message || 'Ayarlar kaydedilirken bir hata oluştu.');
          toast.error(profileResponse.message || 'Ayarlar kaydedilemedi!');
        }
      } else {
        setError(privacyResponse.message || 'Gizlilik ayarları kaydedilemedi');
        toast.error(privacyResponse.message || 'Gizlilik ayarları kaydedilemedi!');
      }
    } catch (err) {
      setError("Ayarlar kaydedilirken bir hata oluştu: " + err.message);
      toast.error('Ayarlar kaydedilemedi!');
      console.error("Gizlilik ayarları kaydetme hatası:", err);
    } finally {
      setSaving(false);
    }
  };

  // Gizli hesap değiştirme işleyicisi
  const handlePrivateAccountChange = (checked) => {
    console.log(`Gizli hesap değişti: ${isPrivateAccount} -> ${checked}`);
    setIsPrivateAccount(checked);
  };

  const handleUnblockUser = (userId) => {
    // Backend'e engellenmeyi kaldırma isteği
    console.log('Engel kaldırıldı, kullanıcı ID:', userId);
  };

  const handleUnmuteUser = (userId) => {
    // Backend'e sessize almayı kaldırma isteği
    console.log('Sessize alma kaldırıldı, kullanıcı ID:', userId);
  };

  console.log(`Render: loading=${loading}, saving=${saving}, isPrivate=${isPrivateAccount}`);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-200 flex items-center">
          <Lock className="mr-2 text-blue-400" />
          Gizlilik Ayarları
        </h2>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-lg bg-red-500/20 text-red-400 flex items-center gap-2">
          <AlertTriangle size={18}/>
          <span>{error}</span>
        </div>
      )}

      <section className="space-y-6">
        {/* Hesap Gizliliği */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <EyeOff className="mr-2 h-4 w-4 text-blue-400" /> 
            Hesap Gizliliği
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Gizli Hesap</p>
                <p className="text-xs text-gray-400">
                  Hesabınız gizli olduğunda, yalnızca onayladığınız takipçiler gönderilerinizi görebilir.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isPrivateAccount}
                  onChange={(e) => handlePrivateAccountChange(e.target.checked)}
                  disabled={saving}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Engellenen Kullanıcılar (Artık boş liste gösterilecek) */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <UserX className="mr-2 h-4 w-4 text-blue-400" /> 
            Engellenen Kullanıcılar
          </h3>
          <div className="space-y-4">
            <p className="text-xs text-gray-400">
              Engellediğiniz kullanıcılar profilinizi, gönderilerinizi veya hikayelerinizi göremez, size mesaj gönderemez.
            </p>
            
            {blockedUsers.length > 0 ? (
              <ul className="divide-y divide-gray-700">
                {/* ... (map kısmı aynı, ama liste boş olduğu için render edilmeyecek) ... */}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 py-2">Henüz kimseyi engellemediniz.</p>
            )}
          </div>
        </div>

        {/* Sessize Alınan Hesaplar (Artık boş liste gösterilecek) */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <MicOff className="mr-2 h-4 w-4 text-blue-400" /> 
            Sessize Alınan Hesaplar
          </h3>
          <div className="space-y-4">
            <p className="text-xs text-gray-400">
              Sessize aldığınız kullanıcıların gönderileri ve hikayeleri akışınızda görünmez, ancak onlar sizinkini görebilir.
            </p>
            
            {mutedUsers.length > 0 ? (
              <ul className="divide-y divide-gray-700">
                {/* ... (map kısmı aynı, ama liste boş olduğu için render edilmeyecek) ... */}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 py-2">Henüz kimseyi sessize almadınız.</p>
            )}
          </div>
        </div>

        {/* Yorum ve Etiket Kontrolü */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <MessageCircle className="mr-2 h-4 w-4 text-blue-400" /> 
            Yorum ve Etiket Kontrolü
          </h3>
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-300 mb-3">Kimler yorum yapabilir?</p>
              <div className="space-y-2">
                {['all', 'followers', 'none'].map((option) => (
                  <label key={option} className="flex items-center">
                    <input
                      type="radio"
                      name="commentPermission"
                      value={option}
                      checked={commentPermission === option}
                      onChange={(e) => setCommentPermission(e.target.value)}
                      disabled={saving}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                    />
                    <span className="ms-2 text-sm text-gray-300">
                      {option === 'all' ? 'Herkes' : option === 'followers' ? 'Sadece takipçilerim' : 'Kimse'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-300 mb-3">Kimler sizi etiketleyebilir?</p>
              <div className="space-y-2">
                {['all', 'followers', 'none'].map((option) => (
                  <label key={option} className="flex items-center">
                    <input
                      type="radio"
                      name="tagPermission"
                      value={option}
                      checked={tagPermission === option}
                      onChange={(e) => setTagPermission(e.target.value)}
                      disabled={saving}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                    />
                    <span className="ms-2 text-sm text-gray-300">
                      {option === 'all' ? 'Herkes' : option === 'followers' ? 'Sadece takipçilerim' : 'Kimse'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Kaydet Butonu */}
        <div className="flex justify-end mt-8">
          {console.log(`Buton Render: disabled=${saving || loading}`)}
          <button
            onClick={handleSaveChanges}
            disabled={saving || loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default PrivacySettings; 