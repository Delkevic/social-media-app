import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
// import "../styles/Profile.css"; // CSS dosyasını kaldırıyoruz
import PostShow from "../components/profile/postShow";
import ReelShow from "../components/profile/ReelShow";
import LeftPanel from "../components/home/LeftPanel";
import MiniReelsPlayer from "../components/profile/MiniReelsPlayer"; // MiniReelsPlayer'ı import ediyoruz
import { API_BASE_URL } from "../config/constants"; // API_BASE_URL ekliyoruz
import api from "../services/api"; // api servisini import ediyoruz
import FollowListModal from "../components/modals/FollowListModal"; // Yeni modalı import et
import { useAuth } from "../context/AuthContext"; // useAuth eklendi
import { Lock, LogOut, UserMinus, UserPlus, Clock, Loader2, Heart, MessageCircle } from 'lucide-react'; // Heart ve MessageCircle ikonları eklendi
import { toast } from 'react-hot-toast'; // toast eklendi
import { GlowingEffect } from '../components/ui/GlowingEffect'; // GlowingEffect import edildi

const Profile = () => {
  const [user, setUser] = useState(null);
  const { user: currentUser, token, logout } = useAuth(); // AuthContext kullanımı ve logout fonksiyonu
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [imagePosts, setImagePosts] = useState([]);
  const [textPosts, setTextPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [exploreReels, setExploreReels] = useState([]); // Keşfet reelsleri için yeni state
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    bio: "",
    location: "",
    website: "",
  });

  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReel, setSelectedReel] = useState(null);
  const [isReelModalOpen, setIsReelModalOpen] = useState(false);
  
  const navigate = useNavigate();
  const { username } = useParams();

  // İstek durumunu takip etmek için state ekliyorum
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowRequestInProgress, setIsFollowRequestInProgress] = useState(false);

  // Follow List Modal State'leri
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [followModalTitle, setFollowModalTitle] = useState("");
  const [followModalUsers, setFollowModalUsers] = useState([]);
  const [followModalLoading, setFollowModalLoading] = useState(false);
  const [followModalError, setFollowModalError] = useState(null);

  // Yeni State'ler
  const [followStatus, setFollowStatus] = useState('none'); // none, following, requested, follows_you
  const [canViewProfile, setCanViewProfile] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const [generatedThumbnails, setGeneratedThumbnails] = useState({});
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Keşfet reelslerini getir
  const fetchExploreReels = useCallback(async () => {
    try {
    const token =
      sessionStorage.getItem("token") || localStorage.getItem("token");
      if (!token) {
      navigate("/login");
      return;
    }

      const response = await fetch(
        `${API_BASE_URL}/api/reels?feed=trending`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setExploreReels(data.data);
        } else {
          console.log("No explore reels found or API returned an unexpected format");
          setExploreReels([]);
        }
      } else {
        console.error("Failed to fetch explore reels:", response.statusText);
        setExploreReels([]);
      }
    } catch (error) {
      console.error("Error fetching explore reels:", error);
      setExploreReels([]);
    }
  }, [navigate]);

  // Video dosyasından thumbnail oluşturan fonksiyon
  const generateThumbnailFromVideo = useCallback((videoUrl, reelId) => {
    if (!videoUrl || generatedThumbnails[reelId]) return;

    console.log(`${reelId} için thumbnail oluşturuluyor...`);
    
    // Gizli video ve canvas elementleri oluşturalım
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Video yüklendiğinde ilk kareyi yakalamak için event listener ekleyelim
    video.addEventListener('loadeddata', () => {
      // Video boyutlarını ayarla
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // İlk kareyi çiz
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Canvas'tan veri URL'si al
      const thumbnailUrl = canvas.toDataURL('image/jpeg');
      
      // Oluşturulan thumbnail'i state'e ekle
      setGeneratedThumbnails(prev => ({
        ...prev,
        [reelId]: thumbnailUrl
      }));
      
      console.log(`${reelId} için thumbnail oluşturuldu!`);
    });
    
    // Hata durumunu ele alalım
    video.addEventListener('error', (e) => {
      console.error(`Video yüklenirken hata: ${videoUrl}`, e);
    });
    
    // Video'yu yükleyelim (tam URL ile)
    video.crossOrigin = "Anonymous"; // Cross-origin desteği için (CORS hatalarını önlemek için)
    video.src = videoUrl;
    video.currentTime = 0.5; // İlk karenin yanındaki kare (siyah ekran olmaması için)
    video.muted = true; // Sessiz
    video.playsInline = true; // Mobile uyumlu
    
    // Safari'de sadece load yerine play/pause ile thumbnail oluşturma çalışabilir
    video.load();
    
    // Safari için ek önlem
    setTimeout(() => {
      if (video.readyState >= 2) { // HAVE_CURRENT_DATA
        video.play().then(() => {
          setTimeout(() => {
            video.pause();
          }, 100);
        }).catch(err => {
          console.error("Video oynatma hatası:", err);
        });
      }
    }, 500);
  }, [generatedThumbnails]);

  // Kullanıcının reelslerini getir
  const fetchUserReels = useCallback(async () => {
    try {
      const token =
        sessionStorage.getItem("token") || localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      console.log(`Reels çekiliyor: ${username}`);
      const response = await fetch(
        `${API_BASE_URL}/api/profile/${username}/reels`,
        {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        }
      );
      if (response.ok) {
        const data = await response.json();
        console.log("Reels API yanıtı:", data);
        if (data.success && data.data) {
          // Thumbnail ve video URL'lerini işle
          const processedReels = data.data.map(reel => {
            console.log(`Reel ID: ${reel.id}, Thumbnail: ${reel.thumbnail}, Video URL: ${reel.videoURL}`);
            
            // Video URL işleme
            let processedVideoURL = null;
            if (reel.videoURL) {
              // URL formatını düzelt
              if (!reel.videoURL.includes('cloudinary.com') && !reel.videoURL.startsWith('http')) {
                processedVideoURL = `${API_BASE_URL}${reel.videoURL}`;
              } else {
                processedVideoURL = reel.videoURL;
              }
            }
            
            // Thumbnail işleme - Kullanıcının yüklediği kapak resmini öncelikle kullan
            let processedThumbnail = null;
            // Eğer reel'de thumbnail varsa (kullanıcı tarafından yüklenmiş kapak resmi)
            if (reel.thumbnail && reel.thumbnail !== "") {
              // URL formatını düzelt
              if (!reel.thumbnail.includes('cloudinary.com') && !reel.thumbnail.startsWith('http')) {
                processedThumbnail = `${API_BASE_URL}${reel.thumbnail}`;
              } else {
                processedThumbnail = reel.thumbnail;
              }
              console.log(`${reel.id} için kapak resmi var: ${processedThumbnail}`);
            } else {
              // Kapak resmi yoksa, placeholder kullan ve otomatik oluşturma işareti koy
              processedThumbnail = `https://ui-avatars.com/api/?name=Video&background=000000&color=0affd9&size=300`;
              console.log(`${reel.id} için kapak resmi yok, otomatik oluşturulacak.`);
            }
            
            return {
              ...reel,
              videoURL: processedVideoURL,
              thumbnail: processedThumbnail,
              // Her reel için videodan thumbnail oluşturmak için flag ekleyelim
              // Sadece thumbnail yoksa veya placeholder ise otomatik thumbnail oluşturma işlemi başlat
              needsThumbnailGeneration: (!reel.thumbnail || reel.thumbnail === "") && processedVideoURL
            };
          });
          
          console.log("İşlenmiş reels:", processedReels);
          setReels(processedReels);
          
          // Video thumbnail'leri oluşturmak için işlemi başlat
          processedReels.forEach(reel => {
            if (reel.needsThumbnailGeneration && reel.videoURL) {
              console.log(`${reel.id} için videodan otomatik thumbnail oluşturuluyor...`);
              generateThumbnailFromVideo(reel.videoURL, reel.id);
            }
          });
        } else {
          console.log("No reels found or API returned an unexpected format");
          setReels([]);
        }
      } else {
        console.error("Failed to fetch reels:", response.statusText);
        setReels([]);
      }
    } catch (error) {
      console.error("Error fetching reels:", error);
      setReels([]);
    }
  }, [navigate, username, API_BASE_URL, generateThumbnailFromVideo]);

  // Profil bilgilerini ve gönderileri getiren ana fonksiyon
  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    const localToken = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!localToken) {
      navigate("/login");
      return;
    }

    try {
      // Önce profil bilgilerini çek (yeni API servisiyle)
      const profileResponse = await api.user.getProfileByUsername(username);
      console.log("Profil API yanıtı:", profileResponse);

      if (profileResponse.success && profileResponse.data.user) {
        const userData = profileResponse.data.user;
        setUser(userData);
        // Backend'den gelen followStatus'u olduğu gibi kullan (veya yoksa 'none' olsun)
        setFollowStatus(userData.followStatus || 'none');
        setCanViewProfile(userData.canViewProfile === undefined ? true : userData.canViewProfile);

        // İstatistikleri ayarla
        setStats({
          followers: userData.followerCount || 0,
          following: userData.followingCount || 0,
          posts: userData.postCount || 0,
        });

        // Gizli hesap durumunu direkt backendden gelen değerle güncelliyoruz
        console.log("Profil gizlilik durumu:", userData.isPrivate);

        // Kendi profili mi kontrolü
        const storedUser = JSON.parse(sessionStorage.getItem("user")) || JSON.parse(localStorage.getItem("user"));
        const ownProfile = storedUser?.username === username;
        setIsOwnProfile(ownProfile);

        if (ownProfile) {
          setEditFormData({
            fullName: userData.fullName || "",
            bio: userData.bio || "",
            location: userData.location || "",
            website: userData.website || "",
          });
        }
        
        // Eğer profili görebiliyorsa gönderileri ve reels'leri çek
        if (userData.canViewProfile !== false) { 
          fetchUserPosts(username, localToken); // Gönderileri çek
          fetchUserReels(); // Reels'leri çek (bu zaten sadece başkasının profilinde çağrılıyor olmalı)
        } else {
          // Profili göremiyorsa gönderi/reel listelerini boşalt
          setPosts([]);
          setImagePosts([]);
          setTextPosts([]);
          setReels([]);
        }
        
        // Her zaman keşfet reels'lerini çek (kendi profilinde de)
        fetchExploreReels();

      } else {
        console.error("Profil yüklenemedi:", profileResponse.message);
        setUser(null); // Kullanıcı bulunamadıysa veya hata varsa
        setCanViewProfile(false); // Profil görülemez
        toast.error(profileResponse.message || "Kullanıcı profili yüklenirken bir hata oluştu.");
      }
    } catch (error) {
      console.error("Profil yüklenirken hata oluştu:", error);
      setUser(null);
      setCanViewProfile(false);
      toast.error("Profil yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [username, navigate, fetchExploreReels, fetchUserReels]);

  // Bileşen yüklendiğinde profil verisini çek
  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]); // Sadece fetchProfileData değiştiğinde çalışsın

  // Takip durumu değiştiğinde UI'ı güncelle 
  useEffect(() => {
    console.log("Takip durumu değişti:", followStatus);
    if (followStatus === 'following') {
      setIsFollowing(true);
    } else {
      setIsFollowing(false);
    }
  }, [followStatus]);

  const fetchUserPosts = async (targetUsername, token) => { // username yerine targetUsername
    // Bu fonksiyon artık canViewProfile kontrolü yapmıyor, çağıran yer yapıyor.
    try {
      console.log("Kullanıcı gönderileri çekiliyor:", targetUsername);
      
       // API çağrısını yeni servisle yap
       const response = await api.posts.getUserPostsByUsername(targetUsername); // api.js'e bu metod eklenmeli
       console.log("Gönderiler API yanıtı:", response);
      
       if (response && response.success) {
          // Yanıt yapısı değişmiş olabilir, kontrol et ve dizi olduğundan emin ol
          const postsData = response.data && response.data.posts ? response.data.posts : 
                           Array.isArray(response.data) ? response.data : [];
          
          // Dizi kontrolü yapalım
          if (!Array.isArray(postsData)) {
            console.error("API yanıtı beklenen dizi formatında değil:", postsData);
            setPosts([]);
            setImagePosts([]);
            setTextPosts([]);
            return;
          }
          
          console.log("İşlenmiş gönderiler:", postsData);
          setPosts(postsData); 

          // Optimize edilmiş fonksiyonları kullan
          const withImages = filterImagePosts(postsData);
          const withoutImages = postsData.filter(post => !withImages.includes(post));
          
          console.log("İmaj içeren gönderi sayısı:", withImages.length);
          console.log("İmaj içermeyen gönderi sayısı:", withoutImages.length);
          console.log("Örnek gönderi verileri:", 
              withImages.length > 0 ? withImages[0] : "Resimli gönderi yok", 
              withoutImages.length > 0 ? withoutImages[0] : "Metinli gönderi yok");
          
          setImagePosts(withImages);
          setTextPosts(withoutImages);
          
          // Debug - boş geliyorsa kontrol ekleyelim
          if (postsData.length === 0) {
            console.log("Kullanıcı gönderileri boş döndü");
          }
       } else {
         console.error("Gönderiler alınamadı:", response.message);
         setPosts([]);
         setImagePosts([]);
         setTextPosts([]);
       }
    } catch (error) {
      console.error("Gönderiler yüklenirken hata oluştu:", error);
      setPosts([]);
      setImagePosts([]);
      setTextPosts([]);
    }
  };

  // Helper function to safely parse images and get the first image URL
  const getFirstImageUrl = (imagesData) => {
    if (!imagesData) return null;
    let imageUrl = null;
    
    console.log("GetFirstImageUrl - İşlenen veri:", imagesData);
    
    try {
      // 1. Direkt URL string kontrolü
      if (typeof imagesData === 'string') {
        // Cloudinary URL kontrolü
        if (imagesData.includes('cloudinary.com')) {
          console.log("Cloudinary URL formatında:", imagesData);
          return imagesData; // Cloudinary URL'ini olduğu gibi döndür
        }
        // URL olabilecek bir string mi?
        if (imagesData.startsWith('/') || imagesData.startsWith('http')) {
          console.log("String URL formatında:", imagesData);
          return getFullImageUrl(imagesData); // Direkt URL olarak işle
        }
        
        // JSON string olabilir mi?
        try {
          const parsed = JSON.parse(imagesData);
          console.log("JSON string başarıyla ayrıştırıldı:", parsed);
          imagesData = parsed;
        } catch (jsonError) {
          console.log("JSON ayrıştırma hatası, string olarak kullanılıyor:", jsonError);
          // String'i olduğu gibi kullan
          return getFullImageUrl(imagesData);
        }
      }
      
      // 2. Array formatı kontrolü
      if (Array.isArray(imagesData)) {
        console.log("Dizi formatında:", imagesData);
        if (imagesData.length > 0) {
          // Dizi içinde obje durumu
          if (typeof imagesData[0] === 'object' && imagesData[0] !== null) {
            if (imagesData[0].url) {
              imageUrl = imagesData[0].url;
            } else if (imagesData[0].path) {
              imageUrl = imagesData[0].path;
            } else {
              // Objenin ilk değerini kullan
              const firstValue = Object.values(imagesData[0])[0];
              if (typeof firstValue === 'string') {
                imageUrl = firstValue;
              }
            }
          } else if (typeof imagesData[0] === 'string') {
            // Dizi içinde string durumu
            imageUrl = imagesData[0];
          }
        }
      }
      // 3. Obje formatı kontrolü
      else if (typeof imagesData === 'object' && imagesData !== null) {
        console.log("Obje formatında:", imagesData);
        
        // url veya path direkt özellik olarak var mı?
        if (imagesData.url) {
          imageUrl = imagesData.url;
        } else if (imagesData.path) {
          imageUrl = imagesData.path;
        }
        // İlk özelliği kullan
        else if (Object.keys(imagesData).length > 0) {
          const firstKey = Object.keys(imagesData)[0];
          const firstValue = imagesData[firstKey];
          
          if (typeof firstValue === 'string') {
            imageUrl = firstValue;
          } else if (typeof firstValue === 'object' && firstValue !== null) {
            if (firstValue.url) {
              imageUrl = firstValue.url;
            } else if (firstValue.path) {
              imageUrl = firstValue.path;
            }
          }
        }
      }
    } catch (e) {
      console.error("Resim verisini işlerken hata:", e, imagesData);
    }
    
    if (!imageUrl) {
      console.log("Resim URL'si bulunamadı!");
      return null;
    }
    
    console.log("İşlenmiş resim URL'si:", imageUrl);
    // Cloudinary URL kontrolü
    if (imageUrl && imageUrl.includes('cloudinary.com')) {
      return imageUrl; // Cloudinary URL'ini olduğu gibi döndür
    }
    return getFullImageUrl(imageUrl);
  };

  // Resimli gönderileri ayıran fonksiyon - optimize edildi
  const filterImagePosts = (postsData) => {
    return postsData.filter(post => {
      if (!post) return false;
      
      // 1. Basit kontrol: Post'da images alanı var mı?
      if (!post.images) return false;
      
      // 2. images bir string ise:
      if (typeof post.images === 'string') {
        // a. JSON string olabilir
        try {
          const parsed = JSON.parse(post.images);
          // JSON olarak parse edilebildi, içeriği kontrol et
          if (Array.isArray(parsed) && parsed.length > 0) return true;
          if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) return true;
          return false;
        } catch (e) {
          // b. URL string olabilir
          return post.images.startsWith('/') || post.images.startsWith('http');
        }
      }
      
      // 3. Array ise:
      if (Array.isArray(post.images)) {
        return post.images.length > 0;
      }
      
      // 4. Obje ise:
      if (typeof post.images === 'object' && post.images !== null) {
        return Object.keys(post.images).length > 0;
      }
      
      return false;
    });
  };

  // Helper function to check if there are multiple images
  const hasMultipleImages = (imagesData) => {
    if (!imagesData) return false;
    try {
       // If it's a URL string, it's not multiple
      if (typeof imagesData === 'string' && (imagesData.startsWith('/') || imagesData.startsWith('http'))) {
        return false;
      }
      const parsedImages = typeof imagesData === 'string' ? JSON.parse(imagesData) : imagesData;
      return Array.isArray(parsedImages) && parsedImages.length > 1;
    } catch (e) {
      // If parsing fails, assume not multiple
      return false; 
    }
  };
  
  // Helper function to generate UI Avatars URL
  const getUIAvatarUrl = (name) => {
      const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'KU'; // KU = Kullanıcı
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=000000&color=0affd9&size=150`;
  };

  const processUrl = (url) => {
    // Eğer URL null veya undefined ise null döndür
    if (!url) return null;
    
    // Eğer URL zaten mutlak bir URL ise (http://, https://, veya Cloudinary URL'i)
    if (url.startsWith('http://') || url.startsWith('https://') || url.includes('cloudinary.com')) {
      return url;
    }
    // Değilse, API_BASE_URL'yi başına ekle
    return `${API_BASE_URL}${url}`;
  };

  const getFullImageUrl = (imageUrl) => processUrl(imageUrl);
  const getFullVideoUrl = (videoUrl) => processUrl(videoUrl);

  const handleFormChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      // API çağrısını yeni servis ile yap
      const response = await api.user.updateProfile(editFormData); // api.js'e bu metod eklenmeli

      if (response.success) {
        setUser({ ...user, ...editFormData });
        setIsEditing(false);
        toast.success("Profil başarıyla güncellendi!");
      } else {
        toast.error(response.message || "Profil güncellenemedi.");
      }
    } catch (error) {
      console.error("Profil güncelleme hatası:", error);
      toast.error("Profil güncellenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };
  
  const handlePostClick = (post) => {
    // Post indexini bul
    const postIndex = imagePosts.findIndex(p => p.id === post.id);
    setSelectedPostIndex(postIndex !== -1 ? postIndex : 0);
    
    // Görsel/Video URL'lerini tam URL'ye dönüştür
    let processedImages = null;
    if (post.images) {
      try {
        // Check if it's already a URL string or Cloudinary URL
        if (typeof post.images === 'string' && (
          post.images.startsWith('/') || 
          post.images.startsWith('http') || 
          post.images.includes('cloudinary.com')
        )) {
           // Cloudinary URL kontrolü - olduğu gibi bırak
           if (post.images.includes('cloudinary.com')) {
             processedImages = [{ url: post.images }];
           } else {
             processedImages = [{ url: getFullImageUrl(post.images) }]; // Treat as a single image array
           }
        } else {
          const parsedImages = typeof post.images === 'string' ? JSON.parse(post.images) : post.images;
          if (Array.isArray(parsedImages)) {
            processedImages = parsedImages.map(img => {
              // URL değerini kontrol et
              if (img.url && img.url.includes('cloudinary.com')) {
                return { ...img, url: img.url }; // Cloudinary URL'ini olduğu gibi bırak
              } else {
                return { ...img, url: getFullImageUrl(img.url) };
              }
            });
          } else if (typeof parsedImages === 'object' && parsedImages !== null) {
             // Handle potential object format if necessary
            processedImages = Object.entries(parsedImages).reduce((acc, [key, img]) => {
              // URL değerini kontrol et
              if (img.url && img.url.includes('cloudinary.com')) {
                acc[key] = { ...img, url: img.url }; // Cloudinary URL'ini olduğu gibi bırak
              } else {
                acc[key] = { ...img, url: getFullImageUrl(img.url) };
              }
              return acc;
            }, {});
          }
        }
      } catch (e) {
        console.error("Image parse/processing error in handlePostClick:", e, post.images);
         // If parsing fails but it looks like a URL, treat as single image
         if (typeof post.images === 'string') {
             // Cloudinary URL kontrolü - olduğu gibi bırak
             if (post.images.includes('cloudinary.com')) {
               processedImages = [{ url: post.images }];
             } else if (post.images.startsWith('/') || post.images.startsWith('http')) {
               processedImages = [{ url: getFullImageUrl(post.images) }];
             }
         }
      }
    }
    
    let processedVideo = null;
    if (post.video_url) {
      processedVideo = getFullVideoUrl(post.video_url);
    }

    setSelectedPost({ 
      ...post,
      images: processedImages, 
      video_url: processedVideo, 
      user: { // Posta ait kullanıcı bilgisi, profil bilgileriyle aynı
        ...user,
        profile_picture: user?.profile_picture ? getFullImageUrl(user.profile_picture) : getUIAvatarUrl(user?.username) // Use UI Avatar if no profile pic
      } 
    });
    setIsModalOpen(true);
  };

  // Post gezinme fonksiyonları
  const navigateToNextPost = () => {
    if (selectedPostIndex < imagePosts.length - 1) {
      const nextPost = imagePosts[selectedPostIndex + 1];
      handlePostClick(nextPost);
    }
  };
  
  const navigateToPreviousPost = () => {
    if (selectedPostIndex > 0) {
      const prevPost = imagePosts[selectedPostIndex - 1];
      handlePostClick(prevPost);
    }
  };

  const handleReelClick = (reel) => {
    console.log("Tıklanan reel:", reel);
    
    // Oluşturulan thumbnail varsa onu da reele ekleyelim
    let thumbnailToUse = reel.thumbnail;
    
    // Otomatik oluşturulan thumbnail varsa onu kullan
    if (generatedThumbnails[reel.id]) {
      console.log(`${reel.id} için otomatik oluşturulan thumbnail kullanılıyor`);
      thumbnailToUse = generatedThumbnails[reel.id];
    }
    // API'den gelen thumbnail varsa ve placeholder değilse onu kullan
    else if (reel.thumbnail && !reel.thumbnail.includes("ui-avatars.com")) {
      console.log(`${reel.id} için API'den gelen thumbnail kullanılıyor`);
      thumbnailToUse = reel.thumbnail;
    }
    // Hiçbiri yoksa placeholder kullan
    else {
      console.log(`${reel.id} için placeholder thumbnail kullanılıyor`);
      thumbnailToUse = `https://ui-avatars.com/api/?name=Video&background=000000&color=0affd9&size=300`;
    }
    
    setSelectedReel({
      ...reel,
      thumbnail: thumbnailToUse,
      user: { // Reel'e ait kullanıcı bilgisi, profil bilgileriyle aynı
        ...user,
        profileImage: user?.profile_picture ? getFullImageUrl(user.profile_picture) : null,
        username: user?.username 
      }
    });
    setIsReelModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
  };

  const closeReelModal = () => {
    setIsReelModalOpen(false);
    setSelectedReel(null);
  };

  // Takip et/takibi bırak fonksiyonu - iyileştirilmiş versiyon
  const handleFollowAction = async () => {
    if (!currentUser) {
      toast.error('Bu işlemi gerçekleştirmek için giriş yapmalısınız.');
      return;
    }

    // Kendi profilini takip edemezsin
    if (currentUser.username === user.username) {
      toast.error('Kendinizi takip edemezsiniz.');
      return;
    }

    setFollowLoading(true);

    try {
      // Mevcut takip durumuna göre işlemi belirle
      if (followStatus === 'not_following' || followStatus === 'none') {
        // Takip et
        console.log("Takip isteği gönderiliyor...", username);
        const response = await api.user.follow(username);
        console.log("Takip yanıtı:", response);

        if (response.success) {
          // Backend'den gelen cevaba göre status'u güncelle
          const newStatus = response.data?.status || (user.isPrivate ? 'requested' : 'following');
          setFollowStatus(newStatus);
          
          if (newStatus === 'following') {
            setStats(prevStats => ({
              ...prevStats,
              followers: prevStats.followers + 1
            }));
            toast.success(`${user.fullName || user.username} kullanıcısını takip ediyorsunuz.`);
          } else if (newStatus === 'requested') {
            toast.success('Takip isteği gönderildi.');
          }
          
          // Profil verilerini güncelle
          fetchProfileData();
        } else {
          // Hata mesajını kontrol et
          if (response.message && response.message.includes('zaten takip')) {
            setFollowStatus('requested');
            toast.info('Bu kullanıcıya zaten takip isteği gönderilmiş.');
          } else {
            toast.error(response.message || 'Takip işlemi sırasında bir hata oluştu.');
          }
        }
      } else if (followStatus === 'following') {
        // Takibi bırak
        console.log("Takipten çıkma isteği gönderiliyor...", username);
        const response = await api.user.unfollow(username);
        console.log("Takipten çıkma yanıtı:", response);
        
        if (response.success) {
          setFollowStatus('not_following');
          setStats(prevStats => ({
            ...prevStats,
            followers: prevStats.followers - 1
          }));
          toast.success(`${user.fullName || user.username} kullanıcısını takip etmeyi bıraktınız.`);
          
          // Profil verilerini güncelle
          fetchProfileData();
      } else {
          toast.error(response.message || 'Takipten çıkma işlemi sırasında bir hata oluştu.');
        }
      } else if (followStatus === 'requested') {
        // Takip isteğini geri çek
        console.log("Takip isteği iptali gönderiliyor...", username);
        const response = await api.user.cancelFollowRequest(username);
        console.log("İstek iptal yanıtı:", response);
        
        if (response.success) {
          setFollowStatus('not_following');
          toast.success('Takip isteği iptal edildi.');
          
          // Profil verilerini güncelle
          fetchProfileData();
        } else {
          toast.error(response.message || 'İstek iptali sırasında bir hata oluştu.');
        }
      }
    } catch (error) {
      console.error('Takip işlemi hatası:', error);
      toast.error('Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setFollowLoading(false);
    }
  };
  
  // Takip durumuna göre buton metnini ve aksiyonunu döndüren fonksiyon
  const getFollowButtonProps = () => {
    if (currentUser && currentUser.username === user.username) {
      return null; // Kendi profilinde takip butonu gösterme
    }
    
    if (followStatus === 'following') {
      return { text: 'Takip Ediliyor', action: handleFollowAction, className: 'bg-black/50 border border-[#0affd9]/30 text-[#0affd9] hover:bg-[#0affd9]/10' };
    } else if (followStatus === 'requested') {
      return { text: 'İstek Gönderildi', action: handleFollowAction, className: 'bg-gray-700 text-gray-300 hover:bg-gray-600' };
    } else {
      return { text: 'Takip Et', action: handleFollowAction, className: 'bg-[#0affd9] text-black hover:bg-[#0affd9]/80' };
    }
  };

  // Yeni modern takip butonu render fonksiyonu
  const renderFollowButton = () => {
    if (currentUser && currentUser.username === user.username) {
      return null; // Kendi profilinde takip butonu gösterme
    }
    
    if (followStatus === 'following') {
      return (
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium 
                    bg-black/50 border border-[#0affd9]/30 text-[#0affd9] hover:bg-[#0affd9]/10 
                    transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleFollowAction}
          disabled={followLoading}
        >
          {followLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus size={16} />}
          <span>Takip Ediliyor</span>
        </button>
      );
    } else if (followStatus === 'requested') {
      return (
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium 
                    bg-gray-700 text-gray-300 hover:bg-gray-600 
                    transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleFollowAction}
          disabled={followLoading}
        >
          {followLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock size={16} />}
          <span>İstek Gönderildi</span>
        </button>
      );
    } else {
      return (
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium 
                    bg-[#0affd9] text-black hover:bg-[#0affd9]/80 
                    transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed z-10"
          onClick={handleFollowAction}
          disabled={followLoading}
        >
          {followLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus size={16} />}
          <span>Takip Et</span>
        </button>
      );
    }
  };

  // Takipçi listesini getiren fonksiyon (canViewProfile kontrolü eklendi)
  const fetchFollowers = useCallback(async () => {
    if (!username || !canViewProfile) { // Profil gizliyse ve görülemiyorsa fetch etme
       setFollowModalUsers([]);
       setFollowModalLoading(false);
       // İsteğe bağlı olarak kullanıcıya bilgi verilebilir
       // setFollowModalError("Bu hesabın takipçilerini görmek için takip etmelisiniz.");
       return; 
    }
    setFollowModalLoading(true);
    setFollowModalError(null);
    try {
       // API yanıtını kontrol et (Data içindeki users dizisi)
       const response = await api.user.getFollowersByUsername(username); 
       if (response.success && response.data && Array.isArray(response.data.users)) {
         setFollowModalUsers(response.data.users);
         // canViewList'i de kontrol edebiliriz ama fetchFollowers zaten canViewProfile ile korunuyor
       } else {
         setFollowModalUsers([]);
         setFollowModalError(response.message || "Takipçiler alınamadı.");
         console.error("Takipçi getirme hatası:", response.message);
       }
    } catch (error) {
       setFollowModalUsers([]);
       setFollowModalError("Takipçiler yüklenirken bir hata oluştu.");
       console.error("Takipçi getirme hatası:", error);
    } finally {
       setFollowModalLoading(false);
    }
  }, [username, canViewProfile]); // canViewProfile bağımlılık eklendi

  // Takip edilen listesini getiren fonksiyon (canViewProfile kontrolü eklendi)
  const fetchFollowing = useCallback(async () => {
     if (!username || !canViewProfile) { // Profil gizliyse ve görülemiyorsa fetch etme
       setFollowModalUsers([]);
       setFollowModalLoading(false);
       return;
     }
     setFollowModalLoading(true);
     setFollowModalError(null);
     try {
       // API yanıtını kontrol et (Data içindeki users dizisi)
       const response = await api.user.getFollowingByUsername(username);
       if (response.success && response.data && Array.isArray(response.data.users)) {
         setFollowModalUsers(response.data.users);
       } else {
         setFollowModalUsers([]);
         setFollowModalError(response.message || "Takip edilenler alınamadı.");
         console.error("Takip edilen getirme hatası:", response.message);
       }
     } catch (error) {
       setFollowModalUsers([]);
       setFollowModalError("Takip edilenler yüklenirken bir hata oluştu.");
       console.error("Takip edilen getirme hatası:", error);
     } finally {
       setFollowModalLoading(false);
     }
  }, [username, canViewProfile]); // canViewProfile bağımlılık eklendi


  // Takipçi modalını açan handler (canViewProfile kontrolü)
  const handleShowFollowers = () => {
    if (!canViewProfile) {
      toast.error("Bu hesabın takipçilerini görmek için takip etmeniz gerekir.");
      return;
    }
    setFollowModalTitle("Takipçiler");
    setFollowModalUsers([]); 
    setIsFollowModalOpen(true);
    fetchFollowers();
  };

  // Takip edilen modalını açan handler (canViewProfile kontrolü)
  const handleShowFollowing = () => {
    if (!canViewProfile) {
      toast.error("Bu hesabın takip ettiklerini görmek için takip etmeniz gerekir.");
      return;
    }
    setFollowModalTitle("Takip Edilenler");
    setFollowModalUsers([]);
    setIsFollowModalOpen(true);
    fetchFollowing();
  };

  // Modal kapatma
  const closeFollowModal = () => {
    setIsFollowModalOpen(false);
    setFollowModalUsers([]);
    setFollowModalError(null);
  };

  // Takipçi modalı içindeki takip toggle işlevi
  const handleFollowToggleInModal = async (targetUser, isCurrentlyFollowing) => {
    if (!targetUser || !targetUser.username) {
      console.error("Kullanıcı bilgisi eksik");
      return;
    }
    
    console.log(`Toggling follow for user ${targetUser.username}, currently following: ${isCurrentlyFollowing}`);
    
    try {
      const action = isCurrentlyFollowing ? api.user.unfollow : api.user.follow;
      const response = await action(targetUser.username);
      
      if (response.success) {
        // Modal listesini güncelle
        setFollowModalUsers(prevUsers => 
          prevUsers.map(u => 
            u.username === targetUser.username ? { ...u, isFollowing: !isCurrentlyFollowing } : u
          )
        );
        
        // Ana stats state'ini de güncelle (takipçi/takip sayısını)
        // Eğer kendi profilimizdeysek ve takip ettiğimiz kişi sayısı değişiyorsa:
        if (isOwnProfile) {
           setStats(prevStats => ({
             ...prevStats,
             following: isCurrentlyFollowing ? prevStats.following - 1 : prevStats.following + 1
           }));
        }
        // Eğer başka bir profildeysek ve o profilin takipçi sayısı değişiyorsa:
        else if (user?.username === targetUser.username) { 
          // Bu durumda profil sayfasındaki kullanıcının takipçi sayısını güncelliyoruz
          setStats(prevStats => ({
            ...prevStats,
            followers: isCurrentlyFollowing ? prevStats.followers - 1 : prevStats.followers + 1
          }));
        } 

        toast.success(response.message || (isCurrentlyFollowing ? 'Takipten çıkıldı.' : 'Takip edildi.'));
      } else {
        console.error("Modal içinde takip durumu değiştirilemedi:", response.message);
        toast.error(response.message || 'İşlem başarısız oldu.');
      }
    } catch (error) {
      console.error("Modal içinde takip durumu değiştirilirken hata:", error);
      toast.error('Takip durumu değiştirilirken bir hata oluştu.');
    }
  };

  // Logout fonksiyonu
  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("Başarıyla çıkış yapıldı.");
  };

  // Loading Durumu
  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-[#0affd9]">
      <div className="flex items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#0affd9]" />
        <span>Yükleniyor...</span>
      </div>
    </div>;
  }

  // Kullanıcı bulunamadı durumu
  if (!user) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-red-500">
      <div className="p-8 rounded-2xl bg-black/50 border border-red-500/30 max-w-md">
        <h2 className="text-xl font-bold mb-2">Kullanıcı bulunamadı</h2>
        <p className="text-gray-400">Aradığınız profil mevcut değil veya kaldırılmış olabilir.</p>
        <button 
          onClick={() => navigate('/')} 
          className="mt-4 px-4 py-2 bg-[#0affd9] text-black rounded-lg hover:bg-[#0affd9]/80 transition-colors"
        >
          Ana Sayfaya Dön
        </button>
          </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sol Panel */}  
      <div className="w-64 lg:w-72 border-r border-[#0affd9]/20 p-4 sticky top-0 h-screen hidden md:block">
        <LeftPanel showMessagesAndNotifications={false} />
              </div>

      {/* Ana Profil İçeriği */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Profil Başlığı */}
          <div className="relative mb-8 p-6 rounded-2xl bg-black/50 border border-[#0affd9]/20 backdrop-blur-lg">
            <GlowingEffect color="#0affd9" spread={60} glow={true}/>
            <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
              {/* Profil Resmi */}
              <div className="relative">
                <img
                  src={user.profile_picture ? getFullImageUrl(user.profile_picture) : getUIAvatarUrl(user.username)}
                        alt={user.username}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#0affd9] shadow-lg object-cover"
                      />
                    </div>

              {/* Profil Bilgileri */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold text-[#0affd9] tracking-wide mb-1">
                  {user.username}
                        </h1>
                {user.fullName && (
                  <p className="text-lg text-gray-300 mb-3">{user.fullName}</p>
                )}
                {user.bio && <p className="text-gray-400 mb-4 text-sm">{user.bio}</p>}

                {/* İstatistikler */}
                <div className="flex justify-center md:justify-start space-x-6 mb-4">
                  <div className="text-center">
                    <span className="block font-bold text-lg text-[#0affd9]">
                      {stats.posts}
                    </span>
                    <span className="text-xs text-gray-400">Gönderi</span>
                  </div>
                  <button onClick={handleShowFollowers} className="text-center cursor-pointer hover:text-[#0affd9]">
                    <span className="block font-bold text-lg text-[#0affd9]">
                      {stats.followers}
                    </span>
                    <span className="text-xs text-gray-400">Takipçi</span>
                  </button>
                  <button onClick={handleShowFollowing} className="text-center cursor-pointer hover:text-[#0affd9]">
                    <span className="block font-bold text-lg text-[#0affd9]">
                      {stats.following}
                    </span>
                    <span className="text-xs text-gray-400">Takip Edilen</span>
                  </button>
                </div>

                {/* Butonlar */}
                <div className="flex justify-center md:justify-start space-x-3">
                          {isOwnProfile ? (
                    <>
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-black/60 border border-[#0affd9]/30 text-[#0affd9] hover:bg-[#0affd9]/10 transition-colors"
                  >
                    {isEditing ? "İptal" : "Profili Düzenle"}
                  </button>
                              <button
                        onClick={handleLogout} 
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-red-800/30 border border-red-600/50 text-red-400 hover:bg-red-700/40 transition-colors flex items-center"
                      >
                        <LogOut size={16} className="mr-1.5" /> Çıkış Yap
                              </button>
                    </>
                  ) : (
                    renderFollowButton()
                          )}
                        </div>
                      </div>
                </div>
                </div>

          {/* Profil Düzenleme Formu */}
          {isEditing && isOwnProfile && (
            <div className="mb-8 p-6 rounded-2xl bg-black/50 border border-[#0affd9]/20 backdrop-blur-lg">
              <h2 className="text-xl font-semibold mb-4 text-[#0affd9]">Profili Düzenle</h2>
              <form onSubmit={handleSubmitEdit} className="space-y-4">
                          <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tam Ad</label>
                      <input
                        type="text"
                        name="fullName"
                        value={editFormData.fullName}
                        onChange={handleFormChange}
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-[#0affd9]/30 text-white focus:border-[#0affd9] focus:ring-1 focus:ring-[#0affd9]/50 outline-none"
                      />
                    </div>
                          <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
                      <textarea
                        name="bio"
                        value={editFormData.bio}
                        onChange={handleFormChange}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-[#0affd9]/30 text-white focus:border-[#0affd9] focus:ring-1 focus:ring-[#0affd9]/50 outline-none"
                      ></textarea>
                    </div>
                          <button
                            type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-[#0affd9] text-black font-medium hover:bg-[#0affd9]/80 transition-colors disabled:opacity-50"
                          >
                  {loading ? "Kaydediliyor..." : "Kaydet"}
                          </button>
                  </form>
            </div>
          )}

          {/* Gizli Profil Mesajı */}  
          {!canViewProfile && (
            <div className="text-center p-8 rounded-2xl bg-black/50 border border-[#0affd9]/20 backdrop-blur-lg mb-8 flex flex-col items-center">
                <Lock size={48} className="text-gray-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-400 mb-2">Bu Hesap Gizli</h2>
                <p className="text-gray-500">Gönderilerini ve reels'lerini görmek için {user.username}'ı takip et.</p>
              </div>
          )}

          {/* Sekmeler */}  
          {canViewProfile && (
              <>  
                <div className="border-b border-[#0affd9]/20 mb-6">
                  <nav className="flex justify-center space-x-8">
                    {["posts", "reels", "yazılar"].map((tab) => (
                        <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-3 px-1 text-sm font-medium transition-colors border-b-2
                          ${activeTab === tab
                            ? 'border-[#0affd9] text-[#0affd9]'
                            : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-500'
                          }`}
                      >
                        {tab === "posts" ? "Gönderiler" : tab === "reels" ? "Reels" : "Yazılar"}
                        </button>
                    ))}
                  </nav>
                    </div>

                {/* İçerik Alanı */}  
                        <div>
                  {activeTab === "posts" && (
                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 gap-1 md:gap-2">
                          {imagePosts.length > 0 ? (
                        imagePosts.map((post) => {
                          const firstImageUrl = getFirstImageUrl(post.images);
                          if (!firstImageUrl) return null;
                                
                                return (
                                  <div
                                    key={post.id}
                              className="relative aspect-square cursor-pointer group overflow-hidden rounded-md border border-[#0affd9]/10"
                                    onClick={() => handlePostClick(post)}
                                  >
                              {/* Çoklu fotoğraf indikatörü - Instagram benzeri ikon */}
                              {hasMultipleImages(post.images) && (
                                <span className="absolute top-2 right-2 z-10 bg-black/50 p-1 rounded-md text-[#0affd9]">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M7 4a3 3 0 013-3h6a3 3 0 013 3v6a3 3 0 01-3 3H4a1 1 0 100 2h12a1 1 0 100-2h-1.586l1.293-1.293a1 1 0 10-1.414-1.414L12 12.586V11a1 1 0 10-2 0v2a1 1 0 00.293.707l3 3a1 1 0 001.414-1.414L13.414 14H14a3 3 0 003-3V5a1 1 0 10-2 0v6a1 1 0 01-1 1H7a1 1 0 01-1-1V4z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              )}
                              
                              {/* Video gönderi indikatörü */}
                              {post.video_url && (
                                <span className="absolute top-2 right-2 z-10 bg-black/50 p-1 rounded-md text-[#0affd9]">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              )}

                              {/* Post ana resmi - Instagram benzeri thumbnail */}
                              <div className="w-full h-full overflow-hidden bg-black">
                                <img
                                  src={firstImageUrl}
                                  alt={`Post by ${user.username}`}
                                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                          loading="lazy"
                                />
                              </div>

                              {/* Hover overlay - Instagram benzeri hover efekti */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                <div className="flex space-x-6 text-white">
                                  <span className="flex items-center gap-1.5">
                                    <Heart className="h-5 w-5 text-[#0affd9] filter drop-shadow-glow" fill="#0affd9" strokeWidth={0} /> 
                                    <span className="font-semibold text-white">
                                      {parseInt(post.likeCount || post.likes || post.like_count || post.LikeCount || '0')}
                                    </span>
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <MessageCircle className="h-5 w-5 text-[#0affd9] filter drop-shadow-glow" fill="transparent" /> 
                                    <span className="font-semibold text-white">
                                      {parseInt(post.commentCount || post.comments || post.comment_count || post.CommentCount || '0')}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              {/* Gönderi bilgisi - Instagram benzeri alt bilgi */}
                              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center px-2">
                                <span className="text-xs text-white truncate">
                                  {post.content ? 
                                    (post.content.length > 20 ? post.content.substring(0, 20) + '...' : post.content) : 
                                    `${user.username}'in gönderisi`}
                                </span>
                                  </div>
                            </div>
                          );
                        })
                          ) : (
                        <div className="col-span-3 p-8 text-center">
                          <p className="text-gray-400">Henüz gönderi yok</p>
                            </div>
                          )}
                        </div>
                      )}
                      {activeTab === "reels" && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-2">
                          {reels.length > 0 ? (
                        reels.map((reel) => {
                          // Öncelikle thumbnail değerini kontrol edelim
                          console.log(`Render edilecek reel: ${reel.id}, Thumbnail: ${reel.thumbnail}`);
                          
                          // Thumbnail seçim mantığı: otomatik oluşturulan > API'den gelen > placeholder
                          let thumbnailUrl;
                          
                          if (generatedThumbnails[reel.id]) {
                            // Otomatik oluşturulan thumbnail varsa onu kullan
                            thumbnailUrl = generatedThumbnails[reel.id];
                          } else if (reel.thumbnail && !reel.thumbnail.includes("ui-avatars.com")) {
                            // API'den gelen ve placeholder olmayan thumbnail varsa
                            thumbnailUrl = reel.thumbnail;
                          } else {
                            // Hiçbiri yoksa placeholder kullan
                            thumbnailUrl = `https://ui-avatars.com/api/?name=Video&background=000000&color=0affd9&size=300`;
                          }
                          
                          return (
                            <div
                              key={reel.id}
                              className="relative aspect-[9/16] cursor-pointer group overflow-hidden rounded-md border border-[#0affd9]/10"
                              onClick={() => handleReelClick(reel)}
                            >
                              {/* Thumbnail görüntüsü - oluşturulan, API'den gelen veya placeholder */}
                              <img
                                src={thumbnailUrl}
                                alt={`Reel by ${user.username}`}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => {
                                  console.error(`Resim yüklenemedi: ${thumbnailUrl}`);
                                  e.target.onerror = null; // Sonsuz döngüyü engelle
                                  e.target.src = `https://ui-avatars.com/api/?name=Video&background=000000&color=0affd9&size=300`; // Yedek görüntü
                                }}
                              />
                              
                              {/* Video ikonu - Bu reelin bir video olduğunu göster */}
                              <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#0affd9]" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                </svg>
                              </div>
                              
                              {/* Hover overlay */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <div className="flex flex-col items-center text-white space-y-1">
                                  <span className="flex items-center">
                                    <Heart size={16} className="mr-1 text-[#0affd9]" /> 
                                    {parseInt(reel.likeCount || reel.likes || reel.like_count || reel.LikeCount || '0')}
                                  </span>
                                  <span className="flex items-center">
                                    <MessageCircle size={16} className="mr-1 text-[#0affd9]" /> 
                                    {parseInt(reel.commentCount || reel.comments || reel.comment_count || reel.CommentCount || '0')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                          ) : (
                        <div className="col-span-3 p-8 text-center">
                          <p className="text-gray-400">Henüz reels paylaşılmamış</p>
                            </div>
                          )}
                        </div>
                      )}
                  {activeTab === "yazılar" && (
                    <div className="space-y-4">
                          {textPosts.length > 0 ? (
                        textPosts.map((post) => (
                          <div key={post.id} 
                              className="p-4 rounded-lg bg-black/50 border border-[#0affd9]/10 cursor-pointer hover:border-[#0affd9]/30"
                                  onClick={() => handlePostClick(post)}
                                >
                            <p className="text-gray-300 whitespace-pre-wrap break-words">
                              {post.content}
                            </p>
                            <div className="text-xs text-gray-500 mt-2 flex justify-between items-center">
                              <span>{new Date(post.created_at).toLocaleString()}</span>
                              <div className="flex space-x-3">
                                <span className="flex items-center">
                                  <Heart size={14} className="mr-1 text-[#0affd9]" /> 
                                  {parseInt(post.likeCount || post.likes || post.like_count || post.LikeCount || '0')}
                                </span>
                                <span className="flex items-center">
                                  <MessageCircle size={14} className="mr-1 text-[#0affd9]" /> 
                                  {parseInt(post.commentCount || post.comments || post.comment_count || post.CommentCount || '0')}
                                </span>
                              </div>
                            </div>
                                </div>
                        ))
                          ) : (
                        <div className="p-8 text-center">
                          <p className="text-gray-400">Henüz yazı paylaşılmamış</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              </div>

      {/* Gönderi Modal'ı */}
      {isModalOpen && selectedPost && (
        <PostShow 
          post={selectedPost} 
          onClose={closeModal} 
          isOpen={isModalOpen} 
          profileUser={user}
          onNext={navigateToNextPost}
          onPrevious={navigateToPreviousPost}
          onPostDelete={postId => {
            // Silinen gönderiyi listeden kaldır
            setPosts(prev => prev.filter(p => p.id !== postId));
            // Modal'ı kapat
            closeModal();
            toast.success('Gönderi başarıyla silindi');
          }}
        />
      )}
      
      {/* Reel Modal'ı */}
      {isReelModalOpen && selectedReel && (
        <MiniReelsPlayer reel={selectedReel} onClose={closeReelModal} />
      )}

      {/* Takipçi/Takip Edilen Listesi Modal'ı */}
      <FollowListModal
        isOpen={isFollowModalOpen}
        onClose={closeFollowModal}
        title={followModalTitle}
        users={followModalUsers}
        loading={followModalLoading}
        error={followModalError}
        currentUserId={currentUser?.id}
        onFollowToggle={handleFollowToggleInModal}
      />
    </div>
  );
};

export default Profile;
