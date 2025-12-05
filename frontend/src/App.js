import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';

// Import Pages
import AdminPanel from './pages/AdminPanel.jsx';
import EventCalendar from './pages/EventCalendar.jsx';

// Import Config
import { API_URL, SOCKET_URL } from './apiConfig.js';

const socket = io(SOCKET_URL);

// Global Styles Component
const GlobalStyles = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      body { font-family: 'Kanit', sans-serif; background-image: url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop'); background-size: cover; background-position: center; background-attachment: fixed; color: #d1d5db; }
      ::-webkit-scrollbar { width: 8px; } 
      ::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); } 
      ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 10px; } 
      ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.5); }
      .glass-card { background: rgba(20, 20, 25, 0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); }
      .station-item .station-icon { transition: all 0.3s ease-in-out; } 
      .station-item.active .station-icon { transform: scale(1.4); background-color: #10B981; box-shadow: 0 0 20px rgba(16, 185, 129, 0.7); border-color: #10B981; }
      .station-item.active .station-name { font-weight: 700; color: #6EE7B7; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);
  return null;
};

// --- Main Layout & Logic ---
function MainApp() {
  const [stations, setStations] = useState([]);
  const [places, setPlaces] = useState([]);
  const [activeStationId, setActiveStationId] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Stations
  useEffect(() => {
    axios.get(`${API_URL}/stations`)
      .then(res => {
        setStations(res.data.data);
        if (res.data.data.length > 0 && !activeStationId) {
          setActiveStationId(res.data.data[0].id);
        }
      })
      .catch(error => console.error("Error fetching stations:", error));
  }, []);

  // Fetch Places when Station changes
  useEffect(() => {
    if (!activeStationId) return;
    setIsLoading(true);
    setPlaces([]);
    axios.get(`${API_URL}/places/${activeStationId}`)
      .then(res => setPlaces(res.data.data))
      .catch(error => console.error(`Error fetching places:`, error))
      .finally(() => setIsLoading(false));
  }, [activeStationId]);

  // Socket Listener
  useEffect(() => {
    const handleReviewUpdate = (data) => {
        if (data.placeId && activeStationId) {
             axios.get(`${API_URL}/places/${activeStationId}`)
                .then(res => {
                    setPlaces(res.data.data);
                    const updatedPlace = res.data.data.find(p => p.id === data.placeId);
                    if (updatedPlace && selectedPlace && selectedPlace.id === data.placeId) {
                        setSelectedPlace(updatedPlace);
                    }
                })
                .catch(error => console.error(error));
        }
    };
    socket.on('review_updated', handleReviewUpdate);
    return () => socket.off('review_updated', handleReviewUpdate);
  }, [activeStationId, selectedPlace]);

  const handleStationClick = (stationId) => {
    setActiveStationId(stationId);
    setSelectedPlace(null);
    setSearchTerm('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeStation = useMemo(() => stations.find(s => s.id === activeStationId), [activeStationId, stations]);
  const filteredPlaces = useMemo(() => {
      if (!searchTerm) return places;
      return places.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, places]);

  // Component ย่อยต่างๆ (StationList, PlacesList, PlaceDetail) นำมาวางตรงนี้ หรือแยกไฟล์
  // (เพื่อความกระชับ ผมสมมติว่า Component ย่อยเหล่านั้นถูก import มา หรือนิยามไว้ในไฟล์เดียวกันเหมือนเดิม)
  
  return (
    <div className="h-screen w-full flex flex-col bg-gray-900">
        <header className="sticky top-0 z-30 w-full p-4 glass-card flex-shrink-0">
           <div className="flex items-center justify-between max-w-7xl mx-auto">
             <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
               <svg className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
               <span className="text-2xl font-bold text-white">BKK Explorer</span>
             </Link>
             <div className="flex items-center space-x-4">
                <Link to="/events" className="text-white hover:text-emerald-400 font-semibold transition-colors">Event Calendar</Link>
                <Link to="/admin" className="text-gray-400 hover:text-white text-sm">Admin</Link>
                <div className="relative flex-1 max-w-xs">
                   <input type="text" placeholder="ค้นหาสถานที่..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={!!selectedPlace} className="w-full py-2 pl-10 pr-4 rounded-full bg-gray-800 text-white border border-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50" />
                 </div>
             </div>
           </div>
         </header>

        <div className="flex-1 flex max-w-7xl w-full mx-auto overflow-y-hidden">
          {/* Station List Sidebar */}
          <aside className="w-full md:w-80 p-6 md:my-4 md:ml-4 md:rounded-2xl glass-card flex-col flex-shrink-0 hidden md:flex">
            <h2 className="text-xl font-bold text-center mb-6 text-white flex-shrink-0">สถานี BTS สายสีเขียว</h2>
            <div className="relative station-list-container space-y-4 overflow-y-auto pr-2 flex-1">
                {stations.map(station => (
                    <div key={station.id} className={`station-item flex items-center cursor-pointer relative z-10 p-2 rounded-lg ${station.id === activeStationId ? 'active' : ''}`} onClick={() => handleStationClick(station.id)}>
                        <div className="station-icon w-12 h-12 rounded-full bg-black/20 flex items-center justify-center mr-4 border-2 border-white/20 flex-shrink-0">
                          <span className="font-bold text-xs">{station.id}</span>
                        </div>
                        <span className="station-name text-lg text-gray-300">{station.name}</span>
                    </div>
                ))}
            </div>
          </aside>

          <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {selectedPlace ? (
              /* เรียกใช้ Component PlaceDetail แบบเดิม */
              <PlaceDetail place={selectedPlace} onBack={() => setSelectedPlace(null)} onReviewSubmit={(id, data) => axios.post(`${API_URL}/places/${id}/reviews`, data)} />
            ) : (
              /* เรียกใช้ Component PlacesList แบบเดิม */
              <PlacesList station={activeStation} places={filteredPlaces} onSelectPlace={setSelectedPlace} isLoading={isLoading} />
            )}
          </main>
        </div>
    </div>
  );
}

// --- App Root with Routing ---
export default function App() {
  return (
    <Router>
      <GlobalStyles />
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/events" element={<EventCalendar />} />
      </Routes>
    </Router>
  );
}

// ... (ต้องนำ Component ย่อย: StationList, PlacesList, PlaceDetail มาใส่ต่อท้าย หรือ import เข้ามาเพื่อให้โค้ดทำงานได้เหมือนเดิม)
// หมายเหตุ: PlaceDetail และ PlacesList ใช้โค้ดเดิมจากไฟล์ที่คุณส่งมาได้เลยครับ
function PlaceDetail({ place, onBack, onReviewSubmit }) {
  // ... (Code เดิมจาก App.js เก่า)
  const [mainImage, setMainImage] = useState(place.image);
  const [currentRating, setCurrentRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => { setMainImage(place.image); }, [place]);

  const handleSubmitReview = () => {
    if (currentRating > 0 && reviewComment.trim() !== '') {
      onReviewSubmit(place.id, { user: "ผู้เยี่ยมชม", rating: currentRating, comment: reviewComment });
      alert('ขอบคุณสำหรับรีวิวของคุณ!');
      setCurrentRating(0);
      setReviewComment('');
    } else {
      alert('กรุณาให้คะแนนและเขียนความคิดเห็นก่อนส่ง');
    }
  };
  // ... (ส่วน render เดิม)
  return (
      <div>
          <button onClick={onBack} className="mb-6 glass-card hover:bg-white/20 text-white font-bold py-2 px-4 rounded-lg transition duration-300">← กลับไปหน้ารายการ</button>
          {/* ... เนื้อหาเดิม ... */}
          <div className="glass-card rounded-lg shadow-xl overflow-hidden p-6">
               <h3 className="text-4xl font-bold mb-2 text-white">{place.name}</h3>
               {/* ... ใส่โค้ดแสดงผลเดิม ... */}
          </div>
      </div>
  )
}

function PlacesList({ station, places, onSelectPlace, isLoading }) {
  // ... (Code เดิมจาก App.js เก่า)
   if (isLoading) return <div className="text-center text-white">Loading...</div>;
   return (
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {places.map(place => (
               <div key={place.id} onClick={() => onSelectPlace(place)} className="glass-card p-4 cursor-pointer hover:bg-white/10 transition rounded-xl">
                   <img src={place.image} className="w-full h-40 object-cover rounded-lg mb-2" alt={place.name}/>
                   <h3 className="text-xl font-bold text-white">{place.name}</h3>
               </div>
           ))}
       </div>
   )
}