/**
 * AWS Rekognition Face Comparison Service
 * 
 * This module provides utilities for:
 * 1. Extracting face fingerprints from images
 * 2. Indexing faces in Rekognition collections
 * 3. Comparing faces between missing reports and sightings
 */

import {
    RekognitionClient,
    CreateCollectionCommand,
    DeleteCollectionCommand,
    IndexFacesCommand,
    SearchFacesByImageCommand,
    DeleteFacesCommand,
    DetectFacesCommand,
    CompareFacesCommand
} from '@aws-sdk/client-rekognition';

// AWS Rekognition collection names
const MISSING_PERSONS_COLLECTION = 'l9ani-missing-persons';
const SIGHTINGS_COLLECTION = 'l9ani-sightings';

// Minimum confidence threshold for face detection
const MIN_FACE_CONFIDENCE = 90;

// Minimum similarity threshold for face matching (0-100)
const MIN_SIMILARITY_THRESHOLD = 80;

// Maximum faces to return in search
const MAX_FACES_TO_RETURN = 10;

// Initialize Rekognition client
let rekognitionClient = null;

/**
 * Get or create Rekognition client
 */
function getRekognitionClient() {
    if (!rekognitionClient) {
        const region = process.env.AWS_REGION || 'eu-west-1';
        
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            throw new Error('AWS credentials not configured');
        }
        
        rekognitionClient = new RekognitionClient({
            region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
    }
    return rekognitionClient;
}

/**
 * Create a Rekognition collection if it doesn't exist
 */
export async function ensureCollectionExists(collectionId) {
    const client = getRekognitionClient();
    
    try {
        await client.send(new CreateCollectionCommand({
            CollectionId: collectionId,
        }));
        console.log(`[Rekognition] Created collection: ${collectionId}`);
        return { created: true };
    } catch (error) {
        if (error.name === 'ResourceAlreadyExistsException') {
            console.log(`[Rekognition] Collection already exists: ${collectionId}`);
            return { created: false, exists: true };
        }
        throw error;
    }
}

/**
 * Initialize both collections for the application
 */
export async function initializeCollections() {
    await ensureCollectionExists(MISSING_PERSONS_COLLECTION);
    await ensureCollectionExists(SIGHTINGS_COLLECTION);
}

/**
 * Detect faces in an image (without indexing)
 * @param {Buffer} imageBuffer - The image buffer
 * @returns {Array} Array of detected faces with bounding boxes
 */
export async function detectFaces(imageBuffer) {
    const client = getRekognitionClient();
    
    try {
        const response = await client.send(new DetectFacesCommand({
            Image: {
                Bytes: imageBuffer,
            },
            Attributes: ['ALL'],
        }));
        
        return response.FaceDetails || [];
    } catch (error) {
        console.error('[Rekognition] Error detecting faces:', error);
        throw error;
    }
}

/**
 * Index a face from an image into a collection
 * @param {Buffer} imageBuffer - The image buffer
 * @param {string} collectionId - The collection to add the face to
 * @param {string} externalImageId - A unique identifier for this image
 * @returns {Object} The indexed face record
 */
export async function indexFace(imageBuffer, collectionId, externalImageId) {
    const client = getRekognitionClient();
    
    try {
        // Ensure collection exists
        await ensureCollectionExists(collectionId);
        
        const response = await client.send(new IndexFacesCommand({
            CollectionId: collectionId,
            Image: {
                Bytes: imageBuffer,
            },
            ExternalImageId: externalImageId,
            MaxFaces: 1, // Index only the most prominent face
            QualityFilter: 'AUTO',
            DetectionAttributes: ['ALL'],
        }));
        
        if (!response.FaceRecords || response.FaceRecords.length === 0) {
            console.log('[Rekognition] No face detected in image:', externalImageId);
            return null;
        }
        
        const faceRecord = response.FaceRecords[0];
        
        return {
            faceId: faceRecord.Face.FaceId,
            externalImageId: faceRecord.Face.ExternalImageId,
            boundingBox: faceRecord.Face.BoundingBox,
            confidence: faceRecord.Face.Confidence,
            faceDetails: faceRecord.FaceDetail,
        };
    } catch (error) {
        console.error('[Rekognition] Error indexing face:', error);
        throw error;
    }
}

/**
 * Index a face for a missing person report
 */
export async function indexMissingPersonFace(imageBuffer, reportId, photoUrl) {
    const externalImageId = `missing_${reportId}_${Date.now()}`;
    return await indexFace(imageBuffer, MISSING_PERSONS_COLLECTION, externalImageId);
}

/**
 * Index a face for a sighting report
 */
export async function indexSightingFace(imageBuffer, reportId, photoUrl) {
    const externalImageId = `sighting_${reportId}_${Date.now()}`;
    return await indexFace(imageBuffer, SIGHTINGS_COLLECTION, externalImageId);
}

/**
 * Search for matching faces in a collection using an image
 * @param {Buffer} imageBuffer - The image to search with
 * @param {string} collectionId - The collection to search in
 * @param {number} similarityThreshold - Minimum similarity (0-100)
 * @returns {Array} Array of matching faces
 */
export async function searchFacesByImage(imageBuffer, collectionId, similarityThreshold = MIN_SIMILARITY_THRESHOLD) {
    const client = getRekognitionClient();
    
    try {
        const response = await client.send(new SearchFacesByImageCommand({
            CollectionId: collectionId,
            Image: {
                Bytes: imageBuffer,
            },
            MaxFaces: MAX_FACES_TO_RETURN,
            FaceMatchThreshold: similarityThreshold,
        }));
        
        return response.FaceMatches || [];
    } catch (error) {
        // Handle case where no face is detected in the search image
        if (error.name === 'InvalidParameterException' && error.message.includes('no faces')) {
            console.log('[Rekognition] No face detected in search image');
            return [];
        }
        console.error('[Rekognition] Error searching faces:', error);
        throw error;
    }
}

/**
 * Search for a sighting face in the missing persons collection
 * Used when a new sighting is reported to find potential matches
 */
export async function searchMissingPersonsForMatch(imageBuffer, similarityThreshold = MIN_SIMILARITY_THRESHOLD) {
    return await searchFacesByImage(imageBuffer, MISSING_PERSONS_COLLECTION, similarityThreshold);
}

/**
 * Search for a missing person face in the sightings collection
 * Used when a new missing person report is created to find existing sightings
 */
export async function searchSightingsForMatch(imageBuffer, similarityThreshold = MIN_SIMILARITY_THRESHOLD) {
    return await searchFacesByImage(imageBuffer, SIGHTINGS_COLLECTION, similarityThreshold);
}

/**
 * Compare two specific images for face similarity
 * @param {Buffer} sourceImageBuffer - The source image
 * @param {Buffer} targetImageBuffer - The target image to compare against
 * @returns {Object} Comparison result with similarity score
 */
export async function compareFaces(sourceImageBuffer, targetImageBuffer) {
    const client = getRekognitionClient();
    
    try {
        const response = await client.send(new CompareFacesCommand({
            SourceImage: {
                Bytes: sourceImageBuffer,
            },
            TargetImage: {
                Bytes: targetImageBuffer,
            },
            SimilarityThreshold: MIN_SIMILARITY_THRESHOLD,
        }));
        
        if (!response.FaceMatches || response.FaceMatches.length === 0) {
            return {
                isMatch: false,
                similarity: 0,
                message: 'No matching faces found',
            };
        }
        
        const bestMatch = response.FaceMatches[0];
        
        return {
            isMatch: true,
            similarity: bestMatch.Similarity,
            face: bestMatch.Face,
        };
    } catch (error) {
        console.error('[Rekognition] Error comparing faces:', error);
        throw error;
    }
}

/**
 * Delete a face from a collection
 * @param {string} collectionId - The collection containing the face
 * @param {string} faceId - The AWS face ID to delete
 */
export async function deleteFace(collectionId, faceId) {
    const client = getRekognitionClient();
    
    try {
        await client.send(new DeleteFacesCommand({
            CollectionId: collectionId,
            FaceIds: [faceId],
        }));
        console.log(`[Rekognition] Deleted face ${faceId} from ${collectionId}`);
        return true;
    } catch (error) {
        console.error('[Rekognition] Error deleting face:', error);
        throw error;
    }
}

/**
 * Delete a face from the missing persons collection
 */
export async function deleteMissingPersonFace(faceId) {
    return await deleteFace(MISSING_PERSONS_COLLECTION, faceId);
}

/**
 * Delete a face from the sightings collection
 */
export async function deleteSightingFace(faceId) {
    return await deleteFace(SIGHTINGS_COLLECTION, faceId);
}

/**
 * Fetch an image from a URL and return as buffer
 * @param {string} url - The image URL
 * @returns {Buffer} The image buffer
 */
export async function fetchImageAsBuffer(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error) {
        console.error('[Rekognition] Error fetching image:', error);
        throw error;
    }
}

// Export collection names for reference
export const COLLECTIONS = {
    MISSING_PERSONS: MISSING_PERSONS_COLLECTION,
    SIGHTINGS: SIGHTINGS_COLLECTION,
};

// Export thresholds for reference
export const THRESHOLDS = {
    MIN_FACE_CONFIDENCE,
    MIN_SIMILARITY_THRESHOLD,
};
