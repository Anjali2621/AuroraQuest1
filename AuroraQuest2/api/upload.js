import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";

export const config = {
  api: { bodyParser: false }
};

// In-memory storage (works for demo)
global.documentStore = global.documentStore || { docs: [], chunks: [] };

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
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const form = formidable({ multiples: false });
  
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Upload failed" });
    
    const file = files.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    try {
      const buffer = await fs.promises.readFile(file.filepath);
      const data = await pdfParse(buffer);
      const text = data.text;
      
      const chunks = chunkText(text);
      const docId = Date.now().toString();
      
      global.documentStore.docs.push({
        id: docId,
        name: file.originalFilename,
        text: text
      });
      
      chunks.forEach(chunk => {
        global.documentStore.chunks.push({
          docId: docId,
          text: chunk
        });
      });
      
      return res.json({ 
        id: docId, 
        name: file.originalFilename, 
        chunks: chunks.length 
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Processing failed" });
    }
  });
}