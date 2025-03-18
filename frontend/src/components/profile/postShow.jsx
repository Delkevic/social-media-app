import React from 'react';
import './postShow.css';

const PostShow = ({ post, onClose, isOpen }) => {
  if (!isOpen || !post) return null;

  // Function to handle image loading errors
  const handleImageError = (e) => {
    e.target.src = "https://via.placeholder.com/400x400?text=Image+Not+Available";
  };

  // Function to get full image URL
  const getFullImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }
    return imageUrl.startsWith("/") 
      ? `http://localhost:8080${imageUrl}` 
      : `http://localhost:8080/${imageUrl}`;
  };

  // Process images from different possible formats
  const getPostImages = () => {
    if (!post.images) return [];
    
    try {
      let imageData = post.images;
      if (typeof post.images === "string") {
        try {
          imageData = JSON.parse(post.images);
        } catch (e) {
          imageData = post.images;
        }
      }
      
      if (typeof imageData === "string") {
        return [imageData];
      } else if (Array.isArray(imageData)) {
        return imageData;
      } else if (typeof imageData === "object" && imageData !== null) {
        return Object.values(imageData);
      }
      return [];
    } catch (error) {
      console.error("Error processing images:", error);
      return [];
    }
  };
  
  const postImages = getPostImages();
  const hasImages = postImages.length > 0;
  
  return (
    <div className="post-modal-overlay" onClick={onClose}>
      <div className="post-modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="post-modal-body">
          {hasImages ? (
            <>
              <div className="post-modal-image">
                <img 
                  src={getFullImageUrl(postImages[0])} 
                  alt="Post content" 
                  onError={handleImageError}
                />
              </div>
              <div className="post-modal-details">
                <div className="post-user-info">
                  {post.user && (
                    <>
                      <img 
                        src={post.user.profileImage || "https://via.placeholder.com/40x40?text=User"} 
                        alt={post.user.username}
                        className="user-avatar"
                      />
                      <span className="username">{post.user.username}</span>
                    </>
                  )}
                </div>
                <div className="post-content-text">{post.content}</div>
                <div className="post-stats">
                  <span>{post.likes} beğeni</span>
                  <span>{post.comments} yorum</span>
                  <span>{post.createdAt}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="post-modal-text-only">
              <div className="post-user-info">
                {post.user && (
                  <>
                    <img 
                      src={post.user.profileImage || "https://via.placeholder.com/40x40?text=User"} 
                      alt={post.user.username}
                      className="user-avatar"
                    />
                    <span className="username">{post.user.username}</span>
                  </>
                )}
              </div>
              <div className="post-content-text">{post.content}</div>
              <div className="post-stats">
                <span>{post.likes} beğeni</span>
                <span>{post.comments} yorum</span>
                <span>{post.createdAt}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostShow;