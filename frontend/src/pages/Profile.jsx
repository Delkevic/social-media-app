import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Profile.css'; // You'll need to create this CSS file

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    bio: '',
    location: '',
    website: '',
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    // Session veya localStorage'dan kullanıcı bilgilerini al
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

    // Kullanıcı bilgilerini state'e kaydet
    setUser(storedUser);
    
    // Kullanıcı verilerini editForm için hazırla
    setEditFormData({
      fullName: storedUser.fullName || '',
      bio: storedUser.bio || '',
      location: storedUser.location || '',
      website: storedUser.website || '',
    });
    
    // Kullanıcı gönderilerini ve istatistiklerini çek
    fetchUserPosts(storedUser.id, token);
    fetchUserStats(storedUser.id, token);

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
        }
      } catch (error) {
        console.error("Token doğrulama hatası:", error);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [navigate]);

  // Kullanıcının gönderilerini çek
  const fetchUserPosts = async (userId, token) => {
    try {
      const response = await fetch(`http://localhost:8080/api/posts/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error("Gönderiler yüklenirken hata oluştu:", error);
    }
  };

  // Kullanıcı istatistiklerini çek
  const fetchUserStats = async (userId, token) => {
    try {
      const response = await fetch(`http://localhost:8080/api/users/${userId}/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Kullanıcı istatistikleri yüklenirken hata oluştu:", error);
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
    
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    
    try {
      const response = await fetch(`http://localhost:8080/api/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        
        // Güncellenen kullanıcı bilgilerini depolama alanına kaydet
        if (sessionStorage.getItem("user")) {
          sessionStorage.setItem("user", JSON.stringify(updatedUser));
        }
        if (localStorage.getItem("user")) {
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
        
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Profil güncellenirken hata oluştu:", error);
    }
  };
  
  if (loading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }

  return (
    <div className="profile-container">
      <header className="profile-header">
        <div className="nav-links">
          <h2 onClick={() => navigate("/")} className="home-link">Ana Sayfa</h2>
          {user && <span className="username">@{user.username}</span>}
        </div>
      </header>
      
      {user && (
        <>
          <section className="profile-info">
            <div className="profile-top">
              <div className="profile-image-container">
                <img 
                  src={user.profileImage || "https://via.placeholder.com/150"} 
                  alt={`${user.username}'s profile`} 
                  className="profile-image"
                />
              </div>
              
              <div className="profile-details">
                <div className="profile-name-actions">
                  <h1 className="profile-name">{user.fullName || user.username}</h1>
                  <button 
                    className="edit-profile-btn"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? "İptal" : "Profili Düzenle"}
                  </button>
                </div>
                
                <div className="profile-stats">
                  <div className="stat-item"><strong>{stats.posts}</strong> gönderi</div>
                  <div className="stat-item"><strong>{stats.followers}</strong> takipçi</div>
                  <div className="stat-item"><strong>{stats.following}</strong> takip</div>
                </div>
                
                {!isEditing ? (
                  <div className="profile-bio-info">
                    {user.bio && <p className="bio">{user.bio}</p>}
                    {user.location && <p className="location">📍 {user.location}</p>}
                    {user.website && (
                      <p className="website">
                        🔗 <a href={user.website.startsWith('http') ? user.website : `http://${user.website}`} 
                              target="_blank" 
                              rel="noopener noreferrer">
                          {user.website}
                        </a>
                      </p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSubmitEdit} className="edit-profile-form">
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
                    
                    <button type="submit" className="save-profile-btn">Kaydet</button>
                  </form>
                )}
              </div>
            </div>
          </section>
          
          <section className="user-posts">
            <h2 className="section-title">Gönderiler</h2>
            
            {posts.length === 0 ? (
              <div className="no-posts-message">
                <p>Henüz gönderi paylaşılmamış.</p>
                <button onClick={() => navigate("/create-post")} className="create-post-btn">
                  Gönderi Oluştur
                </button>
              </div>
            ) : (
              <div className="posts-grid">
                {posts.map(post => (
                  <div key={post.id} className="post-item" onClick={() => navigate(`/post/${post.id}`)}>
                    <div className="post-content">{post.content}</div>
                    <div className="post-meta">
                      <span>{post.likeCount} beğeni</span>
                      <span>{post.commentCount} yorum</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default Profile;
