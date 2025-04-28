import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const Profile = () => {
  const navigate = useNavigate();

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

      if (profileResponse.success && profileResponse.data && profileResponse.data.user) {
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
          fetchUserReels(); // Reels'leri çek
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

  // UserPosts çekmek için fonksiyonu güncelliyoruz
  const fetchUserPosts = async (targetUsername, token) => {
    try {
      console.log("Kullanıcı gönderileri çekiliyor:", targetUsername);
      
      // API çağrısını yap - API endpoint kontrolünü artırdık
      const response = await api.posts.getUserPostsByUsername(targetUsername);
      console.log("Gönderiler API yanıtı:", response);
      
      if (response.success && response.data) {
        // Yanıt yapısı kontrolü
        const userPosts = response.data.posts || response.data || [];
        console.log("İşlenmiş gönderiler:", userPosts);
        
        // Gönderileri ana state'e aktar
        setPosts(userPosts);

        // Resimli/Resimsiz ayırma mantığı aynı kalabilir
        const withImages = userPosts.filter((post) => {
          let postImages = post.images;
          if (typeof post.images === "string") {
            try {
              postImages = JSON.parse(post.images);
            } catch (e) {
              console.error("Images parse hatası:", e, post.images);
              postImages = null;
            }
          }
          return (
            postImages &&
            (Array.isArray(postImages)
              ? postImages.length > 0
              : typeof postImages === 'object' && postImages !== null && Object.keys(postImages).length > 0)
          );
        });

        const withoutImages = userPosts.filter((post) => {
          let postImages = post.images;
          if (typeof post.images === "string") {
            try {
              postImages = JSON.parse(post.images);
            } catch (e) {
              postImages = null;
            }
          }
          return (
            !postImages ||
            (Array.isArray(postImages)
              ? postImages.length === 0
              : typeof postImages === 'object' && postImages !== null && Object.keys(postImages).length === 0)
          );
        });

        setImagePosts(withImages);
        setTextPosts(withoutImages);
        
        // Debug - boş geliyorsa kontrol ekleyelim
        if (userPosts.length === 0) {
          console.log("Kullanıcı gönderileri boş döndü");
        }
        if (withImages.length === 0) {
          console.log("Resimli gönderiler boş");
        }
        if (withoutImages.length === 0) {
          console.log("Metinli gönderiler boş");
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

  return (
    <div>
      {/* Rest of the component code */}
    </div>
  );
};

export default Profile; 