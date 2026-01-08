# Face Recognition System Documentation

## Overview

The L9ani Face Recognition System uses AWS Rekognition to automatically detect and compare faces between missing person reports and sightings. When a match is found, the system notifies the relevant users and provides access to the original images.

## Storage Buckets

Images are stored in Supabase Storage:
- **`reports-photos`** - Photos from missing person reports
- **`sighting-reports-photos`** - Photos from sighting reports

Each face fingerprint is linked to its original image URL, ensuring the original photo can always be retrieved when a match is found.

## Architecture

### Database Schema

The system uses three main tables (defined in `database/migrations/020_face_fingerprints_schema.sql`):

1. **`missing_report_faces`** - Stores face fingerprints from missing person reports
   - `report_id` - Links to the missing report
   - `photo_url` - Direct link to the original image in `reports-photos` bucket
   - `aws_face_id` - AWS Rekognition face identifier
   - `bounding_box` - Face location within the image
   - `confidence` - Detection confidence score

2. **`sighting_report_faces`** - Stores face fingerprints from sighting reports
   - `report_id` - Links to the sighting report
   - `photo_url` - Direct link to the original image in `sighting-reports-photos` bucket
   - `aws_face_id` - AWS Rekognition face identifier
   - `bounding_box` - Face location within the image
   - `confidence` - Detection confidence score

3. **`face_matches`** - Stores potential matches between missing and sighting faces
   - `missing_face_id` - Reference to the missing person face
   - `sighting_face_id` - Reference to the sighting face
   - `similarity_score` - AWS similarity percentage (0-100)
   - `status` - Match status (pending, confirmed, rejected, reviewing)

A view `face_matches_details` provides easy access to match information with joined report data and original image URLs.

### AWS Rekognition Collections

Two collections are used to store face indexes:
- `l9ani-missing-persons` - Faces from missing person reports
- `l9ani-sightings` - Faces from sighting reports

## API Endpoints

### Face Recognition Main API
`/api/face-recognition`

- **POST** - Process and index faces from report photos
  ```json
  {
    "reportId": "uuid",
    "reportType": "missing" | "sighting",
    "photoUrls": ["url1", "url2"]
  }
  ```

- **GET** - Get face records and matches for a report
  - Query params: `reportId`, `reportType`

- **DELETE** - Delete face records when a report is deleted
  ```json
  {
    "reportId": "uuid",
    "reportType": "missing" | "sighting"
  }
  ```

### Face Matches API
`/api/face-recognition/matches`

- **GET** - Get all matches for the authenticated user's reports
  - Query params: `status`, `reportId`, `reportType`

- **PATCH** - Update match status (confirm/reject)
  ```json
  {
    "matchId": "uuid",
    "status": "confirmed" | "rejected" | "reviewing",
    "notes": "optional notes"
  }
  ```

### Face Match Details API
`/api/face-recognition/matches/[matchId]`

- **GET** - Get detailed information about a specific match
  - Returns both original images with face bounding boxes
  - Response includes:
    - Missing report: all photos, matched photo URL, face bounding box
    - Sighting report: all photos, matched photo URL, face bounding box
    - Reporter contact information (for sightings)

- **PATCH** - Update match status for a specific match
  ```json
  {
    "status": "confirmed" | "rejected" | "reviewing",
    "notes": "optional notes"
  }
  ```

### Setup API
`/api/face-recognition/setup`

- **GET** - Check configuration status
- **POST** - Initialize Rekognition collections (admin only)

### Admin Face Matches API
`/api/admin/face-matches`

- **GET** - Get all face matches (admin only)
  - Query params: `status`, `minSimilarity`, `page`, `limit`

## Environment Variables

Required in Vercel (already configured):
```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=eu-west-1
```

## How It Works

### When a Missing Person Report is Created:

1. User uploads photos with the report
2. System indexes each photo in the `l9ani-missing-persons` collection
3. Face fingerprints are stored in `missing_report_faces` table
4. System searches `l9ani-sightings` collection for matches
5. If matches found (≥80% similarity), records are created in `face_matches`
6. Notifications are sent to relevant users

### When a Sighting Report is Created:

1. User uploads photos with the person sighting report
2. System indexes each photo in the `l9ani-sightings` collection
3. Face fingerprints are stored in `sighting_report_faces` table
4. System searches `l9ani-missing-persons` collection for matches
5. If matches found (≥80% similarity), records are created in `face_matches`
6. Notifications are sent to relevant users

### Match Workflow:

1. Match is created with `pending` status
2. Users can view matches in their notifications
3. Users or admins can review and update status to:
   - `confirmed` - Face match verified (links reports)
   - `rejected` - False positive
   - `reviewing` - Under investigation

When a match is confirmed:
- Sighting report is linked to the missing report
- Missing report status is updated to `found`

## Configuration Thresholds

- **MIN_FACE_CONFIDENCE**: 90% - Minimum confidence for face detection
- **MIN_SIMILARITY_THRESHOLD**: 80% - Minimum similarity for face matching
- **MAX_FACES_TO_RETURN**: 10 - Maximum matches returned per search

## Files Structure

```
src/
├── lib/
│   ├── rekognition.js           # AWS Rekognition client and utilities
│   └── faceRecognitionHelper.js # Shared helper functions
├── app/api/
│   ├── face-recognition/
│   │   ├── route.js             # Main face recognition API
│   │   ├── matches/
│   │   │   ├── route.js         # Matches list API
│   │   │   └── [matchId]/route.js # Individual match details API
│   │   └── setup/route.js       # Setup and initialization
│   └── admin/
│       └── face-matches/route.js # Admin-only matches API

database/migrations/
└── 020_face_fingerprints_schema.sql # Database schema
```

## Image Linking & Retrieval

### How Images Are Linked to Face Fingerprints

1. When a report is created with photos:
   - Photos are uploaded to the appropriate Supabase bucket
   - Public URLs are generated and stored in the report's `photos` array
   
2. During face processing:
   - Each photo URL is passed to AWS Rekognition
   - If a face is detected, a record is created with:
     - `photo_url` - The exact URL of the image
     - `aws_face_id` - The Rekognition face identifier
     - `bounding_box` - Where the face is located in the image

3. When a match is found:
   - Both the missing and sighting face records are linked
   - Original image URLs are preserved for retrieval

### Retrieving Original Images

When accessing a match via `/api/face-recognition/matches/[matchId]`:

```json
{
  "match": {
    "similarityScore": 95.5,
    "missingReport": {
      "allPhotos": ["url1", "url2"],
      "matchedPhoto": "url1",
      "faceBoundingBox": { "Width": 0.3, "Height": 0.4, "Left": 0.2, "Top": 0.1 }
    },
    "sightingReport": {
      "allPhotos": ["url3"],
      "matchedPhoto": "url3",
      "faceBoundingBox": { "Width": 0.35, "Height": 0.45, "Left": 0.25, "Top": 0.15 }
    }
  }
}
```

The `faceBoundingBox` can be used to highlight the matched face region in the UI.

## Deployment Steps

1. Run the database migration `020_face_fingerprints_schema.sql` in Supabase SQL Editor
2. Ensure AWS credentials are configured in Vercel:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` (default: `eu-west-1`)
3. Deploy the application
4. Call the setup endpoint to initialize collections:
   ```
   POST /api/face-recognition/setup
   Authorization: Bearer <admin_token>
   ```

## Error Handling

- Face recognition is non-blocking - report creation succeeds even if face processing fails
- Failed face processing is logged for debugging
- Images without detectable faces are recorded in the `failed` array of the response

## Security

- All face data tables use Row Level Security (RLS)
- Users can only view faces/matches related to their own reports
- Admins have full access via service role
- API endpoints require authentication
