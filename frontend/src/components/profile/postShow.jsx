import React, { useState } from 'react';
import './postShow.css';

const PostShow = ({ post, onClose, isOpen, profileUser }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
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
  
  // Create a function to render the user profile image
  const renderUserProfileImage = () => {
    // Use profileUser information if available
    if (profileUser && profileUser.profileImage) {
      return <img 
        src={profileUser.profileImage} 
        alt={profileUser.username}
        className="user-avatar"
      />;
    }
    
    // Fallback to post.user if needed
    if (post.user && post.user.profileImage) {
      return <img 
        src={post.user.profileImage} 
        alt={post.user.username}
        className="user-avatar"
      />;
    }
    
    // Default avatar if no profile image is available
    return <div className="user-avatar-placeholder">
      {(profileUser?.username || post.user?.username || "?").charAt(0).toUpperCase()}
    </div>;
  };
  
  // Get the username from profileUser or post.user
  const username = profileUser?.username || (post.user && post.user.username) || "Unknown User";
  
  return (
    <div className="post-modal-overlay" onClick={onClose}>
      <div className="post-modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="post-modal-body">
          {hasImages ? (
            <>
              <div className="post-modal-image">
                <div 
                  className="image-slider-container"
                  style={{
                    transform: `translateX(-${currentImageIndex * 100}%)`,
                  }}
                >
                  {postImages.map((image, index) => (
                    <div key={index} className="image-slide">
                      <img 
                        src={getFullImageUrl(image)} 
                        alt={`Post content ${index + 1}`} 
                        onError={handleImageError}
                      />
                    </div>
                  ))}
                </div>
                
                {/* Left navigation button */}
                {currentImageIndex > 0 && (
                  <button
                    className="image-nav-button left-nav"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(prev => prev - 1);
                    }}
                  >
                    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                
                {/* Right navigation button */}
                {postImages.length > 1 && currentImageIndex < postImages.length - 1 && (
                  <button
                    className="image-nav-button right-nav"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(prev => prev + 1);
                    }}
                  >
                    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="post-modal-details">
                <div className="post-user-info">
                  {renderUserProfileImage()}
                  <span className="username">{username}</span>
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
                {renderUserProfileImage()}
                <span className="username">{username}</span>
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