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
        opening_hours: '',
        travelinfo: '', // Corrected from travelInfo
        phone: '',
        latitude: '',
        longitude: ''
    });
    const [googleMapsUrl, setGoogleMapsUrl] = useState('');
    const [contacts, setContacts] = useState([{ platform: '', url: '' }]);
    const [gallery, setGallery] = useState(['']);
    const [isUploading, setIsUploading] = useState(false);
    
    // States to hold the actual file objects
    const [imageFile, setImageFile] = useState(null);
    const [galleryFiles, setGalleryFiles] = useState([]);


    useEffect(() => {
        if (place) {
            setFormData({
                name: place.name || '',
                description: place.description || '',
                station_id: place.station_id || (stations.length > 0 ? stations[0].id : ''),
                category: place.category || '',
                image: place.image_url || '', // Use image_url from backend
                opening_hours: place.opening_hours || '',
                travelinfo: place.travelinfo || '', // Corrected from travelInfo
                phone: place.phone || '',
                latitude: place.location?.lat || '',
                longitude: place.location?.lng || ''
            });

            if (place.location?.lat && place.location?.lng) {
                setGoogleMapsUrl(`https://www.google.com/maps?q=${place.location.lat},${place.location.lng}`);
            } else {
                setGoogleMapsUrl('');
            }

            const placeContacts = place.contact ? Object.entries(place.contact).map(([platform, url]) => ({ platform, url })) : [];
            setContacts(placeContacts.length > 0 ? placeContacts : [{ platform: '', url: '' }]);
            
            const placeGallery = place.gallery && place.gallery.length > 0 ? place.gallery : [''];
            setGallery(placeGallery);
            
            // Clear file inputs on edit
            setImageFile(null);
            setGalleryFiles([]);

        } else {
            // Reset for new place form
            setFormData({
                name: '',
                description: '',
                station_id: stations.length > 0 ? stations[0].id : '',
                category: 'Restaurant',
                image: '',
                opening_hours: '',
                travelinfo: '', // Corrected from travelInfo
                phone: '',
                latitude: '',
                longitude: ''
            });
            setGoogleMapsUrl('');
            setContacts([{ platform: '', url: '' }]);
            setGallery(['']);
            setImageFile(null);
            setGalleryFiles([]);
        }
    }, [place, stations]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleGoogleMapsUrlChange = (e) => {
        const url = e.target.value;
        setGoogleMapsUrl(url);
        const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) {
            setFormData(prev => ({
                ...prev,
                latitude: parseFloat(match[1]),
                longitude: parseFloat(match[2])
            }));
        }
    };
    
    // Store the selected file in state
    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setImageFile(e.target.files[0]);
            // Optional: show a preview of the new image
            setFormData(prev => ({...prev, image: URL.createObjectURL(e.target.files[0])}));
        }
    };
    
    // Store gallery files in state
    const handleGalleryFilesChange = (e) => {
        setGalleryFiles([...e.target.files]);
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
        
        // Use FormData to send both files and text
        const submissionData = new FormData();

        // Append all form text data
        for (const key in formData) {
             // Don't append the old image URL if a new file is selected
            if (key === 'image' && imageFile) continue;
            submissionData.append(key, formData[key]);
        }
        
        // Append contact and gallery JSON
        submissionData.append('contact', JSON.stringify(contacts.reduce((acc, contact) => {
            if (contact.platform && contact.url) acc[contact.platform] = contact.url;
            return acc;
        }, {})));
        submissionData.append('gallery', JSON.stringify(gallery.filter(url => url && url.trim() !== '')));

        // Append the new main image file if it exists
        if (imageFile) {
            submissionData.append('image', imageFile);
        }

        // Append new gallery image files if they exist
        if (galleryFiles.length > 0) {
            galleryFiles.forEach(file => {
                submissionData.append('gallery', file);
            });
        }
        
        onSave(submissionData, place?.id);
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
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="image-upload">Main Image</label>
                        <input type="file" name="image" id="image-upload" onChange={handleFileChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                        {isUploading && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
                        {formData.image && <img src={formData.image} alt="Preview" className="mt-2 rounded-lg h-24 object-contain border border-gray-200" />}
                    </div>
                </div>

                {/* --- Additional Info --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="opening_hours">Opening Hours</label>
                        <input type="text" name="opening_hours" id="opening_hours" value={formData.opening_hours} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="e.g., Mon-Fri 09:00-18:00"/>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">Phone Number</label>
                        <input type="text" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                </div>
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="travelinfo">Travel Info</label>
                    <input type="text" name="travelinfo" id="travelinfo" value={formData.travelinfo} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="e.g., Exit 3, 200m walk"/>
                </div>

                {/* --- Location --- */}
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="googleMapsUrl">Google Maps URL</label>
                    <input type="url" name="googleMapsUrl" id="googleMapsUrl" value={googleMapsUrl} onChange={handleGoogleMapsUrlChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="Paste Google Maps URL here..."/>
                </div>
                
                {/* --- Description --- */}
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">Description</label>
                    <textarea name="description" id="description" value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" rows="4"></textarea>
                </div>

                {/* --- Dynamic Contacts --- */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Contact Channels</h3>
                    {contacts.map((contact, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2">
                            <input type="text" value={contact.platform} onChange={(e) => handleContactChange(index, 'platform', e.target.value)} placeholder="Platform (e.g., Facebook)" className="w-1/3 px-3 py-2 border rounded-lg"/>
                            <input type="url" value={contact.url} onChange={(e) => handleContactChange(index, 'url', e.target.value)} placeholder="URL" className="flex-1 px-3 py-2 border rounded-lg"/>
                            <button type="button" onClick={() => removeContactField(index)} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600">-</button>
                        </div>
                    ))}
                    <button type="button" onClick={addContactField} className="bg-blue-500 text-white py-1 px-3 rounded-lg hover:bg-blue-600">+ Add Contact</button>
                </div>

                {/* --- Dynamic Gallery --- */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Image Gallery</h3>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="gallery-upload">
                            Upload Images
                        </label>
                        <input
                            type="file"
                            id="gallery-upload"
                            multiple
                            accept="image/*"
                            onChange={handleGalleryFilesChange}
                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                    </div>
                    
                    <h4 className="text-md font-semibold text-gray-600 mb-2">Or add by URL</h4>
                    {gallery.map((url, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2">
                            <input type="url" value={url} onChange={(e) => handleGalleryChange(index, e.target.value)} placeholder="Image URL" className="flex-1 px-3 py-2 border rounded-lg"/>
                            <button type="button" onClick={() => removeGalleryField(index)} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600">-</button>
                        </div>
                    ))}
                    <button type="button" onClick={addGalleryField} className="bg-blue-500 text-white py-1 px-3 rounded-lg hover:bg-blue-600">+ Add Image URL</button>
                </div>

                {/* --- Action Buttons --- */}
                <div className="mt-8 flex justify-end gap-4">
                    <button type="button" onClick={onCancel} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Cancel</button>
                    <button type="submit" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Save Place</button>
                </div>
            </form>
        </div>
    );
}

