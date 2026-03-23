import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccount) {
      const sanitized = serviceAccount.trim().replace(/^['"]|['"]$/g, '');
      
      let cert;
      if (sanitized.startsWith('{')) {
        cert = JSON.parse(sanitized);
      } else {
        cert = JSON.parse(Buffer.from(sanitized, 'base64').toString());
      }

      admin.initializeApp({
        credential: admin.credential.cert(cert),
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT not found. Server-side auth verification will be disabled.');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;

/**
 * Verifies a Firebase ID token and returns the user's UID.
 * Returns null if verification fails or Admin SDK is not initialized.
 */
export async function verifyIdToken(token: string): Promise<string | null> {
  if (!adminAuth) return null;
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return null;
  }
}

/**
 * Checks if a user has at least 1 credit and deducts it if successful.
 * Also records a log of the action.
 */
export async function checkAndDeductCredit(uid: string, action: string): Promise<{ success: boolean; credits?: number; error?: string }> {
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

      if (currentCredits < 1) {
        return { success: false, credits: currentCredits, error: 'Insufficient credits.' };
      }

      const newCredits = currentCredits - 1;
      
      // Update credits
      transaction.update(userRef, { credits: newCredits });
      
      // Record log
      transaction.set(logRef, {
        action,
        amount: -1,
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
