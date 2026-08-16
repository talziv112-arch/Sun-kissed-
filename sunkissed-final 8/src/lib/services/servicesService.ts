import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, getDoc, query, where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ServiceDoc } from "@/lib/types";

const COL = "services";

function genId(): string {
  return `svc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function listServices(activeOnly = false): Promise<ServiceDoc[]> {
  const snap = activeOnly
    ? await getDocs(query(collection(db, COL), where("active", "==", true)))
    : await getDocs(collection(db, COL));
  return snap.docs.map((d) => d.data() as ServiceDoc).sort((a, b) => a.name.localeCompare(b.name, "he"));
}

export async function getService(id: string): Promise<ServiceDoc | null> {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? (snap.data() as ServiceDoc) : null;
}

export async function createService(input: Omit<ServiceDoc, "id" | "createdAt">): Promise<ServiceDoc> {
  const service: ServiceDoc = { ...input, id: genId(), createdAt: Date.now() };
  await setDoc(doc(db, COL, service.id), service);
  return service;
}

export async function updateService(id: string, patch: Partial<ServiceDoc>): Promise<void> {
  await updateDoc(doc(db, COL, id), patch);
}

export async function deleteService(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
