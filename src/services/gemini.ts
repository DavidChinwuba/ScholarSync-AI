import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const explainHomeworkStream = async (prompt: string, history: any[] = [], isPremium: boolean = false, imageBase64?: string) => {
  const model = isPremium ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
  
  // Convert history to Gemini format
  const contents: any[] = history.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  // Add the current user message
  const currentParts: any[] = [{ text: prompt }];
  if (imageBase64) {
    currentParts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64.split(',')[1]
      }
    });
  }
  
  contents.push({
    role: 'user',
    parts: currentParts
  });

  const systemInstruction = isPremium 
    ? "You are a world-class AI tutor. Provide highly detailed, comprehensive explanations. Always include multiple illustrative examples to ensure deep understanding. Break down complex concepts into intuitive steps."
    : "You are a helpful AI tutor. Explain homework problems clearly, step-by-step. Don't just give the answer; help the student understand the concept.";

  return await ai.models.generateContentStream({
    model,
    contents,
    config: {
      systemInstruction,
      thinkingConfig: isPremium ? { thinkingLevel: ThinkingLevel.HIGH } : undefined
    }
  });
};

export const generateFlashcards = async (topic: string, isPremium: boolean = false) => {
  const model = isPremium ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
  const count = isPremium ? 20 : 10;
  
  const response = await ai.models.generateContent({
    model,
    contents: `Generate ${count} high-quality flashcards for the topic: ${topic}. ${isPremium ? 'Include detailed explanations and context in the back of the cards.' : ''} Format as JSON array of objects with 'front' and 'back' properties.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING },
            back: { type: Type.STRING }
          },
          required: ["front", "back"]
        }
      },
      thinkingConfig: isPremium ? { thinkingLevel: ThinkingLevel.HIGH } : undefined
    }
  });

  return JSON.parse(response.text);
};

export const generateQuiz = async (topic: string, isPremium: boolean = false) => {
  const model = isPremium ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
  const count = isPremium ? 10 : 5;

  const response = await ai.models.generateContent({
    model,
    contents: `Generate a ${count}-question multiple choice quiz for the topic: ${topic}. ${isPremium ? 'Ensure questions cover advanced concepts and provide very detailed explanations for each answer.' : ''} Format as JSON array of objects with 'question', 'options' (array of 4), 'correctAnswer', and 'explanation'.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswer", "explanation"]
        }
      },
      thinkingConfig: isPremium ? { thinkingLevel: ThinkingLevel.HIGH } : undefined
    }
  });

  return JSON.parse(response.text);
};

export const generateStudySchedule = async (topic: string, examDate: string, isPremium: boolean = false) => {
  const model = isPremium ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
  const count = isPremium ? 10 : 5;

  const response = await ai.models.generateContent({
    model,
    contents: `Generate a comprehensive study schedule for the topic: ${topic}. The exam is on ${examDate}. Create a list of ${count} detailed study sessions. ${isPremium ? 'Include specific learning objectives and resource suggestions for each session.' : ''} Format as JSON array of objects with 'title', 'start' (ISO 8601), 'end' (ISO 8601), and 'description'.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            start: { type: Type.STRING },
            end: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "start", "end", "description"]
        }
      },
      thinkingConfig: isPremium ? { thinkingLevel: ThinkingLevel.HIGH } : undefined
    }
  });

  return JSON.parse(response.text);
};
