'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function Home() {
    const [activeTab, setActiveTab] = useState('manual');
    const [form, setForm] = useState({
        city: '',
        date: '',
        time: '',
        address: '',
        speaker: '',
        gender: 'имеющий'
    });
    const [errors, setErrors] = useState({
        date: '',
        time: ''
    });
    const [loading, setLoading] = useState(false);
    const [xlsxFile, setXlsxFile] = useState<File | null>(null);
    const [fileLoading, setFileLoading] = useState(false);

    const validateDate = (date: string) => {
        if (!date) return '';
        
        const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
        if (!dateRegex.test(date)) {
            return 'Формат даты должен быть ДД.ММ.ГГГГ, например: 07.04.2025';
        }
        return '';
    };

    const validateTime = (time: string) => {
        if (!time) return '';
        
        const timeRegex = /^\d{2}:\d{2}-\d{2}:\d{2}$/;
        if (!timeRegex.test(time)) {
            return 'Формат времени должен быть ЧЧ:ММ-ЧЧ:ММ, например: 15:45-18:25';
        }
        return '';
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        
        const digits = value.replace(/\D/g, '');
        
        let formattedValue = '';
        if (digits.length > 0) {
            formattedValue = digits.substring(0, 2);
            
            if (digits.length > 2) {
                formattedValue += ':' + digits.substring(2, 4);
                
                if (digits.length > 4) {
                    formattedValue += '-' + digits.substring(4, 6);
                    
                    if (digits.length > 6) {
                        formattedValue += ':' + digits.substring(6, 8);
                    }
                }
            }
        }
        
        setForm({ ...form, time: formattedValue });
        
        setErrors(prev => ({ ...prev, time: validateTime(formattedValue) }));
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        
        const digits = value.replace(/\D/g, '');
        
        let formattedValue = '';
        if (digits.length > 0) {
            formattedValue = digits.substring(0, 2);
            
            if (digits.length > 2) {
                formattedValue += '.' + digits.substring(2, 4);
                
                if (digits.length > 4) {
                    formattedValue += '.' + digits.substring(4, 8);
                }
            }
        }
        
        setForm({ ...form, date: formattedValue });
        
        setErrors(prev => ({ ...prev, date: validateDate(formattedValue) }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        if (name === 'date') {
            handleDateChange(e);
        } else if (name === 'time') {
            handleTimeChange(e);
        } else {
            setForm({ ...form, [name]: value });
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        const dateError = validateDate(form.date);
        const timeError = validateTime(form.time);
        
        setErrors({
            date: dateError,
            time: timeError
        });
        
        if (dateError || timeError) {
            return;
        }
        
        setLoading(true);
        
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка при генерации файла');
            }
            
            const contentDisposition = response.headers.get('Content-Disposition');
            const filename = contentDisposition 
                ? contentDisposition.split('filename=')[1].replace(/"/g, '') 
                : `invite-${new Date().getTime()}.html`;
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = decodeURIComponent(filename);
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            window.URL.revokeObjectURL(url);
            
            setTimeout(() => {
                setForm({
                    city: '',
                    date: '',
                    time: '',
                    address: '',
                    speaker: '',
                    gender: 'имеющий'
                });
                setErrors({ date: '', time: '' });
            }, 1000);
        } catch (error) {
            console.error('Error generating file:', error);
            alert(`Произошла ошибка: ${(error as Error).message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setXlsxFile(e.target.files[0]);
        }
    };

    const handleFileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (!xlsxFile) {
            alert('Пожалуйста, выберите файл XLSX');
            return;
        }
        
        setFileLoading(true);
        
        try {
            const formData = new FormData();
            formData.append('file', xlsxFile);
            
            const response = await fetch('/api/generate-xlsx', {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка при обработке файла');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const contentDisposition = response.headers.get('Content-Disposition');
            const filename = contentDisposition 
                ? contentDisposition.split('filename=')[1].replace(/"/g, '') 
                : `invites-${new Date().getTime()}.zip`;
            
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = decodeURIComponent(filename);
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            window.URL.revokeObjectURL(url);
            
            setXlsxFile(null);
            // Reset file input
            const fileInput = document.getElementById('xlsxFile') as HTMLInputElement;
            if (fileInput) {
                fileInput.value = '';
            }
        } catch (error) {
            console.error('Error processing XLSX file:', error);
            alert(`Произошла ошибка: ${(error as Error).message}`);
        } finally {
            setFileLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-4 border rounded shadow-md">
            <h2 className="text-xl font-bold mb-4">Создать приглашение на мастер класс</h2>
            
            {/* Tabs */}
            <div className="flex border-b mb-4">
                <button 
                    className={`py-2 px-4 font-medium ${activeTab === 'manual' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('manual')}
                >
                    Вручную
                </button>
                <button 
                    className={`py-2 px-4 font-medium ${activeTab === 'file' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('file')}
                >
                    Загрузить XLSX
                </button>
            </div>
            
            {/* Manual Form */}
            {activeTab === 'manual' && (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <div className="flex flex-col">
                        <label htmlFor="city" className="font-medium mb-1">Город</label>
                        <input 
                            id="city"
                            type="text" 
                            name="city" 
                            placeholder="Например: Красноярск" 
                            value={form.city}
                            onChange={handleChange} 
                            required 
                            className="border p-2 rounded" 
                        />
                    </div>
                    
                    <div className="flex flex-col">
                        <label htmlFor="date" className="font-medium mb-1">Дата</label>
                        <input 
                            id="date"
                            type="text" 
                            name="date" 
                            placeholder="Например: 07.04.2025" 
                            value={form.date}
                            onChange={handleChange} 
                            required 
                            className={`border p-2 rounded ${errors.date ? 'border-red-500' : ''}`} 
                        />
                        {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
                    </div>
                    
                    <div className="flex flex-col">
                        <label htmlFor="time" className="font-medium mb-1">Время</label>
                        <input 
                            id="time"
                            type="text" 
                            name="time" 
                            placeholder="Например: 15:45-18:25" 
                            value={form.time}
                            onChange={handleChange} 
                            required 
                            className={`border p-2 rounded ${errors.time ? 'border-red-500' : ''}`}
                        />
                        {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time}</p>}
                    </div>
                    
                    <div className="flex flex-col">
                        <label htmlFor="address" className="font-medium mb-1">Адрес</label>
                        <input 
                            id="address"
                            type="text" 
                            name="address" 
                            placeholder="Полный адрес проведения мероприятия" 
                            value={form.address}
                            onChange={handleChange} 
                            required 
                            className="border p-2 rounded" 
                        />
                    </div>
                    
                    <div className="flex flex-col">
                        <label htmlFor="speaker" className="font-medium mb-1">ФИО спикера</label>
                        <input 
                            id="speaker"
                            type="text" 
                            name="speaker" 
                            placeholder="Фамилия Имя Отчество" 
                            value={form.speaker}
                            onChange={handleChange} 
                            required 
                            className="border p-2 rounded" 
                        />
                    </div>
                    
                    <div className="flex flex-col">
                        <label className="font-medium mb-1">Пол спикера</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                              <input 
                                type="radio" 
                                name="gender" 
                                value="имеющий" 
                                checked={form.gender === 'имеющий'} 
                                onChange={handleChange} 
                              />
                              <span>Мужской</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input 
                                type="radio" 
                                name="gender" 
                                value="имеющая" 
                                checked={form.gender === 'имеющая'} 
                                onChange={handleChange} 
                              />
                              <span>Женский</span>
                            </label>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="bg-blue-500 text-white p-2 rounded flex justify-center items-center cursor-pointer mt-2" 
                        disabled={loading || !!errors.date || !!errors.time}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Генерация...
                            </>
                        ) : "Сгенерировать"}
                    </button>
                </form>
            )}
            
            {/* File Upload Form */}
            {activeTab === 'file' && (
                <form onSubmit={handleFileSubmit} className="flex flex-col gap-3">
                    <div className="flex flex-col">
                        <label htmlFor="xlsxFile" className="font-medium mb-1">Файл XLSX</label>
                        <input 
                            id="xlsxFile"
                            type="file" 
                            accept=".xlsx, .xls" 
                            onChange={handleFileChange}
                            required 
                            className="border p-2 rounded" 
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            Файл должен содержать столбцы: Город, Дата, Время, Адрес проведения, ФИО Спикера, Гендер
                        </p>
                    </div>
                    
                    <button 
                        type="submit" 
                        className="bg-blue-500 text-white p-2 rounded flex justify-center items-center cursor-pointer mt-2"
                        disabled={fileLoading || !xlsxFile}
                    >
                        {fileLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Обработка...
                            </>
                        ) : "Обработать файл"}
                    </button>
                </form>
            )}
        </div>
    );
}