# InfraGhost AI 👻

**AI-Powered Infrastructure Reality Verification System**

InfraGhost AI identifies "InfraGhosts" — public infrastructure assets that exist on paper but are non-functional in reality. Using **Google Gemini Vision API**, this system analyzes uploaded photos to verify infrastructure usability and generates a "Ghost Score" indicating how unusable an asset is.

---

## 🎯 Features

### Core Functionality
- **Photo Upload & Analysis**: Upload infrastructure photos with automatic geolocation
- **AI-Powered Verification**: Google Gemini Vision analyzes images and user feedback
- **Ghost Score Calculation**: Automated scoring (0-100) indicating infrastructure usability
- **Interactive Map View**: Color-coded markers showing all reported infrastructure
- **Authority Dashboard**: Statistical reports with PDF export capability
- **Clean UI**: Responsive design with Tailwind CSS, no build process required

### Infrastructure Types Supported
- 🚰 Drinking Water Taps
- 🚽 Public Toilets
- 💡 Streetlights
- ♿ Accessibility Ramps

### Classification System
- **🔴 InfraGhost** (Ghost Score ≥ 60): Exists but unusable
- **🟡 Partial** (Ghost Score 30-60): Intermittent functionality
- **🟢 Functional** (Ghost Score < 30): Fully operational

---

## Quick Start

### Prerequisites
- Node.js 14+ installed
- Google Gemini API key (free from https://ai.google.dev/)
- Mapbox token (required for map visualization from https://mapbox.com/)

### Installation

```bash
# 1. Clone or download the project
cd "InfraGhost AI"

# 2. Install dependencies
npm install

# 3. Configure environment variables
# Create .env file with:
GEMINI_API_KEY=your_gemini_api_key_here
MAPBOX_TOKEN=your_mapbox_token_here
GEMINI_MODEL=gemini-2.0-flash
PORT=5000

# 4. Start the server
npm start

# 5. Open in browser
# http://localhost:5000
```

### Get Free API Keys

**Google Gemini API Key (Required)**:
1. Visit https://ai.google.dev/
2. Click "Get API Key in Google AI Studio"
3. Create a new project or select existing
4. Copy the API key
5. Add to `.env` file: `GEMINI_API_KEY=your_key_here`

**Mapbox Token (Required)**:
1. Visit https://account.mapbox.com/
2. Sign up for free account
3. Copy your default public token
4. Add to `.env` file: `MAPBOX_TOKEN=your_token_here`

---

## 📁 Project Structure

```
InfraGhost AI/
├── server.js              # Express backend with API routes
├── gemini.js              # Google Gemini Vision integration
├── package.json           # Node.js dependencies
├── .env                   # Environment variables (API keys) - NOT in Git
├── .gitignore             # Git exclusions
├── reports.json           # Local JSON database (auto-created)
├── README.md              # This file
└── public/
    ├── index.html         # Main submission form
    ├── map.html           # Interactive map visualization
    └── authority.html     # Authority summary report with PDF export
```

---

## 🏗️ System Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER (Frontend)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Form: Image + Type + Comment + GPS Location         │   │
│  └──────────────────┬───────────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────────┘
                      │ POST /api/submit-report
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              EXPRESS BACKEND (server.js)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Validate Input → Call Gemini API → Calculate Score   │   │
│  └──────────────────┬───────────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────────┘
                      │ Gemini Vision API Call
                      ▼
┌─────────────────────────────────────────────────────────────┐
│         GOOGLE GEMINI VISION API (gemini-2.0-flash)         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Analyzes: Image + Infrastructure Type + User Input   │   │
│  │ Returns: JSON with exists, usable, reason, score     │   │
│  └──────────────────┬───────────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────────┘
                      │ Returns Analysis
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              EXPRESS BACKEND (Processing)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ghost_score = 100 - usability_score                  │   │
│  │ Classify: InfraGhost / Partial / Functional          │   │
│  │ Save to reports.json                                 │   │
│  └──────────────────┬───────────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────────┘
                      │ Return Result
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              USER BROWSER (Display Result)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Show: "Ghost Score: 85 (InfraGhost - Unusable)"      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Ghost Score Calculation

```
Input: usability_score (0-100 from Gemini Vision)
↓
ghost_score = 100 - usability_score
↓
Classification:
  ├─ ghost_score ≥ 60  → InfraGhost (Red 🔴) - Unusable
  ├─ 30 < ghost_score < 60 → Partial (Yellow 🟡) - Limited function
  └─ ghost_score ≤ 30  → Functional (Green 🟢) - Fully usable
```

---

## 🔌 API Endpoints

### `POST /api/submit-report`
Submit new infrastructure report with image analysis

**Request Body**:
```json
{
  "infra_type": "water|toilet|streetlight|ramp",
  "comment": "User feedback description",
  "latitude": 28.7041,
  "longitude": 77.1025,
  "image_base64": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Response**:
```json
{
  "success": true,
  "report": {
    "id": "1705123456789",
    "timestamp": "2026-01-12T10:30:00.000Z",
    "infra_type": "water",
    "comment": "Tap installed but no water flow",
    "latitude": 28.7041,
    "longitude": 77.1025,
    "analysis": {
      "exists": true,
      "usable": false,
      "reason": "Tap is present but no water flow visible",
      "usability_score": 15,
      "ghost_score": 85,
      "ghost_level": "InfraGhost"
    },
    "image_base64": "..."
  }
}
```

### `GET /api/reports`
Retrieve all submitted reports

**Response**: Array of report objects

### `GET /api/stats`
Get aggregated statistics for authority dashboard

**Response**:
```json
{
  "total_reports": 25,
  "infra_ghosts": 12,
  "functional": 8,
  "partial": 5,
  "by_type": {
    "water": { "total": 10, "ghosts": 6, "ghost_percentage": 60 }
  },
  "top_failing_types": [...],
  "affected_locations": [...]
}
```

### `GET /api/health`
Health check endpoint

**Response**: `{ "status": "ok" }`

---

## 💻 Technology Stack

### Frontend
- **HTML5**: Semantic markup for accessibility
- **Tailwind CSS**: Utility-first CSS framework (CDN)
- **Vanilla JavaScript**: ES6+ for interactivity
- **Mapbox GL JS**: Vector map visualization
- **html2pdf.js**: Client-side PDF generation
- **Browser APIs**: Geolocation API for auto-location

### Backend
- **Node.js**: v14+ JavaScript runtime
- **Express.js**: Fast, minimalist web framework
- **CORS**: Cross-Origin Resource Sharing middleware
- **dotenv**: Environment variable management
- **File System**: Native fs module for JSON storage

### AI & Machine Learning
- **Google Generative AI SDK**: Official @google/generative-ai package
- **Gemini 2.0 Flash**: Fast multimodal AI model
- **Vision Capability**: Image understanding and analysis
- **Structured Output**: JSON response parsing

### Data Storage
- **Local JSON File**: reports.json for MVP/demo
- **No Database Required**: File-based persistence
- **Auto-initialization**: Creates file if missing

### DevOps Ready
- **Environment Variables**: Secure API key management
- **.gitignore**: Prevents sensitive data commits
- **Port Configuration**: Flexible deployment
- **Cloud Deployable**: Compatible with Render, Railway, Vercel

---

## 🧪 How It Works

### 1. User Submission Flow
```javascript
// Frontend (index.html)
1. User uploads photo of infrastructure
2. Browser detects GPS coordinates (Geolocation API)
3. User selects infrastructure type and adds comment
4. Image converted to Base64
5. POST request to /api/submit-report
```

### 2. Backend Processing
```javascript
// server.js
1. Validate required fields
2. Call analyzeInfrastructure(image, type, comment)
3. Receive Gemini analysis
4. Calculate ghost_score = 100 - usability_score
5. Classify as InfraGhost/Partial/Functional
6. Save to reports.json
7. Return result to frontend
```

### 3. Gemini Vision Analysis
```javascript
// gemini.js
1. Initialize GoogleGenerativeAI with API key
2. Create prompt asking:
   - Does infrastructure physically exist?
   - Is it usable for intended purpose?
   - Evidence-based explanation
   - Usability score (0-100)
3. Send image + prompt to gemini-2.0-flash
4. Parse JSON response
5. Add ghost_score and classification
```

### 4. Map Visualization
```javascript
// map.html
1. Fetch all reports from /api/reports
2. For each report:
   - Create Mapbox marker at (lat, lng)
   - Color by ghost_level:
     * Red (InfraGhost)
     * Yellow (Partial)
     * Green (Functional)
   - Add popup with details
3. Display statistics in sidebar
```

### 5. Authority Report
```javascript
// authority.html
1. Fetch statistics from /api/stats
2. Display:
   - Total reports and ghost percentage
   - Top 3 failing infrastructure types
   - Affected locations
   - Recommendations
3. Enable PDF download via html2pdf.js
```

---

## 🌟 Google Technologies Used

### Primary: Google Gemini Vision API
- **Model**: `gemini-2.0-flash` (configurable via GEMINI_MODEL env var)
- **Capability**: Multimodal understanding (text + images)
- **Use Case**: Analyzing infrastructure photos to determine usability
- **Pricing**: Free tier available (15 RPM, 1500 RPD)
- **API Endpoint**: Via `@google/generative-ai` NPM package

### Gemini Integration Details

**Prompt Engineering**:
```javascript
const prompt = `You are an infrastructure auditor.
Based on the image and user feedback, answer strictly in JSON format only.

Questions:
1. Is the infrastructure physically present? (true/false)
2. Is it usable for its intended public purpose? (true/false)
3. Give a brief evidence-based explanation.
4. Assign a usability score from 0 to 100.

Infrastructure Type: ${infraLabel}
User Feedback: ${comment}

Respond ONLY with valid JSON in this exact format:
{
  "exists": true/false,
  "usable": true/false,
  "reason": "brief explanation",
  "usability_score": number
}`;
```

**Response Handling**:
- JSON extraction from model output
- Error handling for quota limits
- Ghost score calculation
- Classification logic

**Security**:
- API key stored in .env file only
- Never committed to Git
- Loaded via dotenv package
- Validated at runtime

---

## 📊 Database Schema

**reports.json structure**:
```json
[
  {
    "id": "1705123456789",
    "timestamp": "2026-01-12T10:30:00.000Z",
    "infra_type": "water",
    "comment": "Tap installed but no water flow",
    "latitude": 26.8415,
    "longitude": 75.5637,
    "analysis": {
      "exists": true,
      "usable": false,
      "reason": "Tap is present but no water flow visible, appears non-functional",
      "usability_score": 15,
      "ghost_score": 85,
      "ghost_level": "InfraGhost"
    },
    "image_base64": "data:image/jpeg;base64,..."
  }
]
```

**Field Descriptions**:
- `id`: Unique timestamp-based identifier
- `timestamp`: ISO 8601 datetime of submission
- `infra_type`: One of: water, toilet, streetlight, ramp
- `comment`: User-provided feedback
- `latitude/longitude`: GPS coordinates (decimal degrees)
- `analysis.exists`: Boolean - infrastructure physically present
- `analysis.usable`: Boolean - infrastructure functional
- `analysis.reason`: Gemini's evidence-based explanation
- `analysis.usability_score`: 0-100 (Gemini output)
- `analysis.ghost_score`: 0-100 (calculated: 100 - usability)
- `analysis.ghost_level`: Classification string
- `image_base64`: Base64-encoded image (truncated for storage)

---

## 🔒 Security

### API Key Management
```bash
# .env file (NOT committed to Git)
GEMINI_API_KEY=your_actual_api_key_here
MAPBOX_TOKEN=your_mapbox_token_here
GEMINI_MODEL=gemini-2.0-flash
PORT=5000
```

### .gitignore Configuration
```
node_modules/
.env
reports.json
*.log
```

### Error Handling
- Try-catch blocks on all async operations
- User-friendly error messages
- API error logging
- Graceful fallbacks

---

## 🚀 Deployment

### Local Development
```bash
npm start
# Server runs on http://localhost:5000
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

- [Jyot Shah](https://www.linkedin.com/in/jyotshah1/)

For questions or issues, please open an issue on GitHub or mail to **jyotshah1595@gmail.com**.

---

<p align="center">
  Built with ❤️ using Google Gemini Vision API
</p>
