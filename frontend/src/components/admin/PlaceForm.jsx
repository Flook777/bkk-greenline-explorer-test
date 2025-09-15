import React, { useState, useEffect } from 'react';

// แก้ไข: เปลี่ยนเป็น export function (Named Export)
export function PlaceForm({ place, stations, onSave, onCancel, isAdding }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        station_id: '',
        category: '',
        image: ''
    });

    useEffect(() => {
        if (place) {
            setFormData(place);
        } else {
            setFormData({
                name: '',
                description: '',
                station_id: stations.length > 0 ? stations[0].id : '',
                category: 'Restaurant',
                image: ''
            });
        }
    }, [place, stations]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ id: place?.id, ...formData });
    };

    return (
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8 border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">{isAdding ? 'Add New Place' : `Edit: ${place.name}`}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">Category</label>
                    <input type="text" name="category" id="category" value={formData.category} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="image">Image URL</label>
                    <input type="text" name="image" id="image" value={formData.image} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">Description</label>
                    <textarea name="description" id="description" value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" rows="3"></textarea>
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button type="button" onClick={onCancel} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Cancel</button>
                    <button type="submit" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Save Place</button>
                </div>
            </form>
        </div>
    );
}

