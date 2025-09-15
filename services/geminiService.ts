import { GoogleGenAI, Content, Type } from "@google/genai";
import { UserRole, PreCodedGpt, Citation, StructuredDataType } from '../types';

if (!process.env.API_KEY) {
    console.error("API_KEY environment variable not set. Please configure it.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const CONTROLLED_SUBSTANCES = ['morphine', 'fentanyl', 'oxycodone', 'codeine', 'diazepam', 'lorazepam', 'alprazolam', 'ketamine', 'buprenorphine'];

const TRUSTED_DATA_SOURCES = `
\n\n---
**Knowledge Base: Trusted Indian & Global Health Data Sources**
When answering questions about statistics, guidelines, or public health, you MUST prioritize and reference information from the following trusted sources. This is your primary knowledge base.

**General Public & National Health Info:**
*   **MoHFW India (https://mohfw.gov.in):** The official Ministry of Health and Family Welfare site for portals, dashboards, and national health advisories.
*   **Data.gov.in MoHFW (https://www.data.gov.in/ministrydepartment/Ministry%20of%20Health%20and%20Family%20Welfare):** Open government data with state/indicator level health datasets.
*   **NHM HMIS Portal (https://www.india.gov.in/nhm-health-statistics-information-portal):** For state and district level health statistics and HMIS indicators.

**Emergency Care & First Aid:**
*   **WHO Emergency Care Toolkit (https://www.who.int/teams/integrated-health-services/clinical-services-and-systems/emergency-and-critical-care/emergency-care-toolkit):** Provides protocols, tools, and training for triage and red flags.
*   **WHO Emergency Care Dataset (https://cdn.who.int/media/docs/default-source/integrated-health-services-(ihs)/csy/dataset-for-emergency-care.pdf):** Defines data standards and fields for emergency care.
*   **First Aid Intents Dataset (https://www.kaggle.com/datasets/mahmoudahmed6/first-aid-intents-dataset):** A dataset for understanding first aid related questions and utterances.
*   **AIDER (Zenodo - https://zenodo.org/records/3888300):** A dataset of annotated aerial images for disaster response.
---
`;

// Schemas for structured JSON responses
const JSON_SCHEMAS: Record<string, object> = {
    'homeopathy-analysis': {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING, description: 'A natural language summary of the repertory analysis and remedy suggestions.' },
            remedies: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        remedy: { type: Type.STRING, description: "The name of the homeopathic remedy, e.g., 'Arsenicum Album'." },
                        potencySuggestion: { type: Type.STRING, description: "Suggested potency, e.g., '30C, 200C'." },
                        keynotes: { type: Type.STRING, description: "The key symptoms and modalities from the patient's case that match this remedy." },
                        confidence: { type: Type.STRING, enum: ['Strong Match', 'Good Match', 'Possible Match'] }
                    },
                    required: ['remedy', 'potencySuggestion', 'keynotes', 'confidence']
                }
            }
        },
        required: ['summary', 'remedies']
    },
    'general-symptom': {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING, description: 'A natural language summary of the triage advice.' },
            triageLevel: { type: Type.STRING, enum: ['Emergency', 'Urgent', 'Routine', 'Self-care'] },
            triageAdvice: { type: Type.STRING },
            possibleConditions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['summary', 'triageLevel', 'triageAdvice', 'possibleConditions']
    },
    'student-notes': {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING, description: 'A summary of the generated SOAP note.' },
            subjective: { type: Type.STRING },
            objective: { type: Type.STRING },
            assessment: { type: Type.STRING },
            plan: { type: Type.STRING }
        },
        required: ['summary', 'subjective', 'objective', 'assessment', 'plan']
    }
};

export function checkForControlledSubstances(message: string): boolean {
    const lowerCaseMessage = message.toLowerCase();
    return CONTROLLED_SUBSTANCES.some(drug => lowerCaseMessage.includes(drug));
}


function constructSystemInstruction(userRole: UserRole, language: string, activeGpt?: PreCodedGpt): string {
    let instruction = "You are Medanna, a helpful AI healthcare assistant operating in India. Be empathetic, clear, and professional. Format your answers using Markdown for clarity, including lists, bold text, and headings where appropriate. ";

    switch (userRole) {
        case UserRole.DOCTOR:
            instruction += "You are assisting a qualified, verified homeopathic practitioner. Your tone should be professional and concise. Your primary goal is to perform repertory analysis based on the provided case details. Analyze symptoms, modalities (what makes them better or worse), and the patient's constitution. Reference classical homeopathic materia medica and repertories in your reasoning. Always remind the practitioner to use their own judgment and to conduct a full case taking. ";
            break;
    }

    if (activeGpt) {
        instruction += `\n\nCONTEXT: The user has selected the '${activeGpt.title}' mode. ${activeGpt.description} Tailor your responses to this specific context. `;
        if (activeGpt.id === 'student-sim') {
            instruction += "You should now act as a virtual patient. Do not break character unless explicitly asked to. Be interactive and respond to questions naturally. ";
        }
        if(JSON_SCHEMAS[activeGpt.id]) {
            instruction += "Your response must be a single JSON object that strictly conforms to the provided schema. Include a natural language summary of your findings in the 'summary' field."
        }
    }
    
    instruction += TRUSTED_DATA_SOURCES;
    instruction += `All your responses must be in ${language}.`;

    return instruction;
}


export async function* streamChatResponse({
    message,
    history,
    userRole,
    language,
    activeGpt,
    isDoctorVerified
}: {
    message: string;
    history: Content[];
    userRole: UserRole;
    language: string;
    activeGpt?: PreCodedGpt;
    isDoctorVerified: boolean;
}) {
    // CRITICAL SAFETY GUARDRAIL
    if (checkForControlledSubstances(message)) {
        if (userRole === UserRole.DOCTOR && !isDoctorVerified) {
            // This case should be handled by the UI, but as a fallback:
            yield { error: "Access to this information requires license verification. Please complete the verification step." };
            return;
        }
    }

    try {
        const systemInstruction = constructSystemInstruction(userRole, language, activeGpt);
        const activeSchema = activeGpt ? JSON_SCHEMAS[activeGpt.id] : undefined;
        
        const contents: Content[] = [...history, { role: 'user', parts: [{ text: message }] }];
        
        const isInteractive = activeGpt?.id === 'student-sim';

        const stream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents,
            config: {
                systemInstruction,
                // FIX: Enable Google Search for non-JSON responses to provide citations.
                ...(!activeSchema && { tools: [{googleSearch: {}}] }),
                ...(activeSchema && { responseMimeType: "application/json", responseSchema: activeSchema }),
                ...(isInteractive && { thinkingConfig: { thinkingBudget: 0 }})
            },
        });

        if (activeSchema) {
            // Handle JSON streaming: accumulate chunks and parse at the end
            let responseText = '';
            for await (const chunk of stream) {
                const textChunk = chunk.text;
                if (textChunk) {
                    responseText += textChunk;
                }
            }

            try {
                const parsedJson = JSON.parse(responseText);
                const structuredData: StructuredDataType | undefined =
                    activeGpt?.id === 'homeopathy-analysis' ? { type: 'homeopathy', data: parsedJson.remedies, summary: parsedJson.summary } :
                    activeGpt?.id === 'student-notes' ? { type: 'soap', data: parsedJson, summary: parsedJson.summary } :
                    activeGpt?.id === 'general-symptom' ? { type: 'symptom', data: parsedJson, summary: parsedJson.summary } :
                    undefined;

                if (structuredData) {
                    yield { structuredData };
                } else {
                     yield { textChunk: parsedJson.summary || 'Received structured data in an unknown format.' };
                }

            } catch (e) {
                console.error("JSON parsing error:", e);
                yield { error: "Failed to parse the structured response from the AI." };
            }

        } else {
             // Handle regular text streaming
            for await (const chunk of stream) {
                const textChunk = chunk.text;
                if (textChunk) {
                    yield { textChunk };
                }
                
                // FIX: Extract and yield citations from grounding metadata if available.
                const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
                if (groundingMetadata?.groundingChunks) {
                    const citations: Citation[] = groundingMetadata.groundingChunks
                        .map((c: any) => ({
                            uri: c.web?.uri,
                            title: c.web?.title,
                        }))
                        .filter((c): c is Citation => !!(c.uri && c.title));
                    if (citations.length > 0) {
                        yield { citations };
                    }
                }
            }
        }

    } catch (error) {
        console.error("Gemini API error:", error);
        yield { error: "Failed to get response from Gemini API. Please check your connection and API key." };
    }
}