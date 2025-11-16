import formidable from 'formidable';
import fs from 'fs';
import pdfParse from 'pdf-parse';

export const config = {
  api: { bodyParser: false }
};

if (!global.documentStore) {
  global.documentStore = { docs: [], chunks: [] };
}

function chunkText(text, maxChars = 1000) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + maxChars));
    start += maxChars;
  }
  return chunks;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const form = formidable({ multiples: false });
  
  return new Promise((resolve) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.status(500).json({ error: "Upload failed" });
        return resolve();
      }
      
      const file = files.file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return resolve();
      }

      try {
        const filepath = Array.isArray(file) ? file[0].filepath : file.filepath;
        const filename = Array.isArray(file) ? file[0].originalFilename : file.originalFilename;
        
        const buffer = await fs.promises.readFile(filepath);
        const data = await pdfParse(buffer);
        const text = data.text;
        
        if (!text || text.trim().length === 0) {
          res.status(400).json({ error: "No text found in PDF" });
          return resolve();
        }
        
        const chunks = chunkText(text);
        const docId = Date.now().toString();
        
        global.documentStore.docs.push({
          id: docId,
          name: filename,
          text: text
        });
        
        chunks.forEach(chunk => {
          global.documentStore.chunks.push({
            docId: docId,
            text: chunk
          });
        });
        
        res.status(200).json({ 
          id: docId, 
          name: filename, 
          chunks: chunks.length 
        });
        resolve();
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Processing failed: " + error.message });
        resolve();
      }
    });
  });
}