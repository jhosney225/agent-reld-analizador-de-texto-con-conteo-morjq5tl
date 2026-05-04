
```javascript
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

const client = new Anthropic();

interface TextStats {
  totalWords: number;
  totalCharacters: number;
  averageWordLength: number;
  uniqueWords: number;
  wordFrequency: Map<string, number>;
  sentences: number;
  paragraphs: number;
}

function analyzeText(text: string): TextStats {
  // Remove extra whitespace and normalize
  const normalizedText = text.trim();

  // Count paragraphs (separated by double newlines or single newlines)
  const paragraphs = normalizedText.split(/\n\n+|\n/).filter((p) => p.trim()).length;

  // Count sentences (basic approach: ends with . ! or ?)
  const sentences = (normalizedText.match(/[.!?]+/g) || []).length;

  // Count characters (excluding whitespace)
  const totalCharacters = normalizedText.replace(/\s/g, "").length;

  // Split into words and clean
  const words = normalizedText
    .toLowerCase()
    .match(/\b[\w']+\b/g) || [];
  const totalWords = words.length;

  // Calculate unique words and frequency
  const wordFrequency = new Map<string, number>();
  words.forEach((word) => {
    wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
  });

  const uniqueWords = wordFrequency.size;
  const averageWordLength = totalWords > 0
    ? words.reduce((sum, word) => sum + word.length, 0) / totalWords
    : 0;

  return {
    totalWords,
    totalCharacters,
    averageWordLength: Math.round(averageWordLength * 100) / 100,
    uniqueWords,
    wordFrequency,
    sentences: Math.max(1, sentences),
    paragraphs: Math.max(1, paragraphs),
  };
}

async function getAIInsights(text: string, stats: TextStats): Promise<string> {
  const topWords = Array.from(stats.wordFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => `${word} (${count})`)
    .join(", ");

  const prompt = `Analiza el siguiente texto y proporciona insights sobre su contenido y características:

Texto: "${text.substring(0, 500)}${text.length > 500 ? "..." : ""}"

Estadísticas del texto:
- Total de palabras: ${stats.totalWords}
- Palabras únicas: ${stats.uniqueWords}
- Promedio de caracteres por palabra: ${stats.averageWordLength}
- Número de oraciones: ${stats.sentences}
- Número de párrafos: ${stats.paragraphs}
- Palabras más frecuentes: ${topWords}

Por favor, proporciona un análisis breve (máximo 3 líneas) sobre la calidad del texto, su densidad de información y alguna recomendación de mejora si es necesario.`;

  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  return responseText;
}

async function processUserInput(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  console.log("\n=== ANALIZADOR DE TEXTO CON ESTADÍSTICAS ===\n");
  console.log("Bienvenido al analizador de texto avanzado.");
  console.log("Este programa analiza texto y proporciona estadísticas detalladas.\n");

  try {
    const userText = await question(
      'Ingrese el texto que desea analizar (o escriba "demo" para un ejemplo):\n> '
    );

    let textToAnalyze = userText;

    if (userText.toLowerCase() === "demo") {
      textToAnalyze = `La inteligencia artificial está revolucionando el mundo. 
        Desde la medicina hasta la educación, la IA está transformando cómo vivimos y trabajamos.
        Los algoritmos de aprendizaje automático permiten a las máquinas aprender de los datos.
        Esto ha abierto nuevas posibilidades para resolver problemas complejos.
        La tecnología avanza rápidamente y el futuro es emocionante.`;
      console.log("\n(Usando texto de demostración)\n");
    }

    // Analyze the text
    const stats = analyzeText(textToAnalyze);

    // Display statistics
    console.log("\n=== ESTADÍSTICAS DEL TEXTO ===\n");
    console.log(`Total de palabras: ${stats.totalWords}`);
    console.log(`Palabras únicas: ${stats.uniqueWords}`);
    console.log(`Caracteres totales: ${stats.totalCharacters}`);
    console.log(`Promedio de caracteres por palabra: ${stats.averageWordLength}`);
    console.log(`Número de oraciones: ${stats.sentences}`);
    console.log(`Número de párrafos: ${stats.paragraphs}`);

    // Calculate reading time (average 200 words per minute)
    const readingTimeMinutes = Math.