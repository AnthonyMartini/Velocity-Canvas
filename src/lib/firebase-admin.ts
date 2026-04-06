import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccount) {
      console.log('FIREBASE_SERVICE_ACCOUNT found, attempting to initialize...');
      const sanitized = serviceAccount.trim().replace(/^['"]|['"]$/g, '');
      
      let cert;
      try {
        if (sanitized.startsWith('{')) {
          cert = JSON.parse(sanitized);
        } else {
          cert = JSON.parse(Buffer.from(sanitized, 'base64').toString());
        }
      } catch (parseError: any) {
        console.error('CRITICAL: Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', parseError.message);
        throw parseError;
      }

      if (cert.private_key) {
        // Fix for escaped newlines in env variables
        cert.private_key = cert.private_key.replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert(cert),
        projectId: cert.project_id
      });
      console.log('Firebase Admin SDK initialized successfully for project:', cert.project_id);
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT not found in environment variables. Server-side auth verification will be disabled.');
    }
  } catch (error: any) {
    console.error('Error initializing Firebase Admin SDK:', error.message || error);
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;

/**
 * Verifies a Firebase ID token and returns the user's UID.
 * Returns null if verification fails or Admin SDK is not initialized.
 */
export async function verifyIdToken(token: string): Promise<string | null> {
  if (!adminAuth) {
    console.error('verifyIdToken: adminAuth is not initialized. Check FIREBASE_SERVICE_ACCOUNT.');
    return null;
  }
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error: any) {
    console.error('Error verifying ID token:', error.code || error.message || error);
    return null;
  }
}

/**
 * Checks if a user has enough credits and deducts the requested amount if successful.
 * Also records a log of the action.
 */
export async function checkAndDeductCredit(uid: string, action: string, amount: number = 1): Promise<{ success: boolean; credits?: number; error?: string }> {
  if (!adminDb) {
    return { success: true }; 
  }

  const userRef = adminDb.collection('users').doc(uid);
  const logRef = userRef.collection('activity').doc();

  try {
    return await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        return { success: false, error: 'User profile not found.' };
      }

      const currentCredits = userDoc.data()?.credits ?? 0;

      if (currentCredits < amount) {
        return { success: false, credits: currentCredits, error: 'Insufficient credits.' };
      }

      const newCredits = currentCredits - amount;
      
      // Update credits
      transaction.update(userRef, { credits: newCredits });
      
      // Record log
      transaction.set(logRef, {
        action,
        amount: -amount,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        previousCredits: currentCredits,
        newCredits: newCredits
      });

      return { success: true, credits: newCredits };
    });
  } catch (error) {
    console.error('Error in credit transaction:', error);
    return { success: false, error: 'Database error during credit deduction.' };
  }
}

/**
 * Gets a user's current credit balance.
 */
export async function getUserCredits(uid: string): Promise<number> {
  if (!adminDb) return 0;
  try {
    const userDoc = await adminDb.collection('users').doc(uid).get();
    return userDoc.data()?.credits ?? 0;
  } catch (error) {
    console.error('Error fetching user credits:', error);
    return 0;
  }
}

/**
 * Gets all saved projects for a specific user.
 */
export async function getUserProjects(uid: string): Promise<any[]> {
  if (!adminDb) return [];
  try {
    const snap = await adminDb.collection('projects')
      .where('uid', '==', uid)
      .get();
    const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort in-memory to avoid requiring a Firestore composite index
    docs.sort((a: any, b: any) => {
      const aTime = a.updatedAt?._seconds ?? 0;
      const bTime = b.updatedAt?._seconds ?? 0;
      return bTime - aTime;
    });
    return docs;
  } catch (error) {
    console.error('Error fetching user projects:', error);
    return [];
  }
}

/**
 * Saves a user's project natively. Create or update based on 'projectId'.
 */
export async function saveUserProject(uid: string, projectId: string | null, payload: any): Promise<{ success: boolean; projectId?: string; error?: string }> {
  if (!adminDb) return { success: false, error: 'Database uninitialized' };
  try {
    const projectsRef = adminDb.collection('projects');
    const saveData = {
      uid,
      name: payload.name || 'Untitled Project',
      tree: payload.tree || [],
      canvasW: payload.canvasW || 1366,
      canvasH: payload.canvasH || 768,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (projectId) {
      // Update existing
      const docRef = projectsRef.doc(projectId);
      const doc = await docRef.get();
      if (!doc.exists) return { success: false, error: 'Project not found' };
      if (doc.data()?.uid !== uid) return { success: false, error: 'Unauthorized to edit this project' };
      
      await docRef.update(saveData);
      return { success: true, projectId };
    } else {
      // Create new
      const newDocRef = await projectsRef.add({
        ...saveData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { success: true, projectId: newDocRef.id };
    }
  } catch (error) {
    console.error('Error saving user project:', error);
    return { success: false, error: 'Database error while saving project' };
  }
}

/**
 * Deletes a specific project owned by the user
 */
export async function deleteUserProject(uid: string, projectId: string): Promise<boolean> {
  if (!adminDb) return false;
  try {
    const docRef = adminDb.collection('projects').doc(projectId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data()?.uid !== uid) return false;
    await docRef.delete();
    return true;
  } catch (error) {
    console.error('Error deleting user project:', error);
    return false;
  }
}

/**
 * Updates a user's credit balance.
 */
export async function updateUserCredits(uid: string, credits: number): Promise<void> {
  if (!adminDb) return;
  try {
    await adminDb.collection('users').doc(uid).set({ credits }, { merge: true });
  } catch (error) {
    console.error('Error updating user credits:', error);
  }
}

/**
 * Checks if a user has the admin role.
 */
export async function checkUserIsAdmin(uid: string): Promise<boolean> {
  if (!adminDb) return false;
  try {
    const userDoc = await adminDb.collection('users').doc(uid).get();
    return userDoc.exists && userDoc.data()?.role === 'admin';
  } catch (error) {
    console.error('Error checking user admin status:', error);
    return false;
  }
}

/**
 * Logs token usage for a user to Firestore.
 * @param cachedTokens - tokens served from context cache (0 if caching not used)
 */
export async function logTokenUsage(
  uid: string,
  modelName: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number = 0
): Promise<void> {
  if (!adminDb) return;
  try {
    const totalTokens = inputTokens + outputTokens;
    await adminDb.collection('token_usage').add({
      uid,
      modelName,
      inputTokens,
      outputTokens,
      cachedTokens,
      totalTokens,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging token usage:', error);
  }
}
