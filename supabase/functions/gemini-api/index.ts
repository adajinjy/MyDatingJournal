
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI, Type } from "npm:@google/genai@0.1.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, payload } = await req.json()
    
    // Retrieve the API Key from Supabase Secrets (Server-side only)
    const apiKey = (Deno as any).env.get('GEMINI_API_KEY_freedom')
    if (!apiKey) {
        throw new Error("Server Error: GEMINI_API_KEY_freedom is not set in Edge Function secrets.")
    }

    const ai = new GoogleGenAI({ apiKey })

    let result;

    // 1. ANALYZE NOTES
    if (action === 'analyze_notes') {
        const { notes } = payload;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following notes from a date/match interaction. Be an objective relationship coach. 
            Identify specific red flags (concerning behaviors) and green flags (positive signs). 
            
            Notes: "${notes}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
                        greenFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
                        summary: { type: Type.STRING },
                        sentimentScore: { type: Type.INTEGER }
                    },
                    required: ["redFlags", "greenFlags", "summary", "sentimentScore"]
                },
                systemInstruction: "You are a helpful, protective, and observant dating assistant.",
            }
        });
        result = JSON.parse(response.text || "{}");
    } 
    
    // 2. ANALYZE RELATIONSHIP
    else if (action === 'analyze_relationship') {
        const { name, history } = payload;
        const historyText = history.map((e: any) => 
            `Date: ${e.date}, Rating: ${e.rating}/10, Notes: ${e.notes}, Flags: ${e.flags.join(', ')}`
        ).join('\n\n');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Read the following journal entries about dating ${name}. 
            Provide a 3-4 sentence summary of the relationship trajectory. 
            Is it getting better or worse? Are there recurring red flags? What is your advice?
            
            History:
            ${historyText}`,
            config: {
                systemInstruction: "You are a wise relationship counselor. Be direct but kind."
            }
        });
        result = { summary: response.text };
    } 
    
    // 3. CHAT (BESTIE AI)
    else if (action === 'chat') {
        const { history, newMessage } = payload;
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "You are a 'Bestie' AI. You give dating advice that is supportive but honest. You look out for red flags. Keep responses conversational, relatively short (under 100 words unless asked for deep analysis), and use emojis occasionally.",
            },
            history: history.map((h: any) => ({
                role: h.role,
                parts: [{ text: h.text }]
            }))
        });

        const response = await chat.sendMessage({ message: newMessage });
        result = { text: response.text };
    } else {
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
