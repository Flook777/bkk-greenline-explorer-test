import React from 'react';

// แก้ไข: เปลี่ยนเป็น export const (Named Export)
export const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
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

