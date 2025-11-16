if (!global.documentStore) {
  global.documentStore = { docs: [], chunks: [] };
}

function searchChunks(query, store) {
  const queryLower = query.toLowerCase();
  const scored = store.chunks.map(chunk => {
    const chunkLower = chunk.text.toLowerCase();
    const words = queryLower.split(' ');
    let score = 0;
    words.forEach(word => {
      if (chunkLower.includes(word)) score++;
    });
    return { score, text: chunk.text };
  });
  
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).filter(s => s.score > 0);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "No message" });
  
  if (!global.documentStore || !global.documentStore.chunks || global.documentStore.chunks.length === 0) {
    return res.json({ answer: "Please upload a PDF first! 📚" });
  }
  
  const relevant = searchChunks(message, global.documentStore);
  
  if (relevant.length === 0) {
    return res.json({ answer: "I couldn't find relevant information in your uploaded materials about that topic. 🤔" });
  }
  
  const answer = relevant.map((r, i) => 
    `**Source ${i+1}:**\n${r.text.slice(0, 300)}...`
  ).join('\n\n');
  
  return res.json({ answer });
}
