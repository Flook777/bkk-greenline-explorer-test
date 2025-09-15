import React, { useState, useEffect } from 'react';

export function EventForm({ event, places, onSave, onCancel, isAdding }) {
    // **จุดที่แก้ไข 1:** เริ่มต้น state ด้วยค่าว่างที่ปลอดภัย
    const [formData, setFormData] = useState({
        place_id: '',
        event_date: '',
        title: '',
        description: ''
    });

    useEffect(() => {
        if (event) {
            // เมื่อแก้ไข Event ที่มีอยู่แล้ว
            setFormData({
                place_id: event.place_id,
                event_date: event.event_date.split('T')[0], // จัดรูปแบบสำหรับ input type="date"
                title: event.title,
                description: event.description || ''
            });
        } else {
            // **จุดที่แก้ไข 2:** เมื่อเพิ่ม Event ใหม่, จะรอให้ 'places' มีข้อมูลก่อนค่อยตั้งค่า default
            setFormData({
                place_id: places.length > 0 ? places[0].id : '', // ตั้งค่า default เมื่อมีข้อมูลแล้ว
                event_date: '',
                title: '',
                description: ''
            });
        }
    }, [event, places, isAdding]); // ให้ effect นี้ทำงานเมื่อ props เหล่านี้เปลี่ยน

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ id: event?.id, ...formData });
    };

    // ป้องกันการแสดงผลฟอร์มถ้ายังไม่มีข้อมูลสถานที่ให้เลือก (สำหรับกรณี Add New)
    if (isAdding && places.length === 0) {
        return (
            <div className="bg-white shadow-lg rounded-lg p-6 mb-8 border border-gray-200">
                <p className="text-center text-gray-500">Loading places information...</p>
            </div>
        );
    }

    return (
         <div className="bg-white shadow-lg rounded-lg p-6 mb-8 border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">{isAdding ? 'Add New Event' : `Edit: ${event.title}`}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="place_id">Place</label>
                    <select name="place_id" id="place_id" value={formData.place_id} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" required>
                        <option value="" disabled>-- Please select a place --</option>
                        {places.map(p => <option key={p.id} value={p.id}>{p.name} ({p.station_id})</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">Event Title</label>
                    <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" required />
                </div>
                 <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="event_date">Event Date</label>
                    <input type="date" name="event_date" id="event_date" value={formData.event_date} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" required />
                </div>
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">Description</label>
                    <textarea name="description" id="description" value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" rows="3"></textarea>
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button type="button" onClick={onCancel} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Cancel</button>
                    <button type="submit" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Save Event</button>
                </div>
            </form>
         </div>
    );
}

