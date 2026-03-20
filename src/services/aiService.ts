import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function parseJSON(text: string | undefined | null) {
  if (!text) throw new Error("Empty response from AI");
  try {
    // Remove markdown code blocks if present
    const cleaned = text.replace(/^```json\n?/m, '').replace(/\n?```$/m, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse JSON:", text);
    throw new Error("Failed to parse AI response as JSON");
  }
}

export const aiService = {
  async generateSummary(personalInfo: any, experience: any[], skills: string[]) {
    const prompt = `Generate a high-impact professional summary for a resume. 
    Format: 3-4 sentences that highlight years of experience, key specializations, major achievements, and core value.
    
    Context:
    Name: ${personalInfo.fullName}
    Experience: ${JSON.stringify(experience.map(e => ({ role: e.role, company: e.company, desc: e.description })))}
    Skills: ${skills.join(", ")}
    
    Guidelines:
    - Use strong action verbs.
    - Focus on results and value delivered.
    - Maintain a formal, executive tone.
    - Do not use first-person pronouns (I, me, my).
    - Ensure it is ATS-friendly.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text;
  },

  async improveDescription(description: string, role: string) {
    const prompt = `Improve the following job description for a ${role} role to be more impactful and ATS-friendly:
    "${description}"
    Use action verbs and quantify results where possible.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text;
  },

  async improveText(text: string, context: string = "resume") {
    const prompt = `Improve the following text for a ${context} to be more impactful, professional, and ATS-friendly. 
    Fix any grammar issues, use strong action verbs, and quantify results where possible.
    Return ONLY the improved text, without any conversational filler or quotes.
    
    Original Text:
    "${text}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text?.trim() || text;
  },

  async analyzeResume(resumeData: any) {
    const prompt = `Analyze the following resume data and provide a score (0-100) and 3-5 improvement suggestions.
    Data: ${JSON.stringify(resumeData)}
    Return the response in JSON format with properties: score (number), contentImpact (number), keywordMatching (number), suggestions (array of strings).`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            contentImpact: { type: Type.NUMBER },
            keywordMatching: { type: Type.NUMBER },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["score", "contentImpact", "keywordMatching", "suggestions"]
        }
      }
    });

    return parseJSON(response.text);
  },

  async optimizeForRole(resumeData: any, targetRole: string) {
    const prompt = `Optimize the following resume for the target job title: "${targetRole}".
    Resume Data: ${JSON.stringify(resumeData)}
    Suggest specific keywords to add and how to rephrase the summary and experience to better match this role.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text;
  },

  async generateResumeFromPrompt(userPrompt: string) {
    const prompt = `Generate a complete resume JSON object based on the following user description: "${userPrompt}".
    The JSON must follow this structure:
    {
      "title": "Resume Title",
      "personalInfo": {
        "fullName": "...",
        "email": "...",
        "phone": "...",
        "location": "...",
        "linkedin": "...",
        "github": "...",
        "twitter": "...",
        "portfolio": "...",
        "summary": "..."
      },
      "experience": [
        {
          "company": "...",
          "role": "...",
          "location": "...",
          "startDate": "...",
          "endDate": "...",
          "description": "...",
          "current": boolean
        }
      ],
      "education": [
        {
          "school": "...",
          "degree": "...",
          "field": "...",
          "location": "...",
          "startDate": "...",
          "endDate": "...",
          "current": boolean
        }
      ],
      "skills": ["...", "..."],
      "projects": [
        {
          "name": "...",
          "description": "...",
          "link": "..."
        }
      ],
      "score": 70,
      "templateId": "modern",
      "color": "#4f46e5"
    }
    
    If information is missing, use realistic placeholders or leave empty strings.
    Ensure the summary and descriptions are high-impact and professional.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            personalInfo: {
              type: Type.OBJECT,
              properties: {
                fullName: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                location: { type: Type.STRING },
                linkedin: { type: Type.STRING },
                github: { type: Type.STRING },
                twitter: { type: Type.STRING },
                portfolio: { type: Type.STRING },
                summary: { type: Type.STRING }
              },
              required: ["fullName", "email", "summary"]
            },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { type: Type.STRING },
                  role: { type: Type.STRING },
                  location: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  description: { type: Type.STRING },
                  current: { type: Type.BOOLEAN }
                },
                required: ["company", "role", "description"]
              }
            },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  school: { type: Type.STRING },
                  degree: { type: Type.STRING },
                  field: { type: Type.STRING },
                  location: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  current: { type: Type.BOOLEAN }
                },
                required: ["school", "degree"]
              }
            },
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            projects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  link: { type: Type.STRING }
                },
                required: ["name", "description"]
              }
            },
            score: { type: Type.NUMBER },
            templateId: { type: Type.STRING },
            color: { type: Type.STRING }
          },
          required: ["title", "personalInfo", "experience", "education", "skills"]
        }
      }
    });

    return parseJSON(response.text);
  },

  async applySuggestion(resumeData: any, suggestion: string) {
    const prompt = `Apply the following improvement suggestion to the resume data to increase its score.
    Suggestion: "${suggestion}"
    Resume Data: ${JSON.stringify(resumeData)}
    
    Return the updated resume data in JSON format, incorporating the suggestion. Make sure to actually improve the content (e.g., add metrics, improve summary, add keywords) based on the suggestion.
    The JSON must follow this structure:
    {
      "personalInfo": {
        "fullName": "...",
        "email": "...",
        "phone": "...",
        "location": "...",
        "linkedin": "...",
        "github": "...",
        "twitter": "...",
        "portfolio": "..."
      },
      "summary": "...",
      "experience": [
        {
          "id": "...",
          "company": "...",
          "role": "...",
          "startDate": "...",
          "endDate": "...",
          "description": "..."
        }
      ],
      "education": [
        {
          "id": "...",
          "school": "...",
          "degree": "...",
          "gradDate": "..."
        }
      ],
      "skills": ["...", "..."],
      "projects": [
        {
          "id": "...",
          "name": "...",
          "description": "...",
          "link": "..."
        }
      ],
      "certifications": ["...", "..."],
      "languages": ["...", "..."]
    }
    
    Ensure all existing data is preserved unless it needs to be modified to address the suggestion.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            personalInfo: {
              type: Type.OBJECT,
              properties: {
                fullName: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                location: { type: Type.STRING },
                linkedin: { type: Type.STRING },
                github: { type: Type.STRING },
                twitter: { type: Type.STRING },
                portfolio: { type: Type.STRING }
              }
            },
            summary: { type: Type.STRING },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  company: { type: Type.STRING },
                  role: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              }
            },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  school: { type: Type.STRING },
                  degree: { type: Type.STRING },
                  gradDate: { type: Type.STRING }
                }
              }
            },
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            projects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  link: { type: Type.STRING }
                }
              }
            },
            certifications: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            languages: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    return parseJSON(response.text);
  },

  async parseResumeFromText(text: string) {
    const prompt = `Extract resume information from the following text and return it as a structured JSON object.
    Text:
    """
    ${text}
    """
    
    The JSON must follow this structure:
    {
      "title": "Resume Title",
      "personalInfo": {
        "fullName": "...",
        "email": "...",
        "phone": "...",
        "location": "...",
        "linkedin": "...",
        "github": "...",
        "twitter": "...",
        "portfolio": "...",
        "summary": "..."
      },
      "experience": [
        {
          "company": "...",
          "role": "...",
          "location": "...",
          "startDate": "...",
          "endDate": "...",
          "description": "...",
          "current": boolean
        }
      ],
      "education": [
        {
          "school": "...",
          "degree": "...",
          "field": "...",
          "location": "...",
          "startDate": "...",
          "endDate": "...",
          "current": boolean
        }
      ],
      "skills": ["...", "..."],
      "projects": [
        {
          "name": "...",
          "description": "...",
          "link": "..."
        }
      ]
    }
    
    If information is missing, leave as empty strings or empty arrays.
    Ensure all extracted text is cleaned up and professional.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            personalInfo: {
              type: Type.OBJECT,
              properties: {
                fullName: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                location: { type: Type.STRING },
                linkedin: { type: Type.STRING },
                github: { type: Type.STRING },
                twitter: { type: Type.STRING },
                portfolio: { type: Type.STRING },
                summary: { type: Type.STRING }
              },
              required: ["fullName", "email", "summary"]
            },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { type: Type.STRING },
                  role: { type: Type.STRING },
                  location: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  description: { type: Type.STRING },
                  current: { type: Type.BOOLEAN }
                },
                required: ["company", "role", "description"]
              }
            },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  school: { type: Type.STRING },
                  degree: { type: Type.STRING },
                  field: { type: Type.STRING },
                  location: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  current: { type: Type.BOOLEAN }
                },
                required: ["school", "degree"]
              }
            },
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            projects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  link: { type: Type.STRING }
                },
                required: ["name", "description"]
              }
            }
          },
          required: ["title", "personalInfo", "experience", "education", "skills"]
        }
      }
    });

    return parseJSON(response.text);
  }
};
