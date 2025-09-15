import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:3001/api';

const EventModal = ({ event, onClose }) => {
    if (!event) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-4 text-gray-800" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-2 text-indigo-600">{event.title}</h2>
                <p className="text-sm text-gray-500 mb-4">{new Date(event.event_date).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="mb-4">{event.description}</p>
                <div className="text-sm bg-gray-100 p-3 rounded-lg">
                    <strong>สถานที่:</strong> {event.placeName} (สถานี {event.station_id})
                </div>
                <button onClick={onClose} className="mt-6 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors">
                    Close
                </button>
            </div>
        </div>
    );
};

function EventCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);

    useEffect(() => {
        const fetchEvents = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/events`);
                if (!response.ok) throw new Error('Could not fetch events.');
                const data = await response.json();
                const eventsByDate = (data.data || []).reduce((acc, event) => {
                    const date = event.event_date.split('T')[0];
                    if (!acc[date]) {
                        acc[date] = [];
                    }
                    acc[date].push(event);
                    return acc;
                }, {});
                setEvents(eventsByDate);
            } catch (error) {
                console.error(error);
                setEvents({});
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const changeMonth = (offset) => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

    const calendarDays = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(<div key={`empty-${i}`} className="border rounded-lg p-2 bg-gray-50"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEvents = events[dateStr] || [];
        
        calendarDays.push(
            <div key={day} className="border rounded-lg p-2 min-h-[120px] flex flex-col bg-white">
                <time className="font-semibold">{day}</time>
                <div className="flex-grow overflow-y-auto mt-1 space-y-1">
                    {dayEvents.map(event => (
                        <button key={event.id} onClick={() => setSelectedEvent(event)} className="w-full text-left text-xs bg-emerald-100 text-emerald-800 p-1 rounded hover:bg-emerald-200 truncate">
                            {event.title}
                        </button>
                    ))}
                </div>
            </div>
        );
    }
    

    return (
        <>
            <div className="bg-gray-900 text-white min-h-screen">
                 <header className="sticky top-0 z-30 w-full p-4 bg-gray-800 bg-opacity-80 backdrop-filter backdrop-blur-lg">
                   <div className="flex items-center justify-between max-w-7xl mx-auto">
                     <a href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                       <svg className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                       <span className="text-2xl font-bold text-white">Event Calendar</span>
                     </a>
                   </div>
                 </header>

                <div className="container mx-auto p-4 md:p-8">
                     <div className="flex justify-between items-center mb-4">
                        <button onClick={() => changeMonth(-1)} className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700">← Previous</button>
                        <h2 className="text-2xl font-bold">{monthName}</h2>
                        <button onClick={() => changeMonth(1)} className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700">Next →</button>
                    </div>
                    {isLoading ? (
                        <p className="text-center">Loading events...</p>
                    ) : (
                        <div className="grid grid-cols-7 gap-2 text-center text-gray-800">
                             {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="font-bold text-white">{day}</div>)}
                             {calendarDays}
                        </div>
                    )}
                </div>
            </div>
             <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        </>
    );
}

export default EventCalendar;
