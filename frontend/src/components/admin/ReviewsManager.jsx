import React, { useState, useEffect, useCallback } from 'react';
import { ConfirmationModal } from '../shared/ConfirmationModal.jsx';
import { API_URL } from '../../apiConfig.js'; // Import the centralized API URL

const ReviewsManager = ({ place, onClose, showNotification, onReviewChange }) => {
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [reviewToDelete, setReviewToDelete] = useState(null);

    const fetchReviews = useCallback(async () => {
        if (!place) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/reviews/place/${place.id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch reviews.');
            }
            const data = await response.json();
            setReviews(data.data || []);
        } catch (error) {
            console.error("Error fetching reviews:", error);
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [place, showNotification]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const handleDeleteClick = (reviewId) => {
        setReviewToDelete(reviewId);
    };

    const confirmDelete = async () => {
        if (!reviewToDelete) return;
        try {
            const response = await fetch(`${API_URL}/reviews/${reviewToDelete}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ error: 'Failed to delete review.' }));
                throw new Error(errorData.error || 'Failed to delete review.');
            }
            showNotification('Review deleted successfully!', 'success');
            setReviewToDelete(null);
            onReviewChange(); // แจ้งให้ Parent component ดึงข้อมูลใหม่
            onClose(); // ปิด Modal หลังจากลบสำเร็จ
        } catch (error) {
            console.error("Error deleting review:", error);
            showNotification(error.message, 'error');
            setReviewToDelete(null);
        }
    };

    return (
        <>
            {reviewToDelete && (
                <ConfirmationModal
                    message="Are you sure you want to delete this review?"
                    onConfirm={confirmDelete}
                    onCancel={() => setReviewToDelete(null)}
                />
            )}
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" onClick={onClose}>
                <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl mx-4 text-gray-800" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4 pb-4 border-b">
                        <h2 className="text-2xl font-bold">Manage Reviews for "{place.name}"</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl font-light">&times;</button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto pr-4">
                        {isLoading ? (
                            <p>Loading reviews...</p>
                        ) : reviews.length > 0 ? (
                            <ul className="space-y-4">
                                {reviews.map(review => (
                                    <li key={review.id} className="border p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center mb-1">
                                                    <p className="font-semibold mr-3 text-gray-900">{review.user}</p>
                                                    <div className="flex text-yellow-400">
                                                        {[...Array(5)].map((_, i) => (
                                                            <span key={i} className="text-lg">{i < review.rating ? '★' : '☆'}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className="text-gray-600">{review.comment}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteClick(review.id)} 
                                                className="bg-red-500 text-white py-1 px-3 rounded-lg hover:bg-red-600 text-sm transition-colors">
                                                Delete
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-500 py-8">No reviews found for this place.</p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ReviewsManager;
