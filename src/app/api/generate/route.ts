import path from 'path';
import ejs from 'ejs';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        const { city, date, time, address, speaker, gender } = body;

        if (!city || !date || !time || !address || !speaker) {
            return Response.json({ error: 'Заполните все поля' }, { status: 400 });
        }

        const filename = `${city.toLowerCase().replace(/\s/g, '-')}-${date}-${time.replace(/[:_]/g, '')}.html`;
        const templatePath = path.join(process.cwd(), 'src/app/templates/event-template.ejs');
        const formattedDate = date.split('-').reverse().join('.');

        const htmlContent = await ejs.renderFile(templatePath, {
            date: formattedDate, time, address, speaker, gender
        });

        return new Response(htmlContent, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
            }
        });
    } catch (error) {
        console.error('Error generating file:', error);
        return Response.json({ 
            error: 'Ошибка генерации файла', 
            details: (error as Error).message,
            stack: (error as Error).stack
        }, { status: 500 });
    }
}