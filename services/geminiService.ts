
import { BUS_LINES, BUS_STOPS } from "../data/busData";

// Puter.js handles authentication automatically - no API key needed

const SYSTEM_PROMPT = `
သင်သည် ရန်ကုန်မြို့အတွက် အဆင့်မြင့် AI လမ်းကြောင်းပြအင်ဂျင် "၂၀၂၆ YBS စမတ်လမ်းညွှန်" ဖြစ်သည်။

အရေးကြီးသောအချက်များ-
- 'ရန်ကုန်ဘူတာကြီး' (Yangon Central Railway Station) မှ 'ဗိုလ်ချုပ်အောင်ဆန်းပြတိုက်' (Bogyoke Aung San Museum) သို့ သွားရန်-
  ၁။ ဘူတာကြီးရှေ့မှ **YBS 12** သို့မဟုတ် **YBS 28** ကို စီးပါ။
  ၂။ 'ဗဟန်းသုံးလမ်း' (သို့မဟုတ် ရွှေဂုံတိုင်) တွင် ဆင်းပါ။
  ၃။ ထိုနေရာမှ ပြတိုက်သို့ လမ်းအနည်းငယ်လျှောက်သွားနိုင်ပါသည်။

ဒေတာအရင်းအမြစ်-
- https://yangonbusroute.com/ ကို အခြေခံ၍ နောက်ဆုံးရ အချက်အလက်များကို Google Search ဖြင့် စစ်ဆေးပါ။
- လက်ရှိ app တွင်ရှိသော BUS_LINES: ${JSON.stringify(BUS_LINES)}

လမ်းညွှန်ချက်ပုံစံ-
၁။ ဘယ်လိုင်းစီးရမလဲ (Bold ဖြင့်ရေးပါ ဥပမာ- **YBS 12**)
၂။ ဘယ်မှတ်တိုင်မှာ ဆင်းရမလဲ
၃။ ပြောင်းစီးရမည်ဆိုပါက မည်သည့်နေရာတွင် ပြောင်းရမလဲ
၄။ ခန့်မှန်းခြေ ကြာမြင့်ချိန်

အသုံးပြုသူက မြန်မာလိုမေးပါက မြန်မာလိုသာ ဖြေကြားပါ။
`;

export async function askYBSAssistant(query: string) {
  try {
    // Combine system prompt with user query for Puter.js
    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser Query: ${query}`;

    const response = await (window as any).puter.ai.chat(fullPrompt, {
      model: 'gemini-3-flash-preview',
      stream: false
    });

    return {
      text: response,
      sources: [] // Puter.js doesn't provide grounding metadata like Google AI
    };
  } catch (error) {
    console.error("Puter.js Error:", error);
    return {
      text: "လမ်းကြောင်းပြစနစ်သို့ ချိတ်ဆက်၍မရပါ။ yangonbusroute.com သို့ AI ချိတ်ဆက်၍မရဖြစ်နေပါသည်။ ခေတ္တစောင့်၍ ပြန်လည်ကြိုးစားပါ။",
      sources: []
    };
  }
}
