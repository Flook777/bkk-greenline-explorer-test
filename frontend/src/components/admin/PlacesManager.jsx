import React, { useState, useEffect } from 'react';
// **จุดที่แก้ไข:** เปลี่ยนเป็น Named Import (ใช้วงเล็บปีกกา)
import { ConfirmationModal } from '../shared/ConfirmationModal';
import { Notification } from '../shared/Notification';
import { PlaceForm } from './PlaceForm';

const API_BASE_URL = 'http://localhost:3001/api';

export function PlacesManager() {
    const [places, setPlaces] = useState([]);
    const [stations, setStations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notification, setNotification] = useState({ message: null, type: 'error' });
    const [editingPlace, setEditingPlace] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [placeToDelete, setPlaceToDelete] = useState(null);

    const showNotification = (message, type = 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: null, type: 'error' }), 5000);
    };

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [placesRes, stationsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/places`),
                fetch(`${API_BASE_URL}/stations`)
            ]);
            if (!placesRes.ok || !stationsRes.ok) throw new Error('Failed to fetch places or stations data');
            const placesData = await placesRes.json();
            const stationsData = await stationsRes.json();
            setPlaces(placesData.data || []);
            setStations(stationsData.data || []);
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => { fetchInitialData(); }, []);

    const handleDeleteClick = (id) => setPlaceToDelete(id);

    const confirmDelete = async () => {
        if (!placeToDelete) return;
        try {
            const response = await fetch(`${API_BASE_URL}/places/${placeToDelete}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete place.');
            showNotification('Place deleted successfully!', 'success');
            fetchInitialData();
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setPlaceToDelete(null);
        }
    };

     const handleSave = async (placeData) => {
        const isUpdating = !!placeData.id;
        const url = isUpdating ? `${API_BASE_URL}/places/${placeData.id}` : `${API_BASE_URL}/places/add`;
        const method = isUpdating ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(placeData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save place.');
            }
            
            showNotification(`Place ${isUpdating ? 'updated' : 'added'} successfully!`, 'success');
            setEditingPlace(null);
            setIsAdding(false);
            fetchInitialData();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };

    const handleEdit = (place) => {
        setEditingPlace(place);
        setIsAdding(false);
    };

    if (isLoading) return <p>Loading places...</p>;

    return (
        <div>
            {placeToDelete && <ConfirmationModal message="Are you sure you want to delete this place?" onConfirm={confirmDelete} onCancel={() => setPlaceToDelete(null)} />}
            <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: null, type: 'error' })} />
            
            <div className="flex justify-end mb-4">
                <button onClick={() => { setIsAdding(true); setEditingPlace(null); }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-px">+ Add New Place</button>
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

            <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
                <table className="min-w-full leading-normal">
                     <thead className="bg-gray-100">
                        <tr className="text-left text-gray-600 uppercase text-sm">
                            <th className="py-3 px-5 font-semibold">Name</th>
                            <th className="py-3 px-5 font-semibold">Station ID</th>
                            <th className="py-3 px-5 font-semibold">Category</th>
                            <th className="py-3 px-5 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                         {places.length > 0 ? places.map((place) => (
                            <tr key={place.id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="py-4 px-5">{place.name}</td>
                                <td className="py-4 px-5">{place.station_id}</td>
                                <td className="py-4 px-5">{place.category}</td>
                                <td className="py-4 px-5 text-right">
                                    <button onClick={() => handleEdit(place)} className="text-blue-600 hover:text-blue-900 mr-4 font-semibold">Edit</button>
                                    <button onClick={() => handleDeleteClick(place.id)} className="text-red-600 hover:text-red-900 font-semibold">Delete</button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="4" className="text-center py-10 text-gray-500">No places found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default PlacesManager;

