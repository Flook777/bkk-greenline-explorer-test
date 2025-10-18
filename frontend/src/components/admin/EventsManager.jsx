import React, { useState, useEffect, useCallback } from 'react';
import { ConfirmationModal } from '../shared/ConfirmationModal';
import { Notification } from '../shared/Notification';
import { EventForm } from './EventForm.jsx';
import { API_URL } from '../../apiConfig.js'; // Import the centralized API URL

export default function EventsManager() {
    const [events, setEvents] = useState([]);
    const [places, setPlaces] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notification, setNotification] = useState({ message: null, type: 'error' });
    const [editingEvent, setEditingEvent] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);

    const showNotification = (message, type = 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: null, type: 'error' }), 5000);
    };
    
    const fetchEventsAndPlaces = useCallback(async () => {
        setIsLoading(true);
        try {
            const [eventsRes, placesRes] = await Promise.all([
                fetch(`${API_URL}/events`),
                fetch(`${API_URL}/places`)
            ]);
            if (!eventsRes.ok || !placesRes.ok) throw new Error('Failed to fetch event data');
            
            const eventsData = await eventsRes.json();
            const placesData = await placesRes.json();
            
            setEvents(eventsData.data || []);
            setPlaces(placesData.data || []);
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEventsAndPlaces();
    }, [fetchEventsAndPlaces]);

    const handleDeleteClick = (id) => setEventToDelete(id);
    const confirmDelete = async () => {
        if (!eventToDelete) return;
        try {
            const res = await fetch(`${API_URL}/events/${eventToDelete}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete event');
            showNotification('Event deleted successfully!', 'success');
            await fetchEventsAndPlaces();
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setEventToDelete(null);
        }
    };

    const handleSave = async (eventData) => {
        const isUpdating = !!eventData.id;
        const url = isUpdating ? `${API_URL}/events/${eventData.id}` : `${API_URL}/events/add`;
        const method = isUpdating ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save event');
            }
            showNotification(`Event ${isUpdating ? 'updated' : 'added'} successfully!`, 'success');
            setIsAdding(false);
            setEditingEvent(null);
            await fetchEventsAndPlaces();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };
    
    const handleEdit = (event) => {
        setEditingEvent(event);
        setIsAdding(false);
    };

    if (isLoading) return <p>Loading events...</p>;

    return (
        <div>
            {eventToDelete && <ConfirmationModal message="Are you sure you want to delete this event?" onConfirm={confirmDelete} onCancel={() => setEventToDelete(null)} />}
             <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: null, type: 'error' })} />

            <div className="flex justify-end mb-4">
                <button onClick={() => { setIsAdding(true); setEditingEvent(null); }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-px">+ Add New Event</button>
            </div>
            
            {(isAdding || editingEvent) && (
                <EventForm 
                    event={editingEvent}
                    places={places}
                    onSave={handleSave}
                    onCancel={() => { setIsAdding(false); setEditingEvent(null); }}
                    isAdding={isAdding}
                />
            )}
            
            <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
                <table className="min-w-full leading-normal">
                    <thead className="bg-gray-100">
                         <tr className="text-left text-gray-600 uppercase text-sm">
                            <th className="py-3 px-5 font-semibold">Event Title</th>
                            <th className="py-3 px-5 font-semibold">Date</th>
                            <th className="py-3 px-5 font-semibold">Place</th>
                            <th className="py-3 px-5 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {events.length > 0 ? events.map(event => (
                            <tr key={event.id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="py-4 px-5">{event.title}</td>
                                <td className="py-4 px-5">{new Date(event.event_date).toLocaleDateString()}</td>
                                <td className="py-4 px-5">{event.placeName} ({event.station_id})</td>
                                <td className="py-4 px-5 text-right">
                                    <button onClick={() => handleEdit(event)} className="text-blue-600 hover:text-blue-900 mr-4 font-semibold">Edit</button>
                                    <button onClick={() => handleDeleteClick(event.id)} className="text-red-600 hover:text-red-900 font-semibold">Delete</button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="4" className="text-center py-10 text-gray-500">No events found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
