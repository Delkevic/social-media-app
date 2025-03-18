// Yorum beğenme/beğenmeme
export const toggleLike = async (commentId) => {
    try {
        console.log('Yorum beğenme isteği gönderiliyor:', `/api/comments/${commentId}/like`);
        const response = await fetchWithAuth(`/api/comments/${commentId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Beğeni işlemi başarısız oldu');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Yorum beğenme hatası:', error);
        throw error;
    }
}; 