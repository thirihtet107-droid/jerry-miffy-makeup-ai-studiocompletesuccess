JERRY MIFFY MAKEUP AI STUDIO — CLOUDFLARE WORKERS COMPLETE BUILD

ဒီ ZIP ကို Worker + Static Assets အတွက် Folder လမ်းကြောင်းမှန်အောင် စီစဉ်ထားပါတယ်။

Folder များ:
- src/index.js                 Worker entry point (Analyze + Preview API နှစ်ခုလုံးပါဝင်)
- public/index.html            Website
- public/app.js                Website JavaScript
- public/styles.css            Design styles
- public/makeup-looks.mjs      Makeup look 25 မျိုး
- wrangler.toml                Cloudflare Worker configuration
- package.json                 Wrangler deploy scripts

API endpoints:
- POST /api/consult
- POST /api/preview

အရေးကြီး:
1) Cloudflare Worker ရဲ့ Settings > Variables and Secrets မှာ GEMINI_API_KEY ကို Secret အဖြစ် ထည့်ထားရပါမယ်။ API key ကို ဒီ ZIP ထဲ မထည့်ထားပါ။
2) Cloudflare Worker ကို ဒီ project root (wrangler.toml ရှိတဲ့ folder) ကနေ deploy လုပ်ပါ။
3) Existing/old website ကို ဒီ project က မပြောင်းလဲပါ။
4) Analyze/Preview API route များကို Worker src/index.js ထဲမှာပဲ ထည့်ထားပြီး Pages functions folder သီးသန့် မလိုပါ။
5) Gemini model availability, quota, billing အပေါ်မူတည်ပြီး Gemini ဘက်မှ သီးခြား error ပြန်နိုင်ပါတယ်။

Local commands:
  npm install
  npx wrangler dev
  npx wrangler deploy
