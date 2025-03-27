import fs from 'fs';
import path from 'path';
import ejs from 'ejs';

export async function POST(req: Request) {
    let filePath = '';
    
    try {
        const body = await req.json();
        
        const { city, date, time, address, speaker, gender } = body;

        if (!city || !date || !time || !address || !speaker) {
            return Response.json({ error: 'Заполните все поля' }, { status: 400 });
        }

        const filename = `${city.toLowerCase().replace(/\s/g, '-')}-${date}-${time.replace(/[:_]/g, '')}.html`;

        filePath = path.join(process.cwd(), 'public', filename);
        const templatePath = path.join(process.cwd(), 'src/app/templates/event-template.ejs');
        const formattedDate = date.split('-').reverse().join('.');

        const htmlContent = await ejs.renderFile(templatePath, {
            date: formattedDate, time, address, speaker, gender
        });

        fs.writeFileSync(filePath, htmlContent);
        
        const response = Response.json({ url: `/${filename}` });
        setTimeout(() => {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`File ${filename} deleted successfully`);
                }
            } catch (deleteError) {
                console.error(`Error deleting file ${filename}:`, deleteError);
            }
        }, 10000);
        
        return response;
    } catch (error) {
        return Response.json({ 
            error: 'Ошибка генерации файла', 
            details: (error as Error).message,
            stack: (error as Error).stack
        }, { status: 500 });
    }
}