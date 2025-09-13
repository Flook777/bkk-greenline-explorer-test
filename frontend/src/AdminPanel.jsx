import React, { useState, useEffect } from 'react';

// --- Configuration ---
const API_BASE_URL = 'http://localhost:3001/api';

// --- Helper Functions ---
const safeJsonParse = (data, fallback = null) => {
    if (typeof data !== 'string' || !data) return fallback;
    try {
        const parsed = JSON.parse(data);
        if (parsed === null) {
            return fallback;
        }
        if (Object.keys(parsed).length === 0 && fallback !== null && Array.isArray(fallback)) {
            return fallback;
        }
        return parsed;
    } catch (e) {
        console.error('Failed to parse JSON:', data, e);
        return fallback;
    }
};


// --- Reusable Components ---
const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl text-center w-full max-w-sm mx-4">
            <p className="mb-4 text-gray-800">{message}</p>
            <div className="flex justify-center gap-4">
                <button onClick={onCancel} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                <button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Confirm</button>
            </div>
        </div>
    </div>
);

const Notification = ({ message, type = 'error', onClose }) => {
    if (!message) return null;
    const typeClasses = type === 'error'
        ? 'bg-red-100 border-l-4 border-red-500 text-red-700'
        : 'bg-green-100 border-l-4 border-green-500 text-green-700';
    return (
        <div className={`p-4 mb-4 rounded-lg shadow-md relative animate-fade-in-down ${typeClasses}`} role="alert">
            <span className="block sm:inline">{message}</span>
            <button onClick={onClose} className="absolute top-0 bottom-0 right-0 px-4 py-3">
                <svg className="fill-current h-6 w-6" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" /></svg>
            </button>
        </div>
    );
};

// --- Main Admin Panel Component ---
function AdminPanel() {
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

            if (!placesRes.ok || !stationsRes.ok) {
                const errorText = !placesRes.ok ? await placesRes.text() : await stationsRes.text();
                throw new Error(`Failed to fetch initial data: ${errorText}`);
            }

            const placesData = await placesRes.json();
            const stationsData = await stationsRes.json();

            setPlaces(Array.isArray(placesData.data) ? placesData.data : []);
            setStations(Array.isArray(stationsData.data) ? stationsData.data : []);

        } catch (error) {
            console.error("Fetch Error:", error);
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleDeleteClick = (id) => setPlaceToDelete(id);

    const confirmDelete = async () => {
        if (!placeToDelete) return;
        try {
            const response = await fetch(`${API_BASE_URL}/places/${placeToDelete}`, { method: 'DELETE' });
             if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to delete place' }));
                throw new Error(errorData.error);
            }
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
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                     throw new Error(errorData.error || 'Failed to save place.');
                } catch (e) {
                    throw new Error(`Server returned a non-JSON error: ${errorText.substring(0, 100)}`);
                }
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
    
    const handleAddNew = () => {
      setEditingPlace(null);
      setIsAdding(true);
    };

    const handleCancel = () => {
        setEditingPlace(null);
        setIsAdding(false);
    };

    if (isLoading) {
        return <div className="text-center text-2xl text-gray-700 mt-16">Loading Admin Panel...</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
            {placeToDelete && <ConfirmationModal message="Are you sure you want to delete this place?" onConfirm={confirmDelete} onCancel={() => setPlaceToDelete(null)} />}
            <header className="flex justify-between items-center mb-6 pb-4 border-b">
                <h1 className="text-3xl font-bold text-gray-800">Places Management</h1>
                <a href="/" className="text-indigo-600 hover:text-indigo-800 hover:underline transition-colors">← Back to Main Site</a>
            </header>
            <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: null, type: 'error' })} />
            <div className="flex justify-end mb-4">
                <button onClick={handleAddNew} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-px">+ Add New Place</button>
            </div>
            {(isAdding || editingPlace) && (
                <PlaceForm place={editingPlace} onSave={handleSave} onCancel={handleCancel} isAdding={isAdding} stations={stations} showNotification={showNotification} />
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
                            <tr><td colSpan="4" className="text-center py-10 text-gray-500">No places found. Click "Add New Place" to get started.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function PlaceForm({ place, onSave, onCancel, isAdding, stations, showNotification }) {
    const initialFormState = {
        id: null, name: '', description: '', station_id: stations.length > 0 ? stations[0].id : '', 
        category: 'Restaurant', latitude: '', longitude: '', image: '', openingHours: '', 
        travelInfo: '', phone: '', gallery: ''
    };
    
    const [formData, setFormData] = useState(initialFormState);
    const [googleMapsUrl, setGoogleMapsUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const [contacts, setContacts] = useState([{ platform: '', url: '' }]);
    const [events, setEvents] = useState([{ date: '', title: '' }]);

    useEffect(() => {
        if (place) {
            const location = safeJsonParse(place.location, { lat: '', lng: '' });
            const contactObj = safeJsonParse(place.contact, {});
            const contactArr = Object.entries(contactObj).map(([platform, url]) => ({ platform, url }));
            const eventsArr = safeJsonParse(place.events, []);

            setFormData({
                ...initialFormState,
                ...place,
                latitude: location.lat || '',
                longitude: location.lng || '',
                gallery: (safeJsonParse(place.gallery, [])).join(', '),
            });
            
            setContacts(contactArr.length > 0 ? contactArr : [{ platform: '', url: '' }]);
            setEvents(eventsArr.length > 0 ? eventsArr : [{ date: '', title: '' }]);

            if (location.lat && location.lng) {
                setGoogleMapsUrl(`https://www.google.com/maps/?q=${location.lat},${location.lng}`);
            }
        } else {
            setFormData(initialFormState);
            setGoogleMapsUrl('');
            setContacts([{ platform: '', url: '' }]);
            setEvents([{ date: '', title: '' }]);
        }
    }, [place, isAdding, stations]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleContactChange = (index, field, value) => {
        const newContacts = [...contacts];
        newContacts[index][field] = value;
        setContacts(newContacts);
    };

    const addContactField = () => setContacts([...contacts, { platform: '', url: '' }]);
    const removeContactField = (index) => setContacts(contacts.filter((_, i) => i !== index));

    const handleEventChange = (index, field, value) => {
        const newEvents = [...events];
        newEvents[index][field] = value;
        setEvents(newEvents);
    };
    
    const addEventField = () => setEvents([...events, { date: '', title: '' }]);
    const removeEventField = (index) => setEvents(events.filter((_, i) => i !== index));

    const handleGoogleMapsChange = (e) => {
        const url = e.target.value;
        setGoogleMapsUrl(url);
        const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) {
            setFormData(prev => ({ ...prev, latitude: parseFloat(match[1]), longitude: parseFloat(match[2]) }));
        }
    };

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let finalData = { ...formData };

        if (selectedFile) {
            setIsUploading(true);
            const uploadFormData = new FormData();
            uploadFormData.append('placeImage', selectedFile);
            try {
                const response = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: uploadFormData });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Image upload failed');
                finalData.image = result.imageUrl;
            } catch (error) {
                showNotification(error.message, 'error');
                setIsUploading(false);
                return;
            } finally {
                setIsUploading(false);
            }
        }
        
        const contactObj = contacts.reduce((acc, { platform, url }) => {
            if (platform && url) acc[platform] = url;
            return acc;
        }, {});
        finalData.contact = JSON.stringify(contactObj);
        
        const validEvents = events.filter(ev => ev.date && ev.title);
        finalData.events = JSON.stringify(validEvents);

        finalData.gallery = JSON.stringify(finalData.gallery.split(',').map(s => s.trim()).filter(Boolean));

        onSave(finalData);
    };
    
    const formTitle = isAdding || !place ? 'Add New Place' : `Edit: ${place.name}`;

    return (
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8 border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">{formTitle}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">Name</label>
                        <input type="text" name="name" id="name" value={formData.name || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" required />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="station_id">Station</label>
                        <select name="station_id" id="station_id" value={formData.station_id || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" required>
                            {stations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">Category</label>
                        <select name="category" id="category" value={formData.category || 'Restaurant'} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
                            <option>Restaurant</option> <option>Cafe</option> <option>Shopping</option> <option>Attraction</option> <option>Park</option> <option>Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">Phone</label>
                        <input type="text" name="phone" id="phone" value={formData.phone || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                     <div className="md:col-span-2">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="openingHours">Opening Hours</label>
                        <input type="text" name="openingHours" id="openingHours" value={formData.openingHours || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                </div>

                <div>
                     <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="googleMapsUrl">Google Maps Link</label>
                     <input type="text" id="googleMapsUrl" placeholder="Paste Google Maps URL here to auto-fill coordinates" value={googleMapsUrl} onChange={handleGoogleMapsChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                     <div className="flex gap-4 mt-2">
                        <input type="number" step="any" name="latitude" placeholder="Latitude" value={formData.latitude || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-100 focus:outline-none" readOnly/>
                        <input type="number" step="any" name="longitude" placeholder="Longitude" value={formData.longitude || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-100 focus:outline-none" readOnly/>
                     </div>
                </div>

                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">Description</label>
                    <textarea name="description" id="description" value={formData.description || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" rows="3"></textarea>
                </div>
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="travelInfo">Travel Info</label>
                    <textarea name="travelInfo" id="travelInfo" value={formData.travelInfo || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" rows="2"></textarea>
                </div>

                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">Main Image</label>
                    <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                        <div>
                            <label className="block text-gray-600 text-xs font-bold mb-2" htmlFor="image">By URL</label>
                            <input type="text" name="image" id="image" placeholder="https://example.com/image.jpg" value={formData.image || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        </div>
                        <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div><div className="relative flex justify-center"><span className="px-2 bg-gray-50 text-sm text-gray-500">OR</span></div></div>
                        <div>
                            <label className="block text-gray-600 text-xs font-bold mb-2" htmlFor="imageFile">By Upload</label>
                            <input type="file" name="imageFile" id="imageFile" onChange={handleFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 cursor-pointer"/>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="gallery">Gallery URLs (คั่นด้วย comma)</label>
                    <textarea name="gallery" id="gallery" placeholder="url1.jpg, url2.jpg, ..." value={formData.gallery || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" rows="3"></textarea>
                </div>

                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">Contact</label>
                    <div className="space-y-2 p-4 border rounded-lg bg-gray-50">
                        {contacts.map((contact, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input type="text" placeholder="Platform (e.g., Website)" value={contact.platform} onChange={(e) => handleContactChange(index, 'platform', e.target.value)} className="w-1/3 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                <input type="text" placeholder="URL" value={contact.url} onChange={(e) => handleContactChange(index, 'url', e.target.value)} className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                <button type="button" onClick={() => removeContactField(index)} className="bg-red-500 text-white rounded-full p-2 h-8 w-8 flex items-center justify-center hover:bg-red-600">-</button>
                            </div>
                        ))}
                        <button type="button" onClick={addContactField} className="mt-2 text-indigo-600 hover:text-indigo-800 font-semibold text-sm">+ Add Contact</button>
                    </div>
                </div>

                 <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">Events</label>
                    <div className="space-y-2 p-4 border rounded-lg bg-gray-50">
                        {events.map((event, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input type="text" placeholder="Date" value={event.date} onChange={(e) => handleEventChange(index, 'date', e.target.value)} className="w-1/3 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                <input type="text" placeholder="Title" value={event.title} onChange={(e) => handleEventChange(index, 'title', e.target.value)} className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                <button type="button" onClick={() => removeEventField(index)} className="bg-red-500 text-white rounded-full p-2 h-8 w-8 flex items-center justify-center hover:bg-red-600">-</button>
                            </div>
                        ))}
                        <button type="button" onClick={addEventField} className="mt-2 text-indigo-600 hover:text-indigo-800 font-semibold text-sm">+ Add Event</button>
                    </div>
                </div>


                <div className="mt-6 flex justify-end gap-4">
                    <button type="button" onClick={onCancel} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Cancel</button>
                    <button type="submit" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg" disabled={isUploading}>
                        {isUploading ? 'Uploading...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AdminPanel;

