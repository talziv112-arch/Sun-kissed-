import {
  collection, doc, getDocs, setDoc, deleteDoc, query, where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BlockedDateDoc } from "@/lib/types";

const COL = "blockedDates";

export async function listBlockedForDate(date: string): Promise<BlockedDateDoc[]> {
  const q = query(collection(db, COL), where("date", "==", date));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as BlockedDateDoc);
}

export async function listAllBlocked(): Promise<BlockedDateDoc[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => d.data() as BlockedDateDoc).sort((a, b) => a.date.localeCompare(b.date));
}

export async function addBlock(input: Omit<BlockedDateDoc, "id" | "createdAt">): Promise<BlockedDateDoc> {
  const id = input.startTime ? `${input.date}_${input.startTime}` : input.date;
  const block: BlockedDateDoc = { ...input, id, createdAt: Date.now() };
  await setDoc(doc(db, COL, id), block);
  return block;
}

export async function removeBlock(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
