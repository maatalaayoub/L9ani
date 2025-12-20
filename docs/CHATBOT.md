# L9ani Smart Local Assistant

A 100% local AI assistant for the L9ani Lost & Found platform - **no external APIs required!**

## 🌟 Features

### 1. Smart Semantic Analysis
- **Keyword-based intent detection** - not exact phrase matching
- **Weighted scoring system** - longer/more specific keywords score higher
- **Multi-keyword analysis** - understands context from multiple words
- **Works offline** - no internet required for chat functionality

### 2. Multi-language Support
- **Arabic (فصحى)** - Modern Standard Arabic
- **Moroccan Darija (الدارجة)** - Automatic dialect detection
- **English** - Full support

### 3. Intent Detection

The assistant intelligently detects user intentions:

| Intent | Example Queries |
|--------|-----------------|
| **Lost** | "I lost my phone", "ضاع تليفوني", "ضيعت البزطام" |
| **Found** | "I found a wallet", "لقيت كارط", "وجدت محفظة" |
| **Search** | "search reports", "بحث", "كيفاش نقلب" |
| **My Reports** | "my reports", "بلاغاتي", "فين البلاغات ديالي" |
| **Profile** | "update profile", "حسابي", "بدل السمية" |
| **Settings** | "change password", "الإعدادات", "بدل اللغة" |
| **Contact** | "help", "support", "مساعدة", "عندي مشكل" |
| **About** | "what is l9ani", "شنو هو", "كيفاش خدام" |
| **Privacy** | "privacy policy", "الخصوصية", "البيانات ديالي" |
| **Greeting** | "hello", "سلام", "كيداير" |
| **Thanks** | "thank you", "شكرا", "الله يعطيك الصحة" |

### 4. Item Type Detection

The assistant recognizes specific item types mentioned:
- 📱 Phone/Mobile
- 👛 Wallet/Purse
- 🔑 Keys
- 📄 Documents/ID/Passport
- 🐕 Pets
- 👤 Person/Child/Elderly
- 🎒 Bags/Luggage
- 💎 Jewelry
- 💻 Electronics

### 5. Context-Aware Quick Replies

Dynamic quick reply buttons based on detected intent:
- Lost item → Shows "Report Missing", "Search", "Contact"
- Found item → Shows "Report Sighting", "Search"
- Search → Shows "Home", "Report Missing"
- etc.

## 🏗️ Architecture

```
src/
└── app/
    └── api/
        └── chat/
            └── route.js    # Smart local assistant (no external APIs)
└── components/
    └── chat/
        ├── ChatWidget.js       # Main widget container
        ├── ChatMessage.js      # Individual message component
        ├── ChatInput.js        # Input field component
        └── ChatQuickReplies.js # Quick reply buttons
```

## 🔧 How It Works

### 1. Language Detection
```javascript
// Checks for Arabic characters
const hasArabic = /[\u0600-\u06FF]/.test(message);

// Checks for Darija-specific patterns
const darijaPatterns = ['كيفاش', 'فين', 'شنو', 'واش', 'ديال', ...];
```

### 2. Intent Scoring
```javascript
// Each keyword adds score based on its length (specificity)
function getMatchScore(text, keywords) {
    keywords.forEach(keyword => {
        if (text.includes(keyword)) {
            score += keyword.length; // Longer = more specific
        }
    });
    return score;
}
```

### 3. Response Generation
- Responses are pre-defined for each intent
- Responses adapt to detected language
- Item type is incorporated into lost/found responses

## 📝 API Response Format

```json
{
    "success": true,
    "response": {
        "text": "Response message with markdown formatting",
        "quickReplies": [
            {
                "id": "rm",
                "text": "📝 Report Missing",
                "action": "navigate",
                "route": "/report-missing"
            }
        ]
    },
    "debug": {
        "intent": "lost",
        "language": "en",
        "itemType": "phone"
    }
}
```

## 🚀 Benefits

1. **No API costs** - Completely free to run
2. **Fast responses** - Instant, no network latency
3. **Works offline** - Chat works without internet
4. **Privacy** - No data sent to external services
5. **Reliable** - No API rate limits or outages
6. **Customizable** - Easy to add keywords and responses

## 🔒 Scope Limitations

The assistant is strictly limited to:
- ✅ Platform navigation guidance
- ✅ Feature explanations
- ✅ Page directions with links
- ❌ NO data collection
- ❌ NO form filling
- ❌ NO external API calls
- ❌ NO general knowledge questions

## 💾 Client-Side Storage

Conversations are stored in `localStorage`:
- Key: `l9ani_chat_history`
- Auto-clears after 24 hours
- Max 50 messages per session

## 🎨 UI Features

- Floating action button (FAB)
- Expandable chat window
- Markdown rendering in messages
- Clickable quick reply buttons
- Navigation integration
- Dark mode support
- RTL support for Arabic

## 🔧 Customization

### Adding New Keywords

Edit `src/app/api/chat/route.js`:

```javascript
const KEYWORDS = {
    yourIntent: {
        en: ['keyword1', 'keyword2'],
        ar: ['كلمة1', 'كلمة2'],
        darija: ['كلمة1', 'كلمة2']
    }
}
```

### Adding New Responses

```javascript
const RESPONSES = {
    yourIntent: {
        en: { text: 'English response', route: '/page' },
        ar: { text: 'استجابة عربية', route: '/page' },
        darija: { text: 'استجابة بالدارجة', route: '/page' }
    }
}
```

## 📊 Performance

- Average response time: < 20ms
- No network requests for chat
- Minimal bundle size impact
- Zero external dependencies
