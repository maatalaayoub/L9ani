# L9ani AI Chatbot

An AI-powered chatbot assistant for the L9ani Lost & Found platform.

## Features

### 1. Multi-language Support
- **Arabic (فصحى)** - Modern Standard Arabic
- **Moroccan Darija (الدارجة)** - Moroccan dialect with automatic detection
- **English** - Full support

### 2. Core Capabilities

#### Report Creation Assistant
The chatbot guides users through creating complete reports with step-by-step questions:
- Missing persons
- Lost pets
- Lost documents
- Lost electronics
- Lost vehicles
- Other items

#### Natural Language Search
Users can search reports using natural language queries:
- "طفل مفقود في مراكش" (Missing child in Marrakech)
- "Black cat lost near Casablanca yesterday"
- "ولدي ضاع ليا فكازا" (My child got lost in Casa - Darija)

#### Platform Navigation
Helps users:
- Navigate to different pages
- Check report status
- Understand platform features

#### Emergency Detection
Recognizes urgent situations and displays emergency contact numbers:
- Police: 19
- Emergency: 15
- Ambulance: 141

## Architecture

```
src/
├── lib/chatbot/
│   ├── core.js          # Language detection, intent classification, response generation
│   ├── search.js        # Natural language search engine
│   └── reportAssistant.js # Report creation conversation flow
├── components/chat/
│   ├── ChatWidget.js    # Main chat widget with FAB button
│   ├── ChatMessage.js   # Message rendering with markdown support
│   ├── ChatInput.js     # Input field with multi-line support
│   ├── ChatQuickReplies.js # Quick reply buttons
│   └── index.js         # Barrel exports
├── app/api/chat/
│   ├── route.js         # Main chat API endpoint
│   ├── feedback/route.js # Feedback submission
│   └── quick-replies/route.js # Quick reply suggestions
└── public/locales/
    ├── en/chat.json     # English translations
    └── ar/chat.json     # Arabic translations
```

## Database Schema

Run the migration: `database/migrations/008_create_chatbot_schema.sql`

Tables:
- `chat_sessions` - Conversation sessions with context
- `chat_messages` - Individual messages with intent tracking
- `chat_quick_replies` - Pre-defined quick reply options
- `chat_feedback` - User feedback for improvement
- `chat_search_history` - Search analytics

## Usage

The ChatWidget is automatically included in the app layout. Users see a floating chat button (FAB) in the bottom corner.

### API Endpoints

#### POST /api/chat
Send a message to the chatbot.

```javascript
const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Optional
    },
    body: JSON.stringify({
        message: 'I want to report a missing person',
        sessionId: 'uuid-here', // Optional, for continuing sessions
        context: {} // Optional, for multi-turn conversations
    })
});
```

Response:
```json
{
    "success": true,
    "response": {
        "text": "I'll help you create a report...",
        "quickReplies": [...],
        "action": { "type": "navigate", "route": "/report-missing" }
    },
    "language": "en",
    "intent": "create_report",
    "confidence": 0.85,
    "sessionId": "uuid"
}
```

#### POST /api/chat/feedback
Submit feedback on a message.

```javascript
await fetch('/api/chat/feedback', {
    method: 'POST',
    body: JSON.stringify({
        messageId: 'uuid',
        sessionId: 'uuid',
        feedbackType: 'helpful', // or 'not_helpful', 'report'
        feedbackText: 'Optional comment'
    })
});
```

## Intent Classification

Supported intents:
- `greeting` - Hello/Hi messages
- `create_report` - User wants to create a report
- `search_reports` - User searching for reports
- `check_status` - User checking their report status
- `platform_help` - User needs help with the platform
- `emergency` - Urgent situations
- `unknown` - Intent not detected

## Customization

### Adding New Quick Replies
Insert into `chat_quick_replies` table:

```sql
INSERT INTO chat_quick_replies (
    trigger_intent, text_en, text_ar, text_darija,
    action_type, action_data, display_order
) VALUES (
    'greeting',
    'Report a missing person',
    'الإبلاغ عن شخص مفقود',
    'بلغ على شي واحد ضايع',
    'navigate',
    '{"route": "/report-missing", "reportType": "person"}',
    1
);
```

### Adding New Moroccan Cities
Edit `src/lib/chatbot/core.js` and add to `MOROCCAN_CITIES` object.

### Adding New Intent Keywords
Edit `INTENT_KEYWORDS` in `src/lib/chatbot/core.js`.

## Safety & Guardrails

- **No PII exposure** - Personal data from reports is not shown in search results
- **Emergency escalation** - Urgent situations show emergency contacts
- **Rate limiting** - Implement at infrastructure level
- **Content moderation** - Reports flagged if needed
- **Human handoff** - Users can always contact support via /contact

## Analytics

View chat analytics (admin):
```sql
SELECT * FROM chat_analytics;
```

This shows:
- Daily session counts
- Messages per session
- Resolution rates
- Language distribution
- User satisfaction scores

## Future Enhancements

1. **LLM Integration** - Connect to Azure OpenAI/GPT for more natural conversations
2. **Voice Input** - Add speech-to-text for accessibility
3. **Proactive Matching** - Notify users of potential report matches
4. **Image Analysis** - Extract features from uploaded photos
5. **Sentiment Analysis** - Detect user frustration and escalate
