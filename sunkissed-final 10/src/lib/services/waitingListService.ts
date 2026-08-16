import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { WaitingListDoc } from "@/lib/types";

const COL = "waitingList";

function genId(): string {
  return `wl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function addToWaitingList(input: Omit<WaitingListDoc, "id" | "createdAt" | "status">): Promise<WaitingListDoc> {
  const entry: WaitingListDoc = { ...input, id: genId(), status: "waiting", createdAt: Date.now() };
  await setDoc(doc(db, COL, entry.id), entry);
  return entry;
}

export async function listWaitingList(): Promise<WaitingListDoc[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => d.data() as WaitingListDoc).sort((a, b) => a.createdAt - b.createdAt);
}

export async function updateWaitingStatus(id: string, status: WaitingListDoc["status"]): Promise<void> {
  await updateDoc(doc(db, COL, id), { status });
}

export async function removeWaiting(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
