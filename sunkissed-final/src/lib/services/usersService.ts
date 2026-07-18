import {
  doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserDoc } from "@/lib/types";
import { normalizePhone } from "@/lib/utils";

const COL = "users";

export async function getUserByPhone(phone: string): Promise<UserDoc | null> {
  const id = normalizePhone(phone);
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

export async function createUser(user: UserDoc): Promise<void> {
  const id = normalizePhone(user.phone);
  await setDoc(doc(db, COL, id), { ...user, phone: id });
}

export async function updateUserNotes(phone: string, notes: string): Promise<void> {
  const id = normalizePhone(phone);
  await updateDoc(doc(db, COL, id), { notes });
}

export async function updateUserName(phone: string, displayName: string): Promise<void> {
  const id = normalizePhone(phone);
  await updateDoc(doc(db, COL, id), { displayName });
}

export async function updateUserPassword(phone: string, passwordHash: string): Promise<void> {
  const id = normalizePhone(phone);
  await updateDoc(doc(db, COL, id), { passwordHash });
}

export async function updateUserMembership(
  phone: string,
  patch: Pick<UserDoc, "membershipType" | "subscriptionExpiry" | "punchTotal" | "punchIssuedDate">
): Promise<void> {
  const id = normalizePhone(phone);
  // Drop undefined fields so we don't write `undefined` to Firestore.
  const clean: Partial<UserDoc> = {};
  (Object.keys(patch) as (keyof typeof patch)[]).forEach((k) => {
    const v = patch[k];
    if (v !== undefined) (clean as Record<string, unknown>)[k] = v;
  });
  await updateDoc(doc(db, COL, id), clean);
}

export async function listUsers(): Promise<UserDoc[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => d.data() as UserDoc).sort((a, b) => b.createdAt - a.createdAt);
}

export async function searchUsersByPhone(phoneFragment: string): Promise<UserDoc[]> {
  const frag = normalizePhone(phoneFragment);
  if (!frag) return listUsers();
  // Prefix search using range query on the document id field (phone).
  const end = frag + "\uf8ff";
  const q = query(
    collection(db, COL),
    where("phone", ">=", frag),
    where("phone", "<=", end)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as UserDoc).sort((a, b) => b.createdAt - a.createdAt);
}
