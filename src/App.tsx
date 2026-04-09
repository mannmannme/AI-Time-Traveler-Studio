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
  RefreshCw,
  Sparkles,
  Grid,
  Edit3,
  X,
  Eraser,
  Undo2,
  Maximize,
  Key
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
  status?: 'success' | 'error' | 'refining';
  errorMsg?: string;
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
    prompt: "A Renaissance oil painting portrait. Preserve subject's identity, features, and gender. Subject as a 16th-century noble in elegant attire (men: doublet/velvet cap; women: graceful gown/braided hair). Expression: Subtle, reserved, no toothy smile, composed and dignified look. Style: Museum-quality realism, soft chiaroscuro, sfumato finish. Background: Dark neutral depth. Composition: Tight half-body, filling 85% of frame, 3:4 vertical. Mood: Timeless, dignified."
  },
  {
    name: "大正浪漫 (Taisho Romance)",
    nameEn: "Taisho Romance",
    prompt: "A Taisho Roman studio portrait. Preserve subject's identity and features. Subject in elegant 1920s Japanese attire (women: a well-structured pleated hakama skirt with a lace-collared blouse; men: formal kimono or gakuran). Pose: Subject facing directly forward towards the camera to ensure a symmetrical and solid silhouette. Props: The subject may be holding EITHER a vintage book OR a traditional folding fan (choose only one). Hair & Appearance: Youthful 'Haikara' style with flowing hair or ribbons. Style: Vintage sepia-toned photography, soft diffused studio lighting. Background: A rich East-meets-West interior featuring traditional shoji screens, dark wooden bookshelves, a vintage globe, a classic pendulum clock, and lush green potted ferns. Composition: Tight half-body, filling 85% of frame, 3:4 vertical. Mood: Nostalgic, romantic, intellectual elegance."
  },
  {
    name: "好萊塢默片 (Silent Glamour)",
    nameEn: "Silent Glamour",
    prompt: "A 1920s Hollywood silent film portrait. Preserve subject's identity and features. Style: Classic black and white, high-contrast chiaroscuro, natural film grain. Attire: 1920s glamour (women: flapper gown/waves; men: tuxedo/slicked hair). Expression: Gentle closed-lip smile. Composition: Tight upper-body, filling 85% of frame, 3:4 vertical. Mood: Dramatic, timeless elegance."
  },
  {
    name: "臺灣風華年代 (Formosa Radiance)",
    nameEn: "Formosa Radiance",
    prompt: "A 1970s Taiwan cinematic portrait. Preserve subject's identity and features. Composition: Tight half-body portrait, subject MUST fill 85% of the frame, 3:4 vertical. Style: Vintage film aesthetic, warm Kodak tones, soft grain. Attire: 1970s retro fashion (patterned shirts, flared pants). Hair: Natural and airy 1970s hairstyles (women: soft natural waves or a light middle part with a breezy, effortless feel; men: clean and natural side-part or slightly layered hair, avoiding excessive volume). Accessories: The subject may naturally carry a vintage brown leather handbag or shoulder satchel, and wear a classic analog wristwatch. Background: A diverse 1970s Taiwan streetscape, ranging from traditional arcades (Qilou) with stone arches to narrow alleys with nostalgic shop signs or blurred neon lights. The scene may naturally include period-accurate elements like parked vintage scooters or motorcycles in the background. Extremely shallow depth of field with heavy bokeh to keep focus on the subject. Ensure no legible text on signs. No other people or bystanders. Mood: Warm, nostalgic, and humanistic."
  },
  {
    name: "當代時尚 (Contemporary Fashion)",
    nameEn: "Contemporary Fashion",
    prompt: "A modern luxury fashion campaign portrait. Preserve subject's identity and features. Style: High-end editorial, timeless prestige, international advertisement aesthetic. Attire: Sophisticated designer couture (minimalist gowns or sharp tailored suits). Lighting: Soft diffused luxury studio lighting. Background: Minimalist upscale architectural space. Composition: Prominent half-body, filling 85% of frame, 3:4 vertical. Mood: Confident, quietly powerful, modern icon."
  },
  {
    name: "未來紀元 (Future Epoch)",
    nameEn: "Future Epoch",
    prompt: "A futuristic portrait of intelligent elegance. Preserve subject's identity and features. Style: Advanced luxury future aesthetic, clean cinematic clarity. Attire: Sculptural minimalist couture with geometric lines. Background: Panoramic intelligent architectural space with ambient glow. Composition: Half-body, 3:4 vertical. Mood: Visionary, refined."
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
  const [isRefining, setIsRefining] = useState(false);
  const [portraits, setPortraits] = useState<GeneratedPortrait[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [manualApiKey, setManualApiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [subjectType, setSubjectType] = useState<'human' | 'pet'>('human');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [additionalDesc, setAdditionalDesc] = useState('');
  const [generationMode, setGenerationMode] = useState<'quick' | 'full'>('quick');
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);
  const [refiningPortraitId, setRefiningPortraitId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [brushColor, setBrushColor] = useState('#ef4444');
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<{ points: { x: number; y: number }[]; color: string }[]>([]);
  const [shouldStop, setShouldStop] = useState(false);
  const [coolingTime, setCoolingTime] = useState(0);
  const [isChangingKey, setIsChangingKey] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [selectionError, setSelectionError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeGenerationIdRef = useRef<number>(0);
  const crawlIntervalRef = useRef<any>(null);

  const translateError = (msg: string) => {
    if (!msg) return "顯影失敗";
    const lowerMsg = msg.toLowerCase();
    if (lowerMsg.includes("503") || lowerMsg.includes("unavailable")) return "時光機暫時繁忙，請稍後再次啟動";
    if (lowerMsg.includes("429") || lowerMsg.includes("resource_exhausted")) return "時光機能量耗盡 (API 額度已達上限)";
    if (lowerMsg.includes("401") || lowerMsg.includes("api_key_invalid")) return "時光通行證失效，請重新驗證金鑰";
    if (lowerMsg.includes("safety")) return "此影像超出了時光機的安全顯影範圍";
    if (lowerMsg.includes("load failed")) return "時光訊號不穩定，影像傳輸中斷";
    return "時光流轉中發生了不可預期的擾動";
  };

  // --- Helper: Base64 to Blob URL ---
  const base64ToBlobUrl = (base64: string, mimeType: string): string => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return URL.createObjectURL(blob);
  };

  // --- Helper: Blob URL to Base64 ---
  const blobUrlToBase64 = async (blobUrl: string): Promise<{ base64: string, mimeType: string }> => {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        const mimeType = result.split(',')[0].split(':')[1].split(';')[0];
        resolve({ base64, mimeType });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // --- Helper: Resize Image with Timeout ---
  const resizeImage = (base64: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn("Resize timeout, using original image");
        resolve(base64);
      }, 5000);

      const img = new Image();
      img.onload = () => {
        clearTimeout(timeout);
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else {
          if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL('image/jpeg', 0.85)); }
        else { resolve(base64); }
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve(base64);
      };
      img.src = base64;
    });
  };

  React.useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) { setManualApiKey(savedKey); setHasKey(true); }
        else { setHasKey(false); setShowKeyInput(true); }
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const prevPortraitsRef = useRef<GeneratedPortrait[]>([]);
  React.useEffect(() => {
    const prevUrls = new Set<string>(prevPortraitsRef.current.map(p => p.url));
    const currentUrls = new Set<string>(portraits.map(p => p.url));
    
    prevUrls.forEach((url: string) => {
      if (!currentUrls.has(url) && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    
    prevPortraitsRef.current = portraits;
  }, [portraits]);

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
      setIsChangingKey(false);
    }
  };

  const generatePortraits = async () => {
    if (!sourceImage) return;
    
    // Increment generation ID to invalidate any previous running loops
    const generationId = ++activeGenerationIdRef.current;
    
    setIsGenerating(true);
    setPortraits([]);
    setProgress(0);
    setStatusText('正在準備照片數據...');
    setError(null);
    setShouldStop(false);

    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || manualApiKey;
    if (!apiKey) {
      setError("找不到 API 金鑰，請重新選擇。");
      setHasKey(false);
      setIsGenerating(false);
      return;
    }

    const stylesToGenerate = STYLES.filter(s => selectedStyleIds.includes(s.nameEn));
    const totalStyles = stylesToGenerate.length;
    
    if (totalStyles === 0) {
      setError("請至少選擇一個風格。");
      setIsGenerating(false);
      return;
    }

    let completedCount = 0;
    
    if (crawlIntervalRef.current) clearInterval(crawlIntervalRef.current);
    console.log("Starting generation for styles:", stylesToGenerate.map(s => s.nameEn));

    try {
      const ai = new GoogleGenAI({ apiKey });
      const modelName = "gemini-3.1-flash-image-preview";

      // Start a crawling progress interval for initial generation
      crawlIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          const nextMilestone = ((completedCount + 1) / totalStyles) * 100;
          if (prev < nextMilestone - 1) {
            return prev + (nextMilestone - prev) * 0.05;
          }
          return prev;
        });
      }, 500);
      
      // 1. Resize image with safety check
      setStatusText('正在優化照片尺寸 (不消耗 Token)...');
      const resizedImage = await resizeImage(sourceImage);
      if (generationId !== activeGenerationIdRef.current) return;
      
      const base64Data = resizedImage.split(',')[1];
      const mimeType = resizedImage.split(',')[0].split(':')[1].split(';')[0];

      setStatusText('正在開啟時光之門...');

      // 3. Generation Loop
      for (const style of stylesToGenerate) {
        if (generationId !== activeGenerationIdRef.current) break;

        const isLastStyle = completedCount === totalStyles - 1;
        
        // Cooling Logic
        if (completedCount > 0) {
          const isSegmentBreak = completedCount % 3 === 0;
          let waitSeconds = isSegmentBreak ? 3 : 1;
          
          while (waitSeconds > 0 && generationId === activeGenerationIdRef.current) {
            setStatusText(`時光機冷卻中 (${waitSeconds}s)...`);
            setCoolingTime(waitSeconds);
            await new Promise(resolve => setTimeout(resolve, 1000));
            waitSeconds--;
          }
          setCoolingTime(0);
        }

        if (generationId !== activeGenerationIdRef.current) break;

        let attempts = 0;
        const maxAttempts = 2; 
        let success = false;

        while (attempts < maxAttempts && !success && generationId === activeGenerationIdRef.current) {
          try {
            setStatusText(`正在向 AI 請求顯影：${style.name}...`);
            
            const isHistorical = ["Renaissance Majesty", "Taisho Romance", "Silent Glamour", "Formosa Radiance"].includes(style.nameEn);
            
            let subjectTypeStr = subjectType === 'pet' ? `${gender} pet` : gender;
            let identityRequirement = subjectType === 'pet' 
              ? `Preserve original species and facial features of the pet. Do not humanize the face. The pet is ${gender}.` 
              : `Preserve subject's identity, features, and original gender (${gender}). Maintain original age and body type.`;

            // Text/Typography Logic
            let textRequirement = "";
            if (subjectType === 'human') {
              textRequirement = "Strictly no typography, overlay text, logos, or watermarks. Ensure no legible text on signs or backgrounds. Text on small handheld objects like books is allowed.";
            } else {
              if (style.nameEn === 'Contemporary Fashion') {
                // Allow natural randomness for pet fashion
                textRequirement = ""; 
              } else {
                textRequirement = "Strictly no typography, overlay text, or logos on the image.";
              }
            }

            const promptText = `Transform this ${subjectTypeStr} into a ${style.nameEn}. ${style.prompt} 
            ${additionalDesc ? `User request: ${additionalDesc}` : ''}
            Requirements: ${identityRequirement}
            ${textRequirement}
            ${subjectType === 'pet' ? `The pet should be wearing the elegant historical or fashion attire appropriate for a ${gender} of that era, but keep its animal head and face.` : ''}
            ${isHistorical ? `Historical accuracy: No modern technology.` : ''}
            High-resolution photorealistic portrait, 3:4 ratio.`;

            const response = await ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [
                  { inlineData: { data: base64Data, mimeType: mimeType } },
                  { text: promptText }
                ]
              },
              config: {
                imageConfig: { aspectRatio: "3:4", imageSize: "1K" }
              }
            });

            if (generationId !== activeGenerationIdRef.current) break;

            const candidates = response.candidates || [];
            if (candidates.length > 0) {
              const parts = candidates[0].content?.parts || [];
              let imageUrl = "";
              for (const part of parts) {
                if (part.inlineData) {
                  imageUrl = base64ToBlobUrl(part.inlineData.data, 'image/png');
                  break;
                }
              }

              if (imageUrl) {
                setStatusText(`${style.name} 顯影成功！`);
                setPortraits(prev => [...prev, {
                  id: Math.random().toString(36).substr(2, 9),
                  style: style.name,
                  styleEn: style.nameEn,
                  url: imageUrl,
                  prompt: style.prompt,
                  status: 'success'
                }]);
                success = true;
              }
            }
            
            if (!success) throw new Error("Empty response");

          } catch (err: any) {
            if (generationId !== activeGenerationIdRef.current) break;
            attempts++;
            console.error(`Error generating ${style.nameEn}:`, err);
            if (attempts >= maxAttempts) {
              setPortraits(prev => [...prev, {
                id: Math.random().toString(36).substr(2, 9),
                style: style.name,
                styleEn: style.nameEn,
                url: "",
                prompt: style.prompt,
                status: 'error',
                errorMsg: err.message || "生成失敗"
              }]);
            } else {
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }
        }
        
        completedCount++;
        const targetProgress = (completedCount / totalStyles) * 100;
        
        if (completedCount < totalStyles) {
          setStatusText('準備穿越至下一個時空節點...');
        } else {
          setStatusText('時光旅程圓滿達成，您的時光肖像已完美定格。');
          // Wait for 3 seconds so user can read the final message
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Smoothly animate to the next progress point
        const currentProgress = progress;
        const diff = targetProgress - currentProgress;
        const steps = 10;
        for (let i = 1; i <= steps; i++) {
          if (generationId !== activeGenerationIdRef.current) break;
          setProgress(currentProgress + (diff * (i / steps)));
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    } catch (err: any) {
      if (generationId === activeGenerationIdRef.current) {
        console.error("Fatal error:", err);
        setError(err.message || "生成過程中發生錯誤。");
      }
    } finally {
      if (generationId === activeGenerationIdRef.current) {
        if (crawlIntervalRef.current) {
          clearInterval(crawlIntervalRef.current);
          crawlIntervalRef.current = null;
        }
        setIsGenerating(false);
        setCoolingTime(0);
      }
    }
  };

  const handleStopGeneration = () => {
    // Incrementing the ID will cause all checks in generatePortraits to fail
    activeGenerationIdRef.current++;
    setShouldStop(true);
    setIsGenerating(false);
    setCoolingTime(0);
  };

  const handleChangeApiKey = () => {
    setHasKey(false);
    setShowKeyInput(true);
    setIsChangingKey(true);
    setManualApiKey('');
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setManualApiKey('');
    setHasKey(false);
    setShowKeyInput(true);
    setIsChangingKey(false); // No "X" button because it's cleared
  };

  const refinePortrait = async () => {
    console.log("Refine Portrait started", { refiningPortraitId, refinementPrompt });
    if (!refiningPortraitId || !refinementPrompt) {
      console.warn("Missing refiningPortraitId or refinementPrompt");
      return;
    }
    const targetPortrait = portraits.find(p => p.id === refiningPortraitId);
    if (!targetPortrait) {
      console.error("Target portrait not found", refiningPortraitId);
      return;
    }

    setIsGenerating(false);
    setIsRefining(true);
    setProgress(0);
    setError(null);
    
    const progressInterval = setInterval(() => {
      setProgress(prev => (prev < 95 ? prev + (95 - prev) * 0.1 : prev));
    }, 500);

    // Update portrait status to refining
    setPortraits(prev => prev.map(p => p.id === refiningPortraitId ? { ...p, status: 'refining' } : p));

    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || manualApiKey;
    if (!apiKey) {
      setError("找不到 API 金鑰。");
      setHasKey(false);
      setIsGenerating(false);
      return;
    }

    try {
      console.log("Converting blob URL to base64...");
      const { base64: base64Data, mimeType } = await blobUrlToBase64(targetPortrait.url);

      let markupBase64 = null;
      if (canvasRef.current && paths.length > 0) {
        console.log("Capturing canvas markup...");
        markupBase64 = canvasRef.current.toDataURL('image/png').split(',')[1];
      }

      const parts: any[] = [{ inlineData: { data: base64Data, mimeType: mimeType } }];
      if (markupBase64) {
        parts.push({ inlineData: { data: markupBase64, mimeType: 'image/png' } });
      }

      const refinePromptText = `Refine this portrait: ${refinementPrompt}. 
      Maintain the same style (${targetPortrait.styleEn}), background, and composition. 
      Only modify requested elements. Preserve facial identity.
      Aesthetic beauty is priority. No aging or weight gain.
      Output: High-resolution photorealistic portrait, 3:4 ratio.`;

      parts.push({ text: refinePromptText });

      console.log("Calling Gemini API for refinement...");
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3.1-flash-image-preview";
      
      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: parts },
        config: {
          imageConfig: {
            aspectRatio: "3:4", 
            imageSize: "1K"
          }
        }
      });

      console.log("API response received");
      let imageUrl = "";
      const responseParts = response.candidates?.[0]?.content?.parts || [];
      for (const part of responseParts) {
        if (part.inlineData) {
          imageUrl = base64ToBlobUrl(part.inlineData.data, 'image/png');
          break;
        }
      }

      if (imageUrl) {
        console.log("New image URL created, updating portraits...");
        setPortraits(prev => prev.map(p => p.id === refiningPortraitId ? { ...p, url: imageUrl, status: 'success' } : p));
        setRefiningPortraitId(null);
        setRefinementPrompt('');
        setPaths([]);
      } else {
        throw new Error("API did not return an image.");
      }
    } catch (err: any) {
      console.error("Refinement error:", err);
      setError(err.message || "修改過程中發生錯誤。");
    } finally {
      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => {
        setIsRefining(false);
        setProgress(0);
      }, 1000);
    }
  };

  const handleSingleRegenerate = async (portraitId: string) => {
    if (!portraitId || !sourceImage) return;
    const targetPortrait = portraits.find(p => p.id === portraitId);
    if (!targetPortrait) return;

    const style = STYLES.find(s => s.nameEn === targetPortrait.styleEn);
    if (!style) return;

    setIsRefining(true);
    setError(null);
    setProgress(0);
    
    const progressInterval = setInterval(() => {
      setProgress(prev => (prev < 95 ? prev + (95 - prev) * 0.1 : prev));
    }, 500);
    
    // Update portrait status to refining
    setPortraits(prev => prev.map(p => p.id === portraitId ? { ...p, status: 'refining', errorMsg: undefined } : p));

    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || manualApiKey;
    if (!apiKey) {
      setError("找不到 API 金鑰。");
      setIsRefining(false);
      clearInterval(progressInterval);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const modelName = "gemini-3.1-flash-image-preview";
      const resizedImage = await resizeImage(sourceImage);
      const base64Data = resizedImage.split(',')[1];
      const mimeType = resizedImage.split(',')[0].split(':')[1].split(';')[0];

      const isHistorical = ["Renaissance Majesty", "Taisho Romance", "Silent Glamour", "Formosa Radiance"].includes(style.nameEn);
      
      let subjectTypeStr = subjectType === 'pet' ? `${gender} pet` : gender;
      let identityRequirement = subjectType === 'pet' 
        ? `Preserve original species and facial features of the pet. Do not humanize the face. The pet is ${gender}.` 
        : `Preserve subject's identity, features, and original gender (${gender}). Maintain original age and body type.`;

      // Text/Typography Logic
      let textRequirement = "";
      if (subjectType === 'human') {
        textRequirement = "Strictly no typography, overlay text, logos, or watermarks. Ensure no legible text on signs or backgrounds. Text on small handheld objects like books is allowed.";
      } else {
        if (style.nameEn === 'Contemporary Fashion') {
          // Allow natural randomness for pet fashion
          textRequirement = "";
        } else {
          textRequirement = "Strictly no typography, overlay text, or logos.";
        }
      }

      const promptText = `Transform this ${subjectTypeStr} into a ${style.nameEn}. ${style.prompt} 
      ${additionalDesc ? `User request: ${additionalDesc}` : ''}
      Requirements: ${identityRequirement}
      ${textRequirement}
      ${subjectType === 'pet' ? `The pet should be wearing the elegant historical or fashion attire appropriate for a ${gender} of that era, but keep its animal head and face.` : ''}
      ${isHistorical ? `Historical accuracy: No modern technology.` : ''}
      High-resolution photorealistic portrait, 3:4 ratio.`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: mimeType } },
            { text: promptText }
          ]
        },
        config: {
          imageConfig: { aspectRatio: "3:4", imageSize: "1K" }
        }
      });

      const candidates = response.candidates || [];
      if (candidates.length > 0) {
        const parts = candidates[0].content?.parts || [];
        let imageUrl = "";
        for (const part of parts) {
          if (part.inlineData) {
            imageUrl = base64ToBlobUrl(part.inlineData.data, 'image/png');
            break;
          }
        }

        if (imageUrl) {
          setPortraits(prev => prev.map(p => p.id === portraitId ? { ...p, url: imageUrl, status: 'success' } : p));
          if (refiningPortraitId === portraitId) {
            setRefiningPortraitId(null);
            setRefinementPrompt('');
            setPaths([]);
          }
        } else {
          throw new Error("API did not return an image.");
        }
      }
    } catch (err: any) {
      console.error("Regeneration error:", err);
      setError(err.message || "重新生成過程中發生錯誤。");
      setPortraits(prev => prev.map(p => p.id === portraitId ? { ...p, status: 'error', errorMsg: err.message } : p));
    } finally {
      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => {
        setIsRefining(false);
        setProgress(0);
      }, 1000);
    }
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
      const newPaths = [...prev];
      newPaths[newPaths.length - 1] = { ...lastPath, points: [...lastPath.points, { x: x * scaleX, y: y * scaleY }] };
      return newPaths;
    });
  };

  const stopDrawing = () => setIsDrawing(false);

  const undoLastPath = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  const clearCanvas = () => {
    setPaths([]);
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

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateCollage = useCallback(async () => {
    const successfulPortraits = portraits.filter(p => p.status === 'success');
    const count = successfulPortraits.length;
    if (count < 1) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Optimized layout: 1 col for 1, 2 cols for 2/4, 3 cols for 3/5/6+
    const cols = count === 4 ? 2 : Math.min(count, 3);
    const rows = Math.ceil(count / cols);

    const imgWidth = 1024;
    const imgHeight = Math.floor((imgWidth * 4) / 3);
    const paddingX = 60;
    const paddingY = 100;
    const headerHeight = 250;
    const footerHeight = 150;

    canvas.width = (imgWidth * cols) + (paddingX * (cols + 1));
    canvas.height = headerHeight + (imgHeight + paddingY) * rows + footerHeight;

    ctx.fillStyle = '#fdfaf6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#2c2c2c';
    ctx.font = 'bold 90px "Noto Serif TC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('匠心藝境・時光肖像館', canvas.width / 2, 140);
    
    ctx.font = '40px "Playfair Display", "Noto Serif TC", serif';
    ctx.fillStyle = '#888888';
    // @ts-ignore - letterSpacing is supported in modern browsers
    ctx.letterSpacing = '2px';
    ctx.fillText('TRAVEL THROUGH TIME AND DISCOVER YOURSELF', canvas.width / 2, 205);
    // @ts-ignore
    ctx.letterSpacing = '0px'; // Reset for other text

    const loadImg = (url: string) => new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.src = url;
    });

    for (let i = 0; i < successfulPortraits.length; i++) {
      const img = await loadImg(successfulPortraits[i].url);
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      // Dynamic centering for the last row if it's not full
      let offsetX = 0;
      const isLastRow = row === rows - 1;
      const itemsInLastRow = count % cols || cols;
      if (isLastRow && itemsInLastRow < cols) {
        offsetX = ((cols - itemsInLastRow) * (imgWidth + paddingX)) / 2;
      }

      const x = paddingX + col * (imgWidth + paddingX) + offsetX;
      const y = headerHeight + row * (imgHeight + paddingY);
      
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 20;
      ctx.fillRect(x - 10, y - 10, imgWidth + 20, imgHeight + 80);
      ctx.shadowBlur = 0;
      ctx.drawImage(img, x, y, imgWidth, imgHeight);
      
      ctx.fillStyle = '#2c2c2c';
      ctx.font = 'bold 35px "Noto Serif TC", serif';
      ctx.textAlign = 'center';
      ctx.fillText(successfulPortraits[i].style, x + imgWidth / 2, y + imgHeight + 50);
    }
    
    ctx.fillStyle = '#888888';
    ctx.font = 'italic 32px "Playfair Display", "Noto Serif TC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Professional Time-Travel Portraits. Designed By 蔓影蔓食.', canvas.width / 2, canvas.height - 70);
    
    const collageUrl = canvas.toDataURL('image/jpeg', 0.95);
    downloadImage(collageUrl, 'portrait-album.jpg');
  }, [portraits]);

  return (
    <div className="flex flex-col min-h-screen font-sans bg-ivory selection:bg-antique-gold/30 overflow-x-hidden">
      <div className="film-grain" />
      <AnimatePresence>
        {hasKey === false && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-stone-900/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-8 rounded-[40px] max-w-[460px] w-full text-center shadow-2xl border border-antique-gold/10 relative">
              {isChangingKey && (
                <button 
                  onClick={() => { 
                    setHasKey(true); 
                    setIsChangingKey(false); 
                    const savedKey = localStorage.getItem('gemini_api_key');
                    if (savedKey) setManualApiKey(savedKey);
                  }} 
                  className="absolute top-6 right-6 p-2 hover:bg-stone-100 rounded-full transition-colors z-10"
                >
                  <X className="w-5 h-5 text-stone-400" />
                </button>
              )}
              <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-stone-100">
                <Sparkles className="w-10 h-10 text-stone-800" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-display font-bold text-sepia mb-5">歡迎來到時光肖像館</h2>
              <div className="space-y-3 mb-8">
                <p className="text-sepia/80 font-display font-bold text-[16px] leading-relaxed px-2">
                  為了生成高品質的專業級肖像，我們需要您提供一個<br className="hidden sm:block" />具備付費功能的 Google Cloud 專案 API 金鑰。
                </p>
                <p className="text-sepia/40 text-[15px] font-display italic px-4 leading-tight">
                  (To generate high-quality professional portraits, please provide an API key from a paid Google Cloud project.)
                </p>
              </div>
              
              <div className="space-y-5">
                <input 
                  type="password" 
                  value={manualApiKey} 
                  onChange={(e) => setManualApiKey(e.target.value)} 
                  placeholder="輸入您的 API 金鑰 (Enter API Key)" 
                  className="w-full py-3.5 px-6 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:ring-2 focus:ring-antique-gold/20 outline-none transition-all text-center font-display font-bold" 
                />
                <button 
                  onClick={handleSaveManualKey} 
                  className="w-full py-4 bg-gradient-to-b from-[#A01A1A] to-[#800000] text-white rounded-2xl font-display font-bold text-base shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <span>儲存並繼續 (Save and Continue)</span>
                </button>
                <div className="pt-1 text-[11px] text-sepia/40 font-display font-bold">
                  瞭解更多關於{" "}
                  <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-sepia/60 underline underline-offset-4 decoration-sepia/20 transition-colors"
                  >
                    計費說明
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-ivory border-b border-antique-gold/20 py-10 px-4 text-center relative">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-6xl font-display font-bold text-dark-green mb-4 tracking-tight">匠心藝境・時光肖像館</h1>
          <p className="text-antique-gold text-base md:text-xl tracking-[0.5em] font-elegant font-bold">TRAVEL THROUGH TIME AND DISCOVER YOURSELF</p>
          <div className="flex items-center justify-center gap-3 my-4"><div className="h-[1px] w-16 md:w-24 bg-gradient-to-r from-transparent via-antique-gold/60 to-transparent"></div><div className="w-2 h-2 rotate-45 border border-antique-gold/60"></div><div className="h-[1px] w-16 md:w-24 bg-gradient-to-r from-transparent via-antique-gold/60 to-transparent"></div></div>
          <p className="text-sepia/80 font-elegant text-lg md:text-xl italic">"Professional Time-Travel Portrait Generator"</p>
        </motion.div>
      </header>

      <main className="flex-grow w-full px-4 md:px-6 py-4 md:py-8">
        <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
          <div className="lg:w-[450px] xl:w-[550px] flex-shrink">
            <section className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-xl border border-antique-gold/10 lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto custom-scrollbar">
              <h2 className="text-lg md:text-xl font-display font-bold mb-4 md:mb-6 flex items-center gap-2 text-dark-green"><Camera className="w-5 h-5 text-antique-gold" />設定與上傳</h2>
              <div className="flex flex-col sm:flex-row gap-6 md:gap-8">
                <div className="flex flex-col w-full sm:w-56">
                  <div onClick={() => fileInputRef.current?.click()} className={`relative w-full h-64 sm:h-72 flex-shrink-0 rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${sourceImage ? 'border-transparent' : 'border-antique-gold/30 hover:border-antique-gold/60 bg-ivory'}`}>
                    {sourceImage ? (
                      <img src={sourceImage} alt="Source" className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                        <Upload className="w-8 h-8 text-antique-gold/40 mb-3" />
                        <p className="text-sepia text-lg font-display font-bold mb-4">上傳照片</p>
                        <div className="space-y-2 max-w-[180px]">
                          <p className="text-[10px] text-sepia/50 leading-relaxed">
                            💡 建議照片背景乾淨、光線充足，<br />以獲得最佳藝術效果。
                          </p>
                          <p className="text-[10px] text-sepia/40 italic">
                            支援 JPG, PNG, WebP (小於 5MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full sm:w-64">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-display font-bold text-dark-green">
                      <span className="mr-1.5">✦</span>選擇時空節點
                    </label>
                    <span className="text-[10px] text-antique-gold font-inter font-bold">
                      {generationMode === 'quick' ? `已選 ${selectedStyleIds.length}/3` : `已選 ${selectedStyleIds.length}/6`}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                    {STYLES.map(style => {
                      const isSelected = selectedStyleIds.includes(style.nameEn);
                      return (
                        <label 
                          key={style.nameEn} 
                          className={`flex items-center justify-start gap-2 p-2 px-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-dark-green border-dark-green text-white' : 'bg-white border-antique-gold/10 text-sepia/70 hover:border-antique-gold/30'}`}
                        >
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={isSelected} 
                            onChange={() => {
                              setSelectionError(null);
                              if (isSelected) {
                                setSelectedStyleIds(selectedStyleIds.filter(id => id !== style.nameEn));
                              } else {
                                if (generationMode === 'quick' && selectedStyleIds.length >= 3) {
                                  setSelectionError("快速模式僅限選取 3 個時空節點");
                                  return;
                                }
                                setSelectedStyleIds([...selectedStyleIds, style.nameEn]);
                              }
                            }} 
                          />
                          <span className="text-xs font-display font-medium whitespace-nowrap">{style.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  {selectionError && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] text-red-500 font-bold mt-1 text-right">
                      {selectionError}
                    </motion.p>
                  )}
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".jpg,.jpeg,.png,.webp" className="hidden" />
              <div className="mt-1 space-y-1.5">
                <div className="mt-6">
                  <label className="block text-xs font-display font-bold text-dark-green mb-1">
                    <span className="mr-1.5">✦</span>選擇顯影模式
                  </label>
                  <div className="flex p-1 bg-ivory border border-antique-gold/10 rounded-xl">
                    <button 
                      onClick={() => {
                        setGenerationMode('quick');
                        setSelectionError(null);
                        setSelectedStyleIds([]);
                      }} 
                      className={`flex-1 py-1 rounded-lg text-xs font-sans font-bold ${generationMode === 'quick' ? 'bg-dark-green text-white shadow-sm' : 'text-sepia/50'}`}
                    >
                      快速版 (1~3張)
                    </button>
                    <button 
                      onClick={() => {
                        setGenerationMode('full');
                        setSelectionError(null);
                        setSelectedStyleIds(STYLES.map(s => s.nameEn));
                      }} 
                      className={`flex-1 py-1 rounded-lg text-xs font-sans font-bold ${generationMode === 'full' ? 'bg-dark-green text-white shadow-sm' : 'text-sepia/50'}`}
                    >
                      完整版 (6張)
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-display font-bold text-dark-green mb-1">
                      <span className="mr-1.5">✦</span>顯影對象
                    </label>
                    <div className="flex p-1 bg-ivory border border-antique-gold/10 rounded-xl gap-1">
                      <button onClick={() => setSubjectType('human')} className={`flex-1 py-1 rounded-lg text-xs font-display font-bold transition-all ${subjectType === 'human' ? 'bg-dark-green text-white shadow-sm' : 'text-sepia/50 hover:bg-stone-100'}`}>人像</button>
                      <button onClick={() => setSubjectType('pet')} className={`flex-1 py-1 rounded-lg text-xs font-display font-bold transition-all ${subjectType === 'pet' ? 'bg-antique-gold text-white shadow-sm' : 'text-sepia/50 hover:bg-stone-100'}`}>寵物</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-display font-bold text-dark-green mb-1">
                      <span className="mr-1.5">✦</span>性別特徵
                    </label>
                    <div className="flex p-1 bg-ivory border border-antique-gold/10 rounded-xl gap-1">
                      <button onClick={() => setGender('male')} className={`flex-1 py-1 rounded-lg text-xs font-display font-bold transition-all ${gender === 'male' ? 'bg-dark-green text-white shadow-sm' : 'text-sepia/50 hover:bg-stone-100'}`}>{subjectType === 'pet' ? '小紳士' : '紳士'}</button>
                      <button onClick={() => setGender('female')} className={`flex-1 py-1 rounded-lg text-xs font-display font-bold transition-all ${gender === 'female' ? 'bg-dark-green text-white shadow-sm' : 'text-sepia/50 hover:bg-stone-100'}`}>{subjectType === 'pet' ? '小淑女' : '淑女'}</button>
                    </div>
                  </div>
                </div>
                <div className="mt-1">
                  <label className="block text-xs font-display font-bold text-dark-green mb-1">
                    <span className="mr-1.5">✦</span>時光備註
                  </label>
                  <textarea value={additionalDesc} onChange={(e) => setAdditionalDesc(e.target.value)} placeholder="例如：保留眼鏡特徵、服裝以深色系為主⋯" className="w-full py-1.5 px-3 bg-ivory border border-antique-gold/20 rounded-xl text-sm h-12 text-stone-700 font-display font-bold" />
                </div>
              </div>
              <button disabled={!sourceImage || isGenerating || isRefining || selectedStyleIds.length === 0} onClick={generatePortraits} className={`w-full mt-2 h-12 rounded-xl font-display font-bold transition-all flex items-center justify-center gap-3 ${!sourceImage || isGenerating || isRefining || selectedStyleIds.length === 0 ? 'bg-stone-200 text-stone-400' : 'bg-vintage-red text-white shadow-lg'}`}>
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="font-sans">
                      {coolingTime > 0 
                        ? `API 冷卻中 (${coolingTime}s)...` 
                        : `生成中 (${Math.round(progress)}%)`}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    <span>開始你的時光旅行 (Start Journey)</span>
                  </>
                )}
              </button>
              
              {isGenerating && (
                <button 
                  onClick={handleStopGeneration} 
                  disabled={shouldStop}
                  className={`w-full mt-2 h-10 rounded-xl font-display font-bold transition-all flex items-center justify-center gap-2 text-sm ${shouldStop ? 'bg-stone-100 text-stone-400' : 'text-sepia/60 hover:text-sepia border border-sepia/10 hover:bg-sepia/5'}`}
                >
                  {shouldStop ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  <span>{shouldStop ? '正在停止 (Stopping...)' : '停止生成 (Stop)'}</span>
                </button>
              )}

              {!isGenerating && (
                <div className="mt-4 space-y-2">
                  <button 
                    onClick={handleChangeApiKey} 
                    className="w-full h-10 rounded-xl font-display font-bold text-sepia/40 hover:text-sepia/80 border border-dashed border-sepia/20 hover:bg-sepia/5 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Key className="w-3 h-3" />
                    <span>更換能量金鑰 (Change API Key)</span>
                  </button>
                  <button 
                    onClick={handleClearApiKey}
                    className="w-full h-10 rounded-xl font-display font-bold text-red-800/20 hover:text-red-800/60 border border-dashed border-red-800/10 hover:bg-red-800/5 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Eraser className="w-3 h-3" />
                    <span>註銷金鑰並離開 (Clear <span className="font-inter mx-0.5">&</span> Logout)</span>
                  </button>
                </div>
              )}

              {error && <div className="mt-4 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>}
            </section>
          </div>

          <div className="flex-1 flex flex-col pt-2 md:pt-3">
            <div className="flex items-center justify-between mb-6"><h2 className="text-lg md:text-xl font-display font-bold text-dark-green flex items-center gap-2"><Grid className="w-5 h-5 text-antique-gold" />時光畫廊</h2>
              {portraits.filter(p => p.status === 'success').length >= 1 && <button onClick={generateCollage} className="px-4 py-2 bg-white border-2 border-antique-gold text-antique-gold rounded-lg font-display font-bold flex items-center gap-2 shadow-sm text-sm"><Download className="w-3.5 h-3.5" />下載合集</button>}
            </div>

            <AnimatePresence>
              {(isGenerating || isRefining) && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }} 
                  animate={{ opacity: 1, height: 'auto', marginBottom: 24 }} 
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white/60 backdrop-blur-sm p-5 rounded-3xl border border-antique-gold/10 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-display font-bold text-dark-green flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-antique-gold" />
                        {isRefining 
                          ? '正在重現時光肖像 (Recreating Portrait)...'
                          : statusText || '正在開啟時光之門 (Opening Time Portal)...'}
                      </span>
                      <span className="text-xs font-inter font-bold text-antique-gold">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-antique-gold/10 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-antique-gold to-antique-gold/60"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ type: "spring", stiffness: 50, damping: 20 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {portraits.length === 0 && !isGenerating ? (
              <div className="w-full flex-grow min-h-[450px] flex flex-col items-center justify-center border-2 border-dashed border-antique-gold/20 rounded-[40px] bg-white/40"><ImageIcon className="w-16 h-16 mb-4 text-antique-gold/20" /><p className="text-xl font-display italic text-antique-gold/40">等待開啟時光之門</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 pb-12">
                <AnimatePresence mode="popLayout">
                  {portraits.map((portrait, idx) => (
                    <motion.div key={portrait.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.1 }} className="group relative">
                      <div className="nostalgic-border bg-white rounded-sm overflow-hidden shadow-xl hover:shadow-2xl transition-all">
                        <div className="aspect-[3/4] relative overflow-hidden bg-stone-50">
                          {portrait.status === 'refining' ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
                              <Loader2 className="w-10 h-10 animate-spin text-antique-gold mb-2" />
                              <p className="text-[10px] font-display font-bold text-antique-gold italic">時光重塑中...</p>
                            </div>
                          ) : portrait.status === 'error' ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-red-50/50">
                              <X className="w-12 h-12 text-red-300 mb-3" />
                              <p className="text-xs font-display font-bold text-red-800/60 leading-relaxed">
                                {translateError(portrait.errorMsg || "")}
                              </p>
                              <p className="mt-2 text-[10px] text-red-800/30 italic">
                                {portrait.errorMsg?.toLowerCase().includes("429") || portrait.errorMsg?.toLowerCase().includes("resource_exhausted") 
                                  ? "請更換能量金鑰以重啟時光機" 
                                  : "建議調整顯影參數或更換底片"}
                              </p>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleSingleRegenerate(portrait.id); }}
                                className="mt-4 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-xs font-display font-bold flex items-center gap-2 hover:bg-red-50 transition-all shadow-sm"
                              >
                                <RefreshCw className="w-3 h-3" />
                                重新顯影
                              </button>
                            </div>
                          ) : (
                            <>
                              <img src={portrait.url} alt={portrait.style} className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110" />
                              <div className="absolute inset-0 bg-dark-green/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                <button onClick={() => setPreviewImageUrl(portrait.url)} className="bg-white/90 p-3 rounded-full shadow-lg"><Maximize className="w-6 h-6 text-dark-green" /></button>
                                <button onClick={(e) => { e.stopPropagation(); setRefiningPortraitId(portrait.id); }} className="bg-white/90 p-3 rounded-full shadow-lg"><Edit3 className="w-6 h-6 text-dark-green" /></button>
                              </div>
                              <button onClick={(e) => { 
                                e.stopPropagation(); 
                                const slug = portrait.styleEn.toLowerCase().replace(/ /g, '-');
                                const stylePortraits = portraits.filter(p => p.styleEn === portrait.styleEn);
                                const index = stylePortraits.findIndex(p => p.id === portrait.id) + 1;
                                downloadImage(portrait.url, `portrait-${slug}-${index}.jpg`); 
                              }} className="absolute top-3 right-3 p-2 bg-white/80 rounded-full shadow-md opacity-0 group-hover:opacity-100"><Download className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
                        <div className="p-4 text-center border-t border-antique-gold/10 bg-ivory/50">
                          <p className={`font-display font-bold text-sm leading-tight ${portrait.status === 'error' ? 'text-red-800/40' : 'text-dark-green'}`}>
                            {portrait.style}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {isGenerating && Array.from({ length: Math.max(0, selectedStyleIds.length - portraits.length) }).map((_, i) => (
                    <div key={`loading-${i}`} className="aspect-[3/4] bg-white/40 rounded-sm flex flex-col items-center justify-center text-antique-gold/40 animate-pulse border-2 border-dashed border-antique-gold/20"><Loader2 className="w-10 h-10 animate-spin mb-4" /><p className="text-sm font-display font-bold italic">時光顯影中...</p></div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {refiningPortraitId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRefiningPortraitId(null)} className="absolute inset-0 bg-dark-green/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-3xl bg-ivory rounded-[40px] shadow-2xl overflow-hidden border border-antique-gold/20">
              <div className="p-6 md:p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-display font-bold text-dark-green flex items-center gap-3">
                    <Edit3 className="w-6 h-6 text-antique-gold" />
                    修改肖像 (Refine Portrait)
                  </h3>
                  <button onClick={() => setRefiningPortraitId(null)} className="p-2 hover:bg-antique-gold/10 rounded-full">
                    <X className="w-6 h-6 text-sepia/50" strokeWidth={1.5} />
                  </button>
                </div>
                <div className="flex flex-col md:flex-row gap-10">
                  <div className="w-full md:w-[45%]">
                    <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border-8 border-white ring-1 ring-antique-gold/10 relative group">
                      <img src={portraits.find(p => p.id === refiningPortraitId)?.url} alt="To refine" className="w-full h-full object-cover absolute inset-0" />
                      <canvas ref={canvasRef} width={1024} height={1365} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="absolute inset-0 w-full h-full cursor-crosshair touch-none" />
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <button onClick={undoLastPath} className="p-2 bg-white/90 rounded-full shadow-md"><Undo2 className="w-4 h-4" strokeWidth={1.5} /></button>
                        <button onClick={clearCanvas} className="p-2 bg-white/90 rounded-full shadow-md"><Eraser className="w-4 h-4" strokeWidth={1.5} /></button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col items-center gap-3">
                      <div className="flex gap-3 p-2 bg-antique-gold/5 rounded-full border border-antique-gold/10">
                        {['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ffffff'].map(color => (
                          <button key={color} onClick={() => setBrushColor(color)} className={`w-7 h-7 rounded-full border-2 transition-all ${brushColor === color ? 'scale-125 border-dark-green shadow-md' : 'border-white shadow-sm'}`} style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <p className="text-[10px] text-sepia/40 italic text-center font-display font-bold">
                        提示：您可以使用畫筆圈選想要修改的地方<br />
                        (Tip: Use the brush to mark areas to refine)
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="mb-6">
                      <p className="text-sm text-sepia/70 leading-relaxed mb-4 font-display font-bold">
                        您正在修改 <span className="font-bold text-dark-green">{portraits.find(p => p.id === refiningPortraitId)?.style}</span> 風格的肖像。
                      </p>
                      <div className="bg-[#fdf8e9] border border-[#f0e6cc] rounded-2xl p-4 text-xs text-sepia/60 italic leading-relaxed font-display font-bold">
                        AI 將會在保留原圖背景與構圖的基礎上進行修改，請在下方輸入具體的調整細節。
                      </div>
                    </div>
                    <div className="flex-1 space-y-6">
                      <div>
                        <label className="block text-sm font-display font-bold text-dark-green mb-2">修改指令 (Refinement Request)</label>
                        <textarea value={refinementPrompt} onChange={(e) => setRefinementPrompt(e.target.value)} placeholder="例如：更換髮型、更改衣服顏色、移除物件..." className="w-full p-4 bg-white border border-antique-gold/20 rounded-2xl text-base h-48 text-stone-700 font-display font-bold" />
                      </div>
                      <div className="flex flex-col gap-3">
                        <button disabled={!refinementPrompt || isRefining} onClick={refinePortrait} className={`w-full h-16 rounded-2xl font-display font-bold transition-all flex items-center justify-center gap-3 shadow-lg ${!refinementPrompt || isRefining ? 'bg-stone-200 text-stone-400' : 'bg-vintage-red text-white hover:scale-[1.01] active:scale-[0.99]'}`}>
                          {isRefining ? <><Loader2 className="w-5 h-5 animate-spin" /><span>修改中...</span></> : <><Sparkles className="w-5 h-5" /><span>確認修改 (Apply Refinement)</span></>}
                        </button>
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-antique-gold/10"></div>
                          <span className="text-[10px] font-display font-bold text-sepia/30 uppercase tracking-widest">OR</span>
                          <div className="h-px flex-1 bg-antique-gold/10"></div>
                        </div>
                        <button disabled={isRefining} onClick={() => handleSingleRegenerate(refiningPortraitId!)} className={`w-full h-12 rounded-2xl font-display font-bold transition-all flex items-center justify-center gap-3 border-2 border-antique-gold/20 text-antique-gold hover:bg-antique-gold/5 ${isRefining ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <RefreshCw className={`w-4 h-4 ${isRefining ? 'animate-spin' : ''}`} />
                          <span>重新生成 (Regenerate)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewImageUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/95 backdrop-blur-xl" onClick={() => setPreviewImageUrl(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setPreviewImageUrl(null)} className="absolute top-0 right-0 md:-top-10 md:-right-10 p-3 bg-white/10 rounded-full text-white z-10"><X className="w-8 h-8" strokeWidth={1.5} /></button>
              <div className="relative w-full h-full flex items-center justify-center">
                <img src={previewImageUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border-4 border-white/10" />
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
                  <button onClick={() => { 
                    const portrait = portraits.find(p => p.url === previewImageUrl); 
                    if (portrait) {
                      const slug = portrait.styleEn.toLowerCase().replace(/ /g, '-');
                      const stylePortraits = portraits.filter(p => p.styleEn === portrait.styleEn);
                      const index = stylePortraits.findIndex(p => p.id === portrait.id) + 1;
                      downloadImage(portrait.url, `portrait-${slug}-${index}.jpg`);
                    }
                  }} className="flex items-center gap-1.5 px-4 py-2 bg-white/30 backdrop-blur-md text-white rounded-full font-display font-bold shadow-md text-xs border border-white/20"><Download className="w-3.5 h-3.5" strokeWidth={1.5} /><span>下載照片 (Download)</span></button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="bg-dark-green text-ivory py-6 px-4 mt-auto w-full min-w-full relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="flex items-center justify-center gap-4 mb-3"><div className="h-px w-16 bg-antique-gold"></div><History className="w-6 h-6 text-antique-gold" /><div className="h-px w-16 bg-antique-gold"></div></div>
          <p className="text-antique-gold font-sans font-bold text-xl mb-1 tracking-wide">屏東職人町</p>
          <p className="text-ivory/60 text-xs mb-3 font-sans tracking-wide">屏東縣屏東市仁德路43巷6號</p>
          <div className="h-px w-full max-w-xs bg-antique-gold/20 mx-auto mb-3"></div>
          <p className="text-ivory/40 text-[10px] tracking-widest uppercase italic font-sans font-bold">© 2026 匠心藝境・時光肖像館. DESIGNED BY 蔓影蔓食. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
