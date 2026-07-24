import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Server-side Gemini initialization helper
const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("کلید GEMINI_API_KEY تنظیم نشده است.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Gemini API Route for Antenna Consulting & Analysis
app.post("/api/gemini/explain", async (req, res) => {
  try {
    const { prompt, arrayConfig } = req.body;
    const ai = getAi();
    const systemInstruction = `شما یک استاد و مهندس ارشد مخابرات و میدان‌ها و امواج هستید که تسلط کامل بر مباحث آرایه‌های آنتن (آرایه‌های خطی یکنواخت ULA، آرایه دولف-چبیشف Dolph-Chebyshev، آرایه دوجمله‌ای Binomial، آرایه صفحه‌ای Planar، آرایه دایره‌ای Circular، قضیه ضرب پترن Pattern Multiplication، تحلیل در صفحه z، گریتینگ لوب‌ها Grating Lobes، و Visible Range) دارید.
به زبان فارسی شیوا، علمی، دقیق و آموزشی همراه با فرمول‌ها و تحلیل‌های کاربردی پاسخ دهید.
اگر کاربر درباره تحلیل آرایه فعلی سوال کرد یا پیشنهاد برای بهبود پهنای پرتو یا سطح گلبرگ فرعی (SLL) خواست، راهنمایی گام‌به‌گام ارائه دهید.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `پیکربندی فعلی آرایه آنتن کاربر:
${JSON.stringify(arrayConfig, null, 2)}

سوال/درخواست کاربر:
${prompt}`,
      config: {
        systemInstruction,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/explain:", error);
    res.status(500).json({ error: error.message || "خطا در پاسخگویی هوش مصنوعی" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
