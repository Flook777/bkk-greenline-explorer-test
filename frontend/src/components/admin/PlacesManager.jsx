import React, { useState, useEffect, useCallback } from 'react';
import ConfirmationModal from '../shared/ConfirmationModal.jsx';
import Notification from '../shared/Notification.jsx';
import { PlaceForm } from './PlaceForm.jsx';
import ReviewsManager from './ReviewsManager.jsx';
import { API_URL } from '../../apiConfig.js';

function PlacesManager() {
    const [places, setPlaces] = useState([]);
    const [stations, setStations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notification, setNotification] = useState({ message: null, type: 'error' });
    const [editingPlace, setEditingPlace] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [placeToDelete, setPlaceToDelete] = useState(null);
    const [managingReviewsFor, setManagingReviewsFor] = useState(null);

    const showNotification = (message, type = 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: null, type: 'error' }), 5000);
    };

    const fetchInitialData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [placesRes, stationsRes] = await Promise.all([
                fetch(`${API_URL}/places`),
                fetch(`${API_URL}/stations`)
            ]);
            if (!placesRes.ok || !stationsRes.ok) throw new Error('Failed to fetch data');
            const placesData = await placesRes.json();
            const stationsData = await stationsRes.json();
            
            setPlaces(placesData.data || []);
            setStations(stationsData.data || []);
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    const handleDeleteClick = (id) => setPlaceToDelete(id);

    const confirmDelete = async () => {
        if (!placeToDelete) return;
        try {
            const response = await fetch(`${API_URL}/places/${placeToDelete}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete');
            showNotification('Place deleted successfully!', 'success');
            await fetchInitialData();
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setPlaceToDelete(null);
        }
    };

     const handleSave = async (placeData) => {
        const isUpdating = !!placeData.id;
        const url = isUpdating ? `${API_URL}/places/${placeData.id}` : `${API_URL}/places/add`;
        const method = isUpdating ? 'PUT' : 'POST';

        try {
            // ตรวจสอบข้อมูลก่อนส่ง
            if (!placeData.station_id) {
                throw new Error("Please select a station.");
            }

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(placeData),
            });

            const data = await response.json();

            if (!response.ok) {
                // แสดงข้อความ error ที่ได้จาก Backend
                throw new Error(data.error || 'Failed to save place.');
            }
            
            showNotification(`Place ${isUpdating ? 'updated' : 'added'} successfully!`, 'success');
            setEditingPlace(null);
            setIsAdding(false);
            await fetchInitialData();
        } catch (error) {
            console.error("Save Error:", error);
            showNotification(error.message, 'error');
        }
    };

    const handleEdit = (place) => {
        setEditingPlace(place);
        setIsAdding(false);
    };

    const handleManageReviews = (place) => setManagingReviewsFor(place);

    if (isLoading) return <p className="text-center p-10">Loading places...</p>;

    return (
        <div className="space-y-6">
            {placeToDelete && <ConfirmationModal message="Delete this place?" onConfirm={confirmDelete} onCancel={() => setPlaceToDelete(null)} />}
            
            {managingReviewsFor && (
                <ReviewsManager
                    place={managingReviewsFor}
                    onClose={() => setManagingReviewsFor(null)}
                    showNotification={showNotification}
                    onReviewChange={fetchInitialData} 
                />
            )}

            <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: null, type: 'error' })} />
            
            <div className="flex justify-end">
                <button onClick={() => { setIsAdding(true); setEditingPlace(null); }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg shadow">+ Add New Place</button>
            </div>

            {(isAdding || editingPlace) && (
                <PlaceForm 
                    place={editingPlace} 
                    onSave={handleSave} 
                    onCancel={() => { setIsAdding(false); setEditingPlace(null); }} 
                    isAdding={isAdding} 
                    stations={stations} 
                    showNotification={showNotification} 
                />
            )}

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full leading-normal">
                     <thead className="bg-gray-50">
                        <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Station ID</th>
                            <th className="px-6 py-3">Category</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                         {places.length > 0 ? places.map((place) => (
                            <tr key={place.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-900">{place.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{place.station_id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{place.category}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                    <button onClick={() => handleManageReviews(place)} className="text-green-600 hover:text-green-900">Reviews</button>
                                    <button onClick={() => handleEdit(place)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                    <button onClick={() => handleDeleteClick(place.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="4" className="px-6 py-4 text-center text-gray-500">No places found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default PlacesManager;