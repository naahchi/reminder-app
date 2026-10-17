Reminder Desk — Project Context

1. प्रोजेक्ट क्या है?

Reminder Desk एक मोबाइल-फ्रेंडली Reminder Website/PWA है। इसमें रिमाइंडर बनाना, शेड्यूल सेट करना और पुश नोटिफिकेशन प्राप्त करना संभव है।

टेक्नोलॉजी: HTML, CSS, JavaScript, GitHub Pages, Supabase Database/Storage, Web Push API, Service Worker और Supabase Edge Functions।

Windows प्रोजेक्ट फोल्डर: "D:\reminder-app"

2. मुख्य फाइलें

- "index.html" — मुख्य पेज
- "css/style.css" — डिजाइन और स्टाइल
- "js/app.js" — ऐप लॉजिक, Done Today/Undo Done
- "js/config.js" — पब्लिक कॉन्फ़िगरेशन
- "service-worker.js" — पुश नोटिफिकेशन और क्लिक हैंडलिंग
- "manifest.json" — PWA सेटिंग्स
- "assets/" — आइकन और अन्य एसेट
- "supabase/" — SQL migrations और Edge Function
- "supabase/functions/send-reminders/index.ts" — सर्वर-साइड पुश भेजने का कोड

Supabase प्रोजेक्ट का नाम "reminder-app" है। प्रोजेक्ट रेफरेंस "fbhbgptynskcyoipvsne" है।

3. पहले से काम कर रहे फीचर्स

- Weekly, one-time date और date-range reminders
- Create, Edit, Delete और Done Today/Undo Done
- Supabase में रिमाइंडर सेव करना
- Scheduled push notifications
- Custom notification icons
- नोटिफिकेशन पर क्लिक करने से निर्धारित वेबसाइट या ऐप खुलना
- एक ही समय पर कई नोटिफिकेशन
- Chrome/PWA बंद होने और मोबाइल लॉक होने पर नोटिफिकेशन आना

इन फीचर्स को बिना जरूरत दोबारा न बनाएं और न ही खराब करें।

4. अभी का मुख्य काम: Notification में Mark as Done

नोटिफिकेशन में "Mark as Done" बटन जोड़ना है। इसे दबाने पर ऐप खोले बिना Supabase में completion रिकॉर्ड अपडेट होना चाहिए।

जरूरी व्यवहार:

- Daily/weekly repeating reminder: केवल आज के लिए पूरा हो। अगले निर्धारित दिन अपने आप फिर सक्रिय हो।
- चुने हुए weekdays का शेड्यूल न बदले।
- One-time reminder: Done करने पर दोबारा नोटिफिकेशन न आए।
- मौजूदा Done Today/Undo Done सिस्टम को पहले समझें और उसी के साथ काम करें।
- तारीख निकालते समय रिमाइंडर का timezone ध्यान में रखें।
- सुरक्षित backend प्रक्रिया इस्तेमाल करें; frontend या service worker में private secrets न रखें।
- पहले से काम कर रहे कोड को पूरा rewrite न करें।

बाद में "Remind Me Later" (10/30/60 मिनट) जोड़ा जा सकता है। "View" एक्शन मौजूदा URL/app खोलने का व्यवहार बनाए रखे।

5. सुरक्षा

Supabase Service Role Key, VAPID Private Key और CRON Secret किसी को न दिखाएं और frontend/GitHub में न रखें। मौजूदा database schema और migrations देखे बिना नई table या migration न बनाएं।

6. बाकी टेस्टिंग — बाद में

1. Done Today/Undo Done: repeating reminder केवल आज के लिए बंद हो; अगले निर्धारित दिन फिर चले।
2. Edit schedule: पुराना समय बंद, नया समय सही चले।
3. Pause/Resume की जाँच।
4. Delete के बाद नोटिफिकेशन न आए।
5. Supabase delivery_logs में sent/failed/duplicate की जाँच।
6. Login, device subscriptions, scheduler और security की अंतिम जाँच।

7. अगली चैट में काम कैसे शुरू करें?

पहले "D:\reminder-app\js\app.js" फाइल मंगाएं और उसमें मौजूदा Done Today/Undo Done लॉजिक देखें। उसके बाद जरूरत के अनुसार "service-worker.js", Edge Function और वर्तमान SQL schema/migrations देखें।

निर्देश: मैं beginner हूँ। एक बार में सिर्फ एक स्टेप बताएं और मेरे परिणाम का इंतजार करें। मौजूदा प्रोजेक्ट को समझे बिना कोड न बदलें। पहले Mark as Done पूरा करें, फिर बाकी टेस्टिंग करें।