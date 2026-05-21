
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  setDoc,
  getDocFromServer,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Asset, TransportRequest, RequestStatus, LogisticsStatus, UserAccount, UserRole } from '../types';
import { INITIAL_ASSETS, INITIAL_REQUESTS } from '../constants';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection
export const testConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
};

export const seedDatabase = async () => {
  try {
    const assetsSnapshot = await getDocs(collection(db, 'assets'));
    if (assetsSnapshot.empty) {
      console.log("Seeding assets...");
      for (const asset of INITIAL_ASSETS) {
        await setDoc(doc(db, 'assets', asset.id), asset);
      }
    }

    const requestsSnapshot = await getDocs(collection(db, 'requests'));
    if (requestsSnapshot.empty) {
      console.log("Seeding requests...");
      for (const req of INITIAL_REQUESTS) {
        await setDoc(doc(db, 'requests', req.id), req);
      }
    }

    // Ensure default admin exists in users collection
    if (auth.currentUser && auth.currentUser.email === "gibasuporte@gmail.com") {
      const email = auth.currentUser.email;
      const uid = auth.currentUser.uid;
      
      // Cleanup old UID-based document if it exists to avoid duplication
      const oldAdminDoc = await getDoc(doc(db, 'users', uid));
      if (oldAdminDoc.exists()) {
        console.log("Cleaning up old UID-based admin document...");
        await deleteDoc(doc(db, 'users', uid));
      }

      const adminDoc = await getDoc(doc(db, 'users', email));
      if (!adminDoc.exists()) {
        console.log("Registering default admin with email ID...");
        await setDoc(doc(db, 'users', email), {
          uid: uid,
          email: email,
          displayName: auth.currentUser.displayName || "Gilberto Morais",
          role: UserRole.ADMIN,
          createdAt: Date.now()
        });
      }

      // Add a default operator for testing if not exists
      const defaultOpEmail = 'operador@cirion.com';
      const opDoc = await getDoc(doc(db, 'users', defaultOpEmail));
      if (!opDoc.exists()) {
        await setDoc(doc(db, 'users', defaultOpEmail), {
          uid: 'default-op-uid',
          email: defaultOpEmail,
          displayName: 'Operador de Teste',
          role: UserRole.OPERATOR,
          createdAt: Date.now()
        });
      }
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
};

// --- EXPORTED API FUNCTIONS ---

export const fetchAssets = async (): Promise<Asset[]> => {
  const path = 'assets';
  try {
    const q = query(collection(db, path), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data() } as Asset));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const fetchRequests = async (): Promise<TransportRequest[]> => {
  const path = 'requests';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data() } as TransportRequest));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const createRequest = async (request: TransportRequest): Promise<void> => {
  const path = 'requests';
  try {
    await setDoc(doc(db, path, request.id), request);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateRequest = async (id: string, updates: Partial<TransportRequest>): Promise<void> => {
  const path = `requests/${id}`;
  try {
    await updateDoc(doc(db, 'requests', id), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteRequest = async (id: string): Promise<void> => {
  const path = `requests/${id}`;
  try {
    await deleteDoc(doc(db, 'requests', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// --- USER MANAGEMENT ---

export const fetchUsers = async (): Promise<UserAccount[]> => {
  const path = 'users';
  try {
    const snapshot = await getDocs(collection(db, path));
    const usersMap = new Map<string, UserAccount>();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data() as UserAccount;
      if (data && data.email) {
        // Preferimos o documento cujo ID é o próprio e-mail (novo padrão)
        if (doc.id === data.email || !usersMap.has(data.email)) {
          usersMap.set(data.email, data);
        }
      }
    });
    
    return Array.from(usersMap.values()).sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const fetchUserRole = async (email: string): Promise<UserRole> => {
  const path = `users/${email}`;
  try {
    const userDoc = await getDoc(doc(db, 'users', email));
    if (userDoc.exists()) {
      return userDoc.data().role as UserRole;
    }
    // Fallback for default admin email
    if (email === "gibasuporte@gmail.com") {
      return UserRole.ADMIN;
    }
    return UserRole.UNAUTHORIZED;
  } catch (error) {
    console.error("Error fetching user role:", error);
    if (email === "gibasuporte@gmail.com") {
      return UserRole.ADMIN;
    }
    return UserRole.UNAUTHORIZED;
  }
};

export const saveUserAccount = async (user: UserAccount): Promise<void> => {
  const path = `users/${user.email}`;
  try {
    // Usamos o email como ID do documento para facilitar o pré-cadastro
    await setDoc(doc(db, 'users', user.email), user);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const updateUserPremiumStatus = async (email: string, hasContributed: boolean): Promise<void> => {
  const path = `users/${email}`;
  try {
    await updateDoc(doc(db, 'users', email), { hasContributed });
  } catch (error) {
    // Se o documento ainda não existir, cria um novo
    if (auth.currentUser) {
      await setDoc(doc(db, 'users', email), {
        uid: auth.currentUser.uid,
        email: email,
        displayName: auth.currentUser.displayName || "",
        role: UserRole.OPERATOR,
        createdAt: Date.now(),
        hasContributed
      }, { merge: true });
    } else {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};

export const deleteUserAccount = async (email: string): Promise<void> => {
  const path = `users/${email}`;
  try {
    await deleteDoc(doc(db, 'users', email));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

