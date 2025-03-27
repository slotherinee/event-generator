'use client';

import { useState } from 'react';

export default function Home() {
    const [form, setForm] = useState({
        city: '',
        date: '',
        time: '',
        address: '',
        speaker: '',
        gender: 'имеющий'
    });
    const [fileUrl, setFileUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
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
          
          // Get filename from Content-Disposition header
          const contentDisposition = response.headers.get('Content-Disposition');
          const filename = contentDisposition 
              ? contentDisposition.split('filename=')[1].replace(/"/g, '') 
              : `invite-${new Date().getTime()}.html`;
          
          // Create a blob from the response and download it
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          
          const downloadLink = document.createElement('a');
          downloadLink.href = url;
          downloadLink.download = decodeURIComponent(filename);
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          
          // Clean up
          window.URL.revokeObjectURL(url);
          
          // Reset form after short delay
          setTimeout(() => {
              setForm({
                  city: '',
                  date: '',
                  time: '',
                  address: '',
                  speaker: '',
                  gender: 'имеющий'
              });
          }, 1000);
      } catch (error) {
          console.error('Error generating file:', error);
          alert(`Произошла ошибка: ${(error as Error).message}`);
      } finally {
          setLoading(false);
      }
  };

    return (
        <div className="max-w-md mx-auto mt-10 p-4 border rounded shadow-md">
            <h2 className="text-xl font-bold mb-4">Создать приглашение</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input 
                    type="text" 
                    name="city" 
                    placeholder="Город" 
                    value={form.city}
                    onChange={handleChange} 
                    required 
                    className="border p-2 rounded" 
                />
                <input 
                    type="text" 
                    name="date" 
                    placeholder="Дата (например 07.04.2025)" 
                    value={form.date}
                    onChange={handleChange} 
                    required 
                    className="border p-2 rounded" 
                />
                <input 
                    type="text" 
                    name="time" 
                    placeholder="Время (например 15:45-18:25)" 
                    value={form.time}
                    onChange={handleChange} 
                    required 
                    className="border p-2 rounded" 
                />
                <input 
                    type="text" 
                    name="address" 
                    placeholder="Адрес" 
                    value={form.address}
                    onChange={handleChange} 
                    required 
                    className="border p-2 rounded" 
                />
                <input 
                    type="text" 
                    name="speaker" 
                    placeholder="ФИО спикера" 
                    value={form.speaker}
                    onChange={handleChange} 
                    required 
                    className="border p-2 rounded" 
                />
                
                <div className="flex gap-2">
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="gender" 
                        value="имеющий" 
                        checked={form.gender === 'имеющий'} 
                        onChange={handleChange} 
                      />
                      <span>имеющий</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="gender" 
                        value="имеющая" 
                        checked={form.gender === 'имеющая'} 
                        onChange={handleChange} 
                      />
                      <span>имеющая</span>
                    </label>
                </div>

                <button 
                    type="submit" 
                    className="bg-blue-500 text-white p-2 rounded flex justify-center items-center cursor-pointer" 
                    disabled={loading}
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

            {fileUrl && <p className="mt-4"><a href={fileUrl} className="text-blue-600 underline">Скачать файл</a></p>}
        </div>
    );
}