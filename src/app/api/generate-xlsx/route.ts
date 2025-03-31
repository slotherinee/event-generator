import { NextRequest } from 'next/server';
import path from 'path';
import ejs from 'ejs';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { Readable } from 'stream';

interface EventData {
    city: string;
    date: string;
    time: string;
    address: string;
    speaker: string;
    gender: string;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return Response.json({ error: 'Файл не найден' }, { status: 400 });
        }
        
        // Read XLSX file
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const data = XLSX.utils.sheet_to_json<any>(worksheet);
        
        if (!data || data.length === 0) {
            return Response.json({ error: 'Файл не содержит данных' }, { status: 400 });
        }
        
        // Check for required columns
        const requiredColumns = ['Город', 'Дата', 'Время проведения', 'Адрес проведения', 'ФИО Спикера', 'Гендер'];
        const firstRow = data[0];
        
        const missingColumns = requiredColumns.filter(col => {
            return !Object.keys(firstRow).some(key => key.includes(col));
        });
        
        if (missingColumns.length > 0) {
            return Response.json({ 
                error: `Отсутствуют обязательные столбцы: ${missingColumns.join(', ')}` 
            }, { status: 400 });
        }
        
        // Template path
        const templatePath = path.join(process.cwd(), 'src/app/templates/event-template.ejs');
        
        // Create ZIP archive
        const zip = new JSZip();
        
        // Process each row and generate HTML
        for (const row of data) {
            const city = row['Город'];
            const date = formatDate(row['Дата']);
            const time = row['Время проведения'];
            const address = row['Адрес проведения'];
            const speaker = row['ФИО Спикера'];
            const gender = row['Гендер']?.toLowerCase() === 'ж' ? 'имеющая' : 'имеющий';
            
            // Validate data
            if (!city || !date || !time || !address || !speaker) {
                continue; // Skip invalid rows
            }
            
            // Generate HTML content
            const htmlContent = await ejs.renderFile(templatePath, {
                date, time, address, speaker, gender
            });
            
            // Add to ZIP
            const filename = `${city.toLowerCase().replace(/\s/g, '-')}-${date.replace(/\./g, '-')}-${time.replace(/[:_]/g, '')}.html`;
            zip.file(filename, htmlContent);
        }
        
        // Generate ZIP file
        const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
        
        // Create response
        return new Response(zipBuffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="invites-${new Date().getTime()}.zip"`,
            }
        });
        
    } catch (error) {
        console.error('Error processing XLSX file:', error);
        return Response.json({ 
            error: 'Ошибка обработки XLSX файла', 
            details: (error as Error).message,
            stack: (error as Error).stack
        }, { status: 500 });
    }
}

// Helper function to format date
function formatDate(dateValue: any): string {
    if (!dateValue) return '';
    
    // Handle Excel date number
    if (typeof dateValue === 'number') {
        const excelDate = XLSX.SSF.parse_date_code(dateValue);
        return `${String(excelDate.d).padStart(2, '0')}.${String(excelDate.m).padStart(2, '0')}.${excelDate.y}`;
    }
    
    // Handle string date
    if (typeof dateValue === 'string') {
        // Try to parse in various formats
        // DD.MM.YYYY
        if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateValue)) {
            return dateValue;
        }
        
        // YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            const parts = dateValue.split('-');
            return `${parts[2]}.${parts[1]}.${parts[0]}`;
        }
        
        // DD/MM/YYYY
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
            const parts = dateValue.split('/');
            return `${parts[0]}.${parts[1]}.${parts[2]}`;
        }
    }
    
    // If we can't parse, return original
    return String(dateValue);
}