import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../apiConfig.js'; // Use centralized config

export function PlaceForm({ place, stations, onSave, onCancel, isAdding, showNotification }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        station_id: '',
        category: '',
        image: '',
        openingHours: '', // Keep camelCase for internal state
        travelInfo: '',   // Keep camelCase for internal state
        phone: '',
        latitude: '',
        longitude: ''
    });
    const [googleMapsUrl, setGoogleMapsUrl] = useState('');
    const [contacts, setContacts] = useState([{ platform: '', url: '' }]);
    const [gallery, setGallery] = useState(['']);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (place) {
            setFormData({
                name: place.name || '',
                description: place.description || '',
                station_id: place.station_id || (stations.length > 0 ? stations[0].id : ''),
                category: place.category || '',
                image: place.image || '',
                openingHours: place.openingHours || '',
                travelInfo: place.travelInfo || '',
                phone: place.phone || '',
                latitude: place.location?.lat || '',
                longitude: place.location?.lng || ''
            });

            if (place.location?.lat && place.location?.lng) {
                setGoogleMapsUrl(`https://www.google.com/maps?q=${place.location.lat},${place.location.lng}`);
            } else {
                setGoogleMapsUrl('');
            }

            // Handle contact object -> array for form
            const placeContacts = place.contact ? Object.entries(place.contact).map(([platform, url]) => ({ platform, url })) : [];
            setContacts(placeContacts.length > 0 ? placeContacts : [{ platform: '', url: '' }]);
            
            const placeGallery = place.gallery && place.gallery.length > 0 ? place.gallery : [''];
            setGallery(placeGallery);

        } else {
            // Reset for new place form
            setFormData({
                name: '',
                description: '',
                station_id: stations.length > 0 ? stations[0].id : '',
                category: 'Restaurant',
                image: '',
                openingHours: '',
                travelInfo: '',
                phone: '',
                latitude: '',
                longitude: ''
            });
            setGoogleMapsUrl('');
            setContacts([{ platform: '', url: '' }]);
            setGallery(['']);
        }
    }, [place, stations]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleGoogleMapsUrlChange = (e) => {
        const url = e.target.value;
        setGoogleMapsUrl(url);
        // Extract lat/lng from Google Maps URL if possible
        // Example: https://www.google.com/maps?q=13.7563,100.5018
        // Or: https://www.google.com/maps/@13.7563,100.5018,15z
        const match = url.match(/@?(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) {
            setFormData(prev => ({
                ...prev,
                latitude: parseFloat(match[1]),
                longitude: parseFloat(match[2])
            }));
        }
    };
    
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('placeImage', file);
        setIsUploading(true);

        try {
            const res = await axios.post(`${API_URL}/upload`, uploadData);
            // Use the URL returned from the server
            setFormData(prev => ({ ...prev, image: res.data.imageUrl }));
            showNotification('Image uploaded successfully!', 'success');
        } catch (error) {
            console.error('Image upload failed:', error);
            showNotification('Image upload failed. Please try again.', 'error');
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleGalleryUpload = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const uploadData = new FormData();
        for (let i = 0; i < files.length; i++) {
            uploadData.append('galleryImages', files[i]);
        }
        
        setIsUploading(true);
        try {
            const res = await axios.post(`${API_URL}/upload-gallery`, uploadData);
             // Append new URLs to existing gallery
            setGallery(prev => [...prev.filter(url => url.trim() !== ''), ...res.data.imageUrls]);
            showNotification(`${files.length} image(s) uploaded successfully!`, 'success');
        } catch (error) {
            console.error('Gallery upload failed:', error);
            showNotification('Gallery upload failed. Please try again.', 'error');
        } finally {
            setIsUploading(false);
        }
    };


    // --- Contact Handlers ---
    const handleContactChange = (index, field, value) => {
        const newContacts = [...contacts];
        newContacts[index][field] = value;
        setContacts(newContacts);
    };
    const addContactField = () => setContacts([...contacts, { platform: '', url: '' }]);
    const removeContactField = (index) => setContacts(contacts.filter((_, i) => i !== index));

    // --- Gallery Handlers ---
    const handleGalleryChange = (index, value) => {
        const newGallery = [...gallery];
        newGallery[index] = value;
        setGallery(newGallery);
    };
    const addGalleryField = () => setGallery([...gallery, '']);
    const removeGalleryField = (index) => setGallery(gallery.filter((_, i) => i !== index));


    const handleSubmit = (e) => {
        e.preventDefault();

        // 1. Prepare Contact Object
        const finalContacts = contacts.reduce((acc, contact) => {
            if (contact.platform && contact.url) {
                acc[contact.platform] = contact.url;
            }
            return acc;
        }, {});

        // 2. Prepare Gallery Array
        const finalGallery = gallery.filter(url => url && url.trim() !== '');

        // 3. Construct the payload matching Backend expectations
        // Note: Backend expects simple JSON object structure now, since we upload images separately first.
        // However, if we were using FormData to send everything at once, we'd need to stringify objects.
        // The PlacesManager sends this as JSON (Content-Type: application/json), so we can send objects directly.
        
        const submissionData = {
            id: place?.id, // Include ID if editing
            name: formData.name,
            description: formData.description,
            station_id: formData.station_id,
            category: formData.category,
            image: formData.image, // This is the URL string from the separate upload
            openingHours: formData.openingHours, // Matches Backend's camelCase mapping expectation
            travelInfo: formData.travelInfo,     // Matches Backend's camelCase mapping expectation
            phone: formData.phone,
            latitude: formData.latitude,
            longitude: formData.longitude,
            contact: finalContacts, // Backend expects JSONB, passing object is fine with application/json
            gallery: finalGallery   // Backend expects JSONB, passing array is fine with application/json
        };

        onSave(submissionData);
    };
    
    return (
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8 border border-gray-200 text-gray-800">
            <h2 className="text-2xl font-bold mb-6">{isAdding ? 'Add New Place' : `Edit: ${place.name}`}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* --- Main Details --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">Place Name</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" required />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="station_id">Station</label>
                        <select name="station_id" id="station_id" value={formData.station_id} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" required>
                            {stations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                        </select>
                    </div>
                </div>

                {/* --- Image and Category --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">Category</label>
                        <input type="text" name="category" id="category" value={formData.category} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="image">Main Image</label>
                        {/* File Input for Upload */}
                        <input type="file" name="image" id="image" onChange={handleFileUpload} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                         {isUploading && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
                        {/* Show Preview if URL exists */}
                        {formData.image && !isUploading && (
                            <div className="mt-2">
                                <p className="text-xs text-gray-500 mb-1">Current Image URL: {formData.image}</p>
                                <img src={formData.image} alt="Preview" className="rounded-lg h-32 object-contain border border-gray-200 bg-gray-50" />
                            </div>
                        )}
                    </div>
                </div>

                {/* --- Additional Info --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="openingHours">Opening Hours</label>
                        <input type="text" name="openingHours" id="openingHours" value={formData.openingHours} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="e.g., Mon-Fri 09:00-18:00"/>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">Phone Number</label>
                        <input type="text" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                </div>
                 <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="travelInfo">Travel Info</label>
                    <input type="text" name="travelInfo" id="travelInfo" value={formData.travelInfo} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="e.g., Exit 3, 200m walk"/>
                </div>

                {/* --- Location --- */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="googleMapsUrl">Google Maps URL (Auto-fill Lat/Lng)</label>
                        <input type="url" name="googleMapsUrl" id="googleMapsUrl" value={googleMapsUrl} onChange={handleGoogleMapsUrlChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="Paste Google Maps URL here..."/>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="latitude">Latitude</label>
                        <input type="number" step="any" name="latitude" id="latitude" value={formData.latitude} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                    <div>
                         <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="longitude">Longitude</label>
                        <input type="number" step="any" name="longitude" id="longitude" value={formData.longitude} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                </div>
                
                {/* --- Description --- */}
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">Description</label>
                    <textarea name="description" id="description" value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" rows="4"></textarea>
                </div>

                {/* --- Dynamic Contacts --- */}
                <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Contact Channels</h3>
                    {contacts.map((contact, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2">
                            <input type="text" value={contact.platform} onChange={(e) => handleContactChange(index, 'platform', e.target.value)} placeholder="Platform (e.g., Facebook)" className="w-1/3 px-3 py-2 border rounded-lg"/>
                            <input type="url" value={contact.url} onChange={(e) => handleContactChange(index, 'url', e.target.value)} placeholder="URL" className="flex-1 px-3 py-2 border rounded-lg"/>
                            <button type="button" onClick={() => removeContactField(index)} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600">-</button>
                        </div>
                    ))}
                    <button type="button" onClick={addContactField} className="mt-2 text-sm bg-blue-100 text-blue-600 py-1 px-3 rounded-lg hover:bg-blue-200">+ Add Contact</button>
                </div>

                {/* --- Dynamic Gallery --- */}
                <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Image Gallery</h3>
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <label className="block text-gray-700 text-sm font-bold mb-2 cursor-pointer" htmlFor="gallery-upload">
                             📂 Click here to upload multiple gallery images
                        </label>
                        <input
                            type="file"
                            id="gallery-upload"
                            multiple
                            accept="image/*"
                            onChange={handleGalleryUpload}
                            className="hidden"
                        />
                         {isUploading && <p className="text-sm text-blue-500 mt-2 animate-pulse">Uploading gallery images...</p>}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                        {gallery.map((url, index) => (
                            url && (
                                <div key={index} className="relative group">
                                    <img src={url} alt={`Gallery ${index}`} className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                                    <button 
                                        type="button" 
                                        onClick={() => removeGalleryField(index)} 
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remove Image"
                                    >
                                        &times;
                                    </button>
                                </div>
                            )
                        ))}
                    </div>
                     <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-1">Or add by URL:</p>
                        <div className="flex gap-2">
                             <input type="url" placeholder="https://example.com/image.jpg" className="flex-1 px-3 py-2 border rounded-lg" onKeyDown={(e) => {
                                 if (e.key === 'Enter') {
                                     e.preventDefault();
                                     if(e.target.value) {
                                         setGallery([...gallery, e.target.value]);
                                         e.target.value = '';
                                     }
                                 }
                             }} />
                             <button type="button" className="bg-gray-200 px-4 rounded-lg text-gray-600" onClick={(e) => {
                                 const input = e.target.previousSibling;
                                 if(input.value) {
                                      setGallery([...gallery, input.value]);
                                      input.value = '';
                                 }
                             }}>Add</button>
                        </div>
                    </div>
                </div>

                {/* --- Action Buttons --- */}
                <div className="mt-8 flex justify-end gap-4 pt-6 border-t">
                    <button type="button" onClick={onCancel} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg transition-colors">Cancel</button>
                    <button type="submit" disabled={isUploading} className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isUploading ? 'Uploading...' : 'Save Place'}
                    </button>
                </div>
            </form>
        </div>
    );
}