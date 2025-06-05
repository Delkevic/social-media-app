import React from 'react';
import PostItem from './PostItem';

const PostList = ({ posts, onLike, onSave, onDelete, currentUser, onPostClick }) => {
  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-[#0affd9]/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#0affd9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white">Henüz gönderi yok</h3>
        <p className="mt-2 text-gray-400">Takip ettiğin kişiler gönderi paylaştıklarında burada görünecek</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map(post => (
        <PostItem 
          key={post.id} 
          post={post} 
          onLike={onLike} 
          onSave={onSave} 
          onDelete={onDelete}
          currentUser={currentUser}
          onPostClick={onPostClick}
        />
      ))}
    </div>
  );
};

export default PostList;