import React, { useState } from 'react';
// **จุดที่แก้ไข:** เปลี่ยนเป็น Default Import (ไม่มีวงเล็บปีกกา)
import PlacesManager from '../components/admin/PlacesManager';
import EventsManager from '../components/admin/EventsManager';

function AdminPanel() {
    const [activeTab, setActiveTab] = useState('places');
    return (
        <div className="container mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
            <header className="flex justify-between items-center mb-6 pb-4 border-b">
                <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                <a href="/" className="text-indigo-600 hover:text-indigo-800 hover:underline transition-colors">← Back to Main Site</a>
            </header>
            <div className="mb-4 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button 
                        onClick={() => setActiveTab('places')} 
                        className={`${activeTab === 'places' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none`}
                    >
                        Manage Places
                    </button>
                    <button 
                        onClick={() => setActiveTab('events')} 
                        className={`${activeTab === 'events' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none`}
                    >
                        Manage Events
                    </button>
                </nav>
            </div>
            
            {activeTab === 'places' && <PlacesManager />}
            {activeTab === 'events' && <EventsManager />}
        </div>
    );
}

export default AdminPanel;
