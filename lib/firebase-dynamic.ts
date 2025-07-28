/**
 * Dynamic Firebase imports for client-side usage
 * This prevents Firebase from being loaded during SSR
 */

export async function getFirebaseDb() {
  const { db } = await import('@/lib/firebase')
  return db
}

export async function getFirestore() {
  const firestore = await import('firebase/firestore')
  return firestore
}

export async function getFirestoreUtils() {
  const { 
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
  } = await import('firebase/firestore')
  
  return {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
  }
}