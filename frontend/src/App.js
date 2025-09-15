import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

// Import หน้า Page หลักๆ
import AdminPanel from './pages/AdminPanel.jsx';
import EventCalendar from './pages/EventCalendar.jsx';

// --- Configuration ---
const API_URL = 'http://localhost:3001/api';
const socket = io('http://localhost:3001');

// --- Global Styles ---
const GlobalStyles = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      body { font-family: 'Kanit', sans-serif; background-image: url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop'); background-size: cover; background-position: center; background-attachment: fixed; color: #d1d5db; }
      ::-webkit-scrollbar { width: 8px; } ::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 10px; } ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.5); }
      .glass-card { background: rgba(20, 20, 25, 0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); }
      .station-list-container::before { content: ''; position: absolute; top: 20px; bottom: 20px; left: 23px; width: 4px; border-radius: 2px; z-index: 0; background-color: rgba(255, 255, 255, 0.2); }
      .station-item .station-icon { transition: all 0.3s ease-in-out; } .station-item.active .station-icon { transform: scale(1.4); background-color: #10B981; box-shadow: 0 0 20px rgba(16, 185, 129, 0.7); border-color: #10B981; }
      .station-item.active .station-name { font-weight: 700; color: #6EE7B7; } .star-rating .star { cursor: pointer; color: #4b5563; transition: color 0.2s; } .star-rating .star:hover, .star-rating .star.selected { color: #f59e0b; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);
  return null;
};

// --- Main Application Component (หน้าที่แสดงผลหลัก) ---
function MainApp() {
  const [stations, setStations] = useState([]);
  const [places, setPlaces] = useState([]);
  const [activeStationId, setActiveStationId] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const mainContentRef = useRef(null);

  useEffect(() => {
    axios.get(`${API_URL}/stations`)
      .then(res => {
        setStations(res.data.data);
        if (res.data.data.length > 0) {
          setActiveStationId(res.data.data[0].id);
        }
      })
      .catch(error => console.error("Error fetching stations:", error));
  }, []);

  useEffect(() => {
    if (!activeStationId) return;
    setIsLoading(true);
    setPlaces([]);
    axios.get(`${API_URL}/places/${activeStationId}`)
      .then(res => setPlaces(res.data.data))
      .catch(error => console.error(`Error fetching places for station ${activeStationId}:`, error))
      .finally(() => setIsLoading(false));
  }, [activeStationId]);

  useEffect(() => {
    const handleReviewUpdate = (updatedPlace) => {
        setPlaces(currentPlaces => 
            currentPlaces.map(p => p.id === updatedPlace.id ? updatedPlace : p)
        );
        setSelectedPlace(currentSelected => 
            currentSelected?.id === updatedPlace.id ? updatedPlace : currentSelected
        );
    };
    socket.on('review_updated', handleReviewUpdate);
    return () => socket.off('review_updated', handleReviewUpdate);
  }, []);

  const handleStationClick = (stationId) => {
    setActiveStationId(stationId);
    setSelectedPlace(null);
    setSearchTerm('');
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPlace = (place) => {
    setSelectedPlace(place);
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => setSelectedPlace(null);
  
  const handleReviewSubmit = (placeId, reviewData) => {
      axios.post(`${API_URL}/places/${placeId}/reviews`, reviewData)
        .catch(error => {
            console.error("Error submitting review:", error);
            alert("เกิดข้อผิดพลาดในการส่งรีวิว");
        });
  };

  const handleRandomPlace = () => {
    if (filteredPlaces.length === 0) {
      alert("ไม่มีสถานที่ให้สุ่มในรายการนี้");
      return;
    }
    const randomIndex = Math.floor(Math.random() * filteredPlaces.length);
    handleSelectPlace(filteredPlaces[randomIndex]);
  };

  const activeStation = useMemo(() => stations.find(s => s.id === activeStationId), [activeStationId, stations]);
  const filteredPlaces = useMemo(() => {
      if (!searchTerm) return places;
      return places.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, places]);

  return (
    <>
      <GlobalStyles />
      <div className="h-screen w-full flex flex-col bg-gray-900">
        <header className="sticky top-0 z-30 w-full p-4 glass-card flex-shrink-0">
           <div className="flex items-center justify-between max-w-7xl mx-auto">
             <a href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
               <svg className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
               <span className="text-2xl font-bold text-white">BKK Green Line Explorer</span>
             </a>
             <div className="flex items-center space-x-4">
                <a href="/events" className="text-white hover:text-emerald-400 font-semibold transition-colors">Event Calendar</a>
                <div className="relative flex-1 max-w-xs">
                   <input type="text" placeholder="ค้นหาสถานที่..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={!!selectedPlace} className="w-full py-2 pl-10 pr-4 rounded-full bg-gray-800 text-white border border-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50" />
                   <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg></div>
                 </div>
                 <button onClick={handleRandomPlace} title="สุ่มสถานที่" className="p-2 text-2xl rounded-full hover:bg-gray-700 transition-colors">🎲</button>
             </div>
           </div>
         </header>
        <div className="flex-1 flex max-w-7xl w-full mx-auto overflow-y-hidden">
          <StationList stations={stations} activeStationId={activeStationId} onStationClick={handleStationClick} />
          <main ref={mainContentRef} className="flex-1 p-4 md:p-8 overflow-y-auto">
            {selectedPlace ? (
              <PlaceDetail place={selectedPlace} onBack={handleBackToList} onReviewSubmit={handleReviewSubmit} />
            ) : (
              <PlacesList station={activeStation} places={filteredPlaces} onSelectPlace={handleSelectPlace} isLoading={isLoading} />
            )}
          </main>
        </div>
      </div>
    </>
  );
}

// --- App Router (หน้าที่เลือกว่าจะแสดงหน้าไหน) ---
export default function App() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const onLocationChange = () => setRoute(window.location.pathname);
    
    const handleLinkClick = (e) => {
      const anchor = e.target.closest('a');
      if (anchor && anchor.href && anchor.host === window.location.host) {
        e.preventDefault();
        window.history.pushState({}, '', anchor.href);
        onLocationChange();
      }
    };
    
    window.addEventListener('popstate', onLocationChange);
    document.addEventListener('click', handleLinkClick);

    return () => {
      window.removeEventListener('popstate', onLocationChange);
      document.removeEventListener('click', handleLinkClick);
    };
  }, []);

  if (route === '/admin') {
    return <AdminPanel />;
  }
  if (route === '/events') {
    return <EventCalendar />;
  }
  
  return <MainApp />;
}


// --- Child Components ---
function StationList({ stations, activeStationId, onStationClick }) {
    return (
        <aside className="w-full md:w-80 p-6 md:my-4 md:ml-4 md:rounded-2xl glass-card flex-col flex-shrink-0 hidden md:flex">
            <h2 className="text-xl font-bold text-center mb-6 text-white flex-shrink-0">สถานี BTS สายสีเขียว</h2>
            <div className="relative station-list-container space-y-4 overflow-y-auto pr-2 flex-1">
                {stations.map(station => (
                    <div key={station.id} className={`station-item flex items-center cursor-pointer relative z-10 p-2 rounded-lg ${station.id === activeStationId ? 'active' : ''}`} onClick={() => onStationClick(station.id)}>
                        <div className="station-icon w-12 h-12 rounded-full bg-black/20 flex items-center justify-center mr-4 border-2 border-white/20 flex-shrink-0"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.789-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-1.026.977-2.19.977-3.434 0-3.517-1.009-6.789-2.753-9.571M12 11V9m0 2H8m4 0h2" /></svg></div>
                        <span className="station-name text-lg text-gray-300">{station.name} ({station.id})</span>
                    </div>
                ))}
            </div>
        </aside>
    );
}

function PlacesList({ station, places, onSelectPlace, isLoading }) {
  if (isLoading) {
    return <div className="text-center text-2xl text-white">กำลังโหลดข้อมูล...</div>;
  }
  return (
    <div>
      <h2 className="text-4xl font-bold mb-2 text-white drop-shadow-lg">สถานี {station?.name}</h2>
      <p className="text-gray-300 mb-8 drop-shadow-md">เลือกสถานที่ที่คุณสนใจเพื่อดูรายละเอียดเพิ่มเติม</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {places.length > 0 ? places.map((place) => (
          <div key={place.id} className="glass-card rounded-2xl flex flex-col overflow-hidden cursor-pointer group transition-all duration-300 transform hover:scale-105" onClick={() => onSelectPlace(place)}>
            <img src={place.image} alt={place.name} className="w-full h-40 object-cover" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/600x400/2d3748/ffffff?text=Image+Not+Found'; }} />
            <div className="p-4 flex flex-col flex-grow justify-between">
              <div>
                <h3 className="text-xl font-bold text-white truncate">{place.name}</h3>
                <p className="text-sm text-emerald-400 mt-1">{place.category}</p>
              </div>
              <div className="mt-4 flex items-center justify-between w-full text-left text-white">
                <span className="text-lg">ดูเพิ่มเติม</span>
                <div className="bg-white/10 p-2 rounded-full group-hover:bg-emerald-500 transition-colors duration-300">
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full text-center p-10 glass-card rounded-lg"><p className="text-gray-300 text-lg">ยังไม่มีข้อมูลสถานที่สำหรับสถานีนี้</p></div>
        )}
      </div>
    </div>
  );
}

function PlaceDetail({ place, onBack, onReviewSubmit }) {
  const [mainImage, setMainImage] = useState(place.image);
  const [currentRating, setCurrentRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => { setMainImage(place.image); }, [place]);

  const handleSubmitReview = () => {
    if (currentRating > 0 && reviewComment.trim() !== '') {
      onReviewSubmit(place.id, { user: "ผู้เยี่ยมชม", rating: currentRating, comment: reviewComment });
      alert('ขอบคุณสำหรับรีวิวของคุณ! ข้อมูลจะอัปเดตทันที');
      setCurrentRating(0);
      setReviewComment('');
    } else {
      alert('กรุณาให้คะแนนและเขียนความคิดเห็นก่อนส่ง');
    }
  };

  const getContactIcon = (platform) => {
    const icons = {
      Website: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"></path></svg>,
      Facebook: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M20 10c0-5.523-4.477-10-10-10S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878V14.89h-2.54V12.39h2.54V10.49c0-2.505 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.22h-1.108c-1.24 0-1.628.772-1.628 1.563v1.875h2.477l-.423 2.5h-2.054v5.009C16.343 19.128 20 14.991 20 10z" clipRule="evenodd"></path></svg>,
    };
    return icons[platform] || icons['Website'];
  };

  return (
    <div>
      <button onClick={onBack} className="mb-6 glass-card hover:bg-white/20 text-white font-bold py-2 px-4 rounded-lg transition duration-300">← กลับไปหน้ารายการ</button>
      <div className="glass-card rounded-lg shadow-xl overflow-hidden">
        <div className="p-4">
            <img src={mainImage} alt={place.name} className="w-full h-72 object-cover rounded-lg shadow-lg" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/800x600/2d3748/ffffff?text=Image+Not+Found'; }}/>
            <div className="flex gap-2 mt-2 justify-center flex-wrap">
                {(place.gallery || []).map((imgUrl, index) => (
                    <img key={index} src={imgUrl} alt={`${place.name} thumbnail ${index + 1}`} className="w-20 h-16 object-cover rounded-md cursor-pointer border-2 border-transparent hover:border-emerald-400" onClick={() => setMainImage(imgUrl)} onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/150x120/2d3748/ffffff?text=Error'; }} />
                ))}
            </div>
        </div>
        <div className="p-6">
            <h3 className="text-4xl font-bold mb-2 text-white drop-shadow-md">{place.name}</h3>
            <p className="text-gray-300 mb-6">{place.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                    <h4 className="text-xl font-semibold mb-3 text-emerald-400">📝 ข้อมูลทั่วไป</h4>
                    <div className="space-y-3">
                        <p className="flex items-start"><span className="mr-3 text-xl">⏰</span> <span className="flex-1">{place.openingHours || 'ไม่มีข้อมูล'}</span></p>
                        <p className="flex items-start"><span className="mr-3 text-xl">🚶‍♂️</span> <span className="flex-1">{place.travelInfo || 'ไม่มีข้อมูล'}</span></p>
                        <p className="flex items-start"><span className="mr-3 text-xl">📞</span> <span className="flex-1">{place.phone || 'ไม่มีข้อมูล'}</span></p>
                    </div>
                </div>
                <div>
                    <h4 className="text-xl font-semibold mb-3 text-emerald-400">🌐 ช่องทางติดต่อ</h4>
                    <div className="space-y-3">
                        {Object.entries(place.contact || {}).map(([platform, url]) => (
                            <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center text-gray-300 hover:text-white">
                                <span className="w-6 mr-3">{getContactIcon(platform)}</span> {platform}
                            </a>
                        ))}
                    </div>
                    {place.location && (place.location.lat && place.location.lng) &&
                        <a href={`https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center justify-center w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300">
                            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m-6 3v6m6-6v6m0-6H9"></path></svg>
                            กดเพื่อนำทาง
                        </a>
                    }
                </div>
            </div>
            <div>
                <h4 className="text-xl font-semibold mb-3 text-emerald-400">⭐ รีวิวและคะแนน</h4>
                <div className="space-y-4 mb-6">
                    {(place.reviews || []).length > 0 ? place.reviews.map((review, i) => (
                        <div key={i} className="bg-black/20 p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                                <p className="font-semibold text-white">{review.user}</p>
                                <div className="flex">{[...Array(5)].map((_, starIndex) => <span key={starIndex} className={`text-xl ${review.rating > starIndex ? 'text-amber-400' : 'text-gray-500'}`}>★</span>)}</div>
                            </div>
                            <p className="text-gray-400 mt-1">{review.comment}</p>
                        </div>
                    )) : <p>ยังไม่มีรีวิวสำหรับสถานที่นี้</p>}
                </div>
                <div className="bg-black/20 p-4 rounded-lg">
                    <h5 className="font-semibold text-white mb-2">เขียนรีวิวของคุณ</h5>
                    <div className="mb-3">
                        <span className="text-sm">ให้คะแนน:</span>
                        <div className="star-rating text-3xl inline-flex">
                            {[1, 2, 3, 4, 5].map(val => <span key={val} className={`star ${currentRating >= val ? 'selected' : ''}`} onClick={() => setCurrentRating(val)}>★</span>)}
                        </div>
                    </div>
                    <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} className="w-full bg-gray-900/50 rounded-md p-2 text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none border border-gray-700" rows="3" placeholder="แบ่งปันความคิดเห็นของคุณ..."></textarea>
                    <button onClick={handleSubmitReview} className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300">ส่งรีวิว</button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

