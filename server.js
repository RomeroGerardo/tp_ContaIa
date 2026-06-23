const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
const port = 3000;

// Enable CORS so the frontend can hit this API
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files

const NOTEBOOK_ID = 'f61ac173-b64f-4b14-b87b-343638438875';

app.post('/api/chat', (req, res) => {
    const pregunta = req.body.pregunta;
    
    if (!pregunta) {
        return res.status(400).json({ error: 'La pregunta es obligatoria' });
    }

    console.log(`[ContaIA Backend] Consultando NotebookLM: "${pregunta}"...`);

    // Limpiamos comillas dobles y saltos de línea para no romper el comando en consola
    const promptSeguro = req.body.pregunta.replace(/"/g, '\\"').replace(/\n/g, ' ').replace(/\r/g, '');
    const command = `nlm query notebook ${NOTEBOOK_ID} "${promptSeguro}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error ejecutando NLM: ${error.message}`);
            return res.status(500).json({ 
                error: 'Error interno conectando con NotebookLM',
                details: error.message 
            });
        }

        console.log(`[ContaIA Backend] Respuesta recibida.`);
        
        // NotebookLM CLI suele devolver texto plano o JSON. Removemos info innecesaria
        let cleanOutput = stdout.split('\n')
            .filter(line => !line.includes('Loading') && !line.includes('Querying notebook'))
            .join('\n')
            .trim();

        // Intentar parsear como JSON si NLM devolvió el objeto estructurado
        try {
            const parsed = JSON.parse(cleanOutput);
            if (parsed && parsed.answer) {
                cleanOutput = parsed.answer;
            }
        } catch (e) {
            // No es JSON, dejar como texto plano
        }

        res.json({ respuesta: cleanOutput || "Sin respuesta válida del notebook." });
    });
});

app.listen(port, () => {
    console.log('===================================================');
    console.log(`🚀 Servidor ContaIA Backend corriendo en http://localhost:${port}`);
    console.log(`🧠 Conectado a NotebookLM (Notebook ID: ${NOTEBOOK_ID})`);
    console.log('===================================================');
});
