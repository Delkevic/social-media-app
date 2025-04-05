import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/Profile.css";
import PostShow from "../components/profile/postShow";
import ReelShow from "../components/profile/ReelShow"; // Import the new ReelShow component
import RightPanel from "../components/home/RightPanel";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [imagePosts, setImagePosts] = useState([]); // Posts with images
  const [textPosts, setTextPosts] = useState([]); // Posts without images (text only)
  const [reels, setReels] = useState([]); // Added state for reels
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("posts"); // Add state for active tab
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    bio: "",
    location: "",
    website: "",
  });

  const [selectedPost, setSelectedPost] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReel, setSelectedReel] = useState(null); // Add state for selected reel
  const [isReelModalOpen, setIsReelModalOpen] = useState(false); // Add state for reel modal

  const navigate = useNavigate();
  const { username } = useParams(); // URL'den kullanıcı adını al

  useEffect(() => {
    // Session veya localStorage'dan mevcut kullanıcı bilgilerini al
    const storedUser =
      JSON.parse(sessionStorage.getItem("user")) ||
      JSON.parse(localStorage.getItem("user"));
    const token =
      sessionStorage.getItem("token") || localStorage.getItem("token");

    // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
    if (!storedUser || !token) {
      navigate("/login");
      return;
    }

    // Mevcut kullanıcı bilgilerini state'e kaydet
    setCurrentUser(storedUser);

    // URL'deki kullanıcı adı mevcut kullanıcının kullanıcı adına eşitse kendi profili
    setIsOwnProfile(username === storedUser.username);

    const fetchUserProfile = async () => {
      try {
        const response = await fetch(
          `http://localhost:8080/api/profile/${username}`,
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
        }
      } catch (error) {
        console.error("Profil yüklenirken hata oluştu:", error);
      } finally {
        setLoading(false);
      }
    };

    const verifyToken = async () => {
      try {
        const response = await fetch("http://localhost:8080/api/user", {
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
  }, [navigate, username, isOwnProfile]);

  // Effect to fetch reels when activeTab changes to "reels"
  useEffect(() => {
    if (activeTab === "reels" && user) {
      fetchUserReels();
    }
  }, [activeTab, user]);

  // Kullanıcının gönderilerini çek
  const fetchUserPosts = async (username, token) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/profile/${username}/posts`,
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
                console.error("Images parse hatası:", e);
                return false;
              }
            }
            return (
              postImages &&
              (Array.isArray(postImages)
                ? postImages.length > 0
                : Object.keys(postImages).length > 0)
            );
          });

          const withoutImages = data.data.posts.filter((post) => {
            let postImages = post.images;
            if (typeof post.images === "string") {
              try {
                postImages = JSON.parse(post.images);
              } catch (e) {
                return true;
              }
            }
            return (
              !postImages ||
              (Array.isArray(postImages)
                ? postImages.length === 0
                : Object.keys(postImages).length === 0)
            );
          });

          setImagePosts(withImages);
          setTextPosts(withoutImages);
        }
      }
    } catch (error) {
      console.error("Gönderiler yüklenirken hata oluştu:", error);
    }
  };

  // Kullanıcının reellerini çek
  const fetchUserReels = async () => {
    try {
      const token =
        sessionStorage.getItem("token") || localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        `http://localhost:8080/api/profile/${username}/reels`,
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
  };

  // Resim URL'sini düzenleyen yardımcı fonksiyon
  const getFullImageUrl = (imageUrl) => {
    if (!imageUrl) return null;

    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    if (imageUrl.startsWith("/")) {
      return `http://localhost:8080${imageUrl}`;
    } else {
      return `http://localhost:8080/${imageUrl}`;
    }
  };

  // Get video URL
  const getFullVideoUrl = (videoUrl) => {
    if (!videoUrl) return null;

    if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
      return videoUrl;
    }

    if (videoUrl.startsWith("/")) {
      return `http://localhost:8080${videoUrl}`;
    } else {
      return `http://localhost:8080/${videoUrl}`;
    }
  };

  // Form değişikliklerini işle
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value,
    });
  };

  // Profil düzenleme formunu gönder
  const handleSubmitEdit = async (e) => {
    e.preventDefault();

    const token =
      sessionStorage.getItem("token") || localStorage.getItem("token");

    try {
      const response = await fetch(`http://localhost:8080/api/user/profile`, {
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
      }
    } catch (error) {
      console.error("Profil güncellenirken hata oluştu:", error);
    }
  };

  const handlePostClick = (post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleReelClick = (reel) => {
    setSelectedReel(reel);
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

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--background-gradient)" }}
      >
        <div
          className="animate-spin h-12 w-12 border-4 rounded-full"
          style={{
            borderColor:
              "var(--accent-red) transparent transparent transparent",
          }}
        ></div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "var(--background-primary)" }}
    >
      <PostShow
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={closeModal}
        profileUser={user}
      />

      <ReelShow
        reel={selectedReel}
        reels={reels} // Pass all reels to allow navigation
        isOpen={isReelModalOpen}
        onClose={closeReelModal}
        profileUser={user}
      />

      <div className="container mx-auto px-4 flex justify-between">
        <div className="hidden lg:block lg:w-1/6"></div>

        <div className="w-full lg:w-3/5 xl:w-3/5 mx-auto">
          <div className="profile-container">
            <header className="profile-header">
              <div className="nav-links">
                <h2 onClick={() => navigate("/")} className="home-link">
                  Ana Sayfa
                </h2>
                {user && <span className="username">@{user.username}</span>}
              </div>
            </header>

            {user && (
              <>
                <section className="profile-info">
                  <div className="profile-top">
                    <div className="profile-image-container">
                      {user.profileImage ? (
                        <img
                          src={user.profileImage}
                          alt={user.username}
                          className="w-16 h-16 rounded-full object-cover border-4"
                          style={{ borderColor: "var(--background-card)" }}
                        />
                      ) : (
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center border-4"
                          style={{
                            backgroundColor: "var(--accent-red)",
                            borderColor: "var(--background-card)",
                          }}
                        >
                          <span
                            style={{
                              color: "white",
                              fontWeight: "bold",
                              fontSize: "1.5rem",
                            }}
                          >
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="profile-details">
                      <div className="profile-name-actions">
                        <h1 className="profile-name">
                          {user.fullName || user.username}
                        </h1>
                        {isOwnProfile && (
                          <button
                            className="edit-profile-btn"
                            onClick={() => setIsEditing(!isEditing)}
                          >
                            {isEditing ? "İptal" : "Profili Düzenle"}
                          </button>
                        )}
                      </div>

                      <div className="profile-stats">
                        <div className="stat-item">
                          <strong>{stats.posts}</strong> gönderi
                        </div>
                        <div className="stat-item">
                          <strong>{stats.followers}</strong> takipçi
                        </div>
                        <div className="stat-item">
                          <strong>{stats.following}</strong> takip
                        </div>
                      </div>

                      {!isEditing ? (
                        <div className="profile-bio-info">
                          {user.bio && <p className="bio">{user.bio}</p>}
                          {user.location && (
                            <p className="location">📍 {user.location}</p>
                          )}
                          {user.website && (
                            <p className="website">
                              🔗{" "}
                              <a
                                href={
                                  user.website.startsWith("http")
                                    ? user.website
                                    : `http://${user.website}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {user.website}
                              </a>
                            </p>
                          )}
                        </div>
                      ) : (
                        <form
                          onSubmit={handleSubmitEdit}
                          className="edit-profile-form"
                        >
                          <div className="form-group">
                            <label htmlFor="fullName">Ad Soyad</label>
                            <input
                              type="text"
                              id="fullName"
                              name="fullName"
                              value={editFormData.fullName}
                              onChange={handleFormChange}
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor="bio">Biyografi</label>
                            <textarea
                              id="bio"
                              name="bio"
                              value={editFormData.bio}
                              onChange={handleFormChange}
                              rows="3"
                            ></textarea>
                          </div>

                          <div className="form-group">
                            <label htmlFor="location">Konum</label>
                            <input
                              type="text"
                              id="location"
                              name="location"
                              value={editFormData.location}
                              onChange={handleFormChange}
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor="website">Website</label>
                            <input
                              type="text"
                              id="website"
                              name="website"
                              value={editFormData.website}
                              onChange={handleFormChange}
                            />
                          </div>

                          <button type="submit" className="save-profile-btn">
                            Kaydet
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </section>

                <section className="content-section">
                  <div className="tab-navigation">
                    <button
                      className={`tab-button ${
                        activeTab === "posts" ? "active" : ""
                      }`}
                      onClick={() => setActiveTab("posts")}
                    >
                      Gönderiler
                    </button>
                    <button
                      className={`tab-button ${
                        activeTab === "reels" ? "active" : ""
                      }`}
                      onClick={() => setActiveTab("reels")}
                    >
                      Reelsler
                    </button>
                    <button
                      className={`tab-button ${
                        activeTab === "writings" ? "active" : ""
                      }`}
                      onClick={() => setActiveTab("writings")}
                    >
                      Yazılar
                    </button>
                  </div>

                  <div className="content-display">
                    {activeTab === "posts" && (
                      <div className="user-posts">
                        <h2 className="section-title">Gönderiler</h2>

                        {imagePosts.length === 0 ? (
                          <div className="no-posts-message">
                            <p>Henüz resimli gönderi paylaşılmamış.</p>
                            {isOwnProfile && (
                              <button
                                onClick={() => navigate("/create-post")}
                                className="create-post-btn"
                              >
                                Gönderi Oluştur
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="posts-grid">
                            {imagePosts.map((post) => (
                              <div
                                key={post.id}
                                className="post-item"
                                onClick={() => handlePostClick(post)}
                              >
                                {post.images && (
                                  <div className="post-image">
                                    {(() => {
                                      try {
                                        let imageData = post.images;
                                        if (typeof post.images === "string") {
                                          try {
                                            imageData = JSON.parse(post.images);
                                          } catch (e) {
                                            imageData = post.images;
                                          }
                                        }

                                        let imageUrl;
                                        if (typeof imageData === "string") {
                                          imageUrl = imageData;
                                        } else if (Array.isArray(imageData)) {
                                          imageUrl = imageData[0];
                                        } else if (
                                          typeof imageData === "object" &&
                                          imageData !== null
                                        ) {
                                          imageUrl =
                                            Object.values(imageData)[0] || "";
                                        }

                                        const fullImageUrl =
                                          getFullImageUrl(imageUrl);

                                        return (
                                          <img
                                            src={fullImageUrl}
                                            alt="Post"
                                            className="post-thumbnail"
                                            onError={(e) => {
                                              console.error(
                                                "Resim yüklenemedi:",
                                                fullImageUrl
                                              );
                                              e.target.src =
                                                "https://via.placeholder.com/150?text=Resim+Yüklenemedi";
                                              e.target.alt =
                                                "Resim yüklenemedi";
                                            }}
                                          />
                                        );
                                      } catch (error) {
                                        console.error(
                                          "Resim işleme hatası:",
                                          error
                                        );
                                        return (
                                          <img
                                            src="https://via.placeholder.com/150?text=Resim+Hatası"
                                            alt="Hata"
                                            className="post-thumbnail"
                                          />
                                        );
                                      }
                                    })()}
                                  </div>
                                )}
                                <div className="post-content">
                                  {post.content}
                                </div>
                                <div className="post-meta">
                                  <span>{post.likes} beğeni</span>
                                  <span>{post.comments} yorum</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "reels" && (
                      <div className="user-reels">
                        <h2 className="section-title">Reelsler</h2>

                        {reels.length === 0 ? (
                          <div className="no-posts-message">
                            <p>Henüz reels paylaşılmamış.</p>
                            {isOwnProfile && (
                              <button
                                onClick={() => navigate("/reels")}
                                className="create-post-btn"
                              >
                                Reels Oluştur
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="posts-grid">
                            {reels.map((reel) => (
                              <div
                                key={reel.id}
                                className="post-item reel-item"
                                onClick={() => handleReelClick(reel)}
                              >
                                <div className="post-image reel-thumbnail">
                                  <video
                                    src={getFullVideoUrl(reel.videoURL)}
                                    className="post-thumbnail"
                                    preload="metadata"
                                  />
                                  <div className="reel-overlay">
                                    <svg
                                      className="reel-play-icon"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                    </svg>
                                  </div>
                                </div>
                                <div className="post-content">
                                  {reel.caption}
                                </div>
                                <div className="post-meta">
                                  <span>{reel.likeCount} beğeni</span>
                                  <span>{reel.commentCount} yorum</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "writings" && (
                      <div className="user-writings">
                        <h2 className="section-title">Yazılar</h2>

                        {textPosts.length === 0 ? (
                          <div className="no-posts-message">
                            <p>Henüz yazı paylaşılmamış.</p>
                            {isOwnProfile && (
                              <button
                                onClick={() => navigate("/create-post")}
                                className="create-post-btn"
                              >
                                Yazı Oluştur
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="posts-grid">
                            {textPosts.map((post) => (
                              <div
                                key={post.id}
                                className="post-item text-only"
                                onClick={() => handlePostClick(post)}
                              >
                                <div className="post-content">
                                  {post.content}
                                </div>
                                <div className="post-meta">
                                  <span>{post.likes} beğeni</span>
                                  <span>{post.comments} yorum</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        <div className="hidden lg:block lg:w-1/6 mt-10">
          <RightPanel user={currentUser} isProfilePage={true} />
        </div>
      </div>
    </div>
  );
};

export default Profile;
