import React from 'react';
import PostItem from './PostItem';

const PostList = ({ posts, onLike, onSave, onDelete, currentUser }) => {
  if (posts.length === 0) {
    return (
      <div 
        className="rounded-2xl p-8 text-center"
        style={{
          backgroundColor: 'var(--background-card)',
          backdropFilter: 'var(--backdrop-blur)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <svg 
          className="w-16 h-16 mx-auto mb-4"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <path
            fillRule="evenodd"
            d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z"
            clipRule="evenodd"
          ></path>
          <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z"></path>
        </svg>
        <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
          Henüz gönderi yok
        </h3>
        <p className="mt-2" style={{ color: 'var(--text-tertiary)' }}>
          İlk gönderiyi paylaşan sen ol!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <PostItem
          key={post.id}
          post={post}
          onLike={onLike}
          onSave={onSave}
          onDelete={onDelete}
          currentUser={currentUser}
        />
      ))}
    </div>
  );
};

export default PostList;