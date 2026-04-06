/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Upload, 
  Download, 
  History, 
  Camera, 
  Loader2, 
  Image as ImageIcon,
  ChevronRight,
  RefreshCw,
  Clock,
  Sparkles,
  Grid,
  Edit3,
  X,
  Eraser,
  Palette,
  Undo2,
  Maximize,
  ZoomIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface GeneratedPortrait {
  id: string;
  style: string;
  styleEn: string;
  url: string;
  prompt: string;
  caption?: string;
}

interface StyleConfig {
  name: string;
  nameEn: string;
  prompt: string;
}

// --- Constants ---

const STYLES: StyleConfig[] = [
  {
    name: "文藝復興 (Renaissance Majesty)",
    nameEn: "Renaissance Majesty",
    prompt: "Generate a Renaissance-inspired portrait of the same person. Preserve the subject’s facial features, identity, gender, and ethnicity. Ensure the subject's age is preserved or slightly younger than the reference image, strictly avoiding any aging effects. Depict the subject as a noble figure wearing refined and elegant 16th-century European attire with tasteful fabric details. Styling: For men, include period-appropriate headwear like elegant velvet caps or berets, and a doublet with slashed sleeves. For women, maintain a lightweight and graceful aesthetic with intricate braided hair crowns, subtle jeweled accents, or delicate hair ornaments, strictly avoiding heavy or fully-covering hats to preserve an airy and elegant feel. Include high lace ruff collars where appropriate. Makeup: Natural Renaissance-style, matte skin, subtle earthy tones, defined but natural features, avoiding modern glossy or heavy cosmetics. The styling must be historically authentic and sophisticated, avoiding an overly cluttered or exaggerated look. Neutral facial expression, strictly no smiling, maintaining a serene and quiet classical art atmosphere. Style: Hyper-realistic but timeless, inspired by Renaissance portrait composition, soft chiaroscuro lighting, subtle and refined oil painting texture (soft sfumato finish), natural skin texture, no glossy fashion lighting, no heavy oil paint effect. Background: Deep, dark neutral backdrop with subtle depth. Composition: Tight half-body portrait where the subject appears large and prominent, filling at least 70% of the vertical frame. Three-quarter view or slight side profile, calm and dignified posture, 3:4 vertical aspect ratio. Mood: Timeless, dignified, museum-quality realism. High resolution, refined detail, cinematic but restrained. Avoid modern fashion photography aesthetics and contemporary makeup. Strictly forbid all modern items and accessories, especially smartwatches, digital devices, or contemporary jewelry. Every element must be historically accurate to the 16th century."
  },
  {
    name: "大正浪漫 (Taisho Romance)",
    nameEn: "Taisho Romance",
    prompt: "A Taisho Roman–inspired portrait. Preserve the subject’s facial features, identity, gender, and ethnicity. Depict the subject in a dignified posture. Styling: For women, wearing elegant Taisho-era attire: a lace-collared blouse with a high-waisted striped hakama, or a patterned kimono with a high-collared blouse. For men, wearing a classic Taisho-era gakuran (student uniform), a formal kimono with haori and hakama, or a sharp Zhongshan suit (Sun Yat-sen suit) which was popular in this era, potentially with a retro flat cap or bowler hat. Style: Early 20th-century studio photography aesthetic, warm sepia-toned color palette, muted vintage tones, soft diffused lighting. Natural skin texture. Background: Traditional Japanese interior with shoji screens, vintage wooden furniture, and an antique clock. Accessories: The subject holds a classic folding fan or an open vintage book. Hair: Natural hairstyle with a simple vintage ribbon or pearl hairclip. Composition: Tight half-body portrait, subject prominent (70% of frame). 3:4 vertical aspect ratio. Mood: Romantic, nostalgic, intellectual. Output: High resolution, ultra-detailed, museum-quality realism. Avoid anime, cosplay, modern fashion lighting, and heavy makeup. Strictly forbid all modern items (smartwatches, smartphones). Historically accurate to the Taisho era."
  },
  {
    name: "好萊塢默片 (Silent Glamour)",
    nameEn: "Silent Glamour",
    prompt: "Generate a glamorous late-1920s Hollywood studio portrait inspired by the golden age of silent cinema (1927–1929). Preserve the subject’s facial features, identity, gender, and ethnicity from the reference image. Photography Style: Classic black and white film photography, high-contrast yet flattering lighting, soft cinematic chiaroscuro, directional studio key light, smooth tonal transitions, subtle natural film grain, no modern digital sharpness, no HDR effect. Hair & Styling: For women, authentic 1920s finger waves or soft Marcel waves. Elegant beaded flapper-style evening gown or silk evening dress. Optional opera gloves (black, ivory, or none). Classic pearl necklace or refined Art Deco jewelry. For men, a sharp 1920s tuxedo or a three-piece suit with a crisp white shirt, silk tie, and slicked-back hair in the style of a silent film star. Expression: Gentle closed-lip smile. Lips softly curved but teeth not visible. Warm yet poised gaze. Elegant and graceful presence. Dramatic but beautiful — not stern, not severe. Background: Dark velvet drapery or geometric Art Deco backdrop. Soft vignette edges. Authentic 1920s Hollywood studio ambiance. Composition: Upper-body portrait. Vertical 3:4 ratio. Centered cinematic framing. Mood: Glamorous, dramatic, refined, timeless, beautiful. Avoid wide smile, visible teeth, open mouth smile, exaggerated grin, harsh expression, overly modern fashion, HDR look, fashion magazine style lighting."
  },
  {
    name: "臺灣風華年代 (Formosa Radiance)",
    nameEn: "Taiwan Golden Era",
    prompt: "Generate a portrait inspired by Taiwan in the 1970s. Preserve the subject’s facial features, identity, gender, and ethnicity from the reference image. Depict the subject as a confident and elegant urban figure from Taiwan’s golden era. Styling: For women, dressed in stylish 1970s attire such as a geometric-pattern blouse, high-waisted trousers, a retro dress, or flared pants. For men, a classic 1970s safari jacket, a polo shirt, or a retro patterned shirt with flared trousers and sideburns typical of the era. Style: Historical realism with a cinematic and nostalgic atmosphere, photorealistic yet timeless, inspired by 1970s Taiwanese films and vintage studio photography. Warm, natural lighting with soft shadows. Muted earthy tones such as caramel brown, mustard yellow, olive green, and brick red. Natural makeup and hairstyle typical of the era. Subtle film grain for authenticity. No exaggerated retro filters or sepia effects. No modern fashion aesthetics. Background: A nostalgic Taiwanese streetscape with traditional shop signs and arcade buildings, or a vintage photo studio with a warm gradient backdrop. Use a shallow depth of field to naturally blur the background elements, especially the shop signs and signboards, so that any text on them is softly out of focus and not clearly legible. Include authentic cultural elements such as scooters or old signboards. Accessories: A leather handbag or classic wristwatch. Composition: Tight half-body framing where the subject occupies the vast majority of the frame. The subject should be shown from the waist up, with the head and upper torso dominating the composition. The subject must appear large and prominent, filling at least 70% of the vertical space. Elegant and confident posture, centered composition, vertical aspect ratio of 3:4. Mood: Warm, nostalgic, and refined—capturing the prosperity and cultural charm of Taiwan in the 1970s. Output: High resolution, ultra-detailed, photorealistic, cinematic quality. Avoid modern buildings, contemporary fashion, neon cyberpunk elements, heavy sepia filters, exaggerated retro styling, anime aesthetics, and futuristic objects. Add subtle 1970s film grain and warm Kodak color tones. Strictly forbid all modern items and accessories, especially smartwatches, smartphones, or digital devices. Every element must be historically accurate to the 1970s. Ensure background text is blurred and illegible."
  },
  {
    name: "當代時尚 (Contemporary Fashion)",
    nameEn: "Contemporary Fashion",
    prompt: "Generate a contemporary high-fashion portrait with a luxury brand campaign aesthetic. Preserve the subject’s facial features, identity, gender, and ethnicity from the reference image. Style: Contemporary Luxury Fashion — Timeless Elegance, Modern Prestige. Modern luxury brand ambassador presence. Refined, confident, quietly powerful. The subject should feel like the face of a premium fashion house or international luxury campaign. subtle cinematic depth, quiet star aura, international luxury advertisement tone Wardrobe: High-fashion luxury styling with couture-inspired details. For women, options such as: 1) Designer evening gown or modern minimalist couture dress; 2) Sharp tailored luxury pantsuit or sophisticated high-waisted trousers with a structured designer top; 3) Elegant eveningwear with refined draping or subtle statement silhouettes. For men, sharp tailored designer suits, premium luxury knitwear, or sophisticated high-fashion outerwear with clean lines. Fabrics may include silk, satin, velvet, chiffon, or premium textured materials. Avoid standard corporate suits or plain business blazers. Avoid conservative office styling. Color palette: Champagne, ivory, deep black, midnight navy, metallic accents, soft gold, rich neutral tones. Details: Subtle embroidery, refined embellishment, couture-inspired trims, elegant draping, layered luxury jewelry. Outfit should feel like a luxury campaign or red-carpet editorial moment. The outfit should feel like a luxury fashion house runway or premium international brand advertisement. Hair: Modern elegant styling with natural sophistication. Makeup: Luminous natural skin with a soft editorial glow. Light refined eye definition. Soft neutral or rose-toned lips. Fresh, modern, elegant. No heavy eyeliner, no dramatic contouring. Lighting: Soft diffused luxury lighting. Dimensional but clean. Subtle highlights and gentle shadow depth. High-end campaign quality. Expression: Confident, composed. Gentle closed-lip smile. No visible teeth. Magnetic yet understated presence. Background: Minimalist upscale interior, architectural modern space, or softly blurred luxury environment. Clean and elegant. Composition: Prominent half-body portrait. The subject should be large and occupy a significant portion of the frame, ensuring a clear and detailed view of the person. Avoid small or distant subject placement. Editorial framing. Vertical 3:4 ratio. Magazine-quality finish. Mood: Luxury brand campaign. Understated prestige. Modern icon energy. Image Quality: Ultra high resolution. Realistic skin tones. Detailed fabric and jewelry texture. Premium editorial polish. Important: No text, no typography, no logos, no watermarks."
  },
  {
    name: "未來紀元 (Future Epoch)",
    nameEn: "Future Epoch",
    prompt: "The Age of Intelligent Elegance. Futuristic portrait of a refined individual within an advanced architectural environment overlooking a luminous intelligent city. Preserve the subject’s facial features, identity, gender, and ethnicity from the reference image. Structured sculptural couture with clean geometric lines and high-tech refined fabric. Minimalist futuristic tailoring in pearl white, graphite black, deep navy, or silver-grey. The attire should be elegant and human-centered, suitable for both men and women. Subtle metallic accents integrated into the design. No armor, no heavy embellishment. Expansive intelligent architectural space with soft ambient blue-white glow. Clean futuristic interior, panoramic depth, subtle holographic atmosphere integrated into the environment. Technology should feel natural and seamlessly embedded in the space. Calm authoritative presence, upright confident posture, composed and visionary expression. Soft cool lighting with cinematic clarity. Luxury future aesthetic, human-centered civilization, sophisticated, refined, elevated. No cyberpunk, no robotic implants, no mechanical limbs, no aggressive neon, no dystopian elements. Vertical aspect ratio 3:4."
  }
];

// --- Components ---

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [portraits, setPortraits] = useState<GeneratedPortrait[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [manualApiKey, setManualApiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [additionalDesc, setAdditionalDesc] = useState('');
  const [resolution, setResolution] = useState<string>("1K");
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);
  const [refiningPortraitId, setRefiningPortraitId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [brushColor, setBrushColor] = useState('#ef4444');
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<{ points: { x: number; y: number }[]; color: string }[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Helper: Resize Image ---
  const resizeImage = (base64: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(base64);
        }
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  };

  // Check for API key on mount
  React.useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        // Fallback for local dev or if not in AI Studio
        // Check if we have a key in localStorage
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) {
          setManualApiKey(savedKey);
          setHasKey(true);
        } else {
          setHasKey(false);
          setShowKeyInput(true);
        }
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true); // Assume success as per instructions
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSourceImage(event.target?.result as string);
        setPortraits([]);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveManualKey = () => {
    if (manualApiKey.trim()) {
      localStorage.setItem('gemini_api_key', manualApiKey.trim());
      setHasKey(true);
      setShowKeyInput(false);
    }
  };

  const generatePortraits = async () => {
    if (!sourceImage) return;

    setIsGenerating(true);
    setPortraits([]);
    setProgress(0);
    setError(null);

    // Use API_KEY (user-selected) or GEMINI_API_KEY (default) or manualApiKey
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || manualApiKey;
    if (!apiKey) {
      setError("找不到 API 金鑰，請重新選擇。(API Key not found, please re-select.)");
      setHasKey(false);
      setIsGenerating(false);
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3.1-flash-image-preview";
    
    // Resize image before sending to API to save memory and bandwidth
    const resizedImage = await resizeImage(sourceImage);
    const base64Data = resizedImage.split(',')[1];
    const mimeType = resizedImage.split(',')[0].split(':')[1].split(';')[0];

    const stylesToGenerate = STYLES.filter(s => selectedStyleIds.includes(s.nameEn));
    const totalStyles = stylesToGenerate.length;
    let completedCount = 0;
    const successfulPortraits: GeneratedPortrait[] = [];

    try {
      // Use sequential generation to prevent browser memory crashes and API rate limiting
      // Especially important for 2K resolution
      for (const style of stylesToGenerate) {
        let attempts = 0;
        const maxAttempts = 2;
        let success = false;

        while (attempts < maxAttempts && !success) {
          try {
            const isHistorical = ["Renaissance Majesty", "Taisho Romance", "Silent Glamour", "Taiwan Golden Era"].includes(style.nameEn);
            
            const promptText = `Transform this ${gender} into a ${style.nameEn}. ${style.prompt} 
            ${additionalDesc ? `Additional user request: ${additionalDesc}` : ''}
            CRITICAL: Preserve the person's exact facial identity, features, expression, and ethnicity. 
            CRITICAL: Strictly maintain the person's original gender (${gender}). If the photo is male, the output MUST be male. If female, the output MUST be female.
            CRITICAL: The subject MUST NOT look older than the reference image. Strictly avoid any aging effects, wrinkles, or sagging skin. The subject should look their current age or slightly younger/refreshed.
            CRITICAL: The subject MUST NOT look heavier or thicker than the reference image. Maintain the person's original body type, physique, and overall weight. 
            ${isHistorical ? `CRITICAL: Remove all modern accessories from the source image (e.g., watches, fitness trackers, modern jewelry, belts, modern glasses) to ensure strict historical authenticity for the chosen era.` : 'Maintain the aesthetic and stylistic authenticity of the chosen style.'}
            Output a high-resolution, photorealistic portrait suitable for professional and commercial use. 
            Aspect ratio: 3:4 (Portrait).`;

            const response = await ai.models.generateContent({
              model: model,
              contents: {
                parts: [
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: mimeType,
                    },
                  },
                  {
                    text: promptText,
                  },
                ],
              },
              config: {
                imageConfig: {
                  aspectRatio: "3:4", 
                  imageSize: resolution as any
                }
              }
            });

            let imageUrl = "";
            const parts = response.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
              if (part.inlineData) {
                imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                break;
              }
            }

            if (imageUrl) {
              const portrait: GeneratedPortrait = {
                id: Math.random().toString(36).substr(2, 9),
                style: style.name,
                styleEn: style.nameEn,
                url: imageUrl,
                prompt: style.prompt,
                caption: ""
              };
              
              successfulPortraits.push(portrait);
              // Update portraits state incrementally to show progress and keep memory usage stable
              setPortraits(prev => [...prev, portrait]);
              success = true;
            } else {
              success = true; // No image returned, stop retrying
            }
          } catch (err: any) {
            attempts++;
            if (attempts < maxAttempts && (err.message?.includes("500") || err.status === 500)) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              success = true;
            }
          }
        }
        
        completedCount++;
        setProgress((completedCount / totalStyles) * 100);
      }

      if (successfulPortraits.length === 0) {
        throw new Error("所有風格生成皆失敗。這可能是因為內容安全過濾、API 配額用盡或伺服器暫時不穩定。請嘗試更換照片或稍後再試。");
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      if (err.message?.includes("Requested entity was not found") || err.message?.includes("api-key-not-valid")) {
        setHasKey(false);
        setError("API 金鑰無效或已過期，請重新選擇。(API Key invalid or expired, please re-select.)");
      } else if (err.message?.includes("safety")) {
        setError("生成內容被安全過濾器攔截，請嘗試更換照片或調整描述。(Content blocked by safety filters.)");
      } else {
        setError(err.message || "生成過程中發生錯誤，請稍後再試。");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const refinePortrait = async () => {
    if (!refiningPortraitId || !refinementPrompt) return;
    
    const targetPortrait = portraits.find(p => p.id === refiningPortraitId);
    if (!targetPortrait) return;

    setIsGenerating(true);
    setProgress(0);
    setError(null);

    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setError("找不到 API 金鑰，請重新選擇。(API Key not found, please re-select.)");
      setHasKey(false);
      setIsGenerating(false);
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3.1-flash-image-preview";
    
    const targetUrl = targetPortrait.url;
    const base64Data = targetUrl.split(',')[1];
    const mimeType = targetUrl.split(',')[0].split(':')[1].split(';')[0];

    // Capture markup if exists
    let markupBase64 = null;
    if (canvasRef.current && paths.length > 0) {
      markupBase64 = canvasRef.current.toDataURL('image/png').split(',')[1];
    }

    try {
      const parts: any[] = [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
      ];

      if (markupBase64) {
        parts.push({
          inlineData: {
            data: markupBase64,
            mimeType: 'image/png',
          },
        });
      }

      parts.push({
        text: `Refine this portrait based on the following request: ${refinementPrompt}. 
        ${markupBase64 ? "The second image provided contains colored markings/circles indicating the specific areas that need attention or modification." : ""}
        Maintain the exact same style (${targetPortrait.styleEn}), background, and composition of the original image. 
        Only modify the specific elements requested. 
        CRITICAL: Preserve the person's exact facial identity, features, and expression.
        CRITICAL: The subject MUST NOT look older or heavier than the reference image. Strictly avoid any aging or weight gain effects.
        Output a high-resolution, photorealistic portrait. 
        Aspect ratio: 3:4 (Portrait).`,
      });

      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: parts,
        },
        config: {
          imageConfig: {
            aspectRatio: "3:4", 
            imageSize: resolution as any
          }
        }
      });

      let imageUrl = "";
      const responseParts = response.candidates?.[0]?.content?.parts || [];
      for (const part of responseParts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        setPortraits(prev => prev.map(p => 
          p.id === refiningPortraitId 
            ? { ...p, url: imageUrl, caption: p.caption || "" } 
            : p
        ));
        setRefiningPortraitId(null);
        setRefinementPrompt('');
      } else {
        throw new Error("未能生成修改後的照片。這可能是因為內容安全過濾或 API 限制。");
      }
    } catch (err: any) {
      console.error("Refinement error:", err);
      const errorMsg = err.message || JSON.stringify(err);
      if (errorMsg.includes("SAFETY") || errorMsg.includes("safety")) {
        setError("修改失敗：內容安全過濾 (Safety filter triggered). 請嘗試更換修改指令。");
      } else if (errorMsg.includes("500") || errorMsg.includes("Internal Server Error")) {
        setError("修改失敗：伺服器內部錯誤 (Internal Server Error). 請稍後再試。");
      } else {
        setError(err.message || "修改過程中發生錯誤，請稍後再試。");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const updateCaption = (id: string, caption: string) => {
    setPortraits(prev => prev.map(p => p.id === id ? { ...p, caption } : p));
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!refiningPortraitId || isGenerating) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    setPaths(prev => [...prev, { points: [{ x: x * scaleX, y: y * scaleY }], color: brushColor }]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !refiningPortraitId || isGenerating) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    setPaths(prev => {
      if (prev.length === 0) return prev;
      const lastPath = prev[prev.length - 1];
      // Only update if the point has actually moved significantly to reduce state updates
      const lastPoint = lastPath.points[lastPath.points.length - 1];
      const dx = x * scaleX - lastPoint.x;
      const dy = y * scaleY - lastPoint.y;
      if (Math.sqrt(dx*dx + dy*dy) < 2) return prev;

      const newPaths = [...prev];
      const updatedLastPath = { 
        ...lastPath, 
        points: [...lastPath.points, { x: x * scaleX, y: y * scaleY }] 
      };
      newPaths[newPaths.length - 1] = updatedLastPath;
      return newPaths;
    });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 10;

    paths.forEach(path => {
      ctx.strokeStyle = path.color;
      ctx.beginPath();
      path.points.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });
  }, [paths]);

  const clearCanvas = () => {
    if (isGenerating) return;
    setPaths([]);
  };
  const undoLastPath = () => {
    if (isGenerating) return;
    setPaths(prev => prev.slice(0, -1));
  };

  // Clear paths when modal closes
  React.useEffect(() => {
    if (!refiningPortraitId) {
      setPaths([]);
      setRefinementPrompt('');
    }
  }, [refiningPortraitId]);

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateCollage = useCallback(async () => {
    if (portraits.length < 6) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 3x2 grid. 3:4 aspect ratio.
    const imgWidth = 1024;
    const imgHeight = Math.floor((imgWidth * 4) / 3);
    const paddingX = 60;
    const paddingY = 100; // Increased to prevent label cutoff
    const headerHeight = 250;
    const footerHeight = 150;
    
    canvas.width = (imgWidth * 3) + (paddingX * 4);
    canvas.height = headerHeight + (imgHeight + paddingY) * 2 + footerHeight;

    // Background
    ctx.fillStyle = '#fdfaf6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#2c2c2c';
    ctx.font = 'bold 90px "Noto Serif TC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('匠心藝境・時光肖像館', canvas.width / 2, 120);
    
    // Load and draw images
    const loadImg = (url: string) => new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.src = url;
    });

    for (let i = 0; i < portraits.length; i++) {
      const img = await loadImg(portraits[i].url);
      const row = Math.floor(i / 3);
      const col = i % 3;
      
      const x = paddingX + col * (imgWidth + paddingX);
      const y = headerHeight + row * (imgHeight + paddingY);

      // Draw white border/frame
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 20;
      ctx.fillRect(x - 10, y - 10, imgWidth + 20, imgHeight + 80);
      ctx.shadowBlur = 0;

      ctx.drawImage(img, x, y, imgWidth, imgHeight);
      
      // Style label
      ctx.fillStyle = '#2c2c2c';
      ctx.font = 'bold 35px "Noto Serif TC", serif';
      ctx.textAlign = 'center';
      ctx.fillText(portraits[i].style, x + imgWidth / 2, y + imgHeight + 50);
    }

    // Footer
    ctx.fillStyle = '#888888';
    ctx.font = '28px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRAVEL THROUGH TIME AND DISCOVER YOURSELF. DESIGNED BY 蔓影蔓食.', canvas.width / 2, canvas.height - 50);

    const collageUrl = canvas.toDataURL('image/jpeg', 0.95);
    downloadImage(collageUrl, 'time-traveler-professional-collage.jpg');
  }, [portraits]);

  return (
    <div className="flex flex-col min-h-screen font-sans bg-ivory selection:bg-antique-gold/30 overflow-x-hidden">
      <div className="film-grain" />
      {/* API Key Selection Overlay */}
      <AnimatePresence>
        {hasKey === false && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-stone-900/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-8 rounded-3xl max-w-md w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-stone-800" />
              </div>
              <h2 className="text-2xl font-display font-bold text-sepia mb-4">
                歡迎來到時光肖像館
              </h2>
              <p className="text-sepia/70 mb-8 font-elegant italic text-lg">
                為了生成高品質的專業級肖像，我們需要您提供一個具備付費功能的 Google Cloud 專案 API 金鑰。
                <br />
                <span className="text-xs text-sepia/50 mt-2 block font-sans not-italic">
                  (To generate high-quality professional portraits, please provide an API key from a paid Google Cloud project.)
                </span>
              </p>
              
              {showKeyInput ? (
                <div className="space-y-4">
                  <input
                    type="password"
                    value={manualApiKey}
                    onChange={(e) => setManualApiKey(e.target.value)}
                    placeholder="輸入您的 API 金鑰 (Enter API Key)"
                    className="w-full py-3 px-4 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-200 transition-all"
                  />
                  <button
                    onClick={handleSaveManualKey}
                    className="w-full py-4 burgundy-gradient text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg"
                  >
                    儲存並繼續 (Save and Continue)
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSelectKey}
                  className="w-full py-4 burgundy-gradient text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg"
                >
                  選擇 API 金鑰 (Select API Key)
                </button>
              )}
              <p className="mt-6 text-xs text-stone-400">
                了解更多關於 <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-600">計費說明</a>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-ivory border-b border-antique-gold/20 py-10 px-4 text-center relative">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-3xl md:text-6xl font-display font-bold text-dark-green mb-4 tracking-tight">
            匠心藝境・時光肖像館
          </h1>
          <p className="text-antique-gold text-base md:text-xl tracking-[0.3em] font-elegant">
            TRAVEL THROUGH TIME AND DISCOVER YOURSELF
          </p>
          <div className="flex items-center justify-center gap-3 my-4">
            <div className="h-[1px] w-16 md:w-24 bg-gradient-to-r from-transparent via-antique-gold/60 to-transparent"></div>
            <div className="w-2 h-2 rotate-45 border border-antique-gold/60"></div>
            <div className="h-[1px] w-16 md:w-24 bg-gradient-to-r from-transparent via-antique-gold/60 to-transparent"></div>
          </div>
          <p className="text-sepia/80 font-elegant text-lg md:text-xl italic">
            "Professional Time-Travel Portrait Generator"
          </p>
        </motion.div>
      </header>

      <main className="flex-grow w-full px-4 md:px-6 py-4 md:py-8">
        <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
          
          {/* Left Sidebar: Controls */}
          <div className="lg:w-[450px] xl:w-[550px] flex-shrink">
            <section className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-xl border border-antique-gold/10 lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto custom-scrollbar">
              <h2 className="text-lg md:text-xl font-display font-bold mb-4 md:mb-6 flex items-center gap-2 text-dark-green">
                <Camera className="w-5 h-5 text-antique-gold" />
                設定與上傳 (Settings <span className="font-serif">&</span> Upload)
              </h2>
              
              <div className="flex flex-col sm:flex-row gap-6 md:gap-8">
                {/* Larger Upload Box */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative w-full sm:w-56 h-64 sm:h-72 flex-shrink-0 rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden
                    ${sourceImage ? 'border-transparent' : 'border-antique-gold/30 hover:border-antique-gold/60 bg-ivory'}
                  `}
                >
                  {sourceImage ? (
                    <>
                      <img src={sourceImage} alt="Source" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-dark-green/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                      <Upload className="w-8 h-8 text-antique-gold/40 mb-3" />
                      <p className="text-sepia text-lg font-bold">上傳照片</p>
                      <p className="text-sepia/40 text-[10px] mt-1">支援 JPG、PNG 格式</p>
                    </div>
                  )}
                </div>

                {/* Style Options next to upload */}
                <div className="w-full sm:w-64">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-bold text-dark-green">
                      選擇風格 (Styles)
                    </label>
                    <button
                      onClick={() => {
                        if (selectedStyleIds.length === STYLES.length) {
                          setSelectedStyleIds([]);
                        } else {
                          setSelectedStyleIds(STYLES.map(s => s.nameEn));
                        }
                      }}
                      className={`
                        text-[10px] px-2 py-1 rounded-md border transition-all font-bold
                        ${selectedStyleIds.length === STYLES.length
                          ? 'bg-dark-green text-white border-dark-green'
                          : 'bg-white text-sepia/60 border-antique-gold/20 hover:border-antique-gold/40'}
                      `}
                    >
                      {selectedStyleIds.length === STYLES.length ? '取消全選' : '一鍵全選'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                    {STYLES.map(style => (
                      <label 
                        key={style.nameEn}
                        className={`
                          flex items-center justify-start gap-2 p-2 px-3 rounded-lg border cursor-pointer transition-all
                          ${selectedStyleIds.includes(style.nameEn) 
                            ? 'bg-dark-green border-dark-green text-white' 
                            : 'bg-white border-antique-gold/10 text-sepia/70 hover:border-antique-gold/30'}
                        `}
                      >
                        <input 
                          type="checkbox"
                          className="hidden"
                          checked={selectedStyleIds.includes(style.nameEn)}
                          onChange={() => {
                            if (selectedStyleIds.includes(style.nameEn)) {
                              setSelectedStyleIds(selectedStyleIds.filter(id => id !== style.nameEn));
                            } else {
                              setSelectedStyleIds([...selectedStyleIds, style.nameEn]);
                            }
                          }}
                        />
                        <span className="text-xs font-medium whitespace-nowrap">{style.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
              />

              {/* Settings Fields */}
              <div className="mt-2 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-dark-green mb-2">
                      指定性別 (Gender)
                    </label>
                    <div className="flex p-1 bg-ivory border border-antique-gold/10 rounded-xl">
                      <button
                        onClick={() => setGender('male')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${gender === 'male' ? 'bg-dark-green text-white shadow-sm' : 'text-sepia/50'}`}
                      >
                        男性
                      </button>
                      <button
                        onClick={() => setGender('female')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${gender === 'female' ? 'bg-dark-green text-white shadow-sm' : 'text-sepia/50'}`}
                      >
                        女性
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-dark-green mb-2">
                      解析度 (Resolution)
                    </label>
                    <div className="flex p-1 bg-ivory border border-antique-gold/10 rounded-xl">
                      {[
                        { id: "1K", label: "標準版" },
                        { id: "2K", label: "典藏版" }
                      ].map((res) => (
                        <button
                          key={res.id}
                          onClick={() => setResolution(res.id as "1K" | "2K")}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${resolution === res.id ? 'bg-dark-green text-white shadow-sm' : 'text-sepia/50'}`}
                        >
                          {res.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  <label className="block text-sm font-bold text-dark-green mb-2">
                    補充說明 (Additional Description)
                  </label>
                  <textarea
                    value={additionalDesc}
                    onChange={(e) => setAdditionalDesc(e.target.value)}
                    placeholder="例如：保留眼鏡特徵、服裝以深色系為主、背景要有模糊的街道感⋯"
                    className="w-full py-2 px-3 bg-ivory border border-antique-gold/20 rounded-xl text-base focus:ring-2 focus:ring-antique-gold/40 focus:border-transparent transition-all resize-none h-16 text-stone-700 font-bold placeholder:text-sepia/30"
                  />
                </div>
              </div>

              <button
                disabled={!sourceImage || isGenerating || selectedStyleIds.length === 0}
                onClick={generatePortraits}
                className={`
                  w-full mt-3 h-16 rounded-xl font-bold transition-all flex items-center justify-center gap-3
                  ${!sourceImage || isGenerating || selectedStyleIds.length === 0
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed' 
                    : 'bg-vintage-red text-white hover:opacity-90 shadow-lg active:scale-[0.98]'}
                `}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-lg">生成中 ({Math.round(progress)}%)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    <span className="text-xl tracking-wider">
                      生成你的時光肖像 <span className="font-display font-bold">(Generate)</span>
                    </span>
                  </>
                )}
              </button>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100"
                >
                  {error}
                </motion.div>
              )}
            </section>
          </div>

          {/* Right Column: Results Gallery */}
          <div className="flex-1 space-y-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold text-dark-green flex items-center gap-2">
                <Grid className="w-5 h-5 text-antique-gold" />
                時光畫廊 (Time Gallery)
              </h2>
              
              {portraits.length >= 6 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={generateCollage}
                  className="px-4 py-2 bg-white border-2 border-antique-gold text-antique-gold rounded-lg font-bold hover:bg-ivory transition-all flex items-center gap-2 shadow-sm text-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  下載合集 (Collage)
                </motion.button>
              )}
            </div>

            {portraits.length === 0 && !isGenerating ? (
              <div className="w-full aspect-[16/9] min-h-[300px] md:min-h-[640px] flex flex-col items-center justify-center border-2 border-dashed border-antique-gold/20 rounded-[40px] bg-white/40 backdrop-blur-sm">
                <ImageIcon className="w-16 h-16 md:w-24 md:h-24 mb-4 md:mb-6 text-antique-gold/20" />
                <p className="text-xl md:text-3xl font-display italic text-antique-gold/40 font-medium tracking-wider">等待開啟時光之門</p>
                <p className="text-antique-gold/30 text-sm md:text-lg mt-2 font-elegant italic">Waiting to open the gate of time</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 pb-12">
                <AnimatePresence mode="popLayout">
                  {portraits.map((portrait, idx) => (
                    <motion.div
                      key={portrait.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="group relative"
                    >
                      <div className="nostalgic-border bg-white rounded-sm overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500">
                        <div className="aspect-[3/4] relative overflow-hidden">
                          <img 
                            src={portrait.url} 
                            alt={portrait.style} 
                            className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110 sepia-[0.2] contrast-[1.1]"
                          />
                          <div className="absolute inset-0 bg-dark-green/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button
                              onClick={() => setPreviewImageUrl(portrait.url)}
                              className="bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-colors"
                              title="Preview this portrait"
                            >
                              <Maximize className="w-6 h-6 text-dark-green" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRefiningPortraitId(portrait.id);
                              }}
                              className="bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-colors"
                              title="修改此照片 (Refine this portrait)"
                            >
                              <Edit3 className="w-6 h-6 text-dark-green" />
                            </button>
                          </div>
                          
                          {/* Quick Download Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImage(portrait.url, `portrait-${portrait.styleEn.toLowerCase().replace(/ /g, '-')}.jpg`);
                            }}
                            className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white text-dark-green transition-all z-10 opacity-0 group-hover:opacity-100"
                            title="直接下載 (Quick Download)"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-4 text-center border-t border-antique-gold/10 bg-ivory/50">
                          <p className="font-display font-bold text-dark-green text-lg leading-tight">{portrait.style}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {isGenerating && Array.from({ length: Math.max(0, selectedStyleIds.length - portraits.length) }).map((_, i) => (
                    <motion.div 
                      key={`loading-${i}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="aspect-[3/4] bg-white/40 backdrop-blur-sm rounded-sm flex flex-col items-center justify-center text-antique-gold/40 animate-pulse border-2 border-dashed border-antique-gold/20"
                    >
                      <Loader2 className="w-10 h-10 animate-spin mb-4" />
                      <p className="text-sm font-elegant italic">時光顯影中...</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Refinement Modal */}
      <AnimatePresence>
        {refiningPortraitId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRefiningPortraitId(null)}
              className="absolute inset-0 bg-dark-green/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-3xl bg-ivory rounded-[40px] shadow-2xl overflow-hidden border border-antique-gold/20"
            >
              <div className="p-6 md:p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-display font-bold text-dark-green flex items-center gap-3">
                    <Edit3 className="w-6 h-6 text-antique-gold" />
                    修改肖像 (Refine Portrait)
                  </h3>
                  <button 
                    onClick={() => setRefiningPortraitId(null)}
                    className="p-2 hover:bg-antique-gold/10 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-sepia/50" />
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-10">
                  {/* Left Column: Large Image with Canvas */}
                  <div className="w-full md:w-[45%]">
                    <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border-8 border-white ring-1 ring-antique-gold/10 relative group">
                      <img 
                        src={portraits.find(p => p.id === refiningPortraitId)?.url} 
                        alt="To refine" 
                        className="w-full h-full object-cover absolute inset-0"
                      />
                      <canvas
                        ref={canvasRef}
                        width={1024}
                        height={1365}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                      />
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <button 
                          onClick={undoLastPath}
                          className="p-2 bg-white/90 rounded-full shadow-md hover:bg-white text-dark-green transition-all"
                          title="復原 (Undo)"
                        >
                          <Undo2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={clearCanvas}
                          className="p-2 bg-white/90 rounded-full shadow-md hover:bg-white text-dark-green transition-all"
                          title="清除 (Clear)"
                        >
                          <Eraser className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex flex-col items-center gap-3">
                      <div className="flex gap-3 p-2 bg-antique-gold/5 rounded-full border border-antique-gold/10">
                        {['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ffffff'].map(color => (
                          <button
                            key={color}
                            onClick={() => setBrushColor(color)}
                            className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${brushColor === color ? 'scale-125 border-dark-green shadow-md' : 'border-white shadow-sm'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="text-[10px] text-center text-sepia/50 italic leading-relaxed">
                        <p>提示：您可以使用畫筆圈選想要修改的地方</p>
                        <p>(Tip: Use the brush to mark areas to refine)</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Controls */}
                  <div className="flex-1 flex flex-col">
                    <div className="mb-6">
                      <p className="text-sm text-sepia/70 leading-relaxed mb-4">
                        您正在修改 <span className="font-bold text-dark-green">{portraits.find(p => p.id === refiningPortraitId)?.style}</span> 風格的肖像。
                      </p>
                      <div className="p-4 bg-antique-gold/5 rounded-2xl border border-antique-gold/10 italic text-xs text-sepia/60 leading-relaxed">
                        AI 將會在保留原圖背景與構圖的基礎上進行修改，請在下方輸入具體的調整細節。
                      </div>
                    </div>

                    <div className="flex-1 space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-dark-green mb-2">
                          修改指令 (Refinement Request)
                        </label>
                        <textarea
                          value={refinementPrompt}
                          onChange={(e) => setRefinementPrompt(e.target.value)}
                          placeholder="例如：更換髮型、更改衣服顏色、移除物件⋯"
                          className="w-full p-4 bg-white border border-antique-gold/20 rounded-2xl text-base focus:ring-2 focus:ring-antique-gold/40 focus:border-transparent transition-all resize-none h-48 text-stone-700 font-bold placeholder:text-sepia/30 shadow-inner"
                        />
                      </div>

                      <button
                        disabled={!refinementPrompt || isGenerating}
                        onClick={refinePortrait}
                        className={`
                          w-full h-16 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg
                          ${!refinementPrompt || isGenerating
                            ? 'bg-stone-200 text-stone-400 cursor-not-allowed' 
                            : 'bg-vintage-red text-white hover:opacity-90 active:scale-[0.98]'}
                        `}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-xl">修改中...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            <span className="text-xl">確認修改 (Apply Refinement)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Screen Preview Modal */}
      <AnimatePresence>
        {previewImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/95 backdrop-blur-xl"
            onClick={() => setPreviewImageUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setPreviewImageUrl(null)}
                className="absolute top-0 right-0 md:-top-10 md:-right-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white z-10"
              >
                <X className="w-8 h-8" />
              </button>

              <div className="relative w-full h-full flex items-center justify-center">
                <img 
                  src={previewImageUrl} 
                  alt="Preview" 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border-4 border-white/10"
                />
                
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
                  <button
                    onClick={() => {
                      const portrait = portraits.find(p => p.url === previewImageUrl);
                      if (portrait) {
                        downloadImage(portrait.url, `portrait-${portrait.styleEn.toLowerCase().replace(/ /g, '-')}.jpg`);
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white/30 backdrop-blur-md text-white rounded-full font-bold shadow-md hover:bg-white hover:text-dark-green transition-all active:scale-95 text-xs border border-white/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>下載照片 (Download)</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-dark-green text-ivory py-10 px-4 mt-auto w-full min-w-full relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-16 bg-antique-gold"></div>
            <History className="w-8 h-8 text-antique-gold" />
            <div className="h-px w-16 bg-antique-gold"></div>
          </div>
          <p className="text-antique-gold font-display font-bold text-2xl mb-1 tracking-wide">屏東職人町</p>
          <p className="text-ivory/60 text-sm mb-4 font-elegant tracking-wide">
            屏東縣屏東市仁德路<span className="font-sans">43</span>巷<span className="font-sans">6</span>號
          </p>
          <div className="h-px w-full max-w-xs bg-antique-gold/20 mx-auto mb-4"></div>
          <p className="text-ivory/40 text-[10px] tracking-widest uppercase italic">
            © 2026 匠心藝境・時光肖像館. DESIGNED BY 蔓影蔓食. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
