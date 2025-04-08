import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
// import "../styles/Profile.css"; // CSS dosyasını kaldırıyoruz
import PostShow from "../components/profile/postShow";
import ReelShow from "../components/profile/ReelShow";
import LeftPanel from "../components/home/LeftPanel";
import MiniReelsPlayer from "../components/profile/MiniReelsPlayer"; // MiniReelsPlayer'ı import ediyoruz
import { API_BASE_URL } from "../config/constants"; // API_BASE_URL ekliyoruz

const Profile = () => {
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReel, setSelectedReel] = useState(null);
  const [isReelModalOpen, setIsReelModalOpen] = useState(false);
  
  const navigate = useNavigate();
  const { username } = useParams();

  // İstek durumunu takip etmek için state ekliyorum
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowRequestInProgress, setIsFollowRequestInProgress] = useState(false);

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

  // Kullanıcının reelslerini getir
  const fetchUserReels = useCallback(async () => {
    try {
      const token =
        sessionStorage.getItem("token") || localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

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
        if (data.success && data.data) {
          setReels(data.data);
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
  }, [navigate, username]);

  useEffect(() => {
    const storedUser =
      JSON.parse(sessionStorage.getItem("user")) ||
      JSON.parse(localStorage.getItem("user"));
    const token =
      sessionStorage.getItem("token") || localStorage.getItem("token");

    if (!storedUser || !token) {
      navigate("/login");
      return;
    }
    setCurrentUser(storedUser);
    setIsOwnProfile(username === storedUser.username);

    const fetchUserProfile = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/profile/${username}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) {
          throw new Error("Kullanıcı profili bulunamadı");
        }

        const data = await response.json();
        if (data.success && data.data.user) {
          setUser(data.data.user);
          
          // Takip durumunu ayarla
          if (data.data.user.isFollowing !== undefined) {
            setIsFollowing(data.data.user.isFollowing);
          }

          // Eğer kendi profili ise, profil düzenleme formunu doldur
          if (isOwnProfile) {
    setEditFormData({
              fullName: data.data.user.fullName || "",
              bio: data.data.user.bio || "",
              location: data.data.user.location || "",
              website: data.data.user.website || "",
            });
          }

          // Stats verilerini güncelle
          setStats({
            followers: data.data.user.followerCount || 0,
            following: data.data.user.followingCount || 0,
            posts: data.data.user.postCount || 0,
          });

          // Kullanıcının gönderilerini çek
          fetchUserPosts(username, token);
          
          // Reels verilerini çek
          fetchExploreReels();
          if (!isOwnProfile) {
            fetchUserReels();
          }
        }
      } catch (error) {
        console.error("Profil yüklenirken hata oluştu:", error);
      } finally {
        setLoading(false);
      }
    };

    const verifyToken = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/user`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          // Token geçersizse oturumu temizle ve login sayfasına yönlendir
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
        } else {
          // Token geçerliyse kullanıcı profilini çek
          fetchUserProfile();
        }
      } catch (error) {
        console.error("Token doğrulama hatası:", error);
        setLoading(false);
      }
    };

    verifyToken();
  }, [navigate, username, isOwnProfile, fetchExploreReels, fetchUserReels]);

  useEffect(() => {
    if (activeTab === "reels" && user) {
      fetchUserReels();
    }
  }, [activeTab, user, fetchUserReels]);

  const fetchUserPosts = async (username, token) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/profile/${username}/posts`,
        {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.posts) {
          setPosts(data.data.posts);

          // Gönderileri resimli ve resimsiz olarak ayırırken images değerini düzgün kontrol et
          const withImages = data.data.posts.filter((post) => {
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

          const withoutImages = data.data.posts.filter((post) => {
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
        }
      } else {
        console.error("Gönderiler alınamadı:", response.statusText);
      }
    } catch (error) {
      console.error("Gönderiler yüklenirken hata oluştu:", error);
    }
  };

  // URL işleme fonksiyonları API_BASE_URL kullanacak
  const processUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    // URL'de çift slash varsa düzelt
    const cleanUrl = url.replace(/\/+/g, '/');
    if (cleanUrl.startsWith("/")) {
      return `${API_BASE_URL}${cleanUrl}`;
    } else {
      return `${API_BASE_URL}/${cleanUrl}`;
    }
  };

  const getFullImageUrl = (imageUrl) => processUrl(imageUrl);
  const getFullVideoUrl = (videoUrl) => processUrl(videoUrl);

  const handleFormChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    const token =
      sessionStorage.getItem("token") || localStorage.getItem("token");
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.user) {
          setUser(result.data.user);
        
          const updatedUser = { ...currentUser, ...result.data.user };
        if (sessionStorage.getItem("user")) {
          sessionStorage.setItem("user", JSON.stringify(updatedUser));
        }
        if (localStorage.getItem("user")) {
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
        
          setCurrentUser(updatedUser);
        setIsEditing(false);
        }
      } else {
        console.error("Profil güncellenemedi:", response.statusText);
      }
    } catch (error) {
      console.error("Profil güncellenirken hata oluştu:", error);
    }
  };
  
  const handlePostClick = (post) => {
    // Resim URL'lerini işle
    const processedPost = {
      ...post,
      images: (post.images || []).map(img => getFullImageUrl(img)),
      user: {
          ...post.user,
          profileImage: getFullImageUrl(post.user?.profileImage)
      }
    };
    setSelectedPost(processedPost);
    setIsModalOpen(true);
  };

  const handleReelClick = (reel) => {
    // Reel URL'lerini işle
    const processedReel = {
        ...reel,
        videoURL: getFullVideoUrl(reel.videoURL),
        thumbnail: getFullImageUrl(reel.thumbnail),
        user: {
            ...reel.user,
            profileImage: getFullImageUrl(reel.user?.profileImage)
        }
    };
    setSelectedReel(processedReel);
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

  // Takip et/takibi bırak işlevi
  const toggleFollow = async () => {
    if (isFollowRequestInProgress) return;
    setIsFollowRequestInProgress(true);

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(
        `${API_BASE_URL}/api/user/follow/${user.id}`,
        {
          method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        // Takip durumunu güncelle
        setIsFollowing(!isFollowing);
        
        // Takipçi sayısını güncelle
        setStats({
          ...stats,
          followers: isFollowing 
            ? Math.max(0, stats.followers - 1) 
            : stats.followers + 1
        });
      } else {
        console.error("Takip işlemi başarısız oldu:", await response.text());
      }
    } catch (error) {
      console.error("Takip işlemi sırasında hata:", error);
    } finally {
      setIsFollowRequestInProgress(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#11141E] text-white">
      <PostShow
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={closeModal}
        profileUser={user}
      />

      <ReelShow
        reel={selectedReel}
        reels={reels}
        isOpen={isReelModalOpen}
        onClose={closeReelModal}
        profileUser={user}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-1/5">
            <LeftPanel user={currentUser} showMessagesAndNotifications={false} />
        </div>

          <div className="w-full lg:w-3/5">
            {loading ? (
              <div className="flex justify-center items-center h-96">
                <div className="animate-spin h-10 w-10 border-4 rounded-full border-blue-500 border-t-transparent"></div>
              </div>
            ) : user ? (
              <div className="space-y-6">
                <div className="rounded-2xl overflow-hidden bg-[rgba(20,24,36,0.7)] backdrop-blur-lg shadow-xl border border-[rgba(255,255,255,0.1)] p-6">
                  <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                    <div className="flex-shrink-0">
                      <img
                        src={getFullImageUrl(user.profileImage) || `https://ui-avatars.com/api/?name=${user.username}&background=random&color=fff&size=128`}
                        alt={user.username}
                        className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-blue-500/30 shadow-lg"
                        onError={(e) => { 
                          e.target.onerror = null; 
                          e.target.src=`https://ui-avatars.com/api/?name=${user.username}&background=random&color=fff&size=128`;
                        }}
                      />
                    </div>
                    <div className="flex-1 space-y-4 text-center md:text-left">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <h1 className="text-2xl font-bold text-gray-100">
                          {user.fullName || user.username}
                          <span className="block text-sm font-normal text-gray-400 mt-1">@{user.username}</span>
                        </h1>
                        <div className="flex gap-3 justify-center md:justify-end">
                          {isOwnProfile ? (
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                              className="rounded-full px-6 py-2 text-sm font-medium border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-all duration-300"
                  >
                    {isEditing ? "İptal" : "Profili Düzenle"}
                  </button>
                          ) : (
                            <>
                              <button
                                onClick={toggleFollow}
                                disabled={isFollowRequestInProgress}
                                className={`rounded-full px-6 py-2 text-sm font-medium transition-colors duration-300 shadow-md ${
                                  isFollowRequestInProgress ? 'opacity-70 cursor-not-allowed' : ''
                                } ${
                                  isFollowing 
                                    ? 'bg-gray-700 text-white hover:bg-gray-800 border border-gray-600' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                              >
                                {isFollowRequestInProgress 
                                  ? '...' 
                                  : isFollowing 
                                    ? "Takibi Bırak" 
                                    : "Takip Et"
                                }
                              </button>
                              <button className="rounded-full p-2 border border-gray-600/50 text-gray-400 hover:bg-gray-700/30 hover:text-gray-300 transition-all duration-300">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-center md:justify-start gap-8 pt-2">
                        <div className="text-center">
                          <span className="block text-xl font-bold text-gray-200">{stats.posts}</span>
                          <span className="text-xs text-gray-400 uppercase tracking-wider">Gönderi</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-xl font-bold text-gray-200">{stats.followers}</span>
                          <span className="text-xs text-gray-400 uppercase tracking-wider">Takipçi</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-xl font-bold text-gray-200">{stats.following}</span>
                          <span className="text-xs text-gray-400 uppercase tracking-wider">Takip</span>
                </div>
                </div>
                {!isEditing ? (
                        <div className="text-gray-300 max-w-xl pt-2 space-y-1">
                          {user.bio && <p className="text-sm leading-relaxed">{user.bio}</p>}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                            {user.location && <p className="flex items-center"><span className="mr-1">📍</span> {user.location}</p>}
                    {user.website && (
                              <p className="flex items-center">
                                <span className="mr-1">🔗</span>
                                <a
                                  href={user.website.startsWith("http") ? user.website : `https://${user.website}`}
                              target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                                >
                                  {user.website.replace(/^https?_\/\//, '')}
                        </a>
                      </p>
                    )}
                          </div>
                  </div>
                ) : (
                        <form onSubmit={handleSubmitEdit} className="space-y-4 max-w-xl pt-4">
                          <div>
                      <input
                        type="text"
                        id="fullName"
                        name="fullName"
                              placeholder="Ad Soyad"
                        value={editFormData.fullName}
                        onChange={handleFormChange}
                              className="w-full p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/80 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50 transition-colors"
                      />
                    </div>
                          <div>
                      <textarea
                        id="bio"
                        name="bio"
                              placeholder="Biyografi"
                        value={editFormData.bio}
                        onChange={handleFormChange}
                        rows="3"
                              className="w-full p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/80 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50 transition-colors resize-none"
                      ></textarea>
                    </div>
                          <div className="flex gap-4">
                      <input
                        type="text"
                        id="location"
                        name="location"
                              placeholder="Konum"
                        value={editFormData.location}
                        onChange={handleFormChange}
                              className="flex-1 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/80 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50 transition-colors"
                      />
                      <input
                        type="text"
                        id="website"
                        name="website"
                              placeholder="Website (örn: example.com)"
                        value={editFormData.website}
                        onChange={handleFormChange}
                              className="flex-1 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/80 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50 transition-colors"
                      />
                    </div>
                          <button
                            type="submit"
                            className="w-full py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-300 shadow-md"
                          >
                            Kaydet
                          </button>
                  </form>
                )}
              </div>
            </div>
                </div>

                <div className="border-b border-gray-700/50">
                  <div className="flex justify-start sm:justify-center md:justify-start space-x-0 sm:space-x-1 md:space-x-2">
                    <button
                      className={`py-3 px-2 md:px-4 font-medium text-sm flex items-center transition-all duration-200 ${activeTab === "posts" ? "border-b-2 border-blue-500 text-white" : "text-gray-400 hover:text-gray-300 hover:border-b-2 hover:border-gray-600/50"}`}
                      onClick={() => setActiveTab("posts")}
                    >
                      <svg className="w-5 h-5 md:mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" /></svg>
                      <span className="hidden md:inline ml-1.5">Gönderiler</span>
                    </button>
                    <button
                      className={`py-3 px-2 md:px-4 font-medium text-sm flex items-center transition-all duration-200 ${activeTab === "reels" ? "border-b-2 border-blue-500 text-white" : "text-gray-400 hover:text-gray-300 hover:border-b-2 hover:border-gray-600/50"}`}
                      onClick={() => setActiveTab("reels")}
                    >
                      <svg className="w-5 h-5 md:mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      <span className="hidden md:inline ml-1.5">Reelsler</span>
                    </button>
                    <button
                      className={`py-3 px-2 md:px-4 font-medium text-sm flex items-center transition-all duration-200 ${activeTab === "writings" ? "border-b-2 border-blue-500 text-white" : "text-gray-400 hover:text-gray-300 hover:border-b-2 hover:border-gray-600/50"}`}
                      onClick={() => setActiveTab("writings")}
                    >
                      <svg className="w-5 h-5 md:mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span className="hidden md:inline ml-1.5">Yazılar</span>
                    </button>
                    {isOwnProfile && (
                      <button
                        className={`py-3 px-2 md:px-4 font-medium text-sm flex items-center transition-all duration-200 ${activeTab === "saved" ? "border-b-2 border-blue-500 text-white" : "text-gray-400 hover:text-gray-300 hover:border-b-2 hover:border-gray-600/50"}`}
                        onClick={() => setActiveTab("saved")}
                      >
                        <svg className="w-5 h-5 md:mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                        <span className="hidden md:inline ml-1.5">Kaydedilenler</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="min-h-[300px]">
                  {activeTab === "posts" && (
                    <div>
                      {imagePosts.length > 0 ? (
                        <div className="grid grid-cols-3 gap-1 md:gap-2">
                          {imagePosts.map((post) => {
                            let imageUrl = '';
                            if (typeof post.images === 'string') {
                              try {
                                const parsedImages = JSON.parse(post.images);
                                imageUrl = Array.isArray(parsedImages) ? parsedImages[0] : null;
                              } catch (e) { imageUrl = null; }
                            } else if (Array.isArray(post.images)) {
                              imageUrl = post.images[0];
                            }
                            const fullImageUrl = getFullImageUrl(imageUrl);
                            
                            return (
                              <div
                                key={post.id}
                                className="aspect-square overflow-hidden relative cursor-pointer rounded group bg-slate-800/50"
                                onClick={() => handlePostClick(post)}
                              >
                                {fullImageUrl ? (
                                    <img
                                      src={fullImageUrl}
                                      alt={post.content?.substring(0, 50) || 'Gönderi resmi'}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      loading="lazy"
                                      onError={(e) => { 
                                          e.target.onerror = null; 
                                          e.target.style.display = 'none'; 
                                          const parent = e.target.parentElement;
                                          if(parent) parent.innerHTML += '<div class="flex items-center justify-center h-full text-gray-500 text-xs">Resim Yüklenemedi</div>';
                                      }}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500 text-xs">Resim Yok</div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                                  <div className="flex items-center space-x-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="flex items-center text-sm">
                                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                                      {post.likes || 0}
                                    </span>
                                    <span className="flex items-center text-sm">
                                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>
                                      {post.comments || 0}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                           })
                          }
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <p className="text-gray-400 text-sm">Henüz gönderi yok.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "reels" && (
                    <div>
                      {reels.length > 0 ? (
                        <div className="grid grid-cols-3 gap-1 md:gap-2">
                          {reels.map((reel) => {
                            const thumbnailUrl = getFullImageUrl(reel.thumbnail);
                            return (
                              <div
                                key={reel.id}
                                className="aspect-[9/16] overflow-hidden relative cursor-pointer rounded group bg-slate-800/50"
                                onClick={() => handleReelClick(reel)}
                              >
                                {thumbnailUrl ? (
                                    <img
                                      src={thumbnailUrl}
                                      alt={reel.description || 'Reel kapağı'}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      loading="lazy"
                                      onError={(e) => { 
                                        e.target.onerror = null; 
                                        e.target.style.display = 'none';
                                        const parent = e.target.parentElement;
                                        if(parent) parent.innerHTML += '<div class="flex items-center justify-center h-full text-gray-500 text-xs">Kapak Yüklenemedi</div>';
                                      }}
                                    />
                                ) : (
                                     <div className="flex items-center justify-center h-full text-gray-500 text-xs">Kapak Yok</div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex flex-col items-center justify-center">
                                  <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-opacity duration-300 mb-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                  <span className="flex items-center text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                                    {reel.likes || 0}
                                  </span>
                                </div>
                              </div>
                            )
                           })
                          }
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <p className="text-gray-400 text-sm">Henüz reel yok.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "writings" && (
                    <div>
                      {textPosts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {textPosts.map((post) => (
                            <div
                              key={post.id}
                              className="p-4 rounded-xl bg-[rgba(20,24,36,0.7)] border border-[rgba(255,255,255,0.1)] backdrop-blur-lg cursor-pointer hover:bg-slate-800/50 transition-colors duration-200 shadow-sm"
                              onClick={() => handlePostClick(post)}
                            >
                              <p className="text-gray-300 text-sm leading-relaxed line-clamp-3 mb-3">{post.content}</p>
                              <div className="flex items-center justify-between text-gray-400 text-xs">
                                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                <div className="flex items-center space-x-3">
                                  <span className="flex items-center">
                                    <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                                    {post.likes || 0}
                                  </span>
                                  <span className="flex items-center">
                                    <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>
                                    {post.comments || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <p className="text-gray-400 text-sm">Henüz yazı yok.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "saved" && (
                    <div className="text-center py-16">
                      <p className="text-gray-400 text-sm">Bu özellik henüz kullanıma hazır değil.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 rounded-2xl bg-[rgba(20,24,36,0.7)] backdrop-blur-lg border border-[rgba(255,255,255,0.1)] shadow-xl">
                <p className="text-gray-400">Kullanıcı bulunamadı.</p>
              </div>
            )}
                    </div>

          <div className="hidden lg:block lg:w-1/5">
            {user && (
              <div className="space-y-4">
                <MiniReelsPlayer 
                  reels={isOwnProfile ? exploreReels : reels} 
                  user={user}
                  isExploreMode={isOwnProfile && exploreReels.length > 0} 
                />
                
                <div className="rounded-2xl overflow-hidden bg-[rgba(20,24,36,0.7)] backdrop-blur-lg border border-[rgba(255,255,255,0.1)] p-4">
                  <h3 className="text-gray-300 font-medium text-sm mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-1.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path>
                    </svg>
                    Benzer Hesaplar
                  </h3>
                  <div className="space-y-3">
                    <p className="text-gray-400 text-xs">Bu özellik yakında kullanıma sunulacak.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
